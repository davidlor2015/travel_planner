import { Pressable, Text, View } from "react-native";

import { StatusPill } from "@/shared/ui/StatusPill";
import { fontStyles } from "@/shared/theme/typography";

import type { TripSummaryViewModel, TripWorkspaceViewModel } from "./adapters";

type Props = {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
  onTripPress: () => void;
  onOpenToolsPress: () => void;
  onEditPress: () => void;
};

function statusVariant(status: TripWorkspaceViewModel["status"]) {
  if (status === "active") return "success";
  if (status === "upcoming") return "warning";
  return "default";
}

export function WorkspaceTripHeader({
  trip,
  summary,
  onTripPress,
  onOpenToolsPress,
  onEditPress,
}: Props) {
  return (
    <View className="mx-4 rounded-[28px] border border-border bg-white p-5 shadow-float">
      <View className="flex-row items-start justify-between gap-3">
        <Pressable onPress={onTripPress} className="flex-1">
          <Text className="text-2xl text-text" style={fontStyles.displaySemibold}>
            {trip.title}
          </Text>
          <Text className="mt-1 text-sm text-text-muted">{trip.destination}</Text>
        </Pressable>
        <StatusPill label={trip.statusLabel} variant={statusVariant(trip.status)} />
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <View className="rounded-full border border-border bg-surface-muted px-3 py-1.5">
          <Text className="text-xs font-medium text-text-muted">{trip.dateRange}</Text>
        </View>
        <View className="rounded-full border border-border bg-surface-muted px-3 py-1.5">
          <Text className="text-xs font-medium text-text-muted">
            {trip.durationDays} {trip.durationDays === 1 ? "day" : "days"}
          </Text>
        </View>
        <View className="rounded-full border border-border bg-surface-muted px-3 py-1.5">
          <Text className="text-xs font-medium text-text-muted">
            {trip.memberCount} {trip.memberCount === 1 ? "traveler" : "travelers"}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-text-muted">
          {summary?.readinessLabel ?? "Trip shell ready. Add logistics and itinerary details next."}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={onOpenToolsPress}>
            <Text className="text-sm font-semibold text-accent">Open tools</Text>
          </Pressable>
          <Pressable onPress={onEditPress}>
            <Text className="text-sm font-semibold text-accent">Edit</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-3 rounded-2xl border border-border bg-surface-muted px-3 py-3">
        <Text className="text-[11px] uppercase tracking-[0.5px] text-text-soft">
          What&apos;s next
        </Text>
        <Text className="mt-1 text-sm text-text-muted">
          Use Overview as the single execution surface, then open tools only when you need deeper logistics edits.
        </Text>
      </View>

      {summary ? (
        <View className="mt-3 flex-row gap-2">
          <Metric label="Bookings" value={String(summary.reservationCount)} />
          <Metric
            label="Budget"
            value={
              summary.budgetLimit != null
                ? `$${Math.round(summary.budgetSpent)} / $${Math.round(summary.budgetLimit)}`
                : `$${Math.round(summary.budgetSpent)} spent`
            }
          />
          <Metric
            label="Packing"
            value={`${summary.packingChecked}/${summary.packingTotal || 0}`}
          />
        </View>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface-muted px-3 py-3">
      <Text className="text-[11px] uppercase tracking-[0.4px] text-text-soft">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-text">{value}</Text>
    </View>
  );
}
