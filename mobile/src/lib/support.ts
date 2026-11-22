// Support requests sent from the app (driver or passenger). Pure functions, no React/Expo.
// Demo: requests stay on this device and get an automatic acknowledgement. A real version
// sends them to the server, where they appear in the admin "Support" inbox.
import type { Role } from './roles';

export type RequestCategory =
  'payment' | 'receipt' | 'card' | 'withdrawal' | 'documents' | 'account' | 'other';
export type RequestStatus = 'open' | 'answered' | 'closed';

export interface RequestMessage {
  id: string;
  from: 'me' | 'support';
  body: string;
  at: number;
  /** Sent by the system, not by a person. */
  automatic?: boolean;
}

export interface SupportRequest {
  id: string;
  role: Role;
  category: RequestCategory;
  subject: string;
  /** Payment the request is about, e.g. from "Signaler un problème" on a receipt. */
  paymentId?: string;
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
  messages: RequestMessage[];
}

export interface SupportState {
  version: 1;
  requests: SupportRequest[];
}

export const emptySupport = (): SupportState => ({ version: 1, requests: [] });

export const categoryLabel: Record<RequestCategory, string> = {
  payment: 'Paiement',
  receipt: 'Reçu',
  card: 'Carte bancaire',
  withdrawal: 'Retrait',
  documents: 'Documents',
  account: 'Mon compte',
  other: 'Autre',
};

/** Categories offered to each role, most common first. */
export const categoriesFor: Record<Role, RequestCategory[]> = {
  passenger: ['payment', 'receipt', 'card', 'account', 'other'],
  driver: ['payment', 'withdrawal', 'documents', 'account', 'other'],
};

export const statusLabel: Record<RequestStatus, string> = {
  open: 'En cours',
  answered: 'Répondu',
  closed: 'Fermée',
};

/** Reply time promised in the acknowledgement; payment problems are handled first. */
export const promisedReply = (category: RequestCategory) =>
  category === 'payment' || category === 'withdrawal' ? '4 heures' : '24 heures';

export const MIN_MESSAGE = 10;
export const MAX_MESSAGE = 1000;

function checkMessage(body: string) {
  const text = body.trim();
  if (text.length < MIN_MESSAGE)
    throw new Error(`Décrivez le problème en quelques mots (${MIN_MESSAGE} caractères minimum).`);
  if (text.length > MAX_MESSAGE)
    throw new Error(`Message trop long (${MAX_MESSAGE} caractères maximum).`);
  return text;
}

export function createRequest(
  s: SupportState,
  input: {
    role: Role;
    category: RequestCategory;
    subject: string;
    body: string;
    paymentId?: string;
  },
  id: string,
  now = Date.now(),
): { state: SupportState; request: SupportRequest } {
  if (!categoriesFor[input.role].includes(input.category)) throw new Error('Choisissez un sujet.');
  const subject = input.subject.trim();
  if (subject.length < 3) throw new Error('Donnez un titre à votre demande.');
  const body = checkMessage(input.body);
  const request: SupportRequest = {
    id,
    role: input.role,
    category: input.category,
    subject: subject.slice(0, 80),
    paymentId: input.paymentId,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    messages: [
      { id: `${id}-1`, from: 'me', body, at: now },
      {
        id: `${id}-2`,
        from: 'support',
        automatic: true,
        at: now,
        body: `Merci, votre demande ${id} est bien reçue. Notre équipe vous répond sous ${promisedReply(input.category)}.`,
      },
    ],
  };
  return { request, state: { ...s, requests: [request, ...s.requests] } };
}

export function addMessage(
  s: SupportState,
  id: string,
  body: string,
  now = Date.now(),
): SupportState {
  const text = checkMessage(body);
  const found = s.requests.find((r) => r.id === id);
  if (!found) throw new Error('Demande introuvable.');
  if (found.status === 'closed')
    throw new Error('Cette demande est fermée. Créez une nouvelle demande.');
  return {
    ...s,
    requests: s.requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: 'open',
            updatedAt: now,
            messages: [
              ...r.messages,
              { id: `${id}-${r.messages.length + 1}`, from: 'me', body: text, at: now },
            ],
          }
        : r,
    ),
  };
}

export function closeRequest(s: SupportState, id: string, now = Date.now()): SupportState {
  if (!s.requests.some((r) => r.id === id)) throw new Error('Demande introuvable.');
  return {
    ...s,
    requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'closed', updatedAt: now } : r)),
  };
}

/** This role's requests: open ones first, then most recently updated. */
export function requestsFor(s: SupportState, role: Role) {
  return s.requests
    .filter((r) => r.role === role)
    .sort(
      (a, b) =>
        Number(a.status === 'closed') - Number(b.status === 'closed') || b.updatedAt - a.updatedAt,
    );
}

export function restoreSupport(raw: string | null): SupportState {
  try {
    const s = JSON.parse(raw ?? 'null') as SupportState;
    const ok =
      s?.version === 1 &&
      Array.isArray(s.requests) &&
      s.requests.every(
        (r) =>
          typeof r?.id === 'string' &&
          (r.role === 'driver' || r.role === 'passenger') &&
          r.category in categoryLabel &&
          r.status in statusLabel &&
          Array.isArray(r.messages),
      );
    return ok ? s : emptySupport();
  } catch {
    return emptySupport();
  }
}

/** Frequently asked questions, per role. */
export const FAQ: Record<Role, [question: string, answer: string][]> = {
  passenger: [
    [
      'Comment payer mon taxi ?',
      'Ouvrez Scanner, visez le QR affiché par le chauffeur, vérifiez la plaque, ajoutez un pourboire si vous le souhaitez, puis payez par carte ou wallet.',
    ],
    [
      'Combien coûte le service ?',
      'Vous payez le montant du compteur plus 2,00 MAD de frais TapTaxi. Le pourboire est facultatif et va à 100 % au chauffeur.',
    ],
    [
      'Ma carte est-elle en sécurité ?',
      'Seuls la marque, les 4 derniers chiffres et la date d’expiration sont gardés. Le numéro complet et le CVV ne sont jamais enregistrés.',
    ],
    [
      'Où trouver mes reçus ?',
      'Dans l’onglet Reçus. Vous pouvez partager chaque reçu en PDF, ou tous vos reçus en une fois.',
    ],
    [
      'Le code QR a expiré',
      'Chaque code est valable 5 minutes et ne sert qu’une fois. Demandez au chauffeur d’en afficher un nouveau.',
    ],
    [
      'J’ai été débité deux fois',
      'Envoyez une demande au support avec la référence du reçu (par exemple TT-AB12). Nous vérifions et remboursons le double débit.',
    ],
  ],
  driver: [
    [
      'Comment encaisser un paiement ?',
      'Touchez Encaisser, saisissez le montant du compteur et affichez le QR. Dans la démo, utilisez Tester le parcours passager sur le même appareil.',
    ],
    [
      'Comment retirer mon argent ?',
      'Ouvrez Portefeuille puis Retirer. Choisissez le montant et la méthode, puis confirmez. Les codes de cette version sont fictifs.',
    ],
    [
      'Qui paie les frais ?',
      'Le passager paie 2,00 MAD de frais. Le chauffeur reçoit 0,50 MAD de ces frais et la totalité du pourboire.',
    ],
    [
      'Mes documents sont-ils envoyés ?',
      'Non. Les fichiers sélectionnés ne sont ni conservés ni envoyés. Utilisez les documents fictifs pour tester l’inscription.',
    ],
    ['Quel est le code SMS de test ?', '123456. Aucun SMS réel n’est envoyé.'],
  ],
};
