import { useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MessageSquareWarning,
  X,
  XCircle,
} from "lucide-react";
import { useAdmin } from "../lib/store";
import { go } from "../lib/router";
import type {
  ApplicationStatus,
  DocStatus,
  DocType,
  Driver,
} from "../lib/types";
import {
  applicationLabel,
  docStatusLabel,
  docTitle,
  rejectionReasons,
} from "../lib/labels";
import {
  approveDriver,
  decisionState,
  documentChecks,
  rejectApplication,
  requestChanges,
  reviewDocument,
} from "../lib/verification";
import { ago, dateTime, fullDate } from "../lib/format";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Field,
  PageHeader,
  ReasonDialog,
  SearchField,
  Segmented,
  StatusBadge,
} from "../components/ui";
import type { Tone } from "../components/ui";
import { DocumentPreview } from "../components/DocumentPreview";

export const applicationTone: Record<ApplicationStatus, Tone> = {
  pending: "warning",
  changes_requested: "neutral",
  approved: "good",
  rejected: "critical",
};
const docTone: Record<DocStatus, Tone> = {
  pending: "warning",
  approved: "good",
  rejected: "critical",
};

export function Verifications({ id }: { id?: string }) {
  const { state, now } = useAdmin();
  const selected = state.drivers.find((d) => d.id === id);
  // Opening a link to a specific file shows the tab that file is in.
  const [status, setStatus] = useState<ApplicationStatus>(
    () => selected?.application ?? "pending",
  );
  const [query, setQuery] = useState("");
  const count = (s: ApplicationStatus) =>
    state.drivers.filter((d) => d.application === s).length;
  const q = query.trim().toLowerCase();
  const list = state.drivers
    .filter((d) => d.application === status)
    .filter(
      (d) =>
        !q ||
        `${d.name} ${d.taxiNumber} ${d.city} ${d.phone}`
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) =>
      status === "pending"
        ? a.submittedAt - b.submittedAt
        : b.submittedAt - a.submittedAt,
    );

  return (
    <>
      <PageHeader
        title="Vérification des documents"
        subtitle="Contrôlez les pièces des nouveaux chauffeurs avant d’activer leur compte. Les plus anciens dossiers d’abord."
      />
      <div className={`split-view ${selected ? "has-detail" : ""}`}>
        <div className="list-pane">
          <Segmented
            label="Statut du dossier"
            value={status}
            onChange={setStatus}
            options={(
              [
                "pending",
                "changes_requested",
                "approved",
                "rejected",
              ] as ApplicationStatus[]
            ).map((s) => ({
              value: s,
              label:
                s === "changes_requested" ? "Corrections" : applicationLabel[s],
              count: count(s),
            }))}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Nom, n° de taxi, ville…"
          />
          <ul className="item-list">
            {list.map((d) => {
              const { pending, rejected } = decisionState(d);
              const issues = documentChecks(d, now).filter((c) => !c.ok).length;
              return (
                <li key={d.id}>
                  <a
                    href={`#/verifications/${d.id}`}
                    className={d.id === id ? "selected" : ""}
                    aria-current={d.id === id ? "true" : undefined}
                  >
                    <Avatar name={d.name} />
                    <span className="grow">
                      <strong>{d.name}</strong>
                      <span className="sub">
                        Taxi {d.taxiNumber} · {d.city}
                      </span>
                      <span className="sub">
                        {d.documents.length}/4 documents
                        {pending ? ` · ${pending} à vérifier` : ""}
                        {rejected
                          ? ` · ${rejected} refusé${rejected > 1 ? "s" : ""}`
                          : ""}
                      </span>
                    </span>
                    <span className="item-meta">
                      <time>{ago(d.submittedAt, now)}</time>
                      {issues > 0 && d.application === "pending" && (
                        <StatusBadge tone="info">
                          {issues} alerte{issues > 1 ? "s" : ""}
                        </StatusBadge>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
            {!list.length && (
              <Empty title="Aucun dossier">Rien dans cette catégorie.</Empty>
            )}
          </ul>
        </div>
        <div className="detail-pane">
          {selected ? (
            <ApplicationDetail key={selected.id} driver={selected} />
          ) : (
            <Empty title="Sélectionnez un dossier">
              Choisissez un chauffeur dans la liste pour vérifier ses documents.
            </Empty>
          )}
        </div>
      </div>
    </>
  );
}

type Dialog =
  { kind: "document"; type: DocType } | { kind: "application" } | null;

function ApplicationDetail({ driver }: { driver: Driver }) {
  const { act, agent, now } = useAdmin();
  const [dialog, setDialog] = useState<Dialog>(null);
  const checks = documentChecks(driver, now);
  const decision = decisionState(driver);
  const open =
    driver.application === "pending" ||
    driver.application === "changes_requested";

  return (
    <div className="detail">
      <a className="back-link" href="#/verifications">
        <ArrowLeft size={16} aria-hidden /> Tous les dossiers
      </a>
      <div className="detail-head">
        <Avatar name={driver.name} size={52} />
        <div className="grow">
          <h2>{driver.name}</h2>
          <p>
            Petit taxi n° {driver.taxiNumber} · {driver.city} · {driver.phone}
          </p>
        </div>
        <StatusBadge tone={applicationTone[driver.application]}>
          {applicationLabel[driver.application]}
        </StatusBadge>
      </div>
      <div className="fields">
        <Field
          label="Dossier envoyé"
          value={`${fullDate(driver.submittedAt)} (${ago(driver.submittedAt, now)})`}
        />
        <Field label="Plaque déclarée" value={driver.plate} />
        <Field
          label="Méthode de retrait"
          value={
            {
              agency: "En agence",
              wallet: "Wallet mobile",
              bank: "Virement bancaire",
            }[driver.payout]
          }
        />
      </div>

      <Card
        title="Contrôles automatiques"
        action={
          <span className="muted">Indicatifs : la décision reste humaine</span>
        }
      >
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "ok" : "ko"}>
              {c.ok ? (
                <CheckCircle2 size={18} aria-label="Conforme" />
              ) : (
                <XCircle size={18} aria-label="À vérifier" />
              )}
              <span>
                <strong>{c.label}</strong>
                <span>{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="doc-grid">
        {driver.documents.map((doc) => (
          <section key={doc.type} className="doc-card">
            <div className="doc-card-head">
              <h3>{docTitle[doc.type]}</h3>
              <StatusBadge tone={docTone[doc.status]}>
                {docStatusLabel[doc.status]}
              </StatusBadge>
            </div>
            <DocumentPreview doc={doc} driver={driver} />
            {doc.expiresAt && (
              <p className="doc-meta">
                Valable jusqu’au {fullDate(doc.expiresAt)}
              </p>
            )}
            {doc.status === "rejected" && doc.rejectionReason && (
              <p className="doc-reason">Motif : {doc.rejectionReason}</p>
            )}
            {doc.reviewedAt && (
              <p className="doc-meta">
                {doc.status === "approved"
                  ? "Validé"
                  : doc.status === "rejected"
                    ? "Refusé"
                    : "Vu"}{" "}
                par {doc.reviewer} · {dateTime(doc.reviewedAt)}
              </p>
            )}
            {open && (
              <div className="doc-actions">
                <Button
                  variant="good"
                  icon={<Check size={16} />}
                  disabled={doc.status === "approved"}
                  onClick={() =>
                    act(
                      (s) =>
                        reviewDocument(
                          s,
                          driver.id,
                          doc.type,
                          { approve: true },
                          agent,
                        ),
                      `${docTitle[doc.type]} validé.`,
                    )
                  }
                >
                  Valider
                </Button>
                <Button
                  variant="ghost"
                  icon={<X size={16} />}
                  disabled={doc.status === "rejected"}
                  onClick={() =>
                    setDialog({ kind: "document", type: doc.type })
                  }
                >
                  Refuser
                </Button>
              </div>
            )}
          </section>
        ))}
      </div>

      {open && (
        <div className="decision-bar">
          <div className="grow">
            <strong>Décision finale</strong>
            <span className="muted">
              {decision.canApprove
                ? "Tous les documents sont validés."
                : decision.approveHint}
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={() => setDialog({ kind: "application" })}
          >
            Refuser l’inscription
          </Button>
          <Button
            icon={<MessageSquareWarning size={16} />}
            disabled={
              !decision.canRequestChanges ||
              driver.application === "changes_requested"
            }
            title={
              !decision.canRequestChanges
                ? "Refusez d’abord le document à renvoyer."
                : undefined
            }
            onClick={() =>
              act(
                (s) => requestChanges(s, driver.id, agent),
                "Le chauffeur est invité à renvoyer ses documents.",
              )
            }
          >
            Demander des corrections
          </Button>
          <Button
            variant="primary"
            disabled={!decision.canApprove}
            onClick={() => {
              if (
                act(
                  (s) => approveDriver(s, driver.id, agent),
                  `${driver.name} peut maintenant encaisser.`,
                )
              )
                go(`/drivers/${driver.id}`);
            }}
          >
            Activer le chauffeur
          </Button>
        </div>
      )}

      {driver.notes.length > 0 && (
        <Card title="Notes internes">
          <ul className="notes">
            {driver.notes.map((n) => (
              <li key={n.id}>
                <p>{n.body}</p>
                <span className="muted">
                  {n.author} · {dateTime(n.at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ReasonDialog
        open={dialog !== null}
        title={
          dialog?.kind === "document"
            ? `Refuser « ${docTitle[dialog.type]} »`
            : `Refuser l’inscription de ${driver.name}`
        }
        description={
          dialog?.kind === "document"
            ? "Le chauffeur verra ce motif et pourra renvoyer le document."
            : "Le compte ne pourra pas encaisser de paiements. Cette décision est définitive."
        }
        suggestions={dialog?.kind === "document" ? rejectionReasons : []}
        confirmLabel="Refuser"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          const d = dialog;
          setDialog(null);
          if (d?.kind === "document")
            act(
              (s) =>
                reviewDocument(
                  s,
                  driver.id,
                  d.type,
                  { approve: false, reason },
                  agent,
                ),
              "Document refusé.",
            );
          if (d?.kind === "application")
            act(
              (s) => rejectApplication(s, driver.id, reason, agent),
              "Inscription refusée.",
            );
        }}
      />
    </div>
  );
}
