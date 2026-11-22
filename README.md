# TapTaxi

A responsive, interactive implementation of the 30 screens in `TapTaxi MVP screens.html`. The original design file is preserved. The app follows its red, charcoal and cream palette, rounded components, French interface and Arabic supporting labels. Fonts are bundled locally, with their licenses in `public/fonts/LICENSE.txt`.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open **http://localhost:5173/**. The server listens on the local network as well, so you can open the printed network address on your phone when both devices are on the same network. For a production build:

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. Hash routes work without server rewrite rules. No environment variables or credentials are needed for the demo.

## Try the app

1. From **Accueil**, choose **Encaisser** and enter a fare, for example **23,00 MAD**. You can use the keypad or your keyboard.
2. Choose **Afficher le QR**, then **Tester le parcours passager**. The QR encodes the corresponding checkout URL. This local demo shares sessions only between tabs in the same browser and origin; scanning it on a different device does not share the payment ledger.
3. Verify the taxi, optionally add a tip, and select card or wallet.
4. For card checkout, choose **Utiliser la carte de test**: `4242 4242 4242 4242`, expiry `12/29`, CVV `123`. For wallet checkout, use the fictitious number `612345678`.
5. Finish checkout, download the receipt, and return to the driver confirmation. A 23 MAD fare with a 10 MAD tip charges a simulated 35 MAD and credits the driver **33,20 MAD** (fare + tip + the 10 % bonus on the 2 MAD service fee; by day).
6. Explore the wallet, withdrawals, statements, owner payments and services. Withdrawal confirmation updates the demo balance and creates a persistent fictitious withdrawal code.
7. Open **Découvrir l’inscription** on desktop, or visit `/#/welcome`, to test onboarding. The demo SMS code is **123456**. Use **Utiliser les documents de démonstration** to complete document selection without real identity documents.

## Implemented flows

| Area       | Features                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Driver     | Home earnings, daily goal, recent payments, amount keypad, QR generation and expiry, passenger connection and payment confirmation                                              |
| Wallet     | Consistent ledger and balance, validated withdrawals, confirmation, agency code, bank/wallet demo payouts, owner payment preferences and one daily simulated transfer           |
| Insights   | Searchable history and period filters, monthly statements, charts and paginated PDF export                                                                                      |
| Account    | Notifications and read state, profile, withdrawal preferences, saved sound preference, FAQ and logout to welcome                                                                |
| Services   | Simulated fuel advance, explicit upcoming partner offers, statements                                                                                                            |
| Passenger  | Taxi verification, fee disclosure, tips, validated test card and wallet checkout, cancellable processing, payment receipt PDF, payment history, expired/cancelled code handling |
| Onboarding | Splash, welcome, phone input, demo SMS code, local document selection, payout method and verification summary                                                                   |

Includes phone and desktop layouts, keyboard navigation, accessible labels, modal focus management, reduced motion support, and feedback messages. Sound is a saved preference; browser audio notifications are not implemented. Full Arabic and English translations are not implemented; the interface preserves the French and Arabic copy present in the design.

## Admin back office

Open **http://localhost:5173/admin.html** while `npm run dev` is running (it is also built to `dist/admin.html`). It is a separate page for the admin team, in French, with fictional demo data:

| Section            | What the team can do                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vue d’ensemble** | To-do counts (files to check, late tickets, withdrawals to pay), volume, TapTaxi commission, payments, average basket, active drivers and tips over 7/30/90 days, daily volume chart, card vs wallet, top drivers, team log      |
| **Vérifications**  | Review queue (oldest first), automatic checks (complete file, name matches ID, plate matches registration, expiry dates), approve or refuse each document with a reason, then activate, request corrections or refuse the driver |
| **Support**        | Tickets sorted by lateness and priority, reply-time targets, quick replies, internal notes, assignment, priority and status                                                                                                      |
| **Chauffeurs**     | Directory with 30-day activity and balance, driver profile with payments, withdrawals, tickets and notes, suspend and reactivate with a reason                                                                                   |
| **Transactions**   | Searchable payments with commission, withdrawals to mark as paid or failed                                                                                                                                                       |

Every decision is written to the team log with the agent's name (pick the agent at the bottom of the sidebar). **Réinitialiser la démo** restores the sample data. The demo is not protected and checks nothing for real: a production back office needs authentication with roles, a server holding the documents, and audit logs stored server-side. Code lives in `src/admin/` (`lib/` holds the rules and their tests in `lib/admin.test.ts`, `pages/` one file per section).

## Demo boundaries

**This is a local application demo, not a live financial service.** No real payment, withdrawal, SMS, bank statement verification, identity check, financing agreement or automatic 23:00 owner transfer takes place. Authentication is a simulated onboarding flow, not a security boundary. Financial records are fictitious and editable in browser storage.

The versioned `taptaxi.demo.v2` localStorage entry holds the fictitious ledger, requests, withdrawal codes and preferences. Card details and selected document contents are never persisted or sent. Corrupt or incompatible stored state falls back to the sample data. Storage events synchronize payment status between tabs. A production financial ledger requires server transactions, access controls and provider reconciliation; localStorage is not a substitute.

To reset the demo, remove only this key in the browser console and reload:

```js
localStorage.removeItem("taptaxi.demo.v2");
location.reload();
```

Before live use, connect server-side SMS authentication, driver verification, a licensed payment processor with hosted card entry, authenticated payment sessions, signed idempotent payment webhooks, a database ledger, withdrawal providers and a scheduled owner-payment service. Configure partner terms, fees and consent flows before activating financial offers. The app currently makes no payment API calls.

## Code structure

- `src/lib/model.ts`: typed ledger, integer-centime calculations, fee disclosure, payment lifecycle, withdrawals, sample data and state restoration.
- `src/lib/store.tsx`: persistent React context, cross-tab synchronization, toast feedback and hash navigation.
- `src/lib/pdf.ts`: lazily loaded PDF generation with pagination and demo watermarks.
- `src/components/`: reusable controls, accessible dialogs and transaction lists.
- `src/screens/`: driver, passenger and onboarding features.
- `src/App.tsx`: routing and responsive application shells.
- `src/styles.css`: design tokens, layouts, component styles and breakpoints.
- `scripts/check-browser.mjs`: reproducible end-to-end checks using gstack browse.

## Verification

```sh
npm test
npm run build
npm run format:check
npm audit
```

With the development server running and gstack browse installed:

```sh
npm run test:browser
```

Set `GSTACK_BROWSE` to your browse executable if it is outside the usual skill locations. `TAPTAXI_URL` can override the default app URL. Browser checks reset only the demo's storage key in the automated test browser, test both checkout methods, cross-tab updates, withdrawals, owner payments, onboarding, PDF downloads and responsive layouts, then restore the original sample home screen. Results are written to `docs/qa/browser-check.json`.
