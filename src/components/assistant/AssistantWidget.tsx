"use client";

import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BRAND } from "@/config/brand";
import type { AssistantMessage } from "@/lib/ai/agents/assistant";

const SUGGESTED_PROMPTS = [
  "What should we do next?",
  "It's raining. What can we do instead?",
  "We are running late. Fix today's itinerary.",
];

/** PRD Section 30 — persistent AI Assistant, available on every trip screen. */
export function AssistantWidget() {
  const pathname = usePathname();
  const tripId = pathname?.match(/\/trips\/([^/]+)/)?.[1];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<AssistantMessage & { usedMockAi?: boolean }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(message: string) {
    if (!message.trim() || loading) return;
    setInput("");
    setLoading(true);
    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, tripId, history: messages.slice(-6) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Assistant is unavailable.");
      setMessages((prev) => [...prev, { role: "assistant", content: body.reply, usedMockAi: body.usedMockAi }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-500 text-2xl text-white shadow-lg hover:bg-brand-blue-600"
        aria-label="Open AI travel assistant"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 flex h-[480px] w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between bg-brand-blue-500 px-4 py-3 text-white">
        <span className="font-semibold">{BRAND.name} Assistant</span>
        <button onClick={() => setOpen(false)} aria-label="Close assistant">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Ask me anything about your trip.</p>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => send(prompt)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 hover:border-brand-blue-300 hover:text-brand-blue-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={
                m.role === "user"
                  ? "inline-block max-w-[85%] rounded-lg bg-brand-blue-500 px-3 py-2 text-sm text-white"
                  : "inline-block max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800"
              }
            >
              {m.content}
            </span>
            {m.usedMockAi && (
              <div className="mt-1">
                <DemoBadge label="Demo reply" />
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-slate-400">Thinking…</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
