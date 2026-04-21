import { describe, expect, it } from "vitest";

import type { EditableDayPlan, EditableItineraryItem } from "../itineraryDraft";
import {
  buildDayPanelMeta,
  buildStopRowViewModel,
  dayNotePreview,
  formatDayDateLabel,
  htmlTimeFromStoredTime,
  shouldUseHtmlTimeInput,
  summarizeTimeWindowLabel,
} from "./itineraryEditorModels";

function item(p: Partial<EditableItineraryItem> & { client_id: string }): EditableItineraryItem {
  return {
    client_id: p.client_id,
    time: p.time ?? null,
    title: p.title ?? "Stop",
    location: p.location ?? null,
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    notes: p.notes ?? null,
    cost_estimate: p.cost_estimate ?? null,
    status: p.status ?? null,
  };
}

describe("itineraryEditorModels", () => {
  describe("htmlTimeFromStoredTime / shouldUseHtmlTimeInput", () => {
    it("returns empty for null", () => {
      expect(htmlTimeFromStoredTime(null)).toBe("");
      expect(shouldUseHtmlTimeInput(null)).toBe(true);
    });

    it("normalizes HH:MM and HH:MM:SS", () => {
      expect(htmlTimeFromStoredTime("9:30")).toBe("09:30");
      expect(htmlTimeFromStoredTime("14:05:00")).toBe("14:05");
    });

    it("does not invent a time for non-numeric freeform strings", () => {
      expect(htmlTimeFromStoredTime("Morning")).toBe("");
      expect(shouldUseHtmlTimeInput("Morning")).toBe(false);
    });
  });

  describe("buildStopRowViewModel", () => {
    it("marks untitled when title empty", () => {
      const vm = buildStopRowViewModel(
        item({ client_id: "a", title: "  " }),
        { isLocked: false, isFavorite: false },
      );
      expect(vm.showUntitled).toBe(true);
      expect(vm.timeBadge.kind).toBe("flexible");
    });

    it("shows cost when present", () => {
      const vm = buildStopRowViewModel(
        item({ client_id: "a", title: "Cafe", cost_estimate: "$20" }),
        { isLocked: false, isFavorite: false },
      );
      expect(vm.costDisplay).toBe("$20");
    });

    it("normalizes stop status for display", () => {
      const confirmed = buildStopRowViewModel(
        item({ client_id: "a", title: "Museum", status: "confirmed" }),
        { isLocked: false, isFavorite: false },
      );
      expect(confirmed.stopStatus).toBe("confirmed");
      expect(confirmed.stopStatusLabel).toBe("Confirmed");

      const unknown = buildStopRowViewModel(
        item({ client_id: "b", title: "Walk", status: "weird" as never }),
        { isLocked: false, isFavorite: false },
      );
      expect(unknown.stopStatus).toBe("planned");
    });
  });

  describe("buildDayPanelMeta", () => {
    it("builds meta for an empty day", () => {
      const day: EditableDayPlan = {
        day_number: 1,
        date: "2026-06-01",
        day_title: null,
        day_note: null,
        items: [],
      };
      const m = buildDayPanelMeta(day);
      expect(m.metaLine).toContain("0 stops");
      expect(m.metaLine).toContain("No timed stops");
    });

    it("truncates long day notes in preview", () => {
      const long = "x".repeat(200);
      expect(dayNotePreview(long)?.length).toBeLessThanOrEqual(143);
    });

    it("formats date label", () => {
      expect(formatDayDateLabel(null)).toBe("Date flexible");
    });

    it("summarizes time window", () => {
      const items = [
        item({ client_id: "1", time: "10:00", title: "A" }),
        item({ client_id: "2", time: "18:00", title: "B" }),
      ];
      expect(summarizeTimeWindowLabel(items)).toContain("10:00");
      expect(summarizeTimeWindowLabel(items)).toContain("18:00");
    });
  });
});
