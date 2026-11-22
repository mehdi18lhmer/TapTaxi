import { ArrowDownLeft, ArrowUpRight, CarFront, Gift } from "lucide-react";
import { dateLabel, methodLabel, money, timeLabel } from "../lib/model";
import type { Transaction } from "../lib/model";
import { go } from "../lib/store";
export function Transactions({
  items,
  showDate = false,
}: {
  items: Transaction[];
  showDate?: boolean;
}) {
  return (
    <div className="transactions">
      {items.map((t) => (
        <button
          key={t.id}
          className="transaction"
          onClick={() =>
            go(
              t.kind === "payment"
                ? `/transaction/${t.id}`
                : t.kind === "withdrawal"
                  ? `/withdrawal/${t.id}`
                  : "/owner",
            )
          }
        >
          <span
            className={`transaction-icon ${t.credit < 0 ? "outgoing" : ""}`}
          >
            {t.kind === "payment" ? (
              t.tip > 0 ? (
                <Gift size={20} />
              ) : (
                <CarFront size={20} />
              )
            ) : t.credit < 0 ? (
              <ArrowUpRight size={20} />
            ) : (
              <ArrowDownLeft size={20} />
            )}
          </span>
          <span className="grow">
            <strong>
              {t.label}
              {t.kind === "payment" ? ` #${t.id}` : ""}
            </strong>
            <small>
              {showDate ? `${dateLabel(t.at)} · ` : ""}
              {timeLabel(t.at)} · {methodLabel(t.method)}
            </small>
          </span>
          <span
            className={`transaction-amount ${t.credit >= 0 ? "positive" : ""}`}
          >
            {t.credit >= 0 ? "+" : "−"}
            {money(Math.abs(t.credit))}
            {t.tip > 0 && <small>dont {money(t.tip)} de pourboire</small>}
          </span>
        </button>
      ))}
    </div>
  );
}
