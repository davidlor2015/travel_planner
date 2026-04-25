import { useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
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
import { fontStyles } from "@/shared/theme/typography";

import type { TripExecutionStatus, TripOnTripSnapshot } from "../types";
import { deriveOnTripViewModel, stopVariant } from "./adapters";
import { useOnTripMutations } from "./hooks";
import { LogStopFab } from "./LogStopFab";
import { LogStopSheet } from "./LogStopSheet";
import { NeedsAttentionCard } from "./NeedsAttentionCard";
import { OnTripHeader } from "./OnTripHeader";
import {
  buildNavigateUrl,
  buildOnTripDayHeader,
} from "./presentation";
import { TimelineRow } from "./TimelineRow";
import { UnplannedStopRow } from "./UnplannedStopRow";

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

  const dayHeader = useMemo(
    () => (rawSnapshot ? buildOnTripDayHeader(rawSnapshot, tripTitle) : null),
    [rawSnapshot, tripTitle],
  );

  if (snapshotQuery.isLoading) return <ScreenLoading label="Loading your trip..." />;

  if (snapshotQuery.isError) {
    return (
      <ScreenError
        message="We couldn't load your live trip view. Try again in a moment."
        onRetry={() => void snapshotQuery.refetch()}
      />
    );
  }

  if (!rawSnapshot || !vm || !dayHeader) return null;

  const nowKey = vm.now?.key ?? null;
  const nextKey = vm.next?.key ?? null;

  const showNoStopsToday =
    rawSnapshot.mode === "active" &&
    !hasResolvedTodayStop(rawSnapshot) &&
    !isResolvedStop(vm.now) &&
    !isResolvedStop(rawSnapshot.next_stop);

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
    current: TripExecutionStatus,
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
        eyebrow={dayHeader.eyebrow}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)/trips")
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-1">
          <Text
            className="text-[28px] leading-[31px] text-ontrip"
            style={fontStyles.displayMedium}
            numberOfLines={2}
          >
            {dayHeader.title}
          </Text>
          <Text className="mt-1.5 text-[12px] leading-[18px] text-ontrip-muted">
            {dayHeader.meta}
            {vm.isReadOnly ? " · Read-only" : ""}
          </Text>
        </View>

        {vm.blockers.length > 0 ? (
          <View className="mt-5">
            <NeedsAttentionCard blockers={vm.blockers} />
          </View>
        ) : null}

        {showNoStopsToday ? (
          <NoStopsTodayCard onOpenWorkspace={openFullWorkspace} />
        ) : (
          <View className="mt-5">
            <Text
              className="mb-2 text-[11px] uppercase leading-[16px] tracking-[1.76px] text-ontrip-muted"
              style={fontStyles.uiRegular}
            >
              Today
            </Text>

            {vm.timeline.length === 0 ? (
              <Text className="text-[13px] leading-5 text-ontrip-muted" style={fontStyles.uiRegular}>
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
                        ? () => toggleStatus(stop.stop_ref, stop.effectiveStatus, "confirmed")
                        : undefined
                    }
                    onSkip={
                      stop.stop_ref
                        ? () => toggleStatus(stop.stop_ref, stop.effectiveStatus, "skipped")
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {vm.unplanned.length > 0 ? (
          <View className="mt-6">
            <Text
              className="mb-3 text-[11px] uppercase tracking-[1.76px] text-ontrip-muted"
              style={fontStyles.uiRegular}
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

        <View className="mt-5 items-center">
          <Pressable
            onPress={openFullWorkspace}
            className="flex-row items-center gap-1.5 px-3 py-2 active:opacity-70"
          >
            <Ionicons name="open-outline" size={12} color="#8A7866" />
            <Text className="text-[12px] leading-[18px] text-ontrip-muted">
              Open full workspace
            </Text>
          </Pressable>
        </View>

        {!vm.isReadOnly ? (
          <View className="mt-3">
            <LogStopFab onPress={() => setLogModalOpen(true)} />
          </View>
        ) : null}
      </ScrollView>

      {mutations.feedback ? (
        <Pressable
          onPress={mutations.dismissFeedback}
          className={[
            "absolute bottom-[24px] left-5 right-5 rounded-[16px] px-4 py-3",
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

function NoStopsTodayCard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  return (
    <View className="mt-6 gap-4 rounded-[18px] border border-border-ontrip bg-surface-ontrip-raised px-5 py-6">
      <View>
        <Text className="text-[17px] text-ontrip" style={fontStyles.uiSemibold}>
          No stops are planned for today.
        </Text>
        <Text className="mt-2 text-[13px] leading-5 text-ontrip-muted" style={fontStyles.uiRegular}>
          Your saved itinerary does not have resolved stops for today yet. Open the
          workspace to review the trip plan or adjust the itinerary.
        </Text>
      </View>
      <Pressable
        onPress={onOpenWorkspace}
        className="h-11 items-center justify-center rounded-full border border-border-ontrip-strong bg-surface-ontrip px-4 active:opacity-75"
      >
        <Text className="text-[13px] text-ontrip-strong" style={fontStyles.uiSemibold}>
          Open full workspace
        </Text>
      </Pressable>
    </View>
  );
}
