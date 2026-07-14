// CachedRenderProvider — the DEFAULT provider.
//
// Serves prepared, offline renders for every sample-room + style scenario:
// a local render image (public/rooms) plus tag coordinates over real catalog
// SKUs. Requires NO API key, works offline, and always succeeds. This is the
// safety net the whole demo rests on.

import { getScenario } from "../scenarios";
import type { RenderInput, RenderProvider, RenderResult } from "./types";

export class CachedRenderProvider implements RenderProvider {
  async generate(input: RenderInput): Promise<RenderResult> {
    const { renderImage, items } = getScenario(input.roomId, input.styleId);
    return { renderImage, items, source: "cached" };
  }
}
