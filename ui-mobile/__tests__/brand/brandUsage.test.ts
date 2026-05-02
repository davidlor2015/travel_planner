import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const appRoot = join(__dirname, "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(appRoot, relativePath), "utf8");
}

function readTsxFiles(relativeDir: string): string {
  const dir = join(appRoot, relativeDir);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .join("\n");
}

describe("ROEN brand usage", () => {
  it("does not render LogoOnInk on the Profile screen", () => {
    const source = read("app/(tabs)/profile.tsx");

    expect(source).not.toContain("lockupOnInk");
    expect(source).not.toContain("LogoOnInk");
  });

  it("keeps trip execution (onTrip) screens free of wordmark and lockup primitives", () => {
    const source = readTsxFiles("features/trips/onTrip");

    expect(source).not.toContain("DisplayWordmark");
    expect(source).not.toContain("EditorialWordmark");
    expect(source).not.toContain("LogoOnInk");
    expect(source).not.toContain("lockupOnInk");
  });

  it("does not render the app icon as normal in-app UI", () => {
    const source = readTsxFiles("shared/ui");

    expect(source).not.toContain("roen-app-icon.png");
    expect(source).not.toContain("appIcon");
  });
});
