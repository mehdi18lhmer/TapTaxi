import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  FileBarChart2,
  History,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Info,
  Option,
  PageHeader,
  Row,
  SectionHeading,
  SuccessMark,
} from "../components/ui";
import { Transactions } from "../components/Transactions";
import {
  balance,
  methodLabel,
  money,
  newId,
  parseMoney,
  todayPayments,
  withdraw,
} from "../lib/model";
import type { PayoutMethod } from "../lib/model";
import { go, useStore } from "../lib/store";
export function WalletPage() {
  const { state } = useStore();
  const today = todayPayments(state);
  return (
    <div className="wallet-page">
      <div className="greeting">
        <div>
          <span className="eyebrow">VOTRE PORTEFEUILLE</span>
          <h1>
            Votre argent. Votre liberté<span className="greeting-dot">.</span>
          </h1>
          <p>Disponible à tout moment, à votre rythme.</p>
        </div>
        <button
          className="avatar-button"
          aria-label="Mon profil"
          onClick={() => go("/profile")}
        >
          <Avatar />
        </button>
      </div>
      <div className="wallet-grid">
        <div className="stack">
          <Card className="wallet-card">
            <div className="spread">
              <span className="wallet-brand">
                <span>T</span>TapTaxi Wallet
              </span>
              <span className="wallet-taxi">TAXI N° 1287</span>
            </div>
            <div className="wallet-balance">
              <span>Solde disponible</span>
              <strong>
                {money(balance(state))}
                <small>MAD</small>
              </strong>
            </div>
            <div className="spread wallet-bottom">
              <span>YOUSSEF BENALI</span>
              <span>
                <span className="online-dot" />+
                {money(today.reduce((a, t) => a + t.credit, 0))} aujourd'hui
              </span>
            </div>
            <div className="wallet-circles" aria-hidden="true" />
          </Card>
          <div className="payout-label">
            <ShieldCheck size={16} />
            {methodLabel(state.payout)} · retrait lié •••• 2208
          </div>
          <Card className="wallet-included">
            <span>Inclus aujourd'hui</span>
            <div>
              <div>
                <span>Pourboires</span>
                <strong>
                  +{money(today.reduce((a, t) => a + t.tip, 0))}
                  <small>MAD</small>
                </strong>
              </div>
              <div>
                <span>Part des frais</span>
                <strong>
                  +{money(today.length * 50)}
                  <small>MAD</small>
                </strong>
              </div>
            </div>
          </Card>
          <div className="wallet-actions">
            {[
              { label: "Retirer", icon: ArrowDownToLine, path: "/withdraw" },
              { label: "Propriétaire", icon: UserRound, path: "/owner" },
              { label: "Services", icon: Sparkles, path: "/services" },
              { label: "Historique", icon: History, path: "/history" },
              { label: "Relevé", icon: FileBarChart2, path: "/statements" },
            ].map(({ label, icon: Icon, path }, i) => (
              <button key={path} onClick={() => go(path)}>
                <span className={i === 0 ? "red" : ""}>
                  <Icon size={21} />
                </span>
                <small>{label}</small>
              </button>
            ))}
          </div>
          <Info>
            Votre solde est simulé. Les retraits réels seront disponibles après
            connexion à un partenaire de paiement.
          </Info>
        </div>
        <Card className="activity-card">
          <SectionHeading action="Tout voir" onAction={() => go("/history")}>
            Activité du portefeuille
          </SectionHeading>
          <Transactions items={state.transactions.slice(0, 7)} showDate />
        </Card>
      </div>
    </div>
  );
}
export function PayoutOptions({
  value,
  onChange,
}: {
  value: PayoutMethod;
  onChange: (m: PayoutMethod) => void;
}) {
  return (
    <div className="options">
      <Option
        title="En agence"
        description="Cash Plus, Wafacash · code de retrait"
        icon={<Building2 size={22} />}
        selected={value === "agency"}
        onClick={() => onChange("agency")}
      />
      <Option
        title="Wallet mobile"
        description="Instantané · +212 6 •• •• 56 78"
        icon={<Smartphone size={22} />}
        selected={value === "wallet"}
        onClick={() => onChange("wallet")}
      />
      <Option
        title="Compte bancaire"
        description="1 à 2 jours · RIB •••• 0932"
        icon={<Building2 size={22} />}
        selected={value === "bank"}
        onClick={() => onChange("bank")}
      />
    </div>
  );
}
export function Withdraw() {
  const { state, update } = useStore();
  const [amount, setAmount] = useState("500,00");
  const [method, setMethod] = useState<PayoutMethod>(state.payout);
  const [confirming, setConfirming] = useState(false);
  const [id] = useState(newId);
  const cents = parseMoney(amount);
  const error =
    amount &&
    (cents === null
      ? "Saisissez un montant valide."
      : cents <= 0
        ? "Le montant doit être supérieur à 0."
        : cents > balance(state)
          ? "Ce montant dépasse votre solde."
          : "");
  const submit = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (update((s) => withdraw(s, cents || 0, method, id)))
      go(`/withdrawal/${id}`);
  };
  return (
    <div className="flow-page">
      <PageHeader title="Retirer · سحب" back="/wallet" />
      {confirming ? (
        <>
          <div className="page-intro">
            <h2>Confirmer votre retrait</h2>
            <p>Vérifiez les détails de cette simulation.</p>
          </div>
          <Card className="stack">
            <Row label="Montant" value={`${money(cents || 0)} MAD`} strong />
            <Row label="Recevoir via" value={methodLabel(method)} />
            <Row label="Frais" value="Offerts" />
            <div className="divider" />
            <Row
              label="Solde après retrait"
              value={`${money(balance(state) - (cents || 0))} MAD`}
            />
          </Card>
        </>
      ) : (
        <>
          <div className="center page-intro">
            <h2>Montant à retirer</h2>
          </div>
          <div className="amount-entry">
            <input
              aria-label="Montant à retirer"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!error}
              aria-describedby="withdraw-error"
            />
            <span>MAD</span>
          </div>
          <p className="center subtle">
            Solde disponible : {money(balance(state))} MAD
          </p>
          {error && (
            <p className="field-error" id="withdraw-error">
              {error}
            </p>
          )}
          <div className="chips">
            {[10000, 20000, 50000, balance(state)].map((a, i) => (
              <button
                key={i}
                className={cents === a ? "active" : ""}
                onClick={() =>
                  setAmount((a / 100).toFixed(2).replace(".", ","))
                }
              >
                {i === 3 ? "Tout" : a / 100}
              </button>
            ))}
          </div>
          <SectionHeading>Recevoir via</SectionHeading>
          <PayoutOptions value={method} onChange={setMethod} />
          <Card className="stack">
            <Row
              label="Frais de retrait"
              value={<span className="green-text">Offerts</span>}
            />
            <Row
              label="Vous recevez"
              value={`${money(cents || 0)} MAD`}
              strong
            />
          </Card>
        </>
      )}
      <Button disabled={!!error || !cents} onClick={submit}>
        {confirming ? "Confirmer le retrait démo" : "Continuer"}
        <ArrowRight size={18} />
      </Button>
      {confirming && (
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          Modifier
        </Button>
      )}
      <Info>
        Simulation uniquement. Aucun virement réel ni SMS ne sera envoyé.
      </Info>
    </div>
  );
}
export function WithdrawalCode({ id }: { id: string }) {
  const { state, toast } = useStore();
  const w = state.withdrawals.find((w) => w.id === id);
  if (!w)
    return (
      <div className="flow-page">
        <PageHeader title="Retrait" back="/wallet" />
        <Card>Ce retrait est introuvable.</Card>
      </div>
    );
  const agency = w.method === "agency";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(w.code);
      toast("Code copié.");
    } catch {
      toast("Sélectionnez le code pour le copier.");
    }
  };
  return (
    <div className="flow-page">
      <PageHeader
        title={agency ? "Retrait en agence" : "Retrait demandé"}
        back="/wallet"
      />
      <div className="center success-intro">
        <SuccessMark />
        <h2>
          {agency
            ? "Votre retrait démo est prêt"
            : "Votre demande démo est enregistrée"}
        </h2>
        <p>
          {money(w.amount)} MAD · {methodLabel(w.method)}
        </p>
      </div>
      {agency ? (
        <>
          <Card className="withdraw-code center">
            <span>Code de retrait de démonstration</span>
            <small>Cash Plus · Wafacash</small>
            <strong>
              {w.code.slice(0, 4)} {w.code.slice(4)}
            </strong>
            <p>Ce code est fictif et ne permet pas de retirer d'argent.</p>
            <Button variant="secondary" onClick={copy}>
              <Copy size={17} />
              Copier le code
            </Button>
          </Card>
          <SectionHeading>Agences de l'exemple</SectionHeading>
          <Card className="agencies">
            {[
              ["Cash Plus · Maârif", "650 m"],
              ["Wafacash · Bd Zerktouni", "1,2 km"],
            ].map(([name, distance]) => (
              <div key={name}>
                <span className="row-icon">
                  <MapPin size={21} />
                </span>
                <div className="grow">
                  <strong>{name}</strong>
                  <small>Casablanca · {distance}</small>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " Casablanca")}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Itinéraire vers ${name}`}
                >
                  <ArrowUpRight size={20} />
                </a>
              </div>
            ))}
          </Card>
        </>
      ) : (
        <Card className="stack">
          <Row label="Montant" value={`${money(w.amount)} MAD`} />
          <Row label="Destination" value={methodLabel(w.method)} />
          <Row label="Statut" value={<Badge>Simulation enregistrée</Badge>} />
          <Info>
            Le solde démo a été mis à jour. Aucun transfert réel n'a lieu.
          </Info>
        </Card>
      )}
      <Button onClick={() => go("/wallet")}>
        Retour au portefeuille
        <ArrowRight size={18} />
      </Button>
      <div className="center subtle">
        <Check size={14} />
        Retrait enregistré dans votre historique
      </div>
    </div>
  );
}
