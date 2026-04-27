// Path: ui/src/features/trips/itinerary/draftMutationState.test.ts
// Summary: Covers automated tests for draftMutationState.test behavior.

import { describe, expect, it } from "vitest";

import {
  createDraftPublishMachineState,
  deriveDraftMutationState,
  failPublish,
  markDraftDirty,
  startPublish,
  succeedPublish,
} from "./draftPublishStateMachine";

describe("deriveDraftMutationState", () => {
  it("returns saving while publish is active", () => {
    expect(
      deriveDraftMutationState({
        isApplying: true,
        hasAppliedSuccess: true,
        hasDraftError: false,
      }),
    ).toBe("saving");
  });

  it("returns idle when an error exists even if there was prior success", () => {
    expect(
      deriveDraftMutationState({
        isApplying: false,
        hasAppliedSuccess: true,
        hasDraftError: true,
      }),
    ).toBe("idle");
  });

  it("returns saved only when publish succeeded with no active error", () => {
    expect(
      deriveDraftMutationState({
        isApplying: false,
        hasAppliedSuccess: true,
        hasDraftError: false,
      }),
    ).toBe("saved");
  });

  it("runs the publish flow state machine sequence", () => {
    let state = createDraftPublishMachineState();
    state = {
      ...state,
      hasAppliedSuccess: true,
    };

    state = markDraftDirty(state);
    expect(state.isDirty).toBe(true);
    expect(state.hasAppliedSuccess).toBe(false);

    state = startPublish(state);
    expect(state.isApplying).toBe(true);
    expect(state.hasAppliedSuccess).toBe(false);
    expect(state.error).toBeNull();
    expect(
      deriveDraftMutationState({
        isApplying: state.isApplying,
        hasAppliedSuccess: state.hasAppliedSuccess,
        hasDraftError: Boolean(state.error),
      }),
    ).toBe("saving");

    state = failPublish(state, "Failed to apply itinerary.");
    expect(state.isApplying).toBe(false);
    expect(state.hasAppliedSuccess).toBe(false);
    expect(state.error).toBe("Failed to apply itinerary.");
    expect(
      deriveDraftMutationState({
        isApplying: state.isApplying,
        hasAppliedSuccess: state.hasAppliedSuccess,
        hasDraftError: Boolean(state.error),
      }),
    ).toBe("idle");

    state = startPublish(state);
    expect(state.error).toBeNull();
    expect(state.hasAppliedSuccess).toBe(false);

    state = succeedPublish(state);
    expect(state.isApplying).toBe(false);
    expect(state.isDirty).toBe(false);
    expect(state.hasAppliedSuccess).toBe(true);
    expect(state.error).toBeNull();
    expect(
      deriveDraftMutationState({
        isApplying: state.isApplying,
        hasAppliedSuccess: state.hasAppliedSuccess,
        hasDraftError: Boolean(state.error),
      }),
    ).toBe("saved");
  });
});
