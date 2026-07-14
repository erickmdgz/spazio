"use server";

import { generateRender } from "@/lib/render";
import type { RenderInput, RenderResult } from "@/lib/render/types";

// Server action: keeps IMAGE_API_KEY server-side and lets the client wizard
// request a render without ever seeing the key.
export async function requestRender(input: RenderInput): Promise<RenderResult> {
  return generateRender(input);
}
