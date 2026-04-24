import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";

import { ExpenseRow } from "@/features/trips/budget/ExpenseRow";
import { formatBudgetAmount } from "@/features/trips/budget/adapters";
import {
  useBudgetTracker,
  type ExpenseCategory,
} from "@/features/trips/budget/hooks";
import { PrimaryButton } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

const CATEGORIES: ExpenseCategory[] = [
  "food",
  "transport",
  "stay",
  "activities",
  "other",
];

type Props = { tripId: number };

export function BudgetTab({ tripId }: Props) {
  const budget = useBudgetTracker(tripId);

  const [limitDraft, setLimitDraft] = useState("");
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [expenseCategory, setExpenseCategory] =
    useState<ExpenseCategory>("other");

  if (budget.loading) {
    return <ScreenLoading label="Loading budget…" />;
  }

  if (budget.error) {
    return (
      <ScreenError
        message="We couldn't load the budget. Try again in a moment."
        onRetry={() => void budget.reload?.()}
      />
    );
  }

  const handleSetLimit = async () => {
    const parsed = parseFloat(limitDraft);
    if (Number.isNaN(parsed)) return;
    try {
      setMutationError(null);
      await budget.setLimit(parsed);
      setLimitDraft("");
    } catch {
      setMutationError("We couldn't update the budget limit. Try again.");
    }
  };

  const handleAddExpense = async () => {
    const amount = parseFloat(expenseAmount);
    if (!expenseLabel.trim() || Number.isNaN(amount) || amount <= 0) return;
    try {
      setMutationError(null);
      await budget.addExpense(expenseLabel.trim(), amount, expenseCategory);
      setExpenseLabel("");
      setExpenseAmount("");
    } catch {
      setMutationError("We couldn't add that expense. Try again.");
    }
  };

  const handleRemoveExpense = async (expenseId: number) => {
    try {
      setMutationError(null);
      await budget.removeExpense(expenseId);
    } catch {
      setMutationError("We couldn't remove that expense. Try again.");
    }
  };

  const remaining = budget.remaining;
  const isOver = budget.isOverBudget;

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      {mutationError ? (
        <View className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
          <Text className="text-sm text-danger">{mutationError}</Text>
        </View>
      ) : null}
      <SectionCard eyebrow="Budget" title="Spending summary">
      <View className="gap-2 rounded-xl border border-border bg-surface-muted p-4">
        <View className="flex-row justify-between">
          <Text className="text-sm text-text-muted">Spent</Text>
          <Text className="text-sm font-semibold text-text">
            {formatBudgetAmount(budget.totalSpent)}
          </Text>
        </View>
        {budget.limit != null && (
          <>
            <View className="flex-row justify-between">
              <Text className="text-sm text-text-muted">Limit</Text>
              <Text className="text-sm font-semibold text-text">
                {formatBudgetAmount(budget.limit)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-text-muted">Remaining</Text>
              <Text
                className={`text-sm font-semibold ${isOver ? "text-danger" : "text-text"}`}
              >
                {remaining != null
                  ? `${formatBudgetAmount(Math.abs(remaining))}${isOver ? " over" : ""}`
                  : "—"}
              </Text>
            </View>
          </>
        )}
      </View>
      </SectionCard>

      <SectionCard eyebrow="Controls" title="Budget settings">
        <View className="gap-3">
          <TextInputField
            label="Set limit"
            placeholder={
              budget.limit != null ? `Current: $${budget.limit}` : "e.g. 2000"
            }
            keyboardType="decimal-pad"
            value={limitDraft}
            onChangeText={setLimitDraft}
          />
          <PrimaryButton label="Save limit" onPress={() => void handleSetLimit()} fullWidth />
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Add expense"
        title="Track spend"
        description="Quick-entry expense tracking is more important here than detailed finance tooling."
      >
        <View className="gap-3">
        <TextInputField
          label="Label"
          placeholder="Label"
          value={expenseLabel}
          onChangeText={setExpenseLabel}
        />
        <TextInputField
          label="Amount"
          placeholder="Amount"
          keyboardType="decimal-pad"
          value={expenseAmount}
          onChangeText={setExpenseAmount}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="my-0.5"
        >
          {CATEGORIES.map((cat) => (
            <View
              key={cat}
              className={`mr-1.5 rounded-full border px-3 py-1.5 ${expenseCategory === cat ? "border-text bg-text" : "border-border bg-white"}`}
            >
              <Text
                onPress={() => setExpenseCategory(cat)}
                className={`text-[13px] ${expenseCategory === cat ? "text-white" : "text-text-muted"}`}
              >
                {cat}
              </Text>
            </View>
          ))}
        </ScrollView>
        <PrimaryButton label="Add expense" onPress={() => void handleAddExpense()} fullWidth />
        </View>
      </SectionCard>

      {budget.expenses.length > 0 && (
        <SectionCard eyebrow="Recent activity" title="Expenses">
          {budget.expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onDelete={() => void handleRemoveExpense(expense.id)}
            />
          ))}
        </SectionCard>
      )}

      {budget.expenses.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          message="Add expenses here as you plan or travel so budget visibility stays tied to the trip."
        />
      ) : null}
    </ScrollView>
  );
}
