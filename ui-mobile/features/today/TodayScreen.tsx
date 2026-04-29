// Path: ui-mobile/features/today/TodayScreen.tsx
// Summary: Implements TodayScreen module logic.

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, useRouter } from "expo-router";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getTripImageUrl } from "@/features/trips/workspace/helpers/tripVisuals";
import { splitStopTimeDisplay } from "@/features/trips/onTrip/presentation";
import type { TripOnTripStopSnapshot } from "@/features/trips/types";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import {
  buildStopDirectionsUrl,
  buildTodayHeroEyebrow,
  stopDetailRouteKey,
  todayMastheadKicker,
} from "./todayPresentation";
import { useTodayModel } from "./useTodayModel";

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

function HeroTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const titleMain = words.length > 1 ? words.slice(0, -1).join(" ") : "";
  const titleLast = words[words.length - 1] ?? title;
  return (
    <Text
      className="text-[#FAF3E5]"
      style={{
        fontFamily: fontStyles.headMedium.fontFamily,
        fontSize: 22,
        fontWeight: "500",
        letterSpacing: -0.4,
        lineHeight: 26,
      }}
      numberOfLines={3}
    >
      {words.length > 1 ? (
        <>
          {titleMain}{" "}
          <Text style={{ fontFamily: fontStyles.headMediumItalic.fontFamily }}>
            {titleLast}
          </Text>
        </>
      ) : (
        title
      )}
    </Text>
  );
}

function StopTimeRuleRow({
  stop,
  accentTime,
}: {
  stop: TripOnTripStopSnapshot;
  accentTime?: boolean;
}) {
  const { period, clock } = splitStopTimeDisplay(stop.time);
  const label = clock ?? period ?? stop.time?.trim() ?? "—";
  return (
    <View className="mb-2 flex-row items-baseline gap-3">
      <Text
        style={{
          fontFamily: fontStyles.monoMedium.fontFamily,
          fontSize: 11.5,
          letterSpacing: 0.5,
          color: accentTime ? DE.clay : DE.muted,
        }}
      >
        {label}
      </Text>
      <View
        className="h-px flex-1"
        style={{ backgroundColor: DE.rule }}
      />
    </View>
  );
}

function MomentSection({
  kicker,
  stop,
  variant,
  tripId,
  stops,
}: {
  kicker?: string;
  stop: TripOnTripStopSnapshot;
  variant: "next" | "later";
  tripId: number;
  stops: TripOnTripStopSnapshot[];
}) {
  const router = useRouter();
  const titleSize = variant === "next" ? 26 : 22;
  const lineHeight = variant === "next" ? 30 : 28;
  const body =
    stop.notes?.trim() || stop.location?.trim() || null;
  const directionsUrl = buildStopDirectionsUrl(stop);
  const detailKey = stopDetailRouteKey(stop, stops);

  return (
    <View className="pt-1">
      {kicker ? (
        <Text
          className="mb-4 uppercase"
          style={{
            fontFamily: fontStyles.monoMedium.fontFamily,
            fontSize: 9,
            letterSpacing: 2,
            color: DE.muted,
          }}
        >
          {kicker}
        </Text>
      ) : null}
      <StopTimeRuleRow stop={stop} accentTime={variant === "next"} />
      <Text
        className="mb-2.5 text-ontrip"
        style={{
          fontFamily: fontStyles.headMedium.fontFamily,
          fontSize: titleSize,
          fontWeight: "500",
          letterSpacing: -0.4,
          lineHeight,
          color: DE.ink,
        }}
        numberOfLines={4}
      >
        {stop.title}
      </Text>
      {body ? (
        <Text
          className="mb-3.5"
          style={{
            fontFamily: fontStyles.uiRegular.fontFamily,
            fontSize: variant === "next" ? 13.5 : 13,
            lineHeight: 22,
            color: variant === "next" ? DE.inkSoft : DE.muted,
          }}
          numberOfLines={8}
        >
          {body}
        </Text>
      ) : null}
      {variant === "next" ? (
        <View className="mt-1 flex-row flex-wrap items-center gap-2.5">
          {directionsUrl ? (
            <Pressable
              onPress={() => void Linking.openURL(directionsUrl)}
              className="rounded-full px-[18px] py-2.5 active:opacity-75"
              style={{ backgroundColor: DE.ink }}
              accessibilityRole="button"
              accessibilityLabel="Open directions for this stop"
            >
              <Text
                style={{
                  fontFamily: fontStyles.uiSemibold.fontFamily,
                  fontSize: 12.5,
                  color: DE.ivory,
                }}
              >
                Directions
              </Text>
            </Pressable>
          ) : null}
          {detailKey ? (
            <Pressable
              onPress={() =>
                router.push(
                  `/(tabs)/trips/${tripId}/stop/${encodeURIComponent(detailKey)}` as Href,
                )
              }
              className="rounded-full border px-[18px] py-2.5 active:opacity-75"
              style={{ borderColor: DE.ruleStrong, backgroundColor: "transparent" }}
              accessibilityRole="button"
              accessibilityLabel="Stop details"
            >
              <Text
                style={{
                  fontFamily: fontStyles.uiMedium.fontFamily,
                  fontSize: 12.5,
                  color: DE.ink,
                }}
              >
                Details
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SnapshotErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      className="mb-4 rounded-2xl border px-4 py-3"
      style={{ borderColor: DE.ruleStrong, backgroundColor: DE.paperWarm }}
    >
      <Text
        style={{
          fontFamily: fontStyles.uiRegular.fontFamily,
          fontSize: 13,
          lineHeight: 20,
          color: DE.inkSoft,
        }}
      >
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        className="mt-2.5 self-start"
        accessibilityRole="button"
        accessibilityLabel="Try loading today’s plan again"
      >
        <Text
          style={{
            fontFamily: fontStyles.uiSemibold.fontFamily,
            fontSize: 13,
            color: DE.clay,
          }}
        >
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

export function TodayScreen() {
  const router = useRouter();
  const {
    isLoading,
    activeTrip,
    nextUpcomingTrip,
    daysUntilNextTrip,
    nextStop,
    laterStop,
    snapshot,
    totalTripDays,
    snapshotIsError,
    snapshotErrorMessage,
    refetchSnapshot,
  } = useTodayModel();

  if (isLoading) return <ScreenLoading label="Loading…" />;

  if (activeTrip) {
    const imageUrl = getTripImageUrl({
      id: activeTrip.id,
      destination: activeTrip.destination,
    });
    const heroEyebrow = buildTodayHeroEyebrow(
      snapshot?.today.day_number,
      totalTripDays,
      activeTrip.destination,
    );
    const isLive = snapshot?.mode === "active";
    const todayStops = snapshot?.today_stops ?? [];

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

          {snapshotIsError && snapshotErrorMessage ? (
            <SnapshotErrorBanner
              message={snapshotErrorMessage}
              onRetry={() => void refetchSnapshot()}
            />
          ) : null}

          <View
            className="overflow-hidden rounded-[18px] border"
            style={{ borderColor: DE.rule, backgroundColor: DE.paper }}
          >
            <View className="h-[130px] w-full overflow-hidden">
              <Image
                source={{ uri: imageUrl }}
                className="h-full w-full"
                contentFit="cover"
              />
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0)",
                  "rgba(20,10,5,0.75)",
                ]}
                locations={[0.2, 1]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              />
              {isLive ? (
                <View
                  className="absolute right-3.5 top-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ backgroundColor: "rgba(35,15,10,0.55)" }}
                >
                  <View
                    className="h-1.5 w-1.5 rounded-full"
                    style={
                      Platform.OS === "web"
                        ? {
                            backgroundColor: DE.claySoft,
                            boxShadow: "0 0 0 4px rgba(216, 154, 124, 0.2)",
                          }
                        : {
                            backgroundColor: DE.claySoft,
                            shadowColor: DE.claySoft,
                            shadowOpacity: 0.4,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 0 },
                          }
                    }
                  />
                  <Text
                    className="uppercase text-[#FAF3E5]"
                    style={{
                      fontFamily: fontStyles.monoRegular.fontFamily,
                      fontSize: 9,
                      letterSpacing: 1.6,
                    }}
                  >
                    Live
                  </Text>
                </View>
              ) : null}
              <View className="absolute bottom-3.5 left-[18px] right-[70px]">
                <Text
                  className="mb-1 text-[#FAF3E5]/80"
                  style={{
                    fontFamily: fontStyles.monoRegular.fontFamily,
                    fontSize: 9,
                    letterSpacing: 2.2,
                    textTransform: "uppercase",
                  }}
                  numberOfLines={2}
                >
                  {heroEyebrow}
                </Text>
                <HeroTitle title={activeTrip.title} />
              </View>
            </View>

            <View className="px-4 py-3.5">
              <Pressable
                onPress={() =>
                  router.push(`/(tabs)/trips/${activeTrip.id}/live` as Href)
                }
                className="h-11 flex-row items-center justify-center gap-2 rounded-[10px] active:opacity-75"
                style={{ backgroundColor: DE.ink }}
                accessibilityRole="button"
                accessibilityLabel="Open On-Trip live timeline"
              >
                <Ionicons name="arrow-forward" size={14} color={DE.ivory} />
                <Text
                  style={{
                    fontFamily: fontStyles.uiSemibold.fontFamily,
                    fontSize: 13.5,
                    color: DE.ivory,
                  }}
                >
                  Open On-Trip
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            className="my-7 h-px w-full"
            style={{ backgroundColor: DE.rule }}
          />

          <View>
            {nextStop ? (
              <MomentSection
                kicker="Next moment"
                stop={nextStop}
                variant="next"
                tripId={activeTrip.id}
                stops={todayStops}
              />
            ) : (
              <>
                <Text
                  className="mb-4 uppercase"
                  style={{
                    fontFamily: fontStyles.monoMedium.fontFamily,
                    fontSize: 9,
                    letterSpacing: 2,
                    color: DE.muted,
                  }}
                >
                  Next moment
                </Text>
              <View>
                <Text
                  style={{
                    fontFamily: fontStyles.uiRegular.fontFamily,
                    fontSize: 14,
                    lineHeight: 21,
                    color: DE.muted,
                  }}
                >
                  You&apos;re clear for now.
                </Text>
                <Text
                  className="mt-1"
                  style={{
                    fontFamily: fontStyles.uiRegular.fontFamily,
                    fontSize: 12,
                    lineHeight: 18,
                    color: DE.mutedLight,
                  }}
                >
                  Open the live timeline whenever you&apos;re ready.
                </Text>
              </View>
              </>
            )}
          </View>

          {laterStop ? (
            <View className="mt-8">
              <MomentSection
                kicker="A little later"
                stop={laterStop}
                variant="later"
                tripId={activeTrip.id}
                stops={todayStops}
              />
            </View>
          ) : null}

          <View className="mt-8 pb-2">
            <Pressable
              onPress={() =>
                router.push(`/(tabs)/trips/${activeTrip.id}/live` as Href)
              }
              className="flex-row items-center gap-4 rounded-2xl border border-dashed px-5 py-5 active:opacity-75"
              style={{ borderColor: DE.ruleStrong, backgroundColor: "transparent" }}
              accessibilityRole="button"
              accessibilityLabel="Along the way — open live trip to log a stop"
            >
              <View className="min-w-0 flex-1">
                <Text
                  style={{
                    fontFamily: fontStyles.headMediumItalic.fontFamily,
                    fontSize: 17,
                    letterSpacing: -0.2,
                    color: DE.ink,
                    marginBottom: 4,
                  }}
                >
                  Along the way
                </Text>
                <Text
                  style={{
                    fontFamily: fontStyles.uiRegular.fontFamily,
                    fontSize: 12.5,
                    lineHeight: 20,
                    color: DE.muted,
                  }}
                >
                  Found something unexpected? Add it to the story.
                </Text>
              </View>
              <View
                className="h-[38px] w-[38px] items-center justify-center rounded-full"
                style={{ backgroundColor: DE.ink }}
              >
                <Ionicons name="add" size={18} color={DE.ivory} />
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
                Your live timeline will appear here when your trip kicks off.
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
                  (EXPLORE_ENABLED ? "/(tabs)/explore" : "/(tabs)/trips") as Href,
                )
              }
              className="mt-2.5 h-[50px] items-center justify-center rounded-xl border active:opacity-75"
              style={{ borderColor: DE.ruleStrong, backgroundColor: "transparent" }}
              accessibilityRole="button"
              accessibilityLabel={
                EXPLORE_ENABLED ? "Browse inspiration in Explore" : "View your trips"
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
              <Text style={{ fontFamily: fontStyles.headMediumItalic.fontFamily }}>
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
                  (EXPLORE_ENABLED ? "/(tabs)/explore" : "/(tabs)/trips") as Href,
                )
              }
              className="mt-2.5 h-[50px] items-center justify-center rounded-xl border active:opacity-75"
              style={{ borderColor: DE.ruleStrong, backgroundColor: "transparent" }}
              accessibilityRole="button"
              accessibilityLabel={
                EXPLORE_ENABLED ? "Browse inspiration in Explore" : "View your trips"
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
