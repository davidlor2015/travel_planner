import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MatchRequestCard } from "./MatchRequestCard";
import { formatShortDate } from "./adapters";
import { fontStyles } from "@/shared/theme/typography";
import type { MatchRequest } from "./api";
import type { TripResponse } from "../trips/types";

type Props = {
  requests: MatchRequest[];
  tripsById: Map<number, TripResponse>;
  eligibleTrips: TripResponse[];
  selectedTripId: number | null;
  onSelectTrip: (tripId: number | null) => void;
  onOpenRequest: (tripId: number) => Promise<void>;
  onCloseRequest: (requestId: number) => void;
  openRequestCount: number;
  closedRequestCount: number;
  isOpeningRequest: boolean;
  isClosingRequest: boolean;
  openRequestError: string | null;
};

function CountBadge({
  label,
  tone,
}: {
  label: string;
  tone: "olive" | "neutral";
}) {
  const className =
    tone === "olive"
      ? "border-olive/20 bg-olive/10 text-olive"
      : "border-smoke bg-parchment text-flint";

  return (
    <View className={`rounded-full border px-3 py-1.5 ${className}`}>
      <Text style={fontStyles.uiSemibold} className="text-[11px]">
        {label}
      </Text>
    </View>
  );
}

function TripOption({
  trip,
  selected,
  onPress,
}: {
  trip: TripResponse;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${trip.title}, ${trip.destination}`}
      className="active:opacity-70"
    >
      <View
        className={[
          "rounded-[16px] border px-4 py-3",
          selected ? "border-amber bg-amber/10" : "border-smoke bg-white",
        ].join(" ")}
      >
        <View className="flex-row items-start gap-3">
          <View
            className={[
              "mt-1 h-3 w-3 rounded-full border",
              selected ? "border-amber bg-amber" : "border-warm-light bg-white",
            ].join(" ")}
          />
          <View className="flex-1 gap-0.5">
            <Text
              style={fontStyles.uiSemibold}
              className="text-[14px] text-espresso"
              numberOfLines={1}
            >
              {trip.title}
            </Text>
            <Text
              style={fontStyles.uiRegular}
              className="text-[13px] text-muted"
              numberOfLines={1}
            >
              {trip.destination}
            </Text>
            <Text style={fontStyles.uiMedium} className="text-[11px] text-flint">
              {formatShortDate(trip.start_date)} to {formatShortDate(trip.end_date)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyRequests({ hasTrips }: { hasTrips: boolean }) {
  return (
    <View className="items-center rounded-[20px] border border-dashed border-smoke bg-parchment/50 px-5 py-8">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full border border-smoke bg-white">
        <Ionicons name="people-outline" size={22} color="#B86845" />
      </View>
      <Text style={fontStyles.uiSemibold} className="text-center text-[15px] text-espresso">
        No match requests yet
      </Text>
      <Text style={fontStyles.uiRegular} className="mt-1 text-center text-[13px] leading-5 text-muted">
        {hasTrips
          ? "Open a trip request to start comparing compatible travelers."
          : "Create a trip first. Companion matching needs real destination and date context."}
      </Text>
    </View>
  );
}

export function MatchList({
  requests,
  tripsById,
  eligibleTrips,
  selectedTripId,
  onSelectTrip,
  onOpenRequest,
  onCloseRequest,
  openRequestCount,
  closedRequestCount,
  isOpeningRequest,
  isClosingRequest,
  openRequestError,
}: Props) {
  const selectedTrip = selectedTripId
    ? eligibleTrips.find((trip) => trip.id === selectedTripId)
    : undefined;
  const hasTrips = tripsById.size > 0;

  return (
    <View className="gap-5">
      <View className="rounded-[22px] border border-smoke bg-white px-4 py-4">
        <View className="gap-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text style={fontStyles.uiSemibold} className="text-[17px] text-espresso">
                Open a request
              </Text>
              <Text style={fontStyles.uiRegular} className="text-[13px] leading-5 text-muted">
                Pick one of your upcoming trips. Matching stays anchored to that real itinerary.
              </Text>
            </View>
            <View className="items-end gap-1.5">
              <CountBadge label={`${openRequestCount} open`} tone="olive" />
              <CountBadge label={`${closedRequestCount} closed`} tone="neutral" />
            </View>
          </View>

          {eligibleTrips.length > 0 ? (
            <View className="gap-2">
              {eligibleTrips.map((trip) => (
                <TripOption
                  key={trip.id}
                  trip={trip}
                  selected={trip.id === selectedTripId}
                  onPress={() => onSelectTrip(trip.id === selectedTripId ? null : trip.id)}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-[16px] border border-smoke bg-parchment/70 px-4 py-4">
              <Text style={fontStyles.uiSemibold} className="text-[14px] text-espresso">
                {hasTrips ? "No eligible trips" : "Create a trip first"}
              </Text>
              <Text style={fontStyles.uiRegular} className="mt-1 text-[13px] leading-5 text-muted">
                {hasTrips
                  ? "Every upcoming trip already has an open request, or your trips have ended."
                  : "Requests need a trip destination and travel dates before matches can be scored."}
              </Text>
            </View>
          )}

          {openRequestError ? (
            <View className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3">
              <Text style={fontStyles.uiMedium} className="text-[13px] text-red-600">
                {openRequestError}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              if (selectedTrip) void onOpenRequest(selectedTrip.id);
            }}
            disabled={!selectedTrip || isOpeningRequest}
            accessibilityRole="button"
            accessibilityLabel="Find travel companions"
            className="active:opacity-70"
          >
            <View
              className={[
                "flex-row items-center justify-center gap-2 rounded-full bg-amber px-5 py-3.5",
                !selectedTrip || isOpeningRequest ? "opacity-50" : "",
              ].join(" ")}
            >
              <Ionicons name="search-outline" size={16} color="#FFFFFF" />
              <Text style={fontStyles.uiSemibold} className="text-[14px] text-white">
                {isOpeningRequest ? "Finding…" : "Find Travel Companions"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text style={fontStyles.uiSemibold} className="text-[16px] text-espresso">
            Your match requests
          </Text>
          <Text style={fontStyles.uiMedium} className="text-[12px] text-muted">
            {requests.length} {requests.length === 1 ? "request" : "requests"}
          </Text>
        </View>

        {requests.length > 0 ? (
          <View className="gap-3">
            {requests.map((request) => (
              <MatchRequestCard
                key={request.id}
                request={request}
                trip={tripsById.get(request.trip_id)}
                onClose={onCloseRequest}
                isClosing={isClosingRequest}
              />
            ))}
          </View>
        ) : (
          <EmptyRequests hasTrips={hasTrips} />
        )}
      </View>
    </View>
  );
}
