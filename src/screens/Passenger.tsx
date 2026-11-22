import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Download,
  FileText,
  LockKeyhole,
  LoaderCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  TimerOff,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Info,
  Logo,
  Modal,
  Option,
  Plate,
  Row,
  SuccessMark,
  TaxiIdentity,
} from "../components/ui";
import {
  cancelRequest,
  completePayment,
  connectRequest,
  dateLabel,
  methodLabel,
  money,
  passengerFeeOf,
  passengerPaid,
  paymentBreakdown,
} from "../lib/model";
import { exportPdf } from "../lib/pdf";
import { go, useStore } from "../lib/store";
export function PassengerHeader() {
  return (
    <header className="passenger-header">
      <Logo small />
      <Badge tone="neutral">Démo</Badge>
    </header>
  );
}
export function Checkout({ id }: { id: string }) {
  const { state, update } = useStore();
  const r = state.requests.find((r) => r.id === id);
  const [step, setStep] = useState<
    "verify" | "amount" | "card" | "wallet" | "processing"
  >("verify");
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<"card" | "wallet">("card");
  const [provider, setProvider] = useState("Cash Plus");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [wrong, setWrong] = useState(false);
  const [now, setNow] = useState(Date.now());
  const processing = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (r?.status === "paid") go(`/receipt/${id}`);
  }, [r?.status, id]);
  useEffect(() => {
    if (step !== "processing") return;
    processing.current = true;
    const timer = setTimeout(() => {
      if (!processing.current) return;
      const ok = update((s) => completePayment(s, id, tip, method));
      if (ok) go(`/receipt/${id}`);
      else {
        setStep("amount");
        setNow(Date.now());
      }
    }, 1800);
    return () => {
      processing.current = false;
      clearTimeout(timer);
    };
  }, [step, id, tip, method, update]);
  if (
    !r ||
    r.status === "cancelled" ||
    (r.status !== "paid" && r.expiresAt <= now)
  )
    return <Expired id={id} />;
  const b = paymentBreakdown(r.fare, tip);
  const toAmount = () => {
    update((s) => connectRequest(s, id));
    setStep("amount");
  };
  const validateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (card.number.replace(/\s/g, "") !== "4242424242424242") {
      setError("Utilisez uniquement la carte de test 4242 4242 4242 4242.");
      return;
    }
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiry);
    const current = new Date();
    if (
      !match ||
      Number(match[2]) + 2000 < current.getFullYear() ||
      (Number(match[2]) + 2000 === current.getFullYear() &&
        Number(match[1]) < current.getMonth() + 1)
    ) {
      setError("Saisissez une date d’expiration valide.");
      return;
    }
    if (!/^\d{3}$/.test(card.cvv) || card.name.trim().length < 3) {
      setError("Vérifiez le CVV et le nom du titulaire.");
      return;
    }
    setError("");
    setCard({ number: "", expiry: "", cvv: "", name: "" });
    setStep("processing");
  };
  const validateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[67]\d{8}$/.test(phone.replace(/\s/g, ""))) {
      setError("Saisissez un numéro marocain de 9 chiffres, sans +212.");
      return;
    }
    setError("");
    setStep("processing");
  };
  return (
    <div className="passenger-page">
      <PassengerHeader />
      {step !== "verify" && step !== "processing" && (
        <button
          className="passenger-back"
          onClick={() => {
            setError("");
            setStep(step === "amount" ? "verify" : "amount");
          }}
        >
          <ArrowLeft size={18} />
          {step === "amount" ? "Votre taxi" : "Montant et pourboire"}
        </button>
      )}
      {step === "verify" && (
        <>
          <div className="page-intro">
            <span className="eyebrow">PAYEZ LE TAXI SANS CASH</span>
            <h1>
              Bienvenue à bord<span className="greeting-dot">.</span>
            </h1>
            <p>Vérifiez que c'est bien votre taxi.</p>
          </div>
          <Card className="verify-card">
            <div className="spread">
              <Badge>Taxi vérifié</Badge>
              <span className="subtle">#{id}</span>
            </div>
            <TaxiIdentity />
            <Plate />
            <p className="center subtle">Comparez avec la plaque du véhicule</p>
            <div className="divider" />
            <div className="stack verification-checks">
              <span>
                <ShieldCheck size={18} />
                Licence de taxi vérifiée <Check size={15} />
              </span>
              <span>
                <ShieldCheck size={18} />
                Identité du chauffeur vérifiée <Check size={15} />
              </span>
              <span>
                <QrCode size={18} />
                Code de paiement valable <Check size={15} />
              </span>
            </div>
          </Card>
          <Button onClick={toAmount}>
            C'est mon taxi
            <ArrowRight size={20} />
          </Button>
          <button
            className="text-link centered-link"
            onClick={() => setWrong(true)}
          >
            Ce n'est pas le bon taxi ?
          </button>
          <Info>Taxi et identité fictifs de la démonstration.</Info>
        </>
      )}
      {step === "amount" && (
        <>
          <Card className="checkout-taxi">
            <div className="spread">
              <Badge>Taxi agréé · démo</Badge>
              <small>#{id}</small>
            </div>
            <TaxiIdentity />
          </Card>
          <div className="center passenger-fare">
            <span>Montant du compteur</span>
            <strong>
              {money(r.fare)}
              <small>MAD</small>
            </strong>
            <p>Vérifiez : même montant que sur le compteur du taxi.</p>
          </div>
          <Card className="tip-card">
            <SectionTip />
            <div className="chips tip-chips">
              {[
                [0, "Sans"],
                [200, "+2"],
                [500, "+5"],
                [1000, "+10"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={tip === value ? "active" : ""}
                  aria-pressed={tip === value}
                  onClick={() => setTip(Number(value))}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>
          <Card className="stack">
            <Row label="Course (compteur)" value={`${money(r.fare)} MAD`} />
            <Row label="Pourboire" value={`${money(tip)} MAD`} />
            <Row label="Frais TapTaxi" value={`${money(b.fee)} MAD`} />
            <div className="divider" />
            <Row label="Total à payer" value={`${money(b.total)} MAD`} strong />
          </Card>
          <h2 className="small-heading">Payer avec</h2>
          <div className="options">
            <Option
              icon={<CreditCard size={23} />}
              title="Carte bancaire"
              description="Carte de test · Visa"
              selected={method === "card"}
              onClick={() => setMethod("card")}
            />
            <Option
              icon={<Smartphone size={23} />}
              title="Wallet mobile"
              description="Simulation MarocPay"
              selected={method === "wallet"}
              onClick={() => setMethod("wallet")}
            />
          </div>
          <Button onClick={() => setStep(method)}>
            Payer {money(b.total)} MAD
            <LockKeyhole size={18} />
          </Button>
          <Info>
            Mode démo : aucun débit réel. Les frais sont affichés avant
            confirmation.
          </Info>
        </>
      )}
      {step === "card" && (
        <>
          <div className="spread checkout-title">
            <h1>Carte bancaire</h1>
            <strong>{money(b.total)} MAD</strong>
          </div>
          <div className="bank-card">
            <div className="spread">
              <span>TapTaxi</span>
              <span>CARTE DE TEST</span>
            </div>
            <span className="card-chip" />
            <strong>{card.number || "•••• •••• •••• ••••"}</strong>
            <div className="spread">
              <span>{card.name || "NOM PRÉNOM"}</span>
              <span>{card.expiry || "MM/AA"}</span>
            </div>
          </div>
          <button
            className="test-card-fill"
            onClick={() => {
              setCard({
                number: "4242 4242 4242 4242",
                expiry: "12/29",
                cvv: "123",
                name: "Youssef Benali",
              });
              setError("");
            }}
          >
            Utiliser la carte de test
            <ArrowRight size={16} />
          </button>
          <form className="stack" onSubmit={validateCard}>
            <label className="form-field">
              Numéro de carte de test
              <input
                required
                inputMode="numeric"
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                value={card.number}
                onChange={(e) =>
                  setCard({
                    ...card,
                    number: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 16)
                      .replace(/(.{4})/g, "$1 ")
                      .trim(),
                  })
                }
              />
            </label>
            <div className="two-columns">
              <label className="form-field">
                Expiration
                <input
                  required
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder="MM/AA"
                  maxLength={5}
                  value={card.expiry}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setCard({
                      ...card,
                      expiry:
                        v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v,
                    });
                  }}
                />
              </label>
              <label className="form-field">
                CVV
                <input
                  required
                  type="password"
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder="123"
                  maxLength={3}
                  value={card.cvv}
                  onChange={(e) =>
                    setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })
                  }
                />
              </label>
            </div>
            <label className="form-field">
              Nom sur la carte
              <input
                required
                autoComplete="off"
                placeholder="NOM PRÉNOM"
                maxLength={70}
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
              />
            </label>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button type="submit">
              Simuler le paiement de {money(b.total)} MAD
              <LockKeyhole size={18} />
            </Button>
          </form>
          <Info>
            Utilisez seulement les données de test. Aucune information de carte
            n'est conservée ni envoyée.
          </Info>
        </>
      )}
      {step === "wallet" && (
        <>
          <div className="page-intro">
            <span className="feature-icon">
              <Smartphone size={29} />
            </span>
            <h1>Wallet mobile</h1>
            <p>{money(b.total)} MAD · Simulation MarocPay</p>
          </div>
          <form className="stack" onSubmit={validateWallet}>
            <h2 className="small-heading">Votre wallet</h2>
            <div className="wallet-providers">
              {["Cash Plus", "Orange Money", "inwi money", "Barid Pay"].map(
                (name) => (
                  <button
                    type="button"
                    key={name}
                    className={provider === name ? "selected" : ""}
                    onClick={() => setProvider(name)}
                  >
                    <span>{name.slice(0, 1)}</span>
                    {name}
                    {provider === name && <Check size={15} />}
                  </button>
                ),
              )}
            </div>
            <label className="form-field">
              Numéro lié au wallet
              <div className="phone-input">
                <span>+212</span>
                <input
                  required
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="6 12 34 56 78"
                  maxLength={13}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </label>
            <p className="subtle">Numéro fictif de test : 612345678</p>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button type="submit">
              Simuler la demande de paiement
              <ArrowRight size={18} />
            </Button>
          </form>
          <Info>Aucune demande réelle n'est envoyée à votre wallet.</Info>
        </>
      )}
      {step === "processing" && (
        <div className="processing-page center">
          <div className="processing-orbit">
            <LoaderCircle className="spin" size={52} />
            <span>
              <LockKeyhole size={24} />
            </span>
          </div>
          <h1>Paiement en cours…</h1>
          <p>{money(b.total)} MAD à Youssef B.</p>
          <Card className="stack">
            <span className="check-line">
              <Check size={18} />
              Simulation démarrée
            </span>
            <span className="check-line">
              <LoaderCircle className="spin" size={18} />
              Confirmation du paiement démo
            </span>
            <span className="check-line muted">
              <FileText size={18} />
              Votre reçu
            </span>
          </Card>
          <p className="subtle">Encore un petit instant.</p>
          <Button
            variant="ghost"
            onClick={() => {
              processing.current = false;
              setStep("amount");
            }}
          >
            Annuler
          </Button>
        </div>
      )}
      {step !== "processing" && (
        <button className="driver-return" onClick={() => go(`/qr/${id}`)}>
          Voir côté chauffeur
          <ArrowRight size={14} />
        </button>
      )}
      {wrong && (
        <Modal title="Vérifiez votre taxi" onClose={() => setWrong(false)}>
          <p>
            Ne payez pas si la plaque ou le chauffeur ne correspond pas.
            Demandez au chauffeur d'afficher son propre code.
          </p>
          <Button
            onClick={() => {
              update((s) => cancelRequest(s, id));
              go(`/expired/${id}`);
            }}
          >
            Quitter ce paiement
          </Button>
          <Button variant="secondary" onClick={() => setWrong(false)}>
            Revenir à la vérification
          </Button>
        </Modal>
      )}
    </div>
  );
}
function SectionTip() {
  return (
    <div className="spread">
      <strong>Ajouter un pourboire ?</strong>
      <small>100 % pour le chauffeur</small>
    </div>
  );
}
export function Receipt({ id }: { id: string }) {
  const { state, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const t = state.transactions.find((t) => t.id === id && t.kind === "payment");
  if (!t) return <Expired id={id} />;
  const total = passengerPaid(t);
  const download = async () => {
    setBusy(true);
    try {
      await exportPdf("Recu de paiement", [t], true);
      toast("Reçu PDF téléchargé.");
    } catch {
      toast("Impossible de générer le reçu. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="passenger-page">
      <PassengerHeader />
      <div className="center success-intro">
        <SuccessMark />
        <h1>Paiement réussi</h1>
        <p>
          <strong>{money(total)} MAD</strong> payé à Youssef B.
        </p>
        <p>Taxi n° 1287 · Casablanca</p>
      </div>
      <Card className="receipt-card">
        <div className="spread">
          <h2>Reçu de paiement</h2>
          <FileText size={21} />
        </div>
        <div className="divider dashed" />
        <div className="stack">
          <Row
            label="Date"
            value={dateLabel(t.at, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          <Row label="Course (compteur)" value={`${money(t.fare)} MAD`} />
          <Row label="Pourboire" value={`${money(t.tip)} MAD`} />
          <Row
            label="Frais TapTaxi"
            value={`${money(passengerFeeOf(t))} MAD`}
          />
          <Row label="Payé par" value={methodLabel(t.method)} />
          <div className="divider" />
          <Row label="Total payé" value={`${money(total)} MAD`} strong />
          <Row label="Référence" value={`TT-${id}`} />
        </div>
        <div className="receipt-stamp">PAIEMENT DÉMO</div>
      </Card>
      <Button disabled={busy} onClick={download}>
        <Download size={19} />
        {busy ? "Préparation…" : "Télécharger le reçu"}
      </Button>
      <Button variant="secondary" onClick={() => go("/my-payments")}>
        Mes paiements
        <FileText size={18} />
      </Button>
      <Info>
        Reçu de démonstration enregistré dans ce navigateur. Aucun SMS n'a été
        envoyé.
      </Info>
      <button
        className="text-link centered-link"
        onClick={() => setProblem(true)}
      >
        Signaler un problème avec ce paiement
      </button>
      <button className="driver-return" onClick={() => go(`/received/${id}`)}>
        Voir la confirmation chauffeur
        <ArrowRight size={15} />
      </button>
      {problem && (
        <Modal
          title="Un problème avec le paiement ?"
          onClose={() => setProblem(false)}
        >
          <p>
            Référence : TT-{id}. Ce paiement est une simulation et n'a débité
            aucun compte. Les canaux de support seront connectés lors de la mise
            en service.
          </p>
          <Button onClick={() => setProblem(false)}>Compris</Button>
        </Modal>
      )}
    </div>
  );
}
export function PassengerHistory() {
  const { state, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const items = state.transactions.filter((t) => t.kind === "payment");
  const total = items.reduce((sum, t) => sum + passengerPaid(t), 0);
  return (
    <div className="passenger-page">
      <PassengerHeader />
      <div className="page-intro">
        <h1>Mes paiements</h1>
        <p>Tous vos reçus démo au même endroit.</p>
      </div>
      <Card className="passenger-summary">
        <span>{items.length} paiements</span>
        <strong>
          {money(total)}
          <small>MAD payés</small>
        </strong>
        <div className="three-columns">
          <div>
            <strong>{money(items.reduce((s, t) => s + t.fare, 0))}</strong>
            <span>Courses</span>
          </div>
          <div>
            <strong>{money(items.reduce((s, t) => s + t.tip, 0))}</strong>
            <span>Pourboires</span>
          </div>
          <div>
            <strong>
              {money(items.reduce((s, t) => s + passengerFeeOf(t), 0))}
            </strong>
            <span>Frais</span>
          </div>
        </div>
      </Card>
      <Card className="passenger-history">
        {items.length ? (
          items.map((t) => (
            <button
              className="passenger-history-row"
              key={t.id}
              onClick={() => go(`/receipt/${t.id}`)}
            >
              <span className="transaction-icon">
                <CreditCard size={20} />
              </span>
              <span className="grow">
                <strong>Taxi n° 1287</strong>
                <small>
                  {dateLabel(t.at)} · {methodLabel(t.method)}
                </small>
              </span>
              <span>
                <strong>{money(passengerPaid(t))} MAD</strong>
                <small>
                  Reçu
                  <ArrowRight size={12} />
                </small>
              </span>
            </button>
          ))
        ) : (
          <Empty
            title="Votre première course vous attend"
            description="Vos reçus apparaîtront ici après un paiement."
          />
        )}
      </Card>
      <Button
        variant="secondary"
        disabled={busy || !items.length}
        onClick={async () => {
          setBusy(true);
          try {
            await exportPdf("Mes paiements", items, true);
          } catch {
            toast("Impossible de générer le PDF.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={18} />
        {busy ? "Préparation…" : "Tous mes reçus (PDF)"}
      </Button>
      <button className="driver-return" onClick={() => go("/")}>
        Retour à l’espace chauffeur
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
export function Expired({ id }: { id: string }) {
  const { state } = useStore();
  const paid = state.transactions.some((t) => t.id === id);
  return (
    <div className="passenger-page">
      <PassengerHeader />
      <div className="center expired-intro">
        <span className="expired-icon">
          <TimerOff size={42} />
        </span>
        <h1>Ce code a expiré.</h1>
        <p>
          Pour votre sécurité, chaque code ne sert qu'une fois et seulement
          quelques minutes.
        </p>
      </div>
      <Card className="stack">
        <div className="numbered-line">
          <span>1</span>
          <p>
            Demandez au chauffeur d'afficher un nouveau code dans son
            application.
          </p>
        </div>
        <div className="numbered-line">
          <span>2</span>
          <p>
            Vous avez déjà payé ? Votre reçu reste disponible dans ce
            navigateur.
          </p>
        </div>
      </Card>
      {paid && (
        <Button onClick={() => go(`/receipt/${id}`)}>
          Voir mon reçu
          <FileText size={18} />
        </Button>
      )}
      <Button variant="secondary" onClick={() => go("/amount")}>
        Afficher un nouveau code
        <QrCode size={19} />
      </Button>
      <button className="text-link centered-link" onClick={() => go("/help")}>
        Aide et assistance
      </button>
    </div>
  );
}
