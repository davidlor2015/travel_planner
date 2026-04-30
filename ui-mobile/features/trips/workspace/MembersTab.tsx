// Path: ui-mobile/features/trips/workspace/MembersTab.tsx
// Summary: Implements MembersTab module logic.

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { SectionCard } from "@/shared/ui/SectionCard";
import { fontStyles } from "@/shared/theme/typography";

import type {
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { InviteTravelerSheet } from "./InviteTravelerSheet";
import { ReadOnlyNotice } from "./ReadOnlyNotice";

type Props = {
  trip: TripWorkspaceViewModel;
  collaboration: TripWorkspaceCollaborationViewModel;
  invitePending?: boolean;
  onInvite: (email: string) => Promise<unknown>;
  memberReadinessError: string | null;
};

export function MembersTab({
  trip,
  collaboration,
  invitePending = false,
  onInvite,
  memberReadinessError,
}: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const showReadOnlyNotice = trip.isReadOnly;

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
        {showReadOnlyNotice ? <ReadOnlyNotice className="" /> : null}
        <SectionCard
          eyebrow="Shared workspace"
          title="Everyone on the trip"
          description="Invite travelers, share the plan, and keep the group moving together."
          action={
            collaboration.canInvite ? (
              <Pressable
                onPress={() => setInviteOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Invite traveler"
                className="rounded-full border border-clay/20 bg-clay/10 px-3 py-1.5 active:opacity-75"
              >
                <Text className="text-xs text-clay" style={fontStyles.uiSemibold}>
                  Invite
                </Text>
              </Pressable>
            ) : undefined
          }
        >
          <View className="gap-3">
            {inviteSuccess ? (
              <View className="rounded-2xl border border-olive/20 bg-olive/10 px-3 py-3">
                <Text className="text-sm text-olive" style={fontStyles.uiMedium}>
                  {inviteSuccess}
                </Text>
              </View>
            ) : null}

            {collaboration.members.map((member) => (
              <View
                key={member.userId}
                className="rounded-2xl border border-border bg-ivory px-3.5 py-3.5"
              >
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm text-espresso" style={fontStyles.uiSemibold}>
                      {member.displayLabel}
                      {member.isCurrentUser ? " · You" : ""}
                    </Text>
                  </View>
                  <RolePill
                    label={member.rolePillLabel}
                    accessibilityLabel={`${member.email} role: ${member.rolePillLabel}`}
                  />
                </View>
                {member.emailSecondary ? (
                  <Text className="mt-1 text-xs text-text-soft" style={fontStyles.uiRegular}>
                    {member.emailSecondary}
                  </Text>
                ) : null}
                <Text className="mt-2 text-sm text-text-muted" style={fontStyles.uiRegular}>
                  {member.supportingText}
                </Text>
              </View>
            ))}

            {collaboration.pendingInvites.length > 0 ? (
              <View className="gap-2">
                <Text
                  className="text-[11px] uppercase tracking-[0.5px] text-text-soft"
                  style={fontStyles.uiSemibold}
                >
                  Pending invites
                </Text>
                {collaboration.pendingInvites.map((invite) => (
                  <View
                    key={invite.id}
                    className="rounded-2xl border border-border bg-ivory px-3.5 py-3.5"
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-sm text-espresso" style={fontStyles.uiSemibold}>
                          {invite.displayLabel}
                        </Text>
                      </View>
                      <RolePill
                        label={invite.rolePillLabel}
                        accessibilityLabel={`${invite.email} role: ${invite.rolePillLabel}`}
                      />
                    </View>
                    {invite.emailSecondary ? (
                      <Text className="mt-1 text-xs text-text-soft" style={fontStyles.uiRegular}>
                        {invite.emailSecondary}
                      </Text>
                    ) : null}
                    <Text className="mt-2 text-sm text-text-muted" style={fontStyles.uiRegular}>
                      {invite.supportingText}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {memberReadinessError ? (
              <Text className="text-xs text-text-soft" style={fontStyles.uiRegular}>
                Some readiness indicators are unavailable right now.
              </Text>
            ) : null}
          </View>
        </SectionCard>
      </ScrollView>

      <InviteTravelerSheet
        visible={inviteOpen}
        submitting={invitePending}
        error={inviteError}
        onClose={() => {
          setInviteOpen(false);
          setInviteError(null);
        }}
        onSubmit={async (email) => {
          try {
            setInviteError(null);
            await onInvite(email);
            setInviteSuccess(`Invite sent to ${email}.`);
            setInviteOpen(false);
          } catch {
            setInviteError("We couldn't send the invite. Try again.");
          }
        }}
      />
    </>
  );
}

type RoleLabel = "Owner" | "Can edit" | "View only";

function RolePill({
  label,
  accessibilityLabel,
}: {
  label: RoleLabel;
  accessibilityLabel?: string;
}) {
  const tone = roleTone(label);
  return (
    <View
      className={`rounded-full border px-2.5 py-1 ${tone.pill}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text className={`text-xs ${tone.text}`} style={fontStyles.uiSemibold}>
        {label}
      </Text>
    </View>
  );
}

function roleTone(label: RoleLabel): { pill: string; text: string } {
  if (label === "Owner") {
    return {
      pill: "border-espresso/20 bg-espresso/10",
      text: "text-espresso",
    };
  }
  if (label === "Can edit") {
    return {
      pill: "border-clay/25 bg-clay/10",
      text: "text-clay",
    };
  }
  return {
    pill: "border-border-strong bg-cream",
    text: "text-text-muted",
  };
}
