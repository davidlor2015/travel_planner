// Path: ui-mobile/features/trips/workspace/OverviewTab.tsx
// Summary: Implements OverviewTab module logic.

import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import type { StreamState } from "@/features/ai/useStreamingItinerary";
import type { TripOnTripSnapshot } from "../types";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

import type {
  TripSummaryViewModel,
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import { ItineraryTabView } from "./ItineraryTabView";
import { RegenerateSheet } from "./RegenerateSheet";
import { StopFormSheet } from "./StopFormSheet";
import { useWorkspaceOverviewModel } from "./useWorkspaceOverviewModel";
import type { WorkspaceAttentionItem } from "./workspaceCommandModel";
import type { OverviewItineraryDayPreview } from "./overviewItineraryPreview";
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

  const nextActionPill = overview.isStreaming
    ? "Building…"
    : overview.isItineraryDirty
      ? "Unsaved edits"
      : overview.isItineraryMissing
        ? "No plan yet"
        : null;

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
          onAddDay={overview.handleAddDay}
          onPublish={() => void overview.handlePublishChanges()}
          onRegenerateAll={onStartStream}
          onCancelStream={onCancelStream}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* NEXT ACTION ─────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 8 }}>
            <Text style={[textScaleStyles.caption, { color: "#B85A38", letterSpacing: 2.2, fontSize: 9.5 }]}>
              NEXT ACTION
            </Text>
          </View>
          <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
            <View
              style={{
                padding: 20,
                borderRadius: 16,
                backgroundColor: "#FAF5EA",
                borderWidth: 1,
                borderColor: "rgba(35,25,16,0.10)",
              }}
            >
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

              {/* Buttons */}
              {primaryLabel || ghostLabel ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {primaryLabel && primaryHandler ? (
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
          </View>

          {/* NEEDS ATTENTION ─────────────────────────────────── */}
          {command.attentionItems.length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  paddingHorizontal: 22,
                  paddingBottom: 8,
                }}
              >
                <Text style={[textScaleStyles.caption, { color: "#8A7B6A", letterSpacing: 2.2, fontSize: 9.5 }]}>
                  NEEDS ATTENTION
                </Text>
                <Text style={[fontStyles.uiMedium, { fontSize: 12, color: "#B85A38" }]}>
                  {command.attentionItems.length}{" "}
                  {command.attentionItems.length === 1 ? "item" : "items"}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 22, paddingBottom: 28 }}>
                <View
                  style={{
                    borderRadius: 16,
                    backgroundColor: "#FAF5EA",
                    borderWidth: 1,
                    borderColor: "rgba(35,25,16,0.10)",
                    overflow: "hidden",
                  }}
                >
                  {command.attentionItems.map((item, index) => (
                    <AttentionRow
                      key={`${item.label}-${index}`}
                      item={item}
                      showBorder={index > 0}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {/* ITINERARY ───────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingHorizontal: 22,
              paddingBottom: 8,
            }}
          >
            <Text style={[textScaleStyles.caption, { color: "#8A7B6A", letterSpacing: 2.2, fontSize: 9.5 }]}>
              ITINERARY
            </Text>
            {previewDays.length > 0 ? (
              <Pressable onPress={() => onOpenTab("itinerary")} hitSlop={8}>
                <Text style={[fontStyles.uiMedium, { fontSize: 12, color: "#B85A38" }]}>
                  Open itinerary ›
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ paddingHorizontal: 22, paddingBottom: 28 }}>
            <View
              style={{
                borderRadius: 16,
                backgroundColor: "#FAF5EA",
                borderWidth: 1,
                borderColor: "rgba(35,25,16,0.10)",
                paddingVertical: 4,
              }}
            >
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
            </View>
          </View>

          {/* TRIP BASICS ─────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 22, paddingBottom: 8 }}>
            <Text style={[textScaleStyles.caption, { color: "#8A7B6A", letterSpacing: 2.2, fontSize: 9.5 }]}>
              TRIP BASICS
            </Text>
          </View>
          <TripBasicsGrid trip={trip} />
        </ScrollView>
      )}

      {/* Sheets — always rendered so state persists across tab switches */}
      {overview.itinerary ? (
        <>
          <StopFormSheet
            visible={Boolean(overview.editingStop)}
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
