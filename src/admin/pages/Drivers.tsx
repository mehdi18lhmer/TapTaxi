import { useState } from "react";
import { ArrowLeft, Ban, FileCheck2, RotateCcw } from "lucide-react";
import { useAdmin } from "../lib/store";
import type { AccountStatus, Driver } from "../lib/types";
import {
  accountLabel,
  applicationLabel,
  categoryLabel,
  ticketStatusLabel,
  withdrawalStatusLabel,
} from "../lib/labels";
import { driverStats, paid } from "../lib/analytics";
import { addDriverNote, setSuspended } from "../lib/operations";
import { ago, dateTime, fullDate, mad } from "../lib/format";
import { methodLabel } from "../../lib/model";
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

export const accountTone: Record<AccountStatus, Tone> = {
  active: "good",
  onboarding: "warning",
  suspended: "critical",
  rejected: "neutral",
};

export function Drivers({ id }: { id?: string }) {
  const driver = useAdmin().state.drivers.find((d) => d.id === id);
  if (id && driver) return <DriverProfile driver={driver} />;
  return <DriverDirectory />;
}

function DriverDirectory() {
  const { state, payments, now } = useAdmin();
  const [status, setStatus] = useState<AccountStatus | "all">("active");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = state.drivers
    .filter((d) => status === "all" || d.account === status)
    .filter(
      (d) =>
        !q ||
        `${d.name} ${d.taxiNumber} ${d.city} ${d.phone} ${d.plate}`
          .toLowerCase()
          .includes(q),
    )
    .map((d) => ({
      driver: d,
      stats: driverStats(d.id, payments, state.withdrawals, now),
    }))
    .sort(
      (a, b) =>
        b.stats.volumeLast30 - a.stats.volumeLast30 ||
        a.driver.name.localeCompare(b.driver.name),
    );
  const count = (s: AccountStatus) =>
    state.drivers.filter((d) => d.account === s).length;

  return (
    <>
      <PageHeader
        title="Chauffeurs"
        subtitle={`${state.drivers.length} comptes · activité des 30 derniers jours`}
      />
      <div className="filter-row wide">
        <Segmented
          label="Statut du compte"
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Actifs", count: count("active") },
            {
              value: "onboarding",
              label: "Inscription",
              count: count("onboarding"),
            },
            {
              value: "suspended",
              label: "Suspendus",
              count: count("suspended"),
            },
            { value: "all", label: "Tous" },
          ]}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Nom, taxi, plaque, téléphone…"
        />
      </div>
      <Card className="flush">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chauffeur</th>
                <th>Statut</th>
                <th className="num">Paiements 30 j</th>
                <th className="num">Volume 30 j</th>
                <th className="num">Solde</th>
                <th>Dernier paiement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ driver: d, stats }) => (
                <tr key={d.id}>
                  <td>
                    <a href={`#/drivers/${d.id}`} className="person">
                      <Avatar name={d.name} size={32} />
                      <span>
                        <strong>{d.name}</strong>
                        <span className="sub">
                          Taxi {d.taxiNumber} · {d.city}
                        </span>
                      </span>
                    </a>
                  </td>
                  <td>
                    <StatusBadge tone={accountTone[d.account]}>
                      {accountLabel[d.account]}
                    </StatusBadge>
                  </td>
                  <td className="num">{stats.paymentsLast30}</td>
                  <td className="num">{mad(stats.volumeLast30)}</td>
                  <td className="num">{mad(stats.balance)}</td>
                  <td>
                    {stats.lastPaymentAt ? ago(stats.lastPaymentAt, now) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <Empty title="Aucun chauffeur">
              Rien ne correspond à cette recherche.
            </Empty>
          )}
        </div>
      </Card>
    </>
  );
}

function DriverProfile({ driver }: { driver: Driver }) {
  const { state, payments, now, act, agent } = useAdmin();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [note, setNote] = useState("");
  const stats = driverStats(driver.id, payments, state.withdrawals, now);
  const recent = payments.filter((p) => p.driverId === driver.id).slice(0, 8);
  const withdrawals = state.withdrawals
    .filter((w) => w.driverId === driver.id)
    .slice(0, 6);
  const tickets = state.tickets.filter((t) => t.driverId === driver.id);

  return (
    <>
      <a className="back-link" href="#/drivers">
        <ArrowLeft size={16} aria-hidden /> Tous les chauffeurs
      </a>
      <PageHeader
        title={driver.name}
        subtitle={`Petit taxi n° ${driver.taxiNumber} · ${driver.city} · ${driver.phone}`}
        actions={
          <>
            <StatusBadge tone={accountTone[driver.account]}>
              {accountLabel[driver.account]}
            </StatusBadge>
            {driver.account === "active" && (
              <Button
                variant="danger"
                icon={<Ban size={16} />}
                onClick={() => setSuspendOpen(true)}
              >
                Suspendre
              </Button>
            )}
            {driver.account === "suspended" && (
              <Button
                variant="good"
                icon={<RotateCcw size={16} />}
                onClick={() =>
                  act(
                    (s) => setSuspended(s, driver.id, false, "", agent),
                    "Compte réactivé.",
                  )
                }
              >
                Réactiver
              </Button>
            )}
          </>
        }
      />

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">Solde portefeuille</span>
          <strong className="kpi-value">{mad(stats.balance)}</strong>
        </div>
        <div className="kpi">
          <span className="kpi-label">Paiements · 30 jours</span>
          <strong className="kpi-value">{stats.paymentsLast30}</strong>
        </div>
        <div className="kpi">
          <span className="kpi-label">Volume · 30 jours</span>
          <strong className="kpi-value">{mad(stats.volumeLast30)}</strong>
        </div>
        <div className="kpi">
          <span className="kpi-label">Note passagers</span>
          <strong className="kpi-value">
            {driver.rating.toLocaleString("fr-FR")} / 5
          </strong>
        </div>
      </div>

      <div className="two-col">
        <Card title="Informations">
          <div className="fields">
            <Field label="Plaque" value={driver.plate} />
            <Field
              label="Permis de confiance"
              value={driver.permitNumber || "—"}
            />
            <Field label="Retraits" value={methodLabel(driver.payout)} />
            <Field label="Inscrit le" value={fullDate(driver.submittedAt)} />
            <Field
              label="Dossier"
              value={applicationLabel[driver.application]}
            />
          </div>
          <a
            className="btn btn-secondary"
            href={`#/verifications/${driver.id}`}
          >
            <FileCheck2 size={16} aria-hidden /> Voir les documents
          </a>
        </Card>
        <Card
          title="Tickets support"
          action={<span className="muted">{tickets.length}</span>}
        >
          {tickets.length ? (
            <ul className="plain-list">
              {tickets.map((t) => (
                <li key={t.id}>
                  <a href={`#/support/${t.id}`}>
                    <strong>{t.subject}</strong>
                  </a>
                  <span className="muted">
                    {t.id} · {categoryLabel[t.category]} ·{" "}
                    {ticketStatusLabel[t.status]} · {ago(t.updatedAt, now)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Aucun ticket" />
          )}
        </Card>
      </div>

      <div className="two-col">
        <Card title="Derniers paiements">
          {recent.length ? (
            <table className="data-table compact">
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>{dateTime(p.at)}</td>
                    <td className="mono">#{p.id}</td>
                    <td>{methodLabel(p.method)}</td>
                    <td className="num">{mad(paid(p))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty title="Aucun paiement" />
          )}
        </Card>
        <Card title="Derniers retraits">
          {withdrawals.length ? (
            <table className="data-table compact">
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{dateTime(w.at)}</td>
                    <td>{methodLabel(w.method)}</td>
                    <td>{withdrawalStatusLabel[w.status]}</td>
                    <td className="num">{mad(w.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty title="Aucun retrait" />
          )}
        </Card>
      </div>

      <Card title="Notes internes">
        <form
          className="note-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              act(
                (s) => addDriverNote(s, driver.id, note, agent),
                "Note ajoutée.",
              )
            )
              setNote("");
          }}
        >
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ajouter une note pour l’équipe…"
            aria-label="Nouvelle note"
          />
          <Button type="submit" disabled={!note.trim()}>
            Ajouter
          </Button>
        </form>
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

      <ReasonDialog
        open={suspendOpen}
        title={`Suspendre ${driver.name}`}
        description="Le chauffeur ne pourra plus encaisser de paiements tant que le compte est suspendu. Son solde reste disponible au retrait."
        suggestions={[
          "Signalements de passagers",
          "Document expiré",
          "Suspicion de fraude",
          "Demande du chauffeur",
        ]}
        confirmLabel="Suspendre le compte"
        onClose={() => setSuspendOpen(false)}
        onConfirm={(reason) => {
          setSuspendOpen(false);
          act(
            (s) => setSuspended(s, driver.id, true, reason, agent),
            "Compte suspendu.",
          );
        }}
      />
    </>
  );
}
