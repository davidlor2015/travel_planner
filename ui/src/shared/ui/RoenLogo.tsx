// Path: ui/src/shared/ui/RoenLogo.tsx
// Summary: Roen wordmark and icon mark components.

type LogoProps = {
  variant?: "full" | "header" | "mark" | "favicon";
  className?: string;
  /** Kept for API compatibility; ignored — brand palette is self-contained. */
  theme?: "light" | "dark";
};

const wm = "inline-block font-[family-name:var(--font-italiana)] tracking-[0.06em] leading-none select-none";

export function RoenLogo({
  variant = "full",
  className = "",
}: LogoProps) {
  if (variant === "favicon") {
    return (
      <img
        src="/favicon.svg"
        alt=""
        role="img"
        aria-label="Roen"
        className={`block h-full w-full object-contain ${className}`}
        width={32}
        height={32}
        decoding="async"
      />
    );
  }

  if (variant === "mark") {
    return (
      <span
        className={`${wm} text-[40px] sm:text-[48px] text-espresso ${className}`}
        aria-label="Roen"
      >
        Roen
      </span>
    );
  }

  if (variant === "header") {
    return (
      <span
        className={`${wm} text-[26px] sm:text-[30px] text-espresso ${className}`}
        aria-label="Roen"
      >
        Roen
      </span>
    );
  }

  return (
    <span
      className={`${wm} text-[32px] sm:text-[36px] md:text-[40px] text-espresso ${className}`}
      aria-label="Roen"
    >
      Roen
    </span>
  );
}
