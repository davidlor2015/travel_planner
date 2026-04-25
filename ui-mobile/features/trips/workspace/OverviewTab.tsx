import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import type { StreamState } from "@/features/ai/useStreamingItinerary";
import type { TripOnTripSnapshot } from "../types";
import { fontStyles } from "@/shared/theme/typography";

import type {
  TripSummaryViewModel,
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { ItineraryTabView } from "./ItineraryTabView";
import { RegenerateSheet } from "./RegenerateSheet";
import { StopEditSheet } from "./StopEditSheet";
import { useWorkspaceOverviewModel } from "./useWorkspaceOverviewModel";
import type { WorkspaceAttentionItem, WorkspaceQuickAction } from "./workspaceCommandModel";
import type { OverviewItineraryDayPreview } from "./overviewItineraryPreview";
import type { WorkspaceTab } from "./WorkspaceTabBar";

const QUICK_ACTION_ICONS: Partial<Record<WorkspaceTab, keyof typeof Ionicons.glyphMap>> = {
  bookings: "bed-outline",
  budget: "card-outline",
  packing: "bag-outline",
  members: "people-outline",
};

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
  showItineraryOnly?: boolean;
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
  showItineraryOnly = false,
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
  const previewDays = overview.itineraryDayPreviews;

  // Pill text for NEXT ACTION header
  const nextActionPill = overview.isStreaming
    ? "Building…"
    : overview.isItineraryDirty
      ? "Unsaved edits"
      : overview.isItineraryMissing
        ? "No plan yet"
        : null;

  // Action buttons for NEXT ACTION card
  let primaryLabel: string | null = null;
  let primaryHandler: (() => void) | null = null;
  let ghostLabel: string | null = null;
  let ghostHandler: (() => void) | null = null;

  if (overview.isStreaming) {
    ghostLabel = "Cancel";
    ghostHandler = onCancelStream;
  } else if (overview.isItineraryDirty) {
    primaryLabel = overview.isSavingItinerary ? "Publishing…" : "Publish changes";
    primaryHandler = () => void overview.handlePublishChanges();
  } else if (overview.isItineraryMissing) {
    primaryLabel = "Generate with AI";
    primaryHandler = onStartStream;
  } else if (canOpenLiveView) {
    primaryLabel = "Open live view";
    primaryHandler = onOpenLiveView;
  }

  return (
    <View className="flex-1">
      {showItineraryOnly ? (
        <ItineraryTabView
          days={overview.itineraryDays}
          allDayCount={overview.itinerary?.days.length ?? 0}
          filter={overview.itineraryFilter}
          onFilterChange={overview.setItineraryFilter}
          isLoading={overview.isItineraryLoading}
          isMissing={overview.isItineraryMissing}
          isStreaming={overview.isStreaming}
          isDirty={overview.isItineraryDirty}
          isSaving={overview.isSavingItinerary}
          streamText={overview.streamText}
          error={overview.itineraryError}
          onAddStop={(dayIndex) => overview.setEditingStop({ dayIndex, stopIndex: null })}
          onEditStop={(dayIndex, stopIndex) =>
            overview.setEditingStop({ dayIndex, stopIndex })
          }
          onPublish={() => void overview.handlePublishChanges()}
          onRegenerateAll={onStartStream}
          onCancelStream={onCancelStream}
        />
      ) : (
        /* ── Overview tab ──────────────────────────────────────────── */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* NEXT ACTION ─────────────────────────────────────────── */}
          <View className="mx-4 mt-4">
            <View
              className="rounded-[20px] overflow-hidden bg-white"
              style={{ shadowColor: "#1C1108", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
            >
              {/* Section label row */}
              <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
                <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-text-soft">
                  Next action
                </Text>
                {nextActionPill ? (
                  <View className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5">
                    <Text className="text-[11px] font-semibold text-amber">{nextActionPill}</Text>
                  </View>
                ) : null}
              </View>

              <View className="gap-3 px-4 pb-4">
                {/* Title + body */}
                <View className="gap-1">
                  <Text
                    className="leading-tight text-espresso"
                    style={[fontStyles.displaySemibold, { fontSize: 22, lineHeight: 27 }]}
                  >
                    {command.nextActionTitle}
                  </Text>
                  <Text className="text-[14px] leading-[20px] text-text-muted">
                    {command.nextActionBody}
                  </Text>
                  {command.nextActionMeta && !overview.isStreaming ? (
                    <Text className="text-[12px] text-flint" style={fontStyles.uiMedium}>
                      {command.nextActionMeta}
                    </Text>
                  ) : null}
                </View>

                {/* Streaming progress */}
                {overview.isStreaming ? (
                  <View
                    className="gap-2 rounded-[14px] px-3 py-3"
                    style={{ borderWidth: 1, borderColor: "rgba(184,104,69,0.25)", backgroundColor: "rgba(184,104,69,0.05)" }}
                  >
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator size="small" color="#B86845" />
                      <Text className="text-[13px] font-semibold text-amber">Generating itinerary…</Text>
                    </View>
                    <Text className="text-[11px] leading-[16px] text-text-soft" numberOfLines={4}>
                      {overview.streamText
                        ? overview.streamText.slice(-280)
                        : "Connecting to AI…"}
                    </Text>
                  </View>
                ) : null}

                {/* Saving indicator */}
                {overview.isSavingItinerary && !overview.isStreaming ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#B86845" />
                    <Text className="text-[13px] text-text-muted">Saving itinerary…</Text>
                  </View>
                ) : null}

                {/* Action buttons */}
                {primaryLabel || ghostLabel ? (
                  <View className="mt-1 flex-row gap-2">
                    {primaryLabel && primaryHandler ? (
                      <Pressable
                        onPress={primaryHandler}
                        disabled={overview.isSavingItinerary}
                        className="flex-1 items-center justify-center rounded-full bg-espresso py-3 active:opacity-75"
                        style={overview.isSavingItinerary ? { opacity: 0.5 } : undefined}
                      >
                        <Text className="text-[13px] font-semibold text-ivory">
                          {primaryLabel}
                        </Text>
                      </Pressable>
                    ) : null}
                    {ghostLabel && ghostHandler ? (
                      <Pressable
                        onPress={ghostHandler}
                        className="flex-1 items-center justify-center rounded-full border border-border py-3 active:opacity-75"
                      >
                        <Text className="text-[13px] font-semibold text-text">{ghostLabel}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* NEEDS ATTENTION ─────────────────────────────────────── */}
          {command.attentionItems.length > 0 ? (
            <View className="mx-4 mt-5 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-text-soft">
                  Needs attention
                </Text>
                <Text className="text-[12px] font-semibold text-amber">
                  {command.attentionItems.length}{" "}
                  {command.attentionItems.length === 1 ? "item" : "items"}
                </Text>
              </View>
              <View className="gap-2">
                {command.attentionItems.map((item, index) => (
                  <AttentionRow key={`${item.label}-${index}`} item={item} />
                ))}
              </View>
            </View>
          ) : null}

          {/* QUICK ACTIONS 2×2 grid ───────────────────────────── */}
          <View className="mx-4 mt-5 gap-2">
            <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-text-soft">
              Quick actions
            </Text>
            <View className="gap-2">
              {chunkArray(command.quickActions, 2).map((row, rowIndex) => (
                <View key={rowIndex} className="flex-row gap-2">
                  {row.map((action) => (
                    <QuickActionCell
                      key={action.key}
                      action={action}
                      onPress={() => onOpenTab(action.key)}
                    />
                  ))}
                  {row.length === 1 ? <View className="flex-1" /> : null}
                </View>
              ))}
            </View>
          </View>

          {/* ITINERARY ───────────────────────────────────────────── */}
          <View className="mx-4 mt-5 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-text-soft">
                Itinerary
              </Text>
              {previewDays.length > 0 ? (
                <Pressable onPress={() => onOpenTab("itinerary")}>
                  <Text className="text-[12px] font-semibold text-amber">View full itinerary</Text>
                </Pressable>
              ) : null}
            </View>
            <View className="overflow-hidden rounded-[16px] border border-border bg-surface">
              {overview.isItineraryLoading && !overview.isStreaming ? (
                <ActivityIndicator className="py-6" />
              ) : overview.isStreaming ? (
                <View className="flex-row items-center gap-2 px-4 py-4">
                  <ActivityIndicator size="small" color="#B86845" />
                  <Text className="text-[13px] text-text-muted">Generating itinerary…</Text>
                </View>
              ) : overview.isItineraryMissing ? (
                <View className="gap-3 px-4 py-5">
                  <Text className="text-[13px] leading-5 text-text-muted">
                    No itinerary saved yet. Generate one to start planning day-by-day.
                  </Text>
                  <Pressable
                    onPress={onStartStream}
                    className="self-start rounded-full bg-amber px-4 py-2 active:opacity-75"
                  >
                    <Text className="text-[13px] font-semibold text-white">Generate with AI</Text>
                  </Pressable>
                </View>
              ) : previewDays.length > 0 ? (
                previewDays.map((day, index) => (
                  <OverviewItineraryPreviewRow
                    key={`${day.dayNumber}-${day.dayTitle}-${index}`}
                    preview={day}
                    isLast={index === previewDays.length - 1}
                    onPress={() => onOpenTab("itinerary")}
                  />
                ))
              ) : (
                <View className="px-4 py-5">
                  <Text className="text-[13px] leading-5 text-text-muted">
                    No itinerary days available yet.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* TRIP BASICS ─────────────────────────────────────────── */}
          <View className="mx-4 mt-5 gap-2">
            <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-text-soft">
              Trip basics
            </Text>
            <TripBasicsGrid trip={trip} />
          </View>
        </ScrollView>
      )}

      {/* Sheets — always rendered so state persists across tab switches */}
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
    </View>
  );
}

function OverviewItineraryPreviewRow({
  preview,
  isLast,
  onPress,
}: {
  preview: OverviewItineraryDayPreview;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${preview.dayTitle}`}
      className={[
        "flex-row px-4 py-3 active:opacity-75",
        isLast ? "" : "border-b border-border",
      ].join(" ")}
    >
      <View className="mr-3 w-12">
        <Text
          className="text-[22px] leading-[24px] text-espresso"
          style={fontStyles.displayMedium}
        >
          {preview.dayNumber}
        </Text>
        {preview.dateLabel ? (
          <Text className="mt-0.5 text-[10px] uppercase tracking-[0.9px] text-text-soft">
            {preview.dateLabel}
          </Text>
        ) : null}
      </View>

      <View className="mr-3 w-px self-stretch bg-border" />

      <View className="min-w-0 flex-1">
        <Text
          className="text-[13px] leading-[19px] text-espresso"
          style={fontStyles.uiSemibold}
          numberOfLines={1}
        >
          {preview.dayTitle}
        </Text>
        <Text
          className={[
            "mt-0.5 text-[12px] leading-[18px]",
            preview.hasStops ? "text-text-muted" : "text-text-soft",
          ].join(" ")}
          numberOfLines={1}
        >
          {preview.stopPreviewLine}
        </Text>
        <Text className="mt-0.5 text-[11px] leading-[16px] text-text-soft" numberOfLines={1}>
          {preview.metaLine}
        </Text>
      </View>

      <View className="ml-2 items-center justify-center">
        <Ionicons name="chevron-forward" size={14} color="#8A7E74" />
      </View>
    </Pressable>
  );
}

function AttentionRow({ item }: { item: WorkspaceAttentionItem }) {
  const isWarning = item.variant === "warning" || item.variant === "error";
  return (
    <View className="flex-row items-center gap-3 rounded-[14px] border border-border bg-surface px-3 py-3">
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{
          backgroundColor: isWarning
            ? "rgba(184,104,69,0.10)"
            : "rgba(28,17,8,0.05)",
        }}
      >
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={isWarning ? "#B86845" : "#8A7E74"}
        />
      </View>
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-espresso">{item.label}</Text>
        <Text className="mt-0.5 text-[12px] leading-[16px] text-text-muted">{item.detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#8A7E74" />
    </View>
  );
}

function QuickActionCell({
  action,
  onPress,
}: {
  action: WorkspaceQuickAction;
  onPress: () => void;
}) {
  const icon = QUICK_ACTION_ICONS[action.key] ?? "grid-outline";
  const iconColor = action.tone === "success" ? "#6A7A43" : "#B86845";
  const iconBg =
    action.tone === "success"
      ? "rgba(106,122,67,0.10)"
      : action.tone === "warning"
        ? "rgba(184,104,69,0.10)"
        : "rgba(28,17,8,0.06)";

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 gap-2 rounded-[16px] border border-border bg-surface p-3 active:opacity-75"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View>
        <Text className="text-[13px] font-semibold text-espresso">{action.label}</Text>
        <Text className="mt-0.5 text-[11px] text-text-muted" numberOfLines={1}>
          {action.summary}
        </Text>
      </View>
    </Pressable>
  );
}

function TripBasicsGrid({ trip }: { trip: TripWorkspaceViewModel }) {
  const cells = [
    { label: "Dates", value: trip.dateRange },
    {
      label: "Travelers",
      value: `${trip.memberCount} ${trip.memberCount === 1 ? "traveler" : "travelers"}`,
    },
    { label: "Destination", value: trip.destination },
    {
      label: "Duration",
      value: `${trip.durationDays} ${trip.durationDays === 1 ? "day" : "days"}`,
    },
  ];

  return (
    <View className="overflow-hidden rounded-[16px] border border-border bg-surface">
      {chunkArray(cells, 2).map((row, rowIndex) => (
        <View
          key={rowIndex}
          className={[
            "flex-row",
            rowIndex < Math.ceil(cells.length / 2) - 1 ? "border-b border-border" : "",
          ].join(" ")}
        >
          {row.map((cell, cellIndex) => (
            <View
              key={cell.label}
              className={[
                "flex-1 px-3 py-3",
                cellIndex === 0 ? "border-r border-border" : "",
              ].join(" ")}
            >
              <Text className="text-[10px] font-semibold uppercase tracking-[0.8px] text-text-soft">
                {cell.label}
              </Text>
              <Text
                className="mt-1 text-[13px] text-espresso"
                style={fontStyles.uiMedium}
                numberOfLines={1}
              >
                {cell.value}
              </Text>
            </View>
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
