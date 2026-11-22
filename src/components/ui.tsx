import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ShieldCheck,
  X,
  CarFront,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { go } from "../lib/store";
/** Official TapTaxi wordmark. `light` is for dark backgrounds (white "Tap"). */
export function Logo({
  small = false,
  light = false,
}: {
  small?: boolean;
  light?: boolean;
}) {
  return (
    <a className={`logo ${small ? "small" : ""}`} href="#/">
      <img
        src={light ? "/logo/wordmark-light.png" : "/logo/wordmark.png"}
        alt="TapTaxi accueil"
        width={900}
        height={262}
      />
    </a>
  );
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "dark";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function PageHeader({
  title,
  back = "/",
  action,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <IconButton label="Retour" onClick={() => go(back)}>
        <ArrowLeft size={21} />
      </IconButton>
      <h1>{title}</h1>
      <div className="header-action">{action}</div>
    </header>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Row({
  label,
  value,
  strong = false,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={`detail-row ${strong ? "strong" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
export function SectionHeading({
  children,
  action,
  onAction,
}: {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {action && (
        <button className="text-link" onClick={onAction}>
          {action}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
export function Avatar({ owner = false }: { owner?: boolean }) {
  return (
    <span className={`avatar ${owner ? "owner" : ""}`}>
      {owner ? "HM" : "YB"}
    </span>
  );
}
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "red" | "neutral";
}) {
  return (
    <span className={`badge ${tone}`}>
      {tone === "green" && <Check size={12} />} {children}
    </span>
  );
}
export function Info({ children }: { children: ReactNode }) {
  return (
    <div className="info">
      <ShieldCheck size={18} />
      <span>{children}</span>
    </div>
  );
}
export function Option({
  icon,
  title,
  description,
  selected,
  onClick,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      className={`option ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="option-icon">{icon}</span>
      <span className="option-copy">
        <strong>{title}</strong>
        <small>{description}</small>
        {badge && <span className="option-badge">{badge}</span>}
      </span>
      <span className="radio">{selected && <span />}</span>
    </button>
  );
}
export function MenuRow({
  icon,
  title,
  sub,
  value,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  value?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="menu-row" onClick={onClick}>
      <span className="row-icon">{icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </span>
      {value && <span className="menu-value">{value}</span>}
      <ChevronRight size={17} />
    </button>
  );
}
export function TaxiIdentity() {
  return (
    <div className="taxi-identity">
      <Avatar />
      <div className="grow">
        <strong>Youssef B.</strong>
        <small>Petit taxi n° 1287 · Casablanca</small>
      </div>
      <ShieldCheck size={21} className="green-text" />
    </div>
  );
}
export function Plate() {
  return (
    <div className="plate" aria-label="Plaque du taxi 48213 ب 6">
      <span>48213</span>
      <span lang="ar">ب</span>
      <span>6</span>
    </div>
  );
}
export function SuccessMark() {
  return (
    <div className="success-mark">
      <Check size={40} strokeWidth={2.6} />
      <span className="spark one" />
      <span className="spark two" />
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <CarFront size={36} />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,a[href],select,textarea",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="section-heading">
          <h2>{title}</h2>
          <IconButton label="Fermer" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
