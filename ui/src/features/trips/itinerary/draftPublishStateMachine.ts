export type DraftMutationState = "idle" | "saving" | "saved";

export interface DraftPublishMachineState {
  isDirty: boolean;
  isApplying: boolean;
  hasAppliedSuccess: boolean;
  error: string | null;
}

export const createDraftPublishMachineState = (): DraftPublishMachineState => ({
  isDirty: false,
  isApplying: false,
  hasAppliedSuccess: false,
  error: null,
});

export function markDraftDirty(
  state: DraftPublishMachineState,
): DraftPublishMachineState {
  return {
    ...state,
    isDirty: true,
    hasAppliedSuccess: false,
  };
}

export function startPublish(
  state: DraftPublishMachineState,
): DraftPublishMachineState {
  return {
    ...state,
    isApplying: true,
    hasAppliedSuccess: false,
    error: null,
  };
}

export function failPublish(
  state: DraftPublishMachineState,
  message: string,
): DraftPublishMachineState {
  return {
    ...state,
    isApplying: false,
    hasAppliedSuccess: false,
    error: message,
  };
}

export function succeedPublish(
  state: DraftPublishMachineState,
): DraftPublishMachineState {
  return {
    ...state,
    isApplying: false,
    isDirty: false,
    hasAppliedSuccess: true,
    error: null,
  };
}

export function deriveDraftMutationState(params: {
  isApplying: boolean;
  hasAppliedSuccess: boolean;
  hasDraftError: boolean;
}): DraftMutationState {
  if (params.isApplying) return "saving";
  if (params.hasDraftError) return "idle";
  return params.hasAppliedSuccess ? "saved" : "idle";
}
