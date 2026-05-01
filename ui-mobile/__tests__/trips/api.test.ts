import {
  acceptPendingTripInvite,
  declinePendingTripInvite,
  getPendingTripInvites,
  searchPlaces,
} from "@/features/trips/api";
import { apiRequest } from "@/shared/api/client";

jest.mock("@/shared/api/client", () => ({
  apiFetch: jest.fn(),
  apiRequest: jest.fn(),
}));

const mockApiRequest = jest.mocked(apiRequest);

describe("trips api", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("searchPlaces calls the destination search endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce([]);

    await searchPlaces(" italy ");

    expect(mockApiRequest).toHaveBeenCalledWith("/v1/destinations/search?q=italy");
  });

  it("searchPlaces skips blank queries", async () => {
    const result = await searchPlaces("   ");

    expect(result).toEqual({ suggestions: [] });
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("getPendingTripInvites calls the pending invite endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce([]);

    await getPendingTripInvites();

    expect(mockApiRequest).toHaveBeenCalledWith("/v1/trip-invites/pending");
  });

  it("acceptPendingTripInvite calls the in-app accept endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({ trip_id: 7, trip_title: "Lisbon", status: "accepted" });

    await acceptPendingTripInvite(42);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/v1/trip-invites/pending/42/accept",
      { method: "POST" },
    );
  });

  it("declinePendingTripInvite calls the in-app decline endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({ trip_id: 7, trip_title: "Lisbon", status: "declined" });

    await declinePendingTripInvite(42);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/v1/trip-invites/pending/42/decline",
      { method: "POST" },
    );
  });
});
