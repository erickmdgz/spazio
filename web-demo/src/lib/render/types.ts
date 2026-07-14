// Shared render-provider contract (ADR-002 approach, demo implementation).

export interface RenderInput {
  roomId: string;
  styleId: string;
  /** Free-text style note from the user (optional in the demo). */
  styleNote?: string;
  budgetCop: number;
  /** Approximate room dimensions in metres, for realism. */
  widthM?: number;
  lengthM?: number;
}

/** A tappable product hotspot positioned over the render image. */
export interface TaggedItem {
  productId: string;
  /** Horizontal position as a percentage (0–100) of the render width. */
  xPct: number;
  /** Vertical position as a percentage (0–100) of the render height. */
  yPct: number;
}

export interface RenderResult {
  /** Local, self-contained render image path (see public/rooms). */
  renderImage: string;
  items: TaggedItem[];
  /** Which provider produced this result — surfaced in the UI for honesty. */
  source: "cached" | "openai";
}

export interface RenderProvider {
  generate(input: RenderInput): Promise<RenderResult>;
}
