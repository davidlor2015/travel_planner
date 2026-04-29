// Path: ui-mobile/features/trips/reservations/BookingDetailSheet.tsx
// Summary: Implements BookingDetailSheet module logic.

import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BookingDetailViewModel } from "./bookingPresentation";
import { openNavigate } from "./bookingPresentation";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";

type Props = {
  vm: BookingDetailViewModel | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3 py-3 border-b border-smoke">
      <View className="w-5 items-center mt-[1px]">
        <Ionicons name={icon as never} size={14} color="#8A7E74" />
      </View>
      <View className="flex-1">
        <Text style={fontStyles.uiRegular} className="text-[10px] text-muted uppercase tracking-widest mb-[2px]">
          {label}
        </Text>
        <Text style={fontStyles.uiRegular} className="text-[13px] text-espresso">
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusPill({
  label,
  variant,
}: {
  label: string;
  variant: BookingDetailViewModel["statusVariant"];
}) {
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
    <View className={`self-start rounded-full px-2.5 py-[3px] ${bg}`}>
      <Text style={[fontStyles.uiMedium, { fontSize: 11, color: textColor, letterSpacing: 0.3 }]}>
        {label}
      </Text>
    </View>
  );
}

export function BookingDetailSheet({ vm, visible, onClose, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  if (!vm) return null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      onClose();
    } catch {
      setDeleteError("Couldn't delete this booking. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigate = async () => {
    if (!vm.navigateUrl || navigating) return;
    setNavigating(true);
    try {
      await openNavigate(vm.location!);
    } finally {
      setNavigating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/30" onPress={onClose} accessibilityLabel="Dismiss" />

      <View className="bg-parchment-soft rounded-t-[24px] overflow-hidden max-h-[85%]">
        {/* Handle */}
        <View className="items-center pt-3 pb-1">
          <View className="h-1 w-10 rounded-full bg-smoke" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header row */}
          <View className="flex-row items-center justify-between pt-3 pb-2">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-[9px] border border-smoke bg-ivory">
                <Ionicons name={vm.typeIconName} size={14} color="#8A7E74" />
              </View>
              <Text style={fontStyles.uiMedium} className="text-[11px] text-muted uppercase tracking-widest">
                {vm.typeLabel}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color="#8A7E74" />
            </Pressable>
          </View>

          {/* Title + status */}
          <View className="gap-2 pb-4 border-b border-smoke">
            <Text style={[textScaleStyles.displayL, { fontSize: 22, color: "#1C1108" }]} numberOfLines={2}>
              {vm.title}
            </Text>
            <View className="flex-row items-center gap-2">
              <StatusPill label={vm.statusLabel} variant={vm.statusVariant} />
              {vm.priceLabel ? (
                <Text style={fontStyles.uiMedium} className="text-[14px] text-espresso">
                  {vm.priceLabel}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Navigate CTA */}
          {vm.navigateUrl ? (
            <Pressable
              onPress={() => void handleNavigate()}
              className="flex-row items-center justify-center gap-2 mt-4 mb-1 rounded-[12px] border border-ontrip bg-ontrip px-4 py-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={`Navigate to ${vm.location}`}
            >
              <Ionicons name="navigate-outline" size={16} color={DE.ivory} />
              <Text style={fontStyles.uiSemibold} className="text-[13px] text-on-dark">
                {navigating ? "Opening Maps…" : "Navigate"}
              </Text>
            </Pressable>
          ) : null}

          {/* Detail rows */}
          <View className="mt-2">
            {vm.startLabel ? (
              <DetailRow icon="calendar-outline" label="Date / check-in" value={vm.startLabel} />
            ) : null}
            {vm.endLabel ? (
              <DetailRow icon="calendar-clear-outline" label="Check-out / end" value={vm.endLabel} />
            ) : null}
            {vm.provider ? (
              <DetailRow icon="business-outline" label="Provider" value={vm.provider} />
            ) : null}
            {vm.confirmationCode ? (
              <DetailRow icon="barcode-outline" label="Confirmation" value={vm.confirmationCode} />
            ) : null}
            {vm.location ? (
              <DetailRow icon="location-outline" label="Location" value={vm.location} />
            ) : null}
            {vm.notes ? (
              <DetailRow icon="document-text-outline" label="Notes" value={vm.notes} />
            ) : null}
          </View>

          {/* Delete error */}
          {deleteError ? (
            <View className="mt-4 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
              <Text style={fontStyles.uiRegular} className="text-[13px] text-danger">
                {deleteError}
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          {onEdit || onDelete ? (
            <View className="flex-row gap-2 mt-5">
              {onEdit ? (
                <View className="flex-1">
                  <PrimaryButton
                    label="Edit"
                    onPress={onEdit}
                    fullWidth
                  />
                </View>
              ) : null}
              {onDelete ? (
                <View className="flex-1">
                  <SecondaryButton
                    label={deleting ? "Deleting…" : "Delete"}
                    onPress={() => void handleDelete()}
                    fullWidth
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
