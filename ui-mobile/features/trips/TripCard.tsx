import { Pressable, Text, View } from "react-native";

import { StatusPill } from "@/shared/ui/StatusPill";

import type { TripListItemViewModel } from "./adapters";

type Props = {
  trip: TripListItemViewModel;
  onPress: () => void;
};

function statusVariant(status: TripListItemViewModel["status"]) {
  if (status === "active") return "success";
  if (status === "upcoming") return "warning";
  return "default";
}

export function TripCard({ trip, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="gap-3 rounded-[24px] border border-border bg-white p-4 shadow-card active:opacity-80"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-text" numberOfLines={1}>
            {trip.title}
          </Text>
          <Text className="mt-1 text-sm text-text-muted" numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>
        <StatusPill label={trip.statusLabel} variant={statusVariant(trip.status)} />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm text-text-muted">{trip.dateRange}</Text>
        <Text className="text-sm text-text-muted">
          {trip.memberCount} {trip.memberCount === 1 ? "traveler" : "travelers"}
        </Text>
      </View>
    </Pressable>
  );
}
