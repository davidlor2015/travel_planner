// Path: ui-mobile/shared/ui/StatusPill.tsx
// Summary: Implements StatusPill module logic.

import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Variant = "default" | "success" | "warning" | "error" | "info";

type Props = {
  label: string;
  variant?: Variant;
};

const variantClasses: Record<Variant, { pill: string; label: string }> = {
  default: { pill: "border border-border bg-surface-muted", label: "text-text-muted" },
  success: { pill: "border border-olive/25 bg-olive/10", label: "text-olive" },
  warning: { pill: "border border-amber/30 bg-amber/10", label: "text-amber" },
  error: { pill: "border border-danger/20 bg-danger/10", label: "text-danger" },
  info: { pill: "border border-depth/20 bg-depth/10", label: "text-depth" },
};

export function StatusPill({ label, variant = "default" }: Props) {
  const { pill, label: labelClass } = variantClasses[variant];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${pill}`}>
      <Text className={`text-xs ${labelClass}`} style={fontStyles.uiSemibold}>
        {label}
      </Text>
    </View>
  );
}
