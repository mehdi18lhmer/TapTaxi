import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CarFront,
  Check,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  IconButton,
  SectionHeading,
} from "../components/ui";
import { Transactions } from "../components/Transactions";
import { balance, dateLabel, money, todayPayments } from "../lib/model";
import { go, useStore } from "../lib/store";
export function Home() {
  const { state } = useStore();
  const payments = todayPayments(state);
  const earnings = payments.reduce((a, t) => a + t.credit, 0);
  const progress = Math.min(100, Math.round((earnings / 30000) * 100));
  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-person">
          <button
            className="avatar-button"
            aria-label="Mon profil"
            onClick={() => go("/profile")}
          >
            <Avatar />
          </button>
          <div className="desktop-only">
            <span className="eyebrow">VOTRE ESPACE CHAUFFEUR</span>
            <span className="location">
              <span className="online-dot" />
              Casablanca, Maroc
            </span>
          </div>
        </div>
        <div className="header-right">
          <Badge>Chauffeur vérifié</Badge>
          <IconButton
            label="Notifications"
            onClick={() => go("/notifications")}
          >
            <Bell size={21} />
            {!state.readNotifications && (
              <span className="notification-count">2</span>
            )}
          </IconButton>
        </div>
      </header>
      <div className="greeting">
        <p>
          Petit taxi n° 1287 <span>·</span> Casablanca
        </p>
      </div>
      <div className="home-grid">
        <div className="stack">
          <Card className="earnings-card">
            <div className="spread">
              <span>Gains d'aujourd'hui</span>
              <span className="date-pill">
                {dateLabel(Date.now(), {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <div className="big-money">
              {money(earnings)} <span>MAD</span>
            </div>
            <div className="earnings-stats">
              <div>
                <span>Paiements reçus</span>
                <strong>
                  {payments.length}
                  <CarFront size={17} />
                </strong>
              </div>
              <button onClick={() => go("/wallet")}>
                <span>Solde portefeuille</span>
                <strong>
                  {money(balance(state))}
                  <ArrowUpRight size={17} />
                </strong>
              </button>
            </div>
            <div className="earnings-decoration" aria-hidden="true">
              T
            </div>
          </Card>
          <button className="collect-card" onClick={() => go("/amount")}>
            <span className="collect-icon">
              <QrCode size={29} />
            </span>
            <span className="grow">
              <strong>Encaisser</strong>
              <span lang="ar" dir="rtl">
                استلام الدفع
              </span>
            </span>
            <span className="collect-arrow">
              <ArrowRight size={23} />
            </span>
          </button>
          <Card className="goal-card">
            <div className="spread">
              <h2>Objectif du jour</h2>
              <span>
                <strong>{money(earnings)}</strong> / 300 MAD
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Objectif du jour"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="spread">
              <small>
                {progress >= 100
                  ? "Bravo, votre objectif est atteint !"
                  : `Encore environ ${Math.ceil((30000 - earnings) / 2350)} paiements pour l'atteindre`}
              </small>
              <span className="goal-percent">{progress}%</span>
            </div>
          </Card>
          <div className="quiet-note">
            <ShieldCheck size={16} />
            <span>Chaque paiement compte. Chaque revenu est tracé.</span>
          </div>
        </div>
        <div className="stack">
          <Card className="recent-card">
            <SectionHeading action="Tout voir" onAction={() => go("/history")}>
              Paiements récents
            </SectionHeading>
            <Transactions
              items={state.transactions
                .filter((t) => t.kind === "payment")
                .slice(0, 4)}
            />
            <button className="card-footer-link" onClick={() => go("/history")}>
              Voir mon activité
              <ArrowRight size={15} />
            </button>
          </Card>
          <Card className="week-card desktop-only">
            <SectionHeading
              action="Mes relevés"
              onAction={() => go("/statements")}
            >
              Une bonne semaine
              <TrendingUp size={17} />
            </SectionHeading>
            <div className="week-chart" aria-label="Revenus de la semaine">
              <div>
                <span style={{ height: "42%" }} />
                <small>Lun</small>
              </div>
              <div>
                <span style={{ height: "76%" }} />
                <small>Mar</small>
              </div>
              <div className="today">
                <span
                  style={{
                    height: `${Math.min(95, Math.max(10, earnings / 300))}%`,
                  }}
                />
                <small>Mer</small>
              </div>
              <div>
                <span className="future" style={{ height: "26%" }} />
                <small>Jeu</small>
              </div>
              <div>
                <span className="future" style={{ height: "26%" }} />
                <small>Ven</small>
              </div>
              <div>
                <span className="future" style={{ height: "26%" }} />
                <small>Sam</small>
              </div>
              <div>
                <span className="future" style={{ height: "26%" }} />
                <small>Dim</small>
              </div>
            </div>
            <div className="chart-footer">
              <span>
                <span className="legend-dot" />
                Revenus de démonstration
              </span>
              <span>Cette semaine</span>
            </div>
          </Card>
        </div>
      </div>
      <div className="desktop-only home-bottom">
        <div>
          <span className="bottom-icon">
            <Wallet size={21} />
          </span>
          <div>
            <strong>Votre argent, à votre rythme</strong>
            <p>Retirez en agence, sur votre wallet ou à la banque.</p>
          </div>
          <button
            aria-label="Ouvrir les retraits"
            onClick={() => go("/withdraw")}
          >
            <ArrowRight size={20} />
          </button>
        </div>
        <div>
          <span className="bottom-icon red">
            <Sparkles size={21} />
          </span>
          <div>
            <strong>Des revenus qui ouvrent des portes</strong>
            <p>Découvrez les services pensés pour les chauffeurs.</p>
          </div>
          <button
            aria-label="Découvrir les services"
            onClick={() => go("/services")}
          >
            <ChevronRight size={21} />
          </button>
        </div>
      </div>
    </div>
  );
}
export function QuickSummary() {
  return (
    <div className="quick-summary">
      <span>
        <ArrowDownLeft size={17} />
        Encaissez simplement
      </span>
      <span>
        <Check size={17} />
        Gardez le contrôle
      </span>
    </div>
  );
}
