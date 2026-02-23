/**
 * store.js — In-memory shopping list storage
 *
 * We use a plain array of item objects instead of a database to keep things
 * simple and easy to run locally without any setup.
 *
 * Each item: { id, name, quantity, category, addedAt }
 */

let shoppingList = [];
let nextId = 1;

// --- SMART RECOMMENDATIONS (HISTORY) ---
// Dictionary tracking frequency of items added: { "itemName": { count: number, lastAdded: string } }
const purchaseHistory = {};

/**
 * Return a copy of the current shopping list.
 */
function getList() {
  return [...shoppingList];
}

/**
 * Add an item to the list (or increment quantity if it already exists).
 * @param {string} name - Item name (lowercased for consistency)
 * @param {number} quantity - How many to add (default 1)
 * @param {string|null} category - Item category
 * @returns {object} The created or updated item
 */
function addItem(name, quantity = 1, category = null) {
  const normalizedName = name.toLowerCase().trim();

  // 1. Track History globally
  if (!purchaseHistory[normalizedName]) {
    purchaseHistory[normalizedName] = { count: 0, lastAdded: null };
  }
  purchaseHistory[normalizedName].count += 1;
  purchaseHistory[normalizedName].lastAdded = new Date().toISOString();

  // 2. Check if item already exists → increment quantity instead of duplicating
  const existing = shoppingList.find(
    (item) => item.name === normalizedName
  );

  if (existing) {
    existing.quantity += quantity;
    return existing;
  }

  const newItem = {
    id: nextId++,
    name: normalizedName,
    quantity,
    category: category || categorize(normalizedName),
    addedAt: new Date().toISOString(),
  };

  shoppingList.push(newItem);
  return newItem;
}

/**
 * Remove an item from the list by name.
 * @param {string} name - Item name
 * @returns {object|null} The removed item, or null if not found
 */
function removeItem(name) {
  const normalizedName = name.toLowerCase().trim();
  const index = shoppingList.findIndex(
    (item) => item.name === normalizedName
  );

  if (index === -1) return null;

  const [removed] = shoppingList.splice(index, 1);
  return removed;
}

/**
 * Search for items in the list by name (partial match).
 * @param {string} query - Search term
 * @returns {Array} Matching items
 */
function searchItems(query) {
  const q = query.toLowerCase().trim();
  return shoppingList.filter((item) => item.name.includes(q));
}

/**
 * Clear the entire shopping list.
 */
function clearList() {
  shoppingList = [];
  nextId = 1;
}

/**
 * SMART RECOMMENDATIONS:
 * Returns items that the user frequently buys (count >= 2) 
 * but are NOT currently in their active shopping list.
 * @returns {Array} Array of high-frequency item names.
 */
function getRunningLowItems() {
  const lowItems = [];
  for (const [itemName, data] of Object.entries(purchaseHistory)) {
    // Must have bought it at least twice historically
    if (data.count >= 2) {
      // Verify it's not already in their current cart
      const inCart = shoppingList.some(item => item.name === itemName);
      if (!inCart) {
        lowItems.push(itemName);
      }
    }
  }
  return lowItems;
}

// ---------------------------------------------------------------------------
// Auto-categorization — simple keyword mapping
// ---------------------------------------------------------------------------

const CATEGORY_MAP = {
  // Fruits
  apple: "Fruits",
  banana: "Fruits",
  mango: "Fruits",
  orange: "Fruits",
  grape: "Fruits",
  strawberry: "Fruits",
  watermelon: "Fruits",
  pineapple: "Fruits",
  lemon: "Fruits",
  kiwi: "Fruits",

  // Vegetables
  onion: "Vegetables",
  tomato: "Vegetables",
  potato: "Vegetables",
  carrot: "Vegetables",
  spinach: "Vegetables",
  broccoli: "Vegetables",
  cucumber: "Vegetables",
  garlic: "Vegetables",
  ginger: "Vegetables",
  pepper: "Vegetables",

  // Dairy
  milk: "Dairy",
  butter: "Dairy",
  cheese: "Dairy",
  yogurt: "Dairy",
  cream: "Dairy",
  paneer: "Dairy",
  curd: "Dairy",

  // Bakery
  bread: "Bakery",
  bun: "Bakery",
  cake: "Bakery",
  biscuit: "Bakery",
  cookie: "Bakery",

  // Beverages
  juice: "Beverages",
  water: "Beverages",
  soda: "Beverages",
  coffee: "Beverages",
  tea: "Beverages",
  cola: "Beverages",

  // Grains & Staples
  rice: "Grains & Staples",
  wheat: "Grains & Staples",
  flour: "Grains & Staples",
  oats: "Grains & Staples",
  pasta: "Grains & Staples",
  noodles: "Grains & Staples",
  dal: "Grains & Staples",
  lentil: "Grains & Staples",

  // Personal Care
  toothpaste: "Personal Care",
  shampoo: "Personal Care",
  soap: "Personal Care",
  lotion: "Personal Care",
  deodorant: "Personal Care",
  razor: "Personal Care",

  // Cleaning
  detergent: "Cleaning",
  bleach: "Cleaning",
  mop: "Cleaning",
  sponge: "Cleaning",
  dishwash: "Cleaning",
};

/**
 * Categorize an item based on its name using the keyword map.
 * Falls back to "General" if no match found.
 */
function categorize(name) {
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (name.includes(keyword)) return category;
  }
  return "General";
}

module.exports = {
  getList,
  addItem,
  removeItem,
  searchItems,
  clearList,
  getRunningLowItems
};
