/** Card-payment integration checks using the required gstack browse browser.
 * Start mobile's Expo server first. This uses demo data and restores app storage.
 * Run: node scripts/check-native-card.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const binary = [
  process.env.GSTACK_BROWSE,
  join(homedir(), ".agents/skills/gstack/browse/dist/browse"),
  join(homedir(), ".codex/skills/gstack/browse/dist/browse"),
]
  .filter(Boolean)
  .find(existsSync);
assert.ok(binary, "Set GSTACK_BROWSE to the gstack browse executable.");
const base = process.env.TAPTAXI_NATIVE_URL || "http://localhost:8081";
const output = ".gstack/qa-reports";
mkdirSync(join(output, "screenshots"), { recursive: true });
const checks = [];
function browse(...args) {
  const result = spawnSync(binary, args, { encoding: "utf8", timeout: 35000 });
  assert.equal(
    result.status,
    0,
    `${args[0]}: ${result.stderr || result.stdout}`,
  );
  return result.stdout.trim();
}
const js = (source) => browse("js", source);
const data = (source) => JSON.parse(js(`JSON.stringify(${source})`));
const wait = (selector) => browse("wait", selector);
const click = (label) => {
  const selector = `[aria-label=${JSON.stringify(label)}]`;
  const explicit = data(
    `!!document.querySelector(${JSON.stringify(selector)})`,
  );
  return browse("click", explicit ? selector : `text=${label}`);
};
const fill = (label, value) =>
  browse("fill", `[aria-label=${JSON.stringify(label)}]`, value);
const ledger = () =>
  data('JSON.parse(localStorage.getItem("taptaxi.native.demo.v2"))');
const payment = (id) => ledger().transactions.filter((t) => t.id === id);
function check(name, run) {
  run();
  checks.push(name);
  console.log(`PASS ${name}`);
}
function route(path, selector) {
  browse("goto", base + path);
  if (selector) wait(selector);
}
function prepare(
  id,
  { fare = 2300, expiresAt, status = "waiting", cards } = {},
) {
  const now = Date.now();
  js(`{
    const s = JSON.parse(localStorage.getItem('taptaxi.native.demo.v2'));
    s.requests = s.requests.filter(r => r.id !== ${JSON.stringify(id)});
    s.transactions = s.transactions.filter(t => t.id !== ${JSON.stringify(id)});
    s.requests.unshift(${JSON.stringify({ id, fare, createdAt: now, expiresAt: expiresAt ?? now + 300000, status })});
    localStorage.setItem('taptaxi.native.demo.v2', JSON.stringify(s));
    ${cards === undefined ? "" : `const p = JSON.parse(localStorage.getItem('taptaxi.native.passenger.v1')); p.cards = ${JSON.stringify(cards)}; p.defaultCardId = p.cards[0]?.id ?? null; localStorage.setItem('taptaxi.native.passenger.v1', JSON.stringify(p));`}
  }`);
  route(
    `/pay/${id}`,
    status === "cancelled" || (expiresAt && expiresAt <= now)
      ? "text=Ce code a expiré."
      : '[aria-label="C’est mon taxi"]',
  );
}
function amount() {
  click("C’est mon taxi");
  wait('[data-testid="pay-button"]');
}
function newCard() {
  browse("click", '[role="radio"]:has-text("Carte de test")');
  browse("click", '[data-testid="pay-button"]');
  wait('[aria-label="Utiliser la carte de test"]');
}
function assertNoPayment(id) {
  assert.equal(
    payment(id).length,
    0,
    "A refused or cancelled payment must not credit the driver.",
  );
}

browse("goto", base);
wait('[role="tab"][aria-selected="true"]');
const keys = [
  "taptaxi.native.demo.v2",
  "taptaxi.native.passenger.v1",
  "taptaxi.native.role",
];
const backup = data(
  `Object.fromEntries(${JSON.stringify(keys)}.map(k => [k, localStorage.getItem(k)]))`,
);
try {
  // Use an isolated demo passenger; the original account and cards are restored below.
  js(
    `localStorage.setItem('taptaxi.native.passenger.v1', JSON.stringify({ version: 1, account: { firstName: 'Test', phone: '612345678', since: Date.now() }, cards: [], defaultCardId: null })); localStorage.setItem('taptaxi.native.role', 'passenger');`,
  );
  route("/passenger", '[data-testid="scan-qr"]');
  browse("console", "--clear");

  check(
    "New card: invalid number, expired date, short CVV and missing name are refused",
    () => {
      prepare("QACARD01", { cards: [] });
      amount();
      newCard();
      const submit = "Simuler le paiement de 25,00 MAD";
      for (const [field, value, error] of [
        ["Numéro de carte", "4000000000000002", "Utilisez une carte de test"],
        ["Expiration", "1026", "Cette carte est expirée."],
        ["Expiration", "1329", "Saisissez une date d’expiration valide."],
        ["CVV", "12", "Le CVV contient 3 chiffres."],
        ["Nom sur la carte", " ", "Saisissez le nom du titulaire."],
      ]) {
        click("Utiliser la carte de test");
        fill(field, value);
        click(submit);
        wait(`text=${error}`);
        assertNoPayment("QACARD01");
      }
    },
  );

  check(
    "Visa with tip: 35 MAD charged, 33.50 MAD credited once, card safely saved",
    () => {
      prepare("QACARD02", { cards: [] });
      amount();
      click("+10");
      newCard();
      click("Utiliser la carte de test");
      const before = ledger();
      const balanceBefore =
        before.openingBalance +
        before.transactions.reduce((sum, t) => sum + t.credit, 0);
      click("Simuler le paiement de 35,00 MAD");
      wait("text=Paiement réussi");
      const [t] = payment("QACARD02");
      assert.equal(t.fare, 2300);
      assert.equal(t.tip, 1000);
      assert.equal(t.credit, 3350);
      assert.equal(t.method, "card");
      assert.equal(t.fare + t.tip + 200, 3500);
      const after = ledger();
      assert.equal(
        after.openingBalance +
          after.transactions.reduce((sum, x) => sum + x.credit, 0),
        balanceBefore + 3350,
      );
      const saved = data(
        'JSON.parse(localStorage.getItem("taptaxi.native.passenger.v1"))',
      );
      assert.equal(saved.cards.length, 1);
      assert.equal(saved.cards[0].last4, "4242");
      const persisted = js(
        'localStorage.getItem("taptaxi.native.passenger.v1") + localStorage.getItem("taptaxi.native.demo.v2")',
      );
      assert.doesNotMatch(
        persisted,
        /4242 4242 4242 4242|4242424242424242|"cvv"/,
      );
      route("/pay/QACARD02", "text=Paiement réussi");
      assert.equal(data("location.pathname"), "/receipt/QACARD02");
      assert.equal(payment("QACARD02").length, 1);
    },
  );

  check(
    "Saved card pays without a form; cancellation and retry create exactly one payment",
    () => {
      prepare("QACARD03");
      amount();
      browse("click", '[data-testid="pay-button"]');
      wait('[aria-label="Annuler"]');
      click("Annuler");
      wait('[data-testid="pay-button"]');
      // Give the cancelled processing timer enough time to expose an accidental credit.
      js("await new Promise(resolve => setTimeout(resolve, 2100));");
      assertNoPayment("QACARD03");
      browse("click", '[data-testid="pay-button"]');
      wait("text=Paiement réussi");
      assert.equal(payment("QACARD03").length, 1);
      assert.equal(payment("QACARD03")[0].credit, 2350);
    },
  );

  check("Mastercard can pay without saving the card", () => {
    prepare("QACARD04", { cards: [] });
    amount();
    newCard();
    click("Utiliser la carte de test");
    fill("Numéro de carte", "5555555555554444");
    click("Enregistrer cette carte pour la prochaine fois");
    click("Simuler le paiement de 25,00 MAD");
    wait("text=Paiement réussi");
    assert.equal(payment("QACARD04")[0].method, "card");
    assert.equal(
      data(
        'JSON.parse(localStorage.getItem("taptaxi.native.passenger.v1")).cards.length',
      ),
      0,
    );
  });

  check("Expired, cancelled and unknown requests cannot be paid", () => {
    prepare("QACARD05", { expiresAt: Date.now() - 1000 });
    assertNoPayment("QACARD05");
    prepare("QACARD06", { status: "cancelled" });
    assertNoPayment("QACARD06");
    route("/pay/QAMISSING", "text=Ce code a expiré.");
    assertNoPayment("QAMISSING");
  });

  // Regression: ISSUE-001 — expiry while checkout is open must invalidate selection.
  // Found by /qa on 2026-11-20.
  // Report: .gstack/qa-reports/qa-report-card-payment-2026-11-20.md
  check(
    "A saved card expiring during checkout requires new card details",
    () => {
      const end = data("new Date(2026, 11, 1).getTime()") - 2000;
      prepare("QACARD07", {
        expiresAt: end + 300000,
        cards: [
          {
            id: "ENDMONTH",
            brand: "Visa",
            last4: "4242",
            expMonth: 11,
            expYear: 2026,
            holder: "TEST",
            addedAt: end,
          },
        ],
      });
      js(
        `window.__cardQAOriginalDate = Date; window.__cardQANow = ${end}; window.Date = class extends window.__cardQAOriginalDate { constructor(...args) { if (args.length) super(...args); else super(window.__cardQANow); } static now() { return window.__cardQANow; } };`,
      );
      amount();
      js(
        "window.__cardQANow += 5000; await new Promise(resolve => setTimeout(resolve, 1100));",
      );
      browse("click", '[data-testid="pay-button"]');
      // Read the actual next screen, so the old code fails immediately and clearly.
      assert.equal(
        data(`!!document.querySelector('input[aria-label="Numéro de carte"]')`),
        true,
        "Expired saved selection must open the card form instead of processing a payment.",
      );
      assertNoPayment("QACARD07");
      browse("screenshot", join(output, "screenshots/expired-card-after.png"));
      js("window.Date = window.__cardQAOriginalDate;");
    },
  );

  check(
    "A saved card expiring during processing is refused before driver credit",
    () => {
      const end = data("new Date(2026, 11, 1).getTime()") - 2000;
      prepare("QACARD08", {
        expiresAt: end + 300000,
        cards: [
          {
            id: "ENDMONTH2",
            brand: "Visa",
            last4: "4242",
            expMonth: 11,
            expYear: 2026,
            holder: "TEST",
            addedAt: end,
          },
        ],
      });
      js(
        `window.__cardQAOriginalDate = Date; window.__cardQANow = ${end}; window.Date = class extends window.__cardQAOriginalDate { constructor(...args) { if (args.length) super(...args); else super(window.__cardQANow); } static now() { return window.__cardQANow; } };`,
      );
      amount();
      browse("click", '[data-testid="pay-button"]');
      wait('[aria-label="Annuler"]');
      js("window.__cardQANow += 5000;");
      wait('[data-testid="pay-button"]');
      wait("text=Cette carte n’est plus disponible.");
      assertNoPayment("QACARD08");
      js("window.Date = window.__cardQAOriginalDate;");
    },
  );

  // Regression: ISSUE-002 — checkout offered to save a sixth card, then silently failed.
  // Found by /qa on 2026-11-20.
  // Report: .gstack/qa-reports/qa-report-card-payment-2026-11-20.md
  check(
    "Five-card limit is explained and payment remains available without saving",
    () => {
      prepare("QACARD09", {
        cards: Array.from({ length: 5 }, (_, i) => ({
          id: `LIMIT${i}`,
          brand: "Visa",
          last4: "4242",
          expMonth: 1,
          expYear: 2027 + i,
          holder: "TEST",
          addedAt: Date.now(),
        })),
      });
      amount();
      newCard();
      assert.equal(
        data('!!document.querySelector("[role=checkbox]")'),
        false,
        "Checkout must not promise to save another card after the five-card limit.",
      );
      wait("text=Limite de 5 cartes atteinte");
      browse("screenshot", join(output, "screenshots/card-limit-after.png"));
      click("Utiliser la carte de test");
      click("Simuler le paiement de 25,00 MAD");
      wait("text=Paiement réussi");
      assert.equal(payment("QACARD09").length, 1);
      assert.equal(
        data(
          'JSON.parse(localStorage.getItem("taptaxi.native.passenger.v1")).cards.length',
        ),
        5,
      );
    },
  );
  check("No browser JavaScript errors during card-payment checks", () => {
    assert.match(browse("console", "--errors"), /no console errors/);
  });
} finally {
  // Reload also restores the real clock after any failing clock-boundary test.
  js(
    `for (const [k, v] of Object.entries(${JSON.stringify(backup)})) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }`,
  );
  browse("goto", base);
  writeFileSync(
    join(output, "native-card-checks.json"),
    JSON.stringify(
      { date: "2026-11-20", url: base, checks, stateRestored: true },
      null,
      2,
    ) + "\n",
  );
}
console.log(
  `${checks.length} card-payment checks passed. Original app storage restored.`,
);
