import { useState } from "react";
import { ArrowLeft, CheckCheck, Lock, Send, UserRound } from "lucide-react";
import { AGENTS, useAdmin } from "../lib/store";
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "../lib/types";
import { categoryLabel, priorityLabel, ticketStatusLabel } from "../lib/labels";
import {
  assignTicket,
  cannedReplies,
  filterTickets,
  firstReplyTarget,
  isOverdue,
  replyToTicket,
  setTicketPriority,
  setTicketStatus,
} from "../lib/support";
import { ago, dateTime, duration } from "../lib/format";
import {
  Avatar,
  Button,
  Empty,
  PageHeader,
  SearchField,
  Segmented,
  StatusBadge,
} from "../components/ui";
import type { Tone } from "../components/ui";

const statusTone: Record<TicketStatus, Tone> = {
  open: "warning",
  waiting: "neutral",
  resolved: "good",
};
const priorityTone: Record<TicketPriority, Tone> = {
  urgent: "critical",
  high: "warning",
  normal: "neutral",
  low: "neutral",
};

export function Support({ id }: { id?: string }) {
  const { state, now, agent } = useAdmin();
  const selected = state.tickets.find((t) => t.id === id);
  // Opening a link to a specific ticket shows the tab that ticket is in.
  const [status, setStatus] = useState<TicketStatus | "all">(
    () => selected?.status ?? "open",
  );
  const [category, setCategory] = useState<TicketCategory | "all">("all");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");
  const list = filterTickets(
    state.tickets,
    { status, category, query, mine: mine ? agent : undefined },
    now,
  );
  const count = (s: TicketStatus) =>
    state.tickets.filter((t) => t.status === s).length;

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Questions des chauffeurs et des passagers. Les tickets en retard et urgents remontent en premier."
      />
      <div className={`split-view ${selected ? "has-detail" : ""}`}>
        <div className="list-pane">
          <Segmented
            label="Statut du ticket"
            value={status}
            onChange={setStatus}
            options={[
              { value: "open", label: "Ouverts", count: count("open") },
              {
                value: "waiting",
                label: "En attente",
                count: count("waiting"),
              },
              { value: "resolved", label: "Résolus", count: count("resolved") },
              { value: "all", label: "Tous" },
            ]}
          />
          <div className="filter-row">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Ticket, nom, téléphone…"
            />
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as TicketCategory | "all")
              }
              aria-label="Catégorie"
            >
              <option value="all">Toutes catégories</option>
              {Object.entries(categoryLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => setMine(e.target.checked)}
            />
            Seulement mes tickets ({agent})
          </label>
          <ul className="item-list">
            {list.map((t) => (
              <li key={t.id}>
                <a
                  href={`#/support/${t.id}`}
                  className={t.id === id ? "selected" : ""}
                  aria-current={t.id === id ? "true" : undefined}
                >
                  <span className="grow">
                    <span className="ticket-top">
                      <span className="mono">{t.id}</span>
                      <span>{categoryLabel[t.category]}</span>
                    </span>
                    <strong>{t.subject}</strong>
                    <span className="sub">
                      {t.requester.name} ·{" "}
                      {t.assignee ? `pris par ${t.assignee}` : "non attribué"}
                    </span>
                  </span>
                  <span className="item-meta">
                    <time>{ago(t.updatedAt, now)}</time>
                    {isOverdue(t, now) ? (
                      <StatusBadge tone="critical">En retard</StatusBadge>
                    ) : t.priority === "urgent" || t.priority === "high" ? (
                      <StatusBadge tone={priorityTone[t.priority]}>
                        {priorityLabel[t.priority]}
                      </StatusBadge>
                    ) : null}
                  </span>
                </a>
              </li>
            ))}
            {!list.length && (
              <Empty title="Aucun ticket">
                Rien ne correspond à ces filtres.
              </Empty>
            )}
          </ul>
        </div>
        <div className="detail-pane">
          {selected ? (
            <TicketDetail key={selected.id} ticket={selected} />
          ) : (
            <Empty title="Sélectionnez un ticket">
              Choisissez une conversation dans la liste.
            </Empty>
          )}
        </div>
      </div>
    </>
  );
}

function TicketDetail({ ticket }: { ticket: Ticket }) {
  const { state, act, agent, now } = useAdmin();
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const driver = state.drivers.find((d) => d.id === ticket.driverId);
  const overdue = isOverdue(ticket, now);

  const send = (resolve: boolean) => {
    if (
      act(
        (s) => replyToTicket(s, ticket.id, draft, agent, { internal, resolve }),
        resolve
          ? "Réponse envoyée, ticket résolu."
          : internal
            ? "Note interne ajoutée."
            : "Réponse envoyée.",
      )
    )
      setDraft("");
  };

  return (
    <div className="detail">
      <a className="back-link" href="#/support">
        <ArrowLeft size={16} aria-hidden /> Tous les tickets
      </a>
      <div className="detail-head">
        <div className="grow">
          <span className="ticket-top">
            <span className="mono">{ticket.id}</span>
            <span>{categoryLabel[ticket.category]}</span>
            <span>ouvert {ago(ticket.createdAt, now)}</span>
          </span>
          <h2>{ticket.subject}</h2>
          <p>
            {ticket.requester.name} · {ticket.requester.phone}
            {driver && (
              <>
                {" · "}
                <a href={`#/drivers/${driver.id}`}>Voir la fiche chauffeur</a>
              </>
            )}
          </p>
        </div>
        <StatusBadge tone={statusTone[ticket.status]}>
          {ticketStatusLabel[ticket.status]}
        </StatusBadge>
      </div>

      {overdue && (
        <div className="alert">
          Aucune réponse depuis {duration(now - ticket.createdAt)}. Délai cible
          pour une priorité « {priorityLabel[ticket.priority].toLowerCase()} » :{" "}
          {duration(firstReplyTarget[ticket.priority])}.
        </div>
      )}

      <div className="ticket-controls">
        <label>
          Priorité
          <select
            value={ticket.priority}
            onChange={(e) =>
              act((s) =>
                setTicketPriority(
                  s,
                  ticket.id,
                  e.target.value as TicketPriority,
                ),
              )
            }
          >
            {Object.entries(priorityLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Attribué à
          <select
            value={ticket.assignee ?? ""}
            onChange={(e) =>
              act((s) =>
                assignTicket(s, ticket.id, e.target.value || undefined),
              )
            }
          >
            <option value="">Personne</option>
            {AGENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {ticket.assignee !== agent && (
          <Button
            icon={<UserRound size={16} />}
            onClick={() =>
              act(
                (s) => assignTicket(s, ticket.id, agent),
                "Ticket attribué à vous.",
              )
            }
          >
            Prendre en charge
          </Button>
        )}
        {ticket.status === "resolved" ? (
          <Button
            onClick={() =>
              act(
                (s) => setTicketStatus(s, ticket.id, "open", agent),
                "Ticket rouvert.",
              )
            }
          >
            Rouvrir
          </Button>
        ) : (
          <Button
            icon={<CheckCheck size={16} />}
            onClick={() =>
              act(
                (s) => setTicketStatus(s, ticket.id, "resolved", agent),
                "Ticket résolu.",
              )
            }
          >
            Marquer comme résolu
          </Button>
        )}
      </div>

      <ol className="thread">
        {ticket.messages.map((m) => (
          <li
            key={m.id}
            className={`message ${m.from} ${m.internal ? "internal" : ""}`}
          >
            <Avatar name={m.author} size={30} />
            <div className="bubble">
              <div className="message-head">
                <strong>{m.author}</strong>
                {m.internal && (
                  <span className="internal-tag">
                    <Lock size={12} aria-hidden /> Note interne
                  </span>
                )}
                <time>{dateTime(m.at)}</time>
              </div>
              <p>{m.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <form
        className={`composer ${internal ? "internal" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          send(false);
        }}
      >
        <div className="chips" aria-label="Réponses rapides">
          {cannedReplies.map((c) => (
            <button
              type="button"
              key={c.title}
              className="chip"
              onClick={() => setDraft(c.body)}
            >
              {c.title}
            </button>
          ))}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          aria-label={internal ? "Note interne" : "Réponse"}
          placeholder={
            internal
              ? "Note visible uniquement par l’équipe…"
              : `Répondre à ${ticket.requester.name}…`
          }
        />
        <div className="composer-actions">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Note interne
          </label>
          <span className="grow" />
          {!internal && ticket.status !== "resolved" && (
            <Button disabled={!draft.trim()} onClick={() => send(true)}>
              Envoyer et résoudre
            </Button>
          )}
          <Button
            variant="primary"
            type="submit"
            icon={<Send size={16} />}
            disabled={!draft.trim()}
          >
            {internal ? "Ajouter la note" : "Envoyer"}
          </Button>
        </div>
        <p className="muted small">
          Démo : aucun SMS ni message n’est réellement envoyé.
        </p>
      </form>
    </div>
  );
}
