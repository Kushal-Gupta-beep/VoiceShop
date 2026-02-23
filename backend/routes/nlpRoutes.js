/**
 * nlpRoutes.js — Express routes for shopping list + NLP + multilingual
 *
 * Pipeline for POST /api/process:
 *  1. Receive { text, lang } (lang = BCP-47 tag, e.g. "hi-IN", "es-ES")
 *  2. If lang is not English → translate text to English via Helsinki-NLP
 *  3. Parse intent from (now-English) text
 *  4. Apply to shopping list (ADD/REMOVE) or search catalog (SEARCH)
 *  5. Return structured response to frontend
 *
 * Routes:
 *  POST   /api/process      — Main NLP endpoint
 *  GET    /api/list         — Fetch shopping list + suggestions
 *  DELETE /api/list         — Clear shopping list
 *  GET    /api/suggestions  — Smart suggestions
 *  GET    /api/search       — Direct catalog search with query params
 *  GET    /api/languages    — List supported languages
 */

const express = require("express");
const router = express.Router();

const { parseIntent } = require("../services/intentParser");
const { translateToEnglish } = require("../services/translationService");
const { getSuggestions, handleAdviceQuestion } = require("../services/suggestionService");
const { extractPriceConstraint } = require("../services/searchService");
const store = require("../data/store");
const { searchCatalog } = require("../data/catalog");

// ---------------------------------------------------------------------------
// GET /api/languages — list supported languages for the UI dropdown
// ---------------------------------------------------------------------------
router.get("/languages", (_req, res) => {
    res.json({
        languages: [
            { code: "en-US", label: "🇺🇸 English", flag: "🇺🇸" },
            { code: "hi-IN", label: "🇮🇳 Hindi", flag: "🇮🇳" },
            { code: "es-ES", label: "🇪🇸 Spanish", flag: "🇪🇸" },
            { code: "fr-FR", label: "🇫🇷 French", flag: "🇫🇷" },
            { code: "de-DE", label: "🇩🇪 German", flag: "🇩🇪" },
            { code: "ar-SA", label: "🇸🇦 Arabic", flag: "🇸🇦" },
        ],
    });
});

// ---------------------------------------------------------------------------
// POST /api/process — Main intent processing endpoint
// Body: { text: string, lang?: string }
//   lang is BCP-47 e.g. "hi-IN". Defaults to "en-US" if omitted.
// ---------------------------------------------------------------------------
router.post("/process", async (req, res) => {
    const { text, lang = "en-US" } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
        return res.status(400).json({ error: "Request body must contain a non-empty 'text' field." });
    }

    console.log(`[/api/process] lang="${lang}" text="${text}"`);

    // ── Step 1: Translate to English if needed ──────────────────────────────
    let englishText = text;
    let wasTranslated = false;
    let translationNote = null;

    try {
        const result = await translateToEnglish(text.trim(), lang);
        englishText = result.translatedText;
        wasTranslated = result.wasTranslated;
        if (wasTranslated) {
            translationNote = `Translated from "${lang}": "${englishText}"`;
            console.log(`[/api/process] ${translationNote}`);
        }
    } catch (translErr) {
        console.warn(`[/api/process] Translation error: ${translErr.message}`);
        // Continue with original text
    }

    // ── Step 2: Parse intent via LLM ────────────────────────────────────────
    // If the LLM call fails (network error, HF down, invalid JSON output),
    // we return a 503 so the frontend can show a clear "LLM not available" message.
    let intent;
    try {
        intent = await parseIntent(englishText);
    } catch (err) {
        console.error(`[/api/process] LLM failed: ${err.message}`);
        return res.status(503).json({
            error: "LLM not available",
            details: err.message,
            hint: "Check your HF_API_KEY in .env and ensure the Hugging Face API is reachable.",
        });
    }

    console.log(`[/api/process] Parsed intent:`, intent);

    if (intent.intent === "UNKNOWN" || !intent.item) {
        // --- NEW: Check if this is an advice/suggestion question before falling back ---
        const adviceMatch = handleAdviceQuestion(englishText);

        if (adviceMatch) {
            // Re-route it to be a suggestion response!
            // adviceMatch is now: { type: "SUBSTITUTE"|"HISTORY"|"SEASONAL", category, suggestions, message }
            return res.json({
                intent: { ...intent, intent: "SUGGEST_ITEMS", category: adviceMatch.category },
                type: adviceMatch.type, // Explicitly pass the new type for the frontend/client
                message: adviceMatch.message,
                originalText: text,
                translatedText: wasTranslated ? englishText : null,
                list: store.getList(),
                suggestions: adviceMatch.suggestions // Return the specific suggestions here
            });
        }

        // --- NEW: Detect Generic / Category-Level Search Queries BEFORE failing ---
        const qText = englishText.toLowerCase();
        const isStaples = qText.includes("basic") || qText.includes("staple");
        const isHousehold = qText.includes("household") || qText.includes("cleaning");
        const isEssential = qText.includes("daily need") || qText.includes("essential") || qText.includes("groceries") || qText.includes("grocery") || qText.includes("food");

        let genericMatch = null;
        if (isStaples) {
            genericMatch = { category: "staples", results: ["rice", "flour", "sugar", "salt", "cooking oil"], message: "Here are some basic grocery items you may need" };
        } else if (isHousehold) {
            genericMatch = { category: "household", results: ["detergent", "soap", "toothpaste", "toilet paper"], message: "Here are some common household items for your needs" };
        } else if (isEssential) {
            genericMatch = { category: "essentials", results: ["rice", "milk", "eggs", "bread", "cooking oil"], message: "Here are some essential groceries you may need" };
        }

        if (genericMatch) {
            return res.json({
                intent: { intent: "SEARCH_ITEM", item: text, quantity: null, language: "en", source: "rule-based" },
                searchType: "GENERIC",
                category: genericMatch.category,
                results: genericMatch.results,
                message: genericMatch.message,
                originalText: text,
                translatedText: wasTranslated ? englishText : null,
                list: store.getList()
            });
        }

        // --- Original fallback for truly unknown/random inputs ---
        return res.json({
            intent,
            message: "Sorry, I could not understand that command.",
            originalText: text,
            translatedText: wasTranslated ? englishText : null,
            list: store.getList(),
        });
    }

    // ── Step 3: Apply intent ─────────────────────────────────────────────────
    let message = "";
    let affectedItem = null;

    switch (intent.intent) {
        case "ADD_ITEM": {
            const qty = intent.quantity || 1;
            affectedItem = store.addItem(intent.item, qty, intent.category);
            message = `Added ${qty}× "${affectedItem.name}" to your list (${affectedItem.category}).`;
            break;
        }
        case "REMOVE_ITEM": {
            affectedItem = store.removeItem(intent.item);
            message = affectedItem
                ? `Removed "${affectedItem.name}" from your list.`
                : `"${intent.item}" was not found in your list.`;
            break;
        }
        case "SEARCH_ITEM": {
            const q = (intent.item || "").toLowerCase();

            // -------------------------------------------------------------
            // 1. Secondary check for generic category
            // -------------------------------------------------------------
            const isStaples = q.includes("basic") || q.includes("staple");
            const isHousehold = q.includes("household") || q.includes("cleaning");
            const isEssential = q.includes("daily need") || q.includes("essential") || q.includes("groceries") || q.includes("grocery") || q.includes("food");

            let genericSearchResult = null;
            if (isStaples) {
                genericSearchResult = { category: "staples", results: ["rice", "flour", "sugar", "salt", "cooking oil"], message: "Here are some basic grocery items you may need" };
            } else if (isHousehold) {
                genericSearchResult = { category: "household", results: ["detergent", "soap", "toothpaste", "toilet paper"], message: "Here are some common household items for your needs" };
            } else if (isEssential) {
                genericSearchResult = { category: "essentials", results: ["rice", "milk", "eggs", "bread", "cooking oil"], message: "Here are some essential groceries you may need" };
            }

            if (genericSearchResult) {
                return res.json({
                    intent, // Use the parsed intent here
                    searchType: "GENERIC",
                    category: genericSearchResult.category,
                    results: genericSearchResult.results,
                    message: genericSearchResult.message,
                    originalText: text,
                    translatedText: wasTranslated ? englishText : null,
                    list: store.getList()
                });
            }

            // -------------------------------------------------------------
            // 2. Perform regular Catalog Search for Specific Items
            // -------------------------------------------------------------
            // Parse for explicit price constraints natively (bypassing LLM limits)
            const priceConstraint = extractPriceConstraint(englishText);

            const filters = {
                brand: intent.brand || null,
                maxPrice: intent.maxPrice != null ? intent.maxPrice : null,
                minPrice: intent.minPrice != null ? intent.minPrice : null,
                size: intent.size || null,
                qualifier: intent.qualifier || null,
            };

            // Override LLM filters if regex found a strict price condition
            if (priceConstraint) {
                if (priceConstraint.operator === "LESS_THAN") filters.maxPrice = priceConstraint.value;
                if (priceConstraint.operator === "GREATER_THAN") filters.minPrice = priceConstraint.value;
                if (priceConstraint.operator === "EQUAL") {
                    filters.maxPrice = priceConstraint.value;
                    filters.minPrice = priceConstraint.value;
                }
            }

            const catalogResults = searchCatalog(intent.item, filters);
            const listResults = store.searchItems(intent.item);

            const filterParts = [];
            if (filters.brand) filterParts.push(`brand: ${filters.brand}`);
            if (filters.maxPrice != null) filterParts.push(`under $${filters.maxPrice}`);
            if (filters.minPrice != null) filterParts.push(`above $${filters.minPrice}`);
            if (filters.size) filterParts.push(`size: ${filters.size}`);
            if (filters.qualifier) filterParts.push(filters.qualifier);
            const filterSummary = filterParts.length ? ` (${filterParts.join(", ")})` : "";

            message = catalogResults.length > 0
                ? `Found ${catalogResults.length} product(s) for "${intent.item}"${filterSummary}.`
                : `No products found for "${intent.item}"${filterSummary}.`;

            return res.json({
                intent, message,
                priceFilter: priceConstraint || null,
                catalogResults, listResults, filters,
                originalText: text,
                translatedText: wasTranslated ? englishText : null,
                list: store.getList(),
            });
        }
    }

    const suggestions = getSuggestions(intent.intent === "ADD_ITEM" ? intent.item : null);
    return res.json({
        intent, message, affectedItem,
        originalText: text,
        translatedText: wasTranslated ? englishText : null,
        list: store.getList(),
        suggestions,
    });
});

// ---------------------------------------------------------------------------
// GET /api/search — Direct catalog search via query params
// ---------------------------------------------------------------------------
router.get("/search", (req, res) => {
    const { q, brand, maxPrice, minPrice, size, qualifier } = req.query;
    if (!q) return res.status(400).json({ error: "Query param 'q' is required." });

    const filters = {
        brand: brand || null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        size: size || null,
        qualifier: qualifier || null,
    };
    const results = searchCatalog(q, filters);
    res.json({ query: q, filters, results, count: results.length });
});

// ---------------------------------------------------------------------------
// GET /api/list
// ---------------------------------------------------------------------------
router.get("/list", (_req, res) => {
    res.json({ list: store.getList(), suggestions: getSuggestions() });
});

// ---------------------------------------------------------------------------
// DELETE /api/list
// ---------------------------------------------------------------------------
router.delete("/list", (_req, res) => {
    store.clearList();
    res.json({ message: "Shopping list cleared.", list: [] });
});

// ---------------------------------------------------------------------------
// GET /api/suggestions
// ---------------------------------------------------------------------------
router.get("/suggestions", (req, res) => {
    res.json(getSuggestions(req.query.item || null));
});

module.exports = router;
