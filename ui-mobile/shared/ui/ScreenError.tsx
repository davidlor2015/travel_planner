import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import { SecondaryButton } from "./Button";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ScreenError({ message, onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-full max-w-sm items-center gap-3 rounded-[24px] border border-danger/20 bg-white px-6 py-7">
        <Text className="text-lg text-text" style={fontStyles.uiSemibold}>
          Something went wrong
        </Text>
        <Text
          className="text-center text-[15px] leading-6 text-danger"
          style={fontStyles.uiRegular}
        >
          {message}
        </Text>
        {onRetry ? <SecondaryButton label="Try again" onPress={onRetry} /> : null}
      </View>
    </View>
  );
}
