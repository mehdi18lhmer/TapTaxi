import { useState } from "react";
import { useAdmin } from "../lib/store";
import { go } from "../lib/router";
import type { WithdrawalStatus } from "../lib/types";
import { withdrawalStatusLabel } from "../lib/labels";
import { commission, paid } from "../lib/analytics";
import { settleWithdrawal } from "../lib/operations";
import { dateTime, mad } from "../lib/format";
import { methodLabel } from "../../lib/model";
import {
  Button,
  Card,
  Empty,
  PageHeader,
  SearchField,
  Segmented,
  StatusBadge,
} from "../components/ui";
import type { Tone } from "../components/ui";

const PAGE = 50;
const withdrawalTone: Record<WithdrawalStatus, Tone> = {
  pending: "warning",
  paid: "good",
  failed: "critical",
};

export function Transactions({ tab }: { tab?: string }) {
  const current = tab === "retraits" ? "withdrawals" : "payments";
  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Paiements des passagers et retraits des chauffeurs."
        actions={
          <Segmented
            label="Type"
            value={current}
            onChange={(v) =>
              go(
                v === "withdrawals"
                  ? "/transactions/retraits"
                  : "/transactions",
              )
            }
            options={[
              { value: "payments", label: "Paiements" },
              { value: "withdrawals", label: "Retraits" },
            ]}
          />
        }
      />
      {current === "payments" ? <Payments /> : <Withdrawals />}
    </>
  );
}

function Payments() {
  const { state, payments } = useAdmin();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const names = new Map(state.drivers.map((d) => [d.id, d]));
  const q = query.trim().toLowerCase().replace(/^#/, "");
  const rows = q
    ? payments.filter((p) => {
        const d = names.get(p.driverId);
        return `${p.id} ${d?.name} ${d?.taxiNumber}`.toLowerCase().includes(q);
      })
    : payments;

  return (
    <>
      <div className="filter-row wide">
        <SearchField
          value={query}
          onChange={(v) => {
            setQuery(v);
            setLimit(PAGE);
          }}
          placeholder="Référence (#AB12), chauffeur, n° de taxi…"
        />
        <span className="muted">
          {rows.length.toLocaleString("fr-FR")} paiements
        </span>
      </div>
      <Card className="flush">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Référence</th>
                <th>Chauffeur</th>
                <th>Moyen</th>
                <th className="num">Compteur</th>
                <th className="num">Pourboire</th>
                <th className="num">Payé</th>
                <th className="num">Commission</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((p) => {
                const d = names.get(p.driverId);
                return (
                  <tr key={p.id}>
                    <td>{dateTime(p.at)}</td>
                    <td className="mono">#{p.id}</td>
                    <td>
                      {d ? <a href={`#/drivers/${d.id}`}>{d.name}</a> : "—"}
                    </td>
                    <td>{methodLabel(p.method)}</td>
                    <td className="num">{mad(p.fare)}</td>
                    <td className="num">{p.tip ? mad(p.tip) : "—"}</td>
                    <td className="num strong">{mad(paid(p))}</td>
                    <td className="num">{mad(commission(p))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <Empty title="Aucun paiement">
              Vérifiez la référence ou le nom du chauffeur.
            </Empty>
          )}
        </div>
      </Card>
      {rows.length > limit && (
        <div className="center">
          <Button onClick={() => setLimit((n) => n + PAGE)}>
            Afficher {Math.min(PAGE, rows.length - limit)} de plus
          </Button>
        </div>
      )}
    </>
  );
}

function Withdrawals() {
  const { state, act, agent } = useAdmin();
  const [status, setStatus] = useState<WithdrawalStatus | "all">("pending");
  const names = new Map(state.drivers.map((d) => [d.id, d]));
  const rows = state.withdrawals.filter(
    (w) => status === "all" || w.status === status,
  );
  const count = (s: WithdrawalStatus) =>
    state.withdrawals.filter((w) => w.status === s).length;

  return (
    <>
      <div className="filter-row wide">
        <Segmented
          label="Statut du retrait"
          value={status}
          onChange={setStatus}
          options={[
            { value: "pending", label: "À traiter", count: count("pending") },
            { value: "paid", label: "Versés", count: count("paid") },
            { value: "failed", label: "Échoués", count: count("failed") },
            { value: "all", label: "Tous" },
          ]}
        />
        <span className="muted">
          Démo : marquer un retrait ne déclenche aucun virement.
        </span>
      </div>
      <Card className="flush">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Référence</th>
                <th>Chauffeur</th>
                <th>Méthode</th>
                <th className="num">Montant</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const d = names.get(w.driverId);
                return (
                  <tr key={w.id}>
                    <td>{dateTime(w.at)}</td>
                    <td className="mono">{w.id}</td>
                    <td>
                      {d ? <a href={`#/drivers/${d.id}`}>{d.name}</a> : "—"}
                    </td>
                    <td>{methodLabel(w.method)}</td>
                    <td className="num strong">{mad(w.amount)}</td>
                    <td>
                      <StatusBadge tone={withdrawalTone[w.status]}>
                        {withdrawalStatusLabel[w.status]}
                      </StatusBadge>
                    </td>
                    <td>
                      {w.status === "pending" && (
                        <div className="row-actions">
                          <Button
                            variant="good"
                            onClick={() =>
                              act(
                                (s) => settleWithdrawal(s, w.id, "paid", agent),
                                `Retrait ${w.id} marqué comme versé.`,
                              )
                            }
                          >
                            Versé
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              act(
                                (s) =>
                                  settleWithdrawal(s, w.id, "failed", agent),
                                `Retrait ${w.id} marqué comme échoué.`,
                              )
                            }
                          >
                            Échec
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <Empty title="Aucun retrait">Rien dans cette catégorie.</Empty>
          )}
        </div>
      </Card>
    </>
  );
}
