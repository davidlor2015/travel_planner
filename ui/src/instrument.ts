// Path: ui/src/instrument.ts
// Summary: Implements instrument module logic.

import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const sentryEnvironment = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE;
const sentryTracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0');

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number.isFinite(sentryTracesSampleRate) ? sentryTracesSampleRate : 0,
    tracePropagationTargets: [/^\//, /^https?:\/\/localhost(?::\d+)?\//],
  });
}

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-01-30',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
  });
}
