import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ExpenseRow } from "@/features/trips/budget/ExpenseRow";
import {
  BUDGET_CATEGORY_ORDER,
  buildBudgetCategoryRows,
  buildBudgetSummaryViewModel,
  buildBudgetTransactionRows,
  buildFilteredTransactionEmptyLabel,
  formatBudgetAmount,
  getBudgetCategoryMeta,
  getCategoryFilterLabel,
  type BudgetCategoryFilter,
} from "@/features/trips/budget/adapters";
import {
  useBudgetTracker,
  type ExpenseCategory,
} from "@/features/trips/budget/hooks";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

type Props = { tripId: number };

const SUMMARY_TONE_CLASS: Record<"default" | "muted" | "danger", string> = {
  default: "text-text",
  muted: "text-text-soft",
  danger: "text-danger",
};

export function BudgetTab({ tripId }: Props) {
  const budget = useBudgetTracker(tripId);

  const [limitDraft, setLimitDraft] = useState("");
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [expenseCategory, setExpenseCategory] =
    useState<ExpenseCategory>("other");
  const [showExpenseComposer, setShowExpenseComposer] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<BudgetCategoryFilter>("all");

  const summary = useMemo(
    () => buildBudgetSummaryViewModel(budget.limit, budget.totalSpent),
    [budget.limit, budget.totalSpent],
  );
  const categoryRows = useMemo(
    () => buildBudgetCategoryRows(budget.expenses),
    [budget.expenses],
  );
  const transactions = useMemo(
    () => buildBudgetTransactionRows(budget.expenses, activeCategoryFilter),
    [budget.expenses, activeCategoryFilter],
  );
  const showComposer = showExpenseComposer || budget.expenses.length === 0;
  const filterLabel = getCategoryFilterLabel(activeCategoryFilter);
  const filterEmptyLabel = buildFilteredTransactionEmptyLabel(activeCategoryFilter);

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
      setShowExpenseComposer(false);
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

  const handleCategoryRowPress = (category: ExpenseCategory) => {
    setActiveCategoryFilter((current) => (current === category ? "all" : category));
  };

  const clearFilter = () => setActiveCategoryFilter("all");

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      {mutationError ? (
        <View className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
          <Text className="text-sm text-danger">{mutationError}</Text>
        </View>
      ) : null}
      <SectionCard eyebrow="Budget" title="Trip budget overview" description={summary.helperText}>
        <View className="gap-2 rounded-xl border border-border bg-surface-muted p-4">
          {summary.metrics.map((metric) => (
            <View key={metric.key} className="flex-row items-center justify-between">
              <Text className="text-sm text-text-muted">{metric.label}</Text>
              <Text className={["text-sm font-semibold", SUMMARY_TONE_CLASS[metric.tone]].join(" ")}>
                {metric.value}
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard eyebrow="Controls" title="Budget settings">
        <View className="gap-3">
          <TextInputField
            label="Set total budget"
            placeholder={
              budget.limit != null
                ? `Current: ${formatBudgetAmount(budget.limit)}`
                : "e.g. 2000"
            }
            keyboardType="decimal-pad"
            value={limitDraft}
            onChangeText={setLimitDraft}
          />
          <PrimaryButton label="Save total budget" onPress={() => void handleSetLimit()} fullWidth />
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Expenses"
        title="Track spending"
        description="Add transactions quickly to keep spend visible while planning and traveling."
      >
        <View className="gap-3">
          {!showComposer ? (
            <View
              className="rounded-2xl border border-border bg-surface-muted px-3.5 py-3"
            >
              <Text className="mb-3 text-[13px] leading-5 text-text-muted">
                Capture meals, transit, and activities as they happen.
              </Text>
              <PrimaryButton
                label="Add expense"
                onPress={() => setShowExpenseComposer(true)}
                icon={<Ionicons name="add" size={16} color="#FFFFFF" />}
                fullWidth
              />
            </View>
          ) : (
            <>
              <TextInputField
                label="Label"
                placeholder="e.g. Dinner in Trastevere"
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
                {BUDGET_CATEGORY_ORDER.map((cat) => {
                  const isActive = expenseCategory === cat;
                  const categoryMeta = getBudgetCategoryMeta(cat);
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setExpenseCategory(cat)}
                      className={[
                        "mr-1.5 flex-row items-center gap-1 rounded-full border px-3 py-1.5",
                        isActive
                          ? "border-espresso bg-espresso"
                          : "border-border bg-white",
                      ].join(" ")}
                    >
                      <Ionicons
                        name={categoryMeta.icon}
                        size={12}
                        color={isActive ? "#FFFFFF" : categoryMeta.iconColor}
                      />
                      <Text
                        className={[
                          "text-[13px]",
                          isActive ? "text-white" : "text-text-muted",
                        ].join(" ")}
                      >
                        {categoryMeta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <PrimaryButton
                    label="Save expense"
                    onPress={() => void handleAddExpense()}
                    fullWidth
                  />
                </View>
                <View className="flex-1">
                  <SecondaryButton
                    label="Cancel"
                    onPress={() => {
                      setShowExpenseComposer(false);
                      setExpenseLabel("");
                      setExpenseAmount("");
                    }}
                    fullWidth
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Categories"
        title="Spending by category"
        description="Tap a row to filter recent transactions."
      >
        <View className="gap-2">
          {categoryRows.map((category) => {
            const isActive = activeCategoryFilter === category.key;
            const categoryMeta = getBudgetCategoryMeta(category.key);
            return (
              <Pressable
                key={category.key}
                onPress={() => handleCategoryRowPress(category.key)}
                className={[
                  "rounded-2xl border px-3.5 py-3 active:opacity-80",
                  isActive
                    ? "border-amber/30 bg-amber/5"
                    : "border-border bg-surface-muted",
                ].join(" ")}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={[
                      "h-8 w-8 items-center justify-center rounded-full",
                      categoryMeta.badgeClassName,
                    ].join(" ")}
                  >
                    <Ionicons name={categoryMeta.icon} size={14} color={categoryMeta.iconColor} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-text">{category.label}</Text>
                    <Text className="mt-0.5 text-[12px] text-text-soft">
                      {category.isEmpty ? category.emptyStateLabel : category.expenseCountLabel}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-semibold text-text">{category.amountLabel}</Text>
                    <Text className="mt-0.5 text-[11px] text-text-soft">
                      {isActive ? "Filtering" : "View"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Recent transactions"
        title={activeCategoryFilter === "all" ? "All categories" : filterLabel}
        action={
          activeCategoryFilter !== "all" ? (
            <Pressable
              onPress={clearFilter}
              className="rounded-full border border-border px-3 py-1.5 active:bg-surface-sunken"
              accessibilityRole="button"
              accessibilityLabel="Clear budget category filter"
            >
              <Text className="text-[11px] font-semibold text-text-muted">Clear filter</Text>
            </Pressable>
          ) : null
        }
      >
        {transactions.length > 0 ? (
          <View className="gap-2.5">
            {transactions.map((transaction) => (
              <ExpenseRow
                key={transaction.id}
                transaction={transaction}
                onDelete={() => void handleRemoveExpense(transaction.id)}
              />
            ))}
          </View>
        ) : (
          <View className="rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-4">
            <Text className="text-[13px] leading-5 text-text-muted">{filterEmptyLabel}</Text>
          </View>
        )}
      </SectionCard>
    </ScrollView>
  );
}
