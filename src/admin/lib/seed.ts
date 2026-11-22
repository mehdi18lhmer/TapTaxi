// Demo data for the admin back office. Fictional people, documents and amounts.
// Payments are generated deterministically from the drivers, so they are never stored.
import type {
  AdminState,
  Driver,
  DriverDocument,
  Payment,
  Ticket,
  TicketMessage,
  Withdrawal,
} from "./types";
import type { PayoutMethod } from "../../lib/model";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
const YEAR = 365 * DAY;

/** Small deterministic PRNG (mulberry32) so the demo looks the same on every load. */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) =>
  [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

interface DriverSpec {
  name: string;
  city: string;
  taxi: string;
  plate: string;
  activity: number;
  payout: PayoutMethod;
  /** Days since the application was submitted. */
  age: number;
  application?: Driver["application"];
  account?: Driver["account"];
  /** Deliberate problems so the review checks have something to find. */
  issue?: "name" | "expired" | "plate" | "missing-photo" | "blurry";
}

/**
 * Plates mix digits with an Arabic letter ("48213 | ب | 6"). Left-to-right marks keep the
 * parts in written order; without them the browser's bidi algorithm swaps the digits.
 */
const plate = (s: string) => s.replace(/([\u0600-\u06FF]+)/g, "\u200E$1\u200E");

const rawSpecs: DriverSpec[] = [
  {
    name: "Youssef Benali",
    city: "Casablanca",
    taxi: "1287",
    plate: "48213 | ب | 6",
    activity: 8,
    payout: "agency",
    age: 74,
  },
  {
    name: "Khadija Amrani",
    city: "Casablanca",
    taxi: "0942",
    plate: "51207 | أ | 6",
    activity: 9,
    payout: "wallet",
    age: 210,
  },
  {
    name: "Abdelilah Saidi",
    city: "Rabat",
    taxi: "0318",
    plate: "22841 | د | 1",
    activity: 6,
    payout: "bank",
    age: 160,
  },
  {
    name: "Mustapha Ouazzani",
    city: "Marrakech",
    taxi: "2210",
    plate: "36019 | هـ | 40",
    activity: 7,
    payout: "agency",
    age: 120,
  },
  {
    name: "Imane Kettani",
    city: "Casablanca",
    taxi: "1764",
    plate: "40357 | ب | 6",
    activity: 5,
    payout: "wallet",
    age: 95,
  },
  {
    name: "Hicham Raji",
    city: "Tanger",
    taxi: "0577",
    plate: "19832 | و | 47",
    activity: 6,
    payout: "bank",
    age: 300,
  },
  {
    name: "Samir El Idrissi",
    city: "Fès",
    taxi: "1102",
    plate: "27448 | ج | 15",
    activity: 4,
    payout: "agency",
    age: 55,
  },
  {
    name: "Latifa Zerouali",
    city: "Rabat",
    taxi: "0855",
    plate: "33910 | أ | 1",
    activity: 7,
    payout: "wallet",
    age: 240,
  },
  {
    name: "Driss Fikri",
    city: "Casablanca",
    taxi: "1990",
    plate: "45126 | د | 6",
    activity: 10,
    payout: "agency",
    age: 330,
  },
  {
    name: "Aziz Mansouri",
    city: "Marrakech",
    taxi: "2045",
    plate: "38274 | ب | 40",
    activity: 5,
    payout: "bank",
    age: 82,
  },
  {
    name: "Zineb Haddou",
    city: "Casablanca",
    taxi: "1433",
    plate: "41598 | هـ | 6",
    activity: 6,
    payout: "wallet",
    age: 66,
  },
  {
    name: "Brahim Ait Lahcen",
    city: "Agadir",
    taxi: "0721",
    plate: "29563 | ج | 33",
    activity: 5,
    payout: "agency",
    age: 140,
  },
  {
    name: "Nabil Chafik",
    city: "Tanger",
    taxi: "0690",
    plate: "17305 | أ | 47",
    activity: 4,
    payout: "bank",
    age: 45,
  },
  {
    name: "Souad Belkadi",
    city: "Rabat",
    taxi: "0402",
    plate: "31872 | و | 1",
    activity: 6,
    payout: "wallet",
    age: 190,
  },
  {
    name: "Said Lahlou",
    city: "Casablanca",
    taxi: "1555",
    plate: "43781 | ب | 6",
    activity: 6,
    payout: "agency",
    age: 260,
    account: "suspended",
  },
  // Applications waiting for review.
  {
    name: "Karim Alaoui",
    city: "Casablanca",
    taxi: "2301",
    plate: "52014 | أ | 6",
    activity: 0,
    payout: "agency",
    age: 3,
    application: "pending",
  },
  {
    name: "Fatima-Zahra Idrissi",
    city: "Rabat",
    taxi: "0981",
    plate: "34102 | د | 1",
    activity: 0,
    payout: "wallet",
    age: 2,
    application: "pending",
    issue: "name",
  },
  {
    name: "Mohamed Tazi",
    city: "Fès",
    taxi: "1207",
    plate: "28390 | هـ | 15",
    activity: 0,
    payout: "bank",
    age: 2,
    application: "pending",
    issue: "expired",
  },
  {
    name: "Hamza Bennani",
    city: "Casablanca",
    taxi: "2288",
    plate: "52230 | ب | 6",
    activity: 0,
    payout: "agency",
    age: 1,
    application: "pending",
    issue: "plate",
  },
  {
    name: "Nadia El Fassi",
    city: "Marrakech",
    taxi: "2190",
    plate: "39004 | و | 40",
    activity: 0,
    payout: "wallet",
    age: 1,
    application: "pending",
    issue: "missing-photo",
  },
  {
    name: "Rachid Berrada",
    city: "Tanger",
    taxi: "0712",
    plate: "18877 | ج | 47",
    activity: 0,
    payout: "agency",
    age: 6,
    application: "changes_requested",
    issue: "blurry",
  },
  {
    name: "Omar Chraibi",
    city: "Casablanca",
    taxi: "2002",
    plate: "50981 | د | 6",
    activity: 0,
    payout: "bank",
    age: 12,
    application: "rejected",
    account: "rejected",
  },
];

const specs = rawSpecs.map((s) => ({ ...s, plate: plate(s.plate) }));

function documentsFor(
  spec: DriverSpec,
  id: string,
  submittedAt: number,
  reviewed: boolean,
): DriverDocument[] {
  const rnd = random(hash(id));
  const digits = (n: number) =>
    Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");
  const status = reviewed ? "approved" : "pending";
  const base = {
    uploadedAt: submittedAt,
    status,
    ...(reviewed
      ? { reviewedAt: submittedAt + DAY, reviewer: "Salma B." }
      : {}),
  } as const;
  const docs: DriverDocument[] = [
    {
      ...base,
      type: "cin",
      fields: {
        "Nom complet":
          spec.issue === "name" ? "Fatima Zahra Idrissi" : spec.name,
        "N° CIN": `${["BK", "AB", "BE", "JC"][Math.floor(rnd() * 4)]}${digits(6)}`,
        "Date de naissance": `${1 + Math.floor(rnd() * 28)}/${1 + Math.floor(rnd() * 12)}/${1970 + Math.floor(rnd() * 25)}`,
      },
      expiresAt: submittedAt + (3 + Math.floor(rnd() * 6)) * YEAR,
    },
    {
      ...base,
      type: "permit",
      fields: {
        Titulaire: spec.name,
        "N° permis de confiance": `PC-${2015 + Math.floor(rnd() * 9)}-${digits(5)}`,
        Catégorie: "Petit taxi",
      },
      expiresAt:
        spec.issue === "expired"
          ? submittedAt - 18 * DAY
          : submittedAt + (1 + Math.floor(rnd() * 4)) * YEAR,
    },
    {
      ...base,
      type: "vehicle",
      fields: {
        Immatriculation:
          spec.issue === "plate" ? plate("52203 | ب | 6") : spec.plate,
        "N° d’agrément": `AG-${spec.taxi}-${digits(3)}`,
        Véhicule: ["Dacia Logan", "Peugeot 301", "Fiat Tipo", "Dacia Lodgy"][
          Math.floor(rnd() * 4)
        ],
      },
    },
    { ...base, type: "photo", fields: {} },
  ];
  if (spec.issue === "missing-photo") docs.pop();
  if (spec.issue === "blurry") {
    docs[0] = {
      ...docs[0],
      status: "rejected",
      rejectionReason: "Document illisible ou flou",
      reviewedAt: submittedAt + DAY,
      reviewer: "Yassine K.",
    };
    for (const d of docs.slice(1))
      Object.assign(d, {
        status: "approved",
        reviewedAt: submittedAt + DAY,
        reviewer: "Yassine K.",
      });
  }
  return docs;
}

function createDrivers(now: number): Driver[] {
  return specs
    .map((spec, i) => {
      const id = `D${String(i + 1).padStart(2, "0")}`;
      const rnd = random(hash(id) + 1);
      const application = spec.application ?? "approved";
      const submittedAt = now - spec.age * DAY - Math.floor(rnd() * 10) * HOUR;
      return {
        id,
        name: spec.name,
        phone: `+212 6 ${Math.floor(10 + rnd() * 89)} ${Math.floor(10 + rnd() * 89)} ${Math.floor(10 + rnd() * 89)} ${Math.floor(10 + rnd() * 89)}`,
        city: spec.city,
        taxiNumber: spec.taxi,
        plate: spec.plate,
        permitNumber: "",
        submittedAt,
        application,
        account:
          spec.account ??
          (application === "approved"
            ? "active"
            : application === "rejected"
              ? "rejected"
              : "onboarding"),
        documents: documentsFor(
          spec,
          id,
          submittedAt,
          application === "approved" || application === "rejected",
        ),
        notes:
          spec.account === "suspended"
            ? [
                {
                  id: "N1",
                  author: "Amina R.",
                  body: "Suspension : plusieurs signalements de passagers pour refus de course, en attente d’entretien.",
                  at: now - 4 * DAY,
                },
              ]
            : application === "rejected"
              ? [
                  {
                    id: "N1",
                    author: "Salma B.",
                    body: "Refus : la carte grise appartient à un autre taxi (agrément non transférable).",
                    at: now - 10 * DAY,
                  },
                ]
              : [],
        payout: spec.payout,
        rating: Math.round((4.3 + rnd() * 0.7) * 10) / 10,
        activity: spec.activity,
      };
    })
    .map((d) => ({
      ...d,
      permitNumber:
        d.documents.find((x) => x.type === "permit")?.fields[
          "N° permis de confiance"
        ] ?? "",
    }));
}

const HOURS = [
  6, 7, 7, 8, 8, 9, 10, 11, 12, 12, 13, 14, 15, 16, 17, 17, 18, 18, 19, 19, 20,
  21, 22, 23,
];

/**
 * Payments for the last `days` days. Each driver-day draws from its own seed, so a given
 * day always produces the same rides no matter when the dashboard is opened.
 */
export function generatePayments(
  drivers: Driver[],
  now: number,
  days = 120,
): Payment[] {
  const payments: Payment[] = [];
  const today = Math.floor(now / DAY);
  for (const driver of drivers) {
    if (!driver.activity) continue;
    const start = Math.max(
      today - days,
      Math.floor(driver.submittedAt / DAY) + 2,
    );
    for (let day = start; day <= today; day++) {
      const rnd = random(hash(driver.id) ^ day);
      const weekday = new Date(day * DAY).getUTCDay();
      if (rnd() < 0.12) continue; // day off
      const weekendBoost = weekday === 5 || weekday === 6 ? 1.25 : 1;
      const count = Math.round(
        driver.activity * weekendBoost * (0.6 + rnd() * 0.8),
      );
      for (let n = 0; n < count; n++) {
        const at =
          day * DAY +
          HOURS[Math.floor(rnd() * HOURS.length)] * HOUR +
          Math.floor(rnd() * 60) * MINUTE -
          HOUR;
        if (at > now) continue;
        const fare = Math.round((900 + rnd() * rnd() * 6000) / 50) * 50;
        const tipRoll = rnd();
        payments.push({
          id: `${driver.id.slice(1)}${day.toString(36).toUpperCase()}${n.toString(36).toUpperCase()}`,
          driverId: driver.id,
          fare,
          tip: tipRoll < 0.08 ? 1000 : tipRoll < 0.2 ? 500 : 0,
          method: rnd() < 0.57 ? "card" : "wallet",
          at,
        });
      }
    }
  }
  return payments.sort((a, b) => b.at - a.at);
}

function createWithdrawals(drivers: Driver[], now: number): Withdrawal[] {
  const rnd = random(99);
  const active = drivers.filter((d) => d.activity > 0);
  const list: Withdrawal[] = [];
  for (let i = 0; i < 46; i++) {
    const driver = active[Math.floor(rnd() * active.length)];
    const ageHours = i < 5 ? 2 + i * 5 : 24 + Math.floor(rnd() * 60 * 24);
    list.push({
      id: `W${String(4800 - i)}`,
      driverId: driver.id,
      amount: (2 + Math.floor(rnd() * 14)) * 5000,
      method: driver.payout,
      at: now - ageHours * HOUR,
      status: i < 5 ? "pending" : rnd() < 0.05 ? "failed" : "paid",
    });
  }
  return list.sort((a, b) => b.at - a.at);
}

type Thread = [Ticket["messages"][number]["from"], string, number, boolean?][];

function ticket(
  id: string,
  base: Omit<Ticket, "id" | "messages" | "createdAt" | "updatedAt">,
  createdAgo: number,
  thread: Thread,
  now: number,
): Ticket {
  const createdAt = now - createdAgo;
  const messages: TicketMessage[] = thread.map(
    ([from, body, after, internal], i) => ({
      id: `${id}-${i + 1}`,
      from,
      author:
        from === "requester"
          ? base.requester.name
          : (base.assignee ?? "Salma B."),
      body,
      at: createdAt + after,
      internal,
    }),
  );
  return {
    id,
    ...base,
    createdAt,
    updatedAt: messages[messages.length - 1].at,
    messages,
  };
}

function createTickets(drivers: Driver[], now: number): Ticket[] {
  const d = (name: string) => drivers.find((x) => x.name === name)!;
  const asDriver = (name: string) => ({
    requester: { name, role: "driver" as const, phone: d(name).phone },
    driverId: d(name).id,
  });
  return [
    ticket(
      "T-1042",
      {
        subject: "Retrait de 500 MAD pas reçu",
        category: "withdrawal",
        priority: "urgent",
        status: "open",
        ...asDriver("Driss Fikri"),
      },
      95 * MINUTE,
      [
        [
          "requester",
          "Salam, j’ai fait un retrait de 500 MAD hier soir vers Cash Plus et l’agence me dit que le code n’est pas valable. J’ai besoin de cet argent pour le carburant.",
          0,
        ],
      ],
      now,
    ),
    ticket(
      "T-1041",
      {
        subject: "Le passager a payé mais je ne vois rien",
        category: "payment",
        priority: "high",
        status: "open",
        ...asDriver("Khadija Amrani"),
      },
      5 * HOUR,
      [
        [
          "requester",
          "Bonjour, une passagère m’a montré son écran « paiement réussi » pour 35 MAD mais rien n’apparaît dans mon historique. Référence sur son reçu : #AB12.",
          0,
        ],
      ],
      now,
    ),
    ticket(
      "T-1040",
      {
        subject: "Comment renvoyer ma CIN ?",
        category: "documents",
        priority: "normal",
        status: "waiting",
        assignee: "Yassine K.",
        ...asDriver("Rachid Berrada"),
      },
      2 * DAY,
      [
        [
          "requester",
          "On m’a dit que ma CIN est floue. Où est-ce que je dois l’envoyer encore ?",
          0,
        ],
        [
          "agent",
          "Bonjour, un de vos documents n’a pas pu être validé. Ouvrez l’application TapTaxi, puis Profil › Mes documents, et envoyez une nouvelle photo nette, sans reflet.",
          40 * MINUTE,
        ],
      ],
      now,
    ),
    ticket(
      "T-1039",
      {
        subject: "Double débit sur ma carte",
        category: "passenger",
        priority: "high",
        status: "open",
        requester: {
          name: "Leila M. (passagère)",
          role: "passenger",
          phone: "+212 6 61 20 44 18",
        },
        driverId: d("Imane Kettani").id,
      },
      26 * HOUR,
      [
        [
          "requester",
          "Bonjour, j’ai été débitée deux fois de 27 MAD pour la même course hier vers 19h (taxi 1764). Pouvez-vous me rembourser ?",
          0,
        ],
        [
          "agent",
          "Vérifier avec le PSP : un seul paiement côté ledger, possible pré-autorisation non libérée.",
          3 * HOUR,
          true,
        ],
      ],
      now,
    ),
    ticket(
      "T-1038",
      {
        subject: "Changer mon RIB",
        category: "account",
        priority: "normal",
        status: "open",
        ...asDriver("Abdelilah Saidi"),
      },
      9 * HOUR,
      [
        [
          "requester",
          "Je voudrais changer mon compte bancaire pour les retraits, j’ai ouvert un nouveau compte chez CIH.",
          0,
        ],
      ],
      now,
    ),
    ticket(
      "T-1037",
      {
        subject: "Pourboire non crédité",
        category: "payment",
        priority: "normal",
        status: "resolved",
        assignee: "Salma B.",
        ...asDriver("Latifa Zerouali"),
      },
      3 * DAY,
      [
        [
          "requester",
          "Le passager m’a laissé 10 MAD de pourboire mais je vois seulement le montant de la course.",
          0,
        ],
        [
          "agent",
          "Bonjour, nous avons vérifié ce paiement. Le pourboire de 10 MAD est bien crédité, il apparaît dans le détail du paiement sous « Pourboire ».",
          2 * HOUR,
        ],
        [
          "requester",
          "Ah oui je le vois maintenant, merci beaucoup !",
          5 * HOUR,
        ],
      ],
      now,
    ),
    ticket(
      "T-1036",
      {
        subject: "Pourquoi mon compte est suspendu ?",
        category: "account",
        priority: "high",
        status: "waiting",
        assignee: "Amina R.",
        ...asDriver("Said Lahlou"),
      },
      4 * DAY,
      [
        [
          "requester",
          "Mon application dit que mon compte est suspendu. Je n’ai rien fait de mal.",
          0,
        ],
        [
          "agent",
          "Bonjour M. Lahlou, votre compte est suspendu suite à plusieurs signalements. Nous vous proposons un entretien à l’agence de Casablanca jeudi à 10h. Est-ce possible pour vous ?",
          3 * HOUR,
        ],
      ],
      now,
    ),
    ticket(
      "T-1035",
      {
        subject: "QR code ne s’affiche pas",
        category: "other",
        priority: "low",
        status: "resolved",
        assignee: "Yassine K.",
        ...asDriver("Samir El Idrissi"),
      },
      6 * DAY,
      [
        [
          "requester",
          "Quand je tape le montant, l’écran reste blanc et le QR ne vient pas.",
          0,
        ],
        [
          "agent",
          "Bonjour, pouvez-vous mettre à jour l’application depuis le Play Store puis réessayer ? La version 1.0.2 corrige ce problème.",
          6 * HOUR,
        ],
        ["requester", "C’est bon ça marche.", 20 * HOUR],
      ],
      now,
    ),
    ticket(
      "T-1034",
      {
        subject: "Reçu pour note de frais",
        category: "passenger",
        priority: "low",
        status: "open",
        requester: {
          name: "Karim D. (passager)",
          role: "passenger",
          phone: "+212 6 70 11 82 09",
        },
      },
      30 * HOUR,
      [
        [
          "requester",
          "Bonjour, j’ai perdu le reçu d’une course du 12. Pouvez-vous me le renvoyer par e-mail pour ma note de frais ?",
          0,
        ],
      ],
      now,
    ),
    ticket(
      "T-1033",
      {
        subject: "Délai validation inscription",
        category: "documents",
        priority: "normal",
        status: "open",
        ...asDriver("Karim Alaoui"),
      },
      20 * HOUR,
      [
        [
          "requester",
          "J’ai envoyé mes documents il y a 3 jours. Quand est-ce que mon compte sera activé ?",
          0,
        ],
      ],
      now,
    ),
    ticket(
      "T-1032",
      {
        subject: "Retrait vers wallet échoué",
        category: "withdrawal",
        priority: "normal",
        status: "resolved",
        assignee: "Amina R.",
        ...asDriver("Zineb Haddou"),
      },
      8 * DAY,
      [
        [
          "requester",
          "Mon retrait vers mon wallet a échoué, l’argent est revenu ?",
          0,
        ],
        [
          "agent",
          "Bonjour, oui, le montant a été recrédité sur votre solde TapTaxi. Vérifiez que votre numéro de wallet est actif puis relancez le retrait.",
          90 * MINUTE,
        ],
      ],
      now,
    ),
  ];
}

export function createAdminSeed(now = Date.now()): AdminState {
  const drivers = createDrivers(now);
  const audit = [
    {
      id: "A3",
      at: now - 4 * DAY,
      actor: "Amina R.",
      action: "a suspendu le compte de Said Lahlou",
      link: `/drivers/${drivers[14].id}`,
    },
    {
      id: "A2",
      at: now - 5 * DAY,
      actor: "Yassine K.",
      action: "a demandé des corrections à Rachid Berrada",
      link: `/verifications/${drivers[20].id}`,
    },
    {
      id: "A1",
      at: now - 10 * DAY,
      actor: "Salma B.",
      action: "a refusé l’inscription de Omar Chraibi",
      link: `/verifications/${drivers[21].id}`,
    },
  ];
  return {
    version: 1,
    drivers,
    withdrawals: createWithdrawals(drivers, now),
    tickets: createTickets(drivers, now),
    audit,
  };
}
