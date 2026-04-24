import { Pressable, Text, View } from "react-native";

import { StatusPill } from "@/shared/ui/StatusPill";

import type { ReservationViewModel } from "./adapters";

type Props = {
  reservation: ReservationViewModel;
  onDelete: () => void;
};

export function BookingRow({ reservation, onDelete }: Props) {
  return (
    <View className="flex-row items-start gap-3 rounded-[22px] border border-border bg-white px-4 py-4">
      <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
        <Text className="text-sm font-semibold text-text">{reservation.typeLabel.slice(0, 1)}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusPill label={reservation.typeLabel} />
          <StatusPill
            label={reservation.statusLabel}
            variant={reservation.statusLabel === "Upcoming" ? "warning" : reservation.statusLabel === "In Progress" ? "success" : "default"}
          />
        </View>
        <Text className="mt-2 text-sm font-semibold text-text">{reservation.title}</Text>
        {reservation.detailLabel ? (
          <Text className="mt-1 text-sm text-text-muted">{reservation.detailLabel}</Text>
        ) : null}
        {reservation.dateLabel ? (
          <Text className="mt-1 text-sm text-text-muted">{reservation.dateLabel}</Text>
        ) : null}
      </View>
      <View className="items-end gap-2">
        <Text className="text-sm font-semibold text-text">
          {reservation.priceLabel ?? "Pending"}
        </Text>
        <Pressable onPress={onDelete}>
          <Text className="text-sm font-semibold text-text-soft">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
