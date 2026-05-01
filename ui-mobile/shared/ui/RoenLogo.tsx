// Path: ui-mobile/shared/ui/RoenLogo.tsx
// Summary: Roen "R" mark and wordmark primitives.

import { Text, View } from "react-native";

type Props = {
  size?: number;
  color?: string;
};

export function RoenMark({ size = 24, color = "#1C1108" }: Props) {
  return (
    <Text
      style={{
        fontFamily: "Italiana_400Regular",
        fontSize: size,
        lineHeight: size * 1.1,
        color,
        includeFontPadding: false,
      }}
      allowFontScaling={false}
    >
      R
    </Text>
  );
}

export function RoenLogo({ size = 22, color = "#1C1108" }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: size * 0.2 }}>
      <Text
        style={{
          fontFamily: "Italiana_400Regular",
          fontSize: size * 1.1,
          lineHeight: size * 1.2,
          letterSpacing: size * 0.05,
          color,
          includeFontPadding: false,
        }}
        allowFontScaling={false}
      >
        Roen
      </Text>
    </View>
  );
}
