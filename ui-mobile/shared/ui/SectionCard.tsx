// Path: ui-mobile/shared/ui/SectionCard.tsx
// Summary: Implements SectionCard module logic.

import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: Props) {
  return (
    <View
      className={[
        "rounded-[24px] border border-border bg-white px-4 py-4 shadow-card",
        className ?? "",
      ].join(" ")}
    >
      {eyebrow || title || description || action ? (
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            {eyebrow ? (
              <Text
                className="text-[10px] uppercase tracking-[1.4px] text-text-soft"
                style={fontStyles.monoMedium}
              >
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Text className="text-lg text-text" style={fontStyles.uiSemibold}>
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text
                className="text-[13px] leading-5 text-text-muted"
                style={fontStyles.uiRegular}
              >
                {description}
              </Text>
            ) : null}
          </View>
          {action ? <View>{action}</View> : null}
        </View>
      ) : null}
      <View className={eyebrow || title || description || action ? "mt-4" : ""}>
        {children}
      </View>
    </View>
  );
}
