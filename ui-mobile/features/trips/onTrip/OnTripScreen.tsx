import { useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOnTripSnapshotQuery } from "@/features/trips/hooks";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import type { TripOnTripSnapshot } from "../types";
import { deriveOnTripViewModel, stopVariant } from "./adapters";
import { HappeningNowCard } from "./HappeningNowCard";
import { useOnTripMutations } from "./hooks";
import { LogStopFab } from "./LogStopFab";
import { LogStopSheet } from "./LogStopSheet";
import { NeedsAttentionCard } from "./NeedsAttentionCard";
import { OnTripHeader } from "./OnTripHeader";
import { TimelineRow } from "./TimelineRow";
import { UnplannedStopRow } from "./UnplannedStopRow";
import { buildNavigateUrl } from "./navigation";

type Props = {
  tripId: number;
  tripTitle: string;
};

const NOW_TICK_INTERVAL_MS = 60_000;

export function OnTripScreen({ tripId, tripTitle }: Props) {
  const router = useRouter();
  const snapshotQuery = useOnTripSnapshotQuery(tripId);
  const [liveSnapshot, setLiveSnapshot] = useState<TripOnTripSnapshot | null>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);

  // The "Happening now" stop is derived from the current local time, so we
  // re-render every minute to move past-due stops out of the Now slot without
  // waiting for the next snapshot refetch.
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinuteTick((v) => v + 1), NOW_TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const mutations = useOnTripMutations({
    tripId,
    snapshot: liveSnapshot ?? snapshotQuery.data ?? null,
    onSnapshotRefresh: setLiveSnapshot,
  });

  const rawSnapshot = mutations.viewSnapshot ?? snapshotQuery.data ?? null;

  const vm = useMemo(
    () =>
      rawSnapshot
        ? deriveOnTripViewModel(
            rawSnapshot,
            mutations.statusPending,
            mutations.unplannedPendingIds,
          )
        : null,
    [rawSnapshot, mutations.statusPending, mutations.unplannedPendingIds],
  );

  if (snapshotQuery.isLoading) {
    return <ScreenLoading label="Loading your trip…" />;
  }

  if (snapshotQuery.isError) {
    return (
      <ScreenError
        message="We couldn't load your live trip view. Try again in a moment."
        onRetry={() => void snapshotQuery.refetch()}
      />
    );
  }

  if (!rawSnapshot || !vm) return null;

  const nowKey = vm.now?.key ?? null;
  const nextKey = vm.next?.key ?? null;
  const doneCount = vm.timeline.filter(
    (stop) =>
      stop.effectiveStatus === "confirmed" || stop.effectiveStatus === "skipped",
  ).length;
  const totalCount = vm.timeline.length;
  const progressLabel =
    totalCount > 0 ? `${doneCount} of ${totalCount} done` : undefined;

  const dayLabel = buildDayLabel(rawSnapshot);

  const navigateToStop = async (key: string) => {
    const stop =
      vm.timeline.find((item) => item.key === key) ??
      (vm.now?.key === key ? vm.now : null);
    if (!stop) return;
    const url = buildNavigateUrl(stop);
    if (!url) return;
    await Linking.openURL(url);
  };

  const navigateAction = (key: string): (() => void) | undefined => {
    const stop =
      vm.timeline.find((item) => item.key === key) ??
      (vm.now?.key === key ? vm.now : null);
    if (!stop || !buildNavigateUrl(stop)) return undefined;
    return () => void navigateToStop(key);
  };

  const toggleStatus = (
    stopRef: string | null,
    current: "planned" | "confirmed" | "skipped",
    target: "confirmed" | "skipped",
  ) => {
    if (!stopRef || vm.isReadOnly) return;
    const next = current === target ? "planned" : target;
    void mutations.setStopStatus(stopRef, next);
  };

  const openFullWorkspace = () => {
    router.push(`/(tabs)/trips/${tripId}` as Href);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-ontrip" edges={["top"]}>
      <OnTripHeader
        title={tripTitle}
        readOnly={vm.isReadOnly}
        dayLabel={dayLabel}
        progressLabel={progressLabel}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)/trips")
        }
      />

      <ScrollView contentContainerClassName="gap-6 p-4 pb-32">
        <NeedsAttentionCard blockers={vm.blockers} />

        {vm.now ? (
          <HappeningNowCard
            stop={vm.now}
            onNavigate={navigateAction(vm.now.key)}
            onConfirm={() =>
              toggleStatus(vm.now?.stop_ref ?? null, vm.now!.effectiveStatus, "confirmed")
            }
            onSkip={() =>
              toggleStatus(vm.now?.stop_ref ?? null, vm.now!.effectiveStatus, "skipped")
            }
          />
        ) : null}

        <SectionLabel label="Today" />
        {vm.timeline.length === 0 ? (
          <Text className="text-sm text-ontrip-muted">
            No planned stops for today. You can still log what happens below.
          </Text>
        ) : (
          <View>
            {vm.timeline.map((stop, idx) => (
              <TimelineRow
                key={stop.key}
                stop={stop}
                variant={stopVariant(stop, nowKey, nextKey)}
                isLast={idx === vm.timeline.length - 1}
                onNavigate={navigateAction(stop.key)}
                onConfirm={
                  stop.stop_ref
                    ? () =>
                        toggleStatus(
                          stop.stop_ref,
                          stop.effectiveStatus,
                          "confirmed",
                        )
                    : undefined
                }
                onSkip={
                  stop.stop_ref
                    ? () =>
                        toggleStatus(stop.stop_ref, stop.effectiveStatus, "skipped")
                    : undefined
                }
              />
            ))}
          </View>
        )}

        {vm.unplanned.length > 0 ? (
          <>
            <SectionLabel label="Along the way" />
            <View className="gap-3">
              {vm.unplanned.map((stop) => (
                <UnplannedStopRow
                  key={stop.event_id}
                  stop={stop}
                  onDelete={
                    vm.isReadOnly
                      ? undefined
                      : () => void mutations.removeUnplannedStop(stop.event_id)
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        <View className="mt-2 flex-row items-center justify-between border-t border-border-ontrip pt-4">
          <Text className="flex-1 pr-3 text-[13px] text-ontrip-muted">
            The saved itinerary remains your plan of record.
          </Text>
          <Pressable onPress={openFullWorkspace} hitSlop={8}>
            <Text className="text-[13px] font-medium text-ontrip-strong">
              Open full workspace
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {!vm.isReadOnly ? <LogStopFab onPress={() => setLogModalOpen(true)} /> : null}

      {mutations.feedback ? (
        <Pressable
          onPress={mutations.dismissFeedback}
          className={[
            "absolute bottom-[90px] left-4 right-4 rounded-[16px] px-4 py-3",
            mutations.feedback.kind === "error"
              ? "bg-danger"
              : "bg-olive",
          ].join(" ")}
        >
          <Text className="text-center text-sm font-semibold text-white">
            {mutations.feedback.message}
          </Text>
        </Pressable>
      ) : null}

      <LogStopSheet
        visible={logModalOpen}
        defaultDate={vm.defaultLogDate}
        disabled={mutations.isLoggingUnplanned}
        onClose={() => setLogModalOpen(false)}
        onSubmit={async (payload) => {
          await mutations.logUnplannedStop(payload);
          setLogModalOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-ontrip-muted">
      {label}
    </Text>
  );
}

function buildDayLabel(snapshot: TripOnTripSnapshot): string {
  const day = snapshot.today.day_number;
  if (typeof day === "number" && day > 0) return `Day ${day} · On-Trip`;
  return "On-Trip";
}
