import { apiRequest } from "@/shared/api/client";
import { importReservationConfirmation } from "@/features/trips/reservations/api";

jest.mock("@/shared/api/client", () => ({
  apiRequest: jest.fn(),
}));

describe("importReservationConfirmation", () => {
  it("posts multipart form data with file field", async () => {
    const append = jest.fn();
    const FormDataMock = jest.fn(() => ({ append }));
    (global as unknown as { FormData: unknown }).FormData = FormDataMock;

    (apiRequest as jest.Mock).mockResolvedValue({
      status: "unsupported_file",
      source_type: "unknown",
      fields: {},
      confidence: null,
      message: null,
    });

    await importReservationConfirmation(12, {
      uri: "file:///tmp/booking.pdf",
      name: "booking.pdf",
      type: "application/pdf",
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    const [path, options] = (apiRequest as jest.Mock).mock.calls[0] as [
      string,
      { method: string; body: FormData },
    ];
    expect(path).toBe("/v1/trips/12/reservations/import");
    expect(options.method).toBe("POST");
    expect(FormDataMock).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(
      "file",
      expect.objectContaining({
        uri: "file:///tmp/booking.pdf",
        name: "booking.pdf",
      }),
    );
  });
});
