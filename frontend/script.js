/**
 * script.js — Voice Shopping Assistant Frontend
 */

// ============================================================
// CONFIG
// Automatically use relative path when deployed with the backend, 
// or fallback to localhost if running index.html purely locally from the filesystem.
const IS_LOCAL_DEV = (window.location.hostname === "localhost" && window.location.port !== "3001") || window.location.protocol === "file:";
const API_BASE = IS_LOCAL_DEV ? "http://localhost:3001/api" : "/api";

const CATEGORY_ICONS = {
    "Fruits": "🍎",
    "Vegetables": "🥦",
    "Dairy": "🥛",
    "Bakery": "🍞",
    "Beverages": "☕",
    "Grains & Staples": "🌾",
    "Personal Care": "🧴",
    "Cleaning": "🧹",
    "General": "🛍️",
};

/**
 * Example command phrases shown per language to guide users.
 * The backend handles all of these via the NLP rules + LLM.
 */
const PHRASE_EXAMPLES = {
    "en-US": [
        "Add 2 litres of milk",
        "I need organic apples",
        "I want to buy bananas",
        "Find toothpaste under $4",
        "Remove onions from my list",
        "Get me some fresh spinach",
    ],
    "hi-IN": [
        "दूध चाहिए",
        "सेब जोड़ो",
        "प्याज हटाओ",
        "टूथपेस्ट खोजो",
    ],
    "es-ES": [
        "Agregar leche",
        "Necesito manzanas",
        "Quiero comprar plátanos",
        "Buscar pasta de dientes",
        "Eliminar cebollas",
    ],
    "fr-FR": [
        "Ajouter du lait",
        "J'ai besoin de pommes",
        "Je veux acheter des bananes",
        "Chercher du dentifrice",
        "Supprimer les oignons",
    ],
    "de-DE": [
        "Milch hinzufügen",
        "Ich brauche Äpfel",
        "Ich möchte Bananen kaufen",
        "Zahnpasta suchen",
        "Zwiebeln entfernen",
    ],
    "ar-SA": [
        "أضف الحليب",
        "أريد تفاح",
        "ابحث عن معجون أسنان",
        "احذف البصل",
    ],
};

// ============================================================
// DOM REFERENCES
// ============================================================

const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");
const transcriptPlaceholder = document.getElementById("transcriptPlaceholder");
const transcriptText = document.getElementById("transcriptText");
const translationNote = document.getElementById("translationNote");
const intentBox = document.getElementById("intentBox");
const intentContent = document.getElementById("intentContent");
const statusMsg = document.getElementById("statusMsg");
const listContainer = document.getElementById("listContainer");
const emptyState = document.getElementById("emptyState");
const itemCount = document.getElementById("itemCount");
const clearListBtn = document.getElementById("clearListBtn");
const manualInput = document.getElementById("manualInput");
const manualSubmitBtn = document.getElementById("manualSubmitBtn");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const seasonalSuggestions = document.getElementById("seasonalSuggestions");
const substituteSuggestions = document.getElementById("substituteSuggestions");
const substituteGroup = document.getElementById("substituteGroup");
const frequentSuggestions = document.getElementById("frequentSuggestions");
const langSelect = document.getElementById("langSelect");
const langStatus = document.getElementById("langStatus");
const phraseHints = document.getElementById("phraseHints");

// Search results
const searchResultsSection = document.getElementById("searchResultsSection");
const searchResultsMeta = document.getElementById("searchResultsMeta");
const activeFiltersEl = document.getElementById("activeFilters");
const catalogResultsGrid = document.getElementById("catalogResultsGrid");
const listMatchSection = document.getElementById("listMatchSection");
const listMatchItems = document.getElementById("listMatchItems");
const closeSearchBtn = document.getElementById("closeSearchBtn");

// ============================================================
// UI STATE MANAGEMENT
// ============================================================

const appState = {
    suggestions: { seasonal: [], substitutes: [], frequent: [] },
    searchResults: []
};

// ============================================================
// LANGUAGE MANAGEMENT
// ============================================================

/** The current BCP-47 language code, synced with the dropdown. */
let currentLang = "en-US";

/**
 * Fetch supported languages from the backend and populate the dropdown.
 * Falls back to a hardcoded list if the fetch fails.
 */
async function loadLanguages() {
    const fallback = [
        { code: "en-US", label: "🇺🇸 English" },
        { code: "hi-IN", label: "🇮🇳 Hindi" },
        { code: "es-ES", label: "🇪🇸 Spanish" },
        { code: "fr-FR", label: "🇫🇷 French" },
        { code: "de-DE", label: "🇩🇪 German" },
        { code: "ar-SA", label: "🇸🇦 Arabic" },
    ];

    let langs = fallback;
    try {
        const res = await fetch(`${API_BASE}/languages`);
        if (res.ok) {
            const data = await res.json();
            langs = data.languages;
        }
    } catch { /* Use fallback */ }

    langSelect.innerHTML = "";
    langs.forEach(({ code, label }) => {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = label;
        langSelect.appendChild(opt);
    });

    langSelect.value = currentLang;
    updatePhraseHints(currentLang);
}

/**
 * When user changes the language dropdown:
 *  - Update the SpeechRecognition language
 *  - Update the phrase hints band
 */
langSelect.addEventListener("change", () => {
    currentLang = langSelect.value;

    // Update the SpeechRecognition language for next recording
    if (recognition) {
        recognition.lang = currentLang;
        recognition.abort(); // abort any in-progress session
        setListeningState(false);
    }

    updatePhraseHints(currentLang);

    // Show a brief "Language set" status
    langStatus.textContent = "✓ Set";
    langStatus.classList.add("active");
    setTimeout(() => {
        langStatus.textContent = "";
        langStatus.classList.remove("active");
    }, 1500);
});

/**
 * Update the phrase hints band with example commands in the selected language.
 */
function updatePhraseHints(langCode) {
    const examples = PHRASE_EXAMPLES[langCode] || PHRASE_EXAMPLES["en-US"];
    phraseHints.innerHTML = `
    <p class="phrase-hints-title">✨ Try saying…</p>
    <div class="phrase-hints-list">
      ${examples.slice(0, 3).map((p) => `<span class="phrase-hint-item">${p}</span>`).join("")}
    </div>
  `;
}

// ============================================================
// WEB SPEECH API
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = currentLang;      // Starts with currently selected language
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        showTranscript(transcript);

        if (event.results[event.results.length - 1].isFinal) {
            processText(transcript);
        }
    };

    recognition.onend = () => setListeningState(false);

    recognition.onerror = (event) => {
        setListeningState(false);
        const messages = {
            "no-speech": "No speech detected. Please try again.",
            "audio-capture": "Microphone not found.",
            "not-allowed": "Microphone access denied.",
            "network": "Network error during speech recognition.",
            "language-not-supported": `Language "${currentLang}" not supported by your browser. Try English.`,
        };
        showStatus(messages[event.error] || `Speech error: ${event.error}`, "error");
    };
} else {
    micBtn.disabled = true;
    micStatus.textContent = "⚠️ Voice input not supported. Use manual input.";
    micStatus.style.color = "var(--accent-warn)";
}

// ============================================================
// MIC BUTTON
// ============================================================

micBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (isListening) {
        recognition.stop();
        setListeningState(false);
    } else {
        // Always refresh the lang before starting — user may have changed dropdown
        recognition.lang = currentLang;
        try {
            recognition.start();
            setListeningState(true);
            showStatus(`Listening in ${getLangLabel(currentLang)}…`, "info");
        } catch (e) {
            console.warn("SpeechRecognition.start() error:", e);
        }
    }
});

function setListeningState(listening) {
    isListening = listening;
    micBtn.classList.toggle("listening", listening);
    micBtn.classList.remove("processing");
    micBtn.querySelector(".mic-icon").textContent = listening ? "⏹️" : "🎙️";
    micStatus.textContent = listening
        ? `Listening in ${getLangLabel(currentLang)}… speak now`
        : "Click the mic to speak";
}

function setProcessingState(processing) {
    micBtn.classList.toggle("processing", processing);
    micBtn.disabled = processing;
}

/** Get the display label for a language code */
function getLangLabel(code) {
    const opt = langSelect.querySelector(`option[value="${code}"]`);
    return opt ? opt.textContent : code;
}

// ============================================================
// MANUAL COMMAND INPUT
// ============================================================

manualSubmitBtn.addEventListener("click", () => {
    const text = manualInput.value.trim();
    if (text) { processText(text); manualInput.value = ""; }
});

manualInput.addEventListener("keydown", (e) => { if (e.key === "Enter") manualSubmitBtn.click(); });

// ============================================================
// QUICK SEARCH BAR
// ============================================================

searchBtn.addEventListener("click", () => {
    const text = searchInput.value.trim();
    if (text) processText(`find ${text}`);
});

searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") searchBtn.click(); });

// ============================================================
// CLOSE SEARCH RESULTS
// ============================================================

closeSearchBtn.addEventListener("click", () => { searchResultsSection.hidden = true; });

// ============================================================
// CLEAR LIST
// ============================================================

clearListBtn.addEventListener("click", async () => {
    if (!confirm("Clear the entire shopping list?")) return;
    try {
        const res = await fetch(`${API_BASE}/list`, { method: "DELETE" });
        const data = await res.json();
        renderList(data.list);
        showStatus("Shopping list cleared.", "info");
    } catch {
        showStatus("Failed to clear the list.", "error");
    }
});

// ============================================================
// CORE: Send text → backend → handle response
// ============================================================

/**
 * Send voice/typed text to the backend for processing.
 * Also passes the current language code so the backend can translate.
 */
async function processText(text) {
    if (!text || !text.trim()) return;

    showTranscript(text);
    hideTranslationNote();
    setProcessingState(true);
    showStatus("Processing…", "info");

    try {
        const response = await fetch(`${API_BASE}/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Pass lang so the backend knows which Helsinki-NLP model to use
            body: JSON.stringify({ text, lang: currentLang }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            // 503 means the LLM (Hugging Face) is unavailable
            if (response.status === 503) {
                throw new Error("⚠️ LLM not available. Check your HF_API_KEY and internet connection.");
            }
            throw new Error(err.error || `Server error ${response.status}`);
        }

        const data = await response.json();

        // Show translated text note if translation happened
        if (data.translatedText) {
            showTranslationNote(data.translatedText, text);
        }

        if (data.intent && data.intent.intent !== "UNKNOWN") {
            showIntent(data.intent);
        }

        showStatus(data.message, data.intent?.intent !== "UNKNOWN" ? "success" : "error");

        if (data.list) renderList(data.list);

        // 1. Decouple Search State from Suggestions State
        // Only update suggestions if the backend explicitly returned them 
        // (SEARCH_ITEM queries omit them; ADD/REMOVE queries recalculate them)
        if (data.suggestions) {
            appState.suggestions = data.suggestions;
        }

        // Always ensure the suggestions UI reflects the persistent state
        renderSuggestions(appState.suggestions);

        if (data.catalogResults !== undefined || data.searchType === "GENERIC") {
            appState.searchResults = data.searchType === "GENERIC" ? data.results : data.catalogResults;
            renderSearchResults(
                appState.searchResults,
                data.listResults || [],
                data.intent,
                data.filters || {},
                data.searchType === "GENERIC"
            );
        }
    } catch (err) {
        console.error("[processText] Error:", err);
        showStatus(`Error: ${err.message}`, "error");
    } finally {
        setProcessingState(false);
    }
}

// ============================================================
// UI HELPERS
// ============================================================

function showTranscript(text) {
    transcriptPlaceholder.hidden = true;
    transcriptText.hidden = false;
    transcriptText.textContent = `"${text}"`;
}

/**
 * Show a note when the backend translated the user's input.
 * @param {string} translated - English translation
 * @param {string} original   - Original spoken text
 */
function showTranslationNote(translated, original) {
    translationNote.innerHTML = `
    <span class="translation-note-icon">🌐</span>
    <div class="translation-note-text">
      Translated to: <strong>${translated}</strong>
      <span class="translation-note-original">Original: "${original}"</span>
    </div>
  `;
    translationNote.hidden = false;
}

function hideTranslationNote() {
    translationNote.hidden = true;
}

/**
 * Show the parsed intent in a key/value grid.
 * Shows search-specific fields (brand, price, qualifier) when present.
 */
function showIntent(intent) {
    const rows = [
        ["Intent", formatIntent(intent.intent)],
        ["Item", capitalize(intent.item || "—")],
        ["Qty", intent.quantity ?? "—"],
        ["Source", intent.source || "—"],
    ];

    if (intent.language) rows.push(["Language", intent.language.toUpperCase()]);

    if (intent.brand) rows.push(["Brand", intent.brand]);
    if (intent.maxPrice != null) rows.push(["Max $", `$${intent.maxPrice}`]);
    if (intent.minPrice != null) rows.push(["Min $", `$${intent.minPrice}`]);
    if (intent.size) rows.push(["Size", intent.size]);
    if (intent.qualifier) rows.push(["Tag", intent.qualifier]);

    intentContent.innerHTML = rows
        .map(([k, v]) =>
            `<span class="intent-key">${k}</span>` +
            `<span class="intent-val" style="font-size:${k === "Source" ? "0.72rem" : "0.82rem"};opacity:${k === "Source" ? 0.7 : 1}">${v}</span>`
        ).join("");

    intentBox.hidden = false;
}

function showStatus(message, type = "info") {
    statusMsg.textContent = message;
    statusMsg.className = `status-msg ${type}`;
    statusMsg.hidden = false;
    clearTimeout(statusMsg._timer);
    statusMsg._timer = setTimeout(() => { statusMsg.hidden = true; }, 5000);
}

// ============================================================
// SEARCH RESULTS RENDERING
// ============================================================

function renderSearchResults(resultsData, listResults, intent, filters, isGeneric = false) {
    searchResultsSection.hidden = false;
    searchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

    const itemLabel = capitalize(intent?.item || intent?.category || "products");

    if (isGeneric) {
        searchResultsMeta.textContent = `Here are some standard ${itemLabel} you might need:`;
    } else {
        searchResultsMeta.textContent = resultsData.length > 0
            ? `${resultsData.length} product${resultsData.length !== 1 ? "s" : ""} found for "${itemLabel}" — sorted by price (lowest first)`
            : `No products found for "${itemLabel}". Try broadening your search.`;
    }

    renderActiveFilters(filters);

    catalogResultsGrid.innerHTML = "";
    if (resultsData.length === 0) {
        catalogResultsGrid.innerHTML = `
      <div class="no-results">
        <span class="no-results-icon">🔍</span>
        No matching products. Try removing filters or searching for a different term.
      </div>`;
    } else {
        resultsData.forEach((p) => {
            if (isGeneric) {
                catalogResultsGrid.appendChild(createGenericCard(p));
            } else {
                catalogResultsGrid.appendChild(createProductCard(p));
            }
        });
    }

    if (listResults.length > 0) {
        listMatchItems.innerHTML = listResults
            .map((item) =>
                `<span class="list-match-chip">${CATEGORY_ICONS[item.category] || "🛍️"} ${capitalize(item.name)} ×${item.quantity}</span>`
            ).join("");
        listMatchSection.hidden = false;
    } else {
        listMatchSection.hidden = true;
    }
}

function renderActiveFilters(filters) {
    activeFiltersEl.innerHTML = "";
    const defs = [
        { label: "Brand", value: filters.brand },
        { label: "Under", value: filters.maxPrice != null ? `$${filters.maxPrice}` : null },
        { label: "Above", value: filters.minPrice != null ? `$${filters.minPrice}` : null },
        { label: "Size", value: filters.size },
        { label: "Tag", value: filters.qualifier },
    ].filter((f) => f.value);

    if (!defs.length) { activeFiltersEl.hidden = true; return; }

    activeFiltersEl.hidden = false;
    defs.forEach(({ label, value }) => {
        const tag = document.createElement("span");
        tag.className = "filter-tag";
        tag.innerHTML = `<span class="filter-tag-label">${label}:</span> ${value}`;
        activeFiltersEl.appendChild(tag);
    });
}

function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    const tagsHtml = (product.tags || []).slice(0, 3)
        .map((t) => `<span class="product-tag">${t}</span>`).join("");

    card.innerHTML = `
    <div class="product-card-top">
      <span class="product-name">${capitalize(product.name)}</span>
      <span class="product-price">$${product.price.toFixed(2)}</span>
    </div>
    <span class="product-brand">🏷️ ${product.brand}</span>
    <span class="product-size">📦 ${product.size} · ${product.category}</span>
    <div class="product-tags">${tagsHtml}</div>
    <button class="btn-add-product" data-name="${product.name}">➕ Add to List</button>
  `;

    card.querySelector(".btn-add-product").addEventListener("click", async (e) => {
        const name = e.currentTarget.dataset.name;
        e.currentTarget.textContent = "✓ Adding…";
        e.currentTarget.disabled = true;
        await processText(`add ${name}`);
        e.currentTarget.textContent = "✅ Added!";
        setTimeout(() => {
            e.currentTarget.textContent = "➕ Add to List";
            e.currentTarget.disabled = false;
        }, 1500);
    });

    return card;
}

function createGenericCard(itemName) {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
    <div class="product-card-top">
      <span class="product-name">${capitalize(itemName)}</span>
    </div>
    <span class="product-brand">🛒 Standard Grocery</span>
    <button class="btn-add-product" data-name="${itemName}">➕ Add to List</button>
  `;

    card.querySelector(".btn-add-product").addEventListener("click", async (e) => {
        const name = e.currentTarget.dataset.name;
        e.currentTarget.textContent = "✓ Adding…";
        e.currentTarget.disabled = true;
        await processText(`add ${name}`);
        e.currentTarget.textContent = "✅ Added!";
        setTimeout(() => {
            e.currentTarget.textContent = "➕ Add to List";
            e.currentTarget.disabled = false;
        }, 1500);
    });

    return card;
}

// ============================================================
// SHOPPING LIST RENDERING
// ============================================================

function renderList(list) {
    Array.from(listContainer.querySelectorAll(".list-item, .list-category-label"))
        .forEach((el) => el.remove());

    if (list.length === 0) {
        emptyState.hidden = false;
        itemCount.textContent = "";
        return;
    }

    emptyState.hidden = true;
    const grouped = groupByCategory(list);

    for (const [category, items] of Object.entries(grouped)) {
        const label = document.createElement("p");
        label.className = "list-category-label";
        label.style.cssText =
            "font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin:0.5rem 0 0.2rem;padding-left:4px;";
        label.textContent = category;
        listContainer.appendChild(label);
        items.forEach((item) => listContainer.appendChild(createListItemEl(item)));
    }

    itemCount.textContent = `${list.length} item${list.length !== 1 ? "s" : ""}`;
}

function createListItemEl(item) {
    const div = document.createElement("div");
    div.className = "list-item";
    div.dataset.itemId = item.id;

    const icon = CATEGORY_ICONS[item.category] || "🛍️";
    div.innerHTML = `
    <div class="list-item-left">
      <span class="list-item-icon">${icon}</span>
      <div class="list-item-details">
        <p class="list-item-name">${capitalize(item.name)}</p>
        <p class="list-item-meta">${item.category}</p>
      </div>
    </div>
    <span class="list-item-qty">×${item.quantity}</span>
    <button class="remove-btn" title="Remove ${item.name}" aria-label="Remove ${item.name}">✕</button>
  `;

    div.querySelector(".remove-btn").addEventListener("click", async () => {
        try {
            const res = await fetch(`${API_BASE}/process`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: `remove ${item.name}`, lang: "en-US" }),
            });
            const data = await res.json();
            renderList(data.list);
            showStatus(data.message, "success");
        } catch {
            showStatus("Failed to remove item.", "error");
        }
    });

    return div;
}

function groupByCategory(list) {
    return list.reduce((acc, item) => {
        const cat = item.category || "General";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});
}

// ============================================================
// SUGGESTIONS RENDERING
// ============================================================

function renderSuggestions(suggestions) {
    renderChips(seasonalSuggestions, suggestions.seasonal || [], "seasonal");

    if (suggestions.substitutes && suggestions.substitutes.length > 0) {
        renderChips(substituteSuggestions, suggestions.substitutes, "substitute");
        substituteGroup.hidden = false;
    } else {
        substituteGroup.hidden = true;
    }

    const frequentNames = (suggestions.frequent || []).map((f) =>
        typeof f === "string" ? f : f.name
    );
    renderChips(frequentSuggestions, frequentNames, "");
}

function renderChips(container, items, chipClass) {
    container.innerHTML = "";
    if (!items.length) {
        container.innerHTML = `<span style="font-size:0.75rem;color:var(--text-muted)">None available</span>`;
        return;
    }
    items.forEach((name) => {
        const chip = document.createElement("button");
        chip.className = `chip ${chipClass}`.trim();
        chip.textContent = capitalize(name);
        chip.title = `Add "${name}" to your list`;
        chip.addEventListener("click", () => processText(`add ${name}`));
        container.appendChild(chip);
    });
}

// ============================================================
// UTILITY
// ============================================================

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatIntent(intent) {
    const labels = {
        ADD_ITEM: "➕ Add Item",
        REMOVE_ITEM: "🗑️ Remove Item",
        SEARCH_ITEM: "🔍 Search Item",
        UNKNOWN: "❓ Unknown",
    };
    return labels[intent] || intent;
}

// ============================================================
// INIT
// ============================================================

async function init() {
    await loadLanguages();  // Load language dropdown from backend

    try {
        const res = await fetch(`${API_BASE}/list`);
        if (!res.ok) throw new Error("Backend not reachable");
        const data = await res.json();

        renderList(data.list);

        if (data.suggestions) {
            appState.suggestions = data.suggestions;
            renderSuggestions(appState.suggestions);
        }
    } catch {
        showStatus(
            "⚠️ Backend not connected. Run: cd backend && node server.js",
            "error"
        );
        appState.suggestions = {
            seasonal: [], substitutes: [],
            frequent: ["milk", "bread", "eggs", "rice", "onion", "tomato"],
        };
        renderSuggestions(appState.suggestions);
    }
}

init();
