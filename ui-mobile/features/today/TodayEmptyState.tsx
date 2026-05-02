// Path: ui-mobile/features/today/TodayEmptyState.tsx
// Summary: Empty/upcoming Today tab when no trip is active today.

import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TripResponse } from "@/features/trips/types";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

import { todayMastheadKicker } from "./todayPresentation";

const EXPLORE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_EXPLORE === "true";

function TodayMasthead() {
  return (
    <View className="pb-5" style={{ paddingTop: 6 }}>
      <Text
        className="uppercase"
        style={{
          fontFamily: fontStyles.monoMedium.fontFamily,
          fontSize: 11,
          letterSpacing: 2.2,
          color: DE.muted,
        }}
      >
        {todayMastheadKicker()}
      </Text>
      <Text
        className="mt-2.5 text-ontrip"
        style={{
          fontFamily: fontStyles.headMedium.fontFamily,
          fontSize: 38,
          fontWeight: "500",
          letterSpacing: -0.8,
          lineHeight: 40,
          color: DE.ink,
        }}
      >
        Today
      </Text>
    </View>
  );
}

export type TodayEmptyStateProps = {
  nextUpcomingTrip: TripResponse | null;
  daysUntilNextTrip: number | null;
};

export function TodayEmptyState({
  nextUpcomingTrip,
  daysUntilNextTrip,
}: TodayEmptyStateProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface-ontrip" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 100,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TodayMasthead />

        {nextUpcomingTrip ? (
          <>
            <View className="mt-1">
              <Text
                style={{
                  fontFamily: fontStyles.headMedium.fontFamily,
                  fontSize: 28,
                  fontWeight: "500",
                  letterSpacing: -0.5,
                  lineHeight: 34,
                  color: DE.ink,
                }}
              >
                Between adventures.
              </Text>
              <Text
                className="mt-2"
                style={{
                  fontFamily: fontStyles.uiRegular.fontFamily,
                  fontSize: 14,
                  lineHeight: 22,
                  color: DE.muted,
                }}
              >
                Today will appear here when your trip kicks off.
              </Text>
            </View>

            <View
              className="mt-7 rounded-2xl border px-5 py-4"
              style={{ borderColor: DE.rule, backgroundColor: DE.paper }}
            >
              <Text
                className="mb-2 uppercase"
                style={{
                  fontFamily: fontStyles.monoMedium.fontFamily,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: DE.muted,
                }}
              >
                {daysUntilNextTrip === 1
                  ? "Tomorrow"
                  : daysUntilNextTrip != null
                    ? `In ${daysUntilNextTrip} days`
                    : "Coming up"}
              </Text>
              <Text
                style={{
                  fontFamily: fontStyles.headMedium.fontFamily,
                  fontSize: 22,
                  fontWeight: "500",
                  letterSpacing: -0.3,
                  lineHeight: 28,
                  color: DE.ink,
                }}
                numberOfLines={3}
              >
                {nextUpcomingTrip.title}
              </Text>
              <Text
                className="mt-1"
                style={{
                  fontFamily: fontStyles.uiRegular.fontFamily,
                  fontSize: 12.5,
                  lineHeight: 20,
                  color: DE.muted,
                }}
                numberOfLines={2}
              >
                {nextUpcomingTrip.destination}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/(tabs)/trips" as Href)}
              className="mt-5 h-[50px] items-center justify-center rounded-xl active:opacity-75"
              style={{ backgroundColor: DE.ink }}
              accessibilityRole="button"
              accessibilityLabel="Plan a trip"
            >
              <Text
                style={{
                  fontFamily: fontStyles.uiSemibold.fontFamily,
                  fontSize: 14,
                  color: DE.ivory,
                }}
              >
                Plan a trip
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push(
                  (EXPLORE_ENABLED
                    ? "/(tabs)/explore"
                    : "/(tabs)/trips") as Href,
                )
              }
              className="mt-2.5 h-[50px] items-center justify-center rounded-xl border active:opacity-75"
              style={{
                borderColor: DE.ruleStrong,
                backgroundColor: "transparent",
              }}
              accessibilityRole="button"
              accessibilityLabel={
                EXPLORE_ENABLED
                  ? "Browse inspiration in Explore"
                  : "View your trips"
              }
            >
              <Text
                style={{
                  fontFamily: fontStyles.uiMedium.fontFamily,
                  fontSize: 14,
                  color: DE.ink,
                }}
              >
                {EXPLORE_ENABLED ? "Browse inspiration" : "View trips"}
              </Text>
            </Pressable>
          </>
        ) : (
          <View className="pt-12">
            <Text
              style={{
                fontFamily: fontStyles.headMedium.fontFamily,
                fontSize: 30,
                fontWeight: "500",
                letterSpacing: -0.5,
                lineHeight: 36,
                color: DE.ink,
              }}
            >
              Nothing on the{" "}
              <Text
                style={{ fontFamily: fontStyles.headMediumItalic.fontFamily }}
              >
                horizon
              </Text>{" "}
              yet
            </Text>
            <Text
              className="mt-5 max-w-[300px]"
              style={{
                fontFamily: fontStyles.uiRegular.fontFamily,
                fontSize: 14,
                lineHeight: 24,
                color: DE.muted,
              }}
            >
              When you plan a trip, Today becomes your quiet travel companion —
              showing what&apos;s next, what&apos;s later, and what you discover
              along the way.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/trips" as Href)}
              className="mt-9 h-[50px] items-center justify-center rounded-xl active:opacity-75"
              style={{ backgroundColor: DE.ink }}
              accessibilityRole="button"
              accessibilityLabel="Plan a trip"
            >
              <Text
                style={{
                  fontFamily: fontStyles.uiSemibold.fontFamily,
                  fontSize: 14,
                  color: DE.ivory,
                }}
              >
                Plan a trip
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push(
                  (EXPLORE_ENABLED
                    ? "/(tabs)/explore"
                    : "/(tabs)/trips") as Href,
                )
              }
              className="mt-2.5 h-[50px] items-center justify-center rounded-xl border active:opacity-75"
              style={{
                borderColor: DE.ruleStrong,
                backgroundColor: "transparent",
              }}
              accessibilityRole="button"
              accessibilityLabel={
                EXPLORE_ENABLED
                  ? "Browse inspiration in Explore"
                  : "View your trips"
              }
            >
              <Text
                style={{
                  fontFamily: fontStyles.uiMedium.fontFamily,
                  fontSize: 14,
                  color: DE.ink,
                }}
              >
                {EXPLORE_ENABLED ? "Browse inspiration" : "View trips"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
