import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { TripWorkspaceViewModel } from "./adapters";
import { getTripImageUrl } from "./helpers/tripVisuals";

type Props = {
  trip: TripWorkspaceViewModel;
  /** Tap image to open the trip switcher. */
  onTripPress: () => void;
  onEditPress: () => void;
  onCreatePress: () => void;
  onMembersPress: () => void;
  showMembersButton?: boolean;
};

export function WorkspaceTripHeader({
  trip,
  onTripPress,
  onEditPress,
  onCreatePress,
  onMembersPress,
  showMembersButton = true,
}: Props) {
  const imageUrl = getTripImageUrl({ id: trip.id, destination: trip.destination });

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={["rgba(43,33,26,0.25)", "transparent", "rgba(43,33,26,0.70)"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View className="absolute left-3 right-3 top-3 flex-row items-center justify-between">
        <Pressable
          onPress={onTripPress}
          accessibilityRole="button"
          accessibilityLabel="Switch trips"
          className="max-w-[190px] flex-row items-center gap-1.5 rounded-full border border-divider bg-ivory/90 px-3 py-1.5 active:opacity-80"
        >
          <Text
            className="text-[12px] leading-[18px] text-espresso"
            style={fontStyles.uiMedium}
            numberOfLines={1}
          >
            {trip.title}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#2B211A" />
        </Pressable>

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
      </View>

      <View className="absolute bottom-3 left-4 right-4">
        <Text
          className="text-[22px] leading-[24px] text-white"
          style={fontStyles.displayMedium}
          numberOfLines={1}
        >
          {trip.title}
        </Text>
        <Text className="mt-0.5 text-[12px] leading-[18px] text-white/90">
          {trip.dateRange} · {trip.memberCount}{" "}
          {trip.memberCount === 1 ? "traveler" : "travelers"}
        </Text>
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
      style={{
        backgroundColor: "rgba(253,250,243,0.85)",
        borderWidth: 1,
        borderColor: "#E6DCCB",
      }}
    >
      <Ionicons name={icon} size={14} color="#2B211A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140,
    overflow: "hidden",
  },
});
