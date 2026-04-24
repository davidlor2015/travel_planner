import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  variant?: "default" | "ontrip";
};

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  variant = "default",
}: Props) {
  const onTrip = variant === "ontrip";
  const titleColor = onTrip ? "text-on-dark" : "text-text";
  const subtitleColor = onTrip ? "text-on-dark-muted" : "text-text-muted";
  const iconColor = onTrip ? "text-on-dark" : "text-text";

  return (
    <View className="flex-row items-start gap-3 px-4 py-3">
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-white/80"
        >
          <Text className={["text-2xl", iconColor].join(" ")}>‹</Text>
        </Pressable>
      ) : null}

      <View className="flex-1">
        <Text className={["text-2xl font-semibold", titleColor].join(" ")}>{title}</Text>
        {subtitle ? (
          <Text className={["mt-1 text-sm", subtitleColor].join(" ")}>{subtitle}</Text>
        ) : null}
      </View>

      {rightAction ? <View>{rightAction}</View> : null}
    </View>
  );
}
