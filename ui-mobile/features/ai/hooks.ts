import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyItinerary,
  getSavedItinerary,
  refineItinerary,
  type ApplySource,
  type Itinerary,
  type ItineraryItemReference,
  type RefinementTimeBlock,
  type RefinementVariant,
} from "./api";

const aiKeys = {
  savedItinerary: (tripId: number) => ["ai", "itinerary", tripId] as const,
};

export function useSavedItineraryQuery(
  tripId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: aiKeys.savedItinerary(tripId as number),
    queryFn: () => getSavedItinerary(tripId as number),
    enabled: (options?.enabled ?? true) && typeof tripId === "number",
    retry: false,
  });
}

export function useApplyItineraryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tripId,
      itinerary,
      source,
    }: {
      tripId: number;
      itinerary: Itinerary;
      source?: ApplySource;
    }) => applyItinerary(tripId, itinerary, source),
    onSuccess: (_data, { tripId, itinerary }) => {
      queryClient.setQueryData(aiKeys.savedItinerary(tripId), itinerary);
    },
  });
}

export function useRefineItineraryMutation() {
  return useMutation({
    mutationFn: ({
      tripId,
      payload,
      signal,
    }: {
      tripId: number;
      payload: {
        current_itinerary: Itinerary;
        locked_items: ItineraryItemReference[];
        favorite_items: ItineraryItemReference[];
        regenerate_day_number: number;
        regenerate_time_block?: RefinementTimeBlock;
        variant?: RefinementVariant;
      };
      signal?: AbortSignal;
    }) => refineItinerary(tripId, payload, signal),
  });
}
