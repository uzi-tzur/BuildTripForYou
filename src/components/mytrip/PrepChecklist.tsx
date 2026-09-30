"use client";

import { useState, type FormEvent } from "react";
import { Chevron } from "@/components/ui/Chevron";
import {
  CHECKLIST_SECTIONS,
  generateChecklistId,
  MAX_CHECKLIST_ITEMS,
  MAX_CHECKLIST_TEXT,
  type ChecklistItem,
  type ChecklistSection,
} from "@/lib/prepChecklist";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100";

function AddItemForm({ section, placeholder, onAdd }: { section: ChecklistSection; placeholder: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_CHECKLIST_TEXT}
        aria-label={`Add to ${section === "gear" ? "gear" : "preparations"}`}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="shrink-0 rounded-lg bg-brand-blue-500 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95 disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}

/** "Before you go": gear to pack and preparations, filled in and ticked off by the user. */
export function PrepChecklist({
  items,
  defaultOpen,
  onChange,
}: {
  items: ChecklistItem[];
  defaultOpen: boolean;
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const doneCount = items.filter((i) => i.done).length;

  function add(section: ChecklistSection, text: string) {
    if (items.length >= MAX_CHECKLIST_ITEMS) return;
    onChange([...items, { id: generateChecklistId(), section, text, done: false }]);
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div>
          <p className="font-bold text-slate-900">🧳 Packing &amp; prep checklist</p>
          <p className="text-xs text-slate-500">
            {items.length === 0 ? "Add the gear and preparations for this trip" : `${doneCount} of ${items.length} done`}
          </p>
        </div>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-100 px-4 pb-4 pt-3">
          {CHECKLIST_SECTIONS.map((section) => {
            const sectionItems = items.filter((i) => i.section === section.id);
            return (
              <div key={section.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {section.icon} {section.label}
                  {sectionItems.length > 0 && (
                    <span className="font-semibold normal-case text-slate-400">
                      {" "}
                      · {sectionItems.filter((i) => i.done).length}/{sectionItems.length}
                    </span>
                  )}
                </p>
                {sectionItems.length > 0 && (
                  <ul className="mt-1.5 divide-y divide-slate-100">
                    {sectionItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5 py-1.5">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => onChange(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
                          className="h-5 w-5 shrink-0 accent-brand-green-500"
                          aria-label={item.text}
                        />
                        <span className={`min-w-0 flex-1 break-words text-sm ${item.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                          aria-label={`Remove ${item.text}`}
                          className="shrink-0 rounded-full px-2 py-0.5 text-lg leading-none text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <AddItemForm section={section.id} placeholder={section.placeholder} onAdd={(text) => add(section.id, text)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
