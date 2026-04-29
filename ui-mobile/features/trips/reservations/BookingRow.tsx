// Path: ui-mobile/features/trips/reservations/BookingRow.tsx
// Summary: Implements BookingRow module logic.

import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";

import type { BookingIconName, ReservationViewModel } from "./adapters";

type Props = {
  reservation: ReservationViewModel;
  onPress: () => void;
  onDelete: () => void;
};

function StatusPill({ label, variant }: { label: string; variant: ReservationViewModel["statusVariant"] }) {
  const bg =
    variant === "confirmed"
      ? "bg-[#dde0cd]"
      : variant === "pending"
        ? "bg-[#ead7c9]"
        : "bg-smoke";

  const textColor =
    variant === "confirmed"
      ? "#6f7a4a"
      : variant === "pending"
        ? "#b9714f"
        : "#8A7E74";

  return (
    <View className={`rounded-full px-2.5 py-[3px] ${bg}`}>
      <Text style={[fontStyles.uiMedium, { fontSize: 11, color: textColor, letterSpacing: 0.3 }]}>
        {label}
      </Text>
    </View>
  );
}

export function BookingRow({ reservation, onPress, onDelete }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${reservation.title} details`}
      className="flex-row items-center gap-3 rounded-[14px] border border-smoke bg-ivory px-[15px] py-[13px] active:opacity-70"
    >
      {/* Icon square */}
      <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-smoke bg-parchment-soft">
        <Ionicons
          name={reservation.typeIconName satisfies BookingIconName}
          size={15}
          color="#8A7E74"
        />
      </View>

      {/* Main content */}
      <View className="flex-1 gap-[3px]">
        {/* Title row + optional confirmation code */}
        <View className="flex-row items-center gap-1.5">
          <Text
            style={fontStyles.uiSemibold}
            className="text-[13px] text-espresso"
            numberOfLines={1}
          >
            {reservation.title}
          </Text>
          {reservation.confirmationCode ? (
            <Text
              style={[fontStyles.uiRegular, { fontSize: 10, letterSpacing: 1, color: "#8A7E74" }]}
              numberOfLines={1}
            >
              · {reservation.confirmationCode}
            </Text>
          ) : null}
        </View>

        {/* Detail line */}
        {reservation.detailLine ? (
          <Text
            style={fontStyles.uiRegular}
            className="text-[11px] text-muted"
            numberOfLines={1}
          >
            {reservation.detailLine}
          </Text>
        ) : null}

        {/* Location hint */}
        {reservation.location ? (
          <View className="flex-row items-center gap-1 mt-[1px]">
            <Ionicons name="location-outline" size={10} color="#8A7E74" />
            <Text
              style={fontStyles.uiRegular}
              className="text-[10px] text-muted"
              numberOfLines={1}
            >
              {reservation.location}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Right column: price + status pill + delete */}
      <View className="items-end gap-[3px]">
        {reservation.priceLabel ? (
          <Text style={fontStyles.uiMedium} className="text-[13px] text-espresso">
            {reservation.priceLabel}
          </Text>
        ) : null}
        <StatusPill label={reservation.statusLabel} variant={reservation.statusVariant} />
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${reservation.title}`}
          className="mt-0.5"
        >
          <Ionicons name="trash-outline" size={13} color="#C9BCA8" />
        </Pressable>
      </View>
    </Pressable>
  );
}
