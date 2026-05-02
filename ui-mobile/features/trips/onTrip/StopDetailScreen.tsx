// Path: ui-mobile/features/trips/onTrip/StopDetailScreen.tsx
// Summary: Implements StopDetailScreen module logic.

import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  useOnTripSnapshotQuery,
  useTripDetailQuery,
} from "@/features/trips/hooks";
import { formatTripStopTime } from "@/features/trips/stopTime";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import { useAuth } from "@/providers/AuthProvider";

import type { TripExecutionStatus } from "../types";
import { toStopVmForDetail } from "./adapters";
import { useOnTripMutations } from "./hooks";
import {
  normalizeDirectionsDestination,
  openStopDirections,
} from "./mapNavigation";
import {
  READ_ONLY_TRIP_BODY,
  READ_ONLY_TRIP_TITLE,
} from "../workspace/helpers/collaborationGate";

const TODAY_EXECUTION_HREF = "/(tabs)/today" as Href;

type Props = {
  tripId: number;
  stopKey: string;
};

export function StopDetailScreen({ tripId, stopKey }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const snapshotQuery = useOnTripSnapshotQuery(tripId);
  const tripQuery = useTripDetailQuery(tripId);

  const mutations = useOnTripMutations({
    tripId,
    snapshot: snapshotQuery.data ?? null,
    onSnapshotRefresh: () => {},
    currentUser: user,
  });

  const stop = useMemo(() => {
    const snapshot = snapshotQuery.data;
    if (!snapshot) return null;
    const decodedKey = decodeURIComponent(stopKey);
    // Match by stop_ref first, then by synthetic "stop-{index}" key
    let raw = snapshot.today_stops.find((s) => s.stop_ref === decodedKey);
    if (!raw) {
      const idx = parseInt(decodedKey.replace("stop-", ""), 10);
      if (!Number.isNaN(idx)) raw = snapshot.today_stops[idx];
    }
    if (!raw) return null;
    const isPending = raw.stop_ref
      ? (mutations.statusPending[raw.stop_ref] ?? false)
      : false;
    return toStopVmForDetail(raw, isPending, snapshot.read_only);
  }, [snapshotQuery.data, stopKey, mutations.statusPending]);

  const members = useMemo(() => {
    const trip = tripQuery.data;
    if (!trip) return [];
    return trip.members.filter(
      (m) => m.role === "owner" || m.status === "accepted",
    );
  }, [tripQuery.data]);

  const isCollaborationActive = members.length > 1;

  if (snapshotQuery.isLoading) return <ScreenLoading label="Loading stop..." />;

  if (snapshotQuery.isError || !stop) {
    return (
      <ScreenError
        message="We couldn't load this stop. Try going back and tapping again."
        onRetry={() => void snapshotQuery.refetch()}
      />
    );
  }

  const effectiveStatus = stop.effectiveStatus;
  const isReadOnly = stop.isReadOnly;
  const isPending = stop.isPending;
  const navigationDestination = normalizeDirectionsDestination(stop.location);

  const handleStatus = (target: TripExecutionStatus) => {
    if (!stop.stop_ref) return;
    void mutations.setStopStatus(stop.stop_ref, target);
    router.replace(TODAY_EXECUTION_HREF);
  };

  const statusKicker =
    effectiveStatus === "confirmed"
      ? "Confirmed"
      : effectiveStatus === "skipped"
        ? "Skipped"
        : "Happening now";

  const kickerColor =
    effectiveStatus === "confirmed"
      ? DE.sageDeep
      : effectiveStatus === "skipped"
        ? DE.muted
        : DE.clay;

  // Split title so the last word gets italic treatment
  const titleWords = (stop.title?.trim() ?? "Untitled stop").split(" ");
  const titleMain = titleWords.slice(0, -1).join(" ");
  const titleLast = titleWords[titleWords.length - 1] ?? "";

  const timeKicker = stop.time ? formatTripStopTime(stop.time) : null;

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: DE.ivory }}
    >
      {/* Detail top bar */}
      <View
        className="flex-row items-center justify-between px-5 py-3"
        style={{
          backgroundColor: DE.ivory,
          borderBottomWidth: 1,
          borderBottomColor: DE.rule,
        }}
      >
        <Pressable
          onPress={() => router.replace(TODAY_EXECUTION_HREF)}
          hitSlop={12}
          className="flex-row items-center gap-1.5 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Back to Today"
        >
          <Ionicons name="chevron-back" size={14} color={DE.muted} />
          <Text
            style={[
              fontStyles.monoRegular,
              {
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: DE.muted,
              },
            ]}
          >
            Today
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          {effectiveStatus !== "skipped" ? (
            <View
              className="h-[5px] w-[5px] rounded-full"
              style={{ backgroundColor: kickerColor }}
            />
          ) : null}
          <Text
            style={[
              fontStyles.monoMedium,
              {
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: kickerColor,
              },
            ]}
          >
            {statusKicker}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Kicker */}
        {stop.time ? (
          <View className="mt-5">
            <Text
              style={[
                fontStyles.monoMedium,
                {
                  fontSize: 10,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                  color: DE.clay,
                },
              ]}
            >
              {timeKicker}
            </Text>
          </View>
        ) : null}

        {/* Hero title */}
        <View className="mt-4 mb-2">
          <Text
            style={[
              fontStyles.headMedium,
              {
                fontSize: 44,
                lineHeight: 48,
                letterSpacing: -1,
                color: DE.ink,
              },
            ]}
          >
            {titleMain ? `${titleMain} ` : ""}
            <Text style={fontStyles.headMediumItalic}>{titleLast}.</Text>
          </Text>
        </View>

        {/* Location / description */}
        {stop.location ? (
          <Text
            style={[
              fontStyles.headMediumItalic,
              {
                fontSize: 17,
                lineHeight: 24,
                color: DE.muted,
                marginBottom: 22,
              },
            ]}
          >
            {stop.location}
          </Text>
        ) : (
          <View className="mb-5" />
        )}

        {stop.statusActionDetailLabel ? (
          <View
            className="mb-4 rounded-[12px] border px-4 py-3"
            style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
          >
            <Text
              style={[
                fontStyles.monoRegular,
                {
                  fontSize: 9,
                  letterSpacing: 1.8,
                  textTransform: "uppercase",
                  color: DE.muted,
                },
              ]}
            >
              Status
            </Text>
            <Text
              className="mt-1"
              style={[fontStyles.uiRegular, { fontSize: 13, color: DE.inkSoft }]}
            >
              {stop.statusActionDetailLabel}
            </Text>
          </View>
        ) : null}

        {/* Primary action: Navigate */}
        {navigationDestination ? (
          <Pressable
            onPress={() => void openStopDirections(navigationDestination)}
            className="mb-3 h-[60px] flex-row items-center justify-center gap-2.5 rounded-[14px] active:opacity-90"
            style={{ backgroundColor: DE.ink }}
            accessibilityRole="button"
            accessibilityLabel="Navigate to this stop"
          >
            <Ionicons name="navigate" size={16} color={DE.ivory} />
            <Text
              style={[
                fontStyles.uiSemibold,
                { fontSize: 15, color: DE.ivory, letterSpacing: 0.2 },
              ]}
            >
              Navigate{stop.location ? " · route" : ""}
            </Text>
          </Pressable>
        ) : null}

        {/* Stop actions */}
        {isReadOnly ? (
          <View
            className="mb-6 flex-row items-start gap-2.5 rounded-[12px] border px-4 py-3"
            style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${READ_ONLY_TRIP_TITLE}. ${READ_ONLY_TRIP_BODY}`}
          >
            <Ionicons
              name="lock-closed-outline"
              size={12}
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
        ) : stop.stop_ref ? (
          <View className="mb-6 flex-row flex-wrap gap-2.5">
            <AtomicAction
              label="I'm here"
              sub={effectiveStatus === "confirmed" ? "Confirmed" : "Start stop"}
              active={effectiveStatus === "confirmed"}
              disabled={isPending}
              onPress={() => handleStatus("confirmed")}
            />
            <AtomicAction
              label="Skip this"
              sub={effectiveStatus === "skipped" ? "Skipped" : "Mark skipped"}
              active={effectiveStatus === "skipped"}
              disabled={isPending}
              onPress={() => handleStatus("skipped")}
            />
          </View>
        ) : null}

        {/* Crew status — collaboration only */}
        {isCollaborationActive ? (
          <View
            className="mb-5 rounded-[14px]"
            style={{
              padding: 16,
              backgroundColor: DE.paper,
              borderWidth: 1,
              borderColor: DE.rule,
            }}
          >
            <Text
              style={[
                fontStyles.monoRegular,
                {
                  fontSize: 9,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                  color: DE.muted,
                  marginBottom: 12,
                },
              ]}
            >
              With you
            </Text>
            <View className="gap-2.5">
              {members.map((m, index) => (
                <View key={m.user_id} className="flex-row items-center gap-3">
                  <MemberAvatar email={m.email} index={index} />
                  <Text
                    className="flex-1"
                    style={[
                      fontStyles.uiRegular,
                      { fontSize: 14, color: DE.ink },
                    ]}
                  >
                    {formatMemberName(m.email)}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <View
                      className="h-[5px] w-[5px] rounded-full"
                      style={{ backgroundColor: DE.sageDeep }}
                    />
                    <Text
                      style={[
                        fontStyles.monoRegular,
                        {
                          fontSize: 10,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          color: DE.sageDeep,
                        },
                      ]}
                    >
                      Today
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="mb-4">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons
              name="lock-closed-outline"
              size={10}
              color={DE.mutedLight}
            />
            <Text
              style={[
                fontStyles.monoRegular,
                {
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: DE.mutedLight,
                },
              ]}
            >
              From the plan · not editable here
            </Text>
          </View>
          <Text
            style={[
              fontStyles.headMediumItalic,
              {
                fontSize: 16,
                lineHeight: 24,
                color: DE.inkSoft,
                paddingLeft: 14,
                borderLeftWidth: 2,
                borderLeftColor: DE.rule,
              },
            ]}
          >
            Plan notes and deeper edits belong in Plan.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AtomicAction({
  label,
  sub,
  active,
  disabled,
  onPress,
}: {
  label: string;
  sub: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: "45%",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: active ? DE.claySandLight : DE.paper,
        borderWidth: 1,
        borderColor: active ? DE.claySoft : DE.rule,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[fontStyles.uiSemibold, { fontSize: 14, color: DE.ink }]}>
        {label}
      </Text>
      <Text
        style={[
          fontStyles.uiRegular,
          { fontSize: 11, color: DE.muted, marginTop: 3 },
        ]}
      >
        {sub}
      </Text>
    </Pressable>
  );
}

function MemberAvatar({ email, index }: { email: string; index: number }) {
  const initials = email.slice(0, 2).toUpperCase();
  const tone = [DE.ink, DE.clay, DE.inkSoft, DE.sage][index % 4] ?? DE.ink;
  return (
    <View
      className="h-[26px] w-[26px] items-center justify-center rounded-full"
      style={{ backgroundColor: tone }}
    >
      <Text style={[fontStyles.uiSemibold, { fontSize: 9, color: DE.ivory }]}>
        {initials}
      </Text>
    </View>
  );
}

function formatMemberName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  return name || email;
}
