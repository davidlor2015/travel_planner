import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { SectionCard } from "@/shared/ui/SectionCard";
import { StatusPill } from "@/shared/ui/StatusPill";
import { fontStyles } from "@/shared/theme/typography";

import type {
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { InviteTravelerSheet } from "./InviteTravelerSheet";

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

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
        <SectionCard
          eyebrow={sectionEyebrow}
          title={sectionTitle}
          description={sectionDescription}
          action={
            collaboration.canInvite ? (
              <Pressable onPress={() => setInviteOpen(true)}>
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
                label={isSoloTrip ? "Solo trip" : trip.isOwner ? "You own this trip" : "Shared trip"}
                variant="info"
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
                    <Text className="text-sm text-text" style={fontStyles.uiMedium}>
                      {member.email}
                      {member.isCurrentUser ? " · You" : ""}
                    </Text>
                    <Text
                      className="mt-1 text-xs uppercase tracking-[0.4px] text-text-soft"
                      style={fontStyles.monoRegular}
                    >
                      {member.roleLabel}
                    </Text>
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
                    <Text className="mt-1 text-xs text-text-soft" style={fontStyles.uiRegular}>
                      {invite.statusLabel} · Expires {invite.expiresAtLabel}
                    </Text>
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
