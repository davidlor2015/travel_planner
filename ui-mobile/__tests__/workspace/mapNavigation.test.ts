import * as Linking from "expo-linking";
import { ActionSheetIOS, Platform } from "react-native";

import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  normalizeDirectionsDestination,
  openStopDirections,
} from "@/features/trips/onTrip/mapNavigation";

jest.mock("expo-linking", () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => os,
  });
}

describe("mapNavigation", () => {
  const openURL = jest.mocked(Linking.openURL);
  let actionSheetSpy: jest.SpyInstance;

  beforeEach(() => {
    setPlatform("ios");
    openURL.mockClear();
    actionSheetSpy = jest
      .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
      .mockImplementation((_options, callback) => callback(2));
  });

  afterEach(() => {
    actionSheetSpy.mockRestore();
  });

  it("builds Apple Maps directions with daddr", () => {
    expect(buildAppleMapsDirectionsUrl("Kyoto Station")).toBe(
      "https://maps.apple.com/?daddr=Kyoto%20Station",
    );
  });

  it("builds Google Maps directions with destination", () => {
    expect(buildGoogleMapsDirectionsUrl("Kyoto Station")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Kyoto%20Station",
    );
  });

  it("normalizes blank destinations to null", () => {
    expect(normalizeDirectionsDestination("  Kyoto Station  ")).toBe(
      "Kyoto Station",
    );
    expect(normalizeDirectionsDestination("   ")).toBeNull();
    expect(normalizeDirectionsDestination(null)).toBeNull();
  });

  it("shows an iOS provider choice and opens Apple Maps", async () => {
    actionSheetSpy.mockImplementationOnce((_options, callback) => callback(0));

    await openStopDirections("Kyoto Station");

    expect(actionSheetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        options: ["Apple Maps", "Google Maps", "Cancel"],
        cancelButtonIndex: 2,
      }),
      expect.any(Function),
    );
    expect(openURL).toHaveBeenCalledWith(
      "https://maps.apple.com/?daddr=Kyoto%20Station",
    );
  });

  it("shows an iOS provider choice and opens Google Maps", async () => {
    actionSheetSpy.mockImplementationOnce((_options, callback) => callback(1));

    await openStopDirections("Kyoto Station");

    expect(openURL).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=Kyoto%20Station",
    );
  });

  it("opens Google Maps directly on Android", async () => {
    setPlatform("android");

    await openStopDirections("Kyoto Station");

    expect(actionSheetSpy).not.toHaveBeenCalled();
    expect(openURL).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=Kyoto%20Station",
    );
  });

  it("does nothing without a destination", async () => {
    await openStopDirections("   ");

    expect(actionSheetSpy).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });
});
