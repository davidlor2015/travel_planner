import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

import {
  READ_ONLY_TRIP_BODY,
  READ_ONLY_TRIP_TITLE,
} from "./helpers/collaborationGate";

type Props = {
  className?: string;
};

export function ReadOnlyNotice({ className = "mx-4 mt-4" }: Props) {
  return (
    <View
      className={[
        "flex-row items-start gap-3 rounded-[14px] border px-4 py-3",
        className,
      ].join(" ")}
      style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${READ_ONLY_TRIP_TITLE}. ${READ_ONLY_TRIP_BODY}`}
    >
      <Ionicons
        name="lock-closed-outline"
        size={13}
        color={DE.muted}
        style={{ marginTop: 2 }}
      />
      <View className="min-w-0 flex-1">
        <Text
          className="text-[13px]"
          style={[fontStyles.uiSemibold, { color: DE.inkSoft }]}
        >
          {READ_ONLY_TRIP_TITLE}
        </Text>
        <Text
          className="mt-0.5 text-[12px] leading-[17px]"
          style={[fontStyles.uiRegular, { color: DE.muted }]}
        >
          {READ_ONLY_TRIP_BODY}
        </Text>
      </View>
    </View>
  );
}
