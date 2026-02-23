# 🛒 Voice Command Shopping Assistant

🌍 **Live Demo:** [https://voiceshop.onrender.com/](https://voiceshop.onrender.com/)

A fully voice-controlled shopping list application built with vanilla HTML/JS and a
Node.js backend. Speak your grocery commands — the app understands you.

---

## Demo Commands

| You say... | What happens |
|---|---|
| "Add two apples" | Adds 2 apples to the list (auto-categorized as Fruits) |
| "I need a litre of milk" | Adds 1 milk to the Dairy category |
| "Remove onion" | Removes onion from the list |
| "Find toothpaste" | Searches your list for toothpaste |

---

## Project Structure

```
voice-shopping-assistant/
├── backend/                  # Node.js + Express
│   ├── server.js             # Entry point
│   ├── routes/nlpRoutes.js   # API route handlers
│   ├── services/
│   │   ├── hfClient.js       # Hugging Face API wrapper
│   │   ├── intentParser.js   # LLM + rule-based fallback parser
│   │   └── suggestionService.js  # Smart suggestions (rule-based)
│   ├── data/store.js         # In-memory shopping list
│   ├── package.json
│   └── README.md
│
└── frontend/                 # Vanilla HTML + CSS + JS
    ├── index.html
    ├── styles.css
    └── script.js
```

---

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install

# Optional: create .env with your HF token (see backend/README.md)
# App works without it using the rule-based fallback
echo "HF_API_KEY=hf_your_token_here" > .env

npm start
```

Backend runs at `http://localhost:3001`

### 2. Open the Frontend

Simply open `frontend/index.html` in your browser (Chrome recommended for best Web
Speech API support).

```bash
# On Windows
start frontend/index.html

# On Mac/Linux
open frontend/index.html
```

> **Chrome is strongly recommended** for the Web Speech API. Firefox and Safari have
> limited or no support for `SpeechRecognition`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│                                                         │
│  Microphone ──→ Web Speech API ──→ Transcript           │
│                                       │                 │
│                                  script.js              │
│                              (fetch POST /api/process)  │
└───────────────────────────────────────│─────────────────┘
                                        │ HTTP
                                        ▼
┌─────────────────────────────────────────────────────────┐
│                     NODE.JS BACKEND                     │
│                                                         │
│  nlpRoutes.js ──→ intentParser.js                       │
│                       │                                 │
│               ┌───────┴───────┐                         │
│               ▼               ▼                         │
│         hfClient.js      Rule-based fallback            │
│     (Hugging Face API)   (regex + keyword maps)         │
│               │                                         │
│               ▼                                         │
│           store.js  (in-memory list)                    │
│           suggestionService.js                          │
└─────────────────────────────────────────────────────────┘
```

---

## Free APIs Used

| API / Service | What it does | Pricing |
|---|---|---|
| **Web Speech API** | Browser-native speech-to-text | Free (built into browser) |
| **Hugging Face Inference API** | NLP intent extraction via `google/flan-t5-base` | Free tier (rate-limited) |

No API keys are required for a basic working demo — the app falls back to rule-based
parsing automatically when `HF_API_KEY` is not set.

---

## Features

- 🎙️ **Voice Input** — Uses browser's `SpeechRecognition` API with interim results
- 🧠 **NLP Intent Extraction** — `google/flan-t5-base` extracts intent, item, quantity, category
- 🔄 **Smart Fallback** — Regex + keyword rules take over if LLM fails or is unavailable
- 🗂️ **Auto-categorization** — Items automatically sorted into Fruits, Dairy, Bakery, etc.
- ✨ **Smart Suggestions** — Seasonal picks, substitutes, frequently used items
- ⌨️ **Manual Input** — Type commands if voice is unavailable
- 💾 **In-memory Storage** — No database required

---

## Assumptions

1. The app targets **Chrome / Chromium** browsers for full Web Speech API support.
2. The Hugging Face free tier has **rate limits** — the rule-based fallback ensures the
   app remains functional under all conditions.
3. Shopping list data is **not persisted** across server restarts (in-memory store).
4. Intent extraction handles **English only**.
5. Product categories are determined by a **local keyword dictionary**, not an external API.

---

## Known Limitations

- **Ephemeral data**: Restarting the backend clears the shopping list. Add a JSON file
  or SQLite database to persist it.
- **HF model cold starts**: The first request after a model is idle can take 10–20
  seconds. The client uses `wait_for_model: true` to handle this gracefully.
- **flan-t5-base accuracy**: The model is small (250M params). Complex or ambiguous
  sentences may produce malformed JSON, triggering the fallback.
- **Voice API limitations**: `SpeechRecognition` requires HTTPS in production (HTTP
  is allowed for `localhost`).
- **Single language**: Only English speech commands are supported.

---

## How to Improve with More Time

| Area | Improvement |
|---|---|
| **NLP Model** | Use a larger model (e.g., `mistralai/Mistral-7B-Instruct`) or a fine-tuned intent classifier for better accuracy |
| **Persistence** | Replace in-memory store with SQLite or a JSON flat-file database |
| **Auth** | Add multi-user support with session tokens |
| **PWA** | Add a service worker + manifest so the app can be installed on mobile |
| **Quantity editing** | Allow tapping a list item to edit its quantity inline |
| **Export** | Add "Export to PDF / WhatsApp" share functionality |
| **Multilingual** | Support Hindi and other regional languages via the `lang` attribute on `SpeechRecognition` |
| **Barcode scan** | Add camera-based barcode scanning as a third input method |
| **Price tracking** | Integrate a free grocery price API to show estimated totals |

---

## License
MIT
