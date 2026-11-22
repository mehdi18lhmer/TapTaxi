import { useState } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  Globe,
  Headphones,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Volume2,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Info,
  MenuRow,
  Modal,
  PageHeader,
  Row,
  SectionHeading,
} from "../components/ui";
import {
  balance,
  dateLabel,
  dayKey,
  money,
  newId,
  parseMoney,
  todayPayments,
} from "../lib/model";
import { go, useStore } from "../lib/store";
import { PayoutOptions } from "./Wallet";
export function Profile() {
  const { state, update, toast } = useStore();
  const [panel, setPanel] = useState("");
  return (
    <div className="profile-page">
      <PageHeader title="Profil" />
      <Card className="profile-card">
        <Avatar />
        <h2>Youssef Benali</h2>
        <Badge>Chauffeur vérifié</Badge>
        <div className="profile-stats">
          <div>
            <strong>1287</strong>
            <span>N° de taxi</span>
          </div>
          <div>
            <strong>
              4,9 <span className="star">★</span>
            </strong>
            <span>Note passagers</span>
          </div>
          <div>
            <strong>Sept. 2026</strong>
            <span>Chauffeur depuis</span>
          </div>
        </div>
      </Card>
      <Card className="menu-card">
        <MenuRow
          icon={<FileCheck2 size={21} />}
          title="Mes documents"
          sub="CIN, permis de confiance, carte grise"
          value={<Badge>Validés</Badge>}
          onClick={() => go("/documents")}
        />
        <MenuRow
          icon={<Wallet size={21} />}
          title="Comptes de retrait"
          sub="Cash Plus •••• 2208 · RIB •••• 0932"
          onClick={() => setPanel("payout")}
        />
        <MenuRow
          icon={<Globe size={21} />}
          title="Langue"
          sub="Français · العربية · English"
          value="FR"
          onClick={() => setPanel("language")}
        />
        <div className="menu-row">
          <span className="row-icon">
            <Volume2 size={21} />
          </span>
          <span className="grow">
            <strong>Son à chaque paiement</strong>
            <small>Préférence enregistrée sur cet appareil</small>
          </span>
          <button
            className={`switch ${state.sound ? "on" : ""}`}
            role="switch"
            aria-checked={state.sound}
            aria-label="Son à chaque paiement"
            onClick={() => update((s) => ({ ...s, sound: !s.sound }))}
          >
            <span />
          </button>
        </div>
        <MenuRow
          icon={<Headphones size={21} />}
          title="Aide et assistance"
          sub="Vos questions, nos réponses"
          onClick={() => go("/help")}
        />
      </Card>
      <button className="signout" onClick={() => setPanel("logout")}>
        <LogOut size={19} />
        Se déconnecter
      </button>
      <div className="center app-version">
        TapTaxi · v1.0.0 · Fait au Maroc ♡
      </div>
      {panel && (
        <Modal
          title={
            panel === "payout"
              ? "Méthode de retrait"
              : panel === "language"
                ? "Langue de l’application"
                : "Se déconnecter"
          }
          onClose={() => setPanel("")}
        >
          {panel === "payout" ? (
            <>
              <PayoutOptions
                value={state.payout}
                onChange={(method) => {
                  update((s) => ({ ...s, payout: method }));
                  toast("Méthode de retrait enregistrée.");
                  setPanel("");
                }}
              />
              <Info>Comptes fictifs de la démonstration.</Info>
            </>
          ) : panel === "language" ? (
            <>
              <p>
                Cette première version reprend le français et les indications en
                arabe de votre maquette.
              </p>
              <Badge>Français activé</Badge>
              <p>
                Les traductions complètes en arabe et en anglais sont à venir.
              </p>
              <Button onClick={() => setPanel("")}>Compris</Button>
            </>
          ) : (
            <>
              <p>
                Votre session de démonstration sera fermée. L’historique de cet
                appareil sera conservé.
              </p>
              <Button
                onClick={() => {
                  go("/welcome");
                  setPanel("");
                }}
              >
                Se déconnecter
              </Button>
              <Button variant="secondary" onClick={() => setPanel("")}>
                Rester connecté
              </Button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
export function Notifications() {
  const { state, update } = useStore();
  const data = [
    {
      icon: Wallet,
      title: "Paiement reçu",
      body: "Le paiement #AB12 a été crédité à votre portefeuille.",
      time: "14:32",
      tag: "Aujourd’hui",
      path: "/transaction/AB12",
    },
    {
      icon: ShieldCheck,
      title: "Votre compte est vérifié",
      body: "Votre profil chauffeur est prêt. Bonne route avec TapTaxi !",
      time: "09:10",
      tag: "Aujourd’hui",
      path: "/profile",
    },
    {
      icon: FileCheck2,
      title: "Vos revenus, à portée de main",
      body: "Téléchargez le relevé de vos paiements du mois.",
      time: "Hier",
      tag: "Plus tôt",
      path: "/statements",
    },
  ];
  return (
    <div className="notifications-page">
      <PageHeader
        title="Notifications"
        action={
          <button
            className="text-link"
            onClick={() => update((s) => ({ ...s, readNotifications: true }))}
          >
            {state.readNotifications ? <Check size={19} /> : "Tout lire"}
          </button>
        }
      />
      {data.map(({ icon: Icon, title, body, time, tag, path }, i) => (
        <div key={title}>
          {(i === 0 || i === 2) && <h2 className="group-heading">{tag}</h2>}
          <button
            className={`notification-card ${!state.readNotifications && i < 2 ? "unread" : ""}`}
            onClick={() => {
              update((s) => ({ ...s, readNotifications: true }));
              go(path);
            }}
          >
            <span className="transaction-icon">
              <Icon size={22} />
            </span>
            <div className="grow">
              <div className="spread">
                <strong>{title}</strong>
                <small>{time}</small>
              </div>
              <p>{body}</p>
            </div>
            {!state.readNotifications && i < 2 && (
              <span className="unread-dot" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
export function Owner() {
  const { state, update, toast } = useStore();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(
    (state.ownerAmount / 100).toFixed(2).replace(".", ","),
  );
  const earnings = todayPayments(state).reduce((a, t) => a + t.credit, 0);
  const [confirm, setConfirm] = useState(false);
  const paid = state.transactions.some(
    (t) => t.kind === "owner" && dayKey(t.at) === dayKey(Date.now()),
  );
  const send = () => {
    if (
      update((s) => {
        if (balance(s) < s.ownerAmount)
          throw new Error("Solde insuffisant pour ce versement.");
        if (
          s.transactions.some(
            (t) => t.kind === "owner" && dayKey(t.at) === dayKey(Date.now()),
          )
        )
          return s;
        return {
          ...s,
          transactions: [
            {
              id: newId(),
              kind: "owner",
              credit: -s.ownerAmount,
              fare: 0,
              tip: 0,
              fee: 0,
              method: "bank",
              at: Date.now(),
              label: "Versement propriétaire",
            },
            ...s.transactions,
          ],
        };
      })
    ) {
      setConfirm(false);
      toast("Versement démo enregistré. Aucun transfert réel.");
    }
  };
  return (
    <div className="flow-page">
      <PageHeader title="Versement propriétaire" back="/wallet" />
      <div className="page-intro">
        <h2>
          Une chose de moins
          <br />à penser.
        </h2>
        <p>Préparez votre versement quotidien.</p>
      </div>
      <Card className="owner-amount">
        <div className="spread">
          <span>Versement quotidien</span>
          <button
            className={`switch ${state.ownerEnabled ? "on" : ""}`}
            role="switch"
            aria-checked={state.ownerEnabled}
            aria-label="Activer les versements quotidiens démo"
            onClick={() =>
              update((s) => ({ ...s, ownerEnabled: !s.ownerEnabled }))
            }
          >
            <span />
          </button>
        </div>
        <strong>
          {money(state.ownerAmount)}
          <small>MAD / jour</small>
        </strong>
        <span className="subtle">Horaire prévu : 23:00</span>
      </Card>
      <Card className="stack">
        <Row label="Gains d'aujourd'hui" value={`${money(earnings)} MAD`} />
        <Row
          label="Versement prévu"
          value={`−${money(state.ownerEnabled ? state.ownerAmount : 0)} MAD`}
        />
        <div className="divider" />
        <Row
          label="Il vous reste"
          value={`${money(earnings - (state.ownerEnabled ? state.ownerAmount : 0))} MAD`}
          strong
        />
      </Card>
      <Card>
        <div className="taxi-identity">
          <Avatar owner />
          <div className="grow">
            <strong>Hassan M.</strong>
            <small>Propriétaire · taxi n° 1287</small>
          </div>
          <button className="text-link" onClick={() => setEditing(true)}>
            Modifier
          </button>
        </div>
        <div className="divider" />
        <p className="subtle">Reçoit sur : Banque •••• 0931</p>
      </Card>
      <SectionHeading>Derniers versements</SectionHeading>
      <Card>
        {state.transactions
          .filter((t) => t.kind === "owner")
          .map((t) => (
            <div className="owner-history" key={t.id}>
              <span>
                {dateLabel(t.at)}
                <small>Simulation enregistrée</small>
              </span>
              <strong>−{money(-t.credit)} MAD</strong>
            </div>
          ))}
      </Card>
      <Button
        disabled={paid || !state.ownerEnabled}
        onClick={() => setConfirm(true)}
      >
        {paid ? "Versement démo déjà effectué" : "Simuler le versement du jour"}
      </Button>
      <Info>
        Les réglages sont enregistrés localement. Le versement automatique à
        23:00 nécessite un service serveur et n'est pas exécuté dans cette démo.
      </Info>
      {editing && (
        <Modal title="Montant du versement" onClose={() => setEditing(false)}>
          <label className="form-field">
            Montant quotidien (MAD)
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <Button
            onClick={() => {
              const n = parseMoney(amount);
              if (!n) {
                toast("Saisissez un montant supérieur à 0.");
                return;
              }
              update((s) => ({ ...s, ownerAmount: n }));
              setEditing(false);
            }}
          >
            Enregistrer
          </Button>
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Confirmer le versement démo"
          onClose={() => setConfirm(false)}
        >
          <p>
            Déduire {money(state.ownerAmount)} MAD de votre solde démo pour
            Hassan M. ?
          </p>
          <Button onClick={send}>Confirmer la simulation</Button>
        </Modal>
      )}
    </div>
  );
}
export function Help() {
  return (
    <div className="flow-page">
      <PageHeader title="Aide et assistance" back="/profile" />
      <div className="page-intro">
        <span className="feature-icon">
          <MessageCircle size={28} />
        </span>
        <h2>On est là pour vous.</h2>
        <p>Les réponses à vos questions du quotidien.</p>
      </div>
      <Card className="faq">
        {[
          [
            "Comment encaisser un paiement ?",
            "Depuis l’accueil, touchez Encaisser, saisissez le montant exact du compteur et montrez le QR au passager. Dans cette démo, utilisez Tester le parcours passager.",
          ],
          [
            "Comment retirer mon argent ?",
            "Ouvrez Portefeuille, puis Retirer. Choisissez le montant et la méthode, puis confirmez. Les codes de cette version sont fictifs.",
          ],
          [
            "Qui paie les frais ?",
            "Le passager paie des frais de 0 à 3 MAD selon le compteur (+0,50 MAD la nuit). Le chauffeur reçoit 10 % de ces frais en bonus, en plus du compteur complet et de la totalité du pourboire.",
          ],
          [
            "Mes données sont-elles envoyées ?",
            "Cette démonstration conserve les transactions et préférences dans votre navigateur. Aucune carte ni pièce d’identité n’est conservée ou envoyée.",
          ],
          [
            "Comment fonctionnent les SMS ?",
            "Aucun SMS réel n’est envoyé dans la démo. Le code 123456 permet de parcourir l’inscription.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              <CircleHelp size={17} />
              {q}
              <ChevronRight size={17} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </Card>
      <Info>
        Les canaux de support réels seront connectés lors de la mise en service.
      </Info>
      <Button variant="secondary" onClick={() => go("/")}>
        Retour à l’accueil
      </Button>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="flow-page">
      <Card className="center stack">
        <Building2 size={35} />
        <h1>
          Cette page a pris
          <br />
          un autre chemin.
        </h1>
        <p>Retrouvez votre espace TapTaxi.</p>
        <Button onClick={() => go("/")}>Retour à l’accueil</Button>
      </Card>
    </div>
  );
}
