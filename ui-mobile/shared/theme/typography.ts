import type { TextStyle } from "react-native";

export const AppFontFamily = {
  uiRegular: "Manrope_400Regular",
  uiMedium: "Manrope_500Medium",
  uiSemibold: "Manrope_600SemiBold",
  uiBold: "Manrope_700Bold",
  displaySemibold: "CormorantGaramond_600SemiBold",
  displayBold: "CormorantGaramond_700Bold",
} as const;

export const fontStyles: Record<keyof typeof AppFontFamily, TextStyle> = {
  uiRegular: { fontFamily: AppFontFamily.uiRegular },
  uiMedium: { fontFamily: AppFontFamily.uiMedium },
  uiSemibold: { fontFamily: AppFontFamily.uiSemibold },
  uiBold: { fontFamily: AppFontFamily.uiBold },
  displaySemibold: { fontFamily: AppFontFamily.displaySemibold },
  displayBold: { fontFamily: AppFontFamily.displayBold },
};
