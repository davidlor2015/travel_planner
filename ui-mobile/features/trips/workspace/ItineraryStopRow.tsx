import { Text, View } from "react-native";

type Props = {
  time: string | null;
  title: string;
  location: string | null;
  notes?: string | null;
};

export function ItineraryStopRow({ time, title, location, notes }: Props) {
  return (
    <View className="flex-row gap-3 py-2">
      <View className="w-16">
        <Text className="text-xs uppercase tracking-[0.4px] text-text-soft">
          {time?.trim() || "TBD"}
        </Text>
      </View>
      <View className="flex-1 rounded-2xl border border-border bg-white px-3 py-3">
        <Text className="text-sm font-semibold text-text">{title}</Text>
        {location ? <Text className="mt-1 text-sm text-text-muted">{location}</Text> : null}
        {notes ? <Text className="mt-1 text-xs text-text-soft">{notes}</Text> : null}
      </View>
    </View>
  );
}
