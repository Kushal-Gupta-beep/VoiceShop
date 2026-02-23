/**
 * searchService.js — Pure JavaScript regex extraction for search constraints
 *
 * This service ensures deterministic parsing of price filters (e.g., "under $5", "above 3")
 * before passing them to the catalog search logic, independent of the LLM parser.
 */

/**
 * Extracts price operators and values from a search string.
 *
 * Examples:
 *  "toothpaste below $3" -> { operator: "LESS_THAN", value: 3 }
 *  "under 5 dollars"     -> { operator: "LESS_THAN", value: 5 }
 *  "above 10"            -> { operator: "GREATER_THAN", value: 10 }
 *
 * @param {string} text - The raw query string
 * @returns {{ operator: 'LESS_THAN'|'GREATER_THAN'|'EQUAL', value: number } | null}
 */
function extractPriceConstraint(text) {
    if (!text || typeof text !== "string") return null;

    const lowerText = text.toLowerCase();

    // Matches: "under $3", "below 3", "under 3 dollars"
    const lessThanRegex = /(?:under|below|less than|max(?:imum)?)\s*(?:[\$\xA3\u20AC])?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)?/i;
    // Matches: "above $10", "over 5"
    const greaterThanRegex = /(?:above|over|more than|min(?:imum)?|greater than)\s*(?:[\$\xA3\u20AC])?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)?/i;
    // Matches: "exactly 5 dollars"
    const equalRegex = /(?:exactly|for)\s*(?:[\$\xA3\u20AC])?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)?/i;

    // Check Less Than
    const ltMatch = lowerText.match(lessThanRegex);
    if (ltMatch && ltMatch[1]) {
        return { operator: "LESS_THAN", value: parseFloat(ltMatch[1]) };
    }

    // Check Greater Than
    const gtMatch = lowerText.match(greaterThanRegex);
    if (gtMatch && gtMatch[1]) {
        return { operator: "GREATER_THAN", value: parseFloat(gtMatch[1]) };
    }

    // Check Equal (rare, but useful for strict matching)
    const eqMatch = lowerText.match(equalRegex);
    if (eqMatch && eqMatch[1]) {
        return { operator: "EQUAL", value: parseFloat(eqMatch[1]) };
    }

    return null;
}

module.exports = {
    extractPriceConstraint
};
