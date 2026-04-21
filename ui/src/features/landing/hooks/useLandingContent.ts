import { useMemo } from "react";
import { getLandingContent } from "../adapters/landingContentAdapter";

export function useLandingContent() {
  const content = useMemo(() => getLandingContent(), []);
  return {
    data: content,
    loading: false,
    error: null as string | null,
  };
}
