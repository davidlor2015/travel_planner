import { useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOnTripSnapshotQuery } from "@/features/trips/hooks";
import {
  hasResolvedTodayStop,
  isResolvedStop,
} from "@/features/trips/onTrip/eligibility";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { PrimaryButton } from "@/shared/ui/Button";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

import type { TripOnTripSnapshot } from "../types";
import { deriveOnTripViewModel, stopVariant, type StopVM } from "./adapters";
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

  if (snapshotQuery.isLoading) return <ScreenLoading label="Loading your trip…" />;

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
    (s) => s.effectiveStatus === "confirmed" || s.effectiveStatus === "skipped",
  ).length;
  const totalCount = vm.timeline.length;
  const progressLabel = totalCount > 0 ? `${doneCount} / ${totalCount} done` : undefined;

  const showNoStopsToday =
    rawSnapshot.mode === "active" &&
    !hasResolvedTodayStop(rawSnapshot) &&
    !isResolvedStop(vm.now) &&
    !isResolvedStop(rawSnapshot.next_stop);

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

      <ScrollView
        contentContainerClassName="gap-5 pb-36"
        contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {showNoStopsToday ? (
          <NoStopsTodayCard onOpenWorkspace={openFullWorkspace} />
        ) : (
          <>
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

            {/* Next stop peek — shown when there's a now + a distinct next */}
            {vm.now && vm.next ? (
              <NextPeek
                stop={vm.next}
                onNavigate={navigateAction(vm.next.key)}
              />
            ) : null}

            {/* Today timeline */}
            <View>
              <TodaySectionHeader
                totalCount={totalCount}
                doneCount={doneCount}
              />

              {vm.timeline.length === 0 ? (
                <Text className="text-sm text-ontrip-muted" style={fontStyles.uiRegular}>
                  No planned stops for today. You can still log what happens below.
                </Text>
              ) : (
                <View
                  className="mt-4 rounded-[20px] border border-border-ontrip bg-surface-ontrip-raised"
                  style={{ overflow: "hidden" }}
                >
                  {vm.timeline.map((stop, idx) => (
                    <View
                      key={stop.key}
                      className="px-4 pt-4"
                      style={
                        idx < vm.timeline.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: "#E4DBCB", borderStyle: "dashed" }
                          : { paddingBottom: 4 }
                      }
                    >
                      <TimelineRow
                        stop={stop}
                        variant={stopVariant(stop, nowKey, nextKey)}
                        isLast={idx === vm.timeline.length - 1}
                        onNavigate={navigateAction(stop.key)}
                        onConfirm={
                          stop.stop_ref
                            ? () =>
                                toggleStatus(stop.stop_ref, stop.effectiveStatus, "confirmed")
                            : undefined
                        }
                        onSkip={
                          stop.stop_ref
                            ? () =>
                                toggleStatus(stop.stop_ref, stop.effectiveStatus, "skipped")
                            : undefined
                        }
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {vm.unplanned.length > 0 ? (
          <View>
            <Text
              className="mb-3 text-[10px] uppercase tracking-[2px] text-ontrip-muted"
              style={fontStyles.uiMedium}
            >
              Along the way
            </Text>
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
          </View>
        ) : null}

        <View className="flex-row items-center justify-between border-t border-border-ontrip pt-4">
          <Text
            className="flex-1 pr-3 text-[13px] leading-5 text-ontrip-muted"
            style={fontStyles.uiRegular}
          >
            The saved itinerary remains your plan of record.
          </Text>
          <Pressable onPress={openFullWorkspace} hitSlop={8}>
            <Text className="text-[13px] text-ontrip-strong" style={fontStyles.uiSemibold}>
              Open workspace
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
            mutations.feedback.kind === "error" ? "bg-danger" : "bg-olive",
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

// ─── Local components ─────────────────────────────────────────────────────────

function TodaySectionHeader({
  totalCount,
  doneCount,
}: {
  totalCount: number;
  doneCount: number;
}) {
  const remaining = totalCount - doneCount;
  const subLabel =
    doneCount === totalCount && totalCount > 0
      ? "all done"
      : doneCount > 0
        ? `${remaining} remaining`
        : "";

  return (
    <View className="flex-row items-baseline justify-between">
      <View>
        <Text
          className="text-[10px] uppercase tracking-[2px] text-ontrip-muted"
          style={fontStyles.uiMedium}
        >
          Today
        </Text>
        <Text
          className="mt-1 text-ontrip"
          style={[textScaleStyles.displayL, { fontSize: 22, lineHeight: 26 }]}
        >
          {totalCount > 0 ? (
            <>
              {totalCount} {totalCount === 1 ? "stop" : "stops"}
              {subLabel ? (
                <Text className="text-ontrip-muted" style={fontStyles.displayMedium}>
                  {", "}
                  <Text style={{ fontStyle: "italic" }}>{subLabel}.</Text>
                </Text>
              ) : null}
            </>
          ) : (
            "No stops planned."
          )}
        </Text>
      </View>
      {totalCount > 0 ? (
        <Text
          className="text-[10px] uppercase tracking-[1.5px] text-ontrip-muted"
          style={fontStyles.uiMedium}
        >
          {doneCount} / {totalCount}
        </Text>
      ) : null}
    </View>
  );
}

function NextPeek({
  stop,
  onNavigate,
}: {
  stop: StopVM;
  onNavigate?: () => void;
}) {
  return (
    <Pressable
      onPress={onNavigate}
      className="flex-row items-center gap-4 rounded-[18px] border border-border-ontrip bg-surface-ontrip-raised px-4 py-4 active:opacity-80"
      disabled={!onNavigate}
    >
      {/* Time */}
      {stop.time ? (
        <>
          <Text
            className="text-[20px] text-accent-ontrip"
            style={fontStyles.displaySemibold}
          >
            {stop.time.trim()}
          </Text>
          <View className="h-8 w-px bg-border-ontrip" />
        </>
      ) : null}

      {/* Details */}
      <View className="flex-1">
        <Text
          className="mb-0.5 text-[10px] uppercase tracking-[2px] text-ontrip-muted"
          style={fontStyles.uiMedium}
        >
          Next
        </Text>
        <Text
          className="text-[14px] text-ontrip"
          style={fontStyles.uiSemibold}
          numberOfLines={1}
        >
          {stop.title ?? "Untitled stop"}
        </Text>
        {stop.location ? (
          <Text
            className="mt-0.5 text-[12px] text-ontrip-muted"
            style={fontStyles.uiRegular}
            numberOfLines={1}
          >
            {stop.location}
          </Text>
        ) : null}
      </View>

      {onNavigate ? (
        <Text className="text-ontrip-muted" style={{ fontSize: 18 }}>›</Text>
      ) : null}
    </Pressable>
  );
}

function NoStopsTodayCard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  return (
    <View className="gap-4 rounded-[20px] border border-border-ontrip bg-surface-ontrip-raised px-5 py-6">
      <View>
        <Text className="text-[18px] text-ontrip" style={fontStyles.uiSemibold}>
          No stops are planned for today.
        </Text>
        <Text className="mt-2 text-[13px] leading-5 text-ontrip-muted" style={fontStyles.uiRegular}>
          Your saved itinerary does not have resolved stops for today yet. Open the
          workspace to review the trip plan or adjust the itinerary.
        </Text>
      </View>
      <PrimaryButton label="Open full workspace" onPress={onOpenWorkspace} fullWidth />
    </View>
  );
}

function buildDayLabel(snapshot: TripOnTripSnapshot): string {
  const day = snapshot.today.day_number;
  if (typeof day === "number" && day > 0) return `Day ${day} · On-Trip`;
  return "On-Trip";
}
