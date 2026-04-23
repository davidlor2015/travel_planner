import { describe, expect, it } from "vitest";

import { isAppleMobile, mapsDirectionsHref, mapsSearchHref } from "./mapLinks";

describe("isAppleMobile", () => {
  it("detects iPhone by userAgent", () => {
    expect(isAppleMobile({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" })).toBe(
      true,
    );
  });

  it("detects iPadOS MacIntel+touch", () => {
    expect(
      isAppleMobile({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 5 }),
    ).toBe(true);
  });

  it("returns false for desktop", () => {
    expect(isAppleMobile({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32" })).toBe(
      false,
    );
  });
});

describe("mapsSearchHref", () => {
  it("prefers lat/lon when present (google)", () => {
    expect(mapsSearchHref({ lat: 38.711, lon: -9.129 }, { platform: "Win32" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=38.711%2C-9.129",
    );
  });

  it("falls back to location/title query (google)", () => {
    expect(mapsSearchHref({ location: "Praca do Comercio" }, { platform: "Win32" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Praca%20do%20Comercio",
    );
  });

  it("uses Apple maps scheme on iOS", () => {
    expect(
      mapsSearchHref(
        { location: "Alfama" },
        { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
      ),
    ).toBe("maps://?q=Alfama");
  });

  it("returns null when no query and no coords", () => {
    expect(mapsSearchHref({}, { platform: "Win32" })).toBeNull();
  });
});

describe("mapsDirectionsHref", () => {
  it("builds a directions link with coordinates (google)", () => {
    expect(mapsDirectionsHref({ lat: 38.711, lon: -9.129 }, { platform: "Win32" })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=38.711%2C-9.129",
    );
  });

  it("builds a directions link with query (apple maps)", () => {
    expect(
      mapsDirectionsHref(
        { title: "Tram 28", location: "Praca do Comercio" },
        { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
      ),
    ).toBe("maps://?daddr=Praca%20do%20Comercio");
  });
});

