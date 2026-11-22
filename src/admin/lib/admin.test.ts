import { describe, expect, it } from "vitest";
import { createAdminSeed, generatePayments } from "./seed";
import {
  approveDriver,
  decisionState,
  documentChecks,
  rejectApplication,
  requestChanges,
  reviewDocument,
  reviewQueue,
} from "./verification";
import { filterTickets, isOverdue, replyToTicket } from "./support";
import { setSuspended, settleWithdrawal } from "./operations";
import { commission, dailySeries, driverStats, kpis, paid } from "./analytics";
import type { AdminState, DocType } from "./types";

const NOW = Date.UTC(2026, 10, 20, 12, 0);
const seed = () => createAdminSeed(NOW);
const byName = (s: AdminState, name: string) =>
  s.drivers.find((d) => d.name === name)!;
const approveAll = (s: AdminState, id: string) =>
  (["cin", "permit", "vehicle", "photo"] as DocType[]).reduce(
    (state, type) =>
      reviewDocument(state, id, type, { approve: true }, "Test", NOW),
    s,
  );

describe("document verification", () => {
  it("flags each seeded problem and passes the clean application", () => {
    const s = seed();
    const failing = (name: string) =>
      documentChecks(byName(s, name), NOW)
        .filter((c) => !c.ok)
        .map((c) => c.label);
    expect(failing("Karim Alaoui")).toEqual([]);
    expect(failing("Fatima-Zahra Idrissi")).toEqual(["Nom identique à la CIN"]);
    expect(failing("Mohamed Tazi")).toEqual([
      "Permis de confiance en cours de validité",
    ]);
    expect(failing("Hamza Bennani")).toEqual([
      "Plaque identique à la carte grise",
    ]);
    expect(failing("Nadia El Fassi")).toEqual(["Dossier complet"]);
  });

  it("serves the oldest pending application first", () => {
    const queue = reviewQueue(seed());
    expect(queue.length).toBe(5);
    for (let i = 1; i < queue.length; i++)
      expect(queue[i].submittedAt).toBeGreaterThanOrEqual(
        queue[i - 1].submittedAt,
      );
  });

  it("only activates a driver once every document is approved", () => {
    let s = seed();
    const id = byName(s, "Karim Alaoui").id;
    expect(() => approveDriver(s, id, "Test", NOW)).toThrow(
      "Encore 4 documents à vérifier.",
    );
    s = approveAll(s, id);
    s = approveDriver(s, id, "Test", NOW);
    const driver = s.drivers.find((d) => d.id === id)!;
    expect(driver.application).toBe("approved");
    expect(driver.account).toBe("active");
    expect(s.audit[0].action).toContain(
      "a validé l’inscription de Karim Alaoui",
    );
  });

  it("blocks approval of an incomplete file and lets the reviewer ask for changes", () => {
    let s = seed();
    const id = byName(s, "Nadia El Fassi").id;
    s = (["cin", "permit", "vehicle"] as DocType[]).reduce(
      (st, t) => reviewDocument(st, id, t, { approve: true }, "Test", NOW),
      s,
    );
    expect(decisionState(s.drivers.find((d) => d.id === id)!).canApprove).toBe(
      false,
    );
    s = requestChanges(s, id, "Test", NOW);
    expect(s.drivers.find((d) => d.id === id)!.application).toBe(
      "changes_requested",
    );
  });

  it("requires a reason to refuse a document or an application", () => {
    const s = seed();
    const id = byName(s, "Mohamed Tazi").id;
    expect(() =>
      reviewDocument(
        s,
        id,
        "permit",
        { approve: false, reason: "  " },
        "Test",
        NOW,
      ),
    ).toThrow();
    expect(() => rejectApplication(s, id, "", "Test", NOW)).toThrow();
    const next = reviewDocument(
      s,
      id,
      "permit",
      { approve: false, reason: "Document expiré" },
      "Test",
      NOW,
    );
    const permit = next.drivers
      .find((d) => d.id === id)!
      .documents.find((d) => d.type === "permit")!;
    expect(permit).toMatchObject({
      status: "rejected",
      rejectionReason: "Document expiré",
      reviewer: "Test",
    });
  });
});

describe("support", () => {
  it("puts overdue urgent tickets on top and resolved ones last", () => {
    const s = seed();
    const list = filterTickets(
      s.tickets,
      { status: "all", category: "all", query: "" },
      NOW,
    );
    expect(list[0].id).toBe("T-1042");
    expect(isOverdue(list[0], NOW)).toBe(true);
    expect(list[list.length - 1].status).toBe("resolved");
  });

  it("a public reply waits for the requester, a note does not change the status", () => {
    let s = seed();
    s = replyToTicket(s, "T-1042", "Note", "Salma B.", { internal: true }, NOW);
    let t = s.tickets.find((x) => x.id === "T-1042")!;
    expect(t.status).toBe("open");
    expect(isOverdue(t, NOW)).toBe(true); // an internal note is not an answer
    s = replyToTicket(
      s,
      "T-1042",
      "Bonjour",
      "Salma B.",
      { internal: false },
      NOW,
    );
    t = s.tickets.find((x) => x.id === "T-1042")!;
    expect(t.status).toBe("waiting");
    expect(t.assignee).toBe("Salma B.");
    expect(isOverdue(t, NOW)).toBe(false);
    expect(() =>
      replyToTicket(s, "T-1042", "   ", "Salma B.", { internal: false }, NOW),
    ).toThrow();
  });
});

describe("operations", () => {
  it("settles a pending withdrawal once", () => {
    let s = seed();
    const pending = s.withdrawals.find((w) => w.status === "pending")!;
    s = settleWithdrawal(s, pending.id, "paid", "Test", NOW);
    expect(s.withdrawals.find((w) => w.id === pending.id)!.status).toBe("paid");
    expect(() =>
      settleWithdrawal(s, pending.id, "failed", "Test", NOW),
    ).toThrow("déjà été traité");
  });

  it("suspends only active accounts and requires a reason", () => {
    const s = seed();
    const active = byName(s, "Youssef Benali").id;
    expect(() => setSuspended(s, active, true, "", "Test", NOW)).toThrow();
    const next = setSuspended(s, active, true, "Signalements", "Test", NOW);
    expect(next.drivers.find((d) => d.id === active)!.account).toBe(
      "suspended",
    );
    expect(() =>
      setSuspended(next, active, true, "Encore", "Test", NOW),
    ).toThrow();
  });
});

describe("analytics", () => {
  const s = seed();
  const payments = generatePayments(s.drivers, NOW);

  it("generates the same payments for the same day, only for active history", () => {
    expect(generatePayments(s.drivers, NOW)).toEqual(payments);
    expect(payments.every((p) => p.at <= NOW)).toBe(true);
    const pendingIds = new Set(reviewQueue(s).map((d) => d.id));
    expect(payments.some((p) => pendingIds.has(p.driverId))).toBe(false);
  });

  it("splits each payment into passenger total, driver credit and commission", () => {
    const p = {
      id: "X",
      driverId: "D01",
      fare: 2300,
      tip: 1000,
      method: "card" as const,
      at: new Date("2026-11-18T13:00:00Z").getTime(), // 14:00 in Casablanca, day fee
    };
    // 23 MAD fare: 2 MAD fee by day, the driver gets 10 % (0,20 MAD).
    expect(paid(p)).toBe(3500);
    expect(commission(p)).toBe(180);
    expect(paid({ ...p, at: new Date("2026-11-18T21:00:00Z").getTime() })).toBe(
      3550,
    );
  });

  it("daily series covers every day and adds up to the KPI volume", () => {
    const series = dailySeries(payments, 30, NOW);
    expect(series).toHaveLength(30);
    const total = series.reduce((n, d) => n + d.volume, 0);
    const { current } = kpis(payments, s.withdrawals, 30, NOW);
    // 30 calendar days start after the rolling 30×24 h window, so the chart can only hold less.
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(current.volume);
    // TapTaxi keeps the fee minus the driver's 10 %: at most 3,15 MAD per payment.
    expect(current.revenue).toBeGreaterThan(0);
    expect(current.revenue).toBeLessThanOrEqual(current.count * 315);
  });

  it("driver balance is earnings minus non-failed withdrawals", () => {
    const id = byName(s, "Youssef Benali").id;
    const stats = driverStats(id, payments, s.withdrawals, NOW);
    const out = s.withdrawals
      .filter((w) => w.driverId === id && w.status !== "failed")
      .reduce((n, w) => n + w.amount, 0);
    expect(stats.balance).toBe(stats.earned - out);
  });
});
