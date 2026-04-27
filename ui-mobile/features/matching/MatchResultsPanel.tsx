// Path: ui-mobile/features/matching/MatchResultsPanel.tsx
// Summary: Implements MatchResultsPanel module logic.

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { buildMatchNarrative, workflowLabel, formatShortDate } from "./adapters";
import { useMatchResultsQuery, useUpdateMatchInteractionMutation } from "./hooks";
import { fontStyles } from "@/shared/theme/typography";
import type { MatchInteractionStatus, MatchResult } from "./api";

// ─── Score dot ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#5C7A4E" : pct >= 50 ? "#B86845" : "#8A7E74";
  return (
    <View
      className="rounded-full border px-3 py-1"
      style={{ borderColor: color, backgroundColor: `${color}18` }}
    >
      <Text style={[fontStyles.uiSemibold, { color, fontSize: 12 }]}>{pct}% match</Text>
    </View>
  );
}

// ─── Workflow action button ───────────────────────────────────────────────────

function WorkflowButton({
  label,
  onPress,
  disabled,
  variant,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant: "amber" | "ghost" | "muted";
}) {
  const bg =
    variant === "amber"
      ? "bg-amber"
      : variant === "ghost"
        ? "bg-white border border-smoke"
        : "bg-parchment border border-smoke";
  const textColor =
    variant === "amber" ? "text-white" : "text-espresso";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="active:opacity-60"
    >
      <View
        className={`rounded-full px-4 py-2.5 items-center ${bg} ${disabled ? "opacity-40" : ""}`}
      >
        <Text style={fontStyles.uiSemibold} className={`text-[13px] ${textColor}`}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Single result card ───────────────────────────────────────────────────────

function MatchResultCard({ requestId, result }: { requestId: number; result: MatchResult }) {
  const updateMutation = useUpdateMatchInteractionMutation();
  const [interaction, setInteraction] = useState(result.interaction);
  const [showDetails, setShowDetails] = useState(false);
  const [introNote, setIntroNote] = useState(
    result.interaction?.note ??
      `Hi, your trip to ${result.matched_trip.destination} looks compatible with my plans. Want to compare dates and planning preferences?`,
  );

  const narrative = buildMatchNarrative(result);
  const isSaving = updateMutation.isPending;

  useEffect(() => {
    setInteraction(result.interaction);
    if (result.interaction?.note) {
      setIntroNote(result.interaction.note);
    }
  }, [result.interaction]);

  const act = async (status: MatchInteractionStatus) => {
    const updated = await updateMutation.mutateAsync({
      requestId,
      matchResultId: result.id,
      data: { status, note: introNote },
    });
    setInteraction(updated.interaction);
    if (updated.interaction?.note) setIntroNote(updated.interaction.note);
  };

  return (
    <View className="rounded-[20px] border border-smoke bg-white px-4 py-4 gap-3">
      {/* Header */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text style={fontStyles.uiSemibold} className="text-[16px] text-espresso">
            {result.matched_user.email}
          </Text>
          <Text style={fontStyles.uiMedium} className="mt-1 text-[13px] text-flint">
            {result.matched_trip.destination}
          </Text>
          <Text style={fontStyles.uiRegular} className="text-[11px] text-muted">
            {formatShortDate(result.matched_trip.start_date)} – {formatShortDate(result.matched_trip.end_date)}
          </Text>
        </View>
        <ScoreBadge score={result.score} />
      </View>

      {/* Strengths */}
      {narrative.strengths.length > 0 ? (
        <View className="rounded-[14px] bg-parchment/60 border border-smoke px-3 py-3 gap-2">
          <Text style={fontStyles.uiSemibold} className="text-[10px] uppercase tracking-[1.2px] text-flint">
            Why this works
          </Text>
          {narrative.strengths.slice(0, 2).map((s) => (
            <View key={s.title} className="gap-0.5">
              <Text style={fontStyles.uiSemibold} className="text-[13px] text-espresso">
                {s.title}
              </Text>
              <Text style={fontStyles.uiRegular} className="text-[12px] text-muted leading-4">
                {s.body}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Frictions */}
      {narrative.frictions.length > 0 ? (
        <View className="rounded-[14px] bg-white border border-smoke px-3 py-3 gap-2">
          <Text style={fontStyles.uiSemibold} className="text-[10px] uppercase tracking-[1.2px] text-flint">
            Things to confirm
          </Text>
          {narrative.frictions.map((f) => (
            <View key={f.title} className="gap-0.5">
              <Text style={fontStyles.uiSemibold} className="text-[13px] text-espresso">
                {f.title}
              </Text>
              <Text style={fontStyles.uiRegular} className="text-[12px] text-muted leading-4">
                {f.body}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Workflow status + actions */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text style={fontStyles.uiSemibold} className="text-[11px] uppercase tracking-[1.2px] text-flint">
            Workflow
          </Text>
          <Text style={fontStyles.uiMedium} className="text-[12px] text-muted">
            {workflowLabel(interaction?.status ?? "none")}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <WorkflowButton
            label="Interested"
            variant="amber"
            disabled={isSaving || interaction?.status === "interested"}
            onPress={() => void act("interested")}
          />
          <WorkflowButton
            label="Save intro draft"
            variant="ghost"
            disabled={isSaving}
            onPress={() => void act("intro_saved")}
          />
          <WorkflowButton
            label="Pass"
            variant="muted"
            disabled={isSaving || interaction?.status === "passed"}
            onPress={() => void act("passed")}
          />
        </View>
        {updateMutation.error ? (
          <Text style={fontStyles.uiMedium} className="text-[12px] text-red-500">
            {String(updateMutation.error)}
          </Text>
        ) : null}
      </View>

      {/* Toggle intro/details */}
      <Pressable
        onPress={() => setShowDetails((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={showDetails ? "Hide intro" : "Edit intro draft"}
        className="active:opacity-60"
      >
        <View className="flex-row items-center justify-center gap-1.5 rounded-full border border-smoke bg-parchment py-2.5">
          <Text style={fontStyles.uiMedium} className="text-[13px] text-flint">
            {showDetails ? "Hide intro" : "Edit intro draft"}
          </Text>
          <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={13} color="#8A7E74" />
        </View>
      </Pressable>

      {showDetails ? (
        <View className="gap-2">
          <Text style={fontStyles.uiSemibold} className="text-[11px] uppercase tracking-[1.2px] text-flint">
            Intro draft
          </Text>
          <TextInput
            value={introNote}
            onChangeText={setIntroNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              fontStyles.uiRegular,
              {
                fontSize: 13,
                color: "#1C1108",
                borderWidth: 1,
                borderColor: "#EAE2D6",
                borderRadius: 14,
                backgroundColor: "#FFFFFF",
                padding: 12,
                minHeight: 88,
              },
            ]}
            accessibilityLabel="Intro message draft"
          />
        </View>
      ) : null}
    </View>
  );
}

// ─── Panel (lazy loads results when mounted) ──────────────────────────────────

export function MatchResultsPanel({ requestId }: { requestId: number }) {
  const { data, isLoading, error } = useMatchResultsQuery(requestId);

  if (isLoading) {
    return (
      <View className="items-center justify-center py-6 gap-2">
        <ActivityIndicator color="#B86845" />
        <Text style={fontStyles.uiRegular} className="text-[13px] text-muted">
          Loading matches…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3">
        <Text style={fontStyles.uiSemibold} className="text-[13px] text-red-600">
          Matches unavailable
        </Text>
        <Text style={fontStyles.uiRegular} className="mt-0.5 text-[12px] text-red-500">
          {String(error)}
        </Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="rounded-[16px] border border-smoke bg-parchment/50 px-4 py-4 gap-1">
        <Text style={fontStyles.uiSemibold} className="text-[14px] text-espresso">
          No matches yet
        </Text>
        <Text style={fontStyles.uiRegular} className="text-[13px] text-muted leading-5">
          Leave the request open and check back after more travelers set up matching profiles.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {data.map((result) => (
        <MatchResultCard
          key={result.id}
          requestId={requestId}
          result={result}
        />
      ))}
    </View>
  );
}
