import { Pressable, Text, View } from "react-native";

import { StatusPill } from "@/shared/ui/StatusPill";

import type { TripCardReadiness, TripListItemViewModel } from "./adapters";

type Props = {
  trip: TripListItemViewModel;
  onPress: () => void;
  onOpenLiveView?: () => void;
};

function statusVariant(status: TripListItemViewModel["status"]) {
  if (status === "active") return "success";
  if (status === "upcoming") return "warning";
  return "default";
}

function readinessDotClass(label: TripCardReadiness["label"]): string {
  if (label === "Ready" || label === "On track") return "bg-olive";
  if (label === "Needs focus") return "bg-amber";
  if (label === "Behind") return "bg-danger";
  return "bg-border-strong";
}

export function TripCard({ trip, onPress, onOpenLiveView }: Props) {
  const showLiveCta = trip.status === "active" && Boolean(onOpenLiveView);
  const readiness = trip.readiness;

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

      {readiness || showLiveCta ? (
        <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
          {readiness ? (
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <View
                  className={`h-2 w-2 rounded-full ${readinessDotClass(readiness.label)}`}
                />
                <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted">
                  {readiness.label}
                </Text>
              </View>
              {readiness.hint ? (
                <Text
                  className="mt-1 text-sm text-text-muted"
                  numberOfLines={1}
                >
                  {readiness.hint}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="flex-1" />
          )}

          {showLiveCta ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onOpenLiveView?.();
              }}
              hitSlop={8}
              className="rounded-full border border-accent-ontrip bg-surface-ontrip px-3 py-1.5 active:opacity-80"
            >
              <Text className="text-xs font-semibold text-accent-ontrip">
                Open live view →
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
