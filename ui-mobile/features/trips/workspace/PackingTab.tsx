// Path: ui-mobile/features/trips/workspace/PackingTab.tsx
// Summary: Implements PackingTab module logic.

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PackingItemRow } from "@/features/trips/packing/PackingItemRow";
import {
  usePackingList,
  usePackingSuggestionsQuery,
} from "@/features/trips/packing/hooks";
import {
  buildPackingCategoryGroups,
  buildPackingFilterChips,
  buildPackingSummary,
  buildVisiblePackingSuggestions,
  detectPackingCategory,
  getPackingCategoryConfig,
  listPackingCategories,
  trimCategoryOverrides,
  type PackingCategoryKey,
  type PackingCategoryOverrides,
  type PackingFilterKey,
} from "@/features/trips/packing/presentation";
import { fontStyles } from "@/shared/theme/typography";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

type Props = { tripId: number };

const SUGGESTIONS_LIMIT = 4;
const CONTENT_BOTTOM_PADDING = 132;

export function PackingTab({ tripId }: Props) {
  const packing = usePackingList(tripId);
  const suggestionsQuery = usePackingSuggestionsQuery(tripId, {
    enabled: !packing.loading,
  });

  const addInputRef = useRef<TextInput | null>(null);

  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] = useState<PackingCategoryKey>("essentials");
  const [activeFilter, setActiveFilter] = useState<PackingFilterKey>("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryOverrides, setCategoryOverrides] = useState<PackingCategoryOverrides>({});
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft("");
    setDraftCategory("essentials");
    setActiveFilter("all");
    setShowSuggestions(false);
    setCategoryOverrides({});
    setEditingItemId(null);
    setEditingDraft("");
    setMutationError(null);
  }, [tripId]);

  useEffect(() => {
    setCategoryOverrides((current) => trimCategoryOverrides(current, packing.items));
  }, [packing.items]);

  useEffect(() => {
    if (editingItemId == null) return;
    const stillExists = packing.items.some((item) => item.id === editingItemId);
    if (!stillExists) {
      setEditingItemId(null);
      setEditingDraft("");
    }
  }, [editingItemId, packing.items]);

  const summary = useMemo(
    () => buildPackingSummary(packing.items, categoryOverrides),
    [packing.items, categoryOverrides],
  );

  const filterChips = useMemo(() => buildPackingFilterChips(packing.items), [packing.items]);

  const categoryGroups = useMemo(
    () => buildPackingCategoryGroups(packing.items, activeFilter, categoryOverrides),
    [packing.items, activeFilter, categoryOverrides],
  );

  const visibleSuggestions = useMemo(
    () =>
      buildVisiblePackingSuggestions(
        packing.items,
        suggestionsQuery.data ?? [],
        SUGGESTIONS_LIMIT,
      ),
    [packing.items, suggestionsQuery.data],
  );

  useEffect(() => {
    if (visibleSuggestions.length === 0) {
      setShowSuggestions(false);
    }
  }, [visibleSuggestions.length]);

  if (packing.loading) {
    return <ScreenLoading label="Loading packing list…" />;
  }

  if (packing.error) {
    return (
      <ScreenError
        message="We couldn't load the packing list. Try again in a moment."
        onRetry={() => void packing.reload?.()}
      />
    );
  }

  const checkedCount = summary.checked;
  const hasItems = summary.total > 0;
  const selectedCategory = getPackingCategoryConfig(draftCategory);

  const handleAdd = async (label = draft, category = draftCategory) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    try {
      setMutationError(null);
      const created = await packing.addItem(trimmed);
      if (created && typeof created.id === "number") {
        setCategoryOverrides((current) => ({
          ...current,
          [created.id]: category,
        }));
      }
      if (label === draft) {
        setDraft("");
      }
    } catch {
      setMutationError("We couldn't add that item. Try again.");
    }
  };

  const handleAddSuggestion = async (suggestionLabel: string) => {
    const category = detectPackingCategory(suggestionLabel);
    await handleAdd(suggestionLabel, category);
  };

  const handleToggleItem = async (itemId: number) => {
    try {
      setMutationError(null);
      await packing.toggleItem(itemId);
    } catch {
      setMutationError("We couldn't update that item. Try again.");
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      setMutationError(null);
      await packing.removeItem(itemId);
      setCategoryOverrides((current) => {
        if (!current[itemId]) return current;
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setEditingDraft("");
      }
    } catch {
      setMutationError("We couldn't remove that item. Try again.");
    }
  };

  const handleClearChecked = async () => {
    try {
      const checkedItemIds = new Set(
        packing.items.filter((item) => item.checked).map((item) => item.id),
      );
      setMutationError(null);
      await packing.clearChecked();
      setCategoryOverrides((current) => {
        if (checkedItemIds.size === 0) return current;
        let changed = false;
        const next: PackingCategoryOverrides = {};
        for (const [idText, categoryKey] of Object.entries(current)) {
          const id = Number(idText);
          if (!checkedItemIds.has(id)) {
            next[id] = categoryKey;
          } else {
            changed = true;
          }
        }
        return changed ? next : current;
      });
      setEditingItemId(null);
      setEditingDraft("");
    } catch {
      setMutationError("We couldn't clear packed items. Try again.");
    }
  };

  const handleStartEdit = (itemId: number, label: string) => {
    setEditingItemId(itemId);
    setEditingDraft(label);
  };

  const handleSaveEdit = async () => {
    if (editingItemId == null) return;
    if (!editingDraft.trim()) {
      setMutationError("Item names cannot be blank.");
      return;
    }

    try {
      setMutationError(null);
      await packing.editItem(editingItemId, editingDraft.trim());
      setEditingItemId(null);
      setEditingDraft("");
    } catch {
      setMutationError("We couldn't update that item. Try again.");
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: CONTENT_BOTTOM_PADDING }}
    >
      <View className="px-5 pb-2 pt-5">
        <Text style={[fontStyles.uiRegular, { fontSize: 11, letterSpacing: 1.76, color: "#8A7E74" }]}>
          PACKING
        </Text>
        <Text style={[fontStyles.displaySemibold, { fontSize: 24, lineHeight: 30, color: "#1C1108" }]}>
          {summary.checked} / {summary.total} packed
        </Text>
      </View>

      {mutationError ? (
        <View className="mx-4 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
          <Text className="text-sm text-danger">{mutationError}</Text>
        </View>
      ) : null}

      <View className="mx-4 mt-4 rounded-[18px] border border-[#D9CFC4] bg-ivory px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text style={fontStyles.uiSemibold} className="text-[14px] text-espresso">
              Packing progress
            </Text>
            <Text style={fontStyles.uiRegular} className="mt-0.5 text-[12px] leading-[17px] text-muted">
              {summary.breakdownLabel}
            </Text>
          </View>

          {checkedCount > 0 ? (
            <Pressable
              onPress={() => void handleClearChecked()}
              className="rounded-full border border-border bg-white px-3 py-1.5 active:opacity-75"
              accessibilityRole="button"
              accessibilityLabel="Clear packed items"
            >
              <Text style={fontStyles.uiSemibold} className="text-[12px] text-text-soft">
                Clear packed
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mt-3 h-2 overflow-hidden rounded-full bg-smoke">
          <View className="h-full rounded-full bg-olive" style={{ width: `${summary.progressPct}%` }} />
        </View>

        <View className="mt-3 flex-row items-center gap-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-1"
            contentContainerStyle={{ gap: 8 }}
          >
            {filterChips.map((chip) => {
              const isActive = activeFilter === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setActiveFilter(chip.key)}
                  className={[
                    "flex-row items-center gap-1 rounded-full border px-3 py-2",
                    isActive ? "border-ontrip bg-ontrip" : "border-border bg-white",
                  ].join(" ")}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${chip.label.toLowerCase()} items`}
                >
                  <Text
                    style={fontStyles.uiMedium}
                    className={["text-[12px]", isActive ? "text-on-dark" : "text-text-muted"].join(" ")}
                  >
                    {chip.label}
                  </Text>
                  <Text
                    style={fontStyles.uiSemibold}
                    className={["text-[12px]", isActive ? "text-on-dark-muted" : "text-text-soft"].join(" ")}
                  >
                    {chip.count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {visibleSuggestions.length > 0 ? (
            <Pressable
              onPress={() => setShowSuggestions((current) => !current)}
              className="rounded-full border border-ontrip bg-ontrip px-3 py-2 active:opacity-75"
              accessibilityRole="button"
              accessibilityLabel="Suggest from trip"
            >
              <Text style={fontStyles.uiSemibold} className="text-[12px] text-on-dark">
                Suggest from trip
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="mx-4 mt-4 rounded-[18px] border border-smoke bg-parchment px-4 py-4">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="add-circle-outline" size={13} color="#B86845" />
          <Text style={[fontStyles.uiMedium, { fontSize: 10, letterSpacing: 1.5, color: "#B86845" }]}>
            ADD ITEM
          </Text>
        </View>

        <Text style={fontStyles.uiRegular} className="mt-1 text-[12px] text-text-muted">
          Add item to {selectedCategory.title}
        </Text>

        <View className="mt-2 flex-row items-center gap-2 rounded-full border border-border bg-white py-1.5 pl-4 pr-1.5">
          <TextInput
            ref={addInputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="Passport, charger, rain jacket"
            placeholderTextColor="#8A7E74"
            returnKeyType="done"
            onSubmitEditing={() => void handleAdd()}
            className="flex-1 py-2 text-[15px] text-text"
          />
          <Pressable
            onPress={() => void handleAdd()}
            disabled={!draft.trim()}
            className={[
              "flex-row items-center gap-1 rounded-full px-3 py-2",
              draft.trim() ? "bg-ontrip" : "bg-smoke",
            ].join(" ")}
            accessibilityRole="button"
            accessibilityLabel={`Add item to ${selectedCategory.title}`}
          >
            <Ionicons name="add" size={14} color={draft.trim() ? "#F2EBDD" : "#8A7E74"} />
            <Text
              style={fontStyles.uiSemibold}
              className={["text-[12px]", draft.trim() ? "text-on-dark" : "text-text-soft"].join(" ")}
            >
              Add
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {listPackingCategories().map((category) => {
            const isActive = category.key === draftCategory;
            return (
              <Pressable
                key={category.key}
                onPress={() => setDraftCategory(category.key)}
                className={[
                  "rounded-full border px-3 py-1.5",
                  isActive ? "border-ontrip bg-ontrip" : "border-border bg-white",
                ].join(" ")}
                accessibilityRole="button"
                accessibilityLabel={`Select ${category.title} category`}
              >
                <Text
                  style={fontStyles.uiMedium}
                  className={[
                    "text-[12px]",
                    isActive ? "text-on-dark" : "text-text-soft",
                  ].join(" ")}
                >
                  {category.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {showSuggestions && visibleSuggestions.length > 0 ? (
        <View className="mx-4 mt-4 rounded-[16px] border border-smoke bg-ivory px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text style={[fontStyles.uiMedium, { fontSize: 10, letterSpacing: 1.5, color: "#8A7E74" }]}>
              TRIP SUGGESTIONS
            </Text>
            <Text style={fontStyles.uiRegular} className="text-[10px] text-muted">
              Add to save
            </Text>
          </View>

          <Text style={fontStyles.uiRegular} className="mt-1 text-[12px] leading-[17px] text-text-muted">
            Suggestions are not saved until you add them.
          </Text>

          <View className="mt-3 gap-2">
            {visibleSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion.label}
                onPress={() => void handleAddSuggestion(suggestion.label)}
                className="flex-row items-center gap-3 rounded-[12px] border border-smoke bg-white px-3.5 py-2.5 active:opacity-75"
                accessibilityRole="button"
                accessibilityLabel={`Add suggested item ${suggestion.label}`}
              >
                <View className="h-7 w-7 items-center justify-center rounded-[9px] border border-smoke bg-parchment-soft">
                  <Ionicons name="bag-handle-outline" size={13} color="#8A7E74" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text style={fontStyles.uiSemibold} className="text-[13px] text-espresso" numberOfLines={1}>
                    {suggestion.label}
                  </Text>
                  <Text style={fontStyles.uiRegular} className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
                    {suggestion.reason}
                  </Text>
                </View>
                <Ionicons name="add" size={15} color="#B86845" />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {suggestionsQuery.isError && showSuggestions ? (
        <View className="mx-4 mt-3 rounded-[12px] border border-border bg-surface-muted px-3.5 py-3">
          <Text style={fontStyles.uiRegular} className="text-[12px] text-text-soft">
            Suggestions are unavailable right now, but you can still add items manually.
          </Text>
        </View>
      ) : null}

      {!hasItems ? (
        <View className="mx-4 mt-4">
          <EmptyState
            title="Start your packing list"
            message="Add essentials, clothing, and trip-specific items so your departure checklist stays clear."
            action={(
              <Pressable
                onPress={() => addInputRef.current?.focus()}
                className="rounded-full border border-border bg-white px-3 py-2 active:opacity-75"
                accessibilityRole="button"
                accessibilityLabel="Add your first packing item"
              >
                <Text style={fontStyles.uiSemibold} className="text-[12px] text-text-muted">
                  Add first item
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      {hasItems ? (
        <View className="mx-4 mt-5 gap-3">
          {categoryGroups.length === 0 ? (
            <View className="rounded-[14px] border border-border bg-surface-muted px-4 py-4">
              <Text style={fontStyles.uiSemibold} className="text-[13px] text-espresso">
                {activeFilter === "packed" ? "No packed items yet." : "Everything is packed."}
              </Text>
              <Text style={fontStyles.uiRegular} className="mt-1 text-[12px] text-muted">
                {activeFilter === "packed"
                  ? "Check items as you pack to see them here."
                  : "Switch to All or Packed to review completed items."}
              </Text>
            </View>
          ) : (
            categoryGroups.map((group) => (
              <View
                key={group.key}
                className="rounded-[18px] border border-[#D9CFC4] bg-parchment px-4 py-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text style={[fontStyles.displaySemibold, { fontSize: 20, lineHeight: 24, color: "#1C1108" }]}>
                      {group.title}
                    </Text>
                    <Text style={fontStyles.uiRegular} className="mt-0.5 text-[11px] text-muted">
                      {group.hint}
                    </Text>
                  </View>

                  <View className="items-end gap-1">
                    <Text style={fontStyles.uiSemibold} className="text-[12px] text-text-soft">
                      {group.packedCount}/{group.totalCount}
                    </Text>
                    {group.isComplete ? (
                      <View className="rounded-full border border-olive/30 bg-olive/15 px-2 py-0.5">
                        <Text style={fontStyles.uiSemibold} className="text-[10px] text-olive">
                          Complete
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View className="mt-3 overflow-hidden rounded-[14px] border border-border bg-ivory">
                  {group.visibleItems.map((item, index) => (
                    <View
                      key={item.id}
                      className={index > 0 ? "border-t border-divider" : ""}
                    >
                      <PackingItemRow
                        item={item}
                        onToggle={() => void handleToggleItem(item.id)}
                        onDelete={() => void handleRemoveItem(item.id)}
                        onStartEdit={() => handleStartEdit(item.id, item.label)}
                        isEditing={editingItemId === item.id}
                        editDraft={editingDraft}
                        onEditDraftChange={setEditingDraft}
                        onSaveEdit={() => void handleSaveEdit()}
                        onCancelEdit={() => {
                          setEditingItemId(null);
                          setEditingDraft("");
                        }}
                        variant="embedded"
                      />
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={() => {
                    setDraftCategory(group.key);
                    addInputRef.current?.focus();
                  }}
                  className="mt-3 flex-row items-center gap-2 rounded-[12px] border border-border bg-parchment-soft px-3 py-2.5 active:opacity-75"
                  accessibilityRole="button"
                  accessibilityLabel={`Add item to ${group.title}`}
                >
                  <Ionicons name="add-circle-outline" size={15} color="#B86845" />
                  <Text style={fontStyles.uiMedium} className="text-[12px] text-amber">
                    Add item to {group.title}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
