import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-700 active:bg-primary-800 shadow-[0_6px_16px_-8px_rgba(20,32,180,0.6)]",
  secondary: "bg-primary-soft text-primary-700 hover:bg-primary-100",
  outline: "border border-border bg-surface text-ink-900 hover:bg-surface-100",
  ghost: "text-ink-700 hover:bg-surface-100",
  danger: "bg-danger text-white hover:brightness-95",
};
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-5 text-base" };

export function Button({
  variant = "primary", size = "md", className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href, variant = "primary", size = "md", className, children,
}: { href: string; variant?: Variant; size?: keyof typeof sizes; className?: string; children: ReactNode }) {
  return (
    <Link href={href as never} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition", variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-surface border border-border shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          {title && <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, back, actions }: { title: ReactNode; subtitle?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5 animate-rise">
      <div className="min-w-0">
        {back && (
          <Link href={back as never} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 mb-1">← Voltar</Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

const badgeTones = {
  green: "bg-success-soft text-success",
  gray: "bg-surface-100 text-ink-700",
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  blue: "bg-primary-soft text-primary-700",
};
export function Badge({ children, tone = "gray", className }: { children: ReactNode; tone?: keyof typeof badgeTones; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", badgeTones[tone], className)}>{children}</span>;
}

export function Field({ label, children, hint, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-sm font-semibold text-ink-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-500 mt-1">{hint}</span>}
    </label>
  );
}

const inputBase = "w-full rounded-xl border border-border bg-surface px-3.5 h-11 text-base text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 disabled:bg-surface-100 transition";
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputBase, className)} {...rest}>{children}</select>;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "h-auto min-h-24 py-2.5", className)} {...rest} />;
}
export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-ink-700 cursor-pointer", className)}>
      <input type="checkbox" className="h-5 w-5 rounded border-surface-300 accent-primary focus:ring-primary-300" {...rest} />
      {label}
    </label>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto mb-3 h-12 w-16 opacity-25 bg-[url('/brand/symbol-blue.png')] bg-contain bg-no-repeat bg-center" aria-hidden />
      <p className="font-semibold text-ink-900">{title}</p>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "green" | "red" | "amber" | "default" | "primary"; icon?: ReactNode }) {
  const color = { green: "text-success", red: "text-danger", amber: "text-warning", primary: "text-primary-700", default: "text-ink-900" }[tone ?? "default"];
  return (
    <div className="rounded-2xl bg-surface border border-border shadow-card p-4 h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
        {icon && <span className="h-8 w-8 rounded-lg bg-primary-soft text-primary-600 flex items-center justify-center shrink-0 -mt-1">{icon}</span>}
      </div>
      <p className={cn("text-[26px] leading-tight font-extrabold mt-1 tnum", color)}>{value}</p>
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" | "warning" }) {
  const t = {
    info: "bg-info-soft text-primary-800 border-primary-100",
    error: "bg-danger-soft text-danger border-red-100",
    success: "bg-success-soft text-success border-emerald-100",
    warning: "bg-warning-soft text-warning border-amber-100",
  }[tone];
  return <div className={cn("rounded-xl border px-4 py-3 text-sm font-medium", t)}>{children}</div>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" }[size];
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return <div className={cn("rounded-full bg-primary-soft text-primary-700 font-bold flex items-center justify-center shrink-0", s)}>{initials}</div>;
}

export function Tabs({ tabs, current }: { tabs: { href: string; label: string }[]; current: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto no-print -mx-1 px-1 pb-1 mb-4 border-b border-border">
      {tabs.map((t) => {
        const active = current === t.href;
        return (
          <Link key={t.href} href={t.href as never}
            className={cn("whitespace-nowrap px-3 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition", active ? "border-primary text-primary-700" : "border-transparent text-ink-500 hover:text-ink-900")}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{it.label}</dt>
          <dd className="text-sm text-ink-900 mt-0.5 break-words">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto -mx-5 px-5", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export const thCls = "text-left text-[11px] uppercase tracking-wider text-ink-500 font-semibold py-2 pr-3";
export const tdCls = "py-2.5 pr-3 border-t border-border align-top";

/** Título de seção com marcador institucional. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2.5">
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700"><span className="h-3.5 w-1 rounded-full bg-primary" />{children}</h2>
      {action}
    </div>
  );
}
