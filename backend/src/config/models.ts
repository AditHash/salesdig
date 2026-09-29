/**
 * Central Gemini model configuration.
 * -----------------------------------
 * Keeping the model IDs in one place (instead of hardcoded across services)
 * means upgrading models is a single change, and each can be overridden per
 * environment without a code change.
 *
 * Default text model: `gemini-3-flash-preview` (fastest/cheapest of the options
 * tested — lower latency than the 3.5/3.6 "thinking" models). Overridable via env.
 *
 * Notes (Gemini docs, 2026-07):
 *  - Output token limit is 65,536 across gemini-3-flash-preview / 3.5-flash /
 *    3.6-flash — switching models does NOT raise the output cap. (generateRecommendations
 *    is split into two smaller parallel calls to stay under it.)
 *  - Latency: 3.5-flash / 3.6-flash are "thinking" models → noticeably slower per
 *    call, especially with Google Search grounding. 3-flash-preview is faster.
 *  - Cost per 1M tokens (Standard): 3-flash-preview = $0.50 in / $3.00 out;
 *    3.6-flash = $1.50 in / $7.50 out; 3.5-flash = $1.50 in / $9.00 out;
 *    3.5-flash-lite = $0.30 in / $2.50 out.
 *  - If 3-flash-preview is ever deprecated, override with
 *    GEMINI_TEXT_MODEL=gemini-3.6-flash (newest stable).
 */

export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-3-flash-preview";

export const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";
