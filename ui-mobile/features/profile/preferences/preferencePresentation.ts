// Path: ui-mobile/features/profile/preferences/preferencePresentation.ts
// Summary: Implements preferencePresentation module logic.

import type { AppPreferences } from "./useAppPreferences";

export function buildDefaultsSubtext(prefs: AppPreferences): string {
  const dist = prefs.distanceUnit === "mi" ? "Miles" : "Km";
  const time = prefs.timeFormat === "12h" ? "12-hour" : "24-hour";
  return `${prefs.currency} · ${dist} · ${time}`;
}

export function buildNotificationsSubtext(prefs: AppPreferences): string {
  const enabledCount = [
    prefs.tripRemindersEnabled,
    prefs.inviteAlertsEnabled,
    prefs.onTripRemindersEnabled,
  ].filter(Boolean).length;

  if (enabledCount === 3) return "All on";
  if (enabledCount === 0) return "Off";
  return "Some on";
}

export function buildLanguageSubtext(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const langCode = locale.split("-")[0] ?? locale;
    const regionCode = locale.split("-")[1] ?? "";

    const displayLang = new Intl.DisplayNames([locale], { type: "language" });
    const langName = displayLang.of(langCode);

    if (regionCode) {
      const displayRegion = new Intl.DisplayNames([locale], { type: "region" });
      const regionName = displayRegion.of(regionCode);
      if (langName && regionName) {
        const lang = langName.charAt(0).toUpperCase() + langName.slice(1);
        const region = regionName.charAt(0).toUpperCase() + regionName.slice(1);
        return `${lang} · ${region}`;
      }
    }

    if (langName) return langName.charAt(0).toUpperCase() + langName.slice(1);
    return locale;
  } catch {
    return "Device language & region";
  }
}
