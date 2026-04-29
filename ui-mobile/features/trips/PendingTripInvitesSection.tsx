// Path: ui-mobile/features/trips/PendingTripInvitesSection.tsx
// Summary: Renders pending trip invites for the authenticated user.

import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import { Button } from "@/shared/ui/Button";
import type { PendingTripInvite } from "./types";

type InviteAction = {
  inviteId: number;
  action: "accept" | "decline";
} | null;

type Props = {
  invites: PendingTripInvite[];
  isLoading: boolean;
  error: string | null;
  action: InviteAction;
  onAccept: (inviteId: number) => void;
  onDecline: (inviteId: number) => void;
  onRetry: () => void;
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
}

export function PendingTripInvitesSection({
  invites,
  isLoading,
  error,
  action,
  onAccept,
  onDecline,
  onRetry,
}: Props) {
  return (
    <View testID="pending-invites-section">
      <Text
        style={fontStyles.uiSemibold}
        className="mb-2 text-[11px] uppercase tracking-[1.4px] text-flint"
      >
        Trip invites
      </Text>
      <View className="rounded-[20px] border border-smoke bg-ivory px-4 py-4">
        {isLoading ? (
          <Text
            testID="pending-invites-loading"
            style={fontStyles.uiRegular}
            className="text-[13px] leading-5 text-muted"
          >
            Checking for trip invites…
          </Text>
        ) : error ? (
          <View testID="pending-invites-error" className="gap-3">
            <Text style={fontStyles.uiRegular} className="text-[13px] leading-5 text-danger">
              {error}
            </Text>
            <Button label="Try again" variant="secondary" onPress={onRetry} />
          </View>
        ) : invites.length === 0 ? (
          <Text
            testID="pending-invites-empty"
            style={fontStyles.uiRegular}
            className="text-[13px] leading-5 text-muted"
          >
            No pending trip invitations.
          </Text>
        ) : (
          <View testID="pending-invites-list" className="gap-3">
            {invites.map((invite) => {
              const inviter =
                invite.invited_by_display_name?.trim() ||
                invite.invited_by_email ||
                "A trip owner";
              const dateRange = formatDateRange(invite.start_date, invite.end_date);
              const accepting =
                action?.inviteId === invite.id && action.action === "accept";
              const declining =
                action?.inviteId === invite.id && action.action === "decline";

              return (
                <View
                  key={invite.id}
                  testID={`pending-invite-${invite.id}`}
                  className="rounded-[16px] border border-smoke bg-bg px-3 py-3"
                >
                  <Text
                    style={fontStyles.uiSemibold}
                    className="text-[15px] leading-[21px] text-espresso"
                  >
                    You've been invited to {invite.trip_title}
                  </Text>
                  <Text
                    style={fontStyles.uiRegular}
                    className="mt-1 text-[13px] leading-[19px] text-muted"
                  >
                    {inviter} invited {invite.invitee_email}.
                  </Text>
                  <Text
                    style={fontStyles.uiRegular}
                    className="mt-2 text-[12px] leading-[17px] text-flint"
                  >
                    {invite.destination}
                    {dateRange ? ` · ${dateRange}` : ""}
                  </Text>
                  <View className="mt-3 flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        label={accepting ? "Accepting…" : "Accept"}
                        onPress={() => onAccept(invite.id)}
                        disabled={Boolean(action)}
                        fullWidth
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label={declining ? "Declining…" : "Decline"}
                        variant="secondary"
                        onPress={() => onDecline(invite.id)}
                        disabled={Boolean(action)}
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
