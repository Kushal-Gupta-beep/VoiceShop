/**
 * intentParser.js — NLP intent extraction via Hugging Face LLM
 *
 * ONLY uses google/flan-t5-base via the free Hugging Face Inference API.
 * There is no regex/rule-based fallback — if the LLM call fails, an error
 * is thrown and the route handler returns a clear "LLM not available" message.
 *
 * PIPELINE:
 *  1. buildPrompt(userText) — prompt engineering: tells the LLM what JSON to return
 *  2. query(prompt)         — sends the prompt to flan-t5-base via hfClient.js
 *  3. Parse + validate the JSON the LLM returns
 *  4. On any failure → throw (handled by nlpRoutes.js)
 */

const { query } = require("./hfClient");

// ---------------------------------------------------------------------------
// PROMPT ENGINEERING
//
// This is the core of the NLP system. The prompt is designed to:
//  - Tell the LLM to respond ONLY with valid JSON (no prose)
//  - Define all required and optional fields precisely
//  - Give explicit examples of varied phrasings mapped to intents
//  - Constrain the intent enum so the output is always structured
//
// Supported intents:
//  ADD_ITEM    — "Add milk", "I need apples", "Put bananas on my list"
//  REMOVE_ITEM — "Remove milk", "Take apples off my list"
//  SEARCH_ITEM — "Find toothpaste", "Search for organic apples under $5"
// ---------------------------------------------------------------------------

function buildPrompt(userText) {
    return (
        `You are a shopping assistant. Extract the shopping intent from the sentence below.\n` +
        `Respond ONLY with valid JSON — no explanation, no extra text.\n\n` +
        `JSON schema:\n` +
        `{\n` +
        `  "intent": "ADD_ITEM" | "REMOVE_ITEM" | "SEARCH_ITEM" | "UNKNOWN",\n` +
        `  "item": string | null,   // the product name in English, or null if UNKNOWN\n` +
        `  "quantity": number | null,\n` +
        `  "language": string       // ISO 639-1 code of the input language, e.g. "en", "hi", "es"\n` +
        `}\n\n` +
        `Phrase mapping rules:\n` +
        `  "Add X" / "I need X" / "I want X" / "Put X in my list" / "Get me X" → ADD_ITEM\n` +
        `  "Remove X" / "Delete X" / "Take X off" / "I don't need X" → REMOVE_ITEM\n` +
        `  "Find X" / "Search X" / "Look for X" / "Show me X" → SEARCH_ITEM\n` +
        `  Generic statements, greetings, questions un-related to specific items → UNKNOWN\n\n` +
        `Examples:\n` +
        `  "Add milk"                    → {"intent":"ADD_ITEM","item":"milk","quantity":null,"language":"en"}\n` +
        `  "I need apples"               → {"intent":"ADD_ITEM","item":"apples","quantity":null,"language":"en"}\n` +
        `  "Put bananas on my list"      → {"intent":"ADD_ITEM","item":"bananas","quantity":null,"language":"en"}\n` +
        `  "I want to buy 3 eggs"        → {"intent":"ADD_ITEM","item":"eggs","quantity":3,"language":"en"}\n` +
        `  "Remove milk from my list"    → {"intent":"REMOVE_ITEM","item":"milk","quantity":null,"language":"en"}\n` +
        `  "Find toothpaste"             → {"intent":"SEARCH_ITEM","item":"toothpaste","quantity":null,"language":"en"}\n` +
        `  "दूध चाहिए"                   → {"intent":"ADD_ITEM","item":"milk","quantity":null,"language":"hi"}\n` +
        `  "Necesito manzanas"           → {"intent":"ADD_ITEM","item":"apples","quantity":null,"language":"es"}\n\n` +
        `Sentence: "${userText}"\n` +
        `JSON:`
    );
}

// ---------------------------------------------------------------------------
// LLM CALL
//
// Sends the engineered prompt to flan-t5-base and parses the response.
// Throws a detailed error if the response is not valid JSON or missing fields.
// The caller (parseIntent) will propagate this error — there is no fallback.
// ---------------------------------------------------------------------------

async function extractIntentViaLLM(userText) {
    // Call free Hugging Face Inference API (flan-t5-base)
    const raw = await query(buildPrompt(userText));

    // Extract the JSON object from the raw model output
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error(`LLM returned no JSON. Raw output: "${raw}"`);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const validIntents = ["ADD_ITEM", "REMOVE_ITEM", "SEARCH_ITEM", "UNKNOWN"];
    if (!validIntents.includes(parsed.intent)) {
        throw new Error(`LLM returned invalid intent: "${parsed.intent}"`);
    }

    // For specific intents, item must be a valid string. For UNKNOWN, it can be null/empty.
    if (parsed.intent !== "UNKNOWN") {
        if (!parsed.item || typeof parsed.item !== "string" || parsed.item.trim() === "") {
            throw new Error(`LLM returned missing or invalid "item" field for intent ${parsed.intent}`);
        }
    }

    return {
        intent: parsed.intent,
        item: parsed.item ? parsed.item.toLowerCase().trim() : null,
        quantity: typeof parsed.quantity === "number" ? parsed.quantity : null,
        language: parsed.language || "en",   // ISO 639-1 code detected by the LLM
    };
}

// ---------------------------------------------------------------------------
// MAIN EXPORT
//
// parseIntent() is the single entry point used by nlpRoutes.js.
// If the LLM call or JSON parsing fails for any reason, we throw — the route
// handler catches this and returns a 503 "LLM not available" response.
// ---------------------------------------------------------------------------

/**
 * Parse shopping intent from text using the LLM.
 *
 * @param {string} text - English text (already translated if needed)
 * @returns {Promise<{intent, item, quantity, language}>}
 * @throws {Error} if LLM fails or returns invalid output
 */
async function parseIntent(text) {
    // Will throw if the HF API is unreachable, returns bad JSON, or rate-limits us
    const result = await extractIntentViaLLM(text);
    return { ...result, source: "llm" };
}

module.exports = { parseIntent };
