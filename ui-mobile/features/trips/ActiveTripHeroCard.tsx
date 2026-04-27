import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

import type { ActiveTripViewModel } from "./adapters";

type Props = {
  trip: ActiveTripViewModel;
  onOpenWorkspace: () => void;
  onOpenOnTrip: () => void;
};

// DE palette tones for the avatar stack
const AVATAR_TONES = ["#231910", "#B85A38", "#3D2E22"];

function MemberAvatar({ initial, index }: { initial: string; index: number }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: AVATAR_TONES[index % AVATAR_TONES.length],
        alignItems: "center",
        justifyContent: "center",
        marginLeft: index > 0 ? -6 : 0,
        borderWidth: 1.5,
        borderColor: "#FAF5EA",
      }}
    >
      <Text style={[fontStyles.uiSemibold, { fontSize: 8, color: "#FEFCF9", lineHeight: 10 }]}>
        {initial}
      </Text>
    </View>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * Math.min(1, Math.max(0, pct));

  return (
    <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(35,25,16,0.50)",
        }}
      />
      <Svg
        width={44}
        height={44}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle cx="22" cy="22" r={r} stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none" />
        <Circle
          cx="22"
          cy="22"
          r={r}
          stroke="#D89A7C"
          strokeWidth="2"
          fill="none"
          strokeDasharray={[filled, circumference]}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[fontStyles.monoMedium, { fontSize: 10, color: "#FEFCF9", lineHeight: 12 }]}>
        {Math.round(pct * 100)}%
      </Text>
    </View>
  );
}

export function ActiveTripHeroCard({ trip, onOpenWorkspace, onOpenOnTrip }: Props) {
  const progressPct = trip.totalDays > 0 ? trip.dayNumber / trip.totalDays : 0;

  return (
    <View
      className="mx-6"
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(35,25,16,0.10)",
        backgroundColor: "#FAF5EA",
        overflow: "hidden",
      }}
    >
      {/* ── Hero image ── */}
      <View style={{ height: 200 }}>
        <Image
          source={{ uri: trip.imageUrl }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={250}
        />
        <LinearGradient
          colors={["transparent", "rgba(35,15,10,0.78)"]}
          locations={[0.35, 1]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160 }}
        />

        {/* Progress ring — top-right */}
        <View style={{ position: "absolute", top: 14, right: 14 }}>
          <ProgressRing pct={progressPct} />
        </View>

        {/* Title overlay — bottom-left, right inset to clear the ring */}
        <View style={{ position: "absolute", bottom: 16, left: 18, right: 70, gap: 4 }}>
          <Text
            style={[
              textScaleStyles.caption,
              { color: "rgba(242,235,221,0.85)", letterSpacing: 2.4, fontSize: 9.5 },
            ]}
          >
            {trip.country.toUpperCase()} · DAY {trip.dayNumber} OF {trip.totalDays}
          </Text>
          <Text
            style={[
              fontStyles.headMedium,
              { fontSize: 26, lineHeight: 29, letterSpacing: -0.5, color: "#FAF3E5" },
            ]}
            numberOfLines={2}
          >
            {trip.title}
          </Text>
        </View>
      </View>

      {/* ── Card body (paper background) ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 14, backgroundColor: "#FAF5EA" }}>

        {/* Meta row: clock + dates · divider · avatar stack · LIVE */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Dates */}
          <Text style={[fontStyles.uiRegular, { fontSize: 12.5, color: "#8A7B6A" }]}>
            {trip.dateRange}
          </Text>

          {/* Divider */}
          <View style={{ width: 1, height: 10, backgroundColor: "rgba(35,25,16,0.10)", marginHorizontal: 10 }} />

          {/* Avatar stack */}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            {trip.memberInitials.map((initial, i) => (
              <MemberAvatar key={i} initial={initial} index={i} />
            ))}
          </View>

          {/* Live dot + label */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#B85A38",
                shadowColor: "#B85A38",
                shadowOpacity: 0.35,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
            <Text style={[fontStyles.monoMedium, { fontSize: 9, color: "#B85A38", letterSpacing: 1.8 }]}>
              Live
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {trip.canOpenOnTrip ? (
            <Pressable
              onPress={onOpenOnTrip}
              accessibilityLabel="Open On-Trip"
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                backgroundColor: "#231910",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              className="active:opacity-75"
            >
              <Ionicons name="arrow-forward" size={13} color="#FEFCF9" />
              <Text style={[fontStyles.uiSemibold, { fontSize: 14, color: "#FEFCF9" }]}>
                Open On-Trip
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onOpenWorkspace}
            accessibilityLabel="Open Workspace"
            style={{
              height: 46,
              paddingHorizontal: 18,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(35,25,16,0.18)",
              backgroundColor: "transparent",
              alignItems: "center",
              justifyContent: "center",
              ...(trip.canOpenOnTrip ? {} : { flex: 1 }),
            }}
            className="active:opacity-75"
          >
            <Text style={[fontStyles.uiMedium, { fontSize: 14, color: "#231910" }]}>
              Workspace
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
