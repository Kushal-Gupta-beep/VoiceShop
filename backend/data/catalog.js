/**
 * catalog.js — Mock product catalog with brand, size, price, and category data
 *
 * This simulates a real product database for voice search + filter functionality.
 * In a real app this would be replaced by a database or external product API.
 *
 * Each product: { id, name, brand, size, price, category, tags[] }
 */

const CATALOG = [
    // ── Fruits ──────────────────────────────────────────────────────────────
    { id: 1, name: "apples", brand: "FreshFarm", size: "1 kg", price: 3.99, category: "Fruits", tags: ["fresh", "organic"] },
    { id: 2, name: "apples", brand: "OrganicVale", size: "1 kg", price: 5.49, category: "Fruits", tags: ["organic", "premium"] },
    { id: 3, name: "bananas", brand: "TropicBest", size: "6 pack", price: 1.99, category: "Fruits", tags: ["fresh"] },
    { id: 4, name: "oranges", brand: "SunGrove", size: "1 kg", price: 2.99, category: "Fruits", tags: ["fresh", "vitamin c"] },
    { id: 5, name: "mango", brand: "TropicBest", size: "500 g", price: 3.49, category: "Fruits", tags: ["tropical", "fresh"] },
    { id: 6, name: "strawberries", brand: "BerryFresh", size: "250 g", price: 4.29, category: "Fruits", tags: ["fresh", "organic"] },

    // ── Vegetables ──────────────────────────────────────────────────────────
    { id: 7, name: "tomatoes", brand: "GardenPick", size: "500 g", price: 1.49, category: "Vegetables", tags: ["fresh"] },
    { id: 8, name: "spinach", brand: "GreenLeaf", size: "200 g", price: 2.19, category: "Vegetables", tags: ["organic", "fresh"] },
    { id: 9, name: "broccoli", brand: "FreshFields", size: "400 g", price: 2.49, category: "Vegetables", tags: ["fresh", "organic"] },
    { id: 10, name: "onions", brand: "FarmSelect", size: "1 kg", price: 0.99, category: "Vegetables", tags: ["fresh"] },
    { id: 11, name: "carrots", brand: "GreenLeaf", size: "500 g", price: 1.29, category: "Vegetables", tags: ["organic", "fresh"] },

    // ── Dairy ────────────────────────────────────────────────────────────────
    { id: 12, name: "milk", brand: "DairyBest", size: "1 L", price: 1.29, category: "Dairy", tags: ["whole milk"] },
    { id: 13, name: "milk", brand: "DairyBest", size: "2 L", price: 2.09, category: "Dairy", tags: ["whole milk", "family"] },
    { id: 14, name: "almond milk", brand: "NutriBlend", size: "1 L", price: 3.49, category: "Dairy", tags: ["vegan", "lactose free", "plant based"] },
    { id: 15, name: "oat milk", brand: "OatWave", size: "1 L", price: 3.79, category: "Dairy", tags: ["vegan", "plant based"] },
    { id: 16, name: "butter", brand: "CreamyFarm", size: "250 g", price: 2.79, category: "Dairy", tags: ["unsalted"] },
    { id: 17, name: "butter", brand: "LuxeCream", size: "500 g", price: 4.99, category: "Dairy", tags: ["premium", "salted"] },
    { id: 18, name: "cheddar cheese", brand: "CheeseHouse", size: "200 g", price: 3.99, category: "Dairy", tags: ["sharp", "aged"] },
    { id: 19, name: "greek yogurt", brand: "CreamyFarm", size: "500 g", price: 2.99, category: "Dairy", tags: ["probiotic", "low fat"] },

    // ── Personal Care ─────────────────────────────────────────────────────────
    { id: 20, name: "toothpaste", brand: "BrightSmile", size: "100 ml", price: 2.49, category: "Personal Care", tags: ["whitening", "mint"] },
    { id: 21, name: "toothpaste", brand: "DentaFresh", size: "150 ml", price: 3.99, category: "Personal Care", tags: ["sensitive", "fluoride"] },
    { id: 22, name: "toothpaste", brand: "AquaClean", size: "200 ml", price: 4.99, category: "Personal Care", tags: ["herbal", "natural"] },
    { id: 23, name: "shampoo", brand: "HairLux", size: "400 ml", price: 5.99, category: "Personal Care", tags: ["moisturizing", "all hair types"] },
    { id: 24, name: "shampoo", brand: "NatureCare", size: "300 ml", price: 4.49, category: "Personal Care", tags: ["organic", "sulfate free"] },
    { id: 25, name: "body wash", brand: "SkinSoft", size: "500 ml", price: 3.99, category: "Personal Care", tags: ["moisturizing", "gentle"] },
    { id: 26, name: "deodorant", brand: "FreshGuard", size: "150 ml", price: 3.49, category: "Personal Care", tags: ["antiperspirant", "24hr"] },

    // ── Grains & Staples ─────────────────────────────────────────────────────
    { id: 27, name: "basmati rice", brand: "GrainMaster", size: "1 kg", price: 2.99, category: "Grains & Staples", tags: ["long grain", "aromatic"] },
    { id: 28, name: "basmati rice", brand: "RoyalGrain", size: "5 kg", price: 12.99, category: "Grains & Staples", tags: ["premium", "long grain"] },
    { id: 29, name: "whole wheat bread", brand: "BakeWell", size: "400 g", price: 1.99, category: "Bakery", tags: ["fiber rich", "healthy"] },
    { id: 30, name: "whole wheat bread", brand: "NatureBake", size: "600 g", price: 3.49, category: "Bakery", tags: ["multigrain", "organic"] },
    { id: 31, name: "pasta", brand: "ItalianChoice", size: "500 g", price: 1.49, category: "Grains & Staples", tags: ["whole wheat"] },
    { id: 32, name: "oats", brand: "MorningBest", size: "500 g", price: 2.29, category: "Grains & Staples", tags: ["rolled oats", "fiber"] },

    // ── Beverages ─────────────────────────────────────────────────────────────
    { id: 33, name: "orange juice", brand: "SunPress", size: "1 L", price: 2.99, category: "Beverages", tags: ["no sugar", "100% juice"] },
    { id: 34, name: "green tea", brand: "LeafZen", size: "25 bags", price: 3.49, category: "Beverages", tags: ["antioxidant", "organic"] },
    { id: 35, name: "coffee", brand: "BrewCraft", size: "250 g", price: 6.99, category: "Beverages", tags: ["arabica", "medium roast"] },
    { id: 36, name: "sparkling water", brand: "AquaFizz", size: "1 L", price: 1.29, category: "Beverages", tags: ["zero calories", "sugar free"] },

    // ── Cleaning ──────────────────────────────────────────────────────────────
    { id: 37, name: "dish soap", brand: "SparkleClean", size: "500 ml", price: 1.99, category: "Cleaning", tags: ["grease cutting", "lemon"] },
    { id: 38, name: "laundry detergent", brand: "WashPro", size: "1 kg", price: 5.99, category: "Cleaning", tags: ["concentrated", "fresh scent"] },
    { id: 39, name: "laundry detergent", brand: "EcoWash", size: "1.5 kg", price: 8.49, category: "Cleaning", tags: ["eco friendly", "plant based"] },
];

// ---------------------------------------------------------------------------
// Search / Filter logic
// ---------------------------------------------------------------------------

/**
 * Search catalog by item name + optional filters: brand, maxPrice, minPrice, size, qualifier.
 *
 * @param {string} query          - Item name (required)
 * @param {object} filters
 * @param {string}  filters.brand      - Brand name to match
 * @param {number}  filters.maxPrice   - Maximum price ($)
 * @param {number}  filters.minPrice   - Minimum price ($)
 * @param {string}  filters.size       - Size/quantity string to match
 * @param {string}  filters.qualifier  - Extra qualifier like "organic", "vegan", "large"
 * @returns {Array} Matching products sorted by price ascending
 */
function searchCatalog(query, filters = {}) {
    const q = query.toLowerCase().trim();

    let results = CATALOG.filter((product) => {
        // --- Name match (partial) ---
        const nameMatch = product.name.includes(q) || q.includes(product.name);
        if (!nameMatch) return false;

        // --- Brand filter ---
        if (filters.brand) {
            const brandQ = filters.brand.toLowerCase();
            if (!product.brand.toLowerCase().includes(brandQ)) return false;
        }

        // --- Price range filter ---
        if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
            if (product.price > filters.maxPrice) return false;
        }
        if (filters.minPrice !== null && filters.minPrice !== undefined) {
            if (product.price < filters.minPrice) return false;
        }

        // --- Size filter ---
        if (filters.size) {
            const sizeQ = filters.size.toLowerCase();
            if (!product.size.toLowerCase().includes(sizeQ)) return false;
        }

        // --- Qualifier filter (checks tags) ---
        if (filters.qualifier) {
            const qualQ = filters.qualifier.toLowerCase();
            const tagMatch = product.tags.some((t) => t.includes(qualQ));
            const nameQ = product.name.includes(qualQ);
            if (!tagMatch && !nameQ) return false;
        }

        return true;
    });

    // Sort by price ascending so cheapest shows first
    results.sort((a, b) => a.price - b.price);

    return results;
}

module.exports = { searchCatalog, CATALOG };
