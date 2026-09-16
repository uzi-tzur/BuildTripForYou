import Anthropic from "@anthropic-ai/sdk";

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null | undefined;

/**
 * Returns the Claude client if ANTHROPIC_API_KEY is set, else null so
 * callers fall back to a deterministic mock generator (PRD Rule 5 — the
 * fallback output is always clearly labeled, never presented as fact).
 */
export function getAnthropicClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
  return client;
}

export const CLAUDE_MODEL = "claude-sonnet-5";
