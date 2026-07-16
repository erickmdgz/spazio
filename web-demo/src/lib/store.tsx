"use client";

// Wizard state + backend session for the whole app. Since the ADR-024 pivot the
// backend (backend/, Fastify + Prisma) is the source of truth for the loop's
// data — project, render, cart, order — while this store keeps the wizard's UI
// selections and the cached render visuals (the ADR-002 image vendor is still
// an open task, so the composite image stays a local demo asset).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RenderResult } from "./render/types";
import { BUDGET_DEFAULT, getRoom } from "./scenarios";
import * as api from "./api";
import type {
  BackendCart,
  BackendRenderItem,
  BackendStyle,
  CatalogProduct,
  CheckoutResult,
  Contact,
  ProductSource,
} from "./api";

export type { Contact } from "./api";

export interface RoomSelection {
  id: string;
  widthM: number;
  lengthM: number;
  /**
   * The user's real uploaded photo, when they chose "Upload a photo" rather than
   * a sample room. Its bytes are sent to the backend as-is (FR-005). Absent for
   * a sample room, whose bundled illustration is rasterised on upload instead.
   */
  file?: File | null;
}

/**
 * Fetches the sample room's bundled PHOTO bytes so that a sample selection
 * uploads a real image the render engine can composite (the byte-upload
 * endpoint accepts jpeg/png/webp; the sample is a real .png photo, not an
 * illustration). Returns null — and the caller simply skips the upload — if the
 * asset cannot be fetched.
 */
async function sampleRoomBlob(roomId: string): Promise<Blob | null> {
  try {
    const src = getRoom(roomId)?.thumbnail ?? "/rooms/sample-living.png";
    const res = await fetch(src);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export interface StyleSelection {
  id: string;
  note: string;
  budgetCop: number;
}

/** Generation status as tracked by the wizard; "idle" until a job is submitted. */
export type RenderStatus = "idle" | api.RenderGenerationStatus;

export interface PlacedOrder extends CheckoutResult {
  contact: Contact;
  placedAt: Date;
  /** Cart lines snapshotted at checkout, for the confirmation breakdown. */
  items: BackendCart["items"];
}

interface DemoState {
  room?: RoomSelection;
  style?: StyleSelection;
  /**
   * Which catalog the user is browsing (ADR-028): "supplier" = Local suppliers
   * (purchasable Spazio SKUs) | "public" = Brand suppliers (display-only ABO
   * items, never carted). Drives the /select catalog query and the cart
   * expectation on /render.
   */
  source: ProductSource;
  /** The user's curated furniture selection — product ids, at most 3 (ADR-028). */
  selectedProductIds: string[];
  projectId?: string;
  backendStyleId?: string;
  renderVisual?: RenderResult;
  renderId?: string;
  /**
   * The room:style:selection key renderId was submitted for (BUG-003). Lets the
   * render page resume polling an already-submitted render after a reload
   * instead of submitting a duplicate; cleared by resetRender().
   */
  renderKey?: string;
  renderStatus: RenderStatus;
  renderItems: BackendRenderItem[];
  cart?: BackendCart;
  order?: PlacedOrder;
}

/**
 * Wizard slices that survive a page reload (BUG-003), kept in sessionStorage —
 * per-tab, gone when the tab closes. Before this, all state lived in memory
 * only: any reload wiped room/style/selection/renderId, the guards bounced the
 * user back to /room, and a render that had COMPLETED server-side became
 * unreachable. Never persisted: the room File (its bytes are already uploaded),
 * and server-derived data (render items, cart, visuals — refetched by id).
 */
const PERSIST_KEY = "spazio_demo_v1";

type PersistedState = Pick<
  DemoState,
  | "projectId"
  | "room"
  | "style"
  | "backendStyleId"
  | "source"
  | "selectedProductIds"
  | "renderId"
  | "renderKey"
>;

/** Read + sanitize the persisted wizard; null on missing/corrupted storage. */
function readPersisted(): Partial<PersistedState> | null {
  try {
    const raw = window.sessionStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    if (typeof saved !== "object" || saved === null) return null;
    const out: Partial<PersistedState> = {};
    if (typeof saved.projectId === "string") out.projectId = saved.projectId;
    if (
      saved.room &&
      typeof saved.room.id === "string" &&
      Number.isFinite(saved.room.widthM) &&
      Number.isFinite(saved.room.lengthM)
    ) {
      out.room = { id: saved.room.id, widthM: saved.room.widthM, lengthM: saved.room.lengthM };
    }
    if (
      saved.style &&
      typeof saved.style.id === "string" &&
      Number.isFinite(saved.style.budgetCop) &&
      saved.style.budgetCop > 0
    ) {
      out.style = {
        id: saved.style.id,
        note: typeof saved.style.note === "string" ? saved.style.note : "",
        budgetCop: saved.style.budgetCop,
      };
    }
    if (typeof saved.backendStyleId === "string") out.backendStyleId = saved.backendStyleId;
    if (saved.source === "supplier" || saved.source === "public") out.source = saved.source;
    if (Array.isArray(saved.selectedProductIds)) {
      out.selectedProductIds = saved.selectedProductIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, 3);
    }
    if (typeof saved.renderId === "string") out.renderId = saved.renderId;
    if (typeof saved.renderKey === "string") out.renderKey = saved.renderKey;
    return out;
  } catch {
    return null; // corrupted or unavailable storage — start fresh
  }
}

interface DemoStore extends DemoState {
  budgetCop: number;
  /**
   * True once the sessionStorage rehydration effect has run (BUG-003). Page
   * redirect guards MUST wait for this — before it, the state is still the
   * empty INITIAL and a guard would bounce a legitimate reload back to /room.
   */
  hydrated: boolean;
  /**
   * Forget the current render (id/key/status/items/visual) so the next visit to
   * /render submits a FRESH job for the same selection instead of resuming —
   * used after a failed render and by "Try other furniture" (BUG-003).
   */
  resetRender: () => void;
  /** Room selected: bootstrap the project at first input (§0.1#3) + photo + dimensions. */
  beginRoom: (room: RoomSelection) => Promise<void>;
  /** Style/budget selected: resolve the backend style by code and patch the project. */
  applyStyle: (style: StyleSelection) => Promise<void>;
  /** Persist the chosen catalog source (Local vs Brand suppliers — ADR-028). */
  setSource: (source: ProductSource) => void;
  /** Browse the catalog for the current source + style + budget (FR-066). */
  loadCatalog: () => Promise<CatalogProduct[]>;
  /** Persist the user's curated selection (product ids, at most 3 — ADR-028). */
  setSelection: (productIds: string[]) => void;
  /** Iterate (FR-069): drop the selection, keep photo/source/style/project. */
  clearSelection: () => void;
  setRenderVisual: (render: RenderResult) => void;
  /** Submit the render job (202 + poll — plan §1.1). */
  submitRender: () => Promise<void>;
  /** Poll the render; on generation success loads the tagged items + auto-populated cart. */
  refreshRender: () => Promise<RenderStatus>;
  reloadCart: () => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  /** True if a product (by sku) is in the backend cart. */
  isInCart: (sku: string) => boolean;
  cartItemIdFor: (sku: string) => string | undefined;
  /** Confirm the cart, run the single COP capture, store the order. */
  checkoutOrder: (contact: Contact) => Promise<PlacedOrder>;
  reset: () => void;
}

const DemoContext = createContext<DemoStore | null>(null);

const INITIAL: DemoState = {
  renderStatus: "idle",
  renderItems: [],
  source: "supplier",
  selectedProductIds: [],
};

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;
  const stylesRef = useRef<BackendStyle[] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate the wizard from sessionStorage after mount (BUG-003). Reading
  // storage inside the useState initializer would desync the server-rendered
  // HTML from the first client render (hydration mismatch), so it happens in an
  // effect and pages gate their guards on `hydrated`. Strict Mode re-runs this
  // in dev; the merge is idempotent.
  useEffect(() => {
    const saved = readPersisted();
    if (saved) setState((s) => ({ ...s, ...saved }));
    setHydrated(true);
  }, []);

  // Persist the wizard slices on every change so a reload resumes the session
  // instead of restarting it (BUG-003).
  useEffect(() => {
    if (!hydrated) return;
    const { projectId, room, style, backendStyleId, source, selectedProductIds, renderId, renderKey } =
      state;
    try {
      window.sessionStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          projectId,
          // Strip the File explicitly — its bytes are already on the backend.
          room: room ? { id: room.id, widthM: room.widthM, lengthM: room.lengthM } : undefined,
          style,
          backendStyleId,
          source,
          selectedProductIds,
          renderId,
          renderKey,
        } satisfies Partial<PersistedState>),
      );
    } catch {
      // Quota/private-mode write failures only lose persistence, never the session.
    }
  }, [hydrated, state]);

  const beginRoom = useCallback(async (room: RoomSelection) => {
    let projectId = stateRef.current.projectId;
    if (!projectId) {
      projectId = (await api.bootstrapProject()).id;
    }
    await api.patchProject(projectId, {
      roomWidthCm: Math.round(room.widthM * 100),
      roomLengthCm: Math.round(room.lengthM * 100),
    });
    // Upload the room photo bytes (FR-005). A real upload sends the chosen file
    // untouched; a sample room rasterises its bundled illustration so the render
    // engine still receives real image bytes to composite.
    const photo = room.file ?? (await sampleRoomBlob(room.id));
    if (photo) {
      await api.uploadRoomPhoto(projectId, photo);
    }
    // Keep the File out of persisted state (it's consumed by the upload above).
    const stored: RoomSelection = { id: room.id, widthM: room.widthM, lengthM: room.lengthM };
    setState((s) => ({ ...s, room: stored, projectId }));
  }, []);

  const applyStyle = useCallback(async (style: StyleSelection) => {
    const projectId = stateRef.current.projectId;
    if (!projectId) throw new Error("Pick a room first.");
    if (!stylesRef.current) {
      stylesRef.current = (await api.listStyles()).styles;
    }
    const backendStyle = stylesRef.current.find((s) => s.code === style.id);
    await api.patchProject(projectId, {
      ...(backendStyle ? { styleId: backendStyle.id } : {}),
      // Keep the chosen look queryable even when the style row is not seeded yet.
      freeText: [style.id, style.note.trim()].filter(Boolean).join(" · "),
      budgetMaxCop: style.budgetCop,
    });
    setState((s) => ({ ...s, style, backendStyleId: backendStyle?.id }));
  }, []);

  const setSource = useCallback((source: ProductSource) => {
    // Switching the catalog invalidates any prior selection (different products).
    setState((s) => (s.source === source ? s : { ...s, source, selectedProductIds: [] }));
  }, []);

  const loadCatalog = useCallback(async (): Promise<CatalogProduct[]> => {
    const { source, backendStyleId, style } = stateRef.current;
    if (!style) throw new Error("Pick a style first.");
    // Match the render pipeline: prefer the resolved backend style id; fall back
    // to the style code when the row is not seeded (the route maps either).
    const styleId = backendStyleId ?? style.id;
    const { products } = await api.getCatalog(source, styleId, style.budgetCop);
    return products;
  }, []);

  const setSelection = useCallback((productIds: string[]) => {
    setState((s) => ({ ...s, selectedProductIds: productIds.slice(0, 3) }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, selectedProductIds: [] }));
  }, []);

  const setRenderVisual = useCallback((render: RenderResult) => {
    setState((s) => ({ ...s, renderVisual: render }));
  }, []);

  const submitRender = useCallback(async () => {
    const { projectId, backendStyleId, style, selectedProductIds, room } = stateRef.current;
    if (!projectId || !style) throw new Error("Missing room or style.");
    const created = await api.createRender({
      projectId,
      ...(backendStyleId ? { styleId: backendStyleId } : {}),
      ...(style.note.trim() ? { freeText: style.note.trim() } : {}),
      budgetMaxCop: style.budgetCop,
      // Composite exactly the user's picks (ADR-028, FR-068). Omitted when empty
      // so the backend keeps its auto-match fallback (backward compatible).
      ...(selectedProductIds.length ? { productIds: selectedProductIds } : {}),
    });
    setState((s) => ({
      ...s,
      renderId: created.renderId,
      // Same key format the render page computes — lets a reload resume THIS
      // render instead of submitting a duplicate (BUG-003).
      renderKey: room ? `${room.id}:${style.id}:${selectedProductIds.join(",")}` : undefined,
      renderStatus: created.status,
      renderItems: [],
      cart: undefined,
    }));
  }, []);

  const resetRender = useCallback(() => {
    setState((s) => ({
      ...s,
      renderId: undefined,
      renderKey: undefined,
      renderStatus: "idle",
      renderItems: [],
      renderVisual: undefined,
    }));
  }, []);

  const reloadCart = useCallback(async () => {
    const projectId = stateRef.current.projectId;
    if (!projectId) return;
    try {
      const cart = await api.getCart(projectId);
      setState((s) => ({ ...s, cart }));
    } catch (error) {
      if (error instanceof api.ApiError && error.status === 404) {
        setState((s) => ({ ...s, cart: undefined })); // no cart yet (render not completed)
        return;
      }
      throw error;
    }
  }, []);

  const refreshRender = useCallback(async (): Promise<RenderStatus> => {
    const renderId = stateRef.current.renderId;
    if (!renderId) return "idle";
    const status = (await api.getRender(renderId)).status;
    if (status === "completed" && stateRef.current.renderStatus !== "completed") {
      // Published immediately on generation success (ADR-025): tags + the
      // auto-populated cart (FR-031) are ready as soon as the job completes.
      const { items } = await api.getRenderItems(renderId);
      setState((s) => ({ ...s, renderStatus: status, renderItems: items }));
      await reloadCart();
    } else {
      setState((s) => ({ ...s, renderStatus: status }));
    }
    return status;
  }, [reloadCart]);

  const removeItem = useCallback(
    async (cartItemId: string) => {
      await api.removeCartItem(cartItemId);
      await reloadCart();
    },
    [reloadCart],
  );

  const isInCart = useCallback(
    (sku: string) => Boolean(stateRef.current.cart?.items.some((i) => i.product.sku === sku)),
    [],
  );

  const cartItemIdFor = useCallback(
    (sku: string) => stateRef.current.cart?.items.find((i) => i.product.sku === sku)?.id,
    [],
  );

  const checkoutOrder = useCallback(async (contact: Contact): Promise<PlacedOrder> => {
    const cart = stateRef.current.cart;
    if (!cart || cart.items.length === 0) throw new Error("The cart is empty.");
    if (cart.status !== "confirmed") {
      await api.confirmCart(cart.id);
    }
    const result = await api.checkout(cart.id, contact);
    const order: PlacedOrder = { ...result, contact, placedAt: new Date(), items: cart.items };
    setState((s) => ({ ...s, order, cart: { ...cart, status: "confirmed" } }));
    return order;
  }, []);

  const reset = useCallback(() => {
    try {
      window.sessionStorage.removeItem(PERSIST_KEY);
    } catch {
      // Storage unavailable — the in-memory reset below still applies.
    }
    setState(INITIAL);
  }, []);

  const value = useMemo<DemoStore>(
    () => ({
      ...state,
      budgetCop: state.style?.budgetCop ?? BUDGET_DEFAULT,
      hydrated,
      beginRoom,
      applyStyle,
      setSource,
      loadCatalog,
      setSelection,
      clearSelection,
      setRenderVisual,
      submitRender,
      resetRender,
      refreshRender,
      reloadCart,
      removeItem,
      isInCart,
      cartItemIdFor,
      checkoutOrder,
      reset,
    }),
    [
      state,
      hydrated,
      beginRoom,
      applyStyle,
      setSource,
      loadCatalog,
      setSelection,
      clearSelection,
      setRenderVisual,
      submitRender,
      resetRender,
      refreshRender,
      reloadCart,
      removeItem,
      isInCart,
      cartItemIdFor,
      checkoutOrder,
      reset,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoStore {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
