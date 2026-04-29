// Path: ui-mobile/features/trips/workspace/BudgetTab.tsx
// Summary: Implements BudgetTab module logic.

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BudgetLimitSheet } from "@/features/trips/budget/BudgetLimitSheet";
import { ExpenseRow } from "@/features/trips/budget/ExpenseRow";
import { ExpenseFormSheet } from "@/features/trips/budget/ExpenseFormSheet";
import {
  buildBudgetCategoryRows,
  buildBudgetSummaryViewModel,
  buildBudgetTransactionRows,
  buildFilteredTransactionEmptyLabel,
  getBudgetCategoryMeta,
  getCategoryFilterLabel,
  type BudgetCategoryFilter,
} from "@/features/trips/budget/adapters";
import {
  useBudgetTracker,
  type ExpenseCategory,
} from "@/features/trips/budget/hooks";
import { DE } from "@/shared/theme/desertEditorial";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { SectionCard } from "@/shared/ui/SectionCard";
import { fontStyles } from "@/shared/theme/typography";

import { ReadOnlyNotice } from "./ReadOnlyNotice";

type Props = { tripId: number; isReadOnly?: boolean };

// ─── Local button helpers ─────────────────────────────────────────────────────

function BudgetPrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      className={[
        "min-h-[44px] flex-row items-center justify-center gap-2 rounded-2xl bg-ontrip px-5 py-2.5 active:opacity-80",
        fullWidth ? "w-full" : "",
        disabled ? "opacity-40" : "",
      ].join(" ")}
    >
      {icon}
      <Text className="text-[14px] text-ivory" style={fontStyles.uiSemibold}>
        {label}
      </Text>
    </Pressable>
  );
}

const SUMMARY_TONE_CLASS: Record<"default" | "muted" | "danger", string> = {
  default: "text-text",
  muted: "text-text-soft",
  danger: "text-danger",
};

export function BudgetTab({ tripId, isReadOnly = false }: Props) {
  const budget = useBudgetTracker(tripId);

  const [listError, setListError] = useState<string | null>(null);
  const [showBudgetSheet, setShowBudgetSheet] = useState(false);
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
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
  const hasBudget = budget.limit !== null && budget.limit > 0;
  const hasExpenses = budget.expenses.length > 0;
  const isEmptyBudgetState = !hasBudget && !hasExpenses;
  const showHelperLine = isEmptyBudgetState || (hasBudget && !hasExpenses);
  const filterLabel = getCategoryFilterLabel(activeCategoryFilter);
  const filterEmptyLabel =
    buildFilteredTransactionEmptyLabel(activeCategoryFilter);

  useEffect(() => {
    if (!hasExpenses && activeCategoryFilter !== "all") {
      setActiveCategoryFilter("all");
    }
  }, [activeCategoryFilter, hasExpenses]);

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

  const handleRemoveExpense = async (expenseId: number) => {
    try {
      setListError(null);
      await budget.removeExpense(expenseId);
    } catch {
      setListError("We couldn't remove that expense. Try again.");
    }
  };

  const handleCategoryRowPress = (category: ExpenseCategory) => {
    setActiveCategoryFilter((current) =>
      current === category ? "all" : category,
    );
  };

  const clearFilter = () => setActiveCategoryFilter("all");

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 120,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {listError ? (
          <View className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
            <Text className="text-sm text-danger" style={fontStyles.uiRegular}>
              {listError}
            </Text>
          </View>
        ) : null}

        {isReadOnly ? <ReadOnlyNotice className="" /> : null}

        <SectionCard
          title="Budget"
          description={summary.helperText}
          action={
            <Pressable
              onPress={() => setShowBudgetSheet(true)}
              disabled={isReadOnly}
              accessibilityRole="button"
              accessibilityLabel={
                hasBudget ? "Edit budget" : "Set total budget"
              }
              accessibilityHint={
                isReadOnly ? "View-only travelers cannot set the budget." : undefined
              }
              className="rounded-full border border-border px-3 py-1.5 active:bg-surface-sunken"
              style={isReadOnly ? { opacity: 0.45 } : undefined}
            >
              <Text
                className="text-[11px] text-text-muted"
                style={fontStyles.uiSemibold}
              >
                {hasBudget ? "Edit budget" : "Set total budget"}
              </Text>
            </Pressable>
          }
        >
          <View className="gap-2 rounded-xl border border-border bg-surface-muted p-4">
            {summary.metrics.map((metric) => (
              <View
                key={metric.key}
                className="flex-row items-center justify-between"
              >
                <Text
                  className="text-sm text-text-muted"
                  style={fontStyles.uiRegular}
                >
                  {metric.label}
                </Text>
                <Text
                  className={["text-sm", SUMMARY_TONE_CLASS[metric.tone]].join(
                    " ",
                  )}
                  style={fontStyles.uiSemibold}
                >
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <BudgetPrimaryButton
          label="Add expense"
          onPress={() => setShowExpenseSheet(true)}
          icon={<Ionicons name="add" size={16} color={DE.ivory} />}
          fullWidth
          disabled={isReadOnly}
          accessibilityHint={
            isReadOnly ? "View-only travelers cannot add expenses." : undefined
          }
        />

        {showHelperLine ? (
          <Text
            className="px-1 text-[13px] leading-5 text-text-muted"
            style={fontStyles.uiRegular}
          >
            Categories and history will appear here once you log an expense.
          </Text>
        ) : null}

        {hasExpenses ? (
          <SectionCard
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
                        <Ionicons
                          name={categoryMeta.icon}
                          size={14}
                          color={categoryMeta.iconColor}
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-sm text-text"
                          style={fontStyles.uiSemibold}
                        >
                          {category.label}
                        </Text>
                        <Text
                          className="mt-0.5 text-[12px] text-text-soft"
                          style={fontStyles.uiRegular}
                        >
                          {category.isEmpty
                            ? category.emptyStateLabel
                            : category.expenseCountLabel}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-sm text-text"
                          style={fontStyles.uiSemibold}
                        >
                          {category.amountLabel}
                        </Text>
                        <Text
                          className="mt-0.5 text-[11px] text-text-soft"
                          style={fontStyles.uiRegular}
                        >
                          {isActive ? "Filtering" : "View"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>
        ) : null}

        {hasExpenses ? (
          <SectionCard
            title="Recent transactions"
            description={
              activeCategoryFilter === "all" ? undefined : filterLabel
            }
            action={
              activeCategoryFilter !== "all" ? (
                <Pressable
                  onPress={clearFilter}
                  className="rounded-full border border-border px-3 py-1.5 active:bg-surface-sunken"
                  accessibilityRole="button"
                  accessibilityLabel="Clear budget category filter"
                >
                  <Text
                    className="text-[11px] text-text-muted"
                    style={fontStyles.uiSemibold}
                  >
                    Clear filter
                  </Text>
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
                    onDelete={
                      isReadOnly
                        ? undefined
                        : () => void handleRemoveExpense(transaction.id)
                    }
                  />
                ))}
              </View>
            ) : (
              <View className="rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-4">
                <Text
                  className="text-[13px] leading-5 text-text-muted"
                  style={fontStyles.uiRegular}
                >
                  {filterEmptyLabel}
                </Text>
              </View>
            )}
          </SectionCard>
        ) : null}
      </ScrollView>

      <BudgetLimitSheet
        visible={!isReadOnly && showBudgetSheet}
        currentLimit={budget.limit}
        onClose={() => setShowBudgetSheet(false)}
        onSave={async (amount) => {
          await budget.setLimit(amount);
        }}
      />

      <ExpenseFormSheet
        visible={!isReadOnly && showExpenseSheet}
        onClose={() => setShowExpenseSheet(false)}
        onSave={async ({ label, amount, category, date }) => {
          await budget.addExpense(
            label,
            amount,
            category as ExpenseCategory,
            date,
          );
        }}
      />
    </>
  );
}
