import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import { StatusPill } from "@/shared/ui/StatusPill";

import type { TripCardReadiness, TripListItemViewModel } from "./adapters";
import { getTripImageUrl } from "./workspace/helpers/tripVisuals";

type Props = {
  trip: TripListItemViewModel;
  onPress: () => void;
  onOpenLiveView?: () => void;
};

function statusVariant(status: TripListItemViewModel["status"]) {
  if (status === "active")   return "success";
  if (status === "upcoming") return "warning";
  return "default";
}

function readinessDotClass(label: TripCardReadiness["label"]): string {
  if (label === "Ready" || label === "On track") return "bg-olive";
  if (label === "Needs focus")                   return "bg-amber";
  if (label === "Behind")                        return "bg-danger";
  return "bg-border-strong";
}

export function TripCard({ trip, onPress, onOpenLiveView }: Props) {
  const showLiveCta = trip.status === "active" && Boolean(onOpenLiveView);
  const readiness   = trip.readiness;
  const imageUri    = getTripImageUrl({ id: trip.id, destination: trip.destination });

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-[26px] border border-border bg-bg-app shadow-card active:opacity-80"
    >
      {/* ── Hero image ──────────────────────────────────────── */}
      <View style={{ height: 132 }}>
        <Image
          source={{ uri: imageUri }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={["rgba(28,17,8,0.10)", "rgba(28,17,8,0.02)", "rgba(254,252,249,0.96)"]}
          locations={[0, 0.45, 1]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 74 }}
        />
        {/* Status pill anchored to top-right of image */}
        <View className="absolute right-3 top-3">
          <StatusPill
            label={trip.statusLabel}
            variant={statusVariant(trip.status)}
          />
        </View>
      </View>

      {/* ── Content ─────────────────────────────────────────── */}
      <View className="gap-3 px-4 pb-4 pt-3">
        <View className="gap-1">
          <Text
            className="text-[22px] leading-7 text-text"
            style={fontStyles.displaySemibold}
            numberOfLines={1}
          >
            {trip.title}
          </Text>
          <Text className="text-[13px] font-medium text-text-muted" numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <MetaPill label={trip.dateRange} />
          <MetaPill
            label={`${trip.memberCount} ${
              trip.memberCount === 1 ? "traveler" : "travelers"
            }`}
          />
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
                className="rounded-full border border-accent/25 bg-accent/10 px-3 py-2 active:opacity-80"
              >
                <Text className="text-xs font-semibold text-accent-ontrip">
                  Live view
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border bg-surface-muted px-2.5 py-1">
      <Text className="text-[11px] font-medium text-text-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
