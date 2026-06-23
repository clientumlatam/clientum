---
name: OpenRouter Free Models
description: Confirmed-working free model IDs on OpenRouter, verified June 10 2026 via /api/v1/models endpoint + live test
---

## Verified free models (June 10, 2026 — confirmed via /api/v1/models + live 200 OK test)

Total free models available on OpenRouter: 22 (as of June 10, 2026)

### Working — assigned to plans
- `liquid/lfm-2.5-1.2b-instruct:free` — Free plan (fast, lightest)
- `nvidia/nemotron-3-nano-30b-a3b:free` — Starter plan
- `google/gemma-4-26b-a4b-it:free` — Pro plan
- `google/gemma-4-31b-it:free` — Business plan
- `meta-llama/llama-3.3-70b-instruct:free` — Enterprise plan (best quality)

### Fallback chain (openrouter.ts, in order)
1. `meta-llama/llama-3.3-70b-instruct:free`
2. `openai/gpt-oss-120b:free`
3. `google/gemma-4-31b-it:free`
4. `nvidia/nemotron-3-super-120b-a12b:free`
5. `google/gemma-4-26b-a4b-it:free`
6. `nvidia/nemotron-3-nano-30b-a3b:free`
7. `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`
8. `liquid/lfm-2.5-1.2b-instruct:free`

### Other free models available (not in fallback chain but usable)
- `nex-agi/nex-n2-pro:free`
- `nvidia/nemotron-3-ultra-550b-a55b:free`
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- `poolside/laguna-xs.2:free`
- `poolside/laguna-m.1:free`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `liquid/lfm-2.5-1.2b-thinking:free`
- `nvidia/nemotron-nano-12b-v2-vl:free`
- `qwen/qwen3-next-80b-a3b-instruct:free`
- `nvidia/nemotron-nano-9b-v2:free`
- `openai/gpt-oss-20b:free`
- `qwen/qwen3-coder:free`

## Removed / 404 — do NOT use
- `z-ai/glm-4.5-air:free` — NOW PAID (returns 404 "unavailable for free")
- `meta-llama/llama-3.1-8b-instruct:free` — 404
- `qwen/qwen3-8b:free` — 404
- `qwen/qwen3-14b:free` — 404
- `mistralai/mistral-7b-instruct:free` — 404
- `google/gemma-2-9b-it:free` — 404
- `deepseek/deepseek-r1-distill-llama-70b:free` — 404
- `nousresearch/hermes-3-llama-3.1-405b:free` — 404
- `google/gemini-2.0-flash-exp:free` — 404
- `deepseek/deepseek-r1-0528:free` — 404
- `qwen/qwen3-235b-a22b:free` — 404
- `mistralai/mistral-small-3.2-24b-instruct:free` — 404
- `google/gemma-3-27b-it:free` — 404
- `microsoft/phi-4-reasoning-plus:free` — 404
- `nvidia/nemotron-3-nano-30b-a3b:free` was 429 (rate-limited) but still reachable

## Critical bug fixed (June 10, 2026)
- 404 errors ("model unavailable") were NOT treated as retryable → chain stopped at first 404
- Fix: added `404` to the retryable regex in `chatCompletion()` in `openrouter.ts`
- `widget.ts` had its own hardcoded model map (stale) → replaced with `modelForPlan()` import

## Plan → model assignment
| Plan | Model |
|------|-------|
| free | liquid/lfm-2.5-1.2b-instruct:free |
| starter | nvidia/nemotron-3-nano-30b-a3b:free |
| pro | google/gemma-4-26b-a4b-it:free |
| business | google/gemma-4-31b-it:free |
| enterprise | meta-llama/llama-3.3-70b-instruct:free |

**Why:** Free model availability changes frequently on OpenRouter. Always verify via `/api/v1/models` endpoint before assuming a model ID works. The `:free` suffix models have a separate pool — a model existing without `:free` doesn't mean the free variant exists.

**How to apply:** When chatbot returns 503, first check which models are active via `curl https://openrouter.ai/api/v1/models | node -e "..."` (no auth needed). Then update `openrouter.ts` MODEL_BY_PLAN and FALLBACK_MODELS. Rebuild api-server dist and restart the `artifacts/api-server: API Server` workflow (NOT just `Start application`).
