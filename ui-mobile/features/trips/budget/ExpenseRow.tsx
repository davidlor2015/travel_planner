import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { ExpenseCategory } from "./hooks";
import {
  getBudgetCategoryMeta,
  type BudgetTransactionRowViewModel,
} from "./adapters";

type Props = {
  transaction: BudgetTransactionRowViewModel;
  onDelete: () => void;
};

const FILTER_ACTIVE_BORDER: Record<ExpenseCategory, string> = {
  food: "border-amber/35",
  transport: "border-espresso/20",
  stay: "border-clay/30",
  activities: "border-olive/30",
  other: "border-border",
};

export function ExpenseRow({ transaction, onDelete }: Props) {
  const categoryMeta = getBudgetCategoryMeta(transaction.category);

  return (
    <View
      className={[
        "gap-3 rounded-[22px] border bg-white px-4 py-3.5",
        FILTER_ACTIVE_BORDER[transaction.category],
      ].join(" ")}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-text" numberOfLines={1}>
            {transaction.label}
          </Text>
          <Text className="mt-1 text-[12px] text-text-soft">{transaction.dateLabel}</Text>
        </View>
        <Text className="text-sm font-semibold text-text">{transaction.amountLabel}</Text>
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <View
          className={[
            "flex-row items-center gap-1 rounded-full px-2.5 py-1",
            categoryMeta.badgeClassName,
          ].join(" ")}
        >
          <Ionicons name={transaction.categoryIcon} size={12} color={categoryMeta.iconColor} />
          <Text className={["text-[11px] font-semibold", categoryMeta.badgeTextClassName].join(" ")}>
            {transaction.categoryLabel}
          </Text>
        </View>

        <Pressable
          onPress={onDelete}
          className="flex-row items-center gap-1 rounded-full px-2 py-1 active:bg-surface-muted"
          accessibilityRole="button"
          accessibilityLabel={`Remove ${transaction.label}`}
        >
          <Ionicons name="trash-outline" size={13} color="#8A7E74" />
          <Text className="text-[12px] font-semibold text-text-soft">Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}
