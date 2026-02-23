### Approach

My strategy centered on creating a lightweight, scalable Voice Command Shopping Assistant using a clean Express.js backend and a dynamic Vanilla HTML/JS frontend. To ensure a fast turnaround while maintaining high quality, I bypassed heavyweight frameworks and opted for zero-dependency native browser APIs where possible.

For the core voice functionality, I integrated the native Web Speech API, which offers localized voice-to-text out of the box. The extracted text is then passed to a custom natural language pipeline. To achieve the required AI features (NLP and multilingual support) without incurring API costs, I built a hybrid parsing system leveraging the Hugging Face Inference API. Non-English queries are first translated using Helsinki-NLP models before intent (Add, Remove, Search) is securely extracted via google/flan-t5-base.

To ensure reliability against LLM hallucinations—especially for complex filtering like "Apples below $5"—I implemented a deterministic RegExp engine that intercepts strict price boundaries and overrides AI assumptions.

The application architecture includes mocked databases for catalogs and shopping lists, built-in heuristic Smart Suggestions (History, Substitutes, Seasonal), and a clean, accessible layout responsive to both mobile displays and voice-first interactions.
