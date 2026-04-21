import type { LandingFeature } from "../landing.types";

function Icon({ name }: { name: LandingFeature["icon"] }) {
  const common = "h-5 w-5";

  if (name === "calendar") {
    return (
      <svg
        viewBox="0 0 20 20"
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M7 2.5v3M13 2.5v3M3 8h14" />
      </svg>
    );
  }

  if (name === "chat") {
    return (
      <svg
        viewBox="0 0 20 20"
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h5A3.5 3.5 0 0 1 16 5.5v3A3.5 3.5 0 0 1 12.5 12H9l-4 3v-3.3A3.5 3.5 0 0 1 2.5 8.4V5.5" />
      </svg>
    );
  }

  if (name === "bag") {
    return (
      <svg
        viewBox="0 0 20 20"
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M6 7V5a4 4 0 0 1 8 0v2" />
        <path d="M4.5 7h11l-.8 10h-9.4L4.5 7Z" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg
        viewBox="0 0 20 20"
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H15a2 2 0 0 1 2 2v9.5A2.5 2.5 0 0 1 14.5 18h-9A2.5 2.5 0 0 1 3 15.5v-9Z" />
        <path d="M13 11h4v4h-4a2 2 0 1 1 0-4Z" />
      </svg>
    );
  }

  if (name === "ticket") {
    return (
      <svg
        viewBox="0 0 20 20"
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v1.2a2.3 2.3 0 0 0 0 4.6v1.2A2.5 2.5 0 0 1 13.5 16h-7A2.5 2.5 0 0 1 4 13.5v-1.2a2.3 2.3 0 0 0 0-4.6V6.5Z" />
        <path d="M10 5v10" strokeDasharray="2 2" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      className={common}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M10 18s5-4.7 5-9A5 5 0 0 0 5 9c0 4.3 5 9 5 9Z" />
      <circle cx="10" cy="9" r="1.8" />
    </svg>
  );
}

export function FeatureCard({ feature }: { feature: LandingFeature }) {
  return (
    <article className="rounded-2xl border border-smoke bg-white p-5 shadow-[0_10px_30px_rgba(28,17,8,0.045)]">
      <div
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${feature.accent}`}
      >
        <Icon name={feature.icon} />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-espresso">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-flint">
        {feature.description}
      </p>
    </article>
  );
}
