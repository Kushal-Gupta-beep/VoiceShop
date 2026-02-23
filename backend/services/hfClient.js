/**
 * hfClient.js — Hugging Face Inference API wrapper
 *
 * Uses the FREE Hugging Face Inference API via the new router endpoint.
 * HF migrated from api-inference.huggingface.co (now 410 Gone) to
 * router.huggingface.co which exposes an OpenAI-compatible chat completions API.
 *
 * We use google/flan-t5-base which handles text2text-generation tasks well.
 * Set HF_API_KEY in your .env file (free token from huggingface.co/settings/tokens).
 */

const axios = require("axios");

// The model used for NLP intent extraction — must be a chat model for the new HF router
const MODEL_ID = "Qwen/Qwen2.5-72B-Instruct";

// New HF router endpoint — OpenAI-compatible chat completions API
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";

/**
 * Send a prompt to the Hugging Face Inference API using the chat completions format.
 * The prompt is sent as a "user" message and the model's reply is returned as a string.
 *
 * @param {string} prompt - The full prompt string (our engineered instruction)
 * @returns {Promise<string>} The model's text output
 */
async function query(prompt) {
    const apiKey = process.env.HF_API_KEY;

    if (!apiKey) {
        throw new Error(
            "HF_API_KEY is not set. Please add it to your .env file."
        );
    }

    const payload = {
        model: MODEL_ID,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        max_tokens: 200,       // Keep response concise — we only need a small JSON object
        temperature: 0.1,      // Low temperature = deterministic, JSON-friendly output
        stream: false,
    };

    try {
        const response = await axios.post(HF_API_URL, payload, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,    // 30-second timeout to handle cold-start model loading
        });

        // OpenAI-compatible response: choices[0].message.content
        const result = response.data;
        const content = result?.choices?.[0]?.message?.content;
        if (content) {
            return content.trim();
        }

        throw new Error("Unexpected response shape from Hugging Face API");
    } catch (err) {
        // Re-throw with a clear message so the caller can return a 503
        if (err.response) {
            throw new Error(
                `HF API Error ${err.response.status}: ${JSON.stringify(err.response.data)}`
            );
        }
        throw err;
    }
}

module.exports = { query };
