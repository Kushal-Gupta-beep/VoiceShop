/**
 * test_suite.js — Comprehensive API test suite for Voice Shopping Assistant
 * Run: node test_suite.js  (from the backend directory)
 */

const http = require("http");

let pass = 0, fail = 0;

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function post(text, lang) {
    return new Promise((r) => {
        const b = JSON.stringify({ text, lang: lang || "en-US" });
        const req = http.request(
            {
                hostname: "localhost", port: 3001, path: "/api/process", method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b) }
            },
            (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => r(JSON.parse(d))); }
        );
        req.write(b); req.end();
    });
}

function get(path) {
    return new Promise((r) => {
        http.get("http://localhost:3001" + path, (res) => {
            let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => r(JSON.parse(d)));
        });
    });
}

function del(path) {
    return new Promise((r) => {
        const req = http.request(
            { hostname: "localhost", port: 3001, path, method: "DELETE" },
            (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => r(JSON.parse(d))); }
        );
        req.end();
    });
}

function check(name, cond, detail) {
    if (cond) { console.log("  ✅ PASS", name); pass++; }
    else { console.log("  ❌ FAIL", name, detail !== undefined ? "| got: " + JSON.stringify(detail) : ""); fail++; }
}

const clearList = () => del("/api/list");

// ── RUN TESTS ─────────────────────────────────────────────────────────────────
(async () => {
    console.log("\n============================================================");
    console.log("  VOICE SHOPPING ASSISTANT — FULL API TEST SUITE");
    console.log("============================================================\n");

    // ─── TEST 1: Health check ───────────────────────────────────────────────────
    console.log("TEST 1: Health Check");
    const health = await get("/health");
    check("Status is ok", health.status === "ok", health.status);

    // ─── TEST 2: Languages API ─────────────────────────────────────────────────
    console.log("\nTEST 2: GET /api/languages");
    const langs = await get("/api/languages");
    check("Returns 6 languages", langs.languages?.length === 6, langs.languages?.length);
    check("English (en-US) present", langs.languages?.some((l) => l.code === "en-US"));
    check("Hindi  (hi-IN) present", langs.languages?.some((l) => l.code === "hi-IN"));
    check("Spanish (es-ES) present", langs.languages?.some((l) => l.code === "es-ES"));
    check("French (fr-FR) present", langs.languages?.some((l) => l.code === "fr-FR"));
    check("German (de-DE) present", langs.languages?.some((l) => l.code === "de-DE"));
    check("Arabic (ar-SA) present", langs.languages?.some((l) => l.code === "ar-SA"));

    // ─── TEST 3: NLP — varied ADD phrases ──────────────────────────────────────
    console.log("\nTEST 3: NLP — Varied ADD Phrases");
    await clearList();
    let r;

    r = await post("I need organic apples");
    check('"I need organic apples" → ADD_ITEM', r.intent?.intent === "ADD_ITEM", r.intent?.intent);
    check('"I need organic apples" → item=apples', r.intent?.item === "apples", r.intent?.item);

    r = await post("I want to buy 2 litres of milk");
    check('"I want to buy 2 litres of milk" → ADD_ITEM', r.intent?.intent === "ADD_ITEM", r.intent?.intent);
    check('"...milk" → item=milk', r.intent?.item === "milk", r.intent?.item);
    check('"...milk" → qty=2', r.intent?.quantity === 2, r.intent?.quantity);

    r = await post("Put bananas in my list");
    check('"Put bananas in my list" → ADD_ITEM', r.intent?.intent === "ADD_ITEM", r.intent?.intent);
    check('"Put bananas..." → item=bananas', r.intent?.item === "bananas", r.intent?.item);

    r = await post("Get me some eggs");
    check('"Get me some eggs" → item=eggs', r.intent?.item === "eggs", r.intent?.item);

    r = await post("I am going to get bread");
    check('"I am going to get bread" → ADD_ITEM', r.intent?.intent === "ADD_ITEM", r.intent?.intent);
    check('"...bread" → item=bread', r.intent?.item === "bread", r.intent?.item);

    r = await post("Add 3 onions");
    check('"Add 3 onions" → qty=3', r.intent?.quantity === 3, r.intent?.quantity);
    check('"Add 3 onions" → item=onions', r.intent?.item === "onions", r.intent?.item);

    // ─── TEST 4: NLP — REMOVE phrases ──────────────────────────────────────────
    console.log("\nTEST 4: NLP — Varied REMOVE Phrases");

    r = await post("Take milk off my list");
    check('"Take milk off my list" → REMOVE_ITEM', r.intent?.intent === "REMOVE_ITEM", r.intent?.intent);
    check('"Take milk off..." → item=milk', r.intent?.item === "milk", r.intent?.item);

    r = await post("Remove the bread");
    check('"Remove the bread" → REMOVE_ITEM', r.intent?.intent === "REMOVE_ITEM", r.intent?.intent);
    check('"Remove the bread" → item=bread', r.intent?.item === "bread", r.intent?.item);

    r = await post("Delete bananas");
    check('"Delete bananas" → REMOVE_ITEM', r.intent?.intent === "REMOVE_ITEM", r.intent?.intent);

    // ─── TEST 5: SEARCH + maxPrice filter ──────────────────────────────────────
    console.log("\nTEST 5: SEARCH with Price Filter");

    r = await post("Find toothpaste under $4");
    check("SEARCH intent", r.intent?.intent === "SEARCH_ITEM", r.intent?.intent);
    check("item=toothpaste", r.intent?.item === "toothpaste", r.intent?.item);
    check("maxPrice extracted = 4", r.intent?.maxPrice === 4, r.intent?.maxPrice);
    check("filter is active", r.filters?.maxPrice === 4, r.filters?.maxPrice);
    check("All results priced ≤ $4", r.catalogResults?.every((p) => p.price <= 4), r.catalogResults?.map((p) => p.price));
    check("At least 1 result returned", r.catalogResults?.length > 0, r.catalogResults?.length);

    // ─── TEST 6: SEARCH with qualifier ─────────────────────────────────────────
    console.log("\nTEST 6: SEARCH with Qualifier Filter");

    r = await post("Find organic apples");
    check("SEARCH intent", r.intent?.intent === "SEARCH_ITEM", r.intent?.intent);
    check("qualifier=organic", r.intent?.qualifier === "organic", r.intent?.qualifier);
    check("All results have organic tag", r.catalogResults?.every((p) => p.tags?.includes("organic")), r.catalogResults?.map((p) => p.tags));
    check("At least 1 organic apple result", r.catalogResults?.length > 0, r.catalogResults?.length);

    // ─── TEST 7: Direct GET /api/search ────────────────────────────────────────
    console.log("\nTEST 7: GET /api/search with query params");

    const searchRes = await get("/api/search?q=milk&maxPrice=2.5");
    check("Returns results array", Array.isArray(searchRes.results), typeof searchRes.results);
    check("All results are milk", searchRes.results?.every((p) => p.name.includes("milk")), searchRes.results?.map((p) => p.name));
    check("All results ≤ $2.50", searchRes.results?.every((p) => p.price <= 2.5), searchRes.results?.map((p) => p.price));

    // ─── TEST 8: Shopping list state ───────────────────────────────────────────
    console.log("\nTEST 8: Shopping List State Management");
    await clearList();

    await post("Add 3 tomatoes");
    await post("Add spinach");
    await post("Add almond milk");

    const listData = await get("/api/list");
    check("List has 3 items", listData.list?.length === 3, listData.list?.length);

    const tomato = listData.list?.find((i) => i.name === "tomatoes");
    check("Tomatoes qty=3", tomato?.quantity === 3, tomato?.quantity);
    check("Tomatoes category=Vegetables", tomato?.category === "Vegetables", tomato?.category);

    const spinach = listData.list?.find((i) => i.name === "spinach");
    check("Spinach auto-categorized=Vegetables", spinach?.category === "Vegetables", spinach?.category);

    const almondMilk = listData.list?.find((i) => i.name === "almond milk");
    check("Almond milk category=Dairy", almondMilk?.category === "Dairy", almondMilk?.category);

    // ─── TEST 9: Clear list ─────────────────────────────────────────────────────
    console.log("\nTEST 9: Clear Shopping List");
    const cleared = await del("/api/list");
    check("Clears list successfully", cleared.list?.length === 0, cleared.list?.length);
    check("Returns message", typeof cleared.message === "string", cleared.message);

    // ─── TEST 10: Suggestions API ───────────────────────────────────────────────
    console.log("\nTEST 10: GET /api/suggestions");
    const sugg = await get("/api/suggestions");
    check("seasonal array present", Array.isArray(sugg.seasonal), typeof sugg.seasonal);
    check("frequent array present", Array.isArray(sugg.frequent), typeof sugg.frequent);
    check("seasonal items > 0", sugg.seasonal?.length > 0, sugg.seasonal?.length);
    check("frequent items > 0", sugg.frequent?.length > 0, sugg.frequent?.length);

    // ─── SUMMARY ────────────────────────────────────────────────────────────────
    const total = pass + fail;
    console.log("\n============================================================");
    console.log(`  RESULTS: ${pass}/${total} passed   (${fail} failed)`);
    console.log(`  ${fail === 0 ? "🎉 ALL TESTS PASSED!" : "⚠️  Some tests need attention."}`);
    console.log("============================================================\n");
    process.exit(fail > 0 ? 1 : 0);
})();
