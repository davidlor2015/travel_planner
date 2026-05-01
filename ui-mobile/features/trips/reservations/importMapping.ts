import type {
  ReservationImportFields,
  ReservationPayload,
  ReservationType,
} from "./api";

function mapImportType(type: ReservationImportFields["type"]): ReservationType {
  if (type === "flight") return "flight";
  if (type === "lodging") return "hotel";
  if (type === "restaurant") return "restaurant";
  if (type === "activity") return "activity";
  return "other";
}

export function mapImportFieldsToReservationPayload(
  fields: ReservationImportFields,
): ReservationPayload {
  const location = fields.address ?? fields.location_name ?? undefined;
  const travelerNames = fields.traveler_names?.filter(Boolean).join(", ");
  const notesParts = [fields.notes, travelerNames ? `Travelers: ${travelerNames}` : null].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  const titleSource = fields.vendor ?? fields.location_name ?? "Booking";
  const parsedAmount = fields.price_total ? Number.parseFloat(fields.price_total.replace(/[^0-9.-]/g, "")) : NaN;

  return {
    title: titleSource,
    reservation_type: mapImportType(fields.type),
    provider: fields.vendor ?? undefined,
    confirmation_code: fields.confirmation_number ?? undefined,
    location,
    notes: notesParts.length > 0 ? notesParts.join("\n") : undefined,
    amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
  };
}
