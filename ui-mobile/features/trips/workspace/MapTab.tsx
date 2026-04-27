import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { fontStyles } from "@/shared/theme/typography";

import { useWorkspaceMapModel } from "./useWorkspaceMapModel";

type Props = {
  tripId: number;
};

const MARKER_COLOR: Record<"accent" | "olive" | "muted", string> = {
  accent: "#B9714F",
  olive: "#6F7A4A",
  muted: "#8A7E72",
};

function markerClassName(tone: "accent" | "olive" | "muted"): string {
  if (tone === "accent") return "bg-accent";
  if (tone === "olive") return "bg-olive";
  return "bg-muted";
}

function MapBackdrop() {
  return (
    <View className="absolute inset-0">
      <View className="absolute inset-0 bg-[#F3EFE6]" />

      <LinearGradient
        colors={["rgba(180,183,168,0.55)", "rgba(180,183,168,0.0)"]}
        style={{
          position: "absolute",
          left: 16,
          top: 72,
          width: 160,
          height: 130,
          borderRadius: 999,
        }}
      />
      <LinearGradient
        colors={["rgba(185,173,164,0.52)", "rgba(185,173,164,0.0)"]}
        style={{
          position: "absolute",
          left: 172,
          top: 170,
          width: 165,
          height: 145,
          borderRadius: 999,
        }}
      />
      <LinearGradient
        colors={["rgba(196,188,172,0.48)", "rgba(196,188,172,0.0)"]}
        style={{
          position: "absolute",
          left: 68,
          top: 288,
          width: 260,
          height: 190,
          borderRadius: 999,
        }}
      />

      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0 }}
      >
        <Path
          d="M-10 18 C 15 8, 34 11, 53 24 C 70 34, 84 42, 110 36"
          stroke="#E9E2D4"
          strokeWidth="0.45"
          fill="none"
        />
        <Path
          d="M-8 60 C 14 50, 36 52, 56 66 C 74 79, 88 86, 108 77"
          stroke="#E3DBCC"
          strokeWidth="0.5"
          fill="none"
        />
        <Path
          d="M8 20 C 15 39, 26 48, 39 60 C 47 68, 53 80, 52 102"
          stroke="#EBE5D9"
          strokeWidth="0.45"
          fill="none"
        />
        <Path
          d="M66 12 C 64 31, 68 45, 80 60 C 89 70, 95 84, 96 100"
          stroke="#E8E1D3"
          strokeWidth="0.45"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function MapTab({ tripId }: Props) {
  const map = useWorkspaceMapModel({ tripId });

  if (map.isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <ActivityIndicator color="#B86845" />
      </View>
    );
  }

  if (map.error) {
    return (
      <View className="mx-5 mt-5 rounded-[16px] border border-danger/20 bg-danger/5 px-4 py-4">
        <Text className="text-[13px] leading-5 text-danger" style={fontStyles.uiRegular}>
          {map.error}
        </Text>
      </View>
    );
  }

  if (!map.hasItinerary || map.isMissing) {
    return (
      <View className="mx-5 mt-5 rounded-[16px] border border-divider bg-ivory px-4 py-5">
        <Text className="text-[13px] leading-5 text-muted" style={fontStyles.uiRegular}>
          Save an itinerary first to unlock the trip map.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="h-[460px] overflow-hidden border-b border-border">
        <MapBackdrop />

        <View className="absolute left-3 right-3 top-3 flex-row items-center gap-2 rounded-[14px] border border-border bg-bg-app/95 px-3 py-2.5">
          <Ionicons name="search-outline" size={15} color="#8A7E72" />
          <TextInput
            value={map.query}
            onChangeText={map.setQuery}
            placeholder="Search places in this trip"
            placeholderTextColor="#8A7E72"
            className="flex-1 text-[13px] leading-[20px] text-text"
            style={fontStyles.uiRegular}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <Ionicons name="layers-outline" size={15} color="#8A7E72" />
        </View>

        {map.markers.map((marker) => (
          <View
            key={marker.id}
            style={{
              position: "absolute",
              left: `${marker.xPct}%`,
              top: `${marker.yPct}%`,
              transform: [{ translateX: -18 }],
            }}
          >
            <View className="items-center">
              <View
                className={[
                  "h-[22px] min-w-[34px] rounded-full px-2",
                  markerClassName(marker.tone),
                ].join(" ")}
              >
                <Text
                  className="pt-[3px] text-center text-[10px] uppercase tracking-[0.35px] text-ivory"
                  style={fontStyles.uiSemibold}
                >
                  {marker.label}
                </Text>
              </View>
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 4,
                  borderRightWidth: 4,
                  borderTopWidth: 6,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderTopColor: MARKER_COLOR[marker.tone],
                  marginTop: -1,
                }}
              />
            </View>
          </View>
        ))}

        {!map.hasVisibleStops ? (
          <View className="absolute inset-x-6 top-[210px] rounded-full border border-border bg-bg-app/90 px-4 py-2">
            <Text
              className="text-center text-[12px] text-text-soft"
              style={fontStyles.uiMedium}
            >
              No stops match this filter yet.
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={map.resetSearch}
          className="absolute bottom-3 right-3 h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-bg-app shadow-float active:opacity-75"
          accessibilityRole="button"
          accessibilityLabel="Reset search"
        >
          <Ionicons name="navigate-outline" size={15} color="#6B5E52" />
        </Pressable>
      </View>

      <View className="flex-row gap-2 px-5 pt-3">
        {map.filters.map((item) => {
          const active = map.filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => map.setFilter(item.key)}
              className={[
                "h-[29px] justify-center rounded-full border px-3 active:opacity-70",
                active
                  ? "border-espresso bg-espresso"
                  : "border-divider bg-transparent",
              ].join(" ")}
            >
              <Text
                className={[
                  "text-[11px] leading-[16px]",
                  active ? "text-ivory" : "text-clay",
                ].join(" ")}
                style={active ? fontStyles.uiSemibold : fontStyles.uiMedium}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        className="px-5 pt-5 text-[11px] uppercase tracking-[1.7px] text-text-soft"
        style={fontStyles.uiMedium}
      >
        Nearby this trip
      </Text>

      <View className="mt-2 gap-2.5 px-5">
        {map.nearbyStops.length > 0 ? (
          map.nearbyStops.map((stop) => (
            <View
              key={stop.id}
              className="rounded-[12px] border border-border bg-bg-app px-4 py-3"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="location-outline" size={14} color="#B9714F" />
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[13px] text-text"
                    style={fontStyles.uiMedium}
                    numberOfLines={1}
                  >
                    {stop.title}
                  </Text>
                  <Text
                    className="mt-0.5 text-[11px] text-text-soft"
                    style={fontStyles.uiRegular}
                    numberOfLines={1}
                  >
                    {stop.subtitle}
                  </Text>
                </View>
                <Text className="text-[11px] text-text-soft" style={fontStyles.uiRegular}>
                  {stop.distanceLabel}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View className="rounded-[12px] border border-divider bg-ivory px-4 py-4">
            <Text className="text-[12px] text-muted" style={fontStyles.uiRegular}>
              No nearby stops match the current map filter.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
