import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

export type AnalyticsEvent = {
  name: string;
  props?: Record<string, string | number | boolean | null | undefined>;
};

type AnalyticsUser = {
  email: string;
  id?: number;
};

const hasPostHog = Boolean(import.meta.env.VITE_POSTHOG_KEY);

export function track(event: AnalyticsEvent): void {
  if (hasPostHog) {
    posthog.capture(event.name, event.props ?? {});
    return;
  }

  if (import.meta.env.DEV) {
    console.info('[analytics]', event.name, event.props ?? {});
  }
}

export function identifyAnalyticsUser(user: AnalyticsUser): void {
  if (hasPostHog) {
    posthog.identify(String(user.id ?? user.email), {
      email: user.email,
      user_id: user.id ?? null,
    });
  }

  Sentry.setUser({
    email: user.email,
    id: user.id ? String(user.id) : undefined,
  });
}

export function resetAnalyticsUser(): void {
  if (hasPostHog) {
    posthog.reset();
  }
  Sentry.setUser(null);
}

export function captureUiError(error: unknown, extra?: Record<string, unknown>): void {
  Sentry.captureException(error, {
    extra,
  });
}
