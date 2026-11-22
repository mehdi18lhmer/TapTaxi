// Hand-built SVG charts (no chart library). Specs: columns ≤ 24px with 4px rounded tops,
// 2px gaps, hairline grid, hover/focus tooltip on every mark, and a table view.
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export const SERIES = { card: "#D91E24", wallet: "#3B6EA8" } as const;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round axis maximum and evenly spaced ticks: 0, 500, 1 000… */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10]
    .map((m) => m * magnitude)
    .find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

export interface ColumnDatum {
  key: string;
  label: string;
  /** Short label for the x axis; omit to skip that tick. */
  tick?: string;
  value: number;
  detail?: string;
}

/** Single-series column chart. The card title names the series, so there is no legend. */
export function ColumnChart({
  data,
  formatValue,
  formatAxis,
  height = 220,
  ariaLabel,
  tableHeaders,
}: {
  data: ColumnDatum[];
  formatValue: (n: number) => string;
  formatAxis: (n: number) => string;
  height?: number;
  ariaLabel: string;
  tableHeaders: [string, string];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0));
  const top = ticks[ticks.length - 1];
  const axisWidth = 64;
  const plot = { left: axisWidth, right: 8, top: 10, bottom: 26 };
  const innerW = Math.max(0, width - plot.left - plot.right);
  const innerH = height - plot.top - plot.bottom;
  const slot = data.length ? innerW / data.length : 0;
  const barW = Math.max(1, Math.min(24, slot - 2));
  const y = (v: number) => plot.top + innerH - (v / top) * innerH;
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="chart">
      <div
        ref={ref}
        className="chart-plot"
        style={{ height }}
        onPointerLeave={() => setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel}>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={plot.left}
                  x2={width - plot.right}
                  y1={y(t)}
                  y2={y(t)}
                  className="grid"
                />
                <text
                  x={plot.left - 8}
                  y={y(t)}
                  className="axis"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {formatAxis(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = plot.left + i * slot + (slot - barW) / 2;
              const h = Math.max(0, y(0) - y(d.value));
              const r = Math.min(4, barW / 2, h);
              return (
                <g key={d.key}>
                  {d.value > 0 && (
                    <path
                      className={`bar ${hover === i ? "hover" : ""}`}
                      fill={SERIES.card}
                      d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barW - r} Q${x + barW},${y(0) - h} ${x + barW},${y(0) - h + r} V${y(0)} Z`}
                    />
                  )}
                  {/* Hit target spans the whole slot and plot height, bigger than the mark. */}
                  <rect
                    x={plot.left + i * slot}
                    y={plot.top}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.label} : ${formatValue(d.value)}`}
                    onPointerMove={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                  {d.tick && (
                    <text
                      x={plot.left + i * slot + slot / 2}
                      y={height - 8}
                      className="axis"
                      textAnchor="middle"
                    >
                      {d.tick}
                    </text>
                  )}
                </g>
              );
            })}
            <line
              x1={plot.left}
              x2={width - plot.right}
              y1={y(0)}
              y2={y(0)}
              className="baseline"
            />
          </svg>
        )}
        {active && hover !== null && (
          <div
            className="tooltip"
            style={{
              left: Math.min(
                Math.max(plot.left + hover * slot + slot / 2, 90),
                width - 90,
              ),
              top: Math.max(0, y(active.value) - 12),
            }}
          >
            <strong>{formatValue(active.value)}</strong>
            <span>{active.label}</span>
            {active.detail && <span>{active.detail}</span>}
          </div>
        )}
      </div>
      <button
        type="button"
        className="link-button"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
      >
        {showTable ? "Masquer le tableau" : "Voir les données en tableau"}
      </button>
      {showTable && (
        <div className="table-scroll small">
          <table>
            <thead>
              <tr>
                <th>{tableHeaders[0]}</th>
                <th className="num">{tableHeaders[1]}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="num">{formatValue(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** One whole split into parts (e.g. card vs wallet), with a legend and direct labels. */
export function SplitBar({
  parts,
  ariaLabel,
}: {
  parts: { label: string; value: number; color: string; detail: ReactNode }[];
  ariaLabel: string;
}) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="split">
      <div className="split-bar" role="img" aria-label={ariaLabel}>
        {parts.map((p, i) =>
          p.value > 0 ? (
            <div
              key={p.label}
              className={`split-segment ${hover === i ? "hover" : ""}`}
              style={{ flexGrow: p.value, background: p.color }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              title={`${p.label} : ${Math.round((p.value / total) * 100)} %`}
            />
          ) : null,
        )}
      </div>
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.label}>
            <span
              className="swatch"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="legend-label">{p.label}</span>
            <strong>{total ? Math.round((p.value / total) * 100) : 0} %</strong>
            <span className="legend-detail">{p.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars for a ranked list (top drivers, ticket categories). */
export function RankBars({
  rows,
  formatValue,
}: {
  rows: { key: string; label: ReactNode; value: number; sub?: ReactNode }[];
  formatValue: (n: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="rank">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="rank-text">
            <span className="rank-label">{r.label}</span>
            <strong>{formatValue(r.value)}</strong>
          </div>
          <div className="rank-track" aria-hidden>
            <div
              className="rank-fill"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          {r.sub && <span className="rank-sub">{r.sub}</span>}
        </li>
      ))}
    </ol>
  );
}
