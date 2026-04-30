// Path: ui-mobile/features/trips/workspace/BookingsTab.tsx
// Summary: Implements BookingsTab module logic.

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BookingDetailSheet } from "@/features/trips/reservations/BookingDetailSheet";
import { BookingFormSheet } from "@/features/trips/reservations/BookingFormSheet";
import { BookingRow } from "@/features/trips/reservations/BookingRow";
import {
  BOOKING_FILTER_CHIPS,
  buildConfirmationSummary,
  filterReservations,
  toReservationViewModel,
} from "@/features/trips/reservations/adapters";
import type { BookingFilterKey } from "@/features/trips/reservations/adapters";
import type { Reservation } from "@/features/trips/reservations/api";
import {
  buildDetailViewModel,
  groupReservationsByTime,
  openNavigate,
} from "@/features/trips/reservations/bookingPresentation";
import type { BookingDetailViewModel } from "@/features/trips/reservations/bookingPresentation";
import { useReservations } from "@/features/trips/reservations/hooks";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import { ReadOnlyNotice } from "./ReadOnlyNotice";

type Props = { tripId: number; isReadOnly?: boolean };

// ─── Next Up hero card ───────────────────────────────────────────────────────

function NextUpCard({
  vm,
  onPress,
}: {
  vm: BookingDetailViewModel;
  onPress: () => void;
}) {
  const [navigating, setNavigating] = useState(false);

  const handleNavigate = async (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    if (!vm.location || navigating) return;
    setNavigating(true);
    try {
      await openNavigate(vm.location);
    } finally {
      setNavigating(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${vm.title} details`}
      className="rounded-[16px] border border-[#D9CFC4] bg-ivory overflow-hidden active:opacity-70"
    >
      {/* Amber accent strip */}
      <View className="h-[3px] w-full bg-amber opacity-70" />

      <View className="px-4 py-4 gap-3">
        {/* Eyebrow */}
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flash-outline" size={11} color="#B86845" />
          <Text
            style={[
              fontStyles.uiMedium,
              { fontSize: 10, letterSpacing: 1.4, color: "#B86845" },
            ]}
          >
            NEXT UP
          </Text>
        </View>

        {/* Main row */}
        <View className="flex-row items-start gap-3">
          {/* Icon */}
          <View className="h-10 w-10 items-center justify-center rounded-[11px] border border-smoke bg-parchment-soft">
            <Ionicons name={vm.typeIconName} size={17} color="#8A7E74" />
          </View>

          {/* Content */}
          <View className="flex-1 gap-[4px]">
            <Text
              style={[
                textScaleStyles.displayL,
                { fontSize: 17, color: "#1C1108" },
              ]}
              numberOfLines={1}
            >
              {vm.title}
            </Text>
            {vm.startLabel ? (
              <Text
                style={fontStyles.uiRegular}
                className="text-[12px] text-muted"
                numberOfLines={1}
              >
                {vm.startLabel}
              </Text>
            ) : null}
            {vm.location ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={10} color="#8A7E74" />
                <Text
                  style={fontStyles.uiRegular}
                  className="text-[11px] text-muted"
                  numberOfLines={1}
                >
                  {vm.location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Right: price + pill */}
          <View className="items-end gap-1.5">
            {vm.priceLabel ? (
              <Text
                style={fontStyles.uiMedium}
                className="text-[13px] text-espresso"
              >
                {vm.priceLabel}
              </Text>
            ) : null}
            <View
              className={[
                "rounded-full px-2.5 py-[3px]",
                vm.statusVariant === "confirmed"
                  ? "bg-[#dde0cd]"
                  : vm.statusVariant === "pending"
                    ? "bg-[#ead7c9]"
                    : "bg-smoke",
              ].join(" ")}
            >
              <Text
                style={[
                  fontStyles.uiMedium,
                  {
                    fontSize: 11,
                    letterSpacing: 0.3,
                    color:
                      vm.statusVariant === "confirmed"
                        ? "#6f7a4a"
                        : vm.statusVariant === "pending"
                          ? "#b9714f"
                          : "#8A7E74",
                  },
                ]}
              >
                {vm.statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Navigate CTA */}
        {vm.navigateUrl ? (
          <Pressable
            onPress={(e) => void handleNavigate(e)}
            className="flex-row items-center justify-center gap-2 rounded-[10px] border border-ontrip bg-ontrip py-2.5 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${vm.location}`}
          >
            <Ionicons name="navigate-outline" size={13} color={DE.ivory} />
            <Text
              style={fontStyles.uiSemibold}
              className="text-[12px] text-on-dark"
            >
              {navigating ? "Opening Maps…" : "Navigate"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-row items-center justify-between pt-2 pb-1">
      <Text
        style={[
          fontStyles.uiMedium,
          { fontSize: 10, letterSpacing: 1.5, color: "#8A7E74" },
        ]}
      >
        {label}
      </Text>
      <Text style={fontStyles.uiRegular} className="text-[10px] text-muted">
        {count}
      </Text>
    </View>
  );
}

// ─── Main tab ────────────────────────────────────────────────────────────────

export function BookingsTab({ tripId, isReadOnly = false }: Props) {
  const reservations = useReservations(tripId);
  const [activeFilter, setActiveFilter] = useState<BookingFilterKey>("all");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Reservation | null>(null);
  const [editItem, setEditItem] = useState<Reservation | null>(null);
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

  const allItems = reservations.items;
  const summary = buildConfirmationSummary(allItems);
  const filteredItems = filterReservations(allItems, activeFilter);
  const groups = groupReservationsByTime(filteredItems);

  const heroItem =
    groups.nextUpcoming?.start_at !== undefined &&
    groups.nextUpcoming?.start_at !== null
      ? groups.nextUpcoming
      : null;

  const remainingUpcoming = heroItem
    ? groups.upcoming.filter((r) => r.id !== heroItem.id)
    : groups.upcoming;

  const detailVm: BookingDetailViewModel | null = selectedItem
    ? buildDetailViewModel(selectedItem)
    : null;

  const handleRemove = async (id: number) => {
    try {
      setMutationError(null);
      await reservations.removeReservation(id);
    } catch {
      setMutationError("We couldn't remove that booking. Try again.");
    }
  };

  const handleEdit = async (
    item: Reservation,
    payload: Parameters<typeof reservations.editReservation>[1],
  ) => {
    try {
      setMutationError(null);
      await reservations.editReservation(item.id, payload);
    } catch {
      setMutationError("We couldn't update that booking. Try again.");
    }
  };

  const totalSegments = summary.total;

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View className="px-5 pt-5 pb-3">
          <View className="flex-row items-start justify-between">
            <View className="gap-[2px]">
              <Text
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 11, letterSpacing: 1.76, color: "#8A7E74" },
                ]}
              >
                RESERVATIONS
              </Text>
              <Text
                style={[
                  textScaleStyles.displayL,
                  { fontSize: 22, color: "#1C1108" },
                ]}
              >
                {summary.confirmedLabel}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowAddSheet(true)}
              disabled={isReadOnly}
              className="flex-row items-center gap-1 pt-1"
              accessibilityRole="button"
              accessibilityLabel="Add booking"
              accessibilityHint={
                isReadOnly
                  ? "View-only travelers cannot add bookings."
                  : undefined
              }
              style={isReadOnly ? { opacity: 0.45 } : undefined}
            >
              <Ionicons name="add" size={13} color="#B86845" />
              <Text
                style={fontStyles.uiMedium}
                className="text-[12px] text-amber"
              >
                Add
              </Text>
            </Pressable>
          </View>

          {/* Progress bar */}
          {totalSegments > 0 ? (
            <View className="mt-3 flex-row gap-2 h-1">
              {summary.confirmed > 0 ? (
                <View
                  className="h-full rounded-full bg-[#6f7a4a]"
                  style={{ flex: summary.confirmed }}
                />
              ) : null}
              {summary.pending > 0 ? (
                <View
                  className="h-full rounded-full bg-[#ead7c9]"
                  style={{ flex: summary.pending }}
                />
              ) : null}
              {summary.unscheduled > 0 ? (
                <View
                  className="h-full rounded-full bg-smoke"
                  style={{ flex: summary.unscheduled }}
                />
              ) : null}
            </View>
          ) : (
            <View className="mt-3 h-1 rounded-full bg-smoke" />
          )}
        </View>

        {isReadOnly ? <ReadOnlyNotice className="mx-5 mb-3" /> : null}

        {/* ── Filter chips ──────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 12,
            gap: 8,
          }}
        >
          {BOOKING_FILTER_CHIPS.map((chip) => {
            const active = activeFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setActiveFilter(chip.key)}
                className={[
                  "rounded-full border px-3.5 py-1.5",
                  active
                    ? "border-ontrip bg-ontrip"
                    : "border-smoke bg-transparent",
                ].join(" ")}
              >
                <Text
                  style={fontStyles.uiMedium}
                  className={[
                    "text-[11px]",
                    active ? "text-on-dark" : "text-[#4a3f37]",
                  ].join(" ")}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Mutation error ────────────────────────────────────────────────── */}
        {mutationError ? (
          <View className="mx-5 mb-3 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
            <Text
              style={fontStyles.uiRegular}
              className="text-[13px] text-danger"
            >
              {mutationError}
            </Text>
          </View>
        ) : null}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {allItems.length === 0 ? (
          <View className="px-5">
            <EmptyState
              title="No bookings yet"
              message="Flight time, hotel addresses, confirmation numbers - keep it all here so you're never digging through email mid-trip."
            />
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="px-5 py-8 items-center">
            <Text
              style={fontStyles.uiRegular}
              className="text-[13px] text-muted text-center"
            >
              No {activeFilter} bookings yet.
            </Text>
          </View>
        ) : (
          <View className="px-5 gap-3">
            {/* Next Up hero */}
            {heroItem ? (
              <View className="gap-1">
                <NextUpCard
                  vm={buildDetailViewModel(heroItem)}
                  onPress={() => setSelectedItem(heroItem)}
                />
              </View>
            ) : null}

            {/* Upcoming section */}
            {remainingUpcoming.length > 0 ? (
              <View className="gap-2">
                <SectionHeader
                  label="UPCOMING"
                  count={remainingUpcoming.length}
                />
                {remainingUpcoming.map((r) => (
                  <BookingRow
                    key={r.id}
                    reservation={toReservationViewModel(r)}
                    onPress={() => setSelectedItem(r)}
                    onDelete={
                      isReadOnly ? undefined : () => void handleRemove(r.id)
                    }
                  />
                ))}
              </View>
            ) : groups.upcoming.length > 0 && !heroItem ? (
              // Unscheduled upcoming (no start_at) — no hero, show as flat list
              <View className="gap-2">
                <SectionHeader
                  label="UPCOMING"
                  count={groups.upcoming.length}
                />
                {groups.upcoming.map((r) => (
                  <BookingRow
                    key={r.id}
                    reservation={toReservationViewModel(r)}
                    onPress={() => setSelectedItem(r)}
                    onDelete={
                      isReadOnly ? undefined : () => void handleRemove(r.id)
                    }
                  />
                ))}
              </View>
            ) : null}

            {/* Past section */}
            {groups.past.length > 0 ? (
              <View className="gap-2">
                <SectionHeader label="PAST" count={groups.past.length} />
                {groups.past.map((r) => (
                  <View key={r.id} style={{ opacity: 0.55 }}>
                    <BookingRow
                      reservation={toReservationViewModel(r)}
                      onPress={() => setSelectedItem(r)}
                      onDelete={
                        isReadOnly ? undefined : () => void handleRemove(r.id)
                      }
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ── Detail sheet ─────────────────────────────────────────────────────── */}
      <BookingDetailSheet
        vm={detailVm}
        visible={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        onEdit={
          isReadOnly
            ? undefined
            : () => {
                const item = selectedItem;
                setSelectedItem(null);
                setEditItem(item);
              }
        }
        onDelete={
          isReadOnly
            ? undefined
            : async () => {
                if (selectedItem) await handleRemove(selectedItem.id);
              }
        }
      />

      {/* ── Edit booking sheet ───────────────────────────────────────────────── */}
      <BookingFormSheet
        visible={editItem !== null}
        initialValues={editItem ?? undefined}
        onClose={() => setEditItem(null)}
        onSave={async (payload) => {
          if (editItem) await handleEdit(editItem, payload);
        }}
      />

      {/* ── Add booking sheet ────────────────────────────────────────────────── */}
      <BookingFormSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSave={async (payload) => {
          await reservations.addReservation(payload);
        }}
      />
    </>
  );
}
