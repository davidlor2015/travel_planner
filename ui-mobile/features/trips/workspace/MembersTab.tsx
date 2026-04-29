// Path: ui-mobile/features/trips/workspace/MembersTab.tsx
// Summary: Implements MembersTab module logic.

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { SectionCard } from "@/shared/ui/SectionCard";
import { StatusPill } from "@/shared/ui/StatusPill";
import { fontStyles } from "@/shared/theme/typography";

import type {
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
  WorkspacePillVariant,
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
  const isSoloTrip = trip.memberCount <= 1;
  const sectionEyebrow = isSoloTrip ? "Solo planning" : "Shared workspace";
  const sectionTitle = isSoloTrip ? "Planning solo for now" : "Group";
  const sectionDescription = isSoloTrip
    ? "Invite travel companions when you want to coordinate this trip with others."
    : collaboration.groupDescription;
  const showReadOnlyNotice = trip.isReadOnly;

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
        {showReadOnlyNotice ? <ReadOnlyNotice className="" /> : null}
        <SectionCard
          eyebrow={sectionEyebrow}
          title={sectionTitle}
          description={sectionDescription}
          action={
            collaboration.canInvite ? (
              <Pressable
                onPress={() => setInviteOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Invite traveler"
              >
                <Text className="text-sm text-accent" style={fontStyles.uiSemibold}>
                  Invite
                </Text>
              </Pressable>
            ) : undefined
          }
        >
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              <StatusPill
                label={trip.statusLabel}
                variant={
                  trip.status === "active"
                    ? "success"
                    : trip.status === "upcoming"
                      ? "warning"
                      : "default"
                }
              />
              <StatusPill
                label={trip.currentUserRoleLabel}
                variant="info"
                accessibilityLabel={`Your trip role: ${trip.currentUserRoleLabel}`}
              />
              {collaboration.pendingInvites.length > 0 ? (
                <StatusPill
                  label={`${collaboration.pendingInvites.length} pending invite${collaboration.pendingInvites.length === 1 ? "" : "s"}`}
                  variant="warning"
                />
              ) : null}
            </View>

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
                className="rounded-2xl border border-border bg-surface-muted px-3 py-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-sm text-text" style={fontStyles.uiMedium}>
                        {member.email}
                        {member.isCurrentUser ? " · You" : ""}
                      </Text>
                      <StatusPill
                        label={member.roleLabel}
                        variant={roleBadgeVariant(member.roleLabel)}
                        accessibilityLabel={`${member.email} role: ${member.roleLabel}`}
                      />
                    </View>
                    <Text className="mt-2 text-sm text-text-muted" style={fontStyles.uiRegular}>
                      {member.readinessDetail}
                    </Text>
                  </View>
                  <StatusPill
                    label={member.readinessLabel}
                    variant={member.readinessVariant}
                  />
                </View>
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
                    className="rounded-2xl border border-border bg-white px-3 py-3"
                  >
                    <Text className="text-sm text-text" style={fontStyles.uiMedium}>
                      {invite.email}
                    </Text>
                    <View className="mt-2 flex-row flex-wrap items-center gap-2">
                      <StatusPill
                        label={invite.statusLabel}
                        variant="warning"
                        accessibilityLabel={`${invite.email} invite status: ${invite.statusLabel}`}
                      />
                      <Text className="text-xs text-text-soft" style={fontStyles.uiRegular}>
                        Expires {invite.expiresAtLabel}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {memberReadinessError ? (
              <Text className="text-sm text-danger" style={fontStyles.uiRegular}>
                {memberReadinessError}
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

function roleBadgeVariant(label: string): WorkspacePillVariant {
  if (label === "Owner") return "info";
  if (label === "Can edit") return "success";
  if (label === "Pending") return "warning";
  return "default";
}
