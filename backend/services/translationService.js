/**
 * translationService.js — Multilingual translation using Hugging Face (free tier)
 *
 * Uses Helsinki-NLP opus-mt models which are entirely free on HF Inference API.
 * These models translate from a source language to English so the rest
 * of the NLP pipeline (intent parser) can work in English only.
 *
 * Supported languages:
 *  hi  → Hindi     (Helsinki-NLP/opus-mt-hi-en)
 *  es  → Spanish   (Helsinki-NLP/opus-mt-es-en)
 *  fr  → French    (Helsinki-NLP/opus-mt-fr-en)
 *  de  → German    (Helsinki-NLP/opus-mt-de-en)
 *  ar  → Arabic    (Helsinki-NLP/opus-mt-ar-en)
 *  en  → English   (no translation needed)
 *
 * Falls back gracefully: if translation fails, returns the original text
 * so the rule-based parser still has a chance to work.
 */

const axios = require("axios");

// Map of BCP-47 language code prefix → Helsinki-NLP model ID
const TRANSLATION_MODELS = {
    hi: "Helsinki-NLP/opus-mt-hi-en",
    es: "Helsinki-NLP/opus-mt-es-en",
    fr: "Helsinki-NLP/opus-mt-fr-en",
    de: "Helsinki-NLP/opus-mt-de-en",
    ar: "Helsinki-NLP/opus-mt-ar-en",
    // Add more as needed: pt, it, zh, ja, ko, etc.
};

/**
 * Detect the 2-letter language prefix from a BCP-47 tag.
 * e.g. "hi-IN" → "hi", "es-ES" → "es", "en-US" → "en"
 * @param {string} langTag - BCP-47 language tag from the browser
 * @returns {string} 2-letter ISO 639-1 code
 */
function getLangPrefix(langTag) {
    if (!langTag) return "en";
    return langTag.split("-")[0].toLowerCase();
}

/**
 * Translate text to English using the appropriate Helsinki-NLP model.
 *
 * @param {string} text       - Text in source language
 * @param {string} langTag    - BCP-47 tag (e.g. "hi-IN", "es-ES")
 * @returns {Promise<{translatedText: string, wasTranslated: boolean}>}
 */
async function translateToEnglish(text, langTag) {
    const langCode = getLangPrefix(langTag);

    // No translation needed for English
    if (langCode === "en" || !langTag) {
        return { translatedText: text, wasTranslated: false };
    }

    const modelId = TRANSLATION_MODELS[langCode];

    // If we don't have a model for this language, return original and warn
    if (!modelId) {
        console.warn(`[translationService] No model for lang "${langCode}". Using original text.`);
        return { translatedText: text, wasTranslated: false };
    }

    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) {
        console.warn("[translationService] HF_API_KEY not set. Skipping translation.");
        return { translatedText: text, wasTranslated: false };
    }

    // HF migrated to router.huggingface.co (old api-inference endpoint is 410 Gone)
    const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;

    try {
        const response = await axios.post(
            url,
            {
                inputs: text,
                options: { wait_for_model: true }, // handles cold-start model loading
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        // opus-mt models return [{ translation_text: "..." }]
        const result = response.data;
        if (Array.isArray(result) && result[0]?.translation_text) {
            const translated = result[0].translation_text.trim();
            console.log(`[translationService] "${text}" → (${langCode}→en) → "${translated}"`);
            return { translatedText: translated, wasTranslated: true };
        }

        throw new Error("Unexpected translation response shape");
    } catch (err) {
        console.warn(
            `[translationService] Translation failed for lang "${langCode}": ${err.message}. Using original text.`
        );
        // Graceful fallback — let the rule-based parser try with the original
        return { translatedText: text, wasTranslated: false };
    }
}

module.exports = { translateToEnglish, getLangPrefix, TRANSLATION_MODELS };
