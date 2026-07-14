// Provider selection (server-side).
//
// Rule: the app works fully with NO key. The real provider is an enhancement.
//   - RENDER_PROVIDER=cached            -> always cached (default)
//   - RENDER_PROVIDER=openai + key set  -> try openai, fall back to cached
//   - unset + IMAGE_API_KEY present      -> try openai, fall back to cached
//   - unset + no key                     -> cached
//
// Any error from the real provider is swallowed and the cached provider is used,
// so a live demo can never break because of a network/API problem.

import { CachedRenderProvider } from "./cachedProvider";
import { OpenAIRenderProvider } from "./openaiProvider";
import type { RenderInput, RenderProvider, RenderResult } from "./types";

function pickPrimaryProvider(): RenderProvider {
  const mode = (process.env.RENDER_PROVIDER || "").toLowerCase();
  const key = process.env.IMAGE_API_KEY;

  if (mode === "cached") return new CachedRenderProvider();
  if (mode === "openai" && key) return new OpenAIRenderProvider(key);
  if (!mode && key) return new OpenAIRenderProvider(key);
  return new CachedRenderProvider();
}

const cached = new CachedRenderProvider();

/** Generate a render, falling back to the cached provider on any failure. */
export async function generateRender(input: RenderInput): Promise<RenderResult> {
  const primary = pickPrimaryProvider();
  if (primary instanceof CachedRenderProvider) {
    return primary.generate(input);
  }
  try {
    return await primary.generate(input);
  } catch {
    // Silent, intentional fallback — the demo must always produce a render.
    return cached.generate(input);
  }
}

export type { RenderInput, RenderProvider, RenderResult };
