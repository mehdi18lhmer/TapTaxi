import type { Transaction } from "./model";
import {
  dateLabel,
  money,
  methodLabel,
  passengerFeeOf,
  passengerPaid,
} from "./model";
export async function buildPdf(
  title: string,
  items: Transaction[],
  receipt = false,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFillColor(217, 30, 36);
  doc.roundedRect(18, 18, 12, 12, 4, 4, "F");
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.text("T", 22, 27);
  doc.setTextColor(18);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("TapTaxi", 35, 27);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("DEMONSTRATION - AUCUNE VALEUR COMPTABLE", 18, 42);
  doc.setTextColor(18);
  doc.setFontSize(20);
  doc.text(title, 18, 58);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Youssef Benali | Petit taxi n° 1287 | Casablanca", 18, 69);
  let y = 88;
  for (const t of items) {
    if (y + (receipt ? 59 : 23) > 272) {
      doc.addPage();
      y = 24;
    }
    doc.setDrawColor(230);
    doc.line(18, y - 5, 192, y - 5);
    doc.setTextColor(18);
    doc.text(
      `${t.kind === "payment" ? "Paiement" : t.label} #${t.id}`,
      18,
      y + 2,
    );
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `${dateLabel(t.at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} | ${methodLabel(t.method)}`,
      18,
      y + 9,
    );
    doc.setTextColor(18);
    doc.setFontSize(11);
    doc.text(
      `${money(receipt ? passengerPaid(t) : t.credit)} MAD`,
      192,
      y + 3,
      { align: "right" },
    );
    y += 23;
    if (receipt) {
      for (const [label, value] of [
        ["Compteur", t.fare],
        ["Pourboire", t.tip],
        ["Frais TapTaxi", passengerFeeOf(t)],
      ] as const) {
        doc.text(label, 18, y);
        doc.text(`${money(value)} MAD`, 192, y, { align: "right" });
        y += 12;
      }
    }
  }
  if (y + 20 > 272) {
    doc.addPage();
    y = 28;
  }
  doc.setFont("helvetica", "bold");
  doc.text(receipt ? "TOTAL PAYE" : "TOTAL", 18, y + 8);
  doc.text(
    `${money(items.reduce((sum, t) => sum + (receipt ? passengerPaid(t) : t.credit), 0))} MAD`,
    192,
    y + 8,
    { align: "right" },
  );
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text("TapTaxi - Document de demonstration", 18, 280);
    doc.text(`${page} / ${pageCount}`, 192, 280, { align: "right" });
  }
  return doc;
}
export async function exportPdf(
  title: string,
  items: Transaction[],
  receipt = false,
) {
  const doc = await buildPdf(title, items, receipt);
  doc.save(
    `TapTaxi-${receipt ? "recu" : "releve"}-${items[0]?.id || "demo"}.pdf`,
  );
}
