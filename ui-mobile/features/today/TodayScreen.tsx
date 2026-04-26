import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fontStyles } from "@/shared/theme/typography";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import { useTodayModel } from "./useTodayModel";
import type { TripOnTripStopSnapshot } from "@/features/trips/types";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({
  children,
  accent = false,
}: {
  children: string;
  accent?: boolean;
}) {
  return (
    <Text
      className={[
        "mb-2.5 text-[11px] uppercase tracking-[1.5px]",
        accent ? "text-amber" : "text-muted",
      ].join(" ")}
      style={fontStyles.uiMedium}
    >
      {children}
    </Text>
  );
}

function StopCard({ stop }: { stop: TripOnTripStopSnapshot }) {
  const subtitle = [stop.time, stop.location].filter(Boolean).join(" · ");
  return (
    <View className="rounded-[16px] border border-smoke bg-ivory px-4 py-3.5">
      <Text
        className="text-[16px] leading-[22px] text-espresso"
        style={fontStyles.uiMedium}
        numberOfLines={2}
      >
        {stop.title}
      </Text>
      {subtitle ? (
        <Text
          className="mt-0.5 text-[12px] leading-5 text-muted"
          style={fontStyles.uiRegular}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function TodayScreen() {
  const { isLoading, activeTrip, nextUpcomingTrip, daysUntilNextTrip, nextStop, laterStop } =
    useTodayModel();
  const router = useRouter();

  if (isLoading) return <ScreenLoading label="Loading…" />;

  // ── Active trip ────────────────────────────────────────────────────────────
  if (activeTrip) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="pb-3 pt-8">
            <Text
              className="text-[11px] uppercase tracking-[2px] text-muted"
              style={fontStyles.uiMedium}
            >
              Today
            </Text>
          </View>

          {/* Active trip card */}
          <View className="overflow-hidden rounded-[20px] border border-smoke bg-ivory">
            <View className="px-5 pb-5 pt-6">
              <Text
                className="mb-1 text-[11px] uppercase tracking-[1.5px] text-amber"
                style={fontStyles.uiMedium}
              >
                Active trip
              </Text>
              <Text
                className="text-[26px] leading-[30px] text-espresso"
                style={fontStyles.displayMedium}
                numberOfLines={2}
              >
                {activeTrip.title}
              </Text>
              <Text
                className="mt-1 text-[13px] leading-5 text-muted"
                style={fontStyles.uiRegular}
              >
                {activeTrip.destination}
              </Text>

              <Pressable
                onPress={() =>
                  router.push(`/(tabs)/trips/${activeTrip.id}/live` as Href)
                }
                className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-full bg-espresso active:opacity-75"
                accessibilityRole="button"
                accessibilityLabel="Open live trip timeline"
              >
                <Ionicons name="navigate-outline" size={15} color="#FEFCF9" />
                <Text
                  className="text-[14px] text-ivory"
                  style={fontStyles.uiSemibold}
                >
                  Open live timeline
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Next moment */}
          <View className="mt-6">
            <SectionLabel accent>Next moment</SectionLabel>
            {nextStop ? (
              <StopCard stop={nextStop} />
            ) : (
              <View className="rounded-[16px] border border-smoke bg-ivory px-4 py-3.5">
                <Text
                  className="text-[14px] leading-[21px] text-muted"
                  style={fontStyles.uiRegular}
                >
                  You&apos;re clear for now.
                </Text>
                <Text
                  className="mt-0.5 text-[12px] leading-[18px] text-flint"
                  style={fontStyles.uiRegular}
                >
                  Open the live timeline whenever you&apos;re ready.
                </Text>
              </View>
            )}
          </View>

          {/* A little later */}
          {laterStop ? (
            <View className="mt-5">
              <SectionLabel>A little later</SectionLabel>
              <StopCard stop={laterStop} />
            </View>
          ) : null}

          {/* Along the way */}
          <View className="mt-5">
            <SectionLabel>Along the way</SectionLabel>
            <Pressable
              onPress={() =>
                router.push(`/(tabs)/trips/${activeTrip.id}/live` as Href)
              }
              className="flex-row items-center gap-3 rounded-[16px] border border-smoke bg-ivory px-4 py-3.5 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Log an unplanned stop"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-parchment">
                <Ionicons name="add" size={16} color="#8A7E74" />
              </View>
              <Text
                className="flex-1 text-[14px] leading-5 text-muted"
                style={fontStyles.uiRegular}
              >
                Saw something worth noting? Log a stop.
              </Text>
              <Ionicons name="chevron-forward" size={13} color="#C9BCA8" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── No active trip ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pb-3 pt-8">
          <Text
            className="text-[11px] uppercase tracking-[2px] text-muted"
            style={fontStyles.uiMedium}
          >
            Today
          </Text>
        </View>

        {nextUpcomingTrip ? (
          // ── Has upcoming trip ──────────────────────────────────────────────
          <>
            <View className="mt-2">
              <Text
                className="text-[28px] leading-[34px] text-espresso"
                style={fontStyles.displayMedium}
              >
                Between adventures.
              </Text>
              <Text
                className="mt-2 text-[14px] leading-[22px] text-muted"
                style={fontStyles.uiRegular}
              >
                Your live timeline will appear here when your trip kicks off.
              </Text>
            </View>

            <View className="mt-7 rounded-[16px] border border-smoke bg-ivory px-5 py-4">
              <Text
                className="mb-2 text-[11px] uppercase tracking-[1.5px] text-muted"
                style={fontStyles.uiMedium}
              >
                {daysUntilNextTrip === 1
                  ? "Tomorrow"
                  : daysUntilNextTrip != null
                    ? `In ${daysUntilNextTrip} days`
                    : "Coming up"}
              </Text>
              <Text
                className="text-[17px] leading-[22px] text-espresso"
                style={fontStyles.uiSemibold}
              >
                {nextUpcomingTrip.title}
              </Text>
              <Text
                className="mt-0.5 text-[13px] leading-5 text-muted"
                style={fontStyles.uiRegular}
              >
                {nextUpcomingTrip.destination}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/(tabs)/trips" as Href)}
              className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-full bg-espresso active:opacity-75"
              accessibilityRole="button"
              accessibilityLabel="Plan a trip"
            >
              <Text
                className="text-[14px] text-ivory"
                style={fontStyles.uiSemibold}
              >
                Plan a trip
              </Text>
            </Pressable>
          </>
        ) : (
          // ── True empty state ───────────────────────────────────────────────
          <View className="mt-10 items-center px-2">
            <Text
              className="text-center text-[30px] leading-[36px] text-espresso"
              style={fontStyles.displayMedium}
            >
              Nothing on the horizon yet.
            </Text>
            <Text
              className="mt-3 text-center text-[15px] leading-[24px] text-muted"
              style={fontStyles.uiRegular}
            >
              When you plan a trip, Today becomes your quiet travel companion
              {" — "}showing what&apos;s next, what&apos;s later, and what you
              discover along the way.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/trips" as Href)}
              className="mt-8 h-12 flex-row items-center justify-center gap-2 rounded-full bg-espresso px-8 active:opacity-75"
              accessibilityRole="button"
              accessibilityLabel="Plan a trip"
            >
              <Text
                className="text-[14px] text-ivory"
                style={fontStyles.uiSemibold}
              >
                Plan a trip
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
