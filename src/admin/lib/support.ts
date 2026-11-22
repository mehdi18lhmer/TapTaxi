// Support ticket rules. Pure functions: they take state and return new state.
import type {
  AdminState,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "./types";
import { addAudit } from "./audit";
import { ticketStatusLabel } from "./labels";

const HOUR = 3_600_000;

/** Target time for a first agent reply, by priority. */
export const firstReplyTarget: Record<TicketPriority, number> = {
  urgent: 1 * HOUR,
  high: 4 * HOUR,
  normal: 24 * HOUR,
  low: 48 * HOUR,
};

const priorityRank: Record<TicketPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const firstAgentReply = (t: Ticket) =>
  t.messages.find((m) => m.from === "agent" && !m.internal);

/** A ticket is overdue when nobody has answered within its priority target. */
export function isOverdue(t: Ticket, now = Date.now()) {
  return (
    t.status !== "resolved" &&
    !firstAgentReply(t) &&
    now - t.createdAt > firstReplyTarget[t.priority]
  );
}

export interface TicketFilter {
  status: TicketStatus | "all";
  category: TicketCategory | "all";
  query: string;
  mine?: string;
}

/** Unresolved tickets first, then by urgency, then oldest first. */
export function filterTickets(
  tickets: Ticket[],
  f: TicketFilter,
  now = Date.now(),
) {
  const q = f.query.trim().toLowerCase();
  return tickets
    .filter(
      (t) =>
        (f.status === "all" || t.status === f.status) &&
        (f.category === "all" || t.category === f.category) &&
        (!f.mine || t.assignee === f.mine) &&
        (!q ||
          `${t.id} ${t.subject} ${t.requester.name} ${t.requester.phone}`
            .toLowerCase()
            .includes(q)),
    )
    .sort(
      (a, b) =>
        Number(a.status === "resolved") - Number(b.status === "resolved") ||
        Number(isOverdue(b, now)) - Number(isOverdue(a, now)) ||
        priorityRank[a.priority] - priorityRank[b.priority] ||
        a.createdAt - b.createdAt,
    );
}

function updateTicket(
  s: AdminState,
  id: string,
  fn: (t: Ticket) => Ticket,
): AdminState {
  if (!s.tickets.some((t) => t.id === id))
    throw new Error("Ticket introuvable.");
  return { ...s, tickets: s.tickets.map((t) => (t.id === id ? fn(t) : t)) };
}

export function replyToTicket(
  s: AdminState,
  id: string,
  body: string,
  actor: string,
  opts: { internal: boolean; resolve?: boolean },
  now = Date.now(),
): AdminState {
  const text = body.trim();
  if (!text) throw new Error("Le message est vide.");
  const next = updateTicket(s, id, (t) => ({
    ...t,
    assignee: t.assignee ?? actor,
    // A public reply hands the ball to the requester; a note changes nothing.
    status: opts.resolve ? "resolved" : opts.internal ? t.status : "waiting",
    updatedAt: now,
    messages: [
      ...t.messages,
      {
        id: `${id}-${t.messages.length + 1}`,
        from: "agent",
        author: actor,
        body: text,
        at: now,
        internal: opts.internal || undefined,
      },
    ],
  }));
  if (opts.internal && !opts.resolve) return next;
  return addAudit(
    next,
    actor,
    opts.resolve
      ? `a répondu et résolu le ticket ${id}`
      : `a répondu au ticket ${id}`,
    `/support/${id}`,
    now,
  );
}

export function setTicketStatus(
  s: AdminState,
  id: string,
  status: TicketStatus,
  actor: string,
  now = Date.now(),
) {
  const next = updateTicket(s, id, (t) => ({ ...t, status, updatedAt: now }));
  return addAudit(
    next,
    actor,
    `a passé le ticket ${id} en « ${ticketStatusLabel[status]} »`,
    `/support/${id}`,
    now,
  );
}

export function setTicketPriority(
  s: AdminState,
  id: string,
  priority: TicketPriority,
  now = Date.now(),
) {
  return updateTicket(s, id, (t) => ({ ...t, priority, updatedAt: now }));
}

export function assignTicket(
  s: AdminState,
  id: string,
  assignee: string | undefined,
  now = Date.now(),
) {
  return updateTicket(s, id, (t) => ({ ...t, assignee, updatedAt: now }));
}

/** Ready-made answers for the most common questions. */
export const cannedReplies = [
  {
    title: "Retrait en cours",
    body: "Bonjour, votre retrait est bien enregistré. Les retraits vers un compte bancaire arrivent sous 1 à 2 jours ouvrés. Nous revenons vers vous si besoin.",
  },
  {
    title: "Document à renvoyer",
    body: "Bonjour, un de vos documents n’a pas pu être validé. Ouvrez l’application TapTaxi, puis Profil › Mes documents, et envoyez une nouvelle photo nette, sans reflet.",
  },
  {
    title: "Paiement passager",
    body: "Bonjour, nous avons vérifié ce paiement. Il est bien crédité sur le portefeuille du chauffeur. La référence figure sur votre reçu.",
  },
  {
    title: "Demande d’informations",
    body: "Bonjour, merci pour votre message. Pouvez-vous nous indiquer la référence du paiement (par exemple #AB12) et l’heure approximative de la course ?",
  },
];
