/**
 * Colorado, Sep 2026 — a real trip, hand-entered from the traveler's own
 * itinerary document. This is intentionally NOT modeled through the
 * multi-tenant Trip/Activity database — it's a single, personal,
 * no-login trip companion (see src/app/my-trip). All timestamps carry
 * explicit UTC offsets (Dallas legs = America/Chicago CDT -05:00,
 * everything in Colorado = America/Denver MDT -06:00) so "what's
 * happening now" comparisons are correct regardless of the viewer's
 * own device timezone.
 */

export type StopKind = "flight" | "drive" | "hotel" | "meal" | "activity" | "shopping";

export interface TripStop {
  time: string | null; // ISO 8601 with offset, or null if not time-fixed
  timeLabel: string; // human display, e.g. "7:05 AM (Dallas time)"
  title: string;
  description?: string;
  address?: string; // used to build a Google Maps directions link
  kind: StopKind;
  confirmation?: string;
  cost?: string;
  warning?: string; // rendered as a highlighted callout
  tip?: string;
  /**
   * Which of the day's weatherLocations this stop's weather should show —
   * set only on outdoor/town stops where the forecast actually matters
   * (hikes, overlooks, walking a town), not every stop. Must match a
   * `name` in that day's weatherLocations.
   */
  weatherLocationName?: string;
  /** Set on an actual flight (not the "Land in …" marker) — what a live flight-status lookup is keyed on. */
  flight?: FlightInfo;
}

export interface FlightInfo {
  airline: string; // IATA code, e.g. "AA"
  flightNumber: string; // digits, e.g. "1523"
  departureAirport: string;
  arrivalAirport: string;
  /**
   * Scheduled landing as a time of day with the arrival airport's UTC offset
   * ("08:10:00-06:00"). Same calendar date as the departure — kept as a
   * clock rather than a full timestamp so it doesn't need shifting when the
   * trip's dates move.
   */
  arrivalClock: string;
}

export interface TripDay {
  date: string; // YYYY-MM-DD, trip-local
  dayLabel: string;
  title: string;
  /**
   * Named places worth checking weather for on this day — e.g. a driving
   * day that passes through more than one town. Empty for a freshly
   * created trip with no itinerary yet.
   */
  weatherLocations: { name: string; latitude: number; longitude: number }[];
  stops: TripStop[];
}

export const TRIP_META = {
  title: "Colorado in the Fall",
  subtitle: "Rocky Mountain road trip — aspen gold, hot springs, and a legendary staircase.",
  startDate: "2026-09-27",
  endDate: "2026-09-30",
};

export const COLORADO_TRIP_DAYS: TripDay[] = [
  {
    date: "2026-09-27",
    dayLabel: "Day 1 · Sunday, Sep 27",
    title: "Departure & Colorado Springs",
    weatherLocations: [{ name: "Colorado Springs", latitude: 38.8339, longitude: -104.8214 }],
    stops: [
      {
        time: "2026-09-27T05:30:00-05:00",
        timeLabel: "5:30 AM (Dallas time)",
        title: "Arrive at DFW parking",
        description: "DFW Remote North — arriving this early keeps security stress-free for the 7:05 AM flight.",
        address: "DFW Remote North, 2200 N Airfield Dr, DFW Airport, TX",
        kind: "drive",
        confirmation: "Parking confirmation: 1594544",
      },
      {
        time: "2026-09-27T07:05:00-05:00",
        timeLabel: "7:05 AM (Dallas time)",
        title: "Flight AA 1523 — DFW → DEN",
        kind: "flight",
        confirmation: "Confirmation code: SBLIQA",
        flight: { airline: "AA", flightNumber: "1523", departureAirport: "DFW", arrivalAirport: "DEN", arrivalClock: "08:10:00-06:00" },
      },
      {
        time: "2026-09-27T08:10:00-06:00",
        timeLabel: "8:10 AM (Denver time, estimated)",
        title: "Land in Denver",
        description: "Pick up the rental car.",
        kind: "flight",
      },
      {
        time: null,
        timeLabel: "After landing",
        title: "Walmart stop",
        description: "Grab trip supplies before heading south.",
        address: "3301 Tower Rd, Aurora, CO 80011",
        kind: "shopping",
      },
      {
        time: "2026-09-27T12:30:00-06:00",
        timeLabel: "12:30 PM",
        title: "Check in — TownePlace Suites Colorado Springs Garden of the Gods",
        address: "4760 Centennial Blvd, Colorado Springs, CO",
        kind: "hotel",
        confirmation: "Confirmation: 89237888 · 27,000 points",
        tip: "Free cancellation until Fri, Sep 25.",
      },
      {
        time: "2026-09-27T13:00:00-06:00",
        timeLabel: "1:00 PM",
        title: "Lunch in Manitou Springs",
        description: "The picturesque town at the base of the Incline.",
        address: "Manitou Springs, CO",
        kind: "meal",
        weatherLocationName: "Colorado Springs",
      },
      {
        time: "2026-09-27T13:30:00-06:00",
        timeLabel: "1:30 PM – 6:00 PM",
        title: "Manitou Incline",
        description:
          "2,768 steep steps — an iconic physical challenge. Estimated total time 3–4.5 hours including the descent.",
        address: "Manitou Incline, Manitou Springs, CO",
        kind: "activity",
        confirmation: "Order ID 917916 · Transaction ID 856291",
        warning:
          "You must descend via Barr Trail (~3.6 km, 60–90 extra minutes) — descending the Incline itself is prohibited (dangerous, worn, and causes foot-traffic jams). A timed reservation is required in advance.",
        weatherLocationName: "Colorado Springs",
      },
    ],
  },
  {
    date: "2026-09-28",
    dayLabel: "Day 2 · Monday, Sep 28",
    title: "Breckenridge → Steamboat Springs & the hot springs",
    weatherLocations: [
      { name: "Breckenridge", latitude: 39.4817, longitude: -106.0384 },
      { name: "Steamboat Springs", latitude: 40.485, longitude: -106.8317 },
    ],
    stops: [
      {
        time: "2026-09-28T08:30:00-06:00",
        timeLabel: "8:30 – 11:00 AM",
        title: "Drive to Breckenridge",
        description: "About 2 hours.",
        kind: "drive",
      },
      {
        time: "2026-09-28T11:00:00-06:00",
        timeLabel: "11:00 AM – 1:00 PM",
        title: "Breckenridge — town walk & lunch",
        address: "Breckenridge, CO",
        kind: "meal",
        weatherLocationName: "Breckenridge",
      },
      {
        time: "2026-09-28T13:30:00-06:00",
        timeLabel: "1:30 PM",
        title: "Sapphire Point Overlook",
        description:
          "Breathtaking panoramic views of Dillon Reservoir and the Tenmile Range — one of the best views for minimal effort.",
        address: "Sapphire Point Overlook, Dillon, CO",
        kind: "activity",
        weatherLocationName: "Breckenridge",
      },
      {
        time: "2026-09-28T14:00:00-06:00",
        timeLabel: "2:00 – 4:00 PM",
        title: "Drive to hotel — Residence Inn Steamboat Springs",
        address: "Steamboat Springs, CO",
        kind: "hotel",
        confirmation: "Confirmation: 89282859 · $151",
      },
      {
        time: null,
        timeLabel: "Late afternoon",
        title: "Steamboat Springs — town walk",
        address: "Steamboat Springs, CO",
        kind: "activity",
        weatherLocationName: "Steamboat Springs",
      },
      {
        time: "2026-09-28T17:30:00-06:00",
        timeLabel: "5:30 – 8:00 PM",
        title: "Strawberry Park Natural Hot Springs",
        description: "Time limit 2 hours.",
        address: "Strawberry Park Natural Hot Springs, Steamboat Springs, CO",
        kind: "activity",
        cost: "$30 per person",
        warning: "Cash only — no cards accepted.",
        weatherLocationName: "Steamboat Springs",
      },
    ],
  },
  {
    date: "2026-09-29",
    dayLabel: "Day 3 · Tuesday, Sep 29",
    title: "Red Rocks → Boulder → Golden",
    weatherLocations: [
      { name: "Boulder", latitude: 40.015, longitude: -105.2705 },
      { name: "Golden", latitude: 39.7555, longitude: -105.2211 },
    ],
    stops: [
      {
        time: "2026-09-29T13:00:00-06:00",
        timeLabel: "1:00 PM",
        title: "Red Rocks Amphitheatre",
        description: "The world-famous natural amphitheater — notice the unique acoustics and the rock geology around the stage.",
        address: "Red Rocks Amphitheatre, Morrison, CO",
        kind: "activity",
        weatherLocationName: "Golden",
      },
      {
        time: null,
        timeLabel: "Afternoon",
        title: "Boulder — lunch & Royal Arch Trail Head",
        description: "The lively college town, then a walk to the impressive Royal Arch Trail Head.",
        address: "Boulder, CO",
        kind: "activity",
        weatherLocationName: "Boulder",
      },
      {
        time: null,
        timeLabel: "Evening",
        title: "Check in — SpringHill Suites Denver West/Golden",
        description: 'Golden — a historic Gold Rush-era town, now the "beer capital" of Colorado.',
        address: "Golden, CO",
        kind: "hotel",
        confirmation: "Confirmation: 2UEKNF8N03 · 1 free-night award + 4,500 points",
      },
    ],
  },
  {
    date: "2026-09-30",
    dayLabel: "Day 4 · Wednesday, Sep 30",
    title: "Golden heritage & flight home",
    weatherLocations: [{ name: "Golden", latitude: 39.7555, longitude: -105.2211 }],
    stops: [
      {
        time: "2026-09-30T08:00:00-06:00",
        timeLabel: "8:00 – 10:00 AM",
        title: "Golden — local culture & industrial heritage",
        address: "Golden, CO",
        kind: "activity",
        weatherLocationName: "Golden",
      },
      {
        time: "2026-09-30T10:00:00-06:00",
        timeLabel: "10:00 – 10:30 AM",
        title: "Coors Brewery tour",
        description: "See how the world's largest single brewing site makes its beer.",
        address: "Coors Brewery, Golden, CO",
        kind: "activity",
      },
      {
        time: "2026-09-30T10:30:00-06:00",
        timeLabel: "10:30 AM",
        title: "Depart Golden for DEN",
        description: "About 40 minutes, but airport traffic/lines can be unpredictable — don't leave it later than this.",
        kind: "drive",
      },
      {
        time: "2026-09-30T13:17:00-06:00",
        timeLabel: "1:17 PM (Denver time)",
        title: "Flight AA 2359 — DEN → DFW",
        kind: "flight",
        flight: { airline: "AA", flightNumber: "2359", departureAirport: "DEN", arrivalAirport: "DFW", arrivalClock: "16:29:00-05:00" },
      },
      {
        time: "2026-09-30T16:29:00-05:00",
        timeLabel: "4:29 PM (Dallas time)",
        title: "Land at DFW",
        kind: "flight",
      },
      {
        time: "2026-09-30T17:30:00-05:00",
        timeLabel: "5:30 PM (Dallas time)",
        title: "Pick up the car",
        address: "DFW Remote North, 2200 N Airfield Dr, DFW Airport, TX",
        kind: "drive",
      },
    ],
  },
];
