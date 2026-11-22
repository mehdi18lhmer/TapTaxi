import {
  ArrowRight,
  Bell,
  CarFront,
  ChevronRight,
  CircleHelp,
  FileBarChart2,
  History,
  Home as HomeIcon,
  LogOut,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Logo } from "./components/ui";
import { go, useRoute, useStore } from "./lib/store";
import { Home } from "./screens/Home";
import { Amount, PaymentQR, Received } from "./screens/DriverPayment";
import { WalletPage, Withdraw, WithdrawalCode } from "./screens/Wallet";
import {
  FuelAdvance,
  HistoryPage,
  Services,
  Statements,
} from "./screens/Insights";
import {
  Help,
  NotFound,
  Notifications,
  Owner,
  Profile,
} from "./screens/Account";
import {
  Checkout,
  Expired,
  PassengerHistory,
  Receipt,
} from "./screens/Passenger";
import {
  Documents,
  PayoutSetup,
  SignIn,
  SMS,
  Splash,
  Verification,
  Welcome,
} from "./screens/Onboarding";
const nav = [
  { path: "/", label: "Accueil", icon: HomeIcon },
  { path: "/wallet", label: "Portefeuille", icon: Wallet },
  { path: "/history", label: "Historique", icon: History },
  { path: "/statements", label: "Relevés", icon: FileBarChart2 },
  { path: "/services", label: "Services & offres", icon: Sparkles },
  { path: "/profile", label: "Mon profil", icon: UserRound },
];
const bottomNav = [nav[0], nav[1], nav[3], { ...nav[5], label: "Profil" }];
export default function App() {
  const route = useRoute();
  const { state } = useStore();
  const main = useRef<HTMLElement>(null);
  const priorRoute = useRef(route);
  const [_, section = "", id = ""] = route.split("/");
  const passenger = ["pay", "receipt", "my-payments", "expired"].includes(
    section,
  );
  const onboarding = [
    "welcome",
    "sign-in",
    "sms",
    "documents",
    "payout-setup",
    "verification",
    "splash",
  ].includes(section);
  useEffect(() => {
    if (priorRoute.current !== route) {
      priorRoute.current = route;
      main.current?.focus({ preventScroll: true });
    }
    document.title = `${passenger ? "Paiement" : section === "wallet" ? "Portefeuille" : "Votre espace"} · TapTaxi`;
  }, [route, passenger, section]);
  let page: ReactNode;
  switch (section) {
    case "":
      page = <Home />;
      break;
    case "amount":
      page = <Amount />;
      break;
    case "qr":
      page = <PaymentQR key={id} id={id} />;
      break;
    case "received":
      page = <Received id={id} />;
      break;
    case "transaction":
      page = <Received id={id} detail />;
      break;
    case "wallet":
      page = <WalletPage />;
      break;
    case "withdraw":
      page = <Withdraw />;
      break;
    case "withdrawal":
      page = <WithdrawalCode id={id} />;
      break;
    case "history":
      page = <HistoryPage />;
      break;
    case "statements":
      page = <Statements />;
      break;
    case "fuel":
      page = <FuelAdvance />;
      break;
    case "services":
      page = <Services />;
      break;
    case "profile":
      page = <Profile />;
      break;
    case "notifications":
      page = <Notifications />;
      break;
    case "owner":
      page = <Owner />;
      break;
    case "help":
      page = <Help />;
      break;
    case "pay":
      page = <Checkout key={id} id={id} />;
      break;
    case "receipt":
      page = <Receipt id={id} />;
      break;
    case "my-payments":
      page = <PassengerHistory />;
      break;
    case "expired":
      page = <Expired id={id} />;
      break;
    case "welcome":
      page = <Welcome />;
      break;
    case "sign-in":
      page = <SignIn />;
      break;
    case "sms":
      page = <SMS />;
      break;
    case "documents":
      page = <Documents />;
      break;
    case "payout-setup":
      page = <PayoutSetup />;
      break;
    case "verification":
      page = <Verification />;
      break;
    case "splash":
      page = <Splash />;
      break;
    default:
      page = <NotFound />;
  }
  if (passenger || onboarding)
    return (
      <>
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            main.current?.focus();
          }}
        >
          Aller au contenu
        </a>
        <div className={`public-shell ${onboarding ? "onboarding-shell" : ""}`}>
          <aside className="public-aside">
            <Logo light />
            <div>
              <span className="eyebrow">FAIT POUR LE QUOTIDIEN.</span>
              <h2>
                La route est à vous.
                <br />
                Le reste,
                <br />
                c'est TapTaxi<span>.</span>
              </h2>
              <p>
                Des paiements simples.
                <br />
                Des revenus qui comptent.
              </p>
            </div>
            <div className="public-aside-bottom">
              <span>
                <ShieldCheck size={17} />
                Pensé pour les taxis du Maroc
              </span>
              <button onClick={() => go("/")}>
                Retour à l’espace chauffeur
                <ArrowRight size={17} />
              </button>
            </div>
            <div className="aside-lines" aria-hidden="true" />
          </aside>
          <main
            ref={main}
            tabIndex={-1}
            id="main-content"
            className="public-main"
          >
            {page}
          </main>
        </div>
      </>
    );
  const active = (path: string) =>
    path === "/" ? route === "/" : route.startsWith(path);
  return (
    <div
      className={`app-shell ${["", "wallet", "statements", "profile"].includes(section) ? "" : "flow-shell"}`}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Aller au contenu
      </a>
      <aside className="sidebar">
        <Logo />
        <span className="sidebar-caption">VOTRE QUOTIDIEN, SIMPLIFIÉ</span>
        <nav aria-label="Navigation principale">
          {nav.map(({ path, label, icon: Icon }) => (
            <a
              key={path}
              href={`#${path}`}
              className={active(path) ? "active" : ""}
              aria-current={active(path) ? "page" : undefined}
            >
              <Icon size={21} />
              <span>{label}</span>
              {active(path) && <span className="nav-active-dot" />}
            </a>
          ))}
        </nav>
        <button className="sidebar-collect" onClick={() => go("/amount")}>
          <QrCode size={20} />
          Encaisser
          <ArrowRight size={17} />
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-icon">
              <CircleHelp size={22} />
            </span>
            <strong>Un coup de main ?</strong>
            <p>
              On vous accompagne
              <br />à chaque étape.
            </p>
            <a href="#/help">
              Centre d'aide
              <ChevronRight size={15} />
            </a>
          </div>
          <a className="sidebar-onboarding" href="#/welcome">
            <LogOut size={17} />
            Découvrir l’inscription
            <ArrowRight size={14} />
          </a>
          <div className="sidebar-driver">
            <span className="avatar mini">YB</span>
            <span>
              <strong>Youssef Benali</strong>
              <small>Petit taxi n° 1287</small>
            </span>
            <ShieldCheck size={18} />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <div className="desktop-only breadcrumb">
            <CarFront size={17} />
            <span>Espace chauffeur</span>
            <ChevronRight size={13} />
            <strong>
              {nav.find((n) => active(n.path))?.label || "TapTaxi"}
            </strong>
          </div>
          <div className="mobile-brand">
            <Logo small />
          </div>
          <div className="demo-indicator">
            <span />
            Mode démo
            <span className="desktop-only"> · aucun paiement réel</span>
          </div>
          <a className="desktop-only header-help" href="#/help">
            <CircleHelp size={17} />
            Aide
          </a>
        </header>
        <main
          id="main-content"
          ref={main}
          tabIndex={-1}
          className="main-content"
        >
          {page}
        </main>
        <footer className="desktop-footer">
          <span>© 2026 TapTaxi. Fait au Maroc, pour vous.</span>
          <span>
            <ShieldCheck size={13} />
            Données fictives · enregistrées sur cet appareil
          </span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {bottomNav.map(({ path, label, icon: Icon }) => (
          <a
            key={path}
            href={`#${path}`}
            aria-label={label}
            aria-current={active(path) ? "page" : undefined}
            className={active(path) ? "active" : ""}
          >
            <Icon size={22} />
            {active(path) && <span>{label}</span>}
          </a>
        ))}
      </nav>
      {!state.readNotifications && route !== "/" && (
        <button
          className="floating-notifications desktop-only"
          aria-label="Notifications"
          onClick={() => go("/notifications")}
        >
          <Bell size={20} />
          <span />
        </button>
      )}
    </div>
  );
}
