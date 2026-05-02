// Path: ui-mobile/features/trips/onTrip/mapNavigation.ts
// Summary: Small map-provider helper for Today execution navigation.

import * as Linking from "expo-linking";
import { ActionSheetIOS, Platform } from "react-native";

type MapProvider = "apple" | "google";

const IOS_OPTIONS = ["Apple Maps", "Google Maps", "Cancel"];
const APPLE_MAPS_INDEX = 0;
const GOOGLE_MAPS_INDEX = 1;
const CANCEL_INDEX = 2;

export function normalizeDirectionsDestination(
  location: string | null | undefined,
): string | null {
  const destination = location?.trim();
  return destination ? destination : null;
}

export function buildAppleMapsDirectionsUrl(destination: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`;
}

export function buildGoogleMapsDirectionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function buildMapDirectionsUrl(
  destination: string,
  provider: MapProvider,
): string {
  return provider === "apple"
    ? buildAppleMapsDirectionsUrl(destination)
    : buildGoogleMapsDirectionsUrl(destination);
}

export async function openStopDirections(
  location: string | null | undefined,
): Promise<void> {
  const destination = normalizeDirectionsDestination(location);
  if (!destination) return;

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: IOS_OPTIONS,
        cancelButtonIndex: CANCEL_INDEX,
        title: "Open directions",
      },
      (selectedIndex) => {
        if (selectedIndex === APPLE_MAPS_INDEX) {
          void Linking.openURL(buildAppleMapsDirectionsUrl(destination));
        }
        if (selectedIndex === GOOGLE_MAPS_INDEX) {
          void Linking.openURL(buildGoogleMapsDirectionsUrl(destination));
        }
      },
    );
    return;
  }

  await Linking.openURL(buildGoogleMapsDirectionsUrl(destination));
}
