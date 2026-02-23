/**
 * suggestionService.js — Rule-based smart suggestions
 *
 * Three suggestion types:
 *  1. Frequently needed items (hardcoded common grocery list)
 *  2. Substitutes (e.g., out of milk? try almond milk)
 *  3. Seasonal items (based on current month)
 */

// ---------------------------------------------------------------------------
// 1. Frequently used items — shown when the list is empty or on demand
// ---------------------------------------------------------------------------

const FREQUENTLY_USED = [
    { name: "milk", category: "Dairy" },
    { name: "bread", category: "Bakery" },
    { name: "eggs", category: "General" },
    { name: "rice", category: "Grains & Staples" },
    { name: "onion", category: "Vegetables" },
    { name: "tomato", category: "Vegetables" },
    { name: "banana", category: "Fruits" },
    { name: "butter", category: "Dairy" },
    { name: "sugar", category: "Grains & Staples" },
    { name: "salt", category: "Grains & Staples" },
    { name: "cooking oil", category: "General" },
    { name: "toothpaste", category: "Personal Care" },
];

// ---------------------------------------------------------------------------
// 2. Substitutes — suggest alternatives for common items
// ---------------------------------------------------------------------------

const SUBSTITUTES = {
    milk: ["almond milk", "oat milk", "soy milk"],
    butter: ["margarine", "coconut oil"],
    sugar: ["honey", "jaggery", "stevia"],
    bread: ["whole wheat bread", "multigrain bread"],
    rice: ["brown rice", "quinoa"],
    flour: ["almond flour", "oat flour"],
    cola: ["sparkling water", "lemon soda"],
    cheese: ["tofu", "paneer"],
    cream: ["coconut cream", "yogurt"],
    pasta: ["whole wheat pasta", "zucchini noodles"],
};

// ---------------------------------------------------------------------------
// 3. Seasonal items — mapped by month index (0 = January)
// ---------------------------------------------------------------------------

const SEASONAL_BY_MONTH = {
    0: ["peas", "carrot", "strawberry"],        // January
    1: ["mango", "strawberry", "beet"],          // February
    2: ["watermelon", "mango", "cucumber"],      // March
    3: ["watermelon", "lemon", "mango"],         // April
    4: ["watermelon", "lychee", "peach"],        // May
    5: ["cherry", "plum", "corn"],               // June
    6: ["peach", "blueberry", "zucchini"],       // July
    7: ["peach", "tomato", "sweet corn"],        // August
    8: ["apple", "grape", "spinach"],            // September
    9: ["apple", "pear", "pumpkin"],             // October
    10: ["orange", "sweet potato", "pomegranate"], // November
    11: ["orange", "pea", "carrot"],              // December
};

// ---------------------------------------------------------------------------
// 4. Healthy items
// ---------------------------------------------------------------------------
const HEALTHY_OPTIONS = [
    "spinach", "broccoli", "quinoa", "kale",
    "almonds", "walnuts", "greek yogurt", "lentils",
    "sweet potato", "blueberries", "avocado", "chia seeds"
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the top N frequently used items.
 * @param {number} limit
 */
function getFrequentItems(limit = 6) {
    return FREQUENTLY_USED.slice(0, limit);
}

/**
 * Get substitute suggestions for a given item name.
 * Returns an empty array if no substitutes are known.
 * @param {string} itemName
 */
function getSubstitutes(itemName) {
    const key = itemName.toLowerCase().trim();
    // Try exact match first, then partial match
    if (SUBSTITUTES[key]) return SUBSTITUTES[key];
    for (const [k, subs] of Object.entries(SUBSTITUTES)) {
        if (key.includes(k) || k.includes(key)) return subs;
    }
    return [];
}

/**
 * Get seasonal items for the current month.
 */
function getSeasonalItems() {
    const month = new Date().getMonth(); // 0-indexed
    return SEASONAL_BY_MONTH[month] || [];
}

/**
 * Build a full suggestions payload for the frontend.
 * @param {string|null} lastItemAdded - Name of the most recently added item (for substitutes)
 */
function getSuggestions(lastItemAdded = null) {
    return {
        frequent: getFrequentItems(6),
        substitutes: lastItemAdded ? getSubstitutes(lastItemAdded) : [],
        seasonal: getSeasonalItems(),
    };
}

/**
 * Scans an "UNKNOWN" intent text to determine if the user is asking 
 * an advice or suggestion question. If so, returns a customized suggestion payload.
 * 
 * @param {string} text - The raw user input (already in English)
 * @returns {Object|null} - Null if not an advice question, or { type, category, suggestions, message }
 */
function handleAdviceQuestion(text) {
    const t = text.toLowerCase();

    // ---------------------------------------------------------
    // 1. Check for SUBSTITUTES ("alternative to X", "substitute for Y")
    // ---------------------------------------------------------
    const subMatch = t.match(/(?:substitute|alternative|instead)\s+(?:for|of)?\s*([a-z\s]+)/);
    if (subMatch) {
        let targetItem = subMatch[1].trim();
        // clean up trailing punctuation
        targetItem = targetItem.replace(/[?!.]/g, '');

        const subs = getSubstitutes(targetItem);
        if (subs && subs.length > 0) {
            return {
                type: "SUBSTITUTE",
                category: "substitute", // keeping for backwards compatibility with front-end coloring if needed
                suggestions: subs,
                message: `Instead of ${targetItem}, you could try these alternatives!`
            };
        }
    }

    // ---------------------------------------------------------
    // 2. Check if it's a general suggestion question
    // ---------------------------------------------------------
    const isAdvice = ["suggest", "recommend", "what should", "any ideas", "what to buy", "what do i need"].some(k => t.includes(k));
    const isBestSeason = ["best", "season"].some(k => t.includes(k));
    const isHealthy = ["healthy", "diet", "nutritious"].some(k => t.includes(k));

    if (!isAdvice && !isBestSeason && !isHealthy) {
        return null; // Not an advice question, let it fall back normally
    }

    // ---------------------------------------------------------
    // 3. Check HISTORY (If they ask a general question and have a history)
    // ---------------------------------------------------------
    if (isAdvice && !isBestSeason && !isHealthy) {
        try {
            const { getRunningLowItems } = require("../data/store");
            const historyItems = getRunningLowItems();

            if (historyItems.length > 0) {
                // Shuffle to avoid staleness, return up to 3
                const shuffledHistory = historyItems.sort(() => 0.5 - Math.random()).slice(0, 3);
                return {
                    type: "HISTORY",
                    category: "history",
                    suggestions: shuffledHistory,
                    message: "Looking at your past purchases, it looks like you might be running low on these items. 🛒"
                };
            }
        } catch (e) {
            console.error("Could not load history items:", e);
        }
    }

    // ---------------------------------------------------------
    // 4. Check SEASONAL & HEALTHY
    // ---------------------------------------------------------
    if (isBestSeason || t.includes("season") || t.includes("fruit")) {
        return {
            type: "SEASONAL",
            category: "seasonal",
            suggestions: getSeasonalItems(),
            message: "Here are some great seasonal picks for this time of year! 🌿"
        };
    }

    if (isHealthy) {
        const shuffled = [...HEALTHY_OPTIONS].sort(() => 0.5 - Math.random());
        return {
            type: "HEALTHY", // Or GENERAL if healthy isn't a strict type
            category: "healthy",
            suggestions: shuffled.slice(0, 3),
            message: "Here are some great nutritious and healthy options for you! 🥗"
        };
    }

    // ---------------------------------------------------------
    // 5. Generic Fallback Suggestion
    // ---------------------------------------------------------
    const freqWords = getFrequentItems(3).map(f => f.name);
    return {
        type: "HISTORY", // Call general "history/staples" if everything else fails
        category: "general",
        suggestions: freqWords,
        message: "I can certainly help you brainstorm! Here are some common staples you might need. 💡"
    };
}

module.exports = {
    getSuggestions,
    getSubstitutes,
    getFrequentItems,
    getSeasonalItems,
    handleAdviceQuestion
};
