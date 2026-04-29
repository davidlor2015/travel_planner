// Path: ui-mobile/features/trips/workspace/WorkspaceTripHeader.tsx
// Summary: Implements WorkspaceTripHeader module logic.

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

import type { TripWorkspaceViewModel } from "./adapters";
import { getTripImageUrl } from "./helpers/tripVisuals";

type Props = {
  trip: TripWorkspaceViewModel;
  onTripPress: () => void;
  onEditPress: () => void;
  onCreatePress: () => void;
  onMembersPress: () => void;
  showMembersButton?: boolean;
  compact?: boolean;
};

const AVATAR_TONES = [DE.ink, DE.clay, DE.inkSoft, DE.sageDeep];

function MemberAvatar({ email, index }: { email: string; index: number }) {
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: AVATAR_TONES[index % AVATAR_TONES.length],
        alignItems: "center",
        justifyContent: "center",
        marginLeft: index > 0 ? -7 : 0,
        borderWidth: 1.5,
        borderColor: "rgba(242, 235, 221, 0.70)",
      }}
    >
      <Text style={[fontStyles.uiSemibold, { fontSize: 8, color: DE.ivory }]}>
        {initials}
      </Text>
    </View>
  );
}

export function WorkspaceTripHeader({
  trip,
  onTripPress,
  onEditPress,
  onCreatePress,
  onMembersPress,
  showMembersButton = true,
  compact = false,
}: Props) {
  const imageUrl = getTripImageUrl({ id: trip.id, destination: trip.destination });

  // Split last word for italic treatment
  const words = trip.title.trim().split(" ");
  const titleMain = words.length > 1 ? words.slice(0, -1).join(" ") : "";
  const titleLast = words[words.length - 1] ?? trip.title;

  const durationLabel = `${trip.durationDays} ${trip.durationDays === 1 ? "day" : "days"}`;
  const travelerLabel = `${trip.memberCount} ${trip.memberCount === 1 ? "traveler" : "travelers"}`;
  const kickerText = `${durationLabel} · ${travelerLabel}`.toUpperCase();

  const avatarMembers = trip.members.slice(0, 3);

  return (
    <View style={[styles.container, compact ? styles.compactContainer : undefined]}>
      {/* Fallback gradient — visible when the hero image fails to load */}
      <LinearGradient
        colors={["#B86845", "#7A4F35", "#1C1108"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={200}
      />
      {/* Gradient: light at top (for chrome), dark at bottom (for title) */}
      <LinearGradient
        colors={["rgba(35, 25, 16, 0.35)", "transparent", "rgba(35, 25, 16, 0.82)"]}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top chrome: trip switcher + action icons */}
      <View className="absolute left-3 right-3 top-3 flex-row items-center justify-between">
        <Pressable
          onPress={onTripPress}
          accessibilityRole="button"
          accessibilityLabel="Switch trips"
          className="max-w-[190px] flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-80"
          style={{ backgroundColor: "rgba(35, 25, 16, 0.50)" }}
        >
          <Text
            className="text-[12px] leading-[18px]"
            style={[fontStyles.uiMedium, { color: DE.paper }]}
            numberOfLines={1}
          >
            {trip.title}
          </Text>
          <Ionicons name="chevron-down" size={13} color="rgba(250, 245, 234, 0.85)" />
        </Pressable>

        {!compact ? (
          <View className="flex-row items-center gap-2">
            {showMembersButton ? (
              <GlassButton
                icon="people-outline"
                onPress={onMembersPress}
                accessibilityLabel="View trip members"
              />
            ) : (
              <GlassButton
                icon="add-outline"
                onPress={onCreatePress}
                accessibilityLabel="Create a new trip"
              />
            )}
            <GlassButton
              icon="pencil-outline"
              onPress={onEditPress}
              accessibilityLabel="Edit trip details"
            />
          </View>
        ) : null}
      </View>

      {/* Bottom: kicker + title + date + avatars */}
      <View className={compact ? "absolute bottom-4 left-5 right-5" : "absolute bottom-4 left-4 right-4"} style={{ gap: compact ? 5 : 6 }}>
        {!compact ? (
          <Text
            style={[
              textScaleStyles.caption,
              { color: "rgba(242, 235, 221, 0.80)", letterSpacing: 2.2, fontSize: 9.5 },
            ]}
          >
            {kickerText}
          </Text>
        ) : null}

        {/* Title with italic last word */}
        <Text
          style={{ lineHeight: compact ? 32 : 42 }}
          numberOfLines={2}
        >
          <Text
            style={[
              fontStyles.headMedium,
              {
                fontSize: compact ? 30 : 38,
                color: DE.paper,
                letterSpacing: compact ? -0.5 : -0.8,
                lineHeight: compact ? 32 : 42,
              },
            ]}
          >
            {titleMain ? `${titleMain} ` : ""}
          </Text>
          <Text
            style={[
              fontStyles.headMediumItalic,
              {
                fontSize: compact ? 30 : 38,
                color: DE.paper,
                letterSpacing: compact ? -0.5 : -0.8,
                lineHeight: compact ? 32 : 42,
              },
            ]}
          >
            {titleLast}
          </Text>
        </Text>

        {/* Date + avatar stack */}
        <View className="flex-row items-center" style={{ gap: 10, marginTop: 2 }}>
          <Text
            style={[fontStyles.uiRegular, { fontSize: 12, color: "rgba(242, 235, 221, 0.85)" }]}
          >
            {compact ? `${trip.dateRange} · ${travelerLabel}` : trip.dateRange}
          </Text>
          {!compact && avatarMembers.length > 0 && (
            <View className="flex-row">
              {avatarMembers.map((m, i) => (
                <MemberAvatar key={m.email} email={m.email} index={i} />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function GlassButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-8 w-8 items-center justify-center rounded-full active:opacity-80"
      style={{ backgroundColor: "rgba(35, 25, 16, 0.50)" }}
    >
      <Ionicons name={icon} size={14} color="rgba(250, 245, 234, 0.90)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
    overflow: "hidden",
  },
  compactContainer: {
    height: 180,
  },
});
