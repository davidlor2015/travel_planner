import { searchPlaces } from "@/features/trips/api";
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
});
