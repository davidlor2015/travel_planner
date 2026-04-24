import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useSavedItineraryQuery } from "@/features/ai/hooks";
import { ApiError } from "@/shared/api/client";
import { SectionCard } from "@/shared/ui/SectionCard";
import { StatusPill } from "@/shared/ui/StatusPill";

import type {
  TripSummaryViewModel,
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { InviteTravelerSheet } from "./InviteTravelerSheet";
import { ItineraryDayCard } from "./ItineraryDayCard";
import { ItineraryStopRow } from "./ItineraryStopRow";

type Props = {
  tripId: number;
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
  collaboration: TripWorkspaceCollaborationViewModel;
  showGroupCoordination: boolean;
  memberReadinessError: string | null;
  invitePending?: boolean;
  onInvite: (email: string) => Promise<unknown>;
};

export function OverviewTab({
  tripId,
  trip,
  summary,
  collaboration,
  showGroupCoordination,
  memberReadinessError,
  invitePending = false,
  onInvite,
}: Props) {
  const itineraryQuery = useSavedItineraryQuery(tripId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const is404 =
    itineraryQuery.isError &&
    itineraryQuery.error instanceof ApiError &&
    itineraryQuery.error.status === 404;

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
        <SectionCard
          eyebrow="Trip basics"
          title="Destination and timing"
          description="Keep the core trip facts visible while you fill in the operational details."
        >
          <View className="gap-3">
            <InfoRow label="Destination" value={trip.destination} />
            <InfoRow label="Dates" value={trip.dateRange} />
            <InfoRow
              label="Duration"
              value={`${trip.durationDays} ${trip.durationDays === 1 ? "day" : "days"}`}
            />
          </View>
        </SectionCard>

        {showGroupCoordination ? (
          <SectionCard
            eyebrow="Shared workspace"
            title="Group"
            description={collaboration.groupDescription}
            action={
              collaboration.canInvite ? (
                <Pressable onPress={() => setInviteOpen(true)}>
                  <Text className="text-sm font-semibold text-accent">Invite</Text>
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
                  label={trip.isOwner ? "You own this trip" : "Shared trip"}
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
                  <Text className="text-sm font-medium text-olive">{inviteSuccess}</Text>
                </View>
              ) : null}

              {collaboration.members.map((member) => (
                <View
                  key={member.userId}
                  className="rounded-2xl border border-border bg-surface-muted px-3 py-3"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-text">
                        {member.email}
                        {member.isCurrentUser ? " · You" : ""}
                      </Text>
                      <Text className="mt-1 text-xs uppercase tracking-[0.4px] text-text-soft">
                        {member.roleLabel}
                      </Text>
                      <Text className="mt-2 text-sm text-text-muted">
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
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-soft">
                    Pending invites
                  </Text>
                  {collaboration.pendingInvites.map((invite) => (
                    <View
                      key={invite.id}
                      className="rounded-2xl border border-border bg-white px-3 py-3"
                    >
                      <Text className="text-sm font-medium text-text">{invite.email}</Text>
                      <Text className="mt-1 text-xs text-text-soft">
                        {invite.statusLabel} · Expires {invite.expiresAtLabel}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {memberReadinessError ? (
                <Text className="text-sm text-danger">
                  {memberReadinessError}
                </Text>
              ) : null}
            </View>
          </SectionCard>
        ) : null}

        {summary && (
          <SectionCard
            eyebrow="Operational summary"
            title="Readiness"
            description={summary.readinessLabel}
          >
            <View className="flex-row gap-3">
              <StatBlock
                label="Packing"
                value={`${summary.packingChecked}/${summary.packingTotal}`}
              />
              <StatBlock
                label="Budget"
                value={
                  summary.budgetLimit != null
                    ? `$${summary.budgetSpent.toFixed(0)} / $${summary.budgetLimit.toFixed(0)}`
                    : `$${summary.budgetSpent.toFixed(0)} spent`
                }
                highlight={summary.isOverBudget ? "error" : undefined}
              />
              <StatBlock label="Bookings" value={String(summary.reservationCount)} />
            </View>
          </SectionCard>
        )}

        <SectionCard
          eyebrow="Itinerary"
          title="Saved plan"
          description="This is the published itinerary available to the mobile workspace right now."
        >
          {itineraryQuery.isLoading && (
            <Text className="text-sm text-text-muted">Loading…</Text>
          )}
          {is404 && (
            <Text className="text-sm text-text-muted">
              No itinerary saved yet.
            </Text>
          )}
          {itineraryQuery.isError && !is404 && (
            <Text className="text-sm text-danger">
              Could not load itinerary.
            </Text>
          )}
          {itineraryQuery.data && (
            <View className="mt-1 gap-3">
              {itineraryQuery.data.days.map((day) => (
                <ItineraryDayCard
                  key={day.day_number}
                  dayNumber={day.day_number}
                  title={day.day_title || `Day ${day.day_number}`}
                  date={day.date}
                  stopCount={day.items.length}
                >
                  <View className="gap-1">
                    {day.items.map((item, idx) => (
                      <ItineraryStopRow
                        key={`${day.day_number}-${idx}-${item.title}`}
                        time={item.time}
                        title={item.title}
                        location={item.location}
                        notes={item.notes}
                      />
                    ))}
                  </View>
                </ItineraryDayCard>
              ))}
            </View>
          )}
        </SectionCard>
      </ScrollView>

      <InviteTravelerSheet
        visible={showGroupCoordination && inviteOpen}
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
          } catch (error) {
            setInviteError(error instanceof Error ? error.message : "Could not send invite.");
          }
        }}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-soft">
        {label}
      </Text>
      <Text className="mt-1 text-base text-text">{value}</Text>
    </View>
  );
}

function StatBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "error";
}) {
  return (
    <View className="flex-1 gap-0.5 rounded-2xl border border-border bg-surface-muted px-3 py-3">
      <Text className="text-[11px] font-normal uppercase tracking-[0.5px] text-text-soft">
        {label}
      </Text>
      <Text
        className={`text-[15px] font-semibold ${highlight === "error" ? "text-danger" : "text-text"}`}
      >
        {value}
      </Text>
    </View>
  );
}
