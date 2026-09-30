import { describe, expect, it } from "vitest";
import { SEED_TRIP, withSeedTrip, type TripMeta } from "./trips";

const OLD_SUBTITLE = "Rocky Mountain road trip — aspen gold, hot springs, and a legendary staircase.";

describe("withSeedTrip", () => {
  it("has no subtitle on the built-in trip", () => {
    expect(withSeedTrip([])[0]?.subtitle).toBe("");
  });

  it("drops the retired built-in subtitle from saved copies, keeping subtitles the user typed", () => {
    const savedSeed: TripMeta = { ...SEED_TRIP, subtitle: OLD_SUBTITLE, heroImage: "https://abc.supabase.co/storage/v1/object/public/trip-photos/x.jpg" };
    const duplicate: TripMeta = { ...SEED_TRIP, id: "colorado-in-the-fall-1234", isSeed: false, subtitle: OLD_SUBTITLE };
    const ownTrip: TripMeta = { ...SEED_TRIP, id: "smokies-5678", isSeed: false, sourceContent: undefined, subtitle: "Cabin week with the kids" };

    const [seed, copy, own] = withSeedTrip([savedSeed, duplicate, ownTrip]);
    expect(seed).toMatchObject({ id: SEED_TRIP.id, subtitle: "", heroImage: savedSeed.heroImage });
    expect(copy?.subtitle).toBe("");
    expect(own?.subtitle).toBe("Cabin week with the kids");
  });
});
