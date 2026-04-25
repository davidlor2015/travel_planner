import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useApplyItineraryMutation, useSavedItineraryQuery } from "@/features/ai/hooks";
import type { Itinerary, ItineraryItem } from "@/features/ai/api";
import type { StreamState } from "@/features/ai/useStreamingItinerary";
import { ApiError } from "@/shared/api/client";
import { PrimaryButton } from "@/shared/ui/Button";
import { SectionCard } from "@/shared/ui/SectionCard";
import { StatusPill } from "@/shared/ui/StatusPill";

import type {
  TripSummaryViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { EditableItineraryDayCard } from "./EditableItineraryDayCard";
import { RegenerateSheet } from "./RegenerateSheet";
import { StopEditSheet, type StopEditPatch } from "./StopEditSheet";

type Props = {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
  streamState: StreamState | undefined;
  onStartStream: () => void;
  onCancelStream: () => void;
};

export function OverviewTab({
  trip,
  summary,
  streamState,
  onStartStream,
  onCancelStream,
}: Props) {
  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      {/* Most actionable first: the itinerary plan and AI generation */}
      <ItinerarySection
        tripId={trip.id}
        streamState={streamState}
        onStartStream={onStartStream}
        onCancelStream={onCancelStream}
      />

      {/* Readiness snapshot — quick-scan logistics health */}
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

      {/* Trip basics — reference info pushed to the bottom */}
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
    </ScrollView>
  );
}

type ItinerarySectionProps = {
  tripId: number;
  streamState: StreamState | undefined;
  onStartStream: () => void;
  onCancelStream: () => void;
};

function ItinerarySection({
  tripId,
  streamState,
  onStartStream,
  onCancelStream,
}: ItinerarySectionProps) {
  const itineraryQuery = useSavedItineraryQuery(tripId);
  const { mutateAsync: saveItinerary, isPending: isSaving } =
    useApplyItineraryMutation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editableItinerary, setEditableItinerary] = useState<Itinerary | null>(null);
  const [lastSyncedSaved, setLastSyncedSaved] = useState<string | null>(null);
  const [editingStop, setEditingStop] = useState<{
    dayIndex: number;
    stopIndex: number | null;
  } | null>(null);
  const [regeneratingDayIndex, setRegeneratingDayIndex] = useState<number | null>(null);
  const applyInFlight = useRef(false);

  const completedItinerary: Itinerary | null = streamState?.itinerary ?? null;
  const isStillStreaming = streamState?.streaming ?? false;
  const streamError = streamState?.error ?? null;
  const isStreaming = isStillStreaming;
  const savedItinerary = itineraryQuery.data ?? null;
  const savedSerialized = useMemo(
    () => (savedItinerary ? serializeItinerary(savedItinerary) : null),
    [savedItinerary],
  );
  const editableSerialized = useMemo(
    () => (editableItinerary ? serializeItinerary(editableItinerary) : null),
    [editableItinerary],
  );
  const isDirty = Boolean(
    savedSerialized && editableSerialized && savedSerialized !== editableSerialized,
  );
  const selectedStop =
    editingStop && editableItinerary
      ? editableItinerary.days[editingStop.dayIndex]?.items[
          editingStop.stopIndex ?? -1
        ] ?? null
      : null;

  useEffect(() => {
    setEditableItinerary(null);
    setLastSyncedSaved(null);
    setEditingStop(null);
    setRegeneratingDayIndex(null);
    setSaveError(null);
    applyInFlight.current = false;
  }, [tripId]);

  useEffect(() => {
    if (!savedItinerary || !savedSerialized) {
      setEditableItinerary(null);
      setLastSyncedSaved(null);
      setEditingStop(null);
      return;
    }

    if (lastSyncedSaved !== savedSerialized) {
      setEditableItinerary(savedItinerary);
      setLastSyncedSaved(savedSerialized);
      setEditingStop(null);
    }
  }, [lastSyncedSaved, savedItinerary, savedSerialized]);

  // Auto-apply when the stream finishes with a valid itinerary.
  useEffect(() => {
    if (!completedItinerary || isStillStreaming || applyInFlight.current) return;

    applyInFlight.current = true;
    setSaveError(null);

    saveItinerary({ tripId, itinerary: completedItinerary, source: "ai_stream" })
      .then(() => {
        setEditableItinerary(completedItinerary);
        setLastSyncedSaved(serializeItinerary(completedItinerary));
        onCancelStream();
        applyInFlight.current = false;
      })
      .catch(() => {
        setSaveError("We couldn't save the itinerary. Try again.");
        onCancelStream();
        applyInFlight.current = false;
      });
    // completedItinerary identity only changes once (null → object); isStillStreaming
    // transitions true → false exactly once per stream. tripId is stable from props.
    // saveItinerary / onCancelStream are stable callbacks from their respective hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedItinerary, isStillStreaming, tripId]);

  const is404 =
    itineraryQuery.isError &&
    itineraryQuery.error instanceof ApiError &&
    itineraryQuery.error.status === 404;

  const hasSaved = Boolean(itineraryQuery.data);
  const showNormal = !isStreaming && !isSaving;

  function handleAddStop(dayIndex: number, patch: StopEditPatch) {
    setEditableItinerary((current) => {
      if (!current) return current;
      const day = current.days[dayIndex];
      if (!day) return current;

      const nextDays = [...current.days];
      nextDays[dayIndex] = {
        ...day,
        items: [...day.items, createStopFromPatch(patch)],
      };
      return { ...current, days: nextDays };
    });
  }

  function handleUpdateStop(
    dayIndex: number,
    stopIndex: number,
    patch: StopEditPatch,
  ) {
    setEditableItinerary((current) => {
      if (!current) return current;
      const day = current.days[dayIndex];
      const stop = day?.items[stopIndex];
      if (!day || !stop) return current;

      const nextItems = [...day.items];
      nextItems[stopIndex] = { ...stop, ...patch };
      const nextDays = [...current.days];
      nextDays[dayIndex] = { ...day, items: nextItems };
      return { ...current, days: nextDays };
    });
  }

  function handleDeleteStop() {
    if (!editingStop || editingStop.stopIndex == null) return;
    const { dayIndex, stopIndex } = editingStop;

    setEditableItinerary((current) => {
      if (!current) return current;
      const day = current.days[dayIndex];
      if (!day?.items[stopIndex]) return current;

      const nextDays = [...current.days];
      nextDays[dayIndex] = {
        ...day,
        items: day.items.filter((_item, index) => index !== stopIndex),
      };
      return { ...current, days: nextDays };
    });
    setEditingStop(null);
  }

  function handleSaveStop(patch: StopEditPatch) {
    if (!editingStop) return;

    if (editingStop.stopIndex == null) {
      handleAddStop(editingStop.dayIndex, patch);
    } else {
      handleUpdateStop(editingStop.dayIndex, editingStop.stopIndex, patch);
    }
    setEditingStop(null);
  }

  function handleAcceptRefinement(refinedItinerary: Itinerary) {
    if (!editableItinerary) return;
    setEditableItinerary(refinedItinerary);
    setRegeneratingDayIndex(null);
  }

  async function handlePublishChanges() {
    if (!editableItinerary || !isDirty) return;

    setSaveError(null);
    try {
      await saveItinerary({
        tripId,
        itinerary: editableItinerary,
        source: "manual_edit",
      });
      setLastSyncedSaved(serializeItinerary(editableItinerary));
    } catch {
      setSaveError("We couldn't publish your itinerary changes. Try again.");
    }
  }

  return (
    <SectionCard
      eyebrow="Itinerary"
      title="Saved plan"
      description="Your published itinerary — shared with everyone on this trip."
    >
      {/* ── Streaming banner ─────────────────────────────────── */}
      {isStreaming && (
        <View
          className="rounded-2xl p-4 gap-3"
          style={{
            borderWidth: 1,
            borderColor: "rgba(184, 104, 69, 0.3)",
            backgroundColor: "rgba(184, 104, 69, 0.05)",
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#B86845" />
              <Text className="text-sm font-semibold text-amber">
                Generating itinerary…
              </Text>
            </View>
            <Pressable
              onPress={onCancelStream}
              accessibilityRole="button"
              accessibilityLabel="Cancel generation"
              className="rounded-full px-3 py-1.5 active:opacity-60"
            >
              <Text className="text-xs font-semibold text-text-muted">
                Cancel
              </Text>
            </Pressable>
          </View>
          <Text
            className="text-xs leading-relaxed text-text-soft"
            numberOfLines={6}
          >
            {streamState?.text
              ? streamState.text.slice(-400)
              : "Connecting to AI… you can cancel at any time."}
          </Text>
        </View>
      )}

      {/* ── Saving spinner (stream done, writing to server) ───── */}
      {isSaving && (
        <View className="flex-row items-center gap-2 py-2">
          <ActivityIndicator size="small" color="#B86845" />
          <Text className="text-sm text-text-muted">Saving itinerary…</Text>
        </View>
      )}

      {/* ── Stream / save error ───────────────────────────────── */}
      {showNormal && (streamError || saveError) && (
        <Text className="text-sm text-danger">{streamError ?? saveError}</Text>
      )}

      {/* ── Loading cached itinerary ──────────────────────────── */}
      {showNormal && itineraryQuery.isLoading && (
        <ActivityIndicator className="py-2" />
      )}

      {/* ── No itinerary yet — generate CTA ──────────────────── */}
      {showNormal && is404 && (
        <View className="gap-3">
          <Text className="text-sm text-text-muted">
            No itinerary saved yet. Generate one with AI or build it manually on
            the web workspace.
          </Text>
          <PrimaryButton label="Generate with AI" onPress={onStartStream} />
          <Text className="text-[11px] text-text-soft">
            AI suggestions are a starting point — confirm details before anyone
            travels.
          </Text>
        </View>
      )}

      {/* ── Fetch error (non-404) ─────────────────────────────── */}
      {showNormal && itineraryQuery.isError && !is404 && (
        <Text className="text-sm text-text-muted">
          We could not load the itinerary right now. Try again in a moment.
        </Text>
      )}

      {/* ── Saved itinerary ───────────────────────────────────── */}
      {showNormal && hasSaved && editableItinerary && (
        <View className="mt-1 gap-3">
          {editableItinerary.days.map((day, dayIndex) => (
            <EditableItineraryDayCard
              key={day.day_number}
              day={day}
              onAddStop={() => setEditingStop({ dayIndex, stopIndex: null })}
              onEditStop={(stopIndex) => setEditingStop({ dayIndex, stopIndex })}
              onRegenerate={!isDirty ? () => setRegeneratingDayIndex(dayIndex) : undefined}
            />
          ))}
          {isDirty ? (
            <PrimaryButton
              label={isSaving ? "Publishing..." : "Publish changes"}
              onPress={() => void handlePublishChanges()}
              disabled={isSaving}
              fullWidth
            />
          ) : null}
          <Pressable
            onPress={onStartStream}
            disabled={isDirty}
            accessibilityRole="button"
            className={[
              "mt-1 flex-row items-center justify-center rounded-full border border-border-strong py-2.5 active:opacity-70",
              isDirty ? "opacity-50" : "",
            ].join(" ")}
          >
            <Text className="text-xs font-semibold text-text-muted">
              {isDirty ? "Publish changes before regenerating" : "Regenerate with AI"}
            </Text>
          </Pressable>
          <StopEditSheet
            visible={Boolean(editingStop)}
            item={selectedStop}
            onSave={handleSaveStop}
            onDelete={handleDeleteStop}
            onClose={() => setEditingStop(null)}
          />
          <RegenerateSheet
            visible={regeneratingDayIndex !== null}
            tripId={tripId}
            day={
              regeneratingDayIndex !== null
                ? (editableItinerary.days[regeneratingDayIndex] ?? null)
                : null
            }
            currentItinerary={editableItinerary}
            onAccept={handleAcceptRefinement}
            onClose={() => setRegeneratingDayIndex(null)}
          />
        </View>
      )}
    </SectionCard>
  );
}

function serializeItinerary(itinerary: Itinerary): string {
  return JSON.stringify(sortObjectKeys(itinerary));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

function createStopFromPatch(patch: StopEditPatch): ItineraryItem {
  return {
    id: null,
    time: patch.time,
    title: patch.title,
    location: patch.location,
    lat: null,
    lon: null,
    notes: patch.notes,
    cost_estimate: null,
    status: "planned",
    handled_by: null,
    booked_by: null,
  };
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
