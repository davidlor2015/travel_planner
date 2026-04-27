import { type ReactNode } from "react";
import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  title?: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: Props) {
  return (
    <View className="items-center justify-center gap-3 rounded-[24px] border border-dashed border-border bg-surface-muted p-8">
      {title ? (
        <Text className="text-lg text-text" style={fontStyles.uiSemibold}>
          {title}
        </Text>
      ) : null}
      <Text
        className="text-center text-[15px] leading-6 text-text-muted"
        style={fontStyles.uiRegular}
      >
        {message}
      </Text>
      {action}
    </View>
  );
}
