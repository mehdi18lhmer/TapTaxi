// TapTaxi Assistant: the drivers' money assistant, in Darija. Scripted for the demo: it
// recognises a few questions by keywords and answers from the driver's real demo data.
// Responsible AI rules:
//  - it never moves money by itself: every payment needs the driver's "Confirmer";
//  - when it is not sure, it says so and offers a person instead.
// A real version uses a language model and Darija speech recognition behind the same rules.
import { balance, money } from './model';
import type { AppState, PayoutMethod } from './model';
import { COVERAGE, daysUntilDue, paidThisMonth } from './coverage';
import { earningsSummary, ownerPaidToday } from './ledger';

export type Intent =
  | 'earnings'
  | 'amo'
  | 'owner'
  | 'withdraw'
  | 'savings'
  | 'loan'
  | 'greeting'
  | 'thanks'
  | 'unknown';

/** Questions offered as chips and used by the simulated voice input. */
export const SAMPLE_PROMPTS = [
  { text: 'Chhal dkhelt had simana?', fr: 'Combien j’ai gagné cette semaine ?' },
  { text: 'Khelles AMO dyal had chhar', fr: 'Paie l’AMO de ce mois' },
  { text: 'Sifet flous l’owner', fr: 'Envoie son argent au propriétaire' },
  { text: 'Bghit nkhrej flousi', fr: 'Je veux retirer mon argent' },
] as const;

const PATTERNS: [Intent, RegExp][] = [
  ['amo', /\b(amo|cnss|cotis|ta[2']?min|assurance)|تأمين|الضمان|أمو/i],
  ['owner', /\b(owner|mol|moul|mul|patron|propri|m[o3]allem)|المول|مول الطاكسي|المالك/i],
  ['withdraw', /\b(nkhrej|nkhrj|khrej|khrj|retir|withdraw|sa7b|sahb|ns7eb)|نخرج|سحب/i],
  ['savings', /\b(twfir|tawfir|nwfr|[ée]pargn|sav(e|ing)|khbi|nkhbi)|توفير|ندخر/i],
  ['loan', /\b(kredi|cr[ée]dit|loan|sellef|sl[ae]f|pr[eê]t|financ)|كريدي|سلف|قرض/i],
  [
    'earnings',
    /\b(chhal|ch7al|shhal|dkhelt|dkhlt|dakhalt|rbe7t|rb7t|gagn|earn|revenu|simana|semaine|week)|شحال|ربحت|دخلت|السيمانة/i,
  ],
  ['thanks', /\b(choukran|shukran|chokran|merci|thanks|baraka)|شكرا|بارك الله/i],
  ['greeting', /\b(salam|slm|bonjour|salut|hello|labas|ahlan)|سلام|السلام/i],
];

export function detectIntent(text: string): Intent {
  for (const [intent, re] of PATTERNS) if (re.test(text)) return intent;
  return 'unknown';
}

export const WITHDRAW_OPTIONS: {
  method: PayoutMethod;
  label: string;
  fee: number;
  delay: string;
}[] = [
  { method: 'bank', label: 'Compte bancaire', fee: 0, delay: '1 à 2 jours' },
  { method: 'wallet', label: 'Wallet mobile', fee: 0, delay: 'Instantané' },
  { method: 'agency', label: 'Agent cash (Cash Plus)', fee: 0, delay: 'Code de retrait' },
];

export type AssistantCard =
  | {
      type: 'earnings';
      total: number;
      digital: number;
      cash: number;
      bonus: number;
      tips: number;
      owner: number;
      ownerDueToday: number;
      rides: number;
    }
  | { type: 'confirm'; action: 'amo' | 'owner'; amount: number; title: string; detail: string }
  | { type: 'withdraw'; available: number; suggested: number }
  | { type: 'handoff' };

export interface AssistantReply {
  intent: Intent;
  /** Darija (Latin script), shown first. */
  darija: string;
  /** Darija in Arabic script, read aloud. */
  arabic: string;
  /** French translation for the jury and for drivers who prefer it. */
  french: string;
  card?: AssistantCard;
}

const mad = (cents: number) => `${money(cents)} MAD`;

export function replyTo(text: string, s: AppState, now = Date.now()): AssistantReply {
  const intent = detectIntent(text);
  const week = earningsSummary(s, 'week', now);
  const ownerDue = s.ownerEnabled && !ownerPaidToday(s, now) ? s.ownerAmount : 0;
  switch (intent) {
    case 'earnings':
      return {
        intent,
        darija: `Had simana dkhelti ${mad(week.total)} f ${week.rides} course. ${mad(week.digitalTotal)} b TapTaxi o ${mad(week.cashTotal)} cash. L'bonus dyalek 10% howa ${mad(week.bonus)}.${ownerDue ? ` Mazal 3endek ${mad(ownerDue)} dyal l'owner l'yom.` : " L'owner khlass l'yom."}`,
        arabic: `هاد السيمانة دخلتي ${money(week.total)} درهم ف ${week.rides} كورسة. ${money(week.digitalTotal)} بتاب تاكسي و ${money(week.cashTotal)} كاش. البونيس ديالك عشرة فالمية هو ${money(week.bonus)} درهم.`,
        french: `Cette semaine, vous avez gagné ${mad(week.total)} en ${week.rides} courses : ${mad(week.digitalTotal)} via TapTaxi et ${mad(week.cashTotal)} en espèces. Votre bonus de 10 % : ${mad(week.bonus)}.${ownerDue ? ` Il reste ${mad(ownerDue)} à verser au propriétaire aujourd’hui.` : ' Le propriétaire est payé pour aujourd’hui.'}`,
        card: {
          type: 'earnings',
          total: week.total,
          digital: week.digitalTotal,
          cash: week.cashTotal,
          bonus: week.bonus,
          tips: week.tips,
          owner: week.ownerPaid,
          ownerDueToday: ownerDue,
          rides: week.rides,
        },
      };
    case 'amo':
      if (paidThisMonth(s, now))
        return {
          intent,
          darija: "L'AMO dyal had chhar deja tkhelset. Ma khassek tdir walou daba.",
          arabic: 'أمو ديال هاد الشهر تخلصات. ما خاصك دير والو دابا.',
          french: 'L’AMO de ce mois est déjà payée. Rien à faire pour le moment.',
        };
      return {
        intent,
        darija: `L'AMO dyal had chhar hiya ${mad(COVERAGE.monthly)}. Ghadi nkhelsha men l'wallet dyalek (3endek ${mad(balance(s))}). Wach nkemmel?`,
        arabic: `أمو ديال هاد الشهر هي ${money(COVERAGE.monthly)} درهم. غادي نخلصها من الواليت ديالك. واش نكمل؟`,
        french: `L’AMO de ce mois coûte ${mad(COVERAGE.monthly)}. Je la paie depuis votre wallet (solde ${mad(balance(s))}). Je continue ?`,
        card: {
          type: 'confirm',
          action: 'amo',
          amount: COVERAGE.monthly,
          title: 'Payer la cotisation AMO',
          detail: `Échéance dans ${daysUntilDue(now)} jours · CNSS n° ${COVERAGE.cnssNumber}`,
        },
      };
    case 'owner':
      if (!ownerDue)
        return {
          intent,
          darija: s.ownerEnabled
            ? "L'owner khdina flousou l'yom. Ghda nfekkrek."
            : 'L\'versement l\'owner m7ebbes. Ch3elo f "Versement propriétaire".',
          arabic: 'المول خدا فلوسو اليوم.',
          french: s.ownerEnabled
            ? 'Le propriétaire a déjà reçu son montant aujourd’hui. Je vous le rappellerai demain.'
            : 'Le versement au propriétaire est désactivé. Activez-le dans « Versement propriétaire ».',
        };
      return {
        intent,
        darija: `Ghadi nsifet ${mad(ownerDue)} l Hassan M. (l'owner dyal taxi 1287) men l'wallet. Wach nkemmel?`,
        arabic: `غادي نصيفط ${money(ownerDue)} درهم لحسن، مول الطاكسي، من الواليت. واش نكمل؟`,
        french: `J’envoie ${mad(ownerDue)} à Hassan M., propriétaire du taxi 1287, depuis votre wallet. Je continue ?`,
        card: {
          type: 'confirm',
          action: 'owner',
          amount: ownerDue,
          title: 'Verser le montant du jour',
          detail: 'Hassan M. · Banque •••• 0931',
        },
      };
    case 'withdraw': {
      const available = balance(s);
      return {
        intent,
        darija: `3endek ${mad(available)}. Tqder tkhrej b l'banka, b l'wallet mobile, wla 3end agent cash. Kolchi bla frais f had la démo. Khtar o chhal bghiti.`,
        arabic: `عندك ${money(available)} درهم. تقدر تخرج بالبانكة، بالواليت، ولا عند أجون كاش. اختار وشحال بغيتي.`,
        french: `Vous avez ${mad(available)}. Retrait par banque, wallet mobile ou agent cash, sans frais dans cette démo. Choisissez le moyen et le montant.`,
        card: {
          type: 'withdraw',
          available,
          suggested: Math.min(available, 20000),
        },
      };
    }
    case 'savings': {
      const tip = Math.max(2000, Math.round(week.total / 20 / 1000) * 1000);
      return {
        intent,
        darija: `Ila khbiti ${mad(tip)} f simana, ghadi ykoun 3endek ${mad(tip * 52)} f l'3am. Bghiti nfekkrek kol nhar l'had?`,
        arabic: `إلا خبيتي ${money(tip)} درهم فالسيمانة، غادي يكون عندك ${money(tip * 52)} فالعام.`,
        french: `En mettant ${mad(tip)} de côté par semaine, vous aurez ${mad(tip * 52)} en un an. Voulez-vous un rappel chaque dimanche ?`,
      };
    }
    case 'loan':
      return {
        intent,
        darija:
          "B l'activité dyalek, tqder tkoun éligible l chi offre dyal kredi m3a partenaire. Walakin ma n9derch n9errer bohdi: wa7ed men l'équipe ghadi y3eyet lik.",
        arabic: 'بالنشاط ديالك، تقدر تكون مؤهل لعرض ديال الكريدي. واحد من الفريق غادي يعيط ليك.',
        french:
          'Votre activité pourrait vous rendre éligible à une offre de prêt d’un partenaire. Je ne décide pas seul : un membre de l’équipe peut vous rappeler.',
        card: { type: 'handoff' },
      };
    case 'greeting':
      return {
        intent,
        darija:
          "Salam! Ana l'assistant dyal TapTaxi. Swelni 3la flousek: chhal dkhelti, l'AMO, l'owner wla l'retrait.",
        arabic: 'سلام! أنا المساعد ديال تاب تاكسي. سولني على فلوسك.',
        french:
          'Bonjour ! Je suis l’assistant TapTaxi. Posez-moi vos questions sur vos gains, l’AMO, le propriétaire ou les retraits.',
      };
    case 'thanks':
      return {
        intent,
        darija: 'Bla jmil! Ana hna ila htajiti chi haja.',
        arabic: 'بلا جميل! أنا هنا إلا احتاجيتي شي حاجة.',
        french: 'Avec plaisir ! Je suis là si vous avez besoin.',
      };
    default:
      return {
        intent,
        darija:
          "Sme7li, ma fhemtch mzyan. Tqder t3awed b tariqa okhra, wla nwasslek b wa7ed men l'équipe?",
        arabic: 'سمحلي، ما فهمتش مزيان. تقدر تعاود، ولا نوصلك بواحد من الفريق؟',
        french:
          'Désolé, je ne suis pas sûr d’avoir compris. Reformulez, ou je vous mets en relation avec une personne de l’équipe.',
        card: { type: 'handoff' },
      };
  }
}

export interface Reminder {
  id: string;
  title: string;
  body: string;
  icon: 'shield' | 'wallet' | 'sparkles';
}

/** Proactive reminders shown at the top of the chat (notifications, no action needed). */
export function proactiveReminders(s: AppState, now = Date.now()): Reminder[] {
  const items: Reminder[] = [];
  if (!paidThisMonth(s, now))
    items.push({
      id: 'amo',
      icon: 'shield',
      title: `AMO : échéance dans ${daysUntilDue(now)} jours`,
      body: `${mad(COVERAGE.monthly)} à payer avant la fin du mois. Dites « Khelles AMO ».`,
    });
  const week = earningsSummary(s, 'week', now);
  const save = Math.max(2000, Math.round(week.total / 20 / 1000) * 1000);
  items.push({
    id: 'savings',
    icon: 'wallet',
    title: 'Suggestion d’épargne',
    body: `Belle semaine (${mad(week.total)}). Mettez ${mad(save)} de côté ?`,
  });
  if (week.digitalCount >= 20)
    items.push({
      id: 'loan',
      icon: 'sparkles',
      title: 'Vous êtes éligible à une offre de prêt',
      body: 'Grâce à vos paiements TapTaxi réguliers. Offre partenaire, démo.',
    });
  return items;
}
