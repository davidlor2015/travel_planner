// Path: ui-mobile/features/trips/DateRangePickerSheet.tsx
// Summary: Implements a Waypoint-styled date range picker sheet.

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, SecondaryButton } from "@/shared/ui/Button";
import { fontStyles } from "@/shared/theme/typography";

type SelectionMode = "start" | "end";

type Props = {
  visible: boolean;
  startDate: string;
  endDate: string;
  initialSelectionMode: SelectionMode;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  showDurationChips?: boolean;
  onConfirm: (range: { startDate: string; endDate: string }) => void;
  onClose: () => void;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DURATION_CHIPS = [
  { label: "Weekend", days: 3 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
];

export function DateRangePickerSheet({
  visible,
  startDate,
  endDate,
  initialSelectionMode,
  title = "When is your trip?",
  subtitle = "Choose the days you'll be away.",
  confirmLabel = "Confirm dates",
  showDurationChips = true,
  onConfirm,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [draftStart, setDraftStart] = useState<string>("");
  const [draftEnd, setDraftEnd] = useState<string>("");
  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>(initialSelectionMode);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    startOfMonth(parseISODate(startDate) ?? new Date()),
  );

  useEffect(() => {
    if (!visible) return;
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setSelectionMode(initialSelectionMode);
    setVisibleMonth(startOfMonth(parseISODate(startDate) ?? new Date()));
  }, [endDate, initialSelectionMode, startDate, visible]);

  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const summary = buildRangeSummary(draftStart, draftEnd);
  const todayIso = toISODate(new Date());

  function handleDatePress(dateIso: string) {
    if (!draftStart) {
      setDraftStart(dateIso);
      setDraftEnd("");
      setSelectionMode("end");
      return;
    }

    if (selectionMode === "start") {
      if (draftEnd) {
        const duration = daysInclusive(draftStart, draftEnd) ?? 2;
        setDraftStart(dateIso);
        setDraftEnd(addDaysISO(dateIso, Math.max(duration - 1, 1)));
      } else {
        setDraftStart(dateIso);
      }
      setSelectionMode("end");
      return;
    }

    if (dateIso < draftStart) {
      setDraftStart(dateIso);
      setDraftEnd("");
      setSelectionMode("end");
      return;
    }

    setDraftEnd(dateIso);
  }

  function handleDurationPress(days: number) {
    const anchor = draftStart || toISODate(new Date());
    setDraftStart(anchor);
    setDraftEnd(addDaysISO(anchor, days - 1));
    setSelectionMode("end");
  }

  function handleConfirm() {
    if (!draftStart) return;
    const confirmedStart = draftStart;
    const confirmedEnd = draftEnd || addDaysISO(confirmedStart, 1);
    onConfirm({ startDate: confirmedStart, endDate: confirmedEnd });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/30">
        <View
          className="rounded-t-[28px] bg-bg px-4 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 14) }}
        >
          <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />
          <View className="flex-row items-start justify-between pb-4">
            <View className="flex-1 pr-4">
              <Text className="text-lg text-text" style={fontStyles.uiSemibold}>
                {title}
              </Text>
              <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close date picker"
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-white"
            >
              <Ionicons name="close" size={21} color="#8A7E74" />
            </Pressable>
          </View>

          <View className="rounded-3xl border border-border bg-ivory p-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                accessibilityRole="button"
                accessibilityLabel="Show previous month"
                className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-muted active:opacity-70"
              >
                <Ionicons name="chevron-back" size={18} color="#6B5E52" />
              </Pressable>
              <Text className="text-base text-text" style={fontStyles.uiSemibold}>
                {formatMonthHeading(visibleMonth)}
              </Text>
              <Pressable
                onPress={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                accessibilityRole="button"
                accessibilityLabel="Show next month"
                className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-muted active:opacity-70"
              >
                <Ionicons name="chevron-forward" size={18} color="#6B5E52" />
              </Pressable>
            </View>

            <View className="mt-4 flex-row">
              {WEEKDAYS.map((weekday, index) => (
                <Text
                  key={`${weekday}-${index}`}
                  className="flex-1 text-center text-[10px] uppercase text-text-soft"
                  style={fontStyles.monoMedium}
                >
                  {weekday}
                </Text>
              ))}
            </View>

            <View className="mt-2 flex-row flex-wrap">
              {monthCells.map((cell, index) => {
                if (!cell) {
                  return <View key={`empty-${index}`} className="h-11 w-[14.285%]" />;
                }

                const selectedStart = cell.iso === draftStart;
                const selectedEnd = cell.iso === draftEnd;
                const inRange = Boolean(
                  draftStart &&
                    draftEnd &&
                    cell.iso > draftStart &&
                    cell.iso < draftEnd,
                );
                const isToday = cell.iso === todayIso;
                const selected = selectedStart || selectedEnd;

                return (
                  <View key={cell.iso} className="h-11 w-[14.285%] justify-center px-0.5">
                    <Pressable
                      onPress={() => handleDatePress(cell.iso)}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose ${formatFullDate(cell.iso)}`}
                      className={[
                        "h-10 items-center justify-center rounded-full border active:opacity-75",
                        selected
                          ? "border-accent bg-accent"
                          : inRange
                            ? "border-surface-sunken bg-surface-sunken"
                            : isToday
                              ? "border-accent bg-white"
                              : "border-transparent bg-transparent",
                      ].join(" ")}
                    >
                      <Text
                        className={[
                          "text-sm",
                          selected
                            ? "text-white"
                            : cell.inCurrentMonth
                              ? "text-text"
                              : "text-text-soft",
                        ].join(" ")}
                        style={selected ? fontStyles.uiSemibold : fontStyles.uiMedium}
                      >
                        {cell.day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-3 rounded-2xl border border-border bg-surface-muted px-4 py-3">
            <Text className="text-[10px] uppercase tracking-[1.2px] text-text-soft" style={fontStyles.monoMedium}>
              Selected dates
            </Text>
            <View className="mt-1 flex-row items-end justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-base text-text" style={fontStyles.uiSemibold}>
                  {summary.rangeLabel}
                </Text>
                <Text
                  accessibilityLabel={`Trip length, ${summary.detailLabel}`}
                  className="mt-0.5 text-xs text-text-muted"
                  style={fontStyles.uiRegular}
                >
                  {summary.detailLabel}
                </Text>
              </View>
            </View>
          </View>

          {showDurationChips ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {DURATION_CHIPS.map((chip) => (
                <Pressable
                  key={chip.label}
                  onPress={() => handleDurationPress(chip.days)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set trip duration to ${chip.label}`}
                  className="rounded-full border border-border bg-white px-3 py-2 active:opacity-70"
                >
                  <Text className="text-xs text-text-muted" style={fontStyles.uiSemibold}>
                    {chip.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View className="mt-4 gap-2">
            <Button
              label={confirmLabel}
              onPress={handleConfirm}
              disabled={!draftStart}
              fullWidth
              variant="ontrip"
            />
            <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

type MonthCell = {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
};

function buildMonthCells(monthDate: Date): (MonthCell | null)[] {
  const first = startOfMonth(monthDate);
  const leadingEmptyCount = first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (MonthCell | null)[] = Array.from({ length: leadingEmptyCount }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(first.getFullYear(), first.getMonth(), day);
    cells.push({ iso: toISODate(date), day, inCurrentMonth: true });
  }

  const trailingEmptyCount = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingEmptyCount; index += 1) {
    cells.push(null);
  }

  return cells;
}

function buildRangeSummary(
  startDate: string,
  endDate: string,
): { rangeLabel: string; detailLabel: string } {
  if (!startDate) {
    return {
      rangeLabel: "Choose a start date",
      detailLabel: "Then choose the day you come home.",
    };
  }

  if (!endDate) {
    return {
      rangeLabel: "Choose an end date",
      detailLabel: `${formatShortDate(startDate)} selected`,
    };
  }

  const days = daysInclusive(startDate, endDate) ?? 1;
  return {
    rangeLabel: `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`,
    detailLabel: `${days} ${days === 1 ? "day" : "days"}`,
  };
}

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function addDaysISO(value: string, days: number): string {
  const date = parseISODate(value) ?? new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function daysInclusive(startDate: string, endDate: string): number | null {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (!start || !end || end < start) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function formatMonthHeading(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatShortDate(value: string): string {
  const date = parseISODate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(value: string): string {
  const date = parseISODate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
