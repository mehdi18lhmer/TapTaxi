import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  FileCheck2,
  FileText,
  QrCode,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Info,
  Logo,
  PageHeader,
  SuccessMark,
} from "../components/ui";
import { go, useStore } from "../lib/store";
import { PayoutOptions } from "./Wallet";
export function Splash() {
  useEffect(() => {
    const t = setTimeout(() => go("/welcome"), 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="splash-screen">
      <Logo />
      <div className="splash-art">
        <div className="taxi-roof">PETIT TAXI</div>
        <div className="taxi-body">
          <span>T</span>
          <div className="taxi-windows" />
          <i />
          <i />
        </div>
        <div className="road-dashes" />
      </div>
      <h1>Payez le taxi sans cash.</h1>
      <p lang="ar" dir="rtl">
        خلّص الطاكسي بلا كاش
      </p>
      <span>Fait au Maroc · Casablanca</span>
    </div>
  );
}
export function Welcome() {
  return (
    <div className="onboarding-page welcome-page">
      <div className="spread">
        <Logo small />
        <button className="text-link" onClick={() => go("/")}>
          Passer
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="welcome-art">
        <div className="welcome-orbit one" />
        <div className="welcome-orbit two" />
        <Card className="welcome-earnings">
          <span>Gains d'aujourd'hui</span>
          <strong>
            186,50 <small>MAD</small>
          </strong>
          <div className="mini-chart">
            {[28, 45, 35, 65, 48, 85, 100].map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </Card>
        <div className="floating-payment">
          <span>
            <Check size={20} />
          </span>
          <div>
            <strong>+23,50 MAD</strong>
            <small>Carte · il y a 1 min</small>
          </div>
        </div>
        <div className="floating-withdrawal">
          <Building2 size={21} />
          <div>
            <strong>Retrait en agence</strong>
            <small>Cash Plus · Wafacash</small>
          </div>
        </div>
        <span className="welcome-spark">✦</span>
      </div>
      <div className="welcome-copy">
        <span className="eyebrow">LE QUOTIDIEN, EN PLUS SIMPLE</span>
        <h1>
          Chaque paiement
          <br />
          compte<span className="greeting-dot">.</span>
        </h1>
        <p>
          Encaissez par carte ou wallet, sans frais pour vous, et construisez
          votre historique de revenus.
        </p>
      </div>
      <div className="welcome-dots">
        <span />
        <span />
        <span />
      </div>
      <Button onClick={() => go("/sign-in")}>
        Commencer
        <ArrowRight size={20} />
      </Button>
      <button
        className="text-link centered-link"
        onClick={() => go("/sign-in")}
      >
        J'ai déjà un compte · Se connecter
      </button>
    </div>
  );
}
export function SignIn() {
  const { state, update, toast } = useStore();
  const [phone, setPhone] = useState(state.phone);
  const [terms, setTerms] = useState(false);
  return (
    <div className="onboarding-page">
      <div className="spread">
        <Logo small />
        <Badge tone="neutral">Démo</Badge>
      </div>
      <div className="signin-hero">
        <div className="signin-icon">
          <QrCode size={35} />
        </div>
        <h1>
          Encaissez
          <br />
          sans cash<span className="greeting-dot">.</span>
        </h1>
        <p className="arabic" lang="ar" dir="rtl">
          خلّص بلا كاش
        </p>
        <p>
          Vos passagers paient par carte ou wallet.
          <br />
          Votre argent, en toute simplicité.
        </p>
        <div className="signin-benefits">
          <span>
            <Check size={16} />
            Paiement reçu · +23,50 MAD
          </span>
          <span>
            <FileCheck2 size={16} />
            Un historique de revenus chaque mois
          </span>
        </div>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = phone.replace(/\s/g, "").replace(/^0/, "");
          if (!/^[67]\d{8}$/.test(clean)) {
            toast(
              "Saisissez un numéro marocain valide (9 chiffres après +212).",
            );
            return;
          }
          update((s) => ({ ...s, phone: clean }));
          go("/sms");
        }}
      >
        <label className="form-field">
          Votre numéro de téléphone
          <div className="phone-input">
            <span>🇲🇦 +212</span>
            <input
              required
              type="tel"
              autoComplete="tel-national"
              placeholder="6 12 34 56 78"
              value={phone}
              maxLength={14}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </label>
        <p className="subtle">
          Démo : aucun SMS n’est envoyé. Le code de test sera affiché.
        </p>
        <Button type="submit">
          Recevoir le code de démonstration
          <ArrowRight size={19} />
        </Button>
      </form>
      <p className="legal-note">
        En continuant, vous découvrez le parcours d’inscription démo.{" "}
        <button onClick={() => setTerms(!terms)}>Confidentialité</button>
      </p>
      {terms && (
        <Card>
          <p>
            Seuls le numéro de démonstration, les préférences et les
            transactions fictives sont enregistrés dans ce navigateur. Aucune
            donnée n’est envoyée à un serveur.
          </p>
        </Card>
      )}
    </div>
  );
}
export function SMS() {
  const { state, toast } = useStore();
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(42);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="onboarding-page">
      <PageHeader title="Étape 1 sur 3" back="/sign-in" />
      <StepProgress step={1} />
      <div className="page-intro">
        <span className="feature-icon">
          <Smartphone size={28} />
        </span>
        <h1>Entrez le code.</h1>
        <p>Numéro de test : +212 {state.phone}</p>
      </div>
      <Card className="demo-code">
        <span>Code de démonstration</span>
        <strong>123456</strong>
        <small>Aucun SMS réel n'a été envoyé.</small>
      </Card>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (code !== "123456") {
            toast("Le code de démonstration est 123456.");
            return;
          }
          go("/documents");
        }}
      >
        <label className="form-field">
          Code à 6 chiffres
          <input
            className="otp-input"
            ref={input}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            maxLength={6}
            placeholder="• • • • • •"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <button
          type="button"
          className="text-link centered-link"
          disabled={seconds > 0}
          onClick={() => {
            setSeconds(42);
            toast("Code de démo : 123456");
          }}
        >
          {seconds > 0
            ? `Renvoyer le code dans 00:${String(seconds).padStart(2, "0")}`
            : "Renvoyer le code démo"}
        </button>
        <Info>
          Ne partagez jamais un vrai code reçu par SMS. TapTaxi ne vous le
          demandera jamais par téléphone.
        </Info>
        <Button type="submit" disabled={code.length !== 6}>
          Vérifier
          <ArrowRight size={18} />
        </Button>
      </form>
      <button
        className="text-link centered-link"
        onClick={() => go("/sign-in")}
      >
        Changer de numéro
      </button>
    </div>
  );
}
function StepProgress({ step }: { step: number }) {
  return (
    <div className="step-progress" aria-label={`Étape ${step} sur 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= step ? "active" : ""} />
      ))}
    </div>
  );
}
const documents = [
  {
    id: "cin",
    title: "Carte nationale (CIN)",
    sub: "Recto et verso",
    icon: CreditCard,
  },
  {
    id: "permit",
    title: "Permis de confiance",
    sub: "Carte professionnelle de chauffeur",
    icon: FileText,
  },
  {
    id: "vehicle",
    title: "Carte grise du taxi",
    sub: "Avec le numéro d’agrément",
    icon: FileCheck2,
  },
  {
    id: "photo",
    title: "Photo de profil",
    sub: "Visible par vos passagers",
    icon: Camera,
  },
];
export function Documents() {
  const { state, update, toast } = useStore();
  const [selected, setSelected] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const count = state.documents.length;
  return (
    <div className="onboarding-page">
      <PageHeader title="Étape 2 sur 3" back="/sms" />
      <StepProgress step={2} />
      <div className="page-intro">
        <h1>Vos documents.</h1>
        <p>Découvrez la vérification des chauffeurs agréés.</p>
      </div>
      <div className="spread">
        <span className="subtle">
          {count} document{count > 1 ? "s" : ""} sur 4
        </span>
        <strong>{count * 25} %</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${count * 25}%` }} />
      </div>
      <div className="document-list">
        {documents.map(({ id, title, sub, icon: Icon }) => (
          <Card key={id}>
            <span
              className={`document-icon ${state.documents.includes(id) ? "complete" : ""}`}
            >
              <Icon size={23} />
            </span>
            <div className="grow">
              <strong>{title}</strong>
              <small>{sub}</small>
            </div>
            <button
              className={`document-upload ${state.documents.includes(id) ? "complete" : ""}`}
              aria-label={`Ajouter ${title}`}
              onClick={() => {
                setSelected(id);
                input.current?.click();
              }}
            >
              {state.documents.includes(id) ? (
                <Check size={20} />
              ) : (
                <Upload size={20} />
              )}
            </button>
          </Card>
        ))}
      </div>
      <input
        type="file"
        hidden
        ref={input}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 10 * 1024 * 1024) {
            toast("Choisissez un fichier de moins de 10 Mo.");
            e.target.value = "";
            return;
          }
          if (
            ![
              "image/jpeg",
              "image/png",
              "image/webp",
              "application/pdf",
            ].includes(f.type)
          ) {
            toast("Utilisez une image JPG, PNG, WebP ou un PDF.");
            return;
          }
          update((s) => ({
            ...s,
            documents: [...new Set([...s.documents, selected])],
          }));
          toast(
            "Sélection enregistrée. Le fichier n’est pas conservé ni envoyé.",
          );
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        onClick={() => {
          update((s) => ({ ...s, documents: documents.map((d) => d.id) }));
          toast("Les quatre documents fictifs sont prêts.");
        }}
      >
        Utiliser les documents de démonstration
      </Button>
      <Info>
        Aucune pièce d’identité nécessaire : utilisez les documents fictifs. Les
        fichiers sélectionnés ne sont ni conservés ni envoyés.
      </Info>
      <Button disabled={count < 4} onClick={() => go("/payout-setup")}>
        Continuer
        <ArrowRight size={18} />
      </Button>
    </div>
  );
}
export function PayoutSetup() {
  const { state, update } = useStore();
  return (
    <div className="onboarding-page">
      <PageHeader title="Étape 3 sur 3" back="/documents" />
      <StepProgress step={3} />
      <div className="page-intro">
        <span className="feature-icon">
          <Building2 size={28} />
        </span>
        <h1>
          Où recevoir
          <br />
          votre argent ?
        </h1>
        <p>Vous pourrez changer à tout moment dans votre profil.</p>
      </div>
      <h2 className="small-heading">Méthode de retrait</h2>
      <PayoutOptions
        value={state.payout}
        onChange={(payout) => update((s) => ({ ...s, payout }))}
      />
      <Info>
        Les comptes de cette démonstration sont fictifs. Aucun compte de
        paiement réel n'est créé.
      </Info>
      <Button
        onClick={() => {
          update((s) => ({ ...s, onboarded: true }));
          go("/verification");
        }}
      >
        Terminer l’inscription démo
        <ArrowRight size={18} />
      </Button>
    </div>
  );
}
export function Verification() {
  const { state } = useStore();
  return (
    <div className="onboarding-page">
      <Logo small />
      <div className="center success-intro">
        <SuccessMark />
        <h1>Dossier démo envoyé.</h1>
        <p lang="ar" dir="rtl" className="arabic">
          تم إرسال ملفك
        </p>
        <p>
          Vous avez terminé le parcours d’inscription.
          <br />
          Aucun dossier réel n’a été transmis.
        </p>
      </div>
      <Card className="verification-timeline">
        <div>
          <span className="done">
            <Check size={17} />
          </span>
          <div>
            <strong>Compte démo créé</strong>
            <small>+212 {state.phone}</small>
          </div>
        </div>
        <div>
          <span className="done">
            <Check size={17} />
          </span>
          <div>
            <strong>Documents fictifs prêts</strong>
            <small>{state.documents.length} documents · démonstration</small>
          </div>
        </div>
        <div>
          <span>
            <ShieldCheck size={17} />
          </span>
          <div>
            <strong>Vérification partenaire</strong>
            <small>À connecter lors de la mise en service</small>
          </div>
        </div>
      </Card>
      <Button onClick={() => go("/")}>
        Découvrir mon espace
        <QrCode size={18} />
      </Button>
      <button className="text-link centered-link" onClick={() => go("/help")}>
        Besoin d’aide ?
      </button>
    </div>
  );
}
