import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TripWorkspaceViewModel } from "./adapters";
import { getTripImageUrl } from "./helpers/tripVisuals";

type Props = {
  trip: TripWorkspaceViewModel;
  /** Tap image to open the trip switcher. */
  onTripPress: () => void;
  onEditPress: () => void;
  onCreatePress: () => void;
  onMembersPress: () => void;
};

export function WorkspaceTripHeader({
  trip,
  onTripPress,
  onEditPress,
  onCreatePress,
  onMembersPress,
}: Props) {
  const imageUrl = getTripImageUrl({ id: trip.id, destination: trip.destination });

  return (
    <Pressable onPress={onTripPress} style={styles.container}>
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.20)", "transparent", "rgba(10,5,2,0.44)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Status badge — top left */}
      {trip.status !== "past" && (
        <View className="absolute left-4 top-4">
          <View
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.32)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
            }}
          >
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: trip.status === "active" ? "#4ADE80" : "#FCD34D",
              }}
            />
            <Text className="text-[11px] font-semibold text-white/85">
              {trip.status === "active" ? "In Progress" : "Upcoming"}
            </Text>
          </View>
        </View>
      )}

      {/* Action buttons — top right */}
      <View className="absolute right-4 top-4 flex-row items-center gap-2">
        <GlassButton
          icon="add-outline"
          onPress={onCreatePress}
          accessibilityLabel="Create a new trip"
        />
        <GlassButton
          icon="people-outline"
          onPress={onMembersPress}
          accessibilityLabel="View trip members"
        />
        <GlassButton
          icon="pencil-outline"
          onPress={onEditPress}
          accessibilityLabel="Edit trip details"
        />
      </View>
    </Pressable>
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
      className="h-10 w-10 items-center justify-center rounded-xl active:opacity-80"
      style={{
        backgroundColor: "rgba(0,0,0,0.35)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.20)",
      }}
    >
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.90)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 190,
    overflow: "hidden",
  },
});
