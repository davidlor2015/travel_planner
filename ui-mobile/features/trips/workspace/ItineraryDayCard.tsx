import type { ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  dayNumber: number;
  title: string;
  date: string | null;
  stopCount: number;
  children: ReactNode;
};

export function ItineraryDayCard({
  dayNumber,
  title,
  date,
  stopCount,
  children,
}: Props) {
  return (
    <View className="rounded-[24px] border border-border bg-surface-muted px-4 py-4">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-text">
          <Text className="text-xs font-bold text-ivory">{dayNumber}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-text">{title}</Text>
          <Text className="mt-1 text-sm text-text-muted">
            {[date, `${stopCount} ${stopCount === 1 ? "stop" : "stops"}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </View>
      <View className="mt-4">{children}</View>
    </View>
  );
}
