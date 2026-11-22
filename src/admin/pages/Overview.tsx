import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  FileCheck2,
  LifeBuoy,
  Wallet,
} from "lucide-react";
import { useAdmin } from "../lib/store";
import {
  DAY,
  change,
  dailySeries,
  kpis,
  methodSplit,
  supportStats,
  topDrivers,
  verificationStats,
} from "../lib/analytics";
import type { Metrics } from "../lib/analytics";
import {
  ago,
  dateTime,
  duration,
  mad,
  madCompact,
  percentChange,
} from "../lib/format";
import { dateLabel } from "../../lib/model";
import { Card, PageHeader, Segmented } from "../components/ui";
import { ColumnChart, RankBars, SERIES, SplitBar } from "../components/charts";

type Period = "7" | "30" | "90";

export function Overview() {
  const { state, payments, now } = useAdmin();
  const [period, setPeriod] = useState<Period>("30");
  const days = Number(period);
  const { current, previous } = kpis(payments, state.withdrawals, days, now);
  const series = dailySeries(payments, days, now);
  const split = methodSplit(payments, now - days * DAY, now);
  const top = topDrivers(payments, state.drivers, now - days * DAY, now);
  const support = supportStats(state.tickets, now);
  const review = verificationStats(state, now);
  const pendingWithdrawals = state.withdrawals.filter(
    (w) => w.status === "pending",
  );
  const tickEvery = days === 7 ? 1 : days === 30 ? 7 : 15;

  return (
    <>
      <PageHeader
        title="Vue d’ensemble"
        subtitle={`Activité de TapTaxi · ${dateLabel(now, { weekday: "long", day: "numeric", month: "long" })}`}
        actions={
          <Segmented
            label="Période"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7", label: "7 jours" },
              { value: "30", label: "30 jours" },
              { value: "90", label: "90 jours" },
            ]}
          />
        }
      />

      <div className="todo-grid">
        <TodoCard
          href="#/verifications"
          icon={<FileCheck2 size={20} />}
          title="Dossiers à vérifier"
          value={review.waiting}
          detail={
            review.waiting
              ? `Le plus ancien attend depuis ${duration(review.oldestWaiting)}`
              : "Aucun dossier en attente"
          }
          urgent={review.oldestWaiting > 2 * DAY}
        />
        <TodoCard
          href="#/support"
          icon={<LifeBuoy size={20} />}
          title="Tickets non résolus"
          value={support.unresolved}
          detail={
            support.overdue
              ? `${support.overdue} sans réponse dans les délais`
              : "Tous les tickets ont une réponse à temps"
          }
          urgent={support.overdue > 0}
        />
        <TodoCard
          href="#/transactions/retraits"
          icon={<Wallet size={20} />}
          title="Retraits à traiter"
          value={pendingWithdrawals.length}
          detail={
            pendingWithdrawals.length
              ? `${mad(pendingWithdrawals.reduce((n, w) => n + w.amount, 0))} au total`
              : "Rien à verser"
          }
          urgent={false}
        />
      </div>

      <div className="kpi-grid six">
        <Kpi
          label="Volume encaissé"
          value={madCompact(current.volume)}
          metric="volume"
          current={current}
          previous={previous}
        />
        <Kpi
          label="Commission TapTaxi"
          value={madCompact(current.revenue)}
          metric="revenue"
          current={current}
          previous={previous}
        />
        <Kpi
          label="Paiements"
          value={current.count.toLocaleString("fr-FR")}
          metric="count"
          current={current}
          previous={previous}
        />
        <Kpi
          label="Panier moyen"
          value={mad(current.averageTicket)}
          metric="averageTicket"
          current={current}
          previous={previous}
        />
        <Kpi
          label="Chauffeurs actifs"
          value={String(current.activeDrivers)}
          metric="activeDrivers"
          current={current}
          previous={previous}
        />
        <Kpi
          label="Pourboires reversés"
          value={madCompact(current.tips)}
          metric="tips"
          current={current}
          previous={previous}
        />
      </div>

      <Card
        title="Volume encaissé par jour"
        action={
          <span className="muted">
            Montant payé par les passagers, frais inclus
          </span>
        }
      >
        <ColumnChart
          ariaLabel={`Volume encaissé par jour sur ${days} jours`}
          tableHeaders={["Jour", "Volume"]}
          formatValue={mad}
          formatAxis={(n) =>
            n >= 100_000 ? `${n / 100_000} k` : String(n / 100)
          }
          data={series.map((p, i) => ({
            key: p.key,
            label: dateLabel(p.at, {
              weekday: "long",
              day: "numeric",
              month: "long",
            }),
            tick:
              (series.length - 1 - i) % tickEvery === 0
                ? dateLabel(
                    p.at,
                    days === 7
                      ? { weekday: "short" }
                      : { day: "numeric", month: "short" },
                  )
                : undefined,
            value: p.volume,
            detail: `${p.count} paiement${p.count > 1 ? "s" : ""}`,
          }))}
        />
      </Card>

      <div className="two-col">
        <Card
          title="Moyen de paiement"
          action={
            <span className="muted">
              {split.total.toLocaleString("fr-FR")} paiements
            </span>
          }
        >
          <SplitBar
            ariaLabel={`Carte ${split.card.count} paiements, wallet ${split.wallet.count} paiements`}
            parts={[
              {
                label: "Carte bancaire",
                value: split.card.count,
                color: SERIES.card,
                detail: madCompact(split.card.volume),
              },
              {
                label: "Wallet mobile",
                value: split.wallet.count,
                color: SERIES.wallet,
                detail: madCompact(split.wallet.volume),
              },
            ]}
          />
        </Card>
        <Card
          title="Meilleurs chauffeurs"
          action={<span className="muted">par volume</span>}
        >
          <RankBars
            formatValue={madCompact}
            rows={top.map((r) => ({
              key: r.driver.id,
              label: <a href={`#/drivers/${r.driver.id}`}>{r.driver.name}</a>,
              value: r.volume,
              sub: `${r.count} paiements · taxi ${r.driver.taxiNumber} · ${r.driver.city}`,
            }))}
          />
        </Card>
      </div>

      <div className="two-col">
        <Card title="Support">
          <div className="mini-stats">
            <MiniStat label="Ouverts" value={support.open} />
            <MiniStat label="En retard" value={support.overdue} />
            <MiniStat label="Urgents" value={support.urgent} />
            <MiniStat
              label="1re réponse (médiane)"
              value={
                support.medianFirstReply === null
                  ? "—"
                  : duration(support.medianFirstReply)
              }
            />
          </div>
        </Card>
        <Card title="Inscriptions">
          <div className="mini-stats">
            <MiniStat label="À vérifier" value={review.waiting} />
            <MiniStat
              label="En attente du chauffeur"
              value={review.changesRequested}
            />
            <MiniStat
              label="Chauffeurs actifs"
              value={state.drivers.filter((d) => d.account === "active").length}
            />
            <MiniStat
              label="Suspendus"
              value={
                state.drivers.filter((d) => d.account === "suspended").length
              }
            />
          </div>
        </Card>
      </div>

      <Card
        title="Journal de l’équipe"
        action={
          <span className="muted">Toutes les décisions sont enregistrées</span>
        }
      >
        <ul className="audit">
          {state.audit.slice(0, 8).map((a) => (
            <li key={a.id}>
              <strong>{a.actor}</strong>{" "}
              {a.link ? <a href={`#${a.link}`}>{a.action}</a> : a.action}
              <time title={dateTime(a.at)}>{ago(a.at, now)}</time>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function TodoCard({
  href,
  icon,
  title,
  value,
  detail,
  urgent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  value: number;
  detail: string;
  urgent: boolean;
}) {
  return (
    <a href={href} className={`todo ${urgent ? "urgent" : ""}`}>
      <span className="todo-icon">{icon}</span>
      <span className="todo-body">
        <span className="todo-title">{title}</span>
        <strong>{value}</strong>
        <span className="todo-detail">{detail}</span>
      </span>
      <ArrowRight size={18} aria-hidden />
    </a>
  );
}

function Kpi({
  label,
  value,
  metric,
  current,
  previous,
}: {
  label: string;
  value: string;
  metric: keyof Metrics;
  current: Metrics;
  previous: Metrics;
}) {
  const delta = change(current[metric], previous[metric]);
  const up = delta !== null && delta >= 0;
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {delta === null ? (
        <span className="kpi-delta">Pas de période précédente</span>
      ) : (
        <span className={`kpi-delta ${up ? "up" : "down"}`}>
          <span className="kpi-change">
            {up ? (
              <ArrowUpRight size={14} aria-hidden />
            ) : (
              <ArrowDownRight size={14} aria-hidden />
            )}
            {percentChange(delta)}
          </span>
          <span className="muted">vs période précédente</span>
        </span>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
