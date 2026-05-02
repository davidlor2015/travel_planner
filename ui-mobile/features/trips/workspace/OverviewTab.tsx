// Path: ui-mobile/features/trips/workspace/OverviewTab.tsx
// Summary: Implements OverviewTab module logic.

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { updateWorkspaceLastSeen } from "@/features/trips/api";
import type { TripOnTripSnapshot, TripResponse } from "@/features/trips/types";
import type { StreamState } from "@/features/ai/useStreamingItinerary";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

import type {
  TripSummaryViewModel,
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { ItineraryTabView } from "./ItineraryTabView";
import { RegenerateSheet } from "./RegenerateSheet";
import { RethinkDaySheet } from "./RethinkDaySheet";
import { ReadOnlyNotice } from "./ReadOnlyNotice";
import { StopFormSheet } from "./StopFormSheet";
import { useWorkspaceOverviewModel } from "./useWorkspaceOverviewModel";
import { ActivitySheet } from "./ActivitySheet";
import { ActivityStrip } from "./ActivityStrip";
import { buildTripActivityModel } from "./tripActivityModel";
import type { WorkspaceAttentionItem } from "./workspaceCommandModel";
import type { OverviewItineraryDayPreview } from "./overviewItineraryPreview";
import type { WorkspaceTab } from "./WorkspaceTabBar";

type Props = {
  trip: TripWorkspaceViewModel;
  tripRaw: TripResponse;
  currentUserEmail: string;
  summary: TripSummaryViewModel | null;
  collaboration: TripWorkspaceCollaborationViewModel | null;
  onTripSnapshot: TripOnTripSnapshot | null;
  canOpenLiveView: boolean;
  streamState: StreamState | undefined;
  onStartStream: () => void;
  onCancelStream: () => void;
  onOpenTab: (tab: WorkspaceTab) => void;
  onOpenLiveView: () => void;
  onItineraryApplied?: () => void;
  showItineraryOnly?: boolean;
  isReadOnly?: boolean;
  activityLoadError?: string | null;
};

export function OverviewTab({
  trip,
  tripRaw,
  currentUserEmail,
  summary,
  collaboration,
  onTripSnapshot,
  canOpenLiveView,
  streamState,
  onStartStream,
  onCancelStream,
  onOpenTab,
  onOpenLiveView,
  onItineraryApplied,
  showItineraryOnly = false,
  isReadOnly = false,
  activityLoadError = null,
}: Props) {
  const overview = useWorkspaceOverviewModel({
    trip,
    summary,
    collaboration,
    onTripSnapshot,
    streamState,
    onCancelStream,
    onItineraryApplied,
  });

  const command = overview.command;
  const previewDays = overview.itineraryDayPreviews;
  const isActiveTrip = trip.status === "active";
  const showActivity = tripRaw.member_count > 1;
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [activitySeenState, setActivitySeenState] = useState<{
    signature: string | null;
    snapshot: Record<string, unknown> | null;
  }>({ signature: null, snapshot: null });
  const [activityStatusError, setActivityStatusError] = useState<string | null>(null);

  useEffect(() => {
    const currentMember =
      tripRaw.members.find(
        (member) =>
          member.email.trim().toLowerCase() ===
          currentUserEmail.trim().toLowerCase(),
      ) ?? null;
    setActivitySeenState({
      signature: currentMember?.workspace_last_seen_signature ?? null,
      snapshot:
        (currentMember?.workspace_last_seen_snapshot as Record<string, unknown> | null | undefined) ??
        null,
    });
    setActivityStatusError(null);
  }, [tripRaw.id, tripRaw.members, currentUserEmail]);

  const activityModel = useMemo(
    () =>
      buildTripActivityModel({
        trip: tripRaw,
        itinerary: overview.itinerary,
        summary,
        onTripSnapshot,
        lastSeenSnapshot: activitySeenState.snapshot,
      }),
    [
      activitySeenState.snapshot,
      onTripSnapshot,
      overview.itinerary,
      summary,
      tripRaw,
    ],
  );

  const handleCloseActivitySheet = () => {
    setActivitySheetOpen(false);
    if (activitySeenState.signature === activityModel.signature) return;
    const payload = {
      signature: activityModel.signature,
      snapshot: activityModel.snapshot as Record<string, unknown>,
    };
    setActivitySeenState(payload);
    void updateWorkspaceLastSeen(tripRaw.id, payload).catch(() => {
      setActivityStatusError("Couldn't load recent activity.");
    });
  };

  const nextActionPill = overview.isStreaming
    ? "Building…"
    : overview.isItineraryDirty
      ? "Unsaved edits"
      : overview.isItineraryMissing
        ? "No plan yet"
        : null;
  const activityError = activityLoadError ?? activityStatusError;
  const hasActivityItems = activityModel.items.length > 0;
  const shouldShowActivitySection =
    showActivity && (hasActivityItems || Boolean(activityError));

  let primaryLabel: string | null = null;
  let primaryHandler: (() => void) | null = null;
  let ghostLabel: string | null = null;
  let ghostHandler: (() => void) | null = null;

  if (isReadOnly) {
    if (canOpenLiveView) {
      primaryLabel = "Open Today";
      primaryHandler = onOpenLiveView;
    }
  } else if (overview.isStreaming) {
    ghostLabel = "Cancel";
    ghostHandler = onCancelStream;
  } else if (overview.isItineraryDirty) {
    primaryLabel = overview.isSavingItinerary ? "Publishing…" : "Publish changes";
    primaryHandler = () => void overview.handlePublishChanges();
  } else if (overview.isItineraryMissing) {
    primaryLabel = "Generate with AI";
    primaryHandler = onStartStream;
  } else if (canOpenLiveView) {
    primaryLabel = "Open Today";
    primaryHandler = onOpenLiveView;
  }
  const showInlineLiveEntry = isActiveTrip && canOpenLiveView;
  const showPrimaryButton =
    primaryLabel !== null && (!showInlineLiveEntry || primaryLabel !== "Open Today");

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
          onAddDay={overview.handleAddDay}
          onPublish={() => void overview.handlePublishChanges()}
          onRegenerateAll={onStartStream}
          onCancelStream={onCancelStream}
          onRethinkDay={!isReadOnly ? (dayIndex) => overview.setRethinkingDayIndex(dayIndex) : undefined}
          isReadOnly={isReadOnly}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {isReadOnly ? <ReadOnlyNotice className="mx-[22px] mt-4" /> : null}

          {overview.recentlyApplied ? (
            <View
              testID="itinerary-applied-banner"
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{
                marginHorizontal: 22,
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                backgroundColor: "#F2EBDD",
                borderWidth: 1,
                borderColor: "rgba(184,90,56,0.22)",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(184,90,56,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={16} color="#B85A38" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[fontStyles.headSemibold, { fontSize: 16, color: "#231910", lineHeight: 20 }]}>
                  Your trip is ready
                </Text>
                <Text
                  style={[fontStyles.uiRegular, { fontSize: 13, lineHeight: 18, color: "#8A7B6A", marginTop: 4 }]}
                >
                  Your itinerary is in your trip plan now.
                </Text>
              </View>
            </View>
          ) : null}

          {isActiveTrip ? (
            <View style={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20 }}>
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(66,92,66,0.22)",
                  backgroundColor: "rgba(116,145,112,0.12)",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#4E6D4E",
                    }}
                  />
                  <Text style={[fontStyles.uiSemibold, { fontSize: 13.5, color: "#2B3F2B" }]}>
                    Trip in progress
                  </Text>
                </View>
                <Text style={[fontStyles.uiRegular, { fontSize: 12, color: "#556A55" }]}>
                  Use the next action and Today to keep the day moving.
                </Text>
              </View>
            </View>
          ) : null}

          {/* NEXT ACTION ─────────────────────────────────────── */}
          <OverviewSectionHeading
            label="NEXT ACTION"
            topPadding={isActiveTrip ? 0 : 20}
            accent
          />
          <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
            <OverviewSurfaceCard>
              <View style={{ padding: 20 }}>
              {/* Title + pill */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={[
                    fontStyles.headMedium,
                    { fontSize: 24, color: "#231910", letterSpacing: -0.4, lineHeight: 28, flex: 1, paddingRight: 12 },
                  ]}
                >
                  {command.nextActionTitle}
                </Text>
                {nextActionPill ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 100,
                      backgroundColor: "#EFD8C9",
                      flexShrink: 0,
                    }}
                  >
                    <Text style={[fontStyles.uiSemibold, { fontSize: 10.5, color: "#231910", letterSpacing: 0.3 }]}>
                      {nextActionPill}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Body */}
              <Text
                style={[fontStyles.uiRegular, { fontSize: 13, color: "#8A7B6A", lineHeight: 20, marginBottom: 16 }]}
              >
                {command.nextActionBody}
              </Text>

              {/* Streaming banner */}
              {overview.isStreaming ? (
                <View
                  style={{
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "rgba(184,90,56,0.25)",
                    backgroundColor: "rgba(184,90,56,0.05)",
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color="#B85A38" />
                    <Text style={[fontStyles.uiSemibold, { fontSize: 13, color: "#B85A38" }]}>
                      Generating itinerary…
                    </Text>
                  </View>
                  <Text
                    style={[fontStyles.uiRegular, { fontSize: 11, lineHeight: 16, color: "#8A7B6A" }]}
                    numberOfLines={4}
                  >
                    {overview.streamText ? overview.streamText.slice(-280) : "Connecting to AI…"}
                  </Text>
                </View>
              ) : null}

              {/* Saving indicator */}
              {overview.isSavingItinerary && !overview.isStreaming ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <ActivityIndicator size="small" color="#B85A38" />
                  <Text style={[fontStyles.uiRegular, { fontSize: 13, color: "#8A7B6A" }]}>
                    Saving itinerary…
                  </Text>
                </View>
              ) : null}

              {showInlineLiveEntry ? (
                <Pressable
                  onPress={onOpenLiveView}
                  className="active:opacity-75"
                  accessibilityRole="button"
                  accessibilityLabel="Open Today"
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(78,109,78,0.34)",
                    backgroundColor: "rgba(116,145,112,0.12)",
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    marginBottom: primaryLabel || ghostLabel ? 12 : 0,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
                    <Ionicons name="radio" size={14} color="#4E6D4E" />
                    <Text style={[fontStyles.uiMedium, { fontSize: 13, color: "#2B3F2B" }]}>
                      Open Today
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#4E6D4E" />
                </Pressable>
              ) : null}

              {/* Buttons */}
              {showPrimaryButton || ghostLabel ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {showPrimaryButton && primaryLabel && primaryHandler ? (
                    <Pressable
                      onPress={primaryHandler}
                      disabled={overview.isSavingItinerary}
                      className="active:opacity-75"
                      style={[
                        {
                          flex: 1,
                          height: 46,
                          borderRadius: 12,
                          backgroundColor: "#231910",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                        overview.isSavingItinerary ? { opacity: 0.5 } : undefined,
                      ]}
                    >
                      <Text style={[fontStyles.uiSemibold, { fontSize: 13.5, color: "#F2EBDD" }]}>
                        {primaryLabel}
                      </Text>
                    </Pressable>
                  ) : null}
                  {ghostLabel && ghostHandler ? (
                    <Pressable
                      onPress={ghostHandler}
                      className="active:opacity-75"
                      style={{
                        paddingHorizontal: 22,
                        height: 46,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "rgba(35,25,16,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={[fontStyles.uiMedium, { fontSize: 13.5, color: "#231910" }]}>
                        {ghostLabel}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              </View>
            </OverviewSurfaceCard>
          </View>

          {/* NEEDS ATTENTION ─────────────────────────────────── */}
          {command.attentionItems.length > 0 ? (
            <>
              <OverviewSectionHeading
                label="NEEDS ATTENTION"
                trailing={(
                  <Text style={[fontStyles.uiMedium, { fontSize: 12, color: "#B85A38" }]}>
                    {command.attentionItems.length}{" "}
                    {command.attentionItems.length === 1 ? "item" : "items"}
                  </Text>
                )}
              />
              <View style={{ paddingHorizontal: 22, paddingBottom: 28 }}>
                <OverviewSurfaceCard overflowHidden>
                  {command.attentionItems.map((item, index) => (
                    <AttentionRow
                      key={`${item.label}-${index}`}
                      item={item}
                      showBorder={index > 0}
                    />
                  ))}
                </OverviewSurfaceCard>
              </View>
            </>
          ) : null}

          {/* ITINERARY ───────────────────────────────────────── */}
          <OverviewSectionHeading
            label="ITINERARY"
            trailing={
              previewDays.length > 0 ? (
                <Pressable onPress={() => onOpenTab("itinerary")} hitSlop={8}>
                  <Text style={[fontStyles.uiMedium, { fontSize: 12, color: "#B85A38" }]}>
                    Open itinerary ›
                  </Text>
                </Pressable>
              ) : undefined
            }
          />
          <View style={{ paddingHorizontal: 22, paddingBottom: 28 }}>
            <OverviewSurfaceCard paddingVertical={4}>
              {overview.isItineraryLoading && !overview.isStreaming ? (
                <ActivityIndicator style={{ paddingVertical: 24 }} />
              ) : overview.isStreaming ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                  }}
                >
                  <ActivityIndicator size="small" color="#B85A38" />
                  <Text style={[fontStyles.uiRegular, { fontSize: 13, color: "#8A7B6A" }]}>
                    Generating itinerary…
                  </Text>
                </View>
              ) : overview.isItineraryMissing ? (
                <View style={{ gap: 12, paddingHorizontal: 18, paddingVertical: 20 }}>
                  <Text style={[fontStyles.uiRegular, { fontSize: 13, lineHeight: 20, color: "#8A7B6A" }]}>
                    No itinerary saved yet. Generate one to start planning day-by-day.
                  </Text>
                  {!isReadOnly ? (
                    <Pressable
                      onPress={onStartStream}
                      className="self-start active:opacity-75"
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: "#B85A38",
                      }}
                    >
                      <Text style={[fontStyles.uiSemibold, { fontSize: 13, color: "#F2EBDD" }]}>
                        Generate with AI
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : previewDays.length > 0 ? (
                previewDays.map((day, index) => (
                  <OverviewItineraryPreviewRow
                    key={`${day.dayNumber}-${day.dayTitle}-${index}`}
                    preview={day}
                    showBorder={index > 0}
                    onPress={() => onOpenTab("itinerary")}
                  />
                ))
              ) : (
                <View style={{ paddingHorizontal: 18, paddingVertical: 20 }}>
                  <Text style={[fontStyles.uiRegular, { fontSize: 13, lineHeight: 20, color: "#8A7B6A" }]}>
                    No itinerary days available yet.
                  </Text>
                </View>
              )}
            </OverviewSurfaceCard>
          </View>

          {/* TRIP BASICS ─────────────────────────────────────── */}
          <OverviewSectionHeading label="TRIP BASICS" />
          <TripBasicsGrid trip={trip} />

          {shouldShowActivitySection ? (
            <>
              <OverviewSectionHeading label="RECENT ACTIVITY" />
              <ActivityStrip
                items={activityModel.items}
                unseenCount={activityModel.unseenCount}
                errorMessage={activityError}
                onPress={() => setActivitySheetOpen(true)}
              />
            </>
          ) : null}
        </ScrollView>
      )}

      {/* Sheets — always rendered so state persists across tab switches */}
      {overview.itinerary ? (
        <>
          <StopFormSheet
            visible={!isReadOnly && Boolean(overview.editingStop)}
            item={overview.selectedStop}
            initialDayIndex={overview.editingStop?.dayIndex ?? 0}
            dayOptions={overview.dayOptions}
            timeOptions={overview.timeOptions}
            moveAvailability={overview.stopMoveAvailability}
            onSave={overview.handleSaveStop}
            onDelete={overview.handleDeleteStop}
            onMoveUp={overview.handleMoveStopUp}
            onMoveDown={overview.handleMoveStopDown}
            onMoveToPreviousDay={overview.handleMoveStopToPreviousDay}
            onMoveToNextDay={overview.handleMoveStopToNextDay}
            onClose={() => overview.setEditingStop(null)}
          />
          <RegenerateSheet
            visible={!isReadOnly && overview.regeneratingDayIndex !== null}
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
          <RethinkDaySheet
            visible={!isReadOnly && overview.rethinkingDayIndex !== null}
            tripId={trip.id}
            day={
              overview.rethinkingDayIndex !== null
                ? (overview.itinerary.days[overview.rethinkingDayIndex] ?? null)
                : null
            }
            currentItinerary={overview.itinerary}
            onAccept={overview.handleAcceptRethink}
            onClose={() => overview.setRethinkingDayIndex(null)}
          />
        </>
      ) : null}
      {showActivity ? (
        <ActivitySheet
          visible={activitySheetOpen}
          items={activityModel.items}
          errorMessage={activityError}
          onClose={handleCloseActivitySheet}
        />
      ) : null}
    </View>
  );
}

function OverviewSectionHeading({
  label,
  topPadding = 0,
  accent = false,
  trailing,
}: {
  label: string;
  topPadding?: number;
  accent?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        paddingHorizontal: 22,
        paddingTop: topPadding,
        paddingBottom: 8,
      }}
    >
      <Text
        style={[
          textScaleStyles.caption,
          { color: accent ? "#B85A38" : "#8A7B6A", letterSpacing: 2.2, fontSize: 9.5 },
        ]}
      >
        {label}
      </Text>
      {trailing}
    </View>
  );
}

function OverviewSurfaceCard({
  children,
  overflowHidden = false,
  paddingVertical = 0,
}: {
  children: ReactNode;
  overflowHidden?: boolean;
  paddingVertical?: number;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: "#FAF5EA",
        borderWidth: 1,
        borderColor: "rgba(35,25,16,0.10)",
        overflow: overflowHidden ? "hidden" : "visible",
        paddingVertical,
      }}
    >
      {children}
    </View>
  );
}

export function OverviewItineraryPreviewRow({
  preview,
  showBorder,
  onPress,
}: {
  preview: OverviewItineraryDayPreview;
  showBorder: boolean;
  onPress: () => void;
}) {
  const stopPreview = preview.stopPreviewLine?.trim() ?? "";
  const a11ySummary = [preview.dayTitle, stopPreview]
    .filter(Boolean)
    .join(". ")
    .slice(0, 200);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11ySummary ? `View itinerary: ${a11ySummary}` : `View ${preview.dayTitle}`}
      className="active:opacity-75"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 18,
        paddingVertical: 14,
        gap: 16,
        borderTopWidth: showBorder ? 1 : 0,
        borderTopColor: "rgba(35,25,16,0.10)",
      }}
    >
      {/* Day title + stop preview */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[fontStyles.uiMedium, { fontSize: 14, color: "#231910", lineHeight: 19 }]}
          numberOfLines={2}
        >
          {preview.dayTitle}
        </Text>
        {preview.dateLabel ? (
          <Text
            style={[fontStyles.monoRegular, { fontSize: 9, color: "#8A7B6A", letterSpacing: 1.5, marginTop: 3 }]}
          >
            {preview.dateLabel.toUpperCase()}
          </Text>
        ) : null}
        {stopPreview ? (
          <Text
            style={[fontStyles.uiRegular, { fontSize: 12.5, lineHeight: 18, color: "#8A7B6A", marginTop: 4 }]}
            numberOfLines={3}
          >
            {stopPreview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function AttentionRow({ item, showBorder }: { item: WorkspaceAttentionItem; showBorder: boolean }) {
  const isError = item.variant === "warning" || item.variant === "error";
  const iconChar = isError ? "!" : item.variant === "info" ? "i" : "?";
  const iconColor = isError ? "#B85A38" : "#8A7B6A";
  const badgeBorder = isError ? "rgba(184,90,56,0.33)" : "rgba(138,123,106,0.33)";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 14,
        gap: 14,
        borderTopWidth: showBorder ? 1 : 0,
        borderTopColor: "rgba(35,25,16,0.10)",
      }}
    >
      {/* Circular badge with italic Cormorant icon character */}
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: badgeBorder,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Text style={[fontStyles.headMediumItalic, { fontSize: 13, color: iconColor, lineHeight: 16 }]}>
          {iconChar}
        </Text>
      </View>

      {/* Label + detail */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[fontStyles.uiSemibold, { fontSize: 14, color: "#231910", lineHeight: 18 }]}>
          {item.label}
        </Text>
        <Text style={[fontStyles.uiRegular, { fontSize: 12, color: "#8A7B6A", marginTop: 2 }]}>
          {item.detail}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} color="#8A7B6A" />
    </View>
  );
}

function TripBasicsGrid({ trip }: { trip: TripWorkspaceViewModel }) {
  const topRow = [
    { label: "Dates", value: trip.dateRange },
    { label: "Travelers", value: `${trip.memberCount} ${trip.memberCount === 1 ? "traveler" : "travelers"}` },
  ];
  const bottomRow = [
    { label: "Destination", value: trip.destination },
    { label: "Duration", value: `${trip.durationDays} ${trip.durationDays === 1 ? "day" : "days"}` },
  ];

  return (
    <View
      style={{
        marginHorizontal: 22,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: "rgba(35,25,16,0.10)",
      }}
    >
      <View style={{ flexDirection: "row" }}>
        <View
          style={{
            flex: 1,
            paddingVertical: 16,
            paddingRight: 4,
            borderRightWidth: 1,
            borderRightColor: "rgba(35,25,16,0.10)",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(35,25,16,0.10)",
          }}
        >
          <BasicsCell cell={topRow[0]} />
        </View>
        <View
          style={{
            flex: 1,
            paddingVertical: 16,
            paddingLeft: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(35,25,16,0.10)",
          }}
        >
          <BasicsCell cell={topRow[1]} />
        </View>
      </View>
      <View style={{ flexDirection: "row" }}>
        <View
          style={{
            flex: 1,
            paddingVertical: 16,
            paddingRight: 4,
            borderRightWidth: 1,
            borderRightColor: "rgba(35,25,16,0.10)",
          }}
        >
          <BasicsCell cell={bottomRow[0]} />
        </View>
        <View style={{ flex: 1, paddingVertical: 16, paddingLeft: 16 }}>
          <BasicsCell cell={bottomRow[1]} />
        </View>
      </View>
    </View>
  );
}

function BasicsCell({ cell }: { cell: { label: string; value: string } }) {
  return (
    <>
      <Text
        style={[fontStyles.monoRegular, { fontSize: 9, color: "#8A7B6A", letterSpacing: 1.8, marginBottom: 6 }]}
      >
        {cell.label.toUpperCase()}
      </Text>
      <Text
        style={[fontStyles.headMedium, { fontSize: 17, color: "#231910", letterSpacing: -0.2, lineHeight: 20 }]}
        numberOfLines={1}
      >
        {cell.value}
      </Text>
    </>
  );
}
