import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatShortDate } from "./adapters";
import { MatchResultsPanel } from "./MatchResultsPanel";
import { fontStyles } from "@/shared/theme/typography";
import type { MatchRequest } from "./api";
import type { TripResponse } from "../trips/types";

type Props = {
  request: MatchRequest;
  trip?: TripResponse;
  onClose: (requestId: number) => void;
  isClosing: boolean;
};

export function MatchRequestCard({ request, trip, onClose, isClosing }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = request.status === "open";

  return (
    <View className="rounded-[22px] border border-smoke bg-white overflow-hidden">
      {/* Card header */}
      <View className="px-4 pt-4 pb-3 gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text
              style={fontStyles.uiSemibold}
              className="text-[16px] text-espresso"
              numberOfLines={1}
            >
              {trip?.destination ?? `Trip #${request.trip_id}`}
            </Text>
            {trip ? (
              <Text style={fontStyles.uiRegular} className="text-[13px] text-muted">
                {formatShortDate(trip.start_date)} – {formatShortDate(trip.end_date)}
              </Text>
            ) : null}
          </View>

          <View
            className={[
              "rounded-full border px-2.5 py-1",
              isOpen
                ? "border-green-200 bg-green-50"
                : "border-smoke bg-parchment",
            ].join(" ")}
          >
            <Text
              style={fontStyles.uiSemibold}
              className={["text-[11px]", isOpen ? "text-green-700" : "text-flint"].join(" ")}
            >
              {isOpen ? "Open" : "Closed"}
            </Text>
          </View>
        </View>

        {/* Action row */}
        <View className="flex-row gap-2 pt-1">
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Hide matches" : "View matches"}
            className="flex-1 active:opacity-60"
          >
            <View className="flex-row items-center justify-center gap-1.5 rounded-full border border-smoke bg-parchment py-2.5">
              <Text style={fontStyles.uiSemibold} className="text-[13px] text-espresso">
                {expanded ? "Hide matches" : "View matches"}
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={13}
                color="#6B5E52"
              />
            </View>
          </Pressable>

          {isOpen ? (
            <Pressable
              onPress={() => onClose(request.id)}
              disabled={isClosing}
              accessibilityRole="button"
              accessibilityLabel="Close request"
              className="flex-1 active:opacity-60"
            >
              <View
                className={[
                  "flex-row items-center justify-center rounded-full border border-red-200 bg-red-50 py-2.5",
                  isClosing ? "opacity-50" : "",
                ].join(" ")}
              >
                <Text style={fontStyles.uiSemibold} className="text-[13px] text-red-600">
                  {isClosing ? "Closing…" : "Close"}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Expanded matches */}
      {expanded ? (
        <View className="border-t border-smoke/60 px-4 py-4">
          <MatchResultsPanel requestId={request.id} />
        </View>
      ) : null}
    </View>
  );
}
