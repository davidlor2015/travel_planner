import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { BookingsTab } from "@/features/trips/workspace/BookingsTab";

const mockUseReservations = jest.fn();
const mockImportReservationConfirmation = jest.fn();
const mockGetDocumentAsync = jest.fn();
const mockAddReservation = jest.fn();
const mockBookingFormSheet = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock("@/features/trips/reservations/hooks", () => ({
  useReservations: (...args: unknown[]) => mockUseReservations(...args),
}));

jest.mock("@/features/trips/reservations/BookingFormSheet", () => ({
  BookingFormSheet: (props: unknown) => {
    mockBookingFormSheet(props);
    const { Text } = jest.requireActual("react-native");
    return <Text />;
  },
}));

jest.mock("@/features/trips/reservations/api", () => {
  const actual = jest.requireActual("@/features/trips/reservations/api");
  return {
    ...actual,
    importReservationConfirmation: (...args: unknown[]) =>
      mockImportReservationConfirmation(...args),
  };
});

function baseReservationsState() {
  return {
    loading: false,
    error: null,
    items: [],
    addReservation: mockAddReservation,
    editReservation: jest.fn(),
    removeReservation: jest.fn(),
    reload: jest.fn(),
  };
}

describe("BookingsTab import flow", () => {
  beforeEach(() => {
    mockAddReservation.mockReset();
    mockBookingFormSheet.mockReset();
    mockGetDocumentAsync.mockReset();
    mockImportReservationConfirmation.mockReset();
    mockUseReservations.mockReturnValue(baseReservationsState());
  });

  it("opens pre-filled form for extracted status and does not create until save", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///a.pdf", name: "a.pdf", mimeType: "application/pdf" }],
    });
    mockImportReservationConfirmation.mockResolvedValue({
      status: "extracted",
      source_type: "pdf",
      confidence: "high",
      message: null,
      fields: {
        type: "lodging",
        vendor: "Hotel Kanra Kyoto",
        confirmation_number: "ABC123",
        start_date: null,
        end_date: null,
        start_time: null,
        end_time: null,
        location_name: "Kyoto",
        address: "Kyoto Address",
        traveler_names: ["Alex Traveler"],
        price_total: "240.50",
        notes: "Late check-in",
      },
    });

    const { getByLabelText } = render(<BookingsTab tripId={7} />);
    fireEvent.press(getByLabelText("Add booking"));
    fireEvent.press(getByLabelText("Upload confirmation"));
    await waitFor(() => {
      expect(mockImportReservationConfirmation).toHaveBeenCalledTimes(1);
    });
    expect(
      mockBookingFormSheet.mock.calls.some(([props]) =>
        Boolean(
          (props as { visible?: boolean }).visible &&
            (props as { helperText?: string }).helperText === "We found these details. Review before saving." &&
            (props as { initialValues?: { title?: string } }).initialValues?.title === "Hotel Kanra Kyoto",
        ),
      ),
    ).toBe(true);
    expect(mockAddReservation).not.toHaveBeenCalled();
  }, 20000);

  it("shows scanned/image fallback and keeps manual entry available", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///scan.pdf", name: "scan.pdf", mimeType: "application/pdf" }],
    });
    mockImportReservationConfirmation.mockResolvedValue({
      status: "needs_image_extraction",
      source_type: "pdf",
      confidence: null,
      message: null,
      fields: {},
    });

    const { getByLabelText, getByText } = render(<BookingsTab tripId={7} />);
    fireEvent.press(getByLabelText("Add booking"));
    fireEvent.press(getByLabelText("Upload confirmation"));

    await waitFor(() => {
      expect(
        getByText("We could not read this file yet. You can upload another PDF or type it in manually."),
      ).toBeTruthy();
    });
    expect(getByLabelText("Type it in manually")).toBeTruthy();
  });

  it("shows manual fallback and keeps manual entry available", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///bad.pdf", name: "bad.pdf", mimeType: "application/pdf" }],
    });
    mockImportReservationConfirmation.mockResolvedValue({
      status: "needs_manual_entry",
      source_type: "pdf",
      confidence: null,
      message: null,
      fields: {},
    });

    const { getByLabelText, getByText } = render(<BookingsTab tripId={7} />);
    fireEvent.press(getByLabelText("Add booking"));
    fireEvent.press(getByLabelText("Upload confirmation"));

    await waitFor(() => {
      expect(getByText("We could not extract the booking details. You can type them in manually.")).toBeTruthy();
    });
    expect(getByLabelText("Type it in manually")).toBeTruthy();
  });

  it("shows unsupported file copy", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///x.zip", name: "x.zip", mimeType: "application/zip" }],
    });
    mockImportReservationConfirmation.mockResolvedValue({
      status: "unsupported_file",
      source_type: "unknown",
      confidence: null,
      message: null,
      fields: {},
    });

    const { getByLabelText, getByText } = render(<BookingsTab tripId={7} />);
    fireEvent.press(getByLabelText("Add booking"));
    fireEvent.press(getByLabelText("Upload confirmation"));

    await waitFor(() => {
      expect(getByText("This file type is not supported. Try uploading a PDF confirmation.")).toBeTruthy();
    });
  });

  it("manual entry opens a blank form", () => {
    const { getByLabelText } = render(<BookingsTab tripId={7} />);

    fireEvent.press(getByLabelText("Add booking"));
    fireEvent.press(getByLabelText("Type it in manually"));
    expect(
      mockBookingFormSheet.mock.calls.some(([props]) =>
        Boolean((props as { visible?: boolean; initialValues?: unknown }).visible && !(props as { initialValues?: unknown }).initialValues),
      ),
    ).toBe(true);
  });
});
