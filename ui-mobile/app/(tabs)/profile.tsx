import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useProfileScreen } from "@/features/profile/useProfileScreen";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import type { TravelStats } from "@/features/profile/profileUtils";

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatBox({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text style={[fontStyles.displaySemibold, { fontSize: 28, lineHeight: 32, color: "#1C1108" }]}>
        {value}
      </Text>
      <Text style={fontStyles.uiMedium} className="text-[11px] text-muted text-center">
        {label}
      </Text>
    </View>
  );
}

function StatsRow({ stats }: { stats: TravelStats }) {
  return (
    <View className="flex-row items-center rounded-[20px] border border-smoke bg-white px-4 py-4">
      <StatBox value={stats.totalTrips} label="Total trips" />
      <View className="h-10 w-px bg-smoke" />
      <StatBox value={stats.activeOrUpcoming} label="Upcoming" />
      <View className="h-10 w-px bg-smoke" />
      <StatBox value={stats.pastTrips} label="Archived" />
    </View>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const textColor = destructive ? "text-red-600" : "text-espresso";
  const iconColor = destructive ? "#dc2626" : "#6B5E52";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="active:opacity-60"
    >
      <View className="flex-row items-center gap-3 py-3.5">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-parchment">
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={fontStyles.uiMedium} className={`flex-1 text-[15px] ${textColor}`}>
          {label}
        </Text>
        {!destructive ? (
          <Ionicons name="chevron-forward" size={14} color="#C9BCA8" />
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-0">
      {title ? (
        <Text
          style={fontStyles.uiSemibold}
          className="mb-2 text-[11px] uppercase tracking-[1.2px] text-flint"
        >
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-[20px] border border-smoke bg-white px-4">
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-smoke" />;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { displayName, email, stats, signOut } = useProfileScreen();

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pb-1 pt-4">
          <Text style={textScaleStyles.displayL} className="text-espresso">
            Profile
          </Text>
        </View>

        {/* Identity card */}
        <View className="mt-4 flex-row items-center gap-4 rounded-[24px] border border-smoke bg-white px-4 py-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-amber/10">
            <Text
              style={[fontStyles.displaySemibold, { fontSize: 20, color: "#B86845" }]}
            >
              {initials}
            </Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text
              style={[fontStyles.displaySemibold, { fontSize: 20, lineHeight: 24, color: "#1C1108" }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {email ? (
              <Text style={fontStyles.uiRegular} className="text-[13px] text-muted">
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <View className="mt-5">
          <Text
            style={fontStyles.uiSemibold}
            className="mb-2 text-[11px] uppercase tracking-[1.2px] text-flint"
          >
            Travel stats
          </Text>
          <StatsRow stats={stats} />
        </View>

        {/* Account settings */}
        <View className="mt-5">
          <Section title="Account">
            <SettingsRow
              icon="lock-closed-outline"
              label="Change password"
              onPress={() => router.push("/(auth)/forgot-password")}
            />
            <Divider />
            <SettingsRow
              icon="log-out-outline"
              label="Sign out"
              onPress={() => void signOut()}
              destructive
            />
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
