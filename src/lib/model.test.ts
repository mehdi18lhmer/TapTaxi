import { describe, expect, it } from "vitest";
import {
  createSeed,
  parseMoney,
  paymentBreakdown,
  createRequest,
  completePayment,
  cancelRequest,
  withdraw,
  balance,
  restoreState,
  money,
  serviceFee,
  isNight,
} from "./model";
const now = new Date("2026-11-18T13:00:00Z").getTime();
describe("amounts and fee disclosure", () => {
  it("formats MAD with French spacing and centimes", () =>
    expect(money(124850)).toBe("1 248,50"));
  it("accepts French decimal input without rounding away centimes", () => {
    expect(parseMoney("23,50")).toBe(2350);
    expect(parseMoney("1 248,50")).toBe(124850);
    expect(parseMoney("0.10")).toBe(10);
  });
  it("rejects negative, excessive, malformed and fractional-centime amounts", () => {
    for (const input of ["-1", "NaN", "2,999", "1.2.3", "100001", ""])
      expect(parseMoney(input)).toBeNull();
  });
  it("discloses passenger fees and gives the entire tip to the driver", () => {
    expect(paymentBreakdown(2300, 1000, now)).toEqual({
      fare: 2300,
      tip: 1000,
      fee: 200,
      driverFee: 20,
      night: false,
      total: 3500,
      credit: 3320,
    });
  });
  it("charges 0 to 3 MAD by day by meter fare, +0,50 MAD at night", () => {
    const night = new Date("2026-11-18T22:30:00Z").getTime();
    const cases: [number, number, number][] = [
      [950, 0, 50],
      [1000, 100, 150],
      [1499, 100, 150],
      [1500, 150, 200],
      [2000, 200, 250],
      [3000, 250, 300],
      [3999, 250, 300],
      [4000, 300, 350],
      [12000, 300, 350],
    ];
    for (const [fare, day, nightFee] of cases) {
      expect(serviceFee(fare, now)).toBe(day);
      expect(serviceFee(fare, night)).toBe(nightFee);
    }
    expect(paymentBreakdown(4500, 0, now).driverFee).toBe(30);
    expect(paymentBreakdown(800, 0, now).driverFee).toBe(0);
  });
  it("treats 20:00–06:00 Casablanca time as night", () => {
    expect(isNight(new Date("2026-11-18T18:30:00Z").getTime())).toBe(false);
    expect(isNight(new Date("2026-11-18T19:00:00Z").getTime())).toBe(true);
    expect(isNight(new Date("2026-11-18T04:59:00Z").getTime())).toBe(true);
    expect(isNight(new Date("2026-11-18T05:00:00Z").getTime())).toBe(false);
  });
});
describe("local payment ledger", () => {
  it("starts with the design wallet balance", () =>
    expect(balance(createSeed(now))).toBe(124850));
  it("credits one payment once even if confirmation is retried", () => {
    let s = createRequest(createSeed(now), 2300, "test", now);
    s = completePayment(s, "test", 1000, "card", now + 1000);
    expect(balance(s)).toBe(128170);
    expect(completePayment(s, "test", 1000, "card", now + 2000)).toEqual(s);
    expect(s.transactions[0].credit).toBe(3320);
  });
  it("rejects expired and cancelled checkout requests", () => {
    const s = createRequest(createSeed(now), 2300, "test", now);
    expect(() => completePayment(s, "test", 0, "card", now + 300001)).toThrow();
    expect(() =>
      completePayment(cancelRequest(s, "test"), "test", 0, "card", now + 1),
    ).toThrow();
  });
  it("rejects invalid tips and fare without changing balance", () => {
    expect(() => createRequest(createSeed(now), 0, "test", now)).toThrow();
    const s = createRequest(createSeed(now), 2300, "test", now);
    for (const tip of [-1, NaN, 0.1, 100001])
      expect(() => completePayment(s, "test", tip, "card", now + 1)).toThrow();
    expect(balance(s)).toBe(124850);
  });
  it("debits withdrawals and prevents overspending and duplicate submissions", () => {
    const s = withdraw(createSeed(now), 50000, "agency", "wd1", now);
    expect(balance(s)).toBe(74850);
    expect(withdraw(s, 50000, "agency", "wd1", now)).toEqual(s);
    for (const value of [0, -1, 74851, NaN, 1.5])
      expect(() => withdraw(s, value, "agency", "wd2", now)).toThrow();
  });
  it("recovers from corrupt or incompatible persisted state", () => {
    expect(restoreState("{broken", now)).toEqual(createSeed(now));
    expect(restoreState('{"version":1,"transactions":[]}', now)).toEqual(
      createSeed(now),
    );
    const s = createSeed(now);
    expect(restoreState(JSON.stringify(s), now)).toEqual(s);
  });
});
