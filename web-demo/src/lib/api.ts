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
    throw new ApiError("Could not reach the Spazio service — is the backend running?", 0);
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(message, response.status);
  }
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

export function addRoomPhoto(projectId: string, storageKey: string): Promise<{ id: string }> {
  return request(`/projects/${projectId}/photos`, {
    method: "POST",
    body: JSON.stringify({ storageKey }),
  });
}

export function listStyles(): Promise<{ styles: BackendStyle[] }> {
  return request("/styles");
}

export function createRender(input: {
  projectId: string;
  styleId?: string;
  freeText?: string;
  budgetMaxCop?: number;
}): Promise<{ renderId: string; reviewStatus: string }> {
  return request("/renders", { method: "POST", body: JSON.stringify(input) });
}

export function getRender(
  renderId: string,
): Promise<{ renderId: string; reviewStatus: "pending_review" | "approved" | "rejected" }> {
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
