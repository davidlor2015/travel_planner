import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { buildProfileCompleteness } from "./adapters";
import { fontStyles } from "@/shared/theme/typography";
import type { BudgetRange, TravelProfile, TravelProfilePayload, TravelStyle } from "./api";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAVEL_STYLE_OPTIONS: { value: TravelStyle; label: string }[] = [
  { value: "adventure", label: "Adventure" },
  { value: "relaxed", label: "Relaxed" },
  { value: "cultural", label: "Cultural" },
  { value: "party", label: "Party" },
];

const BUDGET_OPTIONS: { value: BudgetRange; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "mid_range", label: "Mid-range" },
  { value: "luxury", label: "Luxury" },
];

const INTEREST_OPTIONS = [
  "Food", "Nature", "Museums", "Nightlife",
  "Shopping", "History", "Hiking", "Beaches",
] as const;

const GROUP_SIZE_MIN = 1;
const GROUP_SIZE_MAX = 20;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={fontStyles.uiSemibold}
      className="text-[11px] uppercase tracking-[1.2px] text-flint"
    >
      {children}
    </Text>
  );
}

function PillButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      className="active:opacity-70"
    >
      <View
        className={[
          "rounded-full border px-4 py-2.5",
          active
            ? "border-amber bg-amber"
            : "border-smoke bg-white",
        ].join(" ")}
      >
        <Text
          style={fontStyles.uiSemibold}
          className={["text-[14px]", active ? "text-white" : "text-espresso"].join(" ")}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function ChipButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      className="active:opacity-70"
    >
      <View
        className={[
          "rounded-full border px-3.5 py-2",
          active ? "border-amber/40 bg-amber/10" : "border-smoke bg-white",
        ].join(" ")}
      >
        <Text
          style={fontStyles.uiMedium}
          className={["text-[13px]", active ? "text-amber" : "text-flint"].join(" ")}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function Stepper({
  value,
  onDecrement,
  onIncrement,
  min,
  max,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min: number;
  max: number;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={onDecrement}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        className="active:opacity-60"
      >
        <View
          className={[
            "h-9 w-9 items-center justify-center rounded-full border",
            value <= min ? "border-smoke/40 bg-parchment/50" : "border-smoke bg-white",
          ].join(" ")}
        >
          <Ionicons name="remove" size={18} color={value <= min ? "#C9BCA8" : "#6B5E52"} />
        </View>
      </Pressable>
      <Text
        style={[fontStyles.displaySemibold, { fontSize: 22, lineHeight: 26, color: "#1C1108" }]}
      >
        {value}
      </Text>
      <Pressable
        onPress={onIncrement}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        className="active:opacity-60"
      >
        <View
          className={[
            "h-9 w-9 items-center justify-center rounded-full border",
            value >= max ? "border-smoke/40 bg-parchment/50" : "border-smoke bg-white",
          ].join(" ")}
        >
          <Ionicons name="add" size={18} color={value >= max ? "#C9BCA8" : "#6B5E52"} />
        </View>
      </Pressable>
    </View>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

type Props = {
  profile?: TravelProfile | null;
  onSubmit: (data: TravelProfilePayload) => Promise<void>;
  onCancel?: () => void;
  isSaving: boolean;
};

type FormErrors = {
  interests?: string;
  group_size?: string;
  root?: string;
};

export function TravelProfileForm({ profile, onSubmit, onCancel, isSaving }: Props) {
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(
    profile?.travel_style ?? "relaxed",
  );
  const [budgetRange, setBudgetRange] = useState<BudgetRange>(
    profile?.budget_range ?? "mid_range",
  );
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [groupSizeMin, setGroupSizeMin] = useState(profile?.group_size_min ?? 1);
  const [groupSizeMax, setGroupSizeMax] = useState(profile?.group_size_max ?? 4);
  const [isDiscoverable, setIsDiscoverable] = useState(profile?.is_discoverable ?? true);
  const [errors, setErrors] = useState<FormErrors>({});

  const completeness = buildProfileCompleteness({
    travel_style: travelStyle,
    budget_range: budgetRange,
    interests,
    group_size_min: groupSizeMin,
    group_size_max: groupSizeMax,
    is_discoverable: isDiscoverable,
  });

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
    setErrors((e) => ({ ...e, interests: undefined }));
  };

  const handleSubmit = async () => {
    const nextErrors: FormErrors = {};
    if (interests.length === 0) {
      nextErrors.interests = "Pick at least one interest.";
    }
    if (groupSizeMax < groupSizeMin) {
      nextErrors.group_size = "Maximum must be at least the minimum.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    try {
      await onSubmit({ travel_style: travelStyle, budget_range: budgetRange, interests, group_size_min: groupSizeMin, group_size_max: groupSizeMax, is_discoverable: isDiscoverable });
    } catch (err) {
      setErrors({ root: err instanceof Error ? err.message : "Failed to save. Please try again." });
    }
  };

  return (
    <View className="gap-5">
      {/* Completeness bar */}
      <View className="rounded-[20px] border border-smoke bg-parchment/60 px-4 py-4 gap-2">
        <View className="flex-row items-center justify-between">
          <Text style={fontStyles.uiSemibold} className="text-[11px] uppercase tracking-[1.2px] text-flint">
            Profile quality
          </Text>
          <Text style={fontStyles.uiSemibold} className="text-[13px] text-espresso">
            {completeness.score}% · {completeness.completed}/{completeness.total} ready
          </Text>
        </View>
        <View className="h-2 rounded-full bg-white overflow-hidden border border-smoke">
          <View
            className="h-full rounded-full bg-amber"
            style={{ width: `${completeness.score}%` }}
          />
        </View>
        {completeness.prompts.length > 0 ? (
          <View className="gap-1 mt-1">
            {completeness.prompts.map((p) => (
              <Text key={p} style={fontStyles.uiRegular} className="text-[12px] text-muted leading-4">
                {p}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {/* Travel style */}
      <View className="gap-2">
        <SectionLabel>Travel style</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {TRAVEL_STYLE_OPTIONS.map(({ value, label }) => (
            <PillButton
              key={value}
              label={label}
              active={travelStyle === value}
              onPress={() => setTravelStyle(value)}
            />
          ))}
        </View>
      </View>

      {/* Budget */}
      <View className="gap-2">
        <SectionLabel>Budget range</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {BUDGET_OPTIONS.map(({ value, label }) => (
            <PillButton
              key={value}
              label={label}
              active={budgetRange === value}
              onPress={() => setBudgetRange(value)}
            />
          ))}
        </View>
      </View>

      {/* Interests */}
      <View className="gap-2">
        <SectionLabel>Interests</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <ChipButton
              key={interest}
              label={interest}
              active={interests.includes(interest)}
              onPress={() => toggleInterest(interest)}
            />
          ))}
        </View>
        {errors.interests ? (
          <Text style={fontStyles.uiMedium} className="text-[12px] text-red-500">
            {errors.interests}
          </Text>
        ) : null}
      </View>

      {/* Group size */}
      <View className="gap-3">
        <SectionLabel>Preferred group size</SectionLabel>
        <View className="flex-row gap-6">
          <View className="gap-1.5">
            <Text style={fontStyles.uiMedium} className="text-[12px] text-muted">Minimum</Text>
            <Stepper
              value={groupSizeMin}
              min={GROUP_SIZE_MIN}
              max={groupSizeMax}
              onDecrement={() => setGroupSizeMin((v) => Math.max(GROUP_SIZE_MIN, v - 1))}
              onIncrement={() => setGroupSizeMin((v) => Math.min(groupSizeMax, v + 1))}
            />
          </View>
          <View className="gap-1.5">
            <Text style={fontStyles.uiMedium} className="text-[12px] text-muted">Maximum</Text>
            <Stepper
              value={groupSizeMax}
              min={groupSizeMin}
              max={GROUP_SIZE_MAX}
              onDecrement={() => setGroupSizeMax((v) => Math.max(groupSizeMin, v - 1))}
              onIncrement={() => setGroupSizeMax((v) => Math.min(GROUP_SIZE_MAX, v + 1))}
            />
          </View>
        </View>
        {errors.group_size ? (
          <Text style={fontStyles.uiMedium} className="text-[12px] text-red-500">
            {errors.group_size}
          </Text>
        ) : null}
      </View>

      {/* Discoverability */}
      <View className="flex-row items-center justify-between rounded-[18px] border border-smoke bg-white px-4 py-4">
        <View className="flex-1 gap-0.5 pr-4">
          <Text style={fontStyles.uiSemibold} className="text-[14px] text-espresso">
            {isDiscoverable ? "Visible to matching" : "Hidden from matching"}
          </Text>
          <Text style={fontStyles.uiRegular} className="text-[12px] text-muted leading-4">
            {isDiscoverable
              ? "Your future trips can appear in candidate searches."
              : "Your trips will be excluded from candidate searches."}
          </Text>
        </View>
        <Switch
          value={isDiscoverable}
          onValueChange={setIsDiscoverable}
          trackColor={{ false: "#EAE2D6", true: "#B86845" }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Toggle discoverability"
          accessibilityRole="switch"
        />
      </View>

      {/* Root error */}
      {errors.root ? (
        <View className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3">
          <Text style={fontStyles.uiMedium} className="text-[13px] text-red-600">
            {errors.root}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Save profile"
          className="flex-1 active:opacity-70"
        >
          <View
            className={[
              "rounded-full bg-amber px-6 py-3.5 items-center",
              isSaving ? "opacity-50" : "",
            ].join(" ")}
          >
            <Text style={fontStyles.uiSemibold} className="text-[14px] text-white">
              {isSaving ? "Saving…" : "Save Profile"}
            </Text>
          </View>
        </Pressable>

        {onCancel ? (
          <Pressable
            onPress={onCancel}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            className="flex-1 active:opacity-70"
          >
            <View className="rounded-full border border-smoke bg-parchment px-6 py-3.5 items-center">
              <Text style={fontStyles.uiSemibold} className="text-[14px] text-espresso">
                Cancel
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
