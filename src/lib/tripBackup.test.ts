import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCustomStops, saveCustomStops, type CustomStop } from "@/lib/customStops";
import { loadStopOverrides, saveStopOverrides } from "@/lib/stopOverrides";
import {
  buildBackupFile,
  createBackup,
  deleteBackup,
  loadBackups,
  parseBackupFile,
  restoreSnapshot,
  snapshotTrip,
} from "@/lib/tripBackup";
import { createTrip, deleteTrip, loadAllTrips, SEED_TRIP } from "@/lib/trips";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const stop: CustomStop = {
  id: "s1",
  date: "2026-06-11",
  time: "09:00",
  endDate: null,
  endTime: null,
  category: "attraction",
  title: "Clingmans Dome",
  address: null,
  phone: null,
  notes: "Bring a jacket",
  createdAt: "2026-01-01T00:00:00.000Z",
};

let storage: ReturnType<typeof memoryStorage>;
beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal("window", { localStorage: storage });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function newTripWithContent() {
  const trip = createTrip({ name: "Great Smoky Mountains", subtitle: "", startDate: "2026-06-10", endDate: "2026-06-15" });
  saveCustomStops(trip.id, [stop]);
  saveStopOverrides(trip.id, { day0: { routeUrl: "https://www.google.com/maps/dir/a/b" } });
  return trip;
}

describe("backup and restore", () => {
  it("brings a deleted trip back under its original id with all its contents", () => {
    const trip = newTripWithContent();
    const backup = createBackup(trip.id, "before-delete");
    expect(backup).not.toBeNull();

    deleteTrip(trip.id);
    saveCustomStops(trip.id, []);
    saveStopOverrides(trip.id, {});
    expect(loadAllTrips().some((t) => t.id === trip.id)).toBe(false);

    const restored = restoreSnapshot(loadBackups()[0]!);
    expect(restored.id).toBe(trip.id);
    expect(loadAllTrips().some((t) => t.id === trip.id)).toBe(true);
    expect(loadCustomStops(trip.id)).toHaveLength(1);
    expect(loadStopOverrides(trip.id).day0?.routeUrl).toContain("google.com/maps");
  });

  it("restores a trip that still exists as a separate copy, leaving the current one untouched", () => {
    const trip = newTripWithContent();
    createBackup(trip.id, "manual");
    saveCustomStops(trip.id, [stop, { ...stop, id: "s2", title: "Added later" }]);

    const restored = restoreSnapshot(loadBackups()[0]!);
    expect(restored.id).not.toBe(trip.id);
    expect(restored.name).toBe("Great Smoky Mountains (Restored)");
    expect(loadCustomStops(restored.id)).toHaveLength(1);
    expect(loadCustomStops(trip.id)).toHaveLength(2);
  });

  it("restores the built-in trip after it was deleted", () => {
    createBackup(SEED_TRIP.id, "before-delete");
    deleteTrip(SEED_TRIP.id);
    expect(loadAllTrips().some((t) => t.id === SEED_TRIP.id)).toBe(false);

    const restored = restoreSnapshot(loadBackups()[0]!);
    expect(restored.id).toBe(SEED_TRIP.id);
    expect(loadAllTrips().find((t) => t.id === SEED_TRIP.id)?.sourceContent).toBe("colorado-seed");
  });

  it("keeps only the newest backups per trip", () => {
    const trip = newTripWithContent();
    for (let i = 0; i < 14; i++) createBackup(trip.id, "manual");
    expect(loadBackups().filter((b) => b.trip.id === trip.id)).toHaveLength(10);
  });

  it("can delete a backup, and reports failure instead of pretending when storage is full", () => {
    const trip = newTripWithContent();
    const backup = createBackup(trip.id, "manual")!;
    deleteBackup(backup.id);
    expect(loadBackups()).toHaveLength(0);

    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(createBackup(trip.id, "manual")).toBeNull();
  });

  it("returns null for a trip that doesn't exist", () => {
    expect(createBackup("nope", "manual")).toBeNull();
    expect(snapshotTrip("nope")).toBeNull();
  });
});

describe("backup files", () => {
  it("round-trips through a file", () => {
    const trip = newTripWithContent();
    const file = JSON.stringify(buildBackupFile(snapshotTrip(trip.id)!));
    const result = parseBackupFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.trip.name).toBe("Great Smoky Mountains");
      expect(result.snapshot.customStops[0]?.title).toBe("Clingmans Dome");
      expect(result.snapshot.overrides.day0?.routeUrl).toContain("google.com/maps");
    }
  });

  it("rejects files that aren't backups", () => {
    expect(parseBackupFile("not json").ok).toBe(false);
    expect(parseBackupFile(JSON.stringify({ hello: "world" })).ok).toBe(false);
    expect(parseBackupFile(JSON.stringify({ format: "buildtrip-trip-backup", version: 99 })).ok).toBe(false);
    expect(parseBackupFile("x".repeat(2_000_001)).ok).toBe(false);
  });

  it("refuses a trip with an unsafe id or bad dates", () => {
    const base = { format: "buildtrip-trip-backup", version: 1, customStops: [], overrides: {} };
    const trip = { id: "ok-id", name: "T", subtitle: "", startDate: "2026-06-10", endDate: "2026-06-15" };
    expect(parseBackupFile(JSON.stringify({ ...base, trip })).ok).toBe(true);
    expect(parseBackupFile(JSON.stringify({ ...base, trip: { ...trip, id: "../../evil" } })).ok).toBe(false);
    expect(parseBackupFile(JSON.stringify({ ...base, trip: { ...trip, endDate: "2026-06-01" } })).ok).toBe(false);
  });

  it("strips values that would be unsafe to render: unknown image hosts and non-Maps links", () => {
    const result = parseBackupFile(
      JSON.stringify({
        format: "buildtrip-trip-backup",
        version: 1,
        trip: { id: "t", name: "T", subtitle: "", startDate: "2026-06-10", endDate: "2026-06-15", heroImage: "https://evil.example.com/x.jpg" },
        customStops: [{ ...stop, photoUrl: "https://evil.example.com/x.jpg", category: "not-a-category", unexpected: "field" }],
        overrides: {
          day0: { routeUrl: "javascript:alert(1)" },
          day1: { routeUrl: "https://www.google.com/maps/dir/a/b" },
          "day0-stop2": { photoUrl: "https://images.pexels.com/photos/1/x.jpeg", title: "Renamed" },
          "__proto__": { title: "x" },
          "not-a-key": { title: "x" },
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.trip.heroImage).toBeNull();
    expect(result.snapshot.customStops[0]).toMatchObject({ photoUrl: null, category: "other" });
    expect(result.snapshot.customStops[0]).not.toHaveProperty("unexpected");
    expect(result.snapshot.overrides.day0?.routeUrl).toBeNull();
    expect(result.snapshot.overrides.day1?.routeUrl).toContain("google.com/maps");
    expect(result.snapshot.overrides["day0-stop2"]).toMatchObject({ photoUrl: "https://images.pexels.com/photos/1/x.jpeg", title: "Renamed" });
    expect(Object.keys(result.snapshot.overrides).sort()).toEqual(["day0", "day0-stop2", "day1"]);
  });
});
