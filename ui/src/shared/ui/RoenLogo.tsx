// Path: ui/src/shared/ui/RoenLogo.tsx
// Summary: Coded ROEN brand primitives for in-app UI.

import type { CSSProperties } from "react";

export const ROEN_BRAND = {
  ink: "#2A231C",
  bone: "#EFE7D6",
  warmIvory: "#F5EFE2",
  olive: "#6E6A4F",
  softBrown: "#3D342B",
} as const;

type BrandColor = (typeof ROEN_BRAND)[keyof typeof ROEN_BRAND] | string;

type MarkProps = {
  size?: number;
  color?: BrandColor;
  className?: string;
  "aria-label"?: string;
};

type WordmarkProps = {
  color?: BrandColor;
  size?: number;
  className?: string;
};

type LogoProps = {
  variant?:
    | "full"
    | "header"
    | "mark"
    | "favicon"
    | "monogram"
    | "display"
    | "editorial"
    | "lockupOnInk";
  className?: string;
  size?: number;
  color?: BrandColor;
  theme?: "light" | "dark";
};

const wordmarkStyle = ({
  color,
  size,
  tracking,
}: {
  color: BrandColor;
  size: number;
  tracking: string;
}): CSSProperties => ({
  color,
  fontFamily: "'Italiana', Georgia, serif",
  fontSize: size,
  fontWeight: 400,
  letterSpacing: tracking,
  lineHeight: 1,
  paddingLeft: tracking,
});

export function RoenMark({
  size = 32,
  color = ROEN_BRAND.ink,
  className = "",
  "aria-label": ariaLabel = "Roen",
}: MarkProps) {
  return (
    <span
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${color}`,
        color,
        fontFamily: "'Italiana', Georgia, serif",
        fontSize: size * 0.48,
        lineHeight: 1,
      }}
    >
      R
    </span>
  );
}

export function DisplayWordmark({
  color = ROEN_BRAND.ink,
  size = 72,
  className = "",
}: WordmarkProps) {
  return (
    <span
      aria-label="Roen"
      className={`block select-none ${className}`}
      style={wordmarkStyle({ color, size, tracking: "0.5em" })}
    >
      ROEN
    </span>
  );
}

export function EditorialWordmark({
  color = ROEN_BRAND.ink,
  size = 34,
  className = "",
}: WordmarkProps) {
  return (
    <span
      aria-label="Roen"
      className={`block select-none ${className}`}
      style={wordmarkStyle({ color, size, tracking: "0.4em" })}
    >
      ROEN
    </span>
  );
}

export function LogoOnInk({
  className = "",
  size = 72,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={`flex flex-col items-center gap-8 ${className}`}>
      <RoenMark size={Math.round(size * 0.67)} color={ROEN_BRAND.bone} />
      <DisplayWordmark color={ROEN_BRAND.bone} size={size} />
    </div>
  );
}

export function RoenLogo({
  variant = "full",
  className = "",
  size,
  color,
}: LogoProps) {
  if (variant === "favicon" || variant === "monogram") {
    return <RoenMark size={size ?? 32} color={color ?? ROEN_BRAND.ink} className={className} />;
  }

  if (variant === "lockupOnInk") {
    return <LogoOnInk className={className} size={size} />;
  }

  if (variant === "display" || variant === "mark") {
    return (
      <DisplayWordmark
        size={size ?? 56}
        color={color ?? ROEN_BRAND.ink}
        className={className}
      />
    );
  }

  return (
    <EditorialWordmark
      size={size ?? 28}
      color={color ?? ROEN_BRAND.ink}
      className={className}
    />
  );
}
