// Path: ui-mobile/app/(tabs)/profile.tsx
// Summary: Implements profile module logic.

import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { EditDisplayNameSheet } from "@/features/profile/EditDisplayNameSheet";
import { FeedbackSheet } from "@/features/profile/FeedbackSheet";
import { DefaultsSheet } from "@/features/profile/preferences/DefaultsSheet";
import { LanguageSheet } from "@/features/profile/preferences/LanguageSheet";
import { NotificationsSheet } from "@/features/profile/preferences/NotificationsSheet";
import {
  buildDefaultsSubtext,
  buildLanguageSubtext,
  buildNotificationsSubtext,
} from "@/features/profile/preferences/preferencePresentation";
import { useAppPreferences } from "@/features/profile/preferences/useAppPreferences";
import { useProfileScreen } from "@/features/profile/useProfileScreen";
import { PendingTripInvitesSection } from "@/features/trips/PendingTripInvitesSection";
import {
  useAcceptPendingInviteMutation,
  useDeclinePendingInviteMutation,
  usePendingTripInvitesQuery,
} from "@/features/trips/hooks";
import { fontStyles } from "@/shared/theme/typography";

// ─── Row divider ──────────────────────────────────────────────────────────────

function RowDivider() {
  return <View className="ml-[64px] mr-4 h-px bg-smoke" />;
}

// ─── Settings row ─────────────────────────────────────────────────────────────

type SettingsRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtext?: string;
  rightLabel?: string;
  onPress?: () => void;
  destructive?: boolean;
};

function SettingsRow({
  icon,
  label,
  subtext,
  rightLabel,
  onPress,
  destructive = false,
}: SettingsRowProps) {
  const iconColor = destructive ? "#B86845" : "#8A7E74";

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-parchment">
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            style={fontStyles.uiMedium}
            className={`text-[15px] leading-[21px] ${destructive ? "text-amber" : "text-espresso"}`}
            numberOfLines={1}
          >
            {label}
          </Text>
          {subtext ? (
            <Text
              style={fontStyles.uiRegular}
              className="mt-0.5 text-[12px] leading-[17px] text-muted"
              numberOfLines={1}
            >
              {subtext}
            </Text>
          ) : null}
        </View>
        {rightLabel ? (
          <Text style={fontStyles.uiRegular} className="text-[13px] text-muted">
            {rightLabel}
          </Text>
        ) : !destructive ? (
          <Ionicons name="chevron-forward" size={14} color="#C9BCA8" />
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View>
      {title ? (
        <Text
          style={fontStyles.uiSemibold}
          className="mb-2 text-[11px] uppercase tracking-[1.4px] text-flint"
        >
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-[20px] border border-smoke bg-ivory">
        {children}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type OpenSheet = "defaults" | "notifications" | "language" | "feedback" | "edit-name" | null;

const DEVICE_LABEL = Platform.select({
  ios: "iPhone",
  android: "Android",
  default: "Device",
});

export default function ProfilePage() {
  const { displayName, email, signOut } = useProfileScreen();
  const { preferences, update } = useAppPreferences();
  const pendingInvitesQuery = usePendingTripInvitesQuery();
  const acceptInviteMutation = useAcceptPendingInviteMutation();
  const declineInviteMutation = useDeclinePendingInviteMutation();
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [inviteAction, setInviteAction] = useState<{
    inviteId: number;
    action: "accept" | "decline";
  } | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const defaultsSubtext = buildDefaultsSubtext(preferences);
  const notificationsSubtext = buildNotificationsSubtext(preferences);
  const languageSubtext = buildLanguageSubtext();
  const pendingInvites = pendingInvitesQuery.data ?? [];
  const inviteBadgeLabel =
    preferences.inviteAlertsEnabled && pendingInvites.length > 0
      ? `${pendingInvites.length} invite${pendingInvites.length === 1 ? "" : "s"}`
      : undefined;

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      setInviteActionError(null);
      setInviteAction({ inviteId, action: "accept" });
      const result = await acceptInviteMutation.mutateAsync(inviteId);
      router.push(`/(tabs)/trips/${result.trip_id}`);
    } catch {
      setInviteActionError("We couldn't accept that invite. Try again.");
    } finally {
      setInviteAction(null);
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    try {
      setInviteActionError(null);
      setInviteAction({ inviteId, action: "decline" });
      await declineInviteMutation.mutateAsync(inviteId);
    } catch {
      setInviteActionError("We couldn't decline that invite. Try again.");
    } finally {
      setInviteAction(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <View className="pb-1 pt-5">
          <Text
            style={fontStyles.uiMedium}
            className="text-[11px] uppercase tracking-[0.16em] text-amber"
          >
            Profile
          </Text>
          <Text
            style={fontStyles.displaySemibold}
            className="mt-1 text-[30px] leading-[36px] text-espresso"
          >
            Your account
          </Text>
        </View>

        {/* ── Identity card ────────────────────────────────────────────────── */}
        <Pressable
          onPress={() => setOpenSheet("edit-name")}
          className="mt-5 flex-row items-center gap-4 rounded-[20px] border border-smoke bg-ivory px-4 py-4 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Edit display name"
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-amber/10">
            <Text style={[fontStyles.displaySemibold, { fontSize: 19, color: "#B86845" }]}>
              {initials || "?"}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text
              style={fontStyles.uiSemibold}
              className="text-[18px] leading-[24px] text-espresso"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {email ? (
              <Text
                style={fontStyles.uiRegular}
                className="mt-0.5 text-[13px] text-muted"
                numberOfLines={1}
              >
                {email}
              </Text>
            ) : null}
          </View>
          <Ionicons name="pencil-outline" size={16} color="#C9BCA8" />
        </Pressable>

        {/* ── Trip invites ─────────────────────────────────────────────────── */}
        <View className="mt-5">
          <PendingTripInvitesSection
            invites={pendingInvites}
            isLoading={pendingInvitesQuery.isLoading}
            error={
              inviteActionError ??
              (pendingInvitesQuery.isError
                ? "We couldn't load your trip invites. Try again."
                : null)
            }
            action={inviteAction}
            onAccept={(inviteId) => void handleAcceptInvite(inviteId)}
            onDecline={(inviteId) => void handleDeclineInvite(inviteId)}
            onRetry={() => void pendingInvitesQuery.refetch()}
          />
        </View>

        {/* ── Preferences ──────────────────────────────────────────────────── */}
        <View className="mt-5">
          <Section title="Preferences">
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              subtext={notificationsSubtext}
              rightLabel={inviteBadgeLabel}
              onPress={() => setOpenSheet("notifications")}
            />
            <RowDivider />
            <SettingsRow
              icon="globe-outline"
              label="Language & region"
              subtext={languageSubtext}
              onPress={() => setOpenSheet("language")}
            />
            <RowDivider />
            <SettingsRow
              icon="settings-outline"
              label="Defaults"
              subtext={defaultsSubtext}
              onPress={() => setOpenSheet("defaults")}
            />
          </Section>
        </View>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <View className="mt-5">
          <Section title="Account">
            <SettingsRow
              icon="lock-closed-outline"
              label="Change password"
              onPress={() => router.push("/(auth)/change-password")}
            />
            <RowDivider />
            <SettingsRow
              icon="chatbubble-outline"
              label="Send feedback"
              subtext="Help improve Waypoint"
              onPress={() => setOpenSheet("feedback")}
            />
            <RowDivider />
            <SettingsRow
              icon="log-out-outline"
              label="Sign out"
              rightLabel={DEVICE_LABEL}
              onPress={() => void signOut()}
              destructive
            />
          </Section>
        </View>
      </ScrollView>

      {/* ── Sheets ───────────────────────────────────────────────────────────── */}
      <DefaultsSheet
        visible={openSheet === "defaults"}
        preferences={preferences}
        onSave={(patch) => {
          void update(patch);
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />
      <NotificationsSheet
        visible={openSheet === "notifications"}
        preferences={preferences}
        onChange={(patch) => void update(patch)}
        onClose={() => setOpenSheet(null)}
      />
      <LanguageSheet
        visible={openSheet === "language"}
        onClose={() => setOpenSheet(null)}
      />
      <FeedbackSheet
        visible={openSheet === "feedback"}
        userEmail={email}
        onClose={() => setOpenSheet(null)}
      />
      <EditDisplayNameSheet
        visible={openSheet === "edit-name"}
        currentName={displayName}
        onClose={() => setOpenSheet(null)}
      />
    </SafeAreaView>
  );
}
