/** End-to-end checks through the project's required gstack browse browser.
 * Uses only local demo data; clears taptaxi.demo.v2 in the test browser.
 * Run with the app's dev server active: npm run test:browser
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const candidates = [
  process.env.GSTACK_BROWSE,
  join(homedir(), ".agents/skills/gstack/browse/dist/browse"),
  join(homedir(), ".codex/skills/gstack/browse/dist/browse"),
].filter(Boolean);
const binary = candidates.find(existsSync);
if (!binary) throw new Error("Set GSTACK_BROWSE to your gstack browse binary.");
const base = process.env.TAPTAXI_URL || "http://localhost:5173/";
const report = [];
function browse(...args) {
  const p = spawnSync(binary, args, { encoding: "utf8", timeout: 30000 });
  if (p.status !== 0) throw new Error(`${args[0]}: ${p.stderr || p.stdout}`);
  return p.stdout.trim();
}
function js(source) {
  return browse("js", source);
}
function data() {
  return JSON.parse(
    js('JSON.stringify(JSON.parse(localStorage.getItem("taptaxi.demo.v2")))'),
  );
}
function currentBalance() {
  const s = data();
  return s.openingBalance + s.transactions.reduce((a, t) => a + t.credit, 0);
}
function check(name, fn) {
  fn();
  report.push(name);
  console.log(`PASS ${name}`);
}
function route(path) {
  browse("goto", base + "#" + path);
}
function click(sel) {
  browse("click", sel);
}
function fill(sel, value) {
  browse("fill", sel, value);
}
function waitForRoute(expected) {
  const result = browse("wait", expected);
  assert.ok(result);
}
function request(fare) {
  route("/amount");
  fill("#fare", fare);
  click(".flow-page > .button.primary");
  return js("location.hash").split("/").at(-1);
}
browse("goto", base);
js('localStorage.removeItem("taptaxi.demo.v2")');
browse("reload");
browse("viewport", "390x844");
browse("console", "--clear");
check(
  "Driver amount keypad discloses the 2 MAD fee and 0.50 MAD driver share",
  () => {
    route("/amount");
    click(".keypad button:nth-child(2)");
    click(".keypad button:nth-child(3)");
    assert.equal(js('document.querySelector("#fare").value'), "23");
    assert.equal(
      js(
        'document.querySelector(".fee-card").textContent.includes("25,00 MAD")',
      ),
      "true",
    );
    assert.equal(
      js(
        'document.querySelector(".bottom-nav") && getComputedStyle(document.querySelector(".bottom-nav")).display',
      ),
      "none",
    );
  },
);
let cardId;
check(
  "Card checkout with a 10 MAD tip credits the driver once and generates a receipt",
  () => {
    cardId = request("23,00");
    click(".flow-page > .button.primary");
    click(".passenger-page > .button.primary");
    click(".tip-chips button:nth-child(3)");
    assert.equal(
      js(
        'document.querySelector(".passenger-page > .button.primary").textContent.includes("35,00")',
      ),
      "true",
    );
    click(".passenger-page > .button.primary");
    click(".test-card-fill");
    click("button[type=submit]");
    waitForRoute(".receipt-card");
    assert.equal(currentBalance(), 128200);
    assert.equal(data().transactions.filter((t) => t.id === cardId).length, 1);
    assert.equal(data().transactions[0].tip, 1000);
    assert.equal(
      js('localStorage.getItem("taptaxi.demo.v2").includes("424242")'),
      "false",
    );
    browse("reload");
    assert.equal(currentBalance(), 128200);
  },
);
check("Paid checkout cannot be charged again", () => {
  route("/pay/" + cardId);
  waitForRoute(".receipt-card");
  assert.equal(currentBalance(), 128200);
});
check(
  "Mobile wallet checkout validates the number and credits the selected amount",
  () => {
    const id = request("10,00");
    click(".flow-page > .button.primary");
    click(".passenger-page > .button.primary");
    click(".options .option:nth-child(2)");
    click(".passenger-page > .button.primary");
    fill(".phone-input input", "123");
    click("button[type=submit]");
    assert.equal(js('!!document.querySelector(".field-error")'), "true");
    fill(".phone-input input", "612345678");
    click("button[type=submit]");
    waitForRoute(".receipt-card");
    assert.equal(currentBalance(), 129250);
    assert.equal(data().transactions.find((t) => t.id === id).method, "wallet");
  },
);
check("Cancelled QR blocks passenger checkout", () => {
  const id = request("12");
  click(".button-row .button:first-child");
  route("/pay/" + id);
  assert.equal(js('!!document.querySelector(".expired-intro")'), "true");
  assert.equal(currentBalance(), 129250);
});
check(
  "Withdrawal rejects overspending, confirms details and persists its code",
  () => {
    route("/withdraw");
    fill(".amount-entry input", "9999");
    assert.equal(
      js('document.querySelector(".flow-page > .button.primary").disabled'),
      "true",
    );
    fill(".amount-entry input", "500");
    click(".flow-page > .button.primary");
    assert.equal(
      js(
        'document.querySelector(".page-intro").textContent.includes("Confirmer")',
      ),
      "true",
    );
    click(".flow-page > .button.primary");
    assert.equal(currentBalance(), 79250);
    assert.equal(js('!!document.querySelector(".withdraw-code")'), "true");
    const code = data().withdrawals[0].code;
    browse("reload");
    assert.equal(data().withdrawals[0].code, code);
  },
);
check("History search handles a match and an empty result", () => {
  route("/history");
  fill(".search-input input", cardId);
  assert.equal(js('document.querySelectorAll(".transaction").length'), "1");
  fill(".search-input input", "not-found-xyz");
  assert.equal(js('!!document.querySelector(".empty")'), "true");
});
check("Profile preference and notification read state survive reload", () => {
  route("/profile");
  click(".switch");
  browse("reload");
  assert.equal(
    js('document.querySelector(".switch").getAttribute("aria-checked")'),
    "false",
  );
  route("/notifications");
  click(".header-action button");
  assert.equal(data().readNotifications, true);
});
check(
  "Onboarding validates demo SMS and completes documents and payout choice",
  () => {
    route("/welcome");
    click(".onboarding-page > .button.primary");
    fill("input[type=tel]", "612345678");
    click("button[type=submit]");
    fill(".otp-input", "111111");
    click("button[type=submit]");
    assert.equal(js("location.hash"), "#/sms");
    fill(".otp-input", "123456");
    click("button[type=submit]");
    click(".onboarding-page > .button.secondary");
    click(".onboarding-page > .button.primary");
    click(".options .option:nth-child(2)");
    click(".onboarding-page > .button.primary");
    assert.equal(data().onboarded, true);
    assert.equal(data().documents.length, 4);
    assert.equal(data().payout, "wallet");
  },
);
check("Payment updates the driver screen across browser tabs", () => {
  const before = currentBalance();
  const id = request("15");
  const driver = JSON.parse(
    browse("newtab", base + "#/qr/" + id, "--json"),
  ).tabId;
  const passenger = JSON.parse(
    browse("newtab", base + "#/pay/" + id, "--json"),
  ).tabId;
  click(".passenger-page > .button.primary");
  click(".passenger-page > .button.primary");
  click(".test-card-fill");
  click("button[type=submit]");
  waitForRoute(".receipt-card");
  browse("tab", String(driver));
  waitForRoute(".success-intro");
  assert.equal(js("location.hash"), "#/received/" + id);
  assert.equal(currentBalance(), before + 1550);
  browse("closetab", String(passenger));
});
check("Receipt download creates a real PDF", () => {
  route("/receipt/" + cardId);
  js(
    "URL.createObjectURL = ((original) => function(blob) { window.__taptaxiPdf = blob; return original.call(this,blob); })(URL.createObjectURL)",
  );
  click(".passenger-page > .button.primary");
  assert.equal(
    js(
      "window.__taptaxiPdf instanceof Blob && window.__taptaxiPdf.size > 1000",
    ),
    "true",
  );
  assert.equal(js("window.__taptaxiPdf.slice(0,4).text()"), "%PDF");
});
check(
  "Owner amount dialog keeps input focus and supports keyboard dismissal",
  () => {
    route("/owner");
    click(".taxi-identity .text-link");
    fill(".modal input", "120");
    assert.equal(
      js('document.activeElement === document.querySelector(".modal input")'),
      "true",
    );
    browse("press", "Escape");
    assert.equal(js('!!document.querySelector(".modal")'), "false");
    assert.equal(
      js(
        'document.activeElement === document.querySelector(".taxi-identity .text-link")',
      ),
      "true",
    );
    click(".taxi-identity .text-link");
    fill(".modal input", "120");
    click(".modal > .button");
    assert.equal(data().ownerAmount, 12000);
    const before = currentBalance();
    click(".flow-page > .button.primary");
    click(".modal > .button.primary");
    assert.equal(currentBalance(), before - 12000);
    assert.equal(
      js('document.querySelector(".flow-page > .button.primary").disabled'),
      "true",
    );
  },
);
const routes = [
  "/",
  "/wallet",
  "/history",
  "/statements",
  "/services",
  "/profile",
  "/notifications",
  "/owner",
  "/fuel",
  "/help",
  "/amount",
  "/withdraw",
  "/my-payments",
  "/welcome",
  "/sign-in",
  "/sms",
  "/documents",
  "/payout-setup",
  "/verification",
  "/expired/missing",
  "/receipt/" + cardId,
];
for (const viewport of ["320x740", "390x844", "768x1024", "1280x900"]) {
  check(`All main screens fit ${viewport} without horizontal overflow`, () => {
    browse("viewport", viewport);
    for (const path of routes) {
      route(path);
      const overflow = Number(
        js("document.documentElement.scrollWidth - innerWidth"),
      );
      assert.ok(overflow <= 1, `${path} overflows by ${overflow}px`);
      assert.equal(
        js('document.querySelector("main").textContent.trim().length > 20'),
        "true",
      );
    }
  });
}
check("No application console errors during tested flows", () => {
  const errors = browse("console", "--errors");
  assert.ok(!errors.includes("[error]"), errors);
});
mkdirSync("docs/qa", { recursive: true });
writeFileSync(
  "docs/qa/browser-check.json",
  JSON.stringify(
    { testedAt: new Date().toISOString(), url: base, checks: report },
    null,
    2,
  ) + "\n",
);
// Restore an untouched design demo for the handoff.
js('localStorage.removeItem("taptaxi.demo.v2")');
route("/");
browse("reload");
browse("viewport", "390x844");
browse("screenshot", "--viewport", "/tmp/taptaxi-final-mobile.png");
browse("viewport", "1440x1000");
browse("screenshot", "--viewport", "/tmp/taptaxi-final-desktop.png");
console.log(`\n${report.length} browser checks passed.`);
