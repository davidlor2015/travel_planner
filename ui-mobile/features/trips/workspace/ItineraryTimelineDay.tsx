import { Pressable, Text, View } from "react-native";

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

export function ItineraryTimelineDay({ day, onEditStop }: Props) {
  return (
    <View className="gap-2">
      <View className="flex-row items-end justify-between">
        <View className="min-w-0 flex-1 flex-row items-end gap-2">
          <Text
            className="text-[18px] leading-[27px] text-espresso"
            style={fontStyles.displayMedium}
          >
            {day.dayLabel}
          </Text>
          {day.dateLabel ? (
            <Text
              className="min-w-0 pb-1 text-[11px] uppercase tracking-[1.1px] text-muted"
              numberOfLines={1}
            >
              {day.dateLabel}
            </Text>
          ) : null}
        </View>
        <Text className="pb-1 text-[11px] text-muted">{day.stopCountLabel}</Text>
      </View>

      <View className="overflow-hidden rounded-[16px] border border-divider bg-ivory">
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
          <Text className="px-4 py-4 text-[13px] leading-[19px] text-muted">
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
        "min-h-[64px] flex-row items-start gap-3 px-4 py-3.5 active:opacity-70",
        isLast ? "" : "border-b border-divider",
      ].join(" ")}
    >
      <TimeBlock block={stop.timeBlock} />
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className="text-[14px] leading-[19px] text-espresso"
          style={fontStyles.uiSemibold}
          numberOfLines={2}
        >
          {stop.title}
        </Text>
        {stop.location ? (
          <Text className="text-[12px] leading-[16px] text-muted" numberOfLines={1}>
            {stop.location}
          </Text>
        ) : null}
      </View>
      <StopPill pill={stop.pill} />
    </Pressable>
  );
}

function TimeBlock({ block }: { block: ItineraryStopTimeBlock }) {
  return (
    <View className="w-[62px] shrink-0 pt-0.5">
      <Text
        className="text-[12px] leading-[15px] text-espresso"
        style={fontStyles.uiSemibold}
        numberOfLines={1}
      >
        {block.primary}
      </Text>
      {block.secondary ? (
        <Text
          className="mt-0.5 text-[11px] leading-[14px] text-muted"
          style={fontStyles.uiMedium}
          numberOfLines={1}
        >
          {block.secondary}
        </Text>
      ) : null}
    </View>
  );
}

function StopPill({ pill }: { pill: ItineraryStopPill }) {
  const toneClass =
    pill.tone === "reservation"
      ? "border-transparent bg-olive/15"
      : pill.tone === "transit"
        ? "border-divider bg-smoke/45"
        : "border-divider bg-cream/60";
  const textClass =
    pill.tone === "reservation"
      ? "text-olive"
      : pill.tone === "transit"
        ? "text-clay"
        : "text-espresso";

  return (
    <View className={`max-w-[82px] shrink-0 rounded-full border px-2 py-1 ${toneClass}`}>
      <Text
        className={`text-[10px] leading-[12px] ${textClass}`}
        style={fontStyles.uiMedium}
        numberOfLines={1}
      >
        {pill.label}
      </Text>
    </View>
  );
}
