// Path: ui-mobile/features/trips/workspace/ItineraryTimelineDay.tsx
// Summary: Implements ItineraryTimelineDay module logic.

import { Pressable, Text, View } from "react-native";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

import type {
  ItineraryStopPill,
  ItineraryStopTimeBlock,
  ItineraryTabDay,
  ItineraryTabStop,
} from "./itineraryPresentation";

type Props = {
  day: ItineraryTabDay;
  onEditStop: (stopIndex: number) => void;
};

export function ItineraryTimelineDay({
  day,
  onEditStop,
}: Props) {
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between px-[22px]">
        <View className="min-w-0 flex-1 flex-row items-baseline gap-3">
          <Text
            className="text-[24px] leading-[28px]"
            style={[fontStyles.headMedium, { color: DE.ink }]}
          >
            {day.dayLabel}
          </Text>
          {day.dateLabel ? (
            <Text
              className="min-w-0 text-[10px] uppercase tracking-[1.8px]"
              style={[fontStyles.monoRegular, { color: DE.muted }]}
              numberOfLines={1}
            >
              {day.dateLabel}
            </Text>
          ) : null}
        </View>
        <Text className="text-[12px]" style={[fontStyles.uiRegular, { color: DE.muted }]}>
          {day.stopCountLabel}
        </Text>
      </View>

      <View
        className="mx-[22px] overflow-hidden rounded-[16px] border"
        style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
      >
        {day.stops.length > 0 ? (
          day.stops.map((stop, index) => (
            <ItineraryStopRow
              key={`${day.day.day_number}-${stop.stopIndex}-${stop.title}`}
              stop={stop}
              isLast={index === day.stops.length - 1}
              onPress={() => onEditStop(stop.stopIndex)}
            />
          ))
        ) : (
          <Text className="px-[18px] py-4 text-[13px] leading-[19px]" style={{ color: DE.muted }}>
            Nothing scheduled for this day.
          </Text>
        )}
      </View>
    </View>
  );
}

function ItineraryStopRow({
  stop,
  isLast,
  onPress,
}: {
  stop: ItineraryTabStop;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${stop.title}`}
      className={[
        "min-h-[68px] flex-row items-start gap-3.5 px-[18px] py-3.5 active:opacity-70",
        isLast ? "" : "border-b",
      ].join(" ")}
      style={isLast ? undefined : { borderBottomColor: DE.rule }}
    >
      <TimeBlock block={stop.timeBlock} />
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className="text-[14px] leading-[19px]"
          style={[fontStyles.uiSemibold, { color: DE.ink }]}
          numberOfLines={2}
        >
          {stop.title}
        </Text>
        {stop.location ? (
          <Text className="text-[12px] leading-[16px]" style={{ color: DE.muted }} numberOfLines={1}>
            {stop.location}
          </Text>
        ) : null}
      </View>
      <StopPill pill={stop.pill} />
    </Pressable>
  );
}

function TimeBlock({ block }: { block: ItineraryStopTimeBlock }) {
  const displayTime =
    block.secondary && /\d/.test(block.secondary) ? block.secondary : block.primary;

  return (
    <View className="w-11 shrink-0 pt-0.5">
      <Text
        className="text-[12px] leading-[16px] tracking-[0.5px]"
        style={[fontStyles.monoMedium, { color: DE.ink }]}
        numberOfLines={1}
      >
        {displayTime}
      </Text>
    </View>
  );
}

function StopPill({ pill }: { pill: ItineraryStopPill }) {
  const backgroundColor =
    pill.tone === "reservation" ? "rgba(148, 164, 135, 0.33)" : DE.claySandLight;

  return (
    <View
      className="max-w-[88px] shrink-0 rounded-full px-2.5 py-1"
      style={{ backgroundColor }}
    >
      <Text
        className="text-[10.5px] leading-[13px]"
        style={[fontStyles.uiMedium, { color: DE.ink }]}
        numberOfLines={1}
      >
        {pill.label}
      </Text>
    </View>
  );
}
