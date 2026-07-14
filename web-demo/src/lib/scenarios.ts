// Sample rooms, predefined styles, and the prepared render scenarios that the
// offline CachedRenderProvider serves. Every scenario maps to a local render
// image plus tag coordinates over real catalog SKUs.

import type { TaggedItem } from "./render/types";

export interface RoomOption {
  id: string;
  name: string;
  blurb: string;
  thumbnail: string;
  /** Suggested default dimensions in metres. */
  defaultWidthM: number;
  defaultLengthM: number;
}

export interface StyleOption {
  id: string;
  name: string;
  blurb: string;
  /** Swatch colours used in the picker card. */
  swatches: [string, string, string];
}

export const ROOMS: RoomOption[] = [
  {
    id: "living",
    name: "Living room",
    blurb: "An open living space ready for a sofa, rug and warm lighting.",
    thumbnail: "/rooms/living-before.svg",
    defaultWidthM: 4.2,
    defaultLengthM: 5.0,
  },
  {
    id: "bedroom",
    name: "Bedroom",
    blurb: "A calm bedroom with room for a bed, nightstand and greenery.",
    thumbnail: "/rooms/bedroom-before.svg",
    defaultWidthM: 3.4,
    defaultLengthM: 4.0,
  },
];

export const STYLES: StyleOption[] = [
  {
    id: "mediterranean",
    name: "Modern Mediterranean",
    blurb: "Warm earth tones, terracotta accents and natural textures.",
    swatches: ["#C1694F", "#EFE3D2", "#3B6B4E"],
  },
  {
    id: "minimalist",
    name: "Warm Minimalist",
    blurb: "Soft neutrals, clean lines and uncluttered, cozy calm.",
    swatches: ["#CFC7B8", "#B08968", "#7E8B7C"],
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    blurb: "Light woods, airy whites and gentle blue-grey accents.",
    swatches: ["#E1D0B2", "#9DB1B5", "#DED9CE"],
  },
];

export const BUDGET_MIN = 2_000_000;
export const BUDGET_MAX = 12_000_000;
export const BUDGET_DEFAULT = 7_000_000;

// Where each product's tag sits over a room render (percentages of the image).
const POSITIONS: Record<string, Record<string, { xPct: number; yPct: number }>> = {
  living: {
    "sofa-teide": { xPct: 30, yPct: 62 },
    "coffee-table-oak": { xPct: 54, yPct: 79 },
    "rug-sabana": { xPct: 50, yPct: 86 },
    "floor-lamp-arco": { xPct: 92, yPct: 46 },
    "armchair-boucle": { xPct: 78, yPct: 64 },
    "wall-art-terra": { xPct: 68, yPct: 24 },
    "plant-monstera": { xPct: 11, yPct: 66 },
    "pendant-ceramic": { xPct: 68, yPct: 15 },
    "table-lamp-clay": { xPct: 9, yPct: 58 },
  },
  bedroom: {
    "bed-frame-nordic": { xPct: 50, yPct: 60 },
    "nightstand-luna": { xPct: 84, yPct: 76 },
    "table-lamp-clay": { xPct: 83, yPct: 58 },
    "rug-sabana": { xPct: 50, yPct: 87 },
    "wall-art-terra": { xPct: 32, yPct: 22 },
    "plant-monstera": { xPct: 11, yPct: 66 },
  },
};

// Which SKUs appear in each room + style render.
const SCENARIO_ITEMS: Record<string, Record<string, string[]>> = {
  living: {
    mediterranean: [
      "sofa-teide",
      "rug-sabana",
      "wall-art-terra",
      "plant-monstera",
      "pendant-ceramic",
      "table-lamp-clay",
    ],
    minimalist: [
      "sofa-teide",
      "coffee-table-oak",
      "rug-sabana",
      "floor-lamp-arco",
      "armchair-boucle",
      "plant-monstera",
    ],
    scandinavian: [
      "sofa-teide",
      "coffee-table-oak",
      "rug-sabana",
      "floor-lamp-arco",
      "plant-monstera",
      "table-lamp-clay",
    ],
  },
  bedroom: {
    mediterranean: [
      "bed-frame-nordic",
      "nightstand-luna",
      "table-lamp-clay",
      "rug-sabana",
      "wall-art-terra",
      "plant-monstera",
    ],
    minimalist: [
      "bed-frame-nordic",
      "nightstand-luna",
      "rug-sabana",
      "table-lamp-clay",
      "wall-art-terra",
      "plant-monstera",
    ],
    scandinavian: [
      "bed-frame-nordic",
      "nightstand-luna",
      "table-lamp-clay",
      "rug-sabana",
      "plant-monstera",
      "wall-art-terra",
    ],
  },
};

export interface Scenario {
  renderImage: string;
  items: TaggedItem[];
}

export function getScenario(roomId: string, styleId: string): Scenario {
  const room = SCENARIO_ITEMS[roomId] ? roomId : "living";
  const style = SCENARIO_ITEMS[room][styleId] ? styleId : "minimalist";
  const ids = SCENARIO_ITEMS[room][style];
  const pos = POSITIONS[room];
  const items: TaggedItem[] = ids
    .filter((id) => pos[id])
    .map((id) => ({ productId: id, xPct: pos[id].xPct, yPct: pos[id].yPct }));
  return {
    renderImage: `/rooms/${room}-${style}.svg`,
    items,
  };
}

export function getRoom(id: string): RoomOption | undefined {
  return ROOMS.find((r) => r.id === id);
}

export function getStyle(id: string): StyleOption | undefined {
  return STYLES.find((s) => s.id === id);
}
