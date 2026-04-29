// Path: ui-mobile/features/trips/packing/presentation.ts
// Summary: Implements presentation module logic.

import type { PackingItem, PackingSuggestion } from "./api";

export type PackingFilterKey = "all" | "unpacked" | "packed";

export type PackingFilterChip = {
  key: PackingFilterKey;
  label: string;
  count: number;
};

export type PackingCategoryKey =
  | "essentials"
  | "clothing"
  | "toiletries"
  | "tech"
  | "other";

export type PackingCategoryConfig = {
  key: PackingCategoryKey;
  title: string;
  hint: string;
};

export type PackingCategoryOverrides = Partial<Record<number, PackingCategoryKey>>;

export type PackingCategoryGroup = PackingCategoryConfig & {
  items: PackingItem[];
  visibleItems: PackingItem[];
  totalCount: number;
  packedCount: number;
  isComplete: boolean;
};

export type PackingSummaryViewModel = {
  total: number;
  checked: number;
  remaining: number;
  progressPct: number;
  breakdownLabel: string;
};

const CATEGORY_CONFIG: PackingCategoryConfig[] = [
  {
    key: "essentials",
    title: "Essentials",
    hint: "Travel-critical items",
  },
  {
    key: "clothing",
    title: "Clothing",
    hint: "Outfits and layers",
  },
  {
    key: "toiletries",
    title: "Toiletries",
    hint: "Personal care",
  },
  {
    key: "tech",
    title: "Tech",
    hint: "Devices and charging",
  },
  {
    key: "other",
    title: "Other",
    hint: "Everything else",
  },
];

const CATEGORY_KEYWORDS: Record<PackingCategoryKey, string[]> = {
  essentials: [
    "passport",
    "visa",
    "id",
    "ticket",
    "boarding pass",
    "medication",
    "wallet",
    "keys",
    "insurance",
    "license",
  ],
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
  other: [],
};

const SUMMARY_CATEGORY_PRIORITY: PackingCategoryKey[] = [
  "essentials",
  "clothing",
  "toiletries",
  "tech",
  "other",
];

const normalizeLabel = (value: string) => value.trim().toLocaleLowerCase();

const sortItems = (left: PackingItem, right: PackingItem) => {
  if (left.checked !== right.checked) {
    return left.checked ? 1 : -1;
  }
  return left.label.localeCompare(right.label);
};

const createBuckets = <T>() => ({
  essentials: [] as T[],
  clothing: [] as T[],
  toiletries: [] as T[],
  tech: [] as T[],
  other: [] as T[],
});

const toFilterPredicate = (filter: PackingFilterKey) => {
  if (filter === "packed") return (item: PackingItem) => item.checked;
  if (filter === "unpacked") return (item: PackingItem) => !item.checked;
  return (_item: PackingItem) => true;
};

export function listPackingCategories(): PackingCategoryConfig[] {
  return CATEGORY_CONFIG;
}

export function getPackingCategoryConfig(key: PackingCategoryKey): PackingCategoryConfig {
  return CATEGORY_CONFIG.find((category) => category.key === key) ?? CATEGORY_CONFIG[0];
}

export function detectPackingCategory(label: string): PackingCategoryKey {
  const normalized = normalizeLabel(label);

  for (const category of CATEGORY_CONFIG) {
    if (category.key === "other") continue;
    const keywords = CATEGORY_KEYWORDS[category.key];
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category.key;
    }
  }

  return "other";
}

export function trimCategoryOverrides(
  overrides: PackingCategoryOverrides,
  items: PackingItem[],
): PackingCategoryOverrides {
  if (Object.keys(overrides).length === 0) return overrides;

  const validIds = new Set(items.map((item) => item.id));
  let changed = false;
  const next: PackingCategoryOverrides = {};

  for (const [idText, categoryKey] of Object.entries(overrides)) {
    const id = Number(idText);
    if (validIds.has(id) && categoryKey) {
      next[id] = categoryKey;
    } else {
      changed = true;
    }
  }

  return changed ? next : overrides;
}

export function buildPackingFilterChips(items: PackingItem[]): PackingFilterChip[] {
  const packedCount = items.filter((item) => item.checked).length;
  const unpackedCount = Math.max(items.length - packedCount, 0);

  return [
    { key: "all", label: "All", count: items.length },
    { key: "unpacked", label: "Unpacked", count: unpackedCount },
    { key: "packed", label: "Packed", count: packedCount },
  ];
}

export function buildPackingCategoryGroups(
  items: PackingItem[],
  filter: PackingFilterKey,
  overrides: PackingCategoryOverrides,
): PackingCategoryGroup[] {
  const buckets = createBuckets<PackingItem>();
  const visible = toFilterPredicate(filter);

  for (const item of items) {
    const category = overrides[item.id] ?? detectPackingCategory(item.label);
    buckets[category].push(item);
  }

  for (const key of Object.keys(buckets) as PackingCategoryKey[]) {
    buckets[key].sort(sortItems);
  }

  return CATEGORY_CONFIG
    .map((category) => {
      const categoryItems = buckets[category.key];
      const visibleItems = categoryItems.filter(visible);
      const packedCount = categoryItems.filter((item) => item.checked).length;
      return {
        ...category,
        items: categoryItems,
        visibleItems,
        totalCount: categoryItems.length,
        packedCount,
        isComplete: categoryItems.length > 0 && packedCount >= categoryItems.length,
      };
    })
    .filter((group) => group.visibleItems.length > 0);
}

export function buildPackingSummary(
  items: PackingItem[],
  overrides: PackingCategoryOverrides,
): PackingSummaryViewModel {
  const checked = items.filter((item) => item.checked).length;
  const total = items.length;
  const remaining = Math.max(total - checked, 0);
  const progressPct = total === 0 ? 0 : Math.round((checked / total) * 100);

  if (remaining === 0) {
    return {
      total,
      checked,
      remaining,
      progressPct,
      breakdownLabel: total === 0 ? "Start your list with a few essentials." : "Everything is packed.",
    };
  }

  const remainingBuckets = createBuckets<PackingItem>();
  for (const item of items) {
    if (item.checked) continue;
    const category = overrides[item.id] ?? detectPackingCategory(item.label);
    remainingBuckets[category].push(item);
  }

  const parts: string[] = [];
  for (const categoryKey of SUMMARY_CATEGORY_PRIORITY) {
    const count = remainingBuckets[categoryKey].length;
    if (count === 0) continue;
    const label = getPackingCategoryConfig(categoryKey).title.toLocaleLowerCase();
    parts.push(`${count} ${label}`);
    if (parts.length >= 2) break;
  }

  const lead = `${remaining} item${remaining === 1 ? "" : "s"} left`;
  return {
    total,
    checked,
    remaining,
    progressPct,
    breakdownLabel: parts.length > 0 ? `${lead} · ${parts.join(" · ")}` : lead,
  };
}

export function buildVisiblePackingSuggestions(
  items: PackingItem[],
  suggestions: PackingSuggestion[],
  limit = 4,
): PackingSuggestion[] {
  const existing = new Set(items.map((item) => normalizeLabel(item.label)));
  const unique = new Set<string>();
  const visible: PackingSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = normalizeLabel(suggestion.label);
    if (!key) continue;
    if (existing.has(key) || unique.has(key)) continue;
    unique.add(key);
    visible.push(suggestion);
    if (visible.length >= limit) break;
  }

  return visible;
}
