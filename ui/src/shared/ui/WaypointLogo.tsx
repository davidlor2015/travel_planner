type LogoProps = {
  variant?: "full" | "header" | "mark" | "favicon";
  className?: string;
  /** Kept for API compatibility; brand assets ship with their own palette. */
  theme?: "light" | "dark";
};

const LOGO_SRC = "/Logo.svg";
const FAVICON_SRC = "/favicon.svg";

export function WaypointLogo({
  variant = "full",
  className = "",
}: LogoProps) {
  if (variant === "favicon") {
    return (
      <img
        src={FAVICON_SRC}
        alt=""
        role="img"
        aria-label="Waypoint"
        className={`block h-full w-full object-contain ${className}`}
        width={32}
        height={32}
        decoding="async"
      />
    );
  }

  if (variant === "mark") {
    return (
      <img
        src={LOGO_SRC}
        alt="Waypoint"
        className={`mx-auto block h-10 w-auto max-w-[min(280px,90vw)] sm:h-12 ${className}`}
        width={481}
        height={138}
        decoding="async"
      />
    );
  }

  if (variant === "header") {
    return (
      <img
        src={LOGO_SRC}
        alt="Waypoint"
        className={`block h-7 w-auto sm:h-8 ${className}`}
        width={481}
        height={138}
        decoding="async"
      />
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Waypoint"
      className={`block h-8 w-auto sm:h-9 md:h-10 ${className}`}
      width={481}
      height={138}
      decoding="async"
    />
  );
}
