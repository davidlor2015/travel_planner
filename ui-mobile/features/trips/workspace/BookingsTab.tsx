import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import type { ReservationType } from "@/features/trips/reservations/api";
import { BookingRow } from "@/features/trips/reservations/BookingRow";
import { toReservationViewModel } from "@/features/trips/reservations/adapters";
import { useReservations } from "@/features/trips/reservations/hooks";
import { PrimaryButton } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

const TYPES: ReservationType[] = [
  "flight",
  "hotel",
  "train",
  "bus",
  "car",
  "activity",
  "restaurant",
  "other",
];

const TYPE_ICONS: Record<ReservationType, string> = {
  flight: "✈",
  hotel: "🏨",
  train: "🚆",
  bus: "🚌",
  car: "🚗",
  activity: "🎯",
  restaurant: "🍽",
  other: "📌",
};

type Props = { tripId: number };

export function BookingsTab({ tripId }: Props) {
  const reservations = useReservations(tripId);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReservationType>("other");
  const [mutationError, setMutationError] = useState<string | null>(null);

  if (reservations.loading) {
    return <ScreenLoading label="Loading bookings…" />;
  }

  if (reservations.error) {
    return (
      <ScreenError
        message="We couldn't load your bookings. Try again in a moment."
        onRetry={() => void reservations.reload?.()}
      />
    );
  }

  const handleAdd = async () => {
    if (!title.trim()) return;
    try {
      setMutationError(null);
      await reservations.addReservation({
        title: title.trim(),
        reservation_type: type,
      });
      setTitle("");
    } catch {
      setMutationError("We couldn't add that booking. Try again.");
    }
  };

  const handleRemoveReservation = async (reservationId: number) => {
    try {
      setMutationError(null);
      await reservations.removeReservation(reservationId);
    } catch {
      setMutationError("We couldn't remove that booking. Try again.");
    }
  };

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      {mutationError ? (
        <View className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
          <Text className="text-sm text-danger">{mutationError}</Text>
        </View>
      ) : null}
      <SectionCard
        eyebrow="Add booking"
        title="Reservations"
        description="Capture confirmations and timing here so the trip is usable on the ground."
      >
        <View className="gap-3">
          <TextInputField
            label="Booking title"
            placeholder="e.g. Flight to Paris"
          value={title}
          onChangeText={setTitle}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="my-0.5"
        >
          {TYPES.map((t) => (
            <View
              key={t}
              className={`mr-1.5 rounded-full border px-3 py-1.5 ${type === t ? "border-text bg-text" : "border-border bg-white"}`}
            >
              <Text
                onPress={() => setType(t)}
                className={`text-[13px] ${type === t ? "text-white" : "text-text-muted"}`}
              >
                {TYPE_ICONS[t]} {t}
              </Text>
            </View>
          ))}
        </ScrollView>
          <PrimaryButton label="Add booking" onPress={() => void handleAdd()} fullWidth />
        </View>
      </SectionCard>

      {reservations.items.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="Add flights, stays, and confirmed reservations here so execution details stay close to the itinerary."
        />
      ) : (
        <SectionCard eyebrow="Current bookings" title="Trip logistics">
          {reservations.items.map((r) => (
            <BookingRow
              key={r.id}
              reservation={toReservationViewModel(r)}
              onDelete={() => void handleRemoveReservation(r.id)}
            />
          ))}
        </SectionCard>
      )}
    </ScrollView>
  );
}
