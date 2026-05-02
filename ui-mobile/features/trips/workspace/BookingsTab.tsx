// Path: ui-mobile/features/trips/workspace/BookingsTab.tsx
// Summary: Implements BookingsTab module logic.

import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

import { BookingDetailSheet } from "@/features/trips/reservations/BookingDetailSheet";
import { BookingFormSheet } from "@/features/trips/reservations/BookingFormSheet";
import { BookingRow } from "@/features/trips/reservations/BookingRow";
import {
  BOOKING_FILTER_CHIPS,
  filterReservations,
  toReservationViewModel,
} from "@/features/trips/reservations/adapters";
import type { BookingFilterKey } from "@/features/trips/reservations/adapters";
import type { Reservation } from "@/features/trips/reservations/api";
import type { ReservationPayload } from "@/features/trips/reservations/api";
import { importReservationConfirmation } from "@/features/trips/reservations/api";
import { mapImportFieldsToReservationPayload } from "@/features/trips/reservations/importMapping";
import {
  buildDetailViewModel,
  groupReservationsByTime,
} from "@/features/trips/reservations/bookingPresentation";
import type { BookingDetailViewModel } from "@/features/trips/reservations/bookingPresentation";
import { useReservations } from "@/features/trips/reservations/hooks";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import { ReadOnlyNotice } from "./ReadOnlyNotice";

type Props = { tripId: number; isReadOnly?: boolean };

function filterLabel(filter: BookingFilterKey): string {
  return (
    BOOKING_FILTER_CHIPS.find(
      (chip) => chip.key === filter,
    )?.label.toLowerCase() ?? "filtered"
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-row items-center justify-between pt-3 pb-1.5">
      <Text
        style={[
          fontStyles.monoMedium,
          { fontSize: 10, letterSpacing: 1.8, color: DE.muted },
        ]}
      >
        {label}
      </Text>
      <Text style={[fontStyles.uiRegular, { fontSize: 11, color: DE.muted }]}>
        {count}
      </Text>
    </View>
  );
}

export function BookingsTab({ tripId, isReadOnly = false }: Props) {
  const reservations = useReservations(tripId);
  const [activeFilter, setActiveFilter] = useState<BookingFilterKey>("all");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showAddChooser, setShowAddChooser] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Reservation | null>(null);
  const [editItem, setEditItem] = useState<Reservation | null>(null);
  const [addInitialValues, setAddInitialValues] = useState<
    ReservationPayload | undefined
  >(undefined);
  const [addFormHelperText, setAddFormHelperText] = useState<string | null>(
    null,
  );
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

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
  const filteredItems = filterReservations(allItems, activeFilter);
  const groups = groupReservationsByTime(filteredItems);

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

  const handleUploadConfirmation = async () => {
    if (isReadOnly || importing) return;

    setImportMessage(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setImporting(true);
    try {
      const response = await importReservationConfirmation(tripId, {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      });
      if (response.status === "extracted") {
        setAddInitialValues(
          mapImportFieldsToReservationPayload(response.fields),
        );
        setAddFormHelperText("We found these details. Review before saving.");
        setShowAddChooser(false);
        setShowAddSheet(true);
        return;
      }
      if (response.status === "needs_image_extraction") {
        setImportMessage(
          "We could not read this file yet. You can upload another PDF or type it in manually.",
        );
        return;
      }
      if (response.status === "needs_manual_entry") {
        setImportMessage(
          "We could not extract the booking details. You can type them in manually.",
        );
        return;
      }
      setImportMessage(
        "This file type is not supported. Try uploading a PDF confirmation.",
      );
    } catch {
      setImportMessage(
        "We couldn't process that upload right now. You can type it in manually.",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleOpenManualEntry = () => {
    if (isReadOnly) return;
    setAddInitialValues(undefined);
    setAddFormHelperText(null);
    setImportMessage(null);
    setShowAddSheet(true);
  };

  const openAddChooser = () => {
    if (isReadOnly) return;
    setShowAddChooser(true);
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: DE.ivory }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text
            style={[
              fontStyles.monoMedium,
              {
                fontSize: 10,
                letterSpacing: 2,
                color: DE.muted,
              },
            ]}
          >
            RESERVATIONS
          </Text>

          <View className="mt-2 flex-row items-center justify-between">
            <Text
              style={[
                fontStyles.headMedium,
                { fontSize: 28, lineHeight: 30, color: DE.ink },
              ]}
            >
              {allItems.length}{" "}
              <Text style={[fontStyles.headMediumItalic, { fontSize: 28 }]}>
                {allItems.length === 1 ? "booking" : "bookings"}
              </Text>
            </Text>
            <Pressable
              onPress={openAddChooser}
              disabled={isReadOnly}
              className="flex-row items-center gap-1 pb-1"
              accessibilityRole="button"
              accessibilityLabel="Add booking"
              style={isReadOnly ? { opacity: 0.45 } : undefined}
            >
              <Text
                style={[fontStyles.uiMedium, { fontSize: 15, color: DE.ink }]}
              >
                +
              </Text>
              <Text
                style={[
                  fontStyles.headMediumItalic,
                  { fontSize: 20, color: DE.ink },
                ]}
              >
                Add
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginLeft: -12 }}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: 8,
              paddingRight: 8,
            }}
          >
            {BOOKING_FILTER_CHIPS.map((chip) => {
              const isActive = activeFilter === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setActiveFilter(chip.key)}
                  className="relative flex-shrink-0 px-3 py-2"
                  accessibilityRole="button"
                  accessibilityLabel={chip.label}
                >
                  <Text
                    style={[
                      isActive ? fontStyles.uiSemibold : fontStyles.uiRegular,
                      {
                        fontSize: 14,
                        lineHeight: 18,
                        color: isActive ? DE.ink : DE.muted,
                      },
                    ]}
                  >
                    {chip.label}
                  </Text>
                  {isActive ? (
                    <View
                      className="absolute bottom-0 left-3 right-3 rounded-full"
                      style={{ height: 1, backgroundColor: DE.ink }}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ height: 1, backgroundColor: DE.ruleStrong }} />

          {isReadOnly ? <ReadOnlyNotice className="mb-3" /> : null}

          {mutationError ? (
            <View className="mb-3 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
              <Text
                style={fontStyles.uiRegular}
                className="text-[13px] text-danger"
              >
                {mutationError}
              </Text>
            </View>
          ) : null}

          {importMessage ? (
            <View
              className="mb-3 rounded-xl px-3.5 py-3"
              style={{
                borderWidth: 1,
                borderColor: `${DE.clay}40`,
                backgroundColor: `${DE.clay}1A`,
              }}
            >
              <Text
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 13, color: DE.inkSoft },
                ]}
              >
                {importMessage}
              </Text>
            </View>
          ) : null}

          {allItems.length === 0 ? (
            <View className="mt-6">
              <Text
                style={[
                  fontStyles.monoMedium,
                  {
                    fontSize: 10,
                    letterSpacing: 1.8,
                    color: DE.muted,
                    marginBottom: 12,
                  },
                ]}
              >
                NO. 01 — BEGIN
              </Text>
              <Text
                style={[
                  fontStyles.headMedium,
                  {
                    fontSize: 32,
                    lineHeight: 36,
                    color: DE.ink,
                    marginBottom: 14,
                  },
                ]}
              >
                Nothing booked{" "}
                <Text style={[fontStyles.headSemiboldItalic, { fontSize: 32 }]}>
                  yet
                </Text>
                .
              </Text>
              <View
                className="mb-4 h-px"
                style={{ backgroundColor: DE.ruleStrong }}
              />
              <Pressable
                onPress={openAddChooser}
                disabled={isReadOnly}
                className="mt-6 flex-row items-center gap-3"
                accessibilityRole="button"
                accessibilityLabel="Add your first booking"
                style={isReadOnly ? { opacity: 0.45 } : undefined}
              >
                <Text
                  style={[
                    fontStyles.headSemiboldItalic,
                    { fontSize: 20, color: DE.ink },
                  ]}
                >
                  Add your first booking
                </Text>
                <Text
                  style={[
                    fontStyles.headMedium,
                    { fontSize: 18, color: DE.ink },
                  ]}
                >
                  →
                </Text>
              </Pressable>
            </View>
          ) : filteredItems.length === 0 ? (
            <View className="py-8">
              <Text
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 13, color: DE.muted },
                ]}
              >
                No {filterLabel(activeFilter)} bookings yet.
              </Text>
            </View>
          ) : (
            <View className="mt-2 border-t" style={{ borderTopColor: DE.rule }}>
              {groups.upcoming.length > 0 ? (
                <View>
                  <SectionHeader
                    label="UPCOMING"
                    count={groups.upcoming.length}
                  />
                  <View className="gap-2.5">
                    {groups.upcoming.map((reservation) => (
                      <BookingRow
                        key={reservation.id}
                        reservation={toReservationViewModel(reservation)}
                        onPress={() => setSelectedItem(reservation)}
                        onDelete={
                          isReadOnly
                            ? undefined
                            : () => void handleRemove(reservation.id)
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {groups.past.length > 0 ? (
                <View>
                  <SectionHeader label="PAST" count={groups.past.length} />
                  <View className="gap-2.5">
                    {groups.past.map((reservation) => (
                      <View key={reservation.id} style={{ opacity: 0.58 }}>
                        <BookingRow
                          reservation={toReservationViewModel(reservation)}
                          onPress={() => setSelectedItem(reservation)}
                          onDelete={
                            isReadOnly
                              ? undefined
                              : () => void handleRemove(reservation.id)
                          }
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddChooser}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddChooser(false)}
      >
        <View className="flex-1 justify-end px-5">
          <Pressable
            className="absolute inset-0 bg-black/25"
            onPress={() => setShowAddChooser(false)}
            accessibilityLabel="Dismiss add booking options"
          />
          <View className="mb-8 rounded-2xl bg-ivory p-4">
            <Text
              style={[fontStyles.headSemibold, { fontSize: 22, color: DE.ink }]}
            >
              Add booking
            </Text>
            <Text
              style={[
                fontStyles.uiRegular,
                { fontSize: 13, color: DE.muted, marginTop: 4 },
              ]}
            >
              Choose how you want to add this reservation.
            </Text>

            <Pressable
              className="mt-4 rounded-xl border border-ontrip bg-ontrip px-4 py-3"
              accessibilityRole="button"
              accessibilityLabel="Upload confirmation"
              disabled={importing}
              style={importing ? { opacity: 0.65 } : undefined}
              onPress={() => {
                void handleUploadConfirmation();
              }}
            >
              <Text
                style={[
                  fontStyles.uiSemibold,
                  { fontSize: 13, color: DE.ivory },
                ]}
              >
                {importing ? "Extracting…" : "Upload confirmation"}
              </Text>
            </Pressable>

            <Pressable
              className="mt-2 rounded-xl border border-smoke px-4 py-3"
              accessibilityRole="button"
              accessibilityLabel="Type it in manually"
              onPress={() => {
                setShowAddChooser(false);
                handleOpenManualEntry();
              }}
            >
              <Text
                style={[
                  fontStyles.uiMedium,
                  { fontSize: 13, color: DE.inkSoft },
                ]}
              >
                Type it in manually
              </Text>
            </Pressable>

            <Pressable
              className="mt-2 rounded-xl px-4 py-3"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setShowAddChooser(false)}
            >
              <Text
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 13, color: DE.muted, textAlign: "center" },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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

      <BookingFormSheet
        visible={editItem !== null}
        initialValues={editItem ?? undefined}
        onClose={() => setEditItem(null)}
        onSave={async (payload) => {
          if (editItem) await handleEdit(editItem, payload);
        }}
      />

      <BookingFormSheet
        visible={showAddSheet}
        initialValues={addInitialValues}
        helperText={addFormHelperText}
        onClose={() => {
          setShowAddSheet(false);
          setAddInitialValues(undefined);
          setAddFormHelperText(null);
        }}
        onSave={async (payload) => {
          await reservations.addReservation(payload);
        }}
      />
    </>
  );
}
