import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  Fuel,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Info,
  Modal,
  PageHeader,
  Row,
} from "../components/ui";
import { Transactions } from "../components/Transactions";
import { dateLabel, money, newId, todayPayments } from "../lib/model";
import { exportPdf } from "../lib/pdf";
import { go, useStore } from "../lib/store";
export function HistoryPage() {
  const { state } = useStore();
  const [period, setPeriod] = useState("week");
  const [search, setSearch] = useState("");
  const items = state.transactions.filter((t) => {
    const age = Date.now() - t.at;
    return (
      (period === "all" || age < (period === "week" ? 7 : 30) * 86400000) &&
      `${t.label} ${t.id}`.toLowerCase().includes(search.toLowerCase())
    );
  });
  const earned = items.filter((t) => t.kind === "payment");
  return (
    <div>
      <PageHeader title="Historique des paiements" back="/wallet" />
      <div className="history-toolbar">
        <div className="chips">
          {[
            ["week", "Cette semaine"],
            ["month", "Ce mois"],
            ["all", "Tout"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={period === value ? "active" : ""}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un paiement…"
            aria-label="Rechercher un paiement"
          />
        </label>
      </div>
      <div className="summary-grid">
        <Card className="red-card">
          <span>Revenus sur la période</span>
          <strong>
            {money(earned.reduce((a, t) => a + t.credit, 0))}
            <small>MAD</small>
          </strong>
        </Card>
        <Card>
          <span>Paiements reçus</span>
          <strong>{earned.length}</strong>
        </Card>
      </div>
      <Card className="history-list">
        {items.length ? (
          <Transactions items={items} showDate />
        ) : (
          <Empty
            title="Aucun paiement trouvé"
            description="Essayez une autre référence ou une autre période."
          />
        )}
      </Card>
    </div>
  );
}
export function Statements() {
  const { state, toast } = useStore();
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const month = dateLabel(d.getTime(), { month: "long", year: "numeric" });
  const items = state.transactions.filter(
    (t) =>
      t.kind === "payment" &&
      dateLabel(t.at, { month: "long", year: "numeric" }) === month,
  );
  const total = items.reduce((a, t) => a + t.credit, 0);
  const days = new Set(items.map((t) => dateLabel(t.at))).size;
  const download = async () => {
    setBusy(true);
    try {
      await exportPdf(`Releve - ${month}`, items);
      toast("Votre relevé PDF a été téléchargé.");
    } catch {
      toast("Le PDF n’a pas pu être généré. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="statement-page">
      <PageHeader title="Relevés" />
      <div className="page-intro">
        <span className="eyebrow">VOTRE HISTORIQUE, VOTRE AVENIR</span>
        <h2>
          Chaque course construit
          <br />
          votre histoire.
        </h2>
        <p>Retrouvez vos revenus, mois après mois.</p>
      </div>
      <div className="statement-grid">
        <div className="stack">
          <Card>
            <div className="month-selector">
              <button
                aria-label="Mois précédent"
                onClick={() => setOffset((o) => o - 1)}
              >
                <ChevronLeft size={22} />
              </button>
              <strong>{month}</strong>
              <button
                aria-label="Mois suivant"
                disabled={offset === 0}
                onClick={() => setOffset((o) => o + 1)}
              >
                <ChevronRight size={22} />
              </button>
            </div>
            <div className="statement-total">
              <span>Revenu total</span>
              <strong>
                {money(total)}
                <small>MAD</small>
              </strong>
              <Badge tone="neutral">Données de démonstration</Badge>
            </div>
            <div
              className="statement-chart"
              aria-label="Répartition des revenus du mois"
            >
              {[0, 1, 2, 3].map((i) => {
                const sum = items
                  .filter(
                    (t) =>
                      Math.min(
                        3,
                        Math.floor(
                          (Number(dateLabel(t.at, { day: "numeric" })) - 1) / 8,
                        ),
                      ) === i,
                  )
                  .reduce((a, t) => a + t.credit, 0);
                return (
                  <div key={i}>
                    <span>{money(sum)}</span>
                    <div
                      style={{
                        height: `${Math.max(5, total ? (sum / total) * 110 : 5)}px`,
                      }}
                    />
                    <small>Semaine {i + 1}</small>
                  </div>
                );
              })}
            </div>
            <div className="statement-stats">
              <div>
                <strong>{items.length}</strong>
                <span>Paiements</span>
              </div>
              <div>
                <strong>{days}</strong>
                <span>Jours actifs</span>
              </div>
              <div>
                <strong>{money(days ? Math.round(total / days) : 0)}</strong>
                <span>Moy. / jour</span>
              </div>
            </div>
          </Card>
          <Button disabled={busy || !items.length} onClick={download}>
            <ArrowDownToLine size={19} />
            {busy ? "Préparation…" : "Télécharger le relevé PDF"}
          </Button>
        </div>
        <Card className="statement-explainer">
          <span className="feature-icon">
            <FileBarChart2 size={27} />
          </span>
          <h2>
            Vos revenus,
            <br />
            noir sur blanc.
          </h2>
          <p>
            Un document clair pour suivre votre activité et préparer vos
            projets.
          </p>
          <div className="stack">
            <span>
              <Check size={17} />
              Tous vos paiements du mois
            </span>
            <span>
              <Check size={17} />
              Pourboires et part des frais inclus
            </span>
            <span>
              <Check size={17} />
              Un PDF à conserver
            </span>
          </div>
          <Info>
            Les relevés de cette démo ne constituent pas une preuve bancaire
            vérifiée.
          </Info>
        </Card>
      </div>
    </div>
  );
}
export function FuelAdvance() {
  const { state, update, toast } = useStore();
  const [value, setValue] = useState(60);
  const [confirm, setConfirm] = useState(false);
  const active = state.transactions.some((t) => t.kind === "advance");
  const receive = () => {
    const id = newId();
    if (
      update((s) => {
        if (s.transactions.some((t) => t.kind === "advance"))
          throw new Error("Une avance démo est déjà en cours.");
        return {
          ...s,
          transactions: [
            {
              id,
              kind: "advance",
              credit: value * 100,
              fare: 0,
              tip: 0,
              fee: 0,
              method: "wallet",
              at: Date.now(),
              label: "Avance carburant démo",
            },
            ...s.transactions,
          ],
        };
      })
    ) {
      setConfirm(false);
      toast("Avance démo ajoutée au portefeuille. Aucun crédit réel souscrit.");
      go("/wallet");
    }
  };
  return (
    <div className="flow-page">
      <PageHeader title="Avance carburant" back="/services" />
      <div className="page-intro">
        <span className="feature-icon">
          <Fuel size={28} />
        </span>
        <h2>Faites le plein ce matin.</h2>
        <p>Un aperçu du service d'avance carburant.</p>
      </div>
      <Card className="center fuel-amount">
        <span>Montant de l'avance</span>
        <strong>
          {value}
          <small>MAD</small>
        </strong>
        <div className="chips">
          {[30, 45, 60].map((a) => (
            <button
              key={a}
              className={value === a ? "active" : ""}
              onClick={() => setValue(a)}
            >
              {a}
              {a === 60 ? " max" : ""}
            </button>
          ))}
        </div>
      </Card>
      <Card className="stack">
        <h2>À propos de cette offre démo</h2>
        <span className="check-line">
          <Check size={17} />
          Historique d'activité disponible
        </span>
        <span className="check-line">
          <Check size={17} />
          {todayPayments(state).length} paiements aujourd'hui
        </span>
        <span className="check-line">
          <Check size={17} />
          {active
            ? "Une simulation est en cours"
            : "Aucune avance démo en cours"}
        </span>
      </Card>
      <Card className="stack">
        <Row label="Partenaire" value="Non connecté" />
        <Row
          label="Frais et remboursement"
          value="À définir avec le partenaire"
        />
      </Card>
      <Info>
        Aucune offre financière réelle. Les conditions du partenaire devront
        être affichées avant toute souscription.
      </Info>
      <Button disabled={active} onClick={() => setConfirm(true)}>
        {active ? "Avance démo en cours" : `Simuler ${value} MAD`}
        <ArrowRight size={18} />
      </Button>
      {confirm && (
        <Modal title="Simuler une avance" onClose={() => setConfirm(false)}>
          <p>
            Ajouter {value} MAD au portefeuille démo ? Aucun crédit ni
            remboursement réel ne sera créé.
          </p>
          <Button onClick={receive}>Confirmer la simulation</Button>
        </Modal>
      )}
    </div>
  );
}
export function Services() {
  const [offer, setOffer] = useState("");
  return (
    <div>
      <PageHeader title="Services & offres" back="/wallet" />
      <Card className="services-hero">
        <div>
          <ShieldCheck size={33} />
          <span className="eyebrow">PLUS QU'UN PORTEFEUILLE</span>
          <h2>
            Votre travail ouvre
            <br />
            de nouvelles portes.
          </h2>
          <p>Des services pensés pour votre quotidien de chauffeur.</p>
        </div>
        <TrendingUp size={110} strokeWidth={1} />
      </Card>
      <div className="services-grid">
        {[
          {
            title: "Avance carburant",
            sub: "Un coup de pouce pour démarrer la journée",
            tag: "Découvrir la démo",
            icon: Fuel,
            color: "red",
          },
          {
            title: "Protection & assurance",
            sub: "Roulez l’esprit tranquille, au quotidien",
            tag: "Bientôt disponible",
            icon: ShieldCheck,
            color: "green",
          },
          {
            title: "Financement de véhicule",
            sub: "Préparez votre prochain taxi",
            tag: "Bientôt disponible",
            icon: TrendingUp,
            color: "purple",
          },
          {
            title: "Votre dossier de revenus",
            sub: "Votre activité, dans un document clair",
            tag: "Voir mes relevés",
            icon: FileBarChart2,
            color: "orange",
          },
        ].map(({ title, sub, tag, icon: Icon, color }, i) => (
          <button
            className="service-card"
            key={title}
            onClick={() =>
              i === 0
                ? go("/fuel")
                : i === 3
                  ? go("/statements")
                  : setOffer(title)
            }
          >
            <span className={`service-icon ${color}`}>
              <Icon size={27} />
            </span>
            <h2>{title}</h2>
            <p>{sub}</p>
            <span>
              {tag}
              <ArrowRight size={17} />
            </span>
          </button>
        ))}
      </div>
      <Info>
        Vous choisissez. Rien n'est activé sans votre accord. Les partenaires ne
        sont pas connectés dans cette démonstration.
      </Info>
      {offer && (
        <Modal title={offer} onClose={() => setOffer("")}>
          <p>
            Ce service fait partie de la vision TapTaxi. Il sera disponible
            après la connexion à un partenaire et la présentation de ses
            conditions.
          </p>
          <Badge tone="neutral">Bientôt disponible</Badge>
          <Button onClick={() => setOffer("")}>Compris</Button>
        </Modal>
      )}
    </div>
  );
}
