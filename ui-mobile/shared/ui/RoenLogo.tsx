// Path: ui-mobile/shared/ui/RoenLogo.tsx
// Summary: Coded ROEN brand primitives for in-app UI.

import { Text, View } from "react-native";

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
};

type WordmarkProps = {
  color?: BrandColor;
  width?: number;
  size?: number;
};

type LogoProps = WordmarkProps & {
  variant?: "display" | "editorial" | "monogram" | "lockupOnInk";
};

export function RoenMark({ size = 24, color = ROEN_BRAND.ink }: MarkProps) {
  return (
    <View
      accessibilityLabel="Roen"
      testID="roen-mark"
      style={{
        width: size,
        height: size,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          color,
          fontFamily: "Italiana_400Regular",
          fontSize: size * 0.48,
          lineHeight: size * 0.52,
        }}
      >
        R
      </Text>
    </View>
  );
}

export function DisplayWordmark({
  color = ROEN_BRAND.ink,
  width,
  size,
}: WordmarkProps) {
  const fontSize = size ?? (width ?? 160) / 5.1;
  const measuredWidth = width ?? fontSize * 5.1;
  return (
    <Text
      accessibilityLabel="Roen"
      testID="roen-display-wordmark"
      allowFontScaling={false}
      style={{
        color,
        fontFamily: "Italiana_400Regular",
        fontSize,
        letterSpacing: fontSize * 0.5,
        lineHeight: fontSize,
        paddingLeft: fontSize * 0.5,
        width: measuredWidth,
      }}
    >
      ROEN
    </Text>
  );
}

export function EditorialWordmark({
  color = ROEN_BRAND.ink,
  width,
  size,
}: WordmarkProps) {
  const fontSize = size ?? (width ?? 120) / 4.7;
  const measuredWidth = width ?? fontSize * 4.7;
  return (
    <Text
      accessibilityLabel="Roen"
      testID="roen-editorial-wordmark"
      allowFontScaling={false}
      style={{
        color,
        fontFamily: "Italiana_400Regular",
        fontSize,
        letterSpacing: fontSize * 0.4,
        lineHeight: fontSize,
        paddingLeft: fontSize * 0.4,
        width: measuredWidth,
      }}
    >
      ROEN
    </Text>
  );
}

export function LogoOnInk() {
  return (
    <View testID="roen-logo-on-ink" style={{ alignItems: "center", gap: 32 }}>
      <RoenMark size={64} color={ROEN_BRAND.bone} />
      <DisplayWordmark color={ROEN_BRAND.bone} width={260} />
    </View>
  );
}

export function RoenLogo({
  variant = "display",
  width,
  size,
  color,
}: LogoProps) {
  if (variant === "monogram") {
    return <RoenMark size={size ?? 24} color={color} />;
  }

  if (variant === "editorial") {
    return <EditorialWordmark width={width} size={size} color={color} />;
  }

  if (variant === "lockupOnInk") {
    return <LogoOnInk />;
  }

  return <DisplayWordmark width={width} size={size} color={color} />;
}
