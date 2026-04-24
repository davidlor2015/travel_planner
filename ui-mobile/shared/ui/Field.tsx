import type { ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: Props) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-text">
        {label}
        {hint ? <Text className="font-normal text-text-soft"> {hint}</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text className="text-xs font-medium text-danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
