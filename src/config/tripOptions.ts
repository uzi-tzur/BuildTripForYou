/** PRD Section 23 "Create Trip" field options. */
export const INTEREST_OPTIONS = [
  "Nature",
  "Hiking",
  "Beaches",
  "Museums",
  "Food",
  "History",
  "Shopping",
  "Family",
  "Adventure",
  "Photography",
  "Nightlife",
] as const;

export const TRAVELER_TYPE_OPTIONS = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "family", label: "Family" },
  { value: "road-trip", label: "Road Trip" },
  { value: "group", label: "Group" },
] as const;

export const TRANSPORTATION_OPTIONS = [
  { value: "driving", label: "Driving" },
  { value: "flying", label: "Flying" },
  { value: "transit", label: "Public Transit" },
  { value: "mixed", label: "Mixed" },
] as const;

export const PACE_OPTIONS = [
  { value: "relaxed", label: "Relaxed" },
  { value: "moderate", label: "Moderate" },
  { value: "packed", label: "Packed" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "low", label: "Budget-friendly" },
  { value: "medium", label: "Moderate" },
  { value: "high", label: "Splurge" },
] as const;
