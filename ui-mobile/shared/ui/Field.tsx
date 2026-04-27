// Path: ui-mobile/shared/ui/Field.tsx
// Summary: Implements Field module logic.

import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: Props) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm text-text" style={fontStyles.uiSemibold}>
        {label}
        {hint ? (
          <Text className="text-text-soft" style={fontStyles.uiRegular}>
            {" "}
            {hint}
          </Text>
        ) : null}
      </Text>
      {children}
      {error ? (
        <Text
          className="text-xs text-danger"
          style={fontStyles.uiMedium}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
