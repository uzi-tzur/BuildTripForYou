/**
 * The trip's "before you go" checklist — gear to pack and things to get
 * done ahead of time — filled in by the user. It's stored as a trip-level
 * entry in the per-trip stop overrides (key PREP_CHECKLIST_KEY, same idea as
 * the `day${index}` route links), so it's saved on the device, synced to the
 * cloud and included in backups with no schema change.
 */
export type ChecklistSection = "gear" | "prep";

export interface ChecklistItem {
  id: string;
  section: ChecklistSection;
  text: string;
  done: boolean;
}

/** Can't collide with a stop id (`${date}-${index}`) or a day entry (`day${index}`). */
export const PREP_CHECKLIST_KEY = "prep";

export const CHECKLIST_SECTIONS: { id: ChecklistSection; label: string; icon: string; placeholder: string }[] = [
  { id: "gear", label: "Gear to pack", icon: "🎒", placeholder: "e.g. Hiking boots, rain jacket, chargers" },
  { id: "prep", label: "Things to do before the trip", icon: "📝", placeholder: "e.g. Renew passport, book rental car" },
];

export const MAX_CHECKLIST_ITEMS = 300;
export const MAX_CHECKLIST_TEXT = 200;

export function generateChecklistId(): string {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Rebuilds a checklist from untrusted data (cloud row, backup file), dropping anything malformed. */
export function sanitizeChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  const items: ChecklistItem[] = [];
  for (const raw of value.slice(0, MAX_CHECKLIST_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const { id, section, text, done } = raw as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 100) continue;
    if (section !== "gear" && section !== "prep") continue;
    if (typeof text !== "string" || !text.trim()) continue;
    items.push({ id, section, text: text.trim().slice(0, MAX_CHECKLIST_TEXT), done: done === true });
  }
  return items;
}
