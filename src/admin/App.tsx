import {
  FileCheck2,
  LayoutDashboard,
  LifeBuoy,
  ReceiptText,
  RotateCcw,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { AGENTS, useAdmin } from "./lib/store";
import { useRoute } from "./lib/router";
import { supportStats, verificationStats } from "./lib/analytics";
import { Toasts } from "./components/ui";
import { Overview } from "./pages/Overview";
import { Verifications } from "./pages/Verifications";
import { Support } from "./pages/Support";
import { Drivers } from "./pages/Drivers";
import { Transactions } from "./pages/Transactions";

export default function AdminApp() {
  const [section = "", id] = useRoute();
  const { state, now, agent, setAgent, reset, toasts } = useAdmin();
  const review = verificationStats(state, now).waiting;
  const support = supportStats(state.tickets, now).unresolved;
  const pendingWithdrawals = state.withdrawals.filter(
    (w) => w.status === "pending",
  ).length;

  const page: Record<string, ReactNode> = {
    "": <Overview />,
    verifications: <Verifications key={id ?? "list"} id={id} />,
    support: <Support key={id ?? "list"} id={id} />,
    drivers: <Drivers id={id} />,
    transactions: <Transactions tab={id} />,
  };

  return (
    <div className="admin">
      <aside className="sidebar">
        <a className="brand" href="#/">
          <img
            src="/logo/wordmark-light.png"
            alt="TapTaxi"
            width={900}
            height={262}
          />
          <small>Administration</small>
        </a>
        <nav aria-label="Sections">
          <NavLink
            href="#/"
            active={section === ""}
            icon={<LayoutDashboard size={18} />}
            label="Vue d’ensemble"
          />
          <NavLink
            href="#/verifications"
            active={section === "verifications"}
            icon={<FileCheck2 size={18} />}
            label="Vérifications"
            count={review}
          />
          <NavLink
            href="#/support"
            active={section === "support"}
            icon={<LifeBuoy size={18} />}
            label="Support"
            count={support}
          />
          <NavLink
            href="#/drivers"
            active={section === "drivers"}
            icon={<Users size={18} />}
            label="Chauffeurs"
          />
          <NavLink
            href="#/transactions"
            active={section === "transactions"}
            icon={<ReceiptText size={18} />}
            label="Transactions"
            count={pendingWithdrawals}
          />
        </nav>
        <div className="sidebar-foot">
          <label>
            Connecté en tant que
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              {AGENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <button type="button" className="link-button" onClick={reset}>
            <RotateCcw size={14} aria-hidden /> Réinitialiser la démo
          </button>
        </div>
      </aside>
      <main className="content">
        <div className="demo-banner" role="note">
          Démo locale : personnes, documents et montants fictifs. Aucune
          vérification d’identité, aucun virement et aucun message réel. Accès
          non protégé : un vrai back-office demande une connexion sécurisée et
          un serveur.
        </div>
        {page[section] ?? (
          <div className="empty">
            <strong>Page introuvable</strong>
            <a href="#/">Retour à la vue d’ensemble</a>
          </div>
        )}
      </main>
      <Toasts toasts={toasts} />
    </div>
  );
}

function NavLink({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <a
      href={href}
      className={active ? "active" : ""}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="grow">{label}</span>
      {!!count && <span className="nav-count">{count}</span>}
    </a>
  );
}
