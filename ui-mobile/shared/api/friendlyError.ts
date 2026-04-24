import { ApiError } from "./client";

export type ErrorDomain = "auth" | "trips" | "ai" | "budget" | "packing" | "bookings";

const MESSAGES: Record<ErrorDomain, Record<number | "default", string>> = {
  auth: {
    401: "That email or password didn't match. Please try again.",
    403: "Your account doesn't have access to that.",
    409: "An account with that email already exists.",
    422: "Please check your details and try again.",
    default: "We couldn't sign you in right now. Try again.",
  },
  trips: {
    404: "We couldn't find that trip.",
    403: "You don't have access to this trip.",
    default: "Something went wrong with your trips. Try again in a moment.",
  },
  ai: {
    429: "Our AI is busy right now. Please try again in a moment.",
    408: "The AI took too long to respond. Please try again.",
    504: "The AI took too long to respond. Please try again.",
    default: "The AI service is having trouble. Please try again shortly.",
  },
  budget: {
    404: "Budget not found for this trip.",
    default: "We couldn't load the budget. Try again in a moment.",
  },
  packing: {
    404: "Packing list not found for this trip.",
    default: "We couldn't load the packing list. Try again in a moment.",
  },
  bookings: {
    404: "No bookings found for this trip.",
    default: "We couldn't load your bookings. Try again in a moment.",
  },
};

/**
 * Returns a curated, user-facing error message. Never surfaces raw backend
 * language, validation errors, or HTTP status codes to the user.
 */
export function friendlyError(err: unknown, domain: ErrorDomain): string {
  if (__DEV__) console.error(`[${domain}]`, err);

  const statusMessages = MESSAGES[domain];

  if (err instanceof ApiError) {
    return (
      (statusMessages[err.status] as string | undefined) ??
      (statusMessages.default as string)
    );
  }

  return statusMessages.default as string;
}
