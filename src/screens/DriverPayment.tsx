import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Delete,
  LoaderCircle,
  QrCode,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Info,
  PageHeader,
  Plate,
  Row,
  SuccessMark,
} from "../components/ui";
import {
  balance,
  cancelRequest,
  createRequest,
  methodLabel,
  money,
  newId,
  parseMoney,
  paymentBreakdown,
  timeLabel,
} from "../lib/model";
import { go, useStore } from "../lib/store";
export function Amount() {
  const [value, setValue] = useState("0");
  const { state, update } = useStore();
  const cents = parseMoney(value) || 0;
  const b = paymentBreakdown(cents);
  const key = (k: string) => {
    setValue((v) => {
      if (k === "delete") return v.length > 1 ? v.slice(0, -1) : "0";
      if (k === ",") return v.includes(",") ? v : v + ",";
      if (v.split(",")[1]?.length === 2 || v.replace(",", "").length >= 7)
        return v;
      return v === "0" ? k : v + k;
    });
  };
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (/^[0-9]$/.test(e.key)) key(e.key);
      if (e.key === "Backspace") {
        e.preventDefault();
        key("delete");
      }
      if (e.key === "," || e.key === ".") key(",");
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);
  const submit = () => {
    const id = newId();
    if (update((s) => createRequest(s, cents, id))) go(`/qr/${id}`);
  };
  const active = state.requests.find(
    (r) =>
      r.status !== "paid" &&
      r.status !== "cancelled" &&
      r.expiresAt > Date.now(),
  );
  return (
    <div className="flow-page">
      <PageHeader title="Encaisser un paiement" />
      <div className="center page-intro">
        <h2>Montant du compteur</h2>
        <p className="arabic" lang="ar" dir="rtl">
          المبلغ في العداد
        </p>
        <p>Tapez le montant affiché au compteur</p>
      </div>
      <div className="amount-entry">
        <label className="sr-only" htmlFor="fare">
          Montant du compteur en MAD
        </label>
        <input
          id="fare"
          aria-label="Montant du compteur en MAD"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(".", ",");
            if (/^\d{0,6}(,\d{0,2})?$/.test(v)) setValue(v);
          }}
        />
        <span>MAD</span>
      </div>
      <Card className="fee-card">
        <Row
          label="Le passager paie"
          value={`${money(cents ? b.total : 0)} MAD`}
        />
        <Row
          label="Vous recevez"
          value={
            <span className="green-text">
              {money(cents ? b.credit : 0)} MAD
            </span>
          }
          strong
        />
        <small>
          Frais passager : {money(b.fee)} MAD · votre bonus 10 % :{" "}
          {money(b.driverFee)} MAD
        </small>
      </Card>
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "delete"].map(
          (k) => (
            <button
              key={k}
              aria-label={
                k === "delete" ? "Effacer" : k === "," ? "Virgule" : k
              }
              onClick={() => key(k)}
            >
              {k === "delete" ? <Delete size={25} /> : k}
            </button>
          ),
        )}
      </div>
      <Button disabled={cents <= 0} onClick={submit}>
        Afficher le QR
        <QrCode size={21} />
      </Button>
      {active && (
        <button
          className="text-link centered-link"
          onClick={() => go(`/qr/${active.id}`)}
        >
          Reprendre le paiement en cours
        </button>
      )}
      <Info>Le montant et les frais sont visibles avant de payer.</Info>
    </div>
  );
}
export function PaymentQR({ id }: { id: string }) {
  const { state, update, toast } = useStore();
  const request = state.requests.find((r) => r.id === id);
  const [now, setNow] = useState(Date.now());
  const [qr, setQr] = useState("");
  const url = `${window.location.origin}${window.location.pathname}#/pay/${id}`;
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, {
      width: 560,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#121212", light: "#ffffff" },
    })
      .then((data) => {
        if (alive) setQr(data);
      })
      .catch(() =>
        toast("Impossible de générer le QR. Utilisez le lien passager."),
      );
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [url, toast]);
  useEffect(() => {
    if (request?.status === "paid") go(`/received/${id}`);
  }, [request?.status, id]);
  if (!request) return <MissingPayment />;
  const seconds = Math.max(0, Math.ceil((request.expiresAt - now) / 1000));
  const expired = seconds === 0 || request.status === "cancelled";
  const b = paymentBreakdown(request.fare);
  const renew = () => {
    const next = newId();
    if (update((s) => createRequest(cancelRequest(s, id), request.fare, next)))
      go(`/qr/${next}`);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Lien de paiement copié.");
    } catch {
      toast("La copie est indisponible dans ce navigateur.");
    }
  };
  return (
    <div className="flow-page">
      <PageHeader title={`Paiement #${id}`} back="/amount" />
      <div className="center page-intro">
        <h2>
          {expired
            ? "Ce code a expiré"
            : request.status === "connected"
              ? "Passager connecté"
              : "Montrez ce code au passager"}
        </h2>
        <p className="arabic" lang="ar" dir="rtl">
          {request.status === "connected"
            ? "الراكب متصل"
            : "أظهر هذا الرمز للراكب"}
        </p>
      </div>
      <Card className={`qr-card center ${expired ? "expired-qr" : ""}`}>
        <span className="eyebrow">PETIT TAXI N° 1287</span>
        <Plate />
        {qr ? (
          <div className="qr-image">
            <img src={qr} alt="QR du paiement passager" />
            {expired && (
              <span>
                <X size={40} />
              </span>
            )}
          </div>
        ) : (
          <LoaderCircle className="spin" size={40} />
        )}
        <div className="qr-amount">
          {money(b.total)} <span>MAD</span>
        </div>
        <p>
          Compteur {money(request.fare)} + frais {money(b.fee)}
        </p>
        <Badge>{`Vous recevez ${money(b.credit)} MAD`}</Badge>
      </Card>
      <div className="payment-status">
        <span className={expired ? "status-dot expired" : "status-dot"} />
        {expired
          ? "Code expiré"
          : request.status === "connected"
            ? "Le passager vérifie son paiement…"
            : "En attente du passager…"}
      </div>
      <p className="center subtle">
        {expired
          ? "Générez un nouveau code pour continuer."
          : `Code valable ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")} · carte ou wallet`}
      </p>
      <div className="button-row">
        <Button
          variant="secondary"
          onClick={() => {
            update((s) => cancelRequest(s, id));
            go("/");
          }}
        >
          Annuler
        </Button>
        <Button variant="secondary" onClick={renew}>
          <RefreshCw size={17} />
          Nouveau code
        </Button>
      </div>
      {!expired && (
        <>
          <Button onClick={() => go(`/pay/${id}`)}>
            Tester le parcours passager
            <ArrowRight size={18} />
          </Button>
          <button className="text-link centered-link" onClick={copy}>
            <Copy size={14} />
            Copier le lien
          </button>
        </>
      )}
      <Info>
        Démo locale : ouvrez le lien dans ce navigateur pour tester. Aucun
        montant réel n'est débité.
      </Info>
    </div>
  );
}
export function Received({
  id,
  detail = false,
}: {
  id: string;
  detail?: boolean;
}) {
  const { state } = useStore();
  const t = state.transactions.find((t) => t.id === id && t.kind === "payment");
  if (!t) return <MissingPayment />;
  return (
    <div className="flow-page">
      <PageHeader title={`Paiement #${id}`} back={detail ? "/history" : "/"} />
      <div className="center success-intro">
        <SuccessMark />
        <h2>Paiement reçu</h2>
        <p className="arabic" lang="ar" dir="rtl">
          تم استلام الدفع
        </p>
        <div className="success-amount">
          +{money(t.credit)} <span>MAD</span>
        </div>
        <p>{timeLabel(t.at)} · Crédité au portefeuille démo</p>
      </div>
      <Card className="stack">
        <Row label="Course (compteur)" value={`${money(t.fare)} MAD`} />
        <Row
          label="Votre bonus 10 % des frais"
          value={`+${money(t.fee)} MAD`}
        />
        {t.tip > 0 && (
          <Row
            label="Pourboire · 100 % pour vous"
            value={`+${money(t.tip)} MAD`}
          />
        )}
        <div className="divider" />
        <Row
          label="Crédité au portefeuille"
          value={`${money(t.credit)} MAD`}
          strong
        />
        <div className="receipt-method">
          <CreditCard size={18} />
          {methodLabel(t.method)}
          <Check size={16} />
        </div>
      </Card>
      <Button onClick={() => go("/amount")}>
        Nouvel encaissement
        <QrCode size={19} />
      </Button>
      <Button variant="secondary" onClick={() => go("/wallet")}>
        Voir le portefeuille
        <ArrowRight size={18} />
      </Button>
      <div className="center subtle">
        Solde disponible : {money(balance(state))} MAD
      </div>
    </div>
  );
}
export function MissingPayment() {
  return (
    <div className="flow-page">
      <PageHeader title="Paiement" />
      <Card className="center stack">
        <Smartphone size={35} />
        <h2>Paiement introuvable</h2>
        <p>
          Les paiements de cette démo sont disponibles dans le navigateur où ils
          ont été créés.
        </p>
        <Button onClick={() => go("/amount")}>Créer un paiement</Button>
      </Card>
    </div>
  );
}
