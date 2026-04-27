import type { TextStyle } from "react-native";

/**
 * Desert Editorial type system — three families matching STYLE.MD.md:
 *   HEAD  → Cormorant Garamond  (display titles, editorial headings, italic emphasis)
 *   UI    → Manrope             (body copy, labels, buttons, UI text)
 *   MONO  → JetBrains Mono      (kickers, timestamps, metadata, uppercase labels)
 */
export const AppFontFamily = {
  // HEAD — Cormorant Garamond
  headMedium:          "CormorantGaramond_500Medium",
  headMediumItalic:    "CormorantGaramond_500Medium_Italic",
  headSemibold:        "CormorantGaramond_600SemiBold",
  headSemiboldItalic:  "CormorantGaramond_600SemiBold_Italic",
  headRegular:         "CormorantGaramond_400Regular",
  headRegularItalic:   "CormorantGaramond_400Regular_Italic",

  // UI — Manrope
  uiRegular:   "Manrope_400Regular",
  uiMedium:    "Manrope_500Medium",
  uiSemibold:  "Manrope_600SemiBold",
  uiBold:      "Manrope_700Bold",

  // MONO — JetBrains Mono
  monoRegular: "JetBrainsMono_400Regular",
  monoMedium:  "JetBrainsMono_500Medium",

  // Backward-compat aliases (previously Playfair Display; now map to HEAD)
  displayMedium:   "CormorantGaramond_500Medium",
  displaySemibold: "CormorantGaramond_600SemiBold",
  displayBold:     "CormorantGaramond_600SemiBold",
} as const;

export const fontStyles: Record<keyof typeof AppFontFamily, TextStyle> = {
  headMedium:          { fontFamily: AppFontFamily.headMedium },
  headMediumItalic:    { fontFamily: AppFontFamily.headMediumItalic },
  headSemibold:        { fontFamily: AppFontFamily.headSemibold },
  headSemiboldItalic:  { fontFamily: AppFontFamily.headSemiboldItalic },
  headRegular:         { fontFamily: AppFontFamily.headRegular },
  headRegularItalic:   { fontFamily: AppFontFamily.headRegularItalic },
  uiRegular:           { fontFamily: AppFontFamily.uiRegular },
  uiMedium:            { fontFamily: AppFontFamily.uiMedium },
  uiSemibold:          { fontFamily: AppFontFamily.uiSemibold },
  uiBold:              { fontFamily: AppFontFamily.uiBold },
  monoRegular:         { fontFamily: AppFontFamily.monoRegular },
  monoMedium:          { fontFamily: AppFontFamily.monoMedium },
  displayMedium:       { fontFamily: AppFontFamily.displayMedium },
  displaySemibold:     { fontFamily: AppFontFamily.displaySemibold },
  displayBold:         { fontFamily: AppFontFamily.displayBold },
};

/**
 * Semantic scale aligned to STYLE.MD.md size guidelines.
 *
 *   displayXL — large trip/hero titles   (HEAD semibold, 38px)
 *   displayL  — section / day headings   (HEAD semibold, 26px)
 *   titleM    — card/tab titles          (UI semibold,   17px)
 *   body      — body copy                (UI regular,    14px)
 *   caption   — kickers / meta labels    (MONO regular,  10px, tracking 2.2)
 */
export const textScaleStyles = {
  displayXL: { ...fontStyles.headSemibold,  fontSize: 38, lineHeight: 42 } satisfies TextStyle,
  displayL:  { ...fontStyles.headSemibold,  fontSize: 26, lineHeight: 30 } satisfies TextStyle,
  titleM:    { ...fontStyles.uiSemibold,    fontSize: 17, lineHeight: 22 } satisfies TextStyle,
  body:      { ...fontStyles.uiRegular,     fontSize: 14, lineHeight: 20 } satisfies TextStyle,
  caption:   { ...fontStyles.monoRegular,   fontSize: 10, lineHeight: 15, letterSpacing: 2.2 } satisfies TextStyle,
} satisfies Record<string, TextStyle>;
