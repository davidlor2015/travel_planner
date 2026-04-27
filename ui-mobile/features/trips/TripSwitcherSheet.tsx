import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/shared/ui/Button";
import { StatusPill } from "@/shared/ui/StatusPill";
import { fontStyles } from "@/shared/theme/typography";

import type { TripListItemViewModel } from "./adapters";

type Props = {
  visible: boolean;
  trips: TripListItemViewModel[];
  activeTripId: number;
  onClose: () => void;
  onSelect: (tripId: number) => void;
};

function statusDotColor(status: TripListItemViewModel["status"]): string {
  if (status === "active") return "#4ADE80";
  if (status === "upcoming") return "#FCD34D";
  return "#B0A498";
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
          <Text className="text-xl text-text" style={fontStyles.uiSemibold}>
            Switch Trip
          </Text>
          <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
            Jump between active workspaces without leaving the trip area.
          </Text>
          <ScrollView contentContainerClassName="gap-3 py-4">
            {trips.map((trip) => {
              const isCurrent = trip.id === activeTripId;
              return (
                <Pressable
                  key={trip.id}
                  onPress={() => {
                    onSelect(trip.id);
                    onClose();
                  }}
                  className={[
                    "rounded-[22px] border px-4 py-4",
                    isCurrent ? "border-accent bg-amber/5" : "border-border bg-white",
                  ].join(" ")}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      {/* Title row with status dot */}
                      <View className="flex-row items-center gap-2">
                        <View
                          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: statusDotColor(trip.status) }}
                        />
                        <Text
                          className="flex-1 text-base text-text"
                          style={fontStyles.uiSemibold}
                          numberOfLines={1}
                        >
                          {trip.title}
                        </Text>
                      </View>
                      <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
                        {trip.destination}
                      </Text>
                      <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
                        {trip.dateRange}
                      </Text>
                    </View>
                    {/* StatusPill only for the current/selected trip */}
                    {isCurrent ? (
                      <StatusPill label="Current" variant="info" />
                    ) : null}
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
