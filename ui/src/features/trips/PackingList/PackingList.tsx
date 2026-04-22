import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getPackingSuggestions,
  type PackingItem,
  type PackingSuggestion,
} from "../../../shared/api/packing";
import { track } from "../../../shared/analytics";
import { Toast } from "../../../shared/ui/Toast";
import { usePackingList } from "./usePackingList";

interface PackingListProps {
  token: string;
  tripId: number;
  onSummaryChange?: (summary: {
    total: number;
    checked: number;
    progressPct: number;
    loading: boolean;
  }) => void;
}

type PackingCategoryKey =
  | "clothing"
  | "documents"
  | "tech"
  | "toiletries"
  | "other";

interface PackingCategoryConfig {
  key: PackingCategoryKey;
  title: string;
  hint: string;
  chipClass: string;
}

const CATEGORY_CONFIG: PackingCategoryConfig[] = [
  {
    key: "clothing",
    title: "Clothing",
    hint: "Outfits and weather layers",
    chipClass: "border-[#D7CAB9] bg-[#F7F0E8] text-[#7A6050]",
  },
  {
    key: "documents",
    title: "Documents",
    hint: "Travel and entry paperwork",
    chipClass: "border-[#D8CCB9] bg-[#FAF4E8] text-[#7D6335]",
  },
  {
    key: "tech",
    title: "Tech",
    hint: "Devices and charging gear",
    chipClass: "border-[#C8D5E4] bg-[#EDF3FA] text-[#3D5C7A]",
  },
  {
    key: "toiletries",
    title: "Toiletries",
    hint: "Personal care essentials",
    chipClass: "border-[#D0DDBF] bg-[#EEF3E8] text-[#556A35]",
  },
  {
    key: "other",
    title: "Other",
    hint: "Everything else for this trip",
    chipClass: "border-[#E1D8CB] bg-[#FAF8F5] text-[#6B5E52]",
  },
];

const CATEGORY_KEYWORDS: Record<PackingCategoryKey, string[]> = {
  clothing: [
    "shirt",
    "dress",
    "pants",
    "jeans",
    "jacket",
    "coat",
    "sweater",
    "sock",
    "shoe",
    "hat",
    "scarf",
    "outfit",
  ],
  documents: [
    "passport",
    "visa",
    "id",
    "document",
    "ticket",
    "insurance",
    "boarding pass",
    "reservation printout",
    "license",
  ],
  tech: [
    "charger",
    "adapter",
    "phone",
    "laptop",
    "tablet",
    "camera",
    "power bank",
    "cable",
    "headphones",
    "watch",
  ],
  toiletries: [
    "toiletry",
    "toothbrush",
    "toothpaste",
    "soap",
    "shampoo",
    "conditioner",
    "sunscreen",
    "deodorant",
    "razor",
    "makeup",
    "medication",
  ],
  other: [],
};

const ESSENTIAL_KEYWORDS = [
  "passport",
  "visa",
  "id",
  "ticket",
  "boarding pass",
  "medication",
  "charger",
  "wallet",
  "keys",
  "insurance",
  "license",
];

const OVERRIDES_STORAGE_KEY = "wp_packing_category_overrides_v1";

function emptyCategoryBuckets<T>(): Record<PackingCategoryKey, T[]> {
  return {
    clothing: [],
    documents: [],
    tech: [],
    toiletries: [],
    other: [],
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function detectCategory(label: string): PackingCategoryKey {
  const normalized = normalize(label);

  for (const category of CATEGORY_CONFIG) {
    if (category.key === "other") continue;
    const keywords = CATEGORY_KEYWORDS[category.key];
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category.key;
    }
  }

  return "other";
}

function isEssential(label: string): boolean {
  const normalized = normalize(label);
  return ESSENTIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function loadOverrides(tripId: number): Record<number, PackingCategoryKey> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(
      `${OVERRIDES_STORAGE_KEY}:${tripId}`,
    );
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, PackingCategoryKey>;
    if (!parsed || typeof parsed !== "object") return {};

    const result: Record<number, PackingCategoryKey> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const id = Number(key);
      if (
        !Number.isNaN(id) &&
        CATEGORY_CONFIG.some((category) => category.key === value)
      ) {
        result[id] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveOverrides(
  tripId: number,
  overrides: Record<number, PackingCategoryKey>,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `${OVERRIDES_STORAGE_KEY}:${tripId}`,
    JSON.stringify(overrides),
  );
}

export const PackingList = ({
  token,
  tripId,
  onSummaryChange,
}: PackingListProps) => {
  const {
    items,
    loading,
    error,
    addItem,
    toggleItem,
    removeItem,
    clearChecked,
  } = usePackingList(token, tripId);

  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] =
    useState<PackingCategoryKey>("clothing");
  const [suggestions, setSuggestions] = useState<PackingSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<number, PackingCategoryKey>
  >({});
  const inputRef = useRef<HTMLInputElement>(null);

  const toErrorMessage = (err: unknown, fallback: string): string =>
    err instanceof Error && err.message ? err.message : fallback;

  const checkedCount = items.filter((item) => item.checked).length;
  const total = items.length;
  const remaining = Math.max(0, total - checkedCount);
  const progressPct =
    total === 0 ? 0 : Math.round((checkedCount / total) * 100);

  useEffect(() => {
    onSummaryChange?.({ total, checked: checkedCount, progressPct, loading });
  }, [checkedCount, loading, onSummaryChange, progressPct, total]);

  useEffect(() => {
    setCategoryOverrides(loadOverrides(tripId));
  }, [tripId]);

  useEffect(() => {
    saveOverrides(tripId, categoryOverrides);
  }, [categoryOverrides, tripId]);

  useEffect(() => {
    // Keep override storage aligned with currently rendered items only.
    setCategoryOverrides((current) => {
      const validIds = new Set(items.map((item) => item.id));
      let changed = false;
      const next: Record<number, PackingCategoryKey> = {};

      for (const [idText, category] of Object.entries(current)) {
        const id = Number(idText);
        if (validIds.has(id)) {
          next[id] = category;
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    setSuggestionsLoading(true);

    getPackingSuggestions(token, tripId)
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data.slice(0, 10));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, tripId]);

  const groupedItems = useMemo(() => {
    const buckets = emptyCategoryBuckets<PackingItem>();

    for (const item of items) {
      const category = categoryOverrides[item.id] ?? detectCategory(item.label);
      buckets[category].push(item);
    }

    for (const key of Object.keys(buckets) as PackingCategoryKey[]) {
      buckets[key].sort((left, right) => {
        if (left.checked !== right.checked) {
          return left.checked ? 1 : -1;
        }
        return left.label.localeCompare(right.label);
      });
    }

    return buckets;
  }, [categoryOverrides, items]);

  const groupedSuggestions = useMemo(() => {
    const buckets = emptyCategoryBuckets<PackingSuggestion>();

    for (const suggestion of suggestions) {
      buckets[detectCategory(suggestion.label)].push(suggestion);
    }

    return buckets;
  }, [suggestions]);

  const handleAdd = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setFeedback(null);
    setActionError(null);

    try {
      const created = await addItem(trimmed);
      if (created) {
        setCategoryOverrides((prev) => ({
          ...prev,
          [created.id]: draftCategory,
        }));
      }

      setDraft("");
      setFeedback("Packing item added.");

      track({
        name: "packing_item_added",
        props: {
          trip_id: tripId,
          category: draftCategory,
          source: "custom",
          essential: isEssential(trimmed),
        },
      });

      inputRef.current?.focus();
    } catch (err) {
      setActionError(toErrorMessage(err, "Couldn't add packing item. Try again."));
    }
  }, [addItem, draft, draftCategory, tripId]);

  const handleAddSuggestion = useCallback(
    async (suggestion: PackingSuggestion) => {
      setFeedback(null);
      setActionError(null);

      const category = detectCategory(suggestion.label);

      try {
        const created = await addItem(suggestion.label);
        if (created) {
          setCategoryOverrides((prev) => ({ ...prev, [created.id]: category }));
        }

        setSuggestions((prev) =>
          prev.filter((candidate) => candidate.label !== suggestion.label),
        );
        setFeedback("Suggested item added.");

        track({
          name: "packing_item_added",
          props: {
            trip_id: tripId,
            category,
            source: "suggestion",
            essential: isEssential(suggestion.label),
          },
        });
      } catch (err) {
        setActionError(
          toErrorMessage(err, "Couldn't add suggested item. Try again."),
        );
      }
    },
    [addItem, tripId],
  );

  const handleToggle = useCallback(
    async (item: PackingItem) => {
      setActionError(null);
      try {
        await toggleItem(item.id);

        const nextChecked = !item.checked;
        setFeedback(nextChecked ? "Marked packed." : "Marked as still needed.");

        track({
          name: "packing_item_toggled",
          props: {
            trip_id: tripId,
            item_id: item.id,
            checked: nextChecked,
            category: categoryOverrides[item.id] ?? detectCategory(item.label),
            essential: isEssential(item.label),
          },
        });
      } catch (err) {
        setActionError(
          toErrorMessage(err, "Couldn't update item. Try again."),
        );
      }
    },
    [categoryOverrides, toggleItem, tripId],
  );

  const handleRemove = useCallback(
    async (item: PackingItem) => {
      setActionError(null);
      try {
        await removeItem(item.id);
        setFeedback("Packing item removed.");

        track({
          name: "packing_item_removed",
          props: {
            trip_id: tripId,
            item_id: item.id,
            category: categoryOverrides[item.id] ?? detectCategory(item.label),
            essential: isEssential(item.label),
          },
        });
      } catch (err) {
        setActionError(
          toErrorMessage(err, "Couldn't remove item. Try again."),
        );
      }
    },
    [categoryOverrides, removeItem, tripId],
  );

  const handleClearPacked = useCallback(async () => {
    if (checkedCount === 0) return;

    setActionError(null);
    try {
      await clearChecked();
      setFeedback("Packed items cleared.");

      track({
        name: "packing_items_cleared",
        props: {
          trip_id: tripId,
          cleared_count: checkedCount,
        },
      });
    } catch (err) {
      setActionError(
        toErrorMessage(
          err,
          "Some packed items couldn't be cleared. The list shows what's still saved.",
        ),
      );
    }
  }, [checkedCount, clearChecked, tripId]);

  const hasSuggestions = CATEGORY_CONFIG.some(
    (category) => groupedSuggestions[category.key].length > 0,
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] px-4 py-4 shadow-[0_1px_0_rgba(28,17,8,0.03)] sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
              My packing list
            </p>
            <h4 className="mt-1 text-lg font-semibold text-[#1C1108]">
              Pack with confidence before departure
            </h4>
            <p className="mt-2 text-[13px] text-[#6B5E52]">
              Your checklist is personal. Shared guidance below can still help
              the group align on essentials.
            </p>
          </div>
          {checkedCount > 0 ? (
            <button
              type="button"
              onClick={() => void handleClearPacked()}
              className="inline-flex min-h-10 items-center rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-4 text-[12px] font-semibold text-[#6B5E52] transition-colors hover:bg-[#F3EEE7]"
            >
              Clear packed
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A7E74]">
              Completion
            </p>
            <p className="mt-1 text-lg font-semibold text-[#1C1108]">
              {progressPct}%
            </p>
          </div>
          <div className="rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A7E74]">
              Packed
            </p>
            <p className="mt-1 text-lg font-semibold text-[#1C1108]">
              {checkedCount} item{checkedCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A7E74]">
              Remaining
            </p>
            <p className="mt-1 text-lg font-semibold text-[#1C1108]">
              {remaining} item{remaining === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5DDD1]">
          <div
            className="h-full rounded-full bg-[#B86845] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] px-4 py-4 shadow-[0_1px_0_rgba(28,17,8,0.03)] sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
          Add item
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
          <label className="sr-only" htmlFor={`packing-category-${tripId}`}>
            Category
          </label>
          <select
            id={`packing-category-${tripId}`}
            value={draftCategory}
            onChange={(event) =>
              setDraftCategory(event.target.value as PackingCategoryKey)
            }
            className="min-h-12 rounded-xl border border-[#E5DDD1] bg-[#FEFCF9] px-3 text-[13px] text-[#1C1108] outline-none transition focus:border-[#D2B49A] focus:ring-2 focus:ring-[#B86845]/18"
          >
            {CATEGORY_CONFIG.filter((category) => category.key !== "other").map(
              (category) => (
                <option key={category.key} value={category.key}>
                  {category.title}
                </option>
              ),
            )}
            <option value="other">Other</option>
          </select>

          <label className="sr-only" htmlFor={`packing-draft-${tripId}`}>
            Packing item
          </label>
          <input
            id={`packing-draft-${tripId}`}
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="Add item (passport, sandals, charger)"
            className="min-h-12 rounded-xl border border-[#E5DDD1] bg-[#FEFCF9] px-3 text-[13.5px] text-[#1C1108] outline-none transition placeholder:text-[#A39688] focus:border-[#D2B49A] focus:ring-2 focus:ring-[#B86845]/18"
          />

          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={draft.trim().length === 0}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#B86845] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#9A5230] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
            Add item
          </button>
        </div>
      </section>

      {error ? (
        <p
          className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {actionError ? (
        <div
          className="flex items-start justify-between gap-3 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 text-[12px] font-semibold text-danger underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] px-4 py-4 shadow-[0_1px_0_rgba(28,17,8,0.03)] sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
          Checklist
        </p>

        {loading ? (
          <div className="mt-3 space-y-2">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-12 animate-pulse rounded-xl border border-[#EAE2D6] bg-[#FAF8F5]"
              />
            ))}
          </div>
        ) : null}

        {!loading && total === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[#DCCDBD] bg-[#FAF8F5] px-4 py-4 text-sm text-[#6B5E52]">
            Add your first item using the + Add item row above, or pull one from
            shared guidance below.
          </div>
        ) : null}

        {!loading && total > 0 ? (
          <div className="mt-3 space-y-3">
            {CATEGORY_CONFIG.map((category) => {
              const categoryItems = groupedItems[category.key];
              if (categoryItems.length === 0 && category.key === "other") {
                return null;
              }

              return (
                <section
                  key={category.key}
                  className="rounded-xl border border-[#EAE2D6] bg-[#FAF8F5] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-[13px] font-semibold text-[#1C1108]">
                      {category.title}
                    </h5>
                    <span
                      className={[
                        "inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
                        category.chipClass,
                      ].join(" ")}
                    >
                      {categoryItems.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8A7E74]">
                    {category.hint}
                  </p>

                  {categoryItems.length === 0 ? (
                    <p className="mt-2 text-[12px] text-[#8A7E74]">
                      No items here yet.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {categoryItems.map((item) => {
                        const essential = isEssential(item.label);

                        return (
                          <li
                            key={item.id}
                            className="flex items-stretch gap-2"
                          >
                            <label
                              className={[
                                "flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                                item.checked
                                  ? "border-[#DBD1C4] bg-[#F4EFE8]"
                                  : "border-[#E2D6C8] bg-[#FEFCF9] hover:bg-[#F9F3EB]",
                              ].join(" ")}
                            >
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => void handleToggle(item)}
                                className="h-5 w-5 shrink-0 rounded border-[#C9B9A7] text-[#B86845] focus:ring-[#B86845]/30"
                                aria-label={
                                  item.checked
                                    ? `Mark ${item.label} as unpacked`
                                    : `Mark ${item.label} as packed`
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span
                                  className={[
                                    "block text-[13.5px]",
                                    item.checked
                                      ? "text-[#8A7E74] line-through"
                                      : "font-medium text-[#1C1108]",
                                  ].join(" ")}
                                >
                                  {item.label}
                                </span>
                              </span>

                              {essential ? (
                                <span className="inline-flex min-h-6 items-center rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#7A6A5E]">
                                  Essential
                                </span>
                              ) : null}
                            </label>

                            <button
                              type="button"
                              onClick={() => void handleRemove(item)}
                              aria-label={`Remove ${item.label}`}
                              className="inline-flex min-h-12 min-w-11 items-center justify-center rounded-xl border border-[#E5DDD1] bg-white text-[#8A7E74] transition-colors hover:bg-[#F3EEE7] hover:text-[#1C1108]"
                            >
                              <svg
                                viewBox="0 0 20 20"
                                className="h-4 w-4"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M5.5 5.5 14.5 14.5M14.5 5.5l-9 9"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] px-4 py-4 shadow-[0_1px_0_rgba(28,17,8,0.03)] sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
          Shared guidance
        </p>
        <p className="mt-2 text-[13px] text-[#6B5E52]">
          Use these trip-aware suggestions as a shared baseline, then add what
          you personally need.
        </p>

        {suggestionsLoading ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-16 animate-pulse rounded-xl border border-[#EAE2D6] bg-[#FAF8F5]"
              />
            ))}
          </div>
        ) : null}

        {!suggestionsLoading && !hasSuggestions ? (
          <p className="mt-3 rounded-xl border border-dashed border-[#DCCDBD] bg-[#FAF8F5] px-4 py-3 text-sm text-[#6B5E52]">
            Suggestions will appear when we have enough destination and trip
            context.
          </p>
        ) : null}

        {!suggestionsLoading && hasSuggestions ? (
          <div className="mt-3 space-y-3">
            {CATEGORY_CONFIG.map((category) => {
              const categorySuggestions = groupedSuggestions[category.key];
              if (categorySuggestions.length === 0) return null;

              return (
                <section
                  key={category.key}
                  className="rounded-xl border border-[#EAE2D6] bg-[#FAF8F5] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-[13px] font-semibold text-[#1C1108]">
                      {category.title}
                    </h5>
                    <span
                      className={[
                        "inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
                        category.chipClass,
                      ].join(" ")}
                    >
                      {categorySuggestions.length}
                    </span>
                  </div>

                  <ul className="mt-2 space-y-2">
                    {categorySuggestions.map((suggestion) => (
                      <li
                        key={suggestion.label}
                        className="rounded-xl border border-[#E2D6C8] bg-[#FEFCF9] px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#1C1108]">
                              {suggestion.label}
                            </p>
                            <p className="mt-1 text-[11.5px] text-[#8A7E74]">
                              {suggestion.reason}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleAddSuggestion(suggestion)}
                            className="inline-flex min-h-10 items-center rounded-full bg-[#F5EDE7] px-3 text-[12px] font-semibold text-[#9A5230] transition-colors hover:bg-[#EEDFD4]"
                          >
                            + Add
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : null}
      </section>

      <Toast message={feedback} onDismiss={() => setFeedback(null)} />
    </div>
  );
};
