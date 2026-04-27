// Path: ui/src/shared/ui/travelPrimitives.tsx
// Summary: Implements travelPrimitives module logic.

import type { ReactNode } from "react";
import { WaypointLogo } from "./WaypointLogo";

export interface AppTopNavLink {
  id: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}

interface AppTopNavProps {
  links?: AppTopNavLink[];
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  avatarLabel?: string;
  className?: string;
}

export function AppTopNav({
  links = [],
  notificationCount = 0,
  onNotificationsClick,
  onPrimaryAction,
  primaryActionLabel = "New Trip",
  avatarLabel,
  className = "",
}: AppTopNavProps) {
  return (
    <header
      className={[
        "sticky top-0 z-40 border-b border-border bg-bg-app/95 backdrop-blur-md",
        className,
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <WaypointLogo variant="header" className="select-none" />

        {links.length > 0 ? (
          <nav
            className="hidden items-center gap-1 rounded-full bg-parchment p-1 sm:flex"
            aria-label="Primary"
          >
            {links.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={link.onClick}
                className={[
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  link.active
                    ? "bg-espresso text-white"
                    : "text-flint hover:text-espresso",
                ].join(" ")}
              >
                {link.label}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {onNotificationsClick ? (
            <button
              type="button"
              onClick={onNotificationsClick}
              aria-label={
                notificationCount > 0
                  ? `${notificationCount} unread updates`
                  : "Trip activity"
              }
              className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M14 8a4 4 0 1 0-8 0c0 4.7-2 6-2 6h12s-2-1.3-2-6" />
                <path d="M11.8 16a2 2 0 0 1-3.6 0" />
              </svg>
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {onPrimaryAction ? (
            <ActionButton
              onClick={onPrimaryAction}
              variant="primary"
              className="hidden sm:inline-flex"
            >
              {primaryActionLabel}
            </ActionButton>
          ) : null}

          {avatarLabel ? (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-white"
              title={avatarLabel}
              aria-label={avatarLabel}
            >
              {avatarLabel.slice(0, 2)}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function PageSection({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["space-y-4", className].join(" ")}>
      {title || subtitle || actions ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-[28px] font-semibold text-espresso sm:text-[34px]">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-flint">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: "left" | "center";
  meta?: string;
}) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"
      }
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-[30px] font-semibold text-espresso sm:text-[40px]">
        {title}
      </h2>
      {description ? (
        <div className="mt-3 text-sm leading-relaxed text-flint sm:text-base">
          {description}
        </div>
      ) : null}
      {meta ? (
        <p className="mt-3 text-xs font-medium text-muted">{meta}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-smoke bg-white px-6 py-12 text-center">
      <h3 className="text-2xl font-semibold text-espresso">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-flint">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
      <p>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({
  className = "h-24",
}: {
  className?: string;
}) {
  return (
    <div
      className={["animate-pulse rounded-2xl bg-parchment/70", className].join(
        " ",
      )}
      aria-hidden="true"
    />
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  const styles = {
    neutral: "border-smoke bg-parchment text-flint",
    positive: "border-olive/25 bg-olive/10 text-olive",
    warning: "border-amber/30 bg-amber/10 text-amber",
    danger: "border-danger/20 bg-danger/10 text-danger",
  } as const;

  return (
    <span
      className={[
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        styles[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function AvatarStack({
  items,
  max = 4,
}: {
  items: Array<{ id: string; label: string }>;
  max?: number;
}) {
  const shown = items.slice(0, max);
  const rest = Math.max(0, items.length - shown.length);

  return (
    <div className="inline-flex items-center">
      {shown.map((item, index) => (
        <span
          key={item.id}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-app bg-accent text-[10px] font-semibold text-white"
          style={{ marginLeft: index === 0 ? 0 : -8 }}
          title={item.label}
        >
          {item.label.slice(0, 2).toUpperCase()}
        </span>
      ))}
      {rest > 0 ? (
        <span className="ml-2 text-xs font-medium text-muted">+{rest}</span>
      ) : null}
    </div>
  );
}

export function ActionButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const variantClass =
    variant === "primary"
      ? "bg-espresso text-white hover:bg-espresso-dark"
      : variant === "ghost"
        ? "border-transparent bg-transparent text-text-muted hover:text-text"
        : "border-border bg-surface-muted text-text-muted hover:bg-surface-sunken";

  return (
    <button
      type="button"
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        variantClass,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={["relative block", className].join(" ")}>
      <span className="sr-only">Search</span>
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 3 3" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-2xl border border-smoke bg-white px-11 py-3 text-sm text-espresso outline-none transition-all focus:border-amber/40 focus:ring-2 focus:ring-amber/15"
      />
    </label>
  );
}

export function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35",
        active
          ? "border-amber bg-amber text-white"
          : "border-smoke bg-white/70 text-flint hover:bg-parchment hover:text-espresso",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="inline-flex w-fit rounded-2xl border border-smoke bg-white p-1"
      role="group"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={[
            "inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35",
            value === option.id
              ? "bg-espresso text-white"
              : "text-flint hover:bg-parchment hover:text-espresso",
          ].join(" ")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
