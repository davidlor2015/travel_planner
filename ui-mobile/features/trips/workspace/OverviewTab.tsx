import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { usePlanAndSaveItineraryMutation, useSavedItineraryQuery } from "@/features/ai/hooks";
import { ApiError } from "@/shared/api/client";
import { PrimaryButton } from "@/shared/ui/Button";
import { SectionCard } from "@/shared/ui/SectionCard";
import { StatusPill } from "@/shared/ui/StatusPill";

import type {
  TripSummaryViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { ItineraryDayCard } from "./ItineraryDayCard";
import { ItineraryStopRow } from "./ItineraryStopRow";

type Props = {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
};

export function OverviewTab({ trip, summary }: Props) {
  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      <SectionCard
        eyebrow="Trip basics"
        title="Destination and timing"
        description="Keep the core trip facts visible while you fill in the details."
      >
        <View className="gap-3">
          <InfoRow label="Destination" value={trip.destination} />
          <InfoRow label="Dates" value={trip.dateRange} />
          <InfoRow
            label="Duration"
            value={`${trip.durationDays} ${trip.durationDays === 1 ? "day" : "days"}`}
          />
          <View className="flex-row flex-wrap gap-2">
            <StatusPill
              label={trip.statusLabel}
              variant={
                trip.status === "active"
                  ? "success"
                  : trip.status === "upcoming"
                    ? "warning"
                    : "default"
              }
            />
            <StatusPill
              label={trip.isOwner ? "You own this trip" : "Shared trip"}
              variant="info"
            />
          </View>
        </View>
      </SectionCard>

      {summary ? (
        <SectionCard eyebrow="At a glance" title="Readiness">
          <View className="flex-row gap-3">
            <StatBlock
              label="Packing"
              value={`${summary.packingChecked}/${summary.packingTotal}`}
            />
            <StatBlock
              label="Budget"
              value={
                summary.budgetLimit != null
                  ? `$${summary.budgetSpent.toFixed(0)} / $${summary.budgetLimit.toFixed(0)}`
                  : `$${summary.budgetSpent.toFixed(0)} spent`
              }
              highlight={summary.isOverBudget ? "error" : undefined}
            />
            <StatBlock label="Bookings" value={String(summary.reservationCount)} />
          </View>
        </SectionCard>
      ) : null}

      <ItinerarySection tripId={trip.id} />
    </ScrollView>
  );
}

function ItinerarySection({ tripId }: { tripId: number }) {
  const itineraryQuery = useSavedItineraryQuery(tripId);
  const generateMutation = usePlanAndSaveItineraryMutation();
  const [generateError, setGenerateError] = useState<string | null>(null);

  const is404 =
    itineraryQuery.isError &&
    itineraryQuery.error instanceof ApiError &&
    itineraryQuery.error.status === 404;

  const handleGenerate = async () => {
    try {
      setGenerateError(null);
      await generateMutation.mutateAsync({ tripId });
    } catch {
      setGenerateError(
        "We couldn't generate the itinerary right now. Try again in a moment.",
      );
    }
  };

  return (
    <SectionCard
      eyebrow="Itinerary"
      title="Saved plan"
      description="Your published itinerary — shared with everyone on this trip."
    >
      {itineraryQuery.isLoading && <ActivityIndicator className="py-2" />}

      {is404 && (
        <View className="gap-3">
          <Text className="text-sm text-text-muted">
            No itinerary saved yet. Generate one with AI or build it manually on
            the web workspace.
          </Text>
          {generateMutation.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" />
              <Text className="text-sm text-text-muted">Generating…</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Generate itinerary"
              onPress={() => void handleGenerate()}
            />
          )}
          {generateError ? (
            <Text className="text-sm text-danger">{generateError}</Text>
          ) : null}
        </View>
      )}

      {itineraryQuery.isError && !is404 && (
        <Text className="text-sm text-text-muted">
          We couldn't load the itinerary right now. Try again in a moment.
        </Text>
      )}

      {itineraryQuery.data && (
        <View className="mt-1 gap-3">
          {itineraryQuery.data.days.map((day) => (
            <ItineraryDayCard
              key={day.day_number}
              dayNumber={day.day_number}
              title={day.day_title || `Day ${day.day_number}`}
              date={day.date}
              stopCount={day.items.length}
            >
              <View className="gap-1">
                {day.items.map((item, idx) => (
                  <ItineraryStopRow
                    key={`${day.day_number}-${idx}-${item.title}`}
                    time={item.time}
                    title={item.title}
                    location={item.location}
                    notes={item.notes}
                  />
                ))}
              </View>
            </ItineraryDayCard>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-soft">
        {label}
      </Text>
      <Text className="mt-1 text-base text-text">{value}</Text>
    </View>
  );
}

function StatBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "error";
}) {
  return (
    <View className="flex-1 gap-0.5 rounded-2xl border border-border bg-surface-muted px-3 py-3">
      <Text className="text-[11px] font-normal uppercase tracking-[0.5px] text-text-soft">
        {label}
      </Text>
      <Text
        className={`text-[15px] font-semibold ${highlight === "error" ? "text-danger" : "text-text"}`}
      >
        {value}
      </Text>
    </View>
  );
}
