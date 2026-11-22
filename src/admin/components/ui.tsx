// Small building blocks shared by every admin page.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Search,
  XCircle,
} from "lucide-react";
import { initials } from "../lib/format";

export type Tone = "good" | "warning" | "critical" | "neutral" | "info";

const toneIcon: Record<Tone, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: Clock3,
  critical: XCircle,
  neutral: CircleDashed,
  info: AlertTriangle,
};

/** Status is never color alone: every badge carries an icon and a label. */
export function StatusBadge({
  tone,
  children,
  icon = true,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: boolean;
}) {
  const Icon = toneIcon[tone];
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <Icon size={13} aria-hidden />}
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "secondary",
  icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "good";
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`btn btn-${variant} ${props.className ?? ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search">
      <Search size={16} aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Single-choice pill group, used for filters and period pickers. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/**
 * Modal asking for a reason (refusal, suspension…). Uses the native <dialog>
 * so focus trapping and Escape work without extra code.
 */
export function ReasonDialog({
  open,
  title,
  description,
  suggestions = [],
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  suggestions?: string[];
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setReason("");
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) onConfirm(reason.trim());
        }}
      >
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {suggestions.length > 0 && (
          <div className="chips">
            {suggestions.map((s) => (
              <button
                type="button"
                key={s}
                className={reason === s ? "chip active" : "chip"}
                onClick={() => setReason(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <label className="textarea-label">
          Raison
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Cette raison sera visible dans le journal"
            required
          />
        </label>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" type="submit" disabled={!reason.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export function Toasts({
  toasts,
}: {
  toasts: { id: number; message: string; tone: string }[];
}) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.tone === "error" ? (
            <XCircle size={16} aria-hidden />
          ) : (
            <CheckCircle2 size={16} aria-hidden />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
