// Passenger support agent: answers in Arabic, Darija, French or English, picked from the
// passenger's message. Scripted for the demo (keywords + the attached ride's real data).
// It handles complaints, lost & found, fare questions and how-to questions. Refunds,
// disputes and safety reports always go to a person ("A team member will follow up").
// When it is not sure, it says so and offers a person.

export type Lang = 'fr' | 'en' | 'ar' | 'darija';

export const langLabel: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  darija: 'Darija',
};

export type Topic =
  | 'lost'
  | 'fare'
  | 'complaint'
  | 'split'
  | 'gift'
  | 'topup'
  | 'refund'
  | 'dispute'
  | 'safety'
  | 'human'
  | 'greeting'
  | 'thanks'
  | 'unknown';

/** Topics that a person must handle. */
export const HANDOFF_TOPICS: Topic[] = ['refund', 'dispute', 'safety', 'human'];

const ARABIC = /[؀-ۿ]/;
const DARIJA_LATIN =
  /\b(wach|wesh|bghit|bghina|chno|chnou|achno|dyal|dial|kifach|kif|fin|fen|khlest|khllest|nsit|nssit|tlef|t9ad|3afak|afak|safi|mzyan|bzaf|chhal|ch7al|daba|walou|ana|nta|nti|had|lflous|flous|taxi dyali|sme7li|smahli|wa9ila|kayn|makaynch|mchat|dar)\b|[0-9][a-z]|[a-z][379][a-z]/i;
const FRENCH =
  /\b(je|j'|j’|le|la|les|mon|ma|mes|est|pas|une|un|du|des|bonjour|merci|oublié|perdu|payé|chauffeur|course|problème|combien|comment|rembours|svp|s'il)\b/i;
const ENGLISH =
  /\b(i|i'm|my|the|was|is|lost|left|charged|driver|ride|how|refund|please|hello|hi|thanks|help|what|why|can)\b/i;

/** The reply language, picked from the message itself. */
export function detectLanguage(text: string, fallback: Lang = 'fr'): Lang {
  if (ARABIC.test(text))
    return /(واش|بغيت|ديال|شنو|كيفاش|فين|نسيت|ضاع|خلصت|بزاف|شحال)/.test(text) ? 'darija' : 'ar';
  const darija = (text.match(new RegExp(DARIJA_LATIN, 'gi')) ?? []).length;
  const fr = (text.match(new RegExp(FRENCH, 'gi')) ?? []).length;
  const en = (text.match(new RegExp(ENGLISH, 'gi')) ?? []).length;
  if (darija > fr && darija >= en && darija > 0) return 'darija';
  if (en > fr) return 'en';
  if (fr > 0) return 'fr';
  return darija ? 'darija' : fallback;
}

const TOPICS: [Topic, RegExp][] = [
  [
    'safety',
    /agress|harc[eè]l|danger|peur|menac|unsafe|harass|assault|threat|scared|violence|khayf|khouf|t3dda|تحرش|خطر|اعتداء|خايف|تهديد/i,
  ],
  [
    'refund',
    /rembours|refund|money back|rdd? ?(li)? ?flous|rejje3|rje3 lflous|استرجاع|استرداد|رجع ليا الفلوس|رد الفلوس/i,
  ],
  [
    'dispute',
    /litige|contest|dispute|arnaque|escroc|vol[ée]|scam|fraud|cheat|chfer|nesbo|غش|نصب|احتيال|نزاع/i,
  ],
  [
    'human',
    /humain|personne|conseill|agent|human|real person|someone|operator|wa7ed men|chi wa7ed|موظف|شخص|إنسان/i,
  ],
  [
    'lost',
    /oubli|perdu|lost|left|forgot|nsit|nssit|tlef|tlf|dhaya3|ضاع|نسيت|فقدت|مفقود|telephone|téléphone|phone|sac|bag|wallet|portefeuille|clé|keys|parapluie/i,
  ],
  [
    'fare',
    /cher|factur|charg|montant|prix|tarif|price|fare|overcharg|expensive|combien|chhal|ch7al|ghali|ghla|compteur|meter|frais|fee|ثمن|غالي|شحال|الثمن|الفاتورة|العداد/i,
  ],
  ['split', /partag|split|diviser|share|n9essmo|nqsmo|qsem|قسم|نقسمو|نتقاسمو/i],
  ['gift', /offr|cadeau|gift|gifter|hadiya|hdiya|هدية|نهدي/i],
  [
    'topup',
    /recharg|top ?up|cr[ée]dit|ajouter de l'argent|add money|charger|chargi|n3ammer|nchargi|شحن|نعمر|نشارجي/i,
  ],
  [
    'complaint',
    /plainte|r[ée]clam|probl[eè]m|impoli|rude|mal|retard|late|complain|bad|sale|dirty|ma3jbnich|machi mzyan|mochkil|مشكل|شكاية|ماعجبنيش|خايب/i,
  ],
  ['thanks', /merci|thanks|thank you|choukran|shukran|baraka|شكرا/i],
  ['greeting', /^(bonjour|salut|hello|hi|salam|slm|bonsoir|السلام|سلام)\b/i],
];

export function detectTopic(text: string): Topic {
  for (const [topic, re] of TOPICS) if (re.test(text)) return topic;
  return 'unknown';
}

/** The ride attached to the conversation (from "Signaler un problème"). */
export interface RideContext {
  id: string;
  taxi: string;
  driver: string;
  date: string;
  fare: string;
  fee: string;
  tip: string;
  total: string;
  method: string;
  /** e.g. "18–23 MAD", when the ride was requested in the app. */
  estimate?: string;
  /** Compared with the estimate. */
  fareOk?: boolean;
}

export interface AgentReply {
  lang: Lang;
  topic: Topic;
  text: string;
  /** Handed to a person: a ticket is opened and the passenger sees "A team member will follow up". */
  handoff: boolean;
  /** The agent did something (e.g. contacted the driver). */
  action?: string;
  /** Not sure: offer to talk to a person. */
  unsure?: boolean;
}

type Strings = Record<Lang, string>;

const FOLLOW_UP: Strings = {
  fr: 'Un membre de l’équipe va vous recontacter.',
  en: 'A team member will follow up with you.',
  ar: 'سيتواصل معك أحد أعضاء الفريق.',
  darija: 'Wa7ed men l’équipe ghadi yt9assel bik.',
};
export const followUpText = (lang: Lang) => FOLLOW_UP[lang];

export const GREETING: Strings = {
  fr: 'Bonjour, je suis l’assistant TapTaxi. Je réponds en français, arabe, darija et anglais. Comment puis-je vous aider ?',
  en: 'Hello, I’m the TapTaxi assistant. I answer in English, French, Arabic and Darija. How can I help?',
  ar: 'مرحبا، أنا مساعد تاب تاكسي. كيف يمكنني مساعدتك؟',
  darija: 'Salam, ana l’assistant dyal TapTaxi. Kifach n9der n3awnek?',
};

export function agentReply(
  text: string,
  ride: RideContext | undefined,
  previous?: Lang,
): AgentReply {
  const lang = detectLanguage(text, previous);
  const topic = detectTopic(text);
  const r = ride;
  const t = (strings: Strings) => strings[lang];

  switch (topic) {
    case 'lost':
      return r
        ? {
            lang,
            topic,
            handoff: false,
            action: `Message envoyé au chauffeur du taxi n° ${r.taxi}`,
            text: t({
              fr: `J’ai prévenu ${r.driver}, le chauffeur du taxi n° ${r.taxi} (course du ${r.date}). Le chauffeur vérifie le véhicule et vous recontacte via TapTaxi. Votre numéro n’est pas communiqué.`,
              en: `I’ve messaged ${r.driver}, the driver of taxi no. ${r.taxi} (ride on ${r.date}). The driver will check the car and contact you through TapTaxi. Your number is not shared.`,
              ar: `أبلغت ${r.driver}، سائق الطاكسي رقم ${r.taxi}. سيتفقد السيارة ويتواصل معك عبر تاب تاكسي دون مشاركة رقمك.`,
              darija: `Sifet message l ${r.driver}, chauffeur dyal taxi n° ${r.taxi}. Ghadi ychouf f tomobil o yt9assel bik f TapTaxi. Ra9mek ma kaywselch lih.`,
            }),
          }
        : {
            lang,
            topic,
            handoff: false,
            unsure: true,
            text: t({
              fr: 'Pour contacter le bon chauffeur, ouvrez la course dans « Courses », puis « Signaler un problème ». Je saurai exactement quel taxi prévenir.',
              en: 'To reach the right driver, open the ride in “Courses”, then “Report a problem”. I’ll know exactly which taxi to contact.',
              ar: 'افتح الرحلة في «الرحلات» ثم «الإبلاغ عن مشكلة» لأعرف أي طاكسي أتصل به.',
              darija:
                ' 7el l’course f « Courses » o dir « Signaler un problème », bach n3ref ana taxi nkellem.',
            }),
          };
    case 'fare':
      return r
        ? {
            lang,
            topic,
            handoff: false,
            text: t({
              fr: `Détail de la course ${r.id} : compteur ${r.fare}, frais TapTaxi ${r.fee}, pourboire ${r.tip}, total ${r.total} (${r.method}).${r.estimate ? ` L’estimation était de ${r.estimate} : ${r.fareOk ? 'le montant est cohérent.' : 'le compteur est au-dessus. Si vous pensez qu’il y a une erreur, je transmets à l’équipe.'}` : ' Le compteur est le tarif officiel ; les frais TapTaxi vont de 0 à 3 MAD (+0,50 MAD la nuit).'}`,
              en: `Ride ${r.id}: meter ${r.fare}, TapTaxi fee ${r.fee}, tip ${r.tip}, total ${r.total} (${r.method}).${r.estimate ? ` The estimate was ${r.estimate}: ${r.fareOk ? 'the amount looks right.' : 'the meter is above it. If you think it’s wrong, I can pass it to the team.'}` : ' The meter is the official fare; TapTaxi’s fee is 0–3 MAD (+0.50 MAD at night).'}`,
              ar: `الرحلة ${r.id}: العداد ${r.fare}، رسوم تاب تاكسي ${r.fee}، البقشيش ${r.tip}، المجموع ${r.total}.${r.estimate ? ` التقدير كان ${r.estimate}.` : ''}`,
              darija: `L’course ${r.id}: compteur ${r.fare}, frais ${r.fee}, pourboire ${r.tip}, total ${r.total}.${r.estimate ? ` L’estimation kant ${r.estimate}: ${r.fareOk ? 'l’montant mzyan.' : 'l’compteur tla3 kter. Ila bghiti, nsifetha l l’équipe.'}` : ''}`,
            }),
          }
        : {
            lang,
            topic,
            handoff: false,
            text: t({
              fr: 'Vous payez le compteur officiel du taxi, plus des frais TapTaxi de 0 à 3 MAD selon le montant (+0,50 MAD la nuit). Le total est toujours affiché avant de payer. Pour vérifier une course précise, ouvrez-la dans « Courses ».',
              en: 'You pay the taxi’s official meter fare plus a TapTaxi fee of 0–3 MAD depending on the amount (+0.50 MAD at night). The total is always shown before you pay. To check a specific ride, open it in “Courses”.',
              ar: 'تدفع ثمن العداد الرسمي مع رسوم تاب تاكسي من 0 إلى 3 دراهم (+0.50 ليلا). يظهر المجموع دائما قبل الدفع.',
              darija:
                'Katkhelles l’compteur rasmi dyal taxi, o frais TapTaxi men 0 l 3 DH (+0,50 f lil). L’total kayban dima 9bel matkhelles.',
            }),
          };
    case 'split':
      return {
        lang,
        topic,
        handoff: false,
        text: t({
          fr: 'Pour partager : sur l’écran de paiement, touchez « Partager », ajoutez 1 à 3 amis (numéro ou QR). Chacun confirme sa part ; les frais s’appliquent à chaque part.',
          en: 'To split: on the payment screen tap “Split”, add 1–3 friends (phone or QR). Each confirms their share; the fee applies to each share.',
          ar: 'للتقسيم: في شاشة الدفع اضغط «تقسيم» وأضف من 1 إلى 3 أصدقاء. كل واحد يؤكد حصته.',
          darija:
            'Bach t9essmo: f l’écran dyal paiement dir « Partager », zid s7abek (ra9m wla QR). Kol wa7ed y2akked l’part dyalo.',
        }),
      };
    case 'gift':
      return {
        lang,
        topic,
        handoff: false,
        text: t({
          fr: 'Pour offrir une course : Accueil → « Offrir », choisissez un contact, le montant et un message. Il reçoit une notification et le montant sur son wallet TapTaxi.',
          en: 'To gift a ride: Home → “Gift”, pick a contact, the amount and a message. They get a notification and the balance in their TapTaxi wallet.',
          ar: 'لإهداء رحلة: الرئيسية ← «إهداء»، اختر جهة اتصال والمبلغ ورسالة.',
          darija: 'Bach tehdi course: Accueil → « Offrir », khtar l’contact, l’montant o message.',
        }),
      };
    case 'topup':
      return {
        lang,
        topic,
        handoff: false,
        text: t({
          fr: 'Pour recharger : Accueil → « Recharger ». Par carte, c’est immédiat ; en espèces, présentez le code chez un agent (Cash Plus, Wafacash).',
          en: 'To top up: Home → “Top up”. By card it’s instant; with cash, show the code at an agent (Cash Plus, Wafacash).',
          ar: 'للشحن: الرئيسية ← «شحن». بالبطاقة فورا، أو نقدا لدى وكيل مثل كاش بلوس.',
          darija:
            'Bach t3ammer: Accueil → « Recharger ». B l’carte daba daba, wla cash 3end agent (Cash Plus).',
        }),
      };
    case 'complaint':
      return {
        lang,
        topic,
        handoff: false,
        action: r ? `Signalement enregistré pour le taxi n° ${r.taxi}` : undefined,
        text: t({
          fr: r
            ? `Je suis désolé. J’ai enregistré votre signalement pour la course ${r.id} (taxi n° ${r.taxi}, ${r.driver}). La qualité de service est suivie pour chaque chauffeur. Souhaitez-vous un remboursement ou un échange avec l’équipe ?`
            : 'Je suis désolé. Pouvez-vous ouvrir la course concernée dans « Courses » → « Signaler un problème » ? Je l’enregistrerai pour le bon taxi.',
          en: r
            ? `I’m sorry. I’ve logged your report for ride ${r.id} (taxi no. ${r.taxi}, ${r.driver}). Service quality is tracked for every driver. Would you like a refund or to talk to the team?`
            : 'I’m sorry. Could you open the ride in “Courses” → “Report a problem”? I’ll log it for the right taxi.',
          ar: r
            ? `آسف. سجلت شكايتك للرحلة ${r.id} (طاكسي رقم ${r.taxi}).`
            : 'آسف. افتح الرحلة المعنية ثم «الإبلاغ عن مشكلة».',
          darija: r
            ? `Sme7li. Sjjelt l’chikaya dyalek 3la course ${r.id} (taxi n° ${r.taxi}).`
            : 'Sme7li. 7el l’course f « Courses » o dir « Signaler un problème ».',
        }),
      };
    case 'refund':
    case 'dispute':
    case 'safety':
    case 'human':
      return {
        lang,
        topic,
        handoff: true,
        text:
          (topic === 'safety'
            ? t({
                fr: 'Votre sécurité passe en premier. En cas de danger immédiat, appelez le 19 (police). ',
                en: 'Your safety comes first. If you are in immediate danger, call 19 (police). ',
                ar: 'سلامتك أولا. في حالة خطر فوري اتصل بالرقم 19 (الشرطة). ',
                darija: 'Salamtek hiya lowla. Ila kan khatar daba, 3eyet l 19 (police). ',
              })
            : topic === 'refund' || topic === 'dispute'
              ? t({
                  fr: 'Une personne de l’équipe examine chaque remboursement et chaque litige. ',
                  en: 'A person on the team reviews every refund and dispute. ',
                  ar: 'يراجع أحد أعضاء الفريق كل طلب استرجاع أو نزاع. ',
                  darija: 'Wa7ed men l’équipe kaychouf kol remboursement o kol mochkil. ',
                })
              : '') + FOLLOW_UP[lang],
      };
    case 'thanks':
      return {
        lang,
        topic,
        handoff: false,
        text: t({
          fr: 'Avec plaisir. Bonne route avec TapTaxi !',
          en: 'You’re welcome. Safe travels with TapTaxi!',
          ar: 'على الرحب والسعة. رحلة سعيدة!',
          darija: 'Bla jmil. Triq salama m3a TapTaxi!',
        }),
      };
    case 'greeting':
      return { lang, topic, handoff: false, text: GREETING[lang] };
    default:
      return {
        lang,
        topic,
        handoff: false,
        unsure: true,
        text: t({
          fr: 'Je ne suis pas sûr de bien comprendre. Pouvez-vous préciser (objet oublié, montant, partage, recharge…) ? Je peux aussi vous mettre en relation avec une personne.',
          en: 'I’m not sure I understand. Could you tell me more (lost item, amount, split, top up…)? I can also connect you with a person.',
          ar: 'لست متأكدا من أنني فهمت. هل يمكنك التوضيح؟ يمكنني أيضا تحويلك إلى أحد أعضاء الفريق.',
          darija: 'Ma fhemtch mzyan. Tqder twadda7 kter? Wla nwasslek b wa7ed men l’équipe.',
        }),
      };
  }
}
