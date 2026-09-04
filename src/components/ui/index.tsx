import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "bg-brand-100 text-brand-800 hover:bg-brand-200",
  outline: "border border-ink-100 bg-white text-ink-900 hover:bg-sand-100",
  ghost: "text-ink-700 hover:bg-sand-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-5 text-base" };

export function Button({
  variant = "primary", size = "md", className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
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
    <Link href={href as never} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition", variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-white border border-ink-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, back, actions }: { title: ReactNode; subtitle?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        {back && (
          <Link href={back as never} className="text-sm text-brand-700 hover:underline">← Voltar</Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

const badgeTones = {
  green: "bg-brand-100 text-brand-800",
  gray: "bg-ink-100 text-ink-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-sky-100 text-sky-800",
};
export function Badge({ children, tone = "gray", className }: { children: ReactNode; tone?: keyof typeof badgeTones; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", badgeTones[tone], className)}>{children}</span>;
}

export function Field({ label, children, hint, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-sm font-medium text-ink-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-500 mt-1">{hint}</span>}
    </label>
  );
}

const inputBase = "w-full rounded-xl border border-ink-100 bg-white px-3.5 h-11 text-base text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 disabled:bg-sand-100";
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
      <input type="checkbox" className="h-5 w-5 rounded border-ink-300 text-brand-600 focus:ring-brand-300" {...rest} />
      {label}
    </label>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="font-medium text-ink-900">{title}</p>
      {description && <p className="text-sm text-ink-500 mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "green" | "red" | "amber" | "default" }) {
  const color = tone === "green" ? "text-brand-700" : tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-ink-900";
  return (
    <div className="rounded-2xl bg-white border border-ink-100 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn("text-2xl font-semibold mt-1", color)}>{value}</p>
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" | "warning" }) {
  const t = {
    info: "bg-sky-50 text-sky-900 border-sky-100",
    error: "bg-red-50 text-red-900 border-red-100",
    success: "bg-brand-50 text-brand-900 border-brand-100",
    warning: "bg-amber-50 text-amber-900 border-amber-100",
  }[tone];
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", t)}>{children}</div>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" }[size];
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return <div className={cn("rounded-full bg-brand-100 text-brand-800 font-semibold flex items-center justify-center shrink-0", s)}>{initials}</div>;
}

export function Tabs({ tabs, current }: { tabs: { href: string; label: string }[]; current: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto no-print -mx-1 px-1 pb-1 mb-4 border-b border-ink-100">
      {tabs.map((t) => {
        const active = current === t.href;
        return (
          <Link key={t.href} href={t.href as never}
            className={cn("whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px", active ? "border-brand-600 text-brand-800" : "border-transparent text-ink-500 hover:text-ink-900")}>
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
          <dt className="text-xs uppercase tracking-wide text-ink-500">{it.label}</dt>
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
export const thCls = "text-left text-xs uppercase tracking-wide text-ink-500 font-medium py-2 pr-3";
export const tdCls = "py-2.5 pr-3 border-t border-ink-100 align-top";
