import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import type { ItineraryItem } from "@/features/ai/api";
import type { StreamState } from "@/features/ai/useStreamingItinerary";
import type { TripOnTripSnapshot } from "../types";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { SectionCard } from "@/shared/ui/SectionCard";
import { StatusPill } from "@/shared/ui/StatusPill";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

import type {
  TripSummaryViewModel,
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { EditableItineraryDayCard } from "./EditableItineraryDayCard";
import { RegenerateSheet } from "./RegenerateSheet";
import { StopEditSheet } from "./StopEditSheet";
import { useWorkspaceOverviewModel } from "./useWorkspaceOverviewModel";
import type {
  WorkspaceAttentionItem,
  WorkspaceItineraryPreview,
  WorkspaceQuickAction,
} from "./workspaceCommandModel";
import type { WorkspaceTab } from "./WorkspaceTabBar";

type Props = {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
  collaboration: TripWorkspaceCollaborationViewModel | null;
  onTripSnapshot: TripOnTripSnapshot | null;
  canOpenLiveView: boolean;
  streamState: StreamState | undefined;
  onStartStream: () => void;
  onCancelStream: () => void;
  onOpenTab: (tab: WorkspaceTab) => void;
  onOpenLiveView: () => void;
};

const ACTION_ICONS: Record<WorkspaceTab, keyof typeof Ionicons.glyphMap> = {
  overview: "list-outline",
  bookings: "bookmark-outline",
  budget: "card-outline",
  packing: "bag-outline",
  members: "people-outline",
};

export function OverviewTab({
  trip,
  summary,
  collaboration,
  onTripSnapshot,
  canOpenLiveView,
  streamState,
  onStartStream,
  onCancelStream,
  onOpenTab,
  onOpenLiveView,
}: Props) {
  const overview = useWorkspaceOverviewModel({
    trip,
    summary,
    collaboration,
    onTripSnapshot,
    streamState,
    onCancelStream,
  });

  const command = overview.command;

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      <TodayCard
        title={command.todayTitle}
        body={command.todayBody}
        meta={command.todayMeta}
        canOpenLiveView={canOpenLiveView}
        onOpenLiveView={onOpenLiveView}
      />

      <NextActionCard
        title={command.nextActionTitle}
        body={command.nextActionBody}
        meta={command.nextActionMeta}
        isStreaming={overview.isStreaming}
        isSaving={overview.isSavingItinerary}
        isDirty={overview.isItineraryDirty}
        isMissing={overview.isItineraryMissing}
        hasItinerary={Boolean(overview.itinerary)}
        onCancelStream={onCancelStream}
        onStartStream={onStartStream}
        onPublish={() => void overview.handlePublishChanges()}
        onShowItinerary={() => overview.setShowFullItinerary(true)}
      />

      <ReadinessCard
        title={command.readinessTitle}
        body={command.readinessBody}
        items={command.attentionItems}
      />

      <QuickActionsCard actions={command.quickActions} onOpenTab={onOpenTab} />

      <ItineraryPreviewCard
        preview={command.itineraryPreview}
        isLoading={overview.isItineraryLoading}
        isMissing={overview.isItineraryMissing}
        isStreaming={overview.isStreaming}
        isSaving={overview.isSavingItinerary}
        error={overview.itineraryError}
        streamText={overview.streamText}
        showFullItinerary={overview.showFullItinerary}
        onStartStream={onStartStream}
        onCancelStream={onCancelStream}
        onShowFullItinerary={() => overview.setShowFullItinerary(true)}
        onHideFullItinerary={() => overview.setShowFullItinerary(false)}
      />

      {overview.showFullItinerary && overview.itinerary ? (
        <SectionCard
          eyebrow="Edit itinerary"
          title="Full saved plan"
          description="Use this for quick mobile corrections. Larger planning work is better on the web workspace."
        >
          <View className="gap-3">
            {overview.itinerary.days.map((day, dayIndex) => (
              <EditableItineraryDayCard
                key={day.day_number}
                day={day}
                onAddStop={() => overview.setEditingStop({ dayIndex, stopIndex: null })}
                onEditStop={(stopIndex) =>
                  overview.setEditingStop({ dayIndex, stopIndex })
                }
                onRegenerate={
                  !overview.isItineraryDirty
                    ? () => overview.setRegeneratingDayIndex(dayIndex)
                    : undefined
                }
              />
            ))}
            {overview.isItineraryDirty ? (
              <PrimaryButton
                label={overview.isSavingItinerary ? "Publishing..." : "Publish changes"}
                onPress={() => void overview.handlePublishChanges()}
                disabled={overview.isSavingItinerary}
                fullWidth
              />
            ) : null}
            <Pressable
              onPress={onStartStream}
              disabled={overview.isItineraryDirty}
              accessibilityRole="button"
              className={[
                "flex-row items-center justify-center rounded-full border border-border-strong py-2.5 active:opacity-70",
                overview.isItineraryDirty ? "opacity-50" : "",
              ].join(" ")}
            >
              <Text className="text-xs font-semibold text-text-muted">
                {overview.isItineraryDirty
                  ? "Publish changes before regenerating"
                  : "Regenerate with AI"}
              </Text>
            </Pressable>
          </View>
        </SectionCard>
      ) : null}

      <TripBasicsCard trip={trip} />

      {overview.itinerary ? (
        <>
          <StopEditSheet
            visible={Boolean(overview.editingStop)}
            item={overview.selectedStop}
            onSave={overview.handleSaveStop}
            onDelete={overview.handleDeleteStop}
            onClose={() => overview.setEditingStop(null)}
          />
          <RegenerateSheet
            visible={overview.regeneratingDayIndex !== null}
            tripId={trip.id}
            day={
              overview.regeneratingDayIndex !== null
                ? (overview.itinerary.days[overview.regeneratingDayIndex] ?? null)
                : null
            }
            currentItinerary={overview.itinerary}
            onAccept={overview.handleAcceptRefinement}
            onClose={() => overview.setRegeneratingDayIndex(null)}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function TodayCard({
  title,
  body,
  meta,
  canOpenLiveView,
  onOpenLiveView,
}: {
  title: string;
  body: string;
  meta: string | null;
  canOpenLiveView: boolean;
  onOpenLiveView: () => void;
}) {
  return (
    <View className="rounded-[26px] border border-border bg-white px-4 py-5 shadow-card">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text
            className="text-[10px] uppercase tracking-[1.6px] text-accent"
            style={fontStyles.uiSemibold}
          >
            Today
          </Text>
          <Text className="mt-1 text-espresso" style={textScaleStyles.displayL}>
            {title}
          </Text>
          <Text className="mt-2 text-[14px] leading-5 text-muted" style={fontStyles.uiRegular}>
            {body}
          </Text>
          {meta ? (
            <Text className="mt-2 text-[12px] text-flint" style={fontStyles.uiMedium}>
              {meta}
            </Text>
          ) : null}
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-amber/10">
          <Ionicons name="sunny-outline" size={21} color="#B86845" />
        </View>
      </View>

      {canOpenLiveView ? (
        <Pressable
          onPress={onOpenLiveView}
          accessibilityRole="button"
          accessibilityLabel="Open live trip view"
          className="mt-4 flex-row items-center justify-between rounded-[18px] border border-border-ontrip-strong bg-surface-ontrip-raised px-4 py-3 active:opacity-75"
        >
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-accent-ontrip" />
            <Text className="text-[13px] text-ontrip" style={fontStyles.uiSemibold}>
              Live trip controls
            </Text>
          </View>
          <Text className="text-[13px] text-accent-ontrip" style={fontStyles.uiSemibold}>
            Open
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NextActionCard({
  title,
  body,
  meta,
  isStreaming,
  isSaving,
  isDirty,
  isMissing,
  hasItinerary,
  onCancelStream,
  onStartStream,
  onPublish,
  onShowItinerary,
}: {
  title: string;
  body: string;
  meta: string | null;
  isStreaming: boolean;
  isSaving: boolean;
  isDirty: boolean;
  isMissing: boolean;
  hasItinerary: boolean;
  onCancelStream: () => void;
  onStartStream: () => void;
  onPublish: () => void;
  onShowItinerary: () => void;
}) {
  let action: ReactNode = null;
  if (isStreaming) {
    action = <SecondaryButton label="Cancel" onPress={onCancelStream} />;
  } else if (isDirty) {
    action = <PrimaryButton label="Publish" onPress={onPublish} />;
  } else if (isMissing) {
    action = <PrimaryButton label="Generate" onPress={onStartStream} />;
  } else if (hasItinerary && !isSaving) {
    action = <SecondaryButton label="View plan" onPress={onShowItinerary} />;
  }

  return (
    <SectionCard eyebrow="Next action" title={title} action={action}>
      <View className="gap-2">
        <Text className="text-[14px] leading-5 text-text-muted" style={fontStyles.uiRegular}>
          {body}
        </Text>
        {meta ? (
          <Text className="text-[12px] text-text-soft" style={fontStyles.uiMedium}>
            {meta}
          </Text>
        ) : null}
        {isSaving ? (
          <View className="mt-1 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#B86845" />
            <Text className="text-sm text-text-muted">Saving itinerary...</Text>
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}

function ReadinessCard({
  title,
  body,
  items,
}: {
  title: string;
  body: string;
  items: WorkspaceAttentionItem[];
}) {
  return (
    <SectionCard eyebrow="Readiness" title={title} description={body}>
      {items.length > 0 ? (
        <View className="gap-2">
          {items.map((item) => (
            <View
              key={`${item.label}-${item.detail}`}
              className="rounded-[16px] border border-border bg-surface-muted px-3 py-3"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[13px] text-text" style={fontStyles.uiSemibold}>
                    {item.label}
                  </Text>
                  <Text className="mt-1 text-[12px] leading-4 text-text-muted">
                    {item.detail}
                  </Text>
                </View>
                <StatusPill label="Check" variant={item.variant} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="rounded-[16px] border border-olive/20 bg-olive/10 px-3 py-3">
          <Text className="text-[13px] text-olive" style={fontStyles.uiSemibold}>
            No urgent blockers from saved trip details.
          </Text>
        </View>
      )}
    </SectionCard>
  );
}

function QuickActionsCard({
  actions,
  onOpenTab,
}: {
  actions: WorkspaceQuickAction[];
  onOpenTab: (tab: WorkspaceTab) => void;
}) {
  return (
    <SectionCard
      eyebrow="Quick actions"
      title="Open a trip tool"
      description="Jump into the details only when you need to update them."
    >
      <View className="gap-2">
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => onOpenTab(action.key)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${action.label}`}
            className="active:opacity-70"
          >
            <View className="flex-row items-center gap-3 rounded-[16px] border border-border bg-surface-muted px-3 py-3">
              <View
                className={[
                  "h-10 w-10 items-center justify-center rounded-full",
                  action.tone === "warning"
                    ? "bg-amber/10"
                    : action.tone === "success"
                      ? "bg-olive/10"
                      : "bg-white",
                ].join(" ")}
              >
                <Ionicons
                  name={ACTION_ICONS[action.key]}
                  size={18}
                  color={action.tone === "success" ? "#6A7A43" : "#B86845"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] text-text" style={fontStyles.uiSemibold}>
                  {action.label}
                </Text>
                <Text className="mt-0.5 text-[12px] text-text-muted">
                  {action.detail}
                </Text>
              </View>
              <Text className="text-[13px] text-text" style={fontStyles.uiSemibold}>
                {action.summary}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}

function ItineraryPreviewCard({
  preview,
  isLoading,
  isMissing,
  isStreaming,
  isSaving,
  error,
  streamText,
  showFullItinerary,
  onStartStream,
  onCancelStream,
  onShowFullItinerary,
  onHideFullItinerary,
}: {
  preview: WorkspaceItineraryPreview | null;
  isLoading: boolean;
  isMissing: boolean;
  isStreaming: boolean;
  isSaving: boolean;
  error: string | null;
  streamText: string | null;
  showFullItinerary: boolean;
  onStartStream: () => void;
  onCancelStream: () => void;
  onShowFullItinerary: () => void;
  onHideFullItinerary: () => void;
}) {
  return (
    <SectionCard
      eyebrow="Itinerary"
      title={preview ? preview.title : "Saved plan"}
      description={preview?.subtitle ?? "Keep the plan lightweight on mobile."}
      action={
        preview ? (
          <Pressable
            onPress={showFullItinerary ? onHideFullItinerary : onShowFullItinerary}
            accessibilityRole="button"
          >
            <Text className="text-[13px] text-accent" style={fontStyles.uiSemibold}>
              {showFullItinerary ? "Hide editor" : "Edit itinerary"}
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      <View className="gap-3">
        {isStreaming ? (
          <View
            className="gap-3 rounded-[18px] p-4"
            style={{
              borderWidth: 1,
              borderColor: "rgba(184, 104, 69, 0.3)",
              backgroundColor: "rgba(184, 104, 69, 0.05)",
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#B86845" />
                <Text className="text-sm font-semibold text-amber">
                  Generating itinerary...
                </Text>
              </View>
              <Pressable
                onPress={onCancelStream}
                accessibilityRole="button"
                accessibilityLabel="Cancel generation"
                className="rounded-full px-3 py-1.5 active:opacity-60"
              >
                <Text className="text-xs font-semibold text-text-muted">Cancel</Text>
              </Pressable>
            </View>
            <Text className="text-xs leading-relaxed text-text-soft" numberOfLines={5}>
              {streamText
                ? streamText.slice(-320)
                : "Connecting to AI... you can cancel at any time."}
            </Text>
          </View>
        ) : null}

        {isSaving ? (
          <View className="flex-row items-center gap-2 py-2">
            <ActivityIndicator size="small" color="#B86845" />
            <Text className="text-sm text-text-muted">Saving itinerary...</Text>
          </View>
        ) : null}

        {error && !isStreaming ? (
          <Text className="text-sm text-danger">{error}</Text>
        ) : null}

        {isLoading && !isStreaming ? (
          <ActivityIndicator className="py-2" />
        ) : null}

        {isMissing && !isStreaming ? (
          <View className="gap-3">
            <Text className="text-sm leading-5 text-text-muted">
              No itinerary is saved yet. Generate one with AI when you are ready
              to turn the trip shell into a plan.
            </Text>
            <PrimaryButton label="Generate with AI" onPress={onStartStream} />
          </View>
        ) : null}

        {preview ? (
          <View className="gap-3">
            {preview.primaryStop ? (
              <StopPreview stop={preview.primaryStop} primary />
            ) : (
              <Text className="rounded-[16px] border border-border bg-surface-muted px-4 py-4 text-sm text-text-muted">
                Nothing scheduled for this day.
              </Text>
            )}
            {preview.secondaryStops.length > 0 ? (
              <View className="gap-2">
                {preview.secondaryStops.map((stop, index) => (
                  <StopPreview key={`${stop.title}-${index}`} stop={stop} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}

function StopPreview({ stop, primary = false }: { stop: ItineraryItem; primary?: boolean }) {
  return (
    <View
      className={[
        "rounded-[16px] border px-3 py-3",
        primary ? "border-amber/30 bg-amber/10" : "border-border bg-surface-muted",
      ].join(" ")}
    >
      <View className="flex-row gap-3">
        {stop.time?.trim() ? (
          <Text
            className={primary ? "w-16 text-[13px] text-accent" : "w-16 text-[12px] text-text-soft"}
            style={fontStyles.uiSemibold}
          >
            {stop.time.trim()}
          </Text>
        ) : null}
        <View className="flex-1">
          <Text className="text-[14px] text-text" style={fontStyles.uiSemibold}>
            {stop.title?.trim() || "Untitled stop"}
          </Text>
          {stop.location?.trim() ? (
            <Text className="mt-0.5 text-[12px] text-text-muted">
              {stop.location.trim()}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function TripBasicsCard({ trip }: { trip: TripWorkspaceViewModel }) {
  return (
    <SectionCard eyebrow="Trip basics" title="Destination and timing">
      <View className="gap-3">
        <InfoRow label="Destination" value={trip.destination} />
        <InfoRow label="Dates" value={trip.dateRange} />
        <InfoRow
          label="Duration"
          value={`${trip.durationDays} ${trip.durationDays === 1 ? "day" : "days"}`}
        />
        <View className="flex-row flex-wrap gap-2">
          <StatusPill
            label={trip.statusLabel}
            variant={
              trip.status === "active"
                ? "success"
                : trip.status === "upcoming"
                  ? "warning"
                  : "default"
            }
          />
          <StatusPill
            label={trip.isOwner ? "You own this trip" : "Shared trip"}
            variant="info"
          />
        </View>
      </View>
    </SectionCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-soft">
        {label}
      </Text>
      <Text className="mt-1 text-base text-text">{value}</Text>
    </View>
  );
}
