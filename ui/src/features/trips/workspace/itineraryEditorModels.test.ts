import { describe, expect, it } from "vitest";

import type { EditableDayPlan, EditableItineraryItem } from "../itineraryDraft";
import {
  buildDayPanelMeta,
  buildTripCostSummary,
  buildStopRowViewModel,
  dayNotePreview,
  deriveDayTimeConflictSummary,
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

    it("surfaces ownership metadata from notes token", () => {
      const vm = buildStopRowViewModel(
        item({
          client_id: "owner-1",
          title: "Hotel check-in",
          notes:
            "Bring passport.\n\n[ownership:handledBy=Alex;bookedBy=Sam]",
        }),
        { isLocked: false, isFavorite: false },
      );
      expect(vm.handledBy).toBe("Alex");
      expect(vm.bookedBy).toBe("Sam");
      expect(vm.secondaryLine).toContain("Bring passport.");
      expect(vm.secondaryLine).not.toContain("ownership:");
    });
  });

  describe("buildDayPanelMeta", () => {
    it("builds meta for an empty day", () => {
      const day: EditableDayPlan = {
        day_number: 1,
        date: "2026-06-01",
        day_title: null,
        day_note: null,
        day_anchors: [],
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

    it("adds advisory time hint when stops are out of order", () => {
      const day: EditableDayPlan = {
        day_number: 1,
        date: null,
        day_title: null,
        day_note: null,
        day_anchors: [],
        items: [
          item({ client_id: "1", title: "A", time: "13:00" }),
          item({ client_id: "2", title: "B", time: "11:00" }),
        ],
      };
      const m = buildDayPanelMeta(day);
      expect(m.timeConflictCount).toBe(1);
      expect(m.timeConflictHint).toContain("advisory time conflict");
      expect(m.rowTimeHints.get(1)).toBeTruthy();
    });

    it("exposes day anchor and cost summaries", () => {
      const day: EditableDayPlan = {
        day_number: 2,
        date: "2026-06-02",
        day_title: null,
        day_note: null,
        day_anchors: [
          {
            id: "a1",
            type: "flight",
            label: "JFK → SFO",
            time: "09:00",
            note: null,
            handled_by: null,
            booked_by: null,
          },
        ],
        items: [item({ client_id: "1", title: "Ride", cost_estimate: "$24.50" })],
      };
      const m = buildDayPanelMeta(day);
      expect(m.anchorCount).toBe(1);
      expect(m.anchorSummary).toContain("JFK");
      expect(m.dayCostDisplay).toBeTruthy();
      expect(m.dayCostCoverageLabel).toBe("1/1 parsed");
    });
  });

  describe("cost summary", () => {
    it("rolls up parsed costs conservatively", () => {
      const days: EditableDayPlan[] = [
        {
          day_number: 1,
          date: null,
          day_title: null,
          day_note: null,
          day_anchors: [],
          items: [
            item({ client_id: "a", title: "A", cost_estimate: "$10" }),
            item({ client_id: "b", title: "B", cost_estimate: "about 30" }),
          ],
        },
      ];
      const summary = buildTripCostSummary(days);
      expect(summary.parsedItemCount).toBe(1);
      expect(summary.estimatedItemCount).toBe(2);
      expect(summary.total).toBe(10);
    });
  });

  describe("deriveDayTimeConflictSummary", () => {
    it("identifies overlap and out-of-order conflicts", () => {
      const summary = deriveDayTimeConflictSummary([
        item({ client_id: "a", title: "A", time: "9:00" }),
        item({ client_id: "b", title: "B", time: "9:00" }),
        item({ client_id: "c", title: "C", time: "8:30" }),
      ]);
      expect(summary.conflicts).toHaveLength(2);
      expect(summary.rowHints.get(1)).toContain("Same time");
      expect(summary.rowHints.get(2)).toContain("earlier");
    });
  });
});
