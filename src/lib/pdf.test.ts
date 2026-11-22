import { expect, it } from "vitest";
import { buildPdf } from "./pdf";
import { createSeed } from "./model";
it("keeps every receipt block and the total within printable page bounds", async () => {
  const items = createSeed()
    .transactions.filter((t) => t.kind === "payment")
    .slice(0, 8);
  const doc = await buildPdf("Mes paiements", items, true);
  expect(doc.getNumberOfPages()).toBe(3);
  const output = doc.output();
  const yCoordinates = [
    ...output.matchAll(/-?\d+(?:\.\d+)? (-?\d+(?:\.\d+)?) Td/g),
  ].map((m) => Number(m[1]));
  expect(yCoordinates.length).toBeGreaterThan(20);
  expect(Math.min(...yCoordinates)).toBeGreaterThan(40);
});
it("exports an empty statement without non-finite amounts", async () => {
  const doc = await buildPdf("Releve", []);
  expect(doc.getNumberOfPages()).toBe(1);
  expect(doc.output()).toContain("0,00 MAD");
  expect(doc.output()).not.toContain("NaN");
});
