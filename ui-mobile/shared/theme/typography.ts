import type { TextStyle } from "react-native";

/**
 * Font family constants mirroring the web design system's three-family split:
 *   --font-display  → Playfair Display (editorial headings / trip titles)
 *   --font-sans     → Inter (body copy, labels, UI text)
 *   --font-mono     → (not loaded; omit until needed)
 *
 * Usage: apply `style={fontStyles.displaySemibold}` alongside NativeWind
 * size/color classes when a heading needs the editorial typeface.
 */
export const AppFontFamily = {
  // --font-sans equivalents (body / UI)
  uiRegular: "Inter_400Regular",
  uiMedium: "Inter_500Medium",
  uiSemibold: "Inter_600SemiBold",
  uiBold: "Inter_700Bold",

  // --font-display equivalents (editorial headings / trip titles)
  displayMedium: "PlayfairDisplay_500Medium",
  displaySemibold: "PlayfairDisplay_600SemiBold",
  displayBold: "PlayfairDisplay_700Bold",
} as const;

export const fontStyles: Record<keyof typeof AppFontFamily, TextStyle> = {
  uiRegular: { fontFamily: AppFontFamily.uiRegular },
  uiMedium: { fontFamily: AppFontFamily.uiMedium },
  uiSemibold: { fontFamily: AppFontFamily.uiSemibold },
  uiBold: { fontFamily: AppFontFamily.uiBold },
  displayMedium: { fontFamily: AppFontFamily.displayMedium },
  displaySemibold: { fontFamily: AppFontFamily.displaySemibold },
  displayBold: { fontFamily: AppFontFamily.displayBold },
};

/**
 * Semantic typography scale, analogous to web's heading/body defaults.
 *
 *   displayXL  — large trip/hero titles (Playfair Display, ~32px)
 *   displayL   — section headings (Playfair Display, ~24px)
 *   titleM     — card/tab titles (Inter semibold, ~17px)
 *   body       — body copy (Inter regular, ~14px)
 *   caption    — small labels, dates, metadata (Inter medium, ~11px)
 */
export const textScaleStyles = {
  displayXL: { ...fontStyles.displaySemibold, fontSize: 32, lineHeight: 36 } satisfies TextStyle,
  displayL:  { ...fontStyles.displaySemibold, fontSize: 24, lineHeight: 28 } satisfies TextStyle,
  titleM:    { ...fontStyles.uiSemibold,       fontSize: 17, lineHeight: 22 } satisfies TextStyle,
  body:      { ...fontStyles.uiRegular,         fontSize: 14, lineHeight: 20 } satisfies TextStyle,
  caption:   { ...fontStyles.uiMedium,          fontSize: 11, lineHeight: 16 } satisfies TextStyle,
} satisfies Record<string, TextStyle>;
