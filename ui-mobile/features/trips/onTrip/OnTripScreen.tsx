// Path: ui-mobile/features/trips/onTrip/OnTripScreen.tsx
// Summary: Implements OnTripScreen module logic.

import { useEffect, useMemo, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useSavedItineraryQuery } from "@/features/ai/hooks";
import type { DayPlan, ItineraryItem } from "@/features/ai/api";
import { useOnTripSnapshotQuery } from "@/features/trips/hooks";
import { formatTripStopTime } from "@/features/trips/stopTime";
import {
  hasResolvedTodayStop,
  isResolvedStop,
} from "@/features/trips/onTrip/eligibility";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

import type {
  TripExecutionStatus,
  TripMember,
  TripOnTripSnapshot,
} from "../types";
import { deriveOnTripViewModel, stopVariant } from "./adapters";
import { HappeningNowCard } from "./HappeningNowCard";
import { useOnTripMutations } from "./hooks";
import { NeedsAttentionCard } from "./NeedsAttentionCard";
import { LogStopSheet } from "./LogStopSheet";
import { OnTripHeader } from "./OnTripHeader";
import { buildNavigateUrl, buildOnTripDayHeader } from "./presentation";
import { TimelineRow } from "./TimelineRow";
import { UnplannedStopRow } from "./UnplannedStopRow";
import {
  READ_ONLY_TRIP_BODY,
  READ_ONLY_TRIP_TITLE,
} from "../workspace/helpers/collaborationGate";

type Props = {
  tripId: number;
  tripTitle: string;
  tripDestination?: string;
  /** Trip calendar start_date when deriving today without snapshot today.day_date */
  tripStartDate?: string | null;
  members?: TripMember[];
  autoOpenLogComposer?: boolean;
};

const NOW_TICK_INTERVAL_MS = 60_000;

export function OnTripScreen({
  tripId,
  tripTitle,
  tripDestination,
  tripStartDate,
  members,
  autoOpenLogComposer = false,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const snapshotQuery = useOnTripSnapshotQuery(tripId);
  const itineraryQuery = useSavedItineraryQuery(tripId);
  const [liveSnapshot, setLiveSnapshot] = useState<TripOnTripSnapshot | null>(
    null,
  );
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logComposerMode, setLogComposerMode] = useState<"quick" | "full">(
    autoOpenLogComposer ? "quick" : "full",
  );
  const hasAutoOpenedComposerRef = useRef(false);

  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setMinuteTick((v) => v + 1),
      NOW_TICK_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  const mutations = useOnTripMutations({
    tripId,
    snapshot: liveSnapshot ?? snapshotQuery.data ?? null,
    onSnapshotRefresh: setLiveSnapshot,
    currentUser: user,
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
    () =>
      rawSnapshot
        ? buildOnTripDayHeader(
            rawSnapshot,
            tripTitle,
            tripDestination,
            tripStartDate,
          )
        : null,
    [rawSnapshot, tripTitle, tripDestination, tripStartDate],
  );

  useEffect(() => {
    if (hasAutoOpenedComposerRef.current) return;
    if (!autoOpenLogComposer) return;
    if (!vm || vm.isReadOnly) return;

    hasAutoOpenedComposerRef.current = true;
    setLogComposerMode("quick");
    setLogModalOpen(true);
  }, [autoOpenLogComposer, vm]);

  if (snapshotQuery.isLoading)
    return <ScreenLoading label="Loading your trip..." />;

  if (snapshotQuery.isError && !snapshotQuery.data) {
    return (
      <ScreenError
        message="We couldn't load your Today view. Try again in a moment."
        onRetry={() => void snapshotQuery.refetch()}
      />
    );
  }

  if (!rawSnapshot || !vm || !dayHeader)
    return <ScreenLoading label="Loading your trip..." />;

  const showSavedDetailsHint =
    mutations.refreshFailed || snapshotQuery.refreshFailedWithCache;
  const displayedRefreshedAt =
    snapshotQuery.dataUpdatedAt > 0
      ? snapshotQuery.dataUpdatedAt
      : mutations.lastRefreshedAt;
  const staleMinutes =
    displayedRefreshedAt > 0
      ? Math.floor((Date.now() - displayedRefreshedAt) / 60_000)
      : 0;
  const showOlderRefreshFailure = showSavedDetailsHint && staleMinutes >= 30;

  const nowKey = vm.now?.key ?? null;
  const nextKey = vm.next?.key ?? null;
  const focusStop = vm.now ?? vm.next;
  const focusTone = vm.now ? "now" : "next";

  const showNoStopsToday =
    rawSnapshot.mode === "active" &&
    !hasResolvedTodayStop(rawSnapshot) &&
    !isResolvedStop(vm.now) &&
    !isResolvedStop(rawSnapshot.next_stop);

  const toggleStatus = (stopRef: string, target: TripExecutionStatus) => {
    void mutations.setStopStatus(stopRef, target);
  };

  const navigateAction = (key: string): (() => void) | undefined => {
    const stop =
      vm.timeline.find((item) => item.key === key) ??
      (vm.now?.key === key ? vm.now : null);
    if (!stop) return undefined;
    const url = buildNavigateUrl(stop);
    if (!url) return undefined;
    return () => void Linking.openURL(url);
  };

  const openStopDetail = (stopKey: string) => {
    router.push(
      `/(tabs)/trips/${tripId}/stop/${encodeURIComponent(stopKey)}` as Href,
    );
  };

  const openFullWorkspace = () => {
    router.push(`/(tabs)/trips/${tripId}` as Href);
  };

  const tomorrowStop = deriveTomorrowStop(
    rawSnapshot,
    itineraryQuery.data?.days ?? [],
  );

  // Done count for header
  const doneCount = vm.timeline.filter(
    (s) => s.effectiveStatus === "confirmed" || s.effectiveStatus === "skipped",
  ).length;

  // Exclude the currently-focused stop from the list so it isn't rendered twice
  // (HappeningNowCard already shows it prominently above the timeline).
  const visibleTimeline = nowKey
    ? vm.timeline.filter((s) => s.key !== nowKey)
    : vm.timeline;

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: DE.ivory }}
    >
      <OnTripHeader
        eyebrow={dayHeader.eyebrow}
        dateLabel={dayHeader.dateLabel}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)/trips")
        }
        members={members?.map((m, index) => ({
          email: m.email,
          tone: [DE.ink, DE.clay, DE.inkSoft, DE.sage][index % 4],
        }))}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Read-only notice */}
        {vm.isReadOnly ? <ReadOnlyBanner /> : null}

        {/* Stale data notice (only when old + refresh failing) */}
        {showOlderRefreshFailure ? <StaleBanner /> : null}

        {/* NowCard / day-complete state */}
        {focusStop ? (
          <View className="mx-4 mt-6">
            <HappeningNowCard
              stop={focusStop}
              tone={focusTone}
              onPress={() => openStopDetail(focusStop.key)}
              onNavigate={navigateAction(focusStop.key)}
              onConfirm={
                !vm.isReadOnly && focusStop.stop_ref
                  ? () => toggleStatus(focusStop.stop_ref!, "confirmed")
                  : () => {}
              }
              onSkip={
                !vm.isReadOnly && focusStop.stop_ref
                  ? () => toggleStatus(focusStop.stop_ref!, "skipped")
                  : () => {}
              }
            />
          </View>
        ) : vm.isDayComplete ? (
          <DayCompleteCard />
        ) : null}

        {/* Blocker strip */}
        {vm.blockers.length > 0 ? (
          <View className="mx-4 mt-3">
            <NeedsAttentionCard blockers={vm.blockers} />
          </View>
        ) : null}

        {/* Today strip */}
        {showNoStopsToday ? (
          <NoStopsTodayCard onOpenWorkspace={openFullWorkspace} />
        ) : (
          <View className="mt-5 px-[22px]">
            {/* Section header */}
            <View
              className="flex-row items-start justify-between pb-3"
              style={{ borderBottomWidth: 1, borderBottomColor: DE.ruleStrong }}
            >
              <View className="flex-1">
                <Text
                  style={[
                    fontStyles.monoRegular,
                    {
                      fontSize: 10,
                      letterSpacing: 2.2,
                      textTransform: "uppercase",
                      color: DE.muted,
                    },
                  ]}
                >
                  Today
                </Text>
                <Text
                  style={[
                    fontStyles.headMedium,
                    {
                      fontSize: 26,
                      lineHeight: 30,
                      marginTop: 6,
                      letterSpacing: -0.4,
                      color: DE.ink,
                    },
                  ]}
                >
                  {vm.timeline.length}{" "}
                  {vm.timeline.length === 1 ? "stop" : "stops"}
                  {doneCount > 0 ? (
                    <Text
                      style={[fontStyles.headMediumItalic, { color: DE.muted }]}
                    >
                      {`, ${doneCount === vm.timeline.length ? "all done." : `${doneCount} done.`}`}
                    </Text>
                  ) : (
                    "."
                  )}
                </Text>
              </View>
              {displayedRefreshedAt > 0 ? (
                <View className="items-end">
                  <Text
                    style={[
                      fontStyles.monoRegular,
                      {
                        fontSize: 9,
                        letterSpacing: 1.2,
                        color: DE.mutedLight,
                        marginTop: 2,
                      },
                    ]}
                    accessibilityLabel={formatLastUpdated(displayedRefreshedAt)}
                  >
                    {formatLastUpdated(displayedRefreshedAt)}
                  </Text>
                  {showSavedDetailsHint ? (
                    <Text
                      style={[
                        fontStyles.uiRegular,
                        { fontSize: 10, lineHeight: 14, color: DE.mutedLight },
                      ]}
                    >
                      Showing saved trip details
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {vm.timeline.length === 0 ? (
              <Text
                className="mt-3"
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 13, lineHeight: 20, color: DE.muted },
                ]}
              >
                No planned stops for today.
              </Text>
            ) : (
              <View className="mt-2">
                {visibleTimeline.map((stop, idx) => (
                  <TimelineRow
                    key={stop.key}
                    stop={stop}
                    variant={stopVariant(stop, nowKey, nextKey)}
                    isLast={idx === visibleTimeline.length - 1}
                    onPress={() => openStopDetail(stop.key)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Unplanned / along the way */}
        {vm.unplanned.length > 0 ? (
          <View className="mt-6 px-[22px]">
            <Text
              className="mb-3"
              style={[
                fontStyles.monoRegular,
                {
                  fontSize: 10,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                  color: DE.muted,
                },
              ]}
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

        {/* Inline log extra stop action */}
        {!vm.isReadOnly ? (
          <View className="mx-[22px] mt-6">
            <Pressable
              onPress={() => {
                setLogComposerMode("full");
                setLogModalOpen(true);
              }}
              className="flex-row items-center gap-3 rounded-[12px] border px-4 py-3.5 active:opacity-70"
              style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
              accessibilityRole="button"
              accessibilityLabel="Log extra stop"
            >
              <Ionicons name="add-circle-outline" size={18} color={DE.muted} />
              <View>
                <Text
                  style={[
                    fontStyles.uiMedium,
                    { fontSize: 13, color: DE.inkSoft },
                  ]}
                >
                  + Log extra stop
                </Text>
                <Text
                  style={[
                    fontStyles.uiRegular,
                    {
                      fontSize: 11,
                      lineHeight: 16,
                      color: DE.muted,
                      marginTop: 1,
                    },
                  ]}
                >
                  Save somewhere you visited outside the plan.
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Tomorrow peek */}
        {tomorrowStop ? <TomorrowPeek stop={tomorrowStop} /> : null}

        {/* Open plan link */}
        <View className="mt-6 items-center">
          <Pressable
            onPress={openFullWorkspace}
            className="flex-row items-center gap-1.5 px-3 py-2 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Open Plan"
          >
            <Ionicons name="open-outline" size={12} color={DE.muted} />
            <Text
              style={[
                fontStyles.uiRegular,
                { fontSize: 12, lineHeight: 18, color: DE.muted },
              ]}
            >
              Open Plan
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {mutations.feedback ? (
        <Pressable
          onPress={mutations.dismissFeedback}
          style={{ bottom: insets.bottom + 16 }}
          className={[
            "absolute left-5 right-5 rounded-[16px] px-4 py-3",
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
        quickMode={logComposerMode === "quick"}
        onClose={() => setLogModalOpen(false)}
        onSubmit={async (payload) => {
          await mutations.logUnplannedStop(payload);
          setLogComposerMode("full");
          setLogModalOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastUpdated(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return "Last updated just now";
  if (diffMin === 1) return "Last updated 1 min ago";
  if (diffMin < 60) return `Last updated ${diffMin} min ago`;
  const time = new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Last updated ${time}`;
}

// ─── ReadOnlyBanner ───────────────────────────────────────────────────────────

function ReadOnlyBanner() {
  return (
    <View
      className="mx-4 mt-5 flex-row items-start gap-3 rounded-[14px] border px-4 py-3.5"
      style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${READ_ONLY_TRIP_TITLE}. ${READ_ONLY_TRIP_BODY}`}
    >
      <Ionicons
        name="lock-closed-outline"
        size={13}
        color={DE.muted}
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={[fontStyles.uiSemibold, { fontSize: 13, color: DE.inkSoft }]}>
          {READ_ONLY_TRIP_TITLE}
        </Text>
        <Text
          style={[
            fontStyles.uiRegular,
            { fontSize: 12, lineHeight: 17, color: DE.muted, marginTop: 2 },
          ]}
        >
          {READ_ONLY_TRIP_BODY}
        </Text>
      </View>
    </View>
  );
}

// ─── DayCompleteCard ──────────────────────────────────────────────────────────

function DayCompleteCard() {
  return (
    <View
      className="mx-4 mt-6 rounded-[20px] border px-6 py-7"
      style={{ backgroundColor: DE.paper, borderColor: DE.ruleStrong }}
      accessibilityRole="alert"
      accessibilityLabel="Day complete"
    >
      <View className="mb-4 flex-row items-center gap-2.5">
        <Ionicons name="checkmark-circle-outline" size={14} color={DE.sage} />
        <Text
          style={[
            fontStyles.monoMedium,
            {
              fontSize: 10,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: DE.sageDeep,
            },
          ]}
        >
          Day complete
        </Text>
      </View>
      <Text
        style={[
          fontStyles.headMediumItalic,
          { fontSize: 26, lineHeight: 32, color: DE.ink, letterSpacing: -0.4 },
        ]}
      >
        All planned stops for today are done.
      </Text>
    </View>
  );
}

// ─── StaleBanner ─────────────────────────────────────────────────────────────

function StaleBanner() {
  return (
    <View
      className="mx-4 mt-5 flex-row items-start gap-3 rounded-[14px] border px-4 py-3.5"
      style={{ backgroundColor: DE.paper, borderColor: DE.claySandLight }}
      accessibilityRole="alert"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={13}
        color={DE.muted}
        style={{ marginTop: 1 }}
      />
      <Text
        style={[
          fontStyles.uiRegular,
          { fontSize: 13, lineHeight: 19, color: DE.muted, flex: 1 },
        ]}
      >
        Couldn&apos;t refresh right now. Showing saved trip details.
      </Text>
    </View>
  );
}

// ─── TomorrowPeek ─────────────────────────────────────────────────────────────

type TomorrowPreview = {
  date: string | null;
  title: string;
  time: string | null;
  subtitle: string | null;
};

function TomorrowPeek({ stop }: { stop: TomorrowPreview }) {
  const dateLabel = formatTomorrowDate(stop.date);

  return (
    <View className="mx-[22px] mt-7">
      <View
        className="rounded-[14px] bg-transparent"
        style={{
          borderWidth: 1,
          borderColor: DE.rule,
          paddingHorizontal: 20,
          paddingVertical: 18,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text
              style={[
                fontStyles.monoRegular,
                {
                  fontSize: 9,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                  marginBottom: 6,
                  color: DE.muted,
                },
              ]}
            >
              {dateLabel ? `Tomorrow · ${dateLabel}` : "Tomorrow"}
            </Text>
            <Text
              style={[
                fontStyles.headMediumItalic,
                {
                  fontSize: 20,
                  lineHeight: 24,
                  color: DE.ink,
                  letterSpacing: -0.3,
                },
              ]}
              numberOfLines={2}
            >
              {stop.time
                ? `${stop.title}, ${formatTripStopTime(stop.time)}.`
                : stop.title}
            </Text>
            {stop.subtitle ? (
              <Text
                className="mt-1"
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 12, lineHeight: 18, color: DE.muted },
                ]}
              >
                {stop.subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={14} color={DE.mutedLight} />
        </View>
      </View>
    </View>
  );
}

function deriveTomorrowStop(
  snapshot: TripOnTripSnapshot,
  days: DayPlan[],
): TomorrowPreview | null {
  const next = snapshot.next_stop;
  if (next?.title && isAfterToday(next.day_date, snapshot.today.day_date)) {
    return {
      date: next.day_date,
      title: next.title,
      time: next.time,
      subtitle: next.location?.trim() || null,
    };
  }

  const tomorrowDay = findTomorrowDay(snapshot, days);
  if (!tomorrowDay) return null;
  const firstStop = tomorrowDay.items.find((item) => item.title?.trim());
  const title =
    firstStop?.title?.trim() ||
    tomorrowDay.day_title?.trim() ||
    `Day ${tomorrowDay.day_number}`;

  return {
    date: tomorrowDay.date,
    title,
    time: firstStop?.time ?? null,
    subtitle: buildTomorrowSubtitle(tomorrowDay, firstStop),
  };
}

function findTomorrowDay(
  snapshot: TripOnTripSnapshot,
  days: DayPlan[],
): DayPlan | null {
  if (days.length === 0) return null;

  if (snapshot.today.day_date) {
    const dated = days
      .filter((day) => day.date && day.date > snapshot.today.day_date!)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    return dated[0] ?? null;
  }

  const todayIndex = days.findIndex(
    (day) => day.day_number === snapshot.today.day_number,
  );
  return todayIndex >= 0 ? (days[todayIndex + 1] ?? null) : null;
}

function isAfterToday(
  date: string | null | undefined,
  today: string | null | undefined,
): boolean {
  return Boolean(date && today && date > today);
}

function buildTomorrowSubtitle(
  day: DayPlan,
  firstStop: ItineraryItem | undefined,
): string | null {
  const count = day.items.length;
  const stopCount = `${count} ${count === 1 ? "stop" : "stops"} planned`;
  const note = day.day_note?.trim();
  const location = firstStop?.location?.trim();
  return [note, location, stopCount].filter(Boolean).join(" · ") || null;
}

function formatTomorrowDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const weekday = date
    .toLocaleDateString(undefined, { weekday: "short" })
    .toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  const month = date
    .toLocaleDateString(undefined, { month: "short" })
    .toUpperCase();
  return `${weekday} ${day} ${month}`;
}

// ─── No stops today ───────────────────────────────────────────────────────────

function NoStopsTodayCard({
  onOpenWorkspace,
}: {
  onOpenWorkspace: () => void;
}) {
  return (
    <View
      className="mx-[22px] mt-6 gap-4 rounded-[18px] border px-5 py-6"
      style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
    >
      <View>
        <Text style={[fontStyles.uiSemibold, { fontSize: 17, color: DE.ink }]}>
          No stops are planned for today.
        </Text>
        <Text
          className="mt-2"
          style={[
            fontStyles.uiRegular,
            { fontSize: 13, lineHeight: 20, color: DE.muted },
          ]}
        >
          Your saved itinerary does not have resolved stops for today yet. Open
          Plan to review details or adjust the itinerary.
        </Text>
      </View>
      <Pressable
        onPress={onOpenWorkspace}
        className="h-11 items-center justify-center rounded-full border px-4 active:opacity-75"
        style={{ backgroundColor: DE.ivory, borderColor: DE.ruleStrong }}
        accessibilityRole="button"
        accessibilityLabel="Open Plan"
      >
        <Text
          style={[fontStyles.uiSemibold, { fontSize: 13, color: DE.inkSoft }]}
        >
          Open Plan
        </Text>
      </Pressable>
    </View>
  );
}
