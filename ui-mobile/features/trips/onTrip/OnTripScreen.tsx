import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOnTripSnapshotQuery } from "@/features/trips/hooks";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import type { TripOnTripSnapshot } from "../types";
import { deriveOnTripViewModel, stopVariant } from "./adapters";
import { HappeningNowCard } from "./HappeningNowCard";
import { useOnTripMutations } from "./hooks";
import { LogStopFab } from "./LogStopFab";
import { LogStopSheet } from "./LogStopSheet";
import { NeedsAttentionCard } from "./NeedsAttentionCard";
import { OnTripHeader } from "./OnTripHeader";
import { TimelineRow } from "./TimelineRow";
import { UnplannedStopRow } from "./UnplannedStopRow";

type Props = {
  tripId: number;
  tripTitle: string;
};

export function OnTripScreen({ tripId, tripTitle }: Props) {
  const router = useRouter();
  const snapshotQuery = useOnTripSnapshotQuery(tripId);
  const [liveSnapshot, setLiveSnapshot] = useState<TripOnTripSnapshot | null>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);

  const mutations = useOnTripMutations({
    tripId,
    snapshot: liveSnapshot ?? snapshotQuery.data ?? null,
    onSnapshotRefresh: setLiveSnapshot,
  });

  if (snapshotQuery.isLoading) {
    return <ScreenLoading label="Loading on-trip view…" />;
  }

  if (snapshotQuery.isError) {
    return (
      <ScreenError
        message="Could not load trip data."
        onRetry={() => void snapshotQuery.refetch()}
      />
    );
  }

  const rawSnapshot = mutations.viewSnapshot ?? snapshotQuery.data ?? null;
  if (!rawSnapshot) return null;

  const vm = deriveOnTripViewModel(
    rawSnapshot,
    mutations.statusPending,
    mutations.unplannedPendingIds,
  );

  const nowKey = vm.now?.key ?? null;
  const nextKey = vm.next?.key ?? null;
  const doneCount = vm.timeline.filter(
    (stop) => stop.effectiveStatus === "confirmed" || stop.effectiveStatus === "skipped",
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-surface-exec" edges={["top"]}>
      <OnTripHeader
        title={tripTitle}
        readOnly={vm.isReadOnly}
        progressLabel={
          vm.timeline.length > 0 ? `${doneCount} of ${vm.timeline.length} done` : undefined
        }
        onBack={() => router.back()}
      />

      <ScrollView contentContainerClassName="gap-6 p-4 pb-24">
        <NeedsAttentionCard blockers={vm.blockers} />

        {vm.now ? (
          <HappeningNowCard
            stop={vm.now}
            onConfirm={() => {
              if (!vm.now?.stop_ref) return;
              void mutations.setStopStatus(
                vm.now.stop_ref,
                vm.now.effectiveStatus === "confirmed" ? "planned" : "confirmed",
              );
            }}
            onSkip={() => {
              if (!vm.now?.stop_ref) return;
              void mutations.setStopStatus(
                vm.now.stop_ref,
                vm.now.effectiveStatus === "skipped" ? "planned" : "skipped",
              );
            }}
          />
        ) : null}

        <ScrollSectionLabel label="Today" />
        {vm.timeline.length === 0 ? (
          <Text className="text-sm text-on-dark-muted">No stops planned for today.</Text>
        ) : (
          <ScrollView scrollEnabled={false}>
            {vm.timeline.map((stop, idx) => (
              (() => {
                const stopRef =
                  typeof stop.stop_ref === "string" ? stop.stop_ref : null;
                return (
                  <TimelineRow
                    key={stop.key}
                    stop={stop}
                    variant={stopVariant(stop, nowKey, nextKey)}
                    isLast={idx === vm.timeline.length - 1}
                    onConfirm={
                      stopRef
                        ? () =>
                            void mutations.setStopStatus(
                              stopRef,
                              stop.effectiveStatus === "confirmed"
                                ? "planned"
                                : "confirmed",
                            )
                        : undefined
                    }
                    onSkip={
                      stopRef
                        ? () =>
                            void mutations.setStopStatus(
                              stopRef,
                              stop.effectiveStatus === "skipped" ? "planned" : "skipped",
                            )
                        : undefined
                    }
                  />
                );
              })()
            ))}
          </ScrollView>
        )}

        {vm.unplanned.length > 0 ? <ScrollSectionLabel label="Unplanned" /> : null}
        {vm.unplanned.map((stop) => (
          <UnplannedStopRow
            key={stop.event_id}
            stop={stop}
            onDelete={
              vm.isReadOnly ? undefined : () => void mutations.removeUnplannedStop(stop.event_id)
            }
          />
        ))}
      </ScrollView>

      {!vm.isReadOnly ? <LogStopFab onPress={() => setLogModalOpen(true)} /> : null}

      {mutations.feedback ? (
        <Pressable
          className={`absolute bottom-[90px] left-4 right-4 rounded-[16px] px-4 py-3 ${mutations.feedback.kind === "error" ? "bg-danger" : "bg-olive"}`}
          onPress={mutations.dismissFeedback}
        >
          <Text className="text-center text-sm text-white">{mutations.feedback.message}</Text>
        </Pressable>
      ) : null}

      <LogStopSheet
        visible={logModalOpen}
        defaultDate={vm.defaultLogDate}
        disabled={mutations.isLoggingUnplanned}
        onClose={() => setLogModalOpen(false)}
        onSubmit={async (payload) => {
          await mutations.logUnplannedStop(payload);
          setLogModalOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function ScrollSectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-on-dark-soft">
      {label}
    </Text>
  );
}
