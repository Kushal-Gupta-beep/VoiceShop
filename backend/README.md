# Voice Shopping Assistant — Backend

## Overview
Express.js backend for the Voice Command Shopping Assistant. Uses the Hugging Face
Inference API (free tier) for NLP intent extraction, with a rule-based fallback.

---

## Prerequisites
- Node.js ≥ 18
- A free Hugging Face account and API token

---

## Installation

```bash
cd backend
npm install
```

---

## Configuration

Create a `.env` file in the `backend/` directory:

```env
HF_API_KEY=hf_your_token_here
PORT=3001
```

> **Getting a free HF token:** Sign up at [huggingface.co](https://huggingface.co),
> go to **Settings → Access Tokens**, and create a token with `read` scope.
> The Inference API is free for public models such as `google/flan-t5-base`.

---

## Running

### Development (auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

The server starts at `http://localhost:3001`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/process` | Process a voice/text command |
| `GET` | `/api/list` | Fetch the shopping list |
| `DELETE` | `/api/list` | Clear the shopping list |
| `GET` | `/api/suggestions` | Get smart suggestions |

### POST /api/process — Request body
```json
{ "text": "I need two apples" }
```

### POST /api/process — Response
```json
{
  "intent": { "intent": "ADD_ITEM", "item": "apples", "quantity": 2, "category": "Fruits", "source": "llm" },
  "message": "Added 2x \"apples\" to your list (Fruits).",
  "affectedItem": { "id": 1, "name": "apples", "quantity": 2, "category": "Fruits", "addedAt": "..." },
  "list": [...],
  "suggestions": { "frequent": [...], "seasonal": [...], "substitutes": [...] }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HF_API_KEY` | No* | — | Hugging Face API token |
| `PORT` | No | `3001` | HTTP port for the server |

> *If `HF_API_KEY` is not set, the app falls back to rule-based intent parsing automatically.

---

## How It Works

1. **`server.js`** — Express app + middleware setup
2. **`routes/nlpRoutes.js`** — Route handlers for all API endpoints
3. **`services/hfClient.js`** — HTTP wrapper for the Hugging Face Inference API
4. **`services/intentParser.js`** — Builds a prompt, calls HF, parses JSON response; falls back to rules on failure
5. **`services/suggestionService.js`** — Returns hardcoded frequent/seasonal/substitute suggestions
6. **`data/store.js`** — In-memory shopping list with add/remove/search/categorize logic
