// Typed client for the Spazio backend (/api/v1, same-origin via the Next.js
// rewrite in next.config.mjs). The device token is the pilot's anonymous
// session scope (ADR-022 — no accounts): generated once per browser and sent
// when bootstrapping a project.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const DEVICE_TOKEN_KEY = "spazio_device_token";

export function deviceToken(): string {
  let token = window.localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

const UNREACHABLE = "Could not reach the Spazio service — is the backend running?";

/** Turns a non-2xx response into an ApiError, preferring the backend's message. */
async function throwForResponse(response: Response): Promise<never> {
  let message = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    // non-JSON error body — keep the generic message
  }
  throw new ApiError(message, response.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: {
        // Scopes every call to this device's project data (NFR-007).
        "x-device-token": deviceToken(),
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }
  if (!response.ok) await throwForResponse(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// --- Response shapes (mirror backend/src/routes/client/*) ---

export interface BackendStyle {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

/**
 * Where a product comes from (ADR-027, FR-062..065). A `supplier` product is a
 * curated, purchasable Spazio SKU (the default, unchanged behavior). A `public`
 * product is a display-only Amazon Berkeley Objects (ABO) bootstrap-fallback
 * item — "not sold by Spazio": never carted/checked out, surfaced with a
 * "View at retailer" outbound link and CC BY 4.0 attribution instead.
 */
export type ProductSource = "supplier" | "public";

/**
 * CC BY 4.0 attribution for a display-only ABO product (ADR-027, FR-065). Mirrors
 * the backend `Attribution` object emitted by productSummary(); present only for
 * source=public products, null for supplier SKUs.
 */
export interface Attribution {
  sourceName: string;
  sourceUrl: string;
  sourceImageUrl: string;
  imageLicense: string;
}

export interface ProductSummary {
  productId: string;
  sku: string;
  name: string;
  category: string;
  priceCop: number;
  photos: string[];
  classification: "ready_made" | "made_to_order";
  deliveryLeadTimeDays: number;
  productionLeadTimeDays: number | null;
  supplierName: string | null;
  // --- ADR-027 public-catalog fallback (additive, optional) ---
  // Absent or "supplier" => a normal supplier SKU. "public" => a display-only
  // ABO product; the fields below are then populated (CC BY 4.0, FR-063/FR-065)
  // and the UI must show the "not sold by Spazio" label + the "View at retailer"
  // link instead of any add-to-cart affordance (FR-064). These mirror exactly
  // what the backend productSummary() serializer emits.
  source?: ProductSource;
  notSoldBySpazio?: boolean;
  outboundUrl?: string | null;
  attribution?: Attribution | null;
}

/** True for a display-only ABO bootstrap-fallback product (ADR-027, FR-062..065). */
export function isPublicProduct(product: ProductSummary): boolean {
  return product.source === "public";
}

export interface BackendRenderItem {
  id: string;
  productId: string;
  tagPosition: { x: number; y: number } | null;
  priceCopSnapshot: number;
  product: ProductSummary;
}

export interface BackendCartItem {
  id: string;
  productId: string;
  quantity: number;
  priceCopSnapshot: number;
  product: ProductSummary;
}

export interface BackendCart {
  id: string;
  status: "draft" | "confirmed";
  items: BackendCartItem[];
}

export interface CheckoutResult {
  orderId: string;
  status: string;
  subtotalCop: number;
  commissionCop: number;
  totalCop: number;
  currency: string;
  payment: { status: string; reference: string };
}

export interface BackendOrder {
  id: string;
  status: string;
  subtotalCop: number;
  commissionCop: number;
  totalCop: number;
  currency: string;
  purchaseOrders: Array<{ id: string; supplierId: string; status: string; subtotalCop: number }>;
  payment: { status: string; amountCop: number } | null;
}

export interface Contact {
  email: string;
  phone: string;
  address: string;
}

// --- Calls ---

export function bootstrapProject(): Promise<{ id: string }> {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify({ deviceToken: deviceToken() }),
  });
}

export function patchProject(
  projectId: string,
  patch: Partial<{
    roomWidthCm: number;
    roomLengthCm: number;
    styleId: string;
    freeText: string;
    budgetMaxCop: number;
  }>,
): Promise<{ id: string }> {
  return request(`/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/**
 * Uploads the raw bytes of a room photo (FR-005). The backend
 * `POST /projects/:id/photos` route ingests the image body directly (no JSON) —
 * the Content-Type is the file's own MIME (image/jpeg | image/png | image/webp),
 * the bytes are stored under a server-assigned key, and the created RoomPhoto is
 * returned. Device-scoped (NFR-007) via the x-device-token header.
 */
export async function uploadRoomPhoto(
  projectId: string,
  photo: Blob,
): Promise<{ id: string; storageKey: string }> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/projects/${projectId}/photos`, {
      method: "POST",
      headers: {
        "x-device-token": deviceToken(),
        "content-type": photo.type || "application/octet-stream",
      },
      body: photo,
    });
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }
  if (!response.ok) await throwForResponse(response);
  return (await response.json()) as { id: string; storageKey: string };
}

/**
 * Fetches the stored render image bytes for the owning device (NFR-007). An
 * <img> tag cannot send the x-device-token header, so the caller turns the
 * returned Blob into an object URL. A render still generating (or not owned by
 * this device) returns non-2xx — the caller falls back to the cached visual.
 */
export async function fetchRenderImage(renderId: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/renders/${renderId}/image`, {
      headers: { "x-device-token": deviceToken() },
    });
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }
  if (!response.ok) await throwForResponse(response);
  return response.blob();
}

export function listStyles(): Promise<{ styles: BackendStyle[] }> {
  return request("/styles");
}

// Generation lifecycle (docs_en/06_api.md §5): queued → processing → completed | failed.
// A completed render is published to the user immediately (ADR-025).
export type RenderGenerationStatus = "queued" | "processing" | "completed" | "failed";

export function createRender(input: {
  projectId: string;
  styleId?: string;
  freeText?: string;
  budgetMaxCop?: number;
}): Promise<{ renderId: string; status: RenderGenerationStatus }> {
  return request("/renders", { method: "POST", body: JSON.stringify(input) });
}

export function getRender(
  renderId: string,
): Promise<{ renderId: string; status: RenderGenerationStatus }> {
  return request(`/renders/${renderId}`);
}

export function getRenderItems(
  renderId: string,
): Promise<{ renderId: string; items: BackendRenderItem[] }> {
  return request(`/renders/${renderId}/items`);
}

export function getCart(projectId: string): Promise<BackendCart> {
  return request(`/cart?projectId=${encodeURIComponent(projectId)}`);
}

export function removeCartItem(cartItemId: string): Promise<void> {
  return request(`/cart/items/${cartItemId}`, { method: "DELETE" });
}

export function confirmCart(cartId: string): Promise<{ id: string; status: string }> {
  return request("/cart/confirm", { method: "POST", body: JSON.stringify({ cartId }) });
}

export function checkout(cartId: string, contact: Contact): Promise<CheckoutResult> {
  return request("/checkout", {
    method: "POST",
    body: JSON.stringify({
      cartId,
      contact: {
        email: contact.email,
        phone: contact.phone,
        shipping: { line1: contact.address, city: "Bogotá" },
      },
    }),
  });
}

export function getOrder(orderId: string): Promise<BackendOrder> {
  return request(`/orders/${orderId}`);
}
