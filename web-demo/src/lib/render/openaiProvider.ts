// OpenAIRenderProvider — OPTIONAL real-provider stub (web-demo's own cached-visual
// provider layer). NOTE: this is the browser/web-demo render path, NOT the backend
// render engine. The real Spazio render engine is self-hosted FLUX.2 Klein 4B run
// via the mflux CLI on the backend/Apple-Silicon render worker (ADR-026); mflux is
// intentionally NOT wired into the browser. This adapter stays a thin, always-
// falls-back-to-cached stub so the live demo can never break.
//
// This adapter is ONLY constructed when process.env.IMAGE_API_KEY is set (see
// ./index.ts). It is deliberately isolated so the demo never depends on it.
//
// IMPORTANT: this is a stub. If it were ever wired to a real render source, the
// render contract (ADR-026; its operator-QA clause superseded by ADR-025) is
// "match real SKUs -> composite their product images into the room photo". A real
// implementation would:
//   1. Take the user's room photo + the matched catalog product images.
//   2. Composite them at believable scale (backend: FLUX.2 Klein 4B via mflux).
//   3. Return the generated image (URL/bytes) plus tag coordinates.
//
// On ANY failure this provider throws; the selector in ./index.ts catches it and
// falls back to the always-available CachedRenderProvider, so the stage demo can
// never break because of a network or API problem.

import type { RenderInput, RenderProvider, RenderResult } from "./types";

export class OpenAIRenderProvider implements RenderProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(_input: RenderInput): Promise<RenderResult> {
    if (!this.apiKey) {
      throw new Error("IMAGE_API_KEY is not configured");
    }

    // --- REAL CALL GOES HERE (left unimplemented on purpose) ---
    // Example shape only — confirm the current endpoint + params before use:
    //
    //   const res = await fetch("https://api.openai.com/v1/images/edits", {
    //     method: "POST",
    //     headers: { Authorization: `Bearer ${this.apiKey}` },
    //     body: form, // room photo + matched product images + prompt
    //   });
    //   if (!res.ok) throw new Error(`image API failed: ${res.status}`);
    //   const data = await res.json();
    //   return { renderImage: data.url, items: computedTags, source: "openai" };
    //
    // Until that is implemented and verified, throw so the selector falls back
    // to the cached provider.
    throw new Error(
      "OpenAIRenderProvider is a stub — implement and verify the image-edit endpoint before enabling.",
    );
  }
}
