import { Pressable, Text, View } from "react-native";

import type { BudgetExpense } from "./api";
import { formatBudgetAmount } from "./adapters";

type Props = {
  expense: BudgetExpense;
  onDelete: () => void;
};

export function ExpenseRow({ expense, onDelete }: Props) {
  return (
    <View className="flex-row items-center gap-3 rounded-[22px] border border-border bg-white px-4 py-4">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">{expense.label}</Text>
        <Text className="mt-1 text-sm text-text-muted">{expense.category}</Text>
      </View>
      <Text className="text-sm font-semibold text-text">
        {formatBudgetAmount(expense.amount)}
      </Text>
      <Pressable onPress={onDelete}>
        <Text className="text-sm font-semibold text-text-soft">Delete</Text>
      </Pressable>
    </View>
  );
}
