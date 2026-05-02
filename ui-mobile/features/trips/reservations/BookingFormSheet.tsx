import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { DateRangePickerSheet } from "@/features/trips/DateRangePickerSheet";
import type { Reservation, ReservationPayload, ReservationType } from "./api";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import { Button, SecondaryButton } from "@/shared/ui/Button";

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab =
  | "flight"
  | "lodging"
  | "restaurant"
  | "activity"
  | "transport"
  | "other";
type TransportSubType = "train" | "bus" | "car";

const TABS: { key: Tab; label: string }[] = [
  { key: "flight", label: "Flight" },
  { key: "lodging", label: "Lodging" },
  { key: "restaurant", label: "Dining" },
  { key: "activity", label: "Activity" },
  { key: "transport", label: "Transport" },
  { key: "other", label: "Other" },
];

const TRANSPORT_SUBTYPES: { key: TransportSubType; label: string }[] = [
  { key: "train", label: "Train" },
  { key: "bus", label: "Bus" },
  { key: "car", label: "Car / Rental" },
];

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  confirmationCode: string;
  notes: string;
  amount: string;
  // flight
  airline: string;
  flightNumber: string;
  depDate: string;
  depTime: string;
  depAirport: string;
  depGate: string;
  arrDate: string;
  arrTime: string;
  arrAirport: string;
  seatNumber: string;
  // lodging
  hotelName: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  hotelAddress: string;
  roomUnit: string;
  guests: string;
  // restaurant
  restaurantName: string;
  diningDate: string;
  diningTime: string;
  restaurantAddress: string;
  partySize: string;
  nameOnReservation: string;
  // activity
  activityName: string;
  activityDate: string;
  activityStartTime: string;
  activityEndTime: string;
  activityLocation: string;
  ticketsGuests: string;
  activityProvider: string;
  // transport
  transportProvider: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffDate: string;
  dropoffTime: string;
  dropoffLocation: string;
  vehicleSeatRoute: string;
  // other
  bookingTitle: string;
  otherDate: string;
  otherTime: string;
  otherLocation: string;
  otherProvider: string;
};

const EMPTY_FORM: FormState = {
  confirmationCode: "",
  notes: "",
  amount: "",
  airline: "",
  flightNumber: "",
  depDate: "",
  depTime: "",
  depAirport: "",
  depGate: "",
  arrDate: "",
  arrTime: "",
  arrAirport: "",
  seatNumber: "",
  hotelName: "",
  checkInDate: "",
  checkInTime: "",
  checkOutDate: "",
  checkOutTime: "",
  hotelAddress: "",
  roomUnit: "",
  guests: "",
  restaurantName: "",
  diningDate: "",
  diningTime: "",
  restaurantAddress: "",
  partySize: "",
  nameOnReservation: "",
  activityName: "",
  activityDate: "",
  activityStartTime: "",
  activityEndTime: "",
  activityLocation: "",
  ticketsGuests: "",
  activityProvider: "",
  transportProvider: "",
  pickupDate: "",
  pickupTime: "",
  pickupLocation: "",
  dropoffDate: "",
  dropoffTime: "",
  dropoffLocation: "",
  vehicleSeatRoute: "",
  bookingTitle: "",
  otherDate: "",
  otherTime: "",
  otherLocation: "",
  otherProvider: "",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function buildIso(dateStr: string, timeStr: string): string | undefined {
  const d = dateStr.trim();
  if (!d) return undefined;
  const parts = d.split("/");
  if (parts.length !== 3) return undefined;
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy || yyyy.length < 4) return undefined;
  const t = timeStr.trim() || "00:00";
  const candidate = new Date(
    `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${t}`,
  );
  if (Number.isNaN(candidate.getTime())) return undefined;
  return candidate.toISOString();
}

function displayDateToISO(value: string): string {
  const parts = value.trim().split("/");
  if (parts.length !== 3) return "";
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy) return "";
  return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function isoDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function parseDisplayDate(value: string): Date | null {
  const iso = displayDateToISO(value);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDateDisplay(value: string): string {
  const date = parseDisplayDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseTimeValue(value: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const date = new Date();
  date.setSeconds(0, 0);
  if (!match) {
    date.setMinutes(0);
    return date;
  }
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function formatTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatTimeDisplay(value: string): string {
  if (!value.trim()) return "";
  const parsed = parseTimeValue(value);
  return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isoToDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function isoToTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseAmount(s: string): number | undefined {
  const n = parseFloat(s.trim());
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// ─── Tab / type mapping ───────────────────────────────────────────────────────

function tabFromType(type: ReservationType): Tab {
  if (type === "flight") return "flight";
  if (type === "hotel") return "lodging";
  if (type === "restaurant") return "restaurant";
  if (type === "activity") return "activity";
  if (type === "train" || type === "bus" || type === "car") return "transport";
  return "other";
}

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildPayload(
  tab: Tab,
  subType: TransportSubType,
  form: FormState,
): ReservationPayload {
  const extraParts: string[] = [];
  const push = (label: string, val: string) => {
    if (val.trim()) extraParts.push(`${label}: ${val.trim()}`);
  };
  const finalNotes = (): string | undefined => {
    const base = form.notes.trim();
    if (base) extraParts.push(base);
    return extraParts.length > 0 ? extraParts.join("\n") : undefined;
  };
  const amt = parseAmount(form.amount);
  const code = form.confirmationCode.trim() || undefined;

  switch (tab) {
    case "flight": {
      push("Departure gate", form.depGate);
      push("Arrival", form.arrAirport);
      push("Seat", form.seatNumber);
      return {
        title: form.flightNumber.trim() || form.airline.trim() || "Flight",
        reservation_type: "flight",
        provider: form.airline.trim() || undefined,
        confirmation_code: code,
        start_at: buildIso(form.depDate, form.depTime),
        end_at: buildIso(form.arrDate, form.arrTime),
        location: form.depAirport.trim() || undefined,
        notes: finalNotes(),
        amount: amt,
      };
    }
    case "lodging": {
      push("Room/Unit", form.roomUnit);
      push("Guests", form.guests);
      return {
        title: form.hotelName.trim() || "Hotel stay",
        reservation_type: "hotel",
        confirmation_code: code,
        start_at: buildIso(form.checkInDate, form.checkInTime),
        end_at: buildIso(form.checkOutDate, form.checkOutTime),
        location: form.hotelAddress.trim() || undefined,
        notes: finalNotes(),
        amount: amt,
      };
    }
    case "restaurant": {
      push("Party size", form.partySize);
      push("Name on reservation", form.nameOnReservation);
      return {
        title: form.restaurantName.trim() || "Dining reservation",
        reservation_type: "restaurant",
        confirmation_code: code,
        start_at: buildIso(form.diningDate, form.diningTime),
        location: form.restaurantAddress.trim() || undefined,
        notes: finalNotes(),
        amount: amt,
      };
    }
    case "activity": {
      push("Tickets/Guests", form.ticketsGuests);
      return {
        title: form.activityName.trim() || "Activity",
        reservation_type: "activity",
        provider: form.activityProvider.trim() || undefined,
        confirmation_code: code,
        start_at: buildIso(form.activityDate, form.activityStartTime),
        end_at: form.activityEndTime.trim()
          ? buildIso(form.activityDate, form.activityEndTime)
          : undefined,
        location: form.activityLocation.trim() || undefined,
        notes: finalNotes(),
        amount: amt,
      };
    }
    case "transport": {
      push("Drop-off", form.dropoffLocation);
      push("Vehicle/Seat/Route", form.vehicleSeatRoute);
      return {
        title: form.transportProvider.trim() || "Transport",
        reservation_type: subType,
        confirmation_code: code,
        start_at: buildIso(form.pickupDate, form.pickupTime),
        end_at: buildIso(form.dropoffDate, form.dropoffTime),
        location: form.pickupLocation.trim() || undefined,
        notes: finalNotes(),
        amount: amt,
      };
    }
    case "other": {
      return {
        title: form.bookingTitle.trim() || "Booking",
        reservation_type: "other",
        provider: form.otherProvider.trim() || undefined,
        confirmation_code: code,
        start_at: buildIso(form.otherDate, form.otherTime),
        location: form.otherLocation.trim() || undefined,
        notes: form.notes.trim() || undefined,
        amount: amt,
      };
    }
  }
}

// ─── Hydrate form from initialValues ─────────────────────────────────────────

function hydrateForm(values: Reservation | ReservationPayload): {
  tab: Tab;
  subType: TransportSubType;
  form: FormState;
} {
  const type = values.reservation_type;
  const tab = tabFromType(type);
  const subType: TransportSubType =
    type === "train" || type === "bus" || type === "car" ? type : "train";
  const form: FormState = { ...EMPTY_FORM };

  form.confirmationCode = values.confirmation_code ?? "";
  form.notes = values.notes ?? "";
  form.amount = values.amount != null ? String(values.amount) : "";

  const depDate = isoToDate(values.start_at);
  const depTime = isoToTime(values.start_at);
  const endDate = isoToDate(values.end_at);
  const endTime = isoToTime(values.end_at);

  if (tab === "flight") {
    form.airline = values.provider ?? "";
    form.flightNumber = values.title;
    form.depDate = depDate;
    form.depTime = depTime;
    form.depAirport = values.location ?? "";
    form.arrDate = endDate;
    form.arrTime = endTime;
  } else if (tab === "lodging") {
    form.hotelName = values.title;
    form.checkInDate = depDate;
    form.checkInTime = depTime;
    form.checkOutDate = endDate;
    form.checkOutTime = endTime;
    form.hotelAddress = values.location ?? "";
  } else if (tab === "restaurant") {
    form.restaurantName = values.title;
    form.diningDate = depDate;
    form.diningTime = depTime;
    form.restaurantAddress = values.location ?? "";
  } else if (tab === "activity") {
    form.activityName = values.title;
    form.activityDate = depDate;
    form.activityStartTime = depTime;
    form.activityEndTime = endTime;
    form.activityLocation = values.location ?? "";
    form.activityProvider = values.provider ?? "";
  } else if (tab === "transport") {
    form.transportProvider = values.title;
    form.pickupDate = depDate;
    form.pickupTime = depTime;
    form.pickupLocation = values.location ?? "";
    form.dropoffDate = endDate;
    form.dropoffTime = endTime;
  } else {
    form.bookingTitle = values.title;
    form.otherDate = depDate;
    form.otherTime = depTime;
    form.otherLocation = values.location ?? "";
    form.otherProvider = values.provider ?? "";
  }

  return { tab, subType, form };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isFormValid(tab: Tab, form: FormState): boolean {
  switch (tab) {
    case "flight":
      return Boolean(form.airline.trim() || form.flightNumber.trim());
    case "lodging":
      return Boolean(form.hotelName.trim());
    case "restaurant":
      return Boolean(form.restaurantName.trim());
    case "activity":
      return Boolean(form.activityName.trim());
    case "transport":
      return Boolean(form.transportProvider.trim());
    case "other":
      return Boolean(form.bookingTitle.trim());
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type SetField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type DateRangeTarget = {
  startKey: keyof FormState;
  endKey?: keyof FormState;
  initialSelectionMode: "start" | "end";
};

type TimeTarget = {
  key: keyof FormState;
  label: string;
};

type PickerControls = {
  openDateRange: (target: DateRangeTarget) => void;
  openTime: (target: TimeTarget) => void;
};

type UnderlineFieldProps = {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  optional?: boolean;
  rightIcon?: "calendar" | "clock";
  multiline?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

function UnderlineField({
  label,
  placeholder,
  value,
  onChangeText,
  optional,
  rightIcon,
  multiline,
  keyboardType,
  autoCapitalize = "sentences",
}: UnderlineFieldProps) {
  return (
    <View style={fs.fieldWrapper}>
      {label ? (
        <Text style={[fontStyles.uiRegular, fs.fieldLabel]}>
          {label}
          {optional ? <Text style={fs.optLabel}> (optional)</Text> : null}
        </Text>
      ) : null}
      <View style={[fs.inputRow, multiline && { alignItems: "flex-start" }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={DE.muted}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[
            fontStyles.uiRegular,
            fs.inputText,
            multiline && fs.inputMultiline,
          ]}
        />
        {rightIcon ? (
          <Ionicons
            name={
              rightIcon === "calendar" ? "calendar-outline" : "time-outline"
            }
            size={16}
            color={DE.muted}
            style={{ marginLeft: 6, marginTop: multiline ? 6 : 0 }}
          />
        ) : null}
      </View>
      <View style={fs.underline} />
    </View>
  );
}

function PickerField({
  label,
  value,
  placeholder,
  optional,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  optional?: boolean;
  icon: "calendar" | "clock";
  onPress: () => void;
}) {
  const displayValue = icon === "calendar" ? formatDateDisplay(value) : formatTimeDisplay(value);

  return (
    <View style={fs.fieldWrapper}>
      <Text style={[fontStyles.uiRegular, fs.fieldLabel]}>
        {label}
        {optional ? <Text style={fs.optLabel}> (optional)</Text> : null}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${displayValue || placeholder}`}
        style={fs.inputRow}
      >
        <Text
          style={[
            fontStyles.uiRegular,
            fs.inputText,
            { color: value ? DE.ink : DE.muted },
          ]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>
        <Ionicons
          name={icon === "calendar" ? "calendar-outline" : "time-outline"}
          size={16}
          color={DE.muted}
          style={{ marginLeft: 6 }}
        />
      </Pressable>
      <View style={fs.underline} />
    </View>
  );
}

function SectionKicker({ label }: { label: string }) {
  return (
    <View style={fs.kickerWrapper}>
      <Text style={[fontStyles.monoMedium, fs.kickerText]}>{label}</Text>
      <View style={fs.kickerRule} />
    </View>
  );
}

function TwoCol({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <View style={fs.twoCol}>
      <View style={{ flex: 1 }}>{left}</View>
      <View style={{ flex: 1 }}>{right}</View>
    </View>
  );
}

// ─── Type-specific field groups ───────────────────────────────────────────────

function FlightFields({
  form,
  set,
  openDateRange,
  openTime,
}: { form: FormState; set: SetField } & PickerControls) {
  return (
    <>
      <SectionKicker label="AIRLINE DETAILS" />
      <UnderlineField
        label="Airline"
        placeholder="e.g. United Airlines"
        value={form.airline}
        onChangeText={(v) => set("airline", v)}
      />
      <TwoCol
        left={
          <UnderlineField
            label="Flight #"
            placeholder="e.g. UA 5583"
            value={form.flightNumber}
            onChangeText={(v) => set("flightNumber", v)}
            autoCapitalize="characters"
          />
        }
        right={
          <UnderlineField
            label="Confirmation #"
            placeholder="e.g. UA7X2Q9"
            value={form.confirmationCode}
            onChangeText={(v) => set("confirmationCode", v)}
            optional
            autoCapitalize="characters"
          />
        }
      />

      <SectionKicker label="DEPARTURE" />
      <TwoCol
        left={
          <PickerField
            label="Departure date"
            placeholder="mm/dd/yyyy"
            value={form.depDate}
            icon="calendar"
            onPress={() =>
              openDateRange({
                startKey: "depDate",
                endKey: "arrDate",
                initialSelectionMode: "start",
              })
            }
          />
        }
        right={
          <PickerField
            label="Departure time"
            placeholder="--:--"
            value={form.depTime}
            icon="clock"
            onPress={() => openTime({ key: "depTime", label: "Departure time" })}
          />
        }
      />
      <UnderlineField
        label="Departure airport / terminal"
        placeholder="e.g. SFO · Terminal 3"
        value={form.depAirport}
        onChangeText={(v) => set("depAirport", v)}
        autoCapitalize="characters"
      />
      <UnderlineField
        label="Departure gate"
        placeholder="e.g. G14"
        value={form.depGate}
        onChangeText={(v) => set("depGate", v)}
        optional
        autoCapitalize="characters"
      />

      <SectionKicker label="ARRIVAL" />
      <TwoCol
        left={
          <PickerField
            label="Arrival date"
            placeholder="mm/dd/yyyy"
            value={form.arrDate}
            icon="calendar"
            onPress={() =>
              openDateRange({
                startKey: "depDate",
                endKey: "arrDate",
                initialSelectionMode: "end",
              })
            }
          />
        }
        right={
          <PickerField
            label="Arrival time"
            placeholder="--:--"
            value={form.arrTime}
            icon="clock"
            onPress={() => openTime({ key: "arrTime", label: "Arrival time" })}
          />
        }
      />
      <UnderlineField
        label="Arrival airport / terminal"
        placeholder="e.g. LAX · Terminal 2"
        value={form.arrAirport}
        onChangeText={(v) => set("arrAirport", v)}
        optional
        autoCapitalize="characters"
      />
      <UnderlineField
        label="Seat #"
        placeholder="e.g. 14A"
        value={form.seatNumber}
        onChangeText={(v) => set("seatNumber", v)}
        optional
        autoCapitalize="characters"
      />
    </>
  );
}

function LodgingFields({
  form,
  set,
  openDateRange,
  openTime,
}: { form: FormState; set: SetField } & PickerControls) {
  return (
    <>
      <SectionKicker label="PROPERTY" />
      <UnderlineField
        label="Hotel / property"
        placeholder="e.g. Marriott Downtown, Airbnb in Midtown"
        value={form.hotelName}
        onChangeText={(v) => set("hotelName", v)}
      />
      <UnderlineField
        label="Confirmation #"
        placeholder="e.g. HZ92KD"
        value={form.confirmationCode}
        onChangeText={(v) => set("confirmationCode", v)}
        optional
        autoCapitalize="characters"
      />

      <SectionKicker label="CHECK-IN" />
      <TwoCol
        left={
          <PickerField
            label="Date"
            placeholder="mm/dd/yyyy"
            value={form.checkInDate}
            icon="calendar"
            onPress={() =>
              openDateRange({
                startKey: "checkInDate",
                endKey: "checkOutDate",
                initialSelectionMode: "start",
              })
            }
          />
        }
        right={
          <PickerField
            label="Time"
            placeholder="--:--"
            value={form.checkInTime}
            icon="clock"
            optional
            onPress={() => openTime({ key: "checkInTime", label: "Check-in time" })}
          />
        }
      />

      <SectionKicker label="CHECK-OUT" />
      <TwoCol
        left={
          <PickerField
            label="Date"
            placeholder="mm/dd/yyyy"
            value={form.checkOutDate}
            icon="calendar"
            onPress={() =>
              openDateRange({
                startKey: "checkInDate",
                endKey: "checkOutDate",
                initialSelectionMode: "end",
              })
            }
          />
        }
        right={
          <PickerField
            label="Time"
            placeholder="--:--"
            value={form.checkOutTime}
            icon="clock"
            optional
            onPress={() => openTime({ key: "checkOutTime", label: "Check-out time" })}
          />
        }
      />

      <UnderlineField
        label="Address"
        placeholder="e.g. 500 J St, Sacramento, CA"
        value={form.hotelAddress}
        onChangeText={(v) => set("hotelAddress", v)}
        optional
      />
      <UnderlineField
        label="Room / unit"
        placeholder="e.g. Room 412, Unit B, Suite 2"
        value={form.roomUnit}
        onChangeText={(v) => set("roomUnit", v)}
        optional
      />
      <UnderlineField
        label="Guests"
        placeholder="e.g. John Smith"
        value={form.guests}
        onChangeText={(v) => set("guests", v)}
        optional
      />
    </>
  );
}

function RestaurantFields({
  form,
  set,
  openDateRange,
  openTime,
}: { form: FormState; set: SetField } & PickerControls) {
  return (
    <>
      <SectionKicker label="RESTAURANT" />
      <UnderlineField
        label="Dining"
        placeholder="e.g. Canon, Ella Dining Room"
        value={form.restaurantName}
        onChangeText={(v) => set("restaurantName", v)}
      />
      <UnderlineField
        label="Confirmation #"
        placeholder="e.g. OT-48291"
        value={form.confirmationCode}
        onChangeText={(v) => set("confirmationCode", v)}
        optional
        autoCapitalize="characters"
      />

      <SectionKicker label="RESERVATION" />
      <TwoCol
        left={
          <PickerField
            label="Date"
            placeholder="mm/dd/yyyy"
            value={form.diningDate}
            icon="calendar"
            onPress={() =>
              openDateRange({
                startKey: "diningDate",
                initialSelectionMode: "start",
              })
            }
          />
        }
        right={
          <PickerField
            label="Time"
            placeholder="e.g. 7:30 PM"
            value={form.diningTime}
            icon="clock"
            onPress={() => openTime({ key: "diningTime", label: "Reservation time" })}
          />
        }
      />
      <UnderlineField
        label="Address / location"
        placeholder="e.g. 1719 34th St, Sacramento, CA"
        value={form.restaurantAddress}
        onChangeText={(v) => set("restaurantAddress", v)}
        optional
      />
      <UnderlineField
        label="Party size"
        placeholder="e.g. 4 guests"
        value={form.partySize}
        onChangeText={(v) => set("partySize", v)}
        optional
        keyboardType="number-pad"
      />
      <UnderlineField
        label="Name on reservation"
        placeholder="e.g. John Smith"
        value={form.nameOnReservation}
        onChangeText={(v) => set("nameOnReservation", v)}
        optional
      />
    </>
  );
}

function ActivityFields({
  form,
  set,
  openDateRange,
  openTime,
}: { form: FormState; set: SetField } & PickerControls) {
  return (
    <>
      <SectionKicker label="ACTIVITY" />
      <UnderlineField
        label="Activity name"
        placeholder="e.g. Museum tickets, food tour, river cruise"
        value={form.activityName}
        onChangeText={(v) => set("activityName", v)}
      />
      <UnderlineField
        label="Confirmation #"
        placeholder="e.g. VX83KD"
        value={form.confirmationCode}
        onChangeText={(v) => set("confirmationCode", v)}
        optional
        autoCapitalize="characters"
      />

      <SectionKicker label="SCHEDULE" />
      <PickerField
        label="Date"
        placeholder="mm/dd/yyyy"
        value={form.activityDate}
        icon="calendar"
        onPress={() =>
          openDateRange({
            startKey: "activityDate",
            initialSelectionMode: "start",
          })
        }
      />
      <TwoCol
        left={
          <PickerField
            label="Start time"
            placeholder="e.g. 10:00 AM"
            value={form.activityStartTime}
            icon="clock"
            onPress={() => openTime({ key: "activityStartTime", label: "Start time" })}
          />
        }
        right={
          <PickerField
            label="End time"
            placeholder="e.g. 12:30 PM"
            value={form.activityEndTime}
            icon="clock"
            optional
            onPress={() => openTime({ key: "activityEndTime", label: "End time" })}
          />
        }
      />
      <UnderlineField
        label="Location / meeting point"
        placeholder="e.g. Crocker Art Museum, main entrance"
        value={form.activityLocation}
        onChangeText={(v) => set("activityLocation", v)}
        optional
      />
      <UnderlineField
        label="Tickets / guests"
        placeholder="e.g. 2 adults"
        value={form.ticketsGuests}
        onChangeText={(v) => set("ticketsGuests", v)}
        optional
      />
      <UnderlineField
        label="Provider"
        placeholder="e.g. Viator, GetYourGuide, museum website"
        value={form.activityProvider}
        onChangeText={(v) => set("activityProvider", v)}
        optional
      />
    </>
  );
}

function TransportFields({
  form,
  set,
  subType,
  setSubType,
  openDateRange,
  openTime,
}: {
  form: FormState;
  set: SetField;
  subType: TransportSubType;
  setSubType: (v: TransportSubType) => void;
} & PickerControls) {
  return (
    <>
      <SectionKicker label="TRANSPORT" />
      <UnderlineField
        label="Provider or route"
        placeholder="e.g. Amtrak, Uber Reserve, Hertz, airport shuttle"
        value={form.transportProvider}
        onChangeText={(v) => set("transportProvider", v)}
      />
      <UnderlineField
        label="Confirmation #"
        placeholder="e.g. TR92KD"
        value={form.confirmationCode}
        onChangeText={(v) => set("confirmationCode", v)}
        optional
        autoCapitalize="characters"
      />

      <View style={{ marginTop: 16 }}>
        <Text style={[fontStyles.uiRegular, fs.fieldLabel]}>
          Transport type
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {TRANSPORT_SUBTYPES.map((s) => {
            const active = subType === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSubType(s.key)}
                style={[
                  fs.subTypeChip,
                  active ? fs.subTypeChipActive : fs.subTypeChipInactive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={s.label}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    fontStyles.uiMedium,
                    { fontSize: 12, color: active ? DE.ivory : DE.muted },
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[fs.underline, { marginTop: 10 }]} />
      </View>

      <SectionKicker label="PICKUP / DEPARTURE" />
      <TwoCol
        left={
          <PickerField
            label="Date"
            placeholder="mm/dd/yyyy"
            value={form.pickupDate}
            icon="calendar"
            onPress={() =>
              openDateRange({
                startKey: "pickupDate",
                endKey: "dropoffDate",
                initialSelectionMode: "start",
              })
            }
          />
        }
        right={
          <PickerField
            label="Time"
            placeholder="--:--"
            value={form.pickupTime}
            icon="clock"
            onPress={() => openTime({ key: "pickupTime", label: "Pickup time" })}
          />
        }
      />
      <UnderlineField
        label="Location"
        placeholder="e.g. Union Station, Platform 4"
        value={form.pickupLocation}
        onChangeText={(v) => set("pickupLocation", v)}
        optional
      />

      <SectionKicker label="DROPOFF / ARRIVAL" />
      <TwoCol
        left={
          <PickerField
            label="Date"
            placeholder="mm/dd/yyyy"
            value={form.dropoffDate}
            icon="calendar"
            optional
            onPress={() =>
              openDateRange({
                startKey: "pickupDate",
                endKey: "dropoffDate",
                initialSelectionMode: "end",
              })
            }
          />
        }
        right={
          <PickerField
            label="Time"
            placeholder="--:--"
            value={form.dropoffTime}
            icon="clock"
            optional
            onPress={() => openTime({ key: "dropoffTime", label: "Drop-off time" })}
          />
        }
      />
      <UnderlineField
        label="Location"
        placeholder="e.g. LAX Terminal 4"
        value={form.dropoffLocation}
        onChangeText={(v) => set("dropoffLocation", v)}
        optional
      />
      <UnderlineField
        label="Vehicle / seat / route #"
        placeholder="e.g. Car class, train #, bus #, seat 12A"
        value={form.vehicleSeatRoute}
        onChangeText={(v) => set("vehicleSeatRoute", v)}
        optional
        autoCapitalize="characters"
      />
    </>
  );
}

function OtherFields({
  form,
  set,
  openDateRange,
  openTime,
}: { form: FormState; set: SetField } & PickerControls) {
  return (
    <>
      <SectionKicker label="BOOKING" />
      <UnderlineField
        label="Booking title"
        placeholder="e.g. Travel insurance, parking pass, event ticket"
        value={form.bookingTitle}
        onChangeText={(v) => set("bookingTitle", v)}
      />
      <UnderlineField
        label="Confirmation #"
        placeholder="e.g. BK92KD"
        value={form.confirmationCode}
        onChangeText={(v) => set("confirmationCode", v)}
        optional
        autoCapitalize="characters"
      />

      <SectionKicker label="DATE & LOCATION" />
      <TwoCol
        left={
          <PickerField
            label="Date"
            placeholder="mm/dd/yyyy"
            value={form.otherDate}
            icon="calendar"
            optional
            onPress={() =>
              openDateRange({
                startKey: "otherDate",
                initialSelectionMode: "start",
              })
            }
          />
        }
        right={
          <PickerField
            label="Time"
            placeholder="--:--"
            value={form.otherTime}
            icon="clock"
            optional
            onPress={() => openTime({ key: "otherTime", label: "Booking time" })}
          />
        }
      />
      <UnderlineField
        label="Location / address"
        placeholder="e.g. Convention Center, Lot B"
        value={form.otherLocation}
        onChangeText={(v) => set("otherLocation", v)}
        optional
      />
      <UnderlineField
        label="Provider"
        placeholder="e.g. Eventbrite, SpotHero, insurance provider"
        value={form.otherProvider}
        onChangeText={(v) => set("otherProvider", v)}
        optional
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fs = StyleSheet.create({
  fieldWrapper: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: DE.ink,
    marginBottom: 4,
  },
  optLabel: {
    color: DE.muted,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: DE.ink,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  underline: {
    height: 1,
    backgroundColor: DE.ruleStrong,
    marginTop: 4,
  },
  kickerWrapper: {
    marginTop: 24,
    marginBottom: 12,
  },
  kickerText: {
    fontSize: 9,
    letterSpacing: 2,
    color: DE.muted,
  },
  kickerRule: {
    height: 1,
    backgroundColor: DE.ruleStrong,
    marginTop: 8,
  },
  twoCol: {
    flexDirection: "row",
    gap: 16,
  },
  subTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  subTypeChipActive: {
    backgroundColor: DE.ink,
    borderColor: DE.ink,
  },
  subTypeChipInactive: {
    backgroundColor: "transparent",
    borderColor: DE.ruleStrong,
  },
});

const ss = StyleSheet.create({
  sheet: {
    backgroundColor: "#FAF8F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    maxHeight: "94%",
    marginTop: "auto",
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DE.ruleStrong,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    color: DE.ink,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    color: DE.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: 12,
  },
  tabItem: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  tabText: {
    fontSize: 14,
    lineHeight: 18,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: DE.ink,
  },
  tabRule: {
    height: 1,
    backgroundColor: DE.ruleStrong,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 8,
  },
  helperBanner: {
    borderWidth: 1,
    borderColor: "#D9CFC4",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  errorBanner: {
    borderWidth: 1,
    borderColor: "rgba(185,28,28,0.25)",
    backgroundColor: "rgba(185,28,28,0.10)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },
});

const ts = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  sheet: {
    backgroundColor: "#FAF8F5",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: DE.ruleStrong,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    color: DE.ink,
  },
  subtitle: {
    fontSize: 14,
    color: DE.muted,
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DE.rule,
    backgroundColor: "#FFFFFF",
  },
  pickerCard: {
    borderWidth: 1,
    borderColor: DE.rule,
    backgroundColor: DE.ivory,
    borderRadius: 24,
    paddingVertical: 8,
    alignItems: "center",
  },
  nativePicker: {
    alignSelf: "stretch",
    height: 216,
  },
  summaryCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: DE.rule,
    backgroundColor: DE.paper,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryKicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: DE.muted,
  },
  summaryValue: {
    fontSize: 16,
    color: DE.ink,
    marginTop: 4,
  },
  actions: {
    gap: 8,
    marginTop: 16,
  },
});

// ─── Notes placeholder by type ────────────────────────────────────────────────

const NOTES_PLACEHOLDER: Record<Tab, string> = {
  flight: "Baggage, boarding group, reminders…",
  lodging: "Parking, check-in instructions, door code, reminders…",
  restaurant: "Dress code, patio seating, allergies, special occasion…",
  activity: "Bring ID, arrive 15 minutes early, ticket instructions…",
  transport: "Pickup instructions, platform, license plate, rental counter…",
  other: "Anything important you want available during the trip…",
};

function TimePickerSheet({
  visible,
  label,
  value,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  label: string;
  value: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Date>(() => parseTimeValue(value));

  useEffect(() => {
    if (!visible) return;
    setDraft(parseTimeValue(value));
  }, [value, visible]);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDraft(selected);
  };

  if (!visible) return null;

  return (
    <View style={ts.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss time picker"
      />
      <View style={ts.sheet}>
        <View style={ts.handle} />
        <View style={ts.header}>
          <View style={{ flex: 1 }}>
            <Text style={[fontStyles.uiSemibold, ts.title]}>{label}</Text>
            <Text style={[fontStyles.uiRegular, ts.subtitle]}>
              Choose the time for this reservation.
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close time picker"
            style={ts.closeButton}
          >
            <Ionicons name="close" size={21} color="#8A7E74" />
          </Pressable>
        </View>

        <View style={ts.pickerCard}>
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            onChange={handleChange}
            textColor={DE.ink}
            accentColor={DE.clay}
            style={ts.nativePicker}
          />
        </View>

        <View style={ts.summaryCard}>
          <Text style={[fontStyles.monoMedium, ts.summaryKicker]}>
            SELECTED TIME
          </Text>
          <Text style={[fontStyles.uiSemibold, ts.summaryValue]}>
            {formatTimeDisplay(formatTimeValue(draft))}
          </Text>
        </View>

        <View style={ts.actions}>
          <Button
            label="Confirm time"
            onPress={() => onConfirm(formatTimeValue(draft))}
            fullWidth
            variant="ontrip"
          />
          <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
        </View>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  initialValues?: Reservation | ReservationPayload;
  helperText?: string | null;
  onSave: (payload: ReservationPayload) => Promise<void>;
};

export function BookingFormSheet({
  visible,
  onClose,
  initialValues,
  helperText = null,
  onSave,
}: Props) {
  const isEdit = initialValues !== undefined && "id" in initialValues;

  const [activeTab, setActiveTab] = useState<Tab>("flight");
  const [subType, setSubType] = useState<TransportSubType>("train");
  const [form, setFormState] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRangeTarget, setDateRangeTarget] =
    useState<DateRangeTarget | null>(null);
  const [timeTarget, setTimeTarget] = useState<TimeTarget | null>(null);

  const set: SetField = (key, value) =>
    setFormState((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!visible) return;
    if (initialValues) {
      const hydrated = hydrateForm(initialValues);
      setActiveTab(hydrated.tab);
      setSubType(hydrated.subType);
      setFormState(hydrated.form);
    } else {
      setActiveTab("flight");
      setSubType("train");
      setFormState(EMPTY_FORM);
    }
    setSaving(false);
    setError(null);
    setDateRangeTarget(null);
    setTimeTarget(null);
  }, [visible, initialValues]);

  const handleConfirmDateRange = (range: {
    startDate: string;
    endDate: string;
  }) => {
    if (!dateRangeTarget) return;
    setFormState((prev) => ({
      ...prev,
      [dateRangeTarget.startKey]: isoDateToDisplay(range.startDate),
      ...(dateRangeTarget.endKey
        ? { [dateRangeTarget.endKey]: isoDateToDisplay(range.endDate) }
        : undefined),
    }));
    setDateRangeTarget(null);
  };

  const handleConfirmTime = (value: string) => {
    if (!timeTarget) return;
    set(timeTarget.key, value);
    setTimeTarget(null);
  };

  const openTimePicker = (target: TimeTarget) => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: parseTimeValue(String(form[target.key] ?? "")),
        mode: "time",
        display: "clock",
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === "set" && selected) {
            set(target.key, formatTimeValue(selected));
          }
        },
      });
      return;
    }

    setTimeTarget(target);
  };

  const handleSave = async () => {
    if (!isFormValid(activeTab, form)) return;
    const payload = buildPayload(activeTab, subType, form);
    setSaving(true);
    setError(null);
    try {
      await onSave(payload);
      onClose();
    } catch {
      setError(
        isEdit
          ? "Couldn't save changes. Try again."
          : "Couldn't save that booking. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const valid = isFormValid(activeTab, form);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={onClose}
        accessibilityLabel="Dismiss"
        className="bg-black/30"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={ss.sheet}
      >
        {/* Handle */}
        <View style={ss.handleRow}>
          <View style={ss.handle} />
        </View>

        {/* Header */}
        <View style={ss.header}>
          <View style={{ flex: 1 }}>
            <Text style={[fontStyles.headSemibold, ss.headerTitle]}>
              {isEdit ? "Edit booking" : "Add booking"}
            </Text>
            {!isEdit ? (
              <Text style={[fontStyles.uiRegular, ss.headerSubtitle]}>
                Keep the details you&apos;ll want while you&apos;re away.
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={DE.muted} />
          </Pressable>
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={ss.tabBarScroll}
          contentContainerStyle={ss.tabBarContent}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={ss.tabItem}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    active ? fontStyles.uiSemibold : fontStyles.uiRegular,
                    ss.tabText,
                    { color: active ? DE.ink : DE.muted },
                  ]}
                >
                  {tab.label}
                </Text>
                {active ? <View style={ss.tabUnderline} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={ss.tabRule} />

        {/* Scrollable content */}
        <ScrollView
          contentContainerStyle={ss.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {helperText ? (
            <View style={ss.helperBanner}>
              <Text
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 13, color: "#4a3f37" },
                ]}
              >
                {helperText}
              </Text>
            </View>
          ) : null}

          {activeTab === "flight" && (
            <FlightFields
              form={form}
              set={set}
              openDateRange={setDateRangeTarget}
              openTime={openTimePicker}
            />
          )}
          {activeTab === "lodging" && (
            <LodgingFields
              form={form}
              set={set}
              openDateRange={setDateRangeTarget}
              openTime={openTimePicker}
            />
          )}
          {activeTab === "restaurant" && (
            <RestaurantFields
              form={form}
              set={set}
              openDateRange={setDateRangeTarget}
              openTime={openTimePicker}
            />
          )}
          {activeTab === "activity" && (
            <ActivityFields
              form={form}
              set={set}
              openDateRange={setDateRangeTarget}
              openTime={openTimePicker}
            />
          )}
          {activeTab === "transport" && (
            <TransportFields
              form={form}
              set={set}
              subType={subType}
              setSubType={setSubType}
              openDateRange={setDateRangeTarget}
              openTime={openTimePicker}
            />
          )}
          {activeTab === "other" && (
            <OtherFields
              form={form}
              set={set}
              openDateRange={setDateRangeTarget}
              openTime={openTimePicker}
            />
          )}

          {/* Notes — shared */}
          <SectionKicker label="NOTES (OPTIONAL)" />
          <UnderlineField
            placeholder={NOTES_PLACEHOLDER[activeTab]}
            value={form.notes}
            onChangeText={(v) => set("notes", v)}
            multiline
          />

          {/* Cost */}
          <View style={{ marginTop: 20 }}>
            <UnderlineField
              label="Cost"
              placeholder="e.g. 240"
              value={form.amount}
              onChangeText={(v) => set("amount", v)}
              optional
              keyboardType="decimal-pad"
              autoCapitalize="none"
            />
          </View>

          {error ? (
            <View style={ss.errorBanner}>
              <Text
                style={[
                  fontStyles.uiRegular,
                  { fontSize: 13, color: "#B91C1C" },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View style={ss.actions}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ontrip"
                label={
                  saving ? "Saving…" : isEdit ? "Save changes" : "Save"
                }
                onPress={() => void handleSave()}
                fullWidth
                disabled={saving || !valid}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DateRangePickerSheet
        visible={dateRangeTarget !== null}
        startDate={
          dateRangeTarget
            ? displayDateToISO(String(form[dateRangeTarget.startKey] ?? ""))
            : ""
        }
        endDate={
          dateRangeTarget?.endKey
            ? displayDateToISO(String(form[dateRangeTarget.endKey] ?? ""))
            : ""
        }
        initialSelectionMode={dateRangeTarget?.initialSelectionMode ?? "start"}
        title={dateRangeTarget?.endKey ? "When is this booking?" : "Choose the date"}
        subtitle={
          dateRangeTarget?.endKey
            ? "Choose the start and end dates for this reservation."
            : "Choose the day for this reservation."
        }
        confirmLabel={dateRangeTarget?.endKey ? "Confirm dates" : "Confirm date"}
        showDurationChips={dateRangeTarget?.endKey !== undefined}
        onConfirm={handleConfirmDateRange}
        onClose={() => setDateRangeTarget(null)}
      />
      {Platform.OS === "ios" ? (
        <TimePickerSheet
          visible={timeTarget !== null}
          label={timeTarget?.label ?? "Time"}
          value={timeTarget ? String(form[timeTarget.key] ?? "") : ""}
          onConfirm={handleConfirmTime}
          onClose={() => setTimeTarget(null)}
        />
      ) : null}
    </Modal>
  );
}
