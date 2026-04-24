import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/shared/ui/Button";
import { StatusPill } from "@/shared/ui/StatusPill";

import type { TripListItemViewModel } from "./adapters";

type Props = {
  visible: boolean;
  trips: TripListItemViewModel[];
  activeTripId: number;
  onClose: () => void;
  onSelect: (tripId: number) => void;
};

function statusVariant(status: TripListItemViewModel["status"]) {
  if (status === "active") return "success";
  if (status === "upcoming") return "warning";
  return "default";
}

export function TripSwitcherSheet({
  visible,
  trips,
  activeTripId,
  onClose,
  onSelect,
}: Props) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <View className="max-h-[75%] rounded-t-[28px] bg-bg-app px-4 pb-6 pt-4">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-border" />
          </View>
          <Text className="text-xl font-semibold text-text">Switch Trip</Text>
          <Text className="mt-1 text-sm text-text-muted">
            Jump between active workspaces without leaving the trip area.
          </Text>
          <ScrollView contentContainerClassName="gap-3 py-4">
            {trips.map((trip) => {
              const isActive = trip.id === activeTripId;
              return (
                <Pressable
                  key={trip.id}
                  onPress={() => {
                    onSelect(trip.id);
                    onClose();
                  }}
                  className={[
                    "rounded-[22px] border px-4 py-4",
                    isActive ? "border-accent bg-amber/5" : "border-border bg-white",
                  ].join(" ")}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-text">{trip.title}</Text>
                      <Text className="mt-1 text-sm text-text-muted">{trip.destination}</Text>
                      <Text className="mt-2 text-sm text-text-muted">{trip.dateRange}</Text>
                    </View>
                    <StatusPill
                      label={isActive ? "Current" : trip.statusLabel}
                      variant={isActive ? "info" : statusVariant(trip.status)}
                    />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button label="Close" variant="secondary" onPress={onClose} fullWidth />
        </View>
      </View>
    </Modal>
  );
}
