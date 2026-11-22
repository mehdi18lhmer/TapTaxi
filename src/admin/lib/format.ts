// Display formatting shared by admin pages. Money formatting comes from the driver app model.
import { dateLabel, money } from "../../lib/model";

export { money };

/** "1 234,50 MAD" */
export const mad = (cents: number) => `${money(cents)} MAD`;

/** Compact money for tiles and axes: "12,4 k MAD". */
export function madCompact(cents: number) {
  const value = cents / 100;
  if (Math.abs(value) < 10_000)
    return `${Math.round(value)
      .toLocaleString("fr-FR")
      .replace(/[\u202f\u00a0]/g, " ")} MAD`;
  return `${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k MAD`;
}

export const dateTime = (at: number) =>
  dateLabel(at, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fullDate = (at: number) =>
  dateLabel(at, { day: "numeric", month: "long", year: "numeric" });

/** "il y a 5 min", "il y a 3 h", "il y a 2 j" */
export function ago(at: number, now: number) {
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

/** "45 min", "3 h 20", "2 j" */
export function duration(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return minutes % 60
      ? `${hours} h ${String(minutes % 60).padStart(2, "0")}`
      : `${hours} h`;
  return `${Math.round(hours / 24)} j`;
}

/** "+12 %" / "−4 %" */
export function percentChange(ratio: number) {
  const pct = Math.round(ratio * 100);
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)} %`;
}

export const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
