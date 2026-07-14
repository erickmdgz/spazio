"use client";

// In-memory wizard + cart state for the whole demo. Lives in the root layout so
// it survives client-side navigation between steps. No database, no persistence —
// a refresh resets the demo, which is exactly what we want for a class demo.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RenderResult } from "./render/types";
import { BUDGET_DEFAULT } from "./scenarios";

export interface RoomSelection {
  id: string;
  widthM: number;
  lengthM: number;
}

export interface StyleSelection {
  id: string;
  note: string;
  budgetCop: number;
}

export interface Contact {
  email: string;
  phone: string;
  address: string;
}

export interface OrderInfo {
  number: string;
  placedAt: Date;
  contact: Contact;
  productIds: string[];
}

interface DemoState {
  room?: RoomSelection;
  style?: StyleSelection;
  render?: RenderResult;
  cart: string[];
  order?: OrderInfo;
}

interface DemoStore extends DemoState {
  budgetCop: number;
  setRoom: (room: RoomSelection) => void;
  setStyle: (style: StyleSelection) => void;
  setRender: (render: RenderResult) => void;
  isInCart: (productId: string) => boolean;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  toggleCart: (productId: string) => void;
  placeOrder: (contact: Contact) => OrderInfo;
  reset: () => void;
}

const DemoContext = createContext<DemoStore | null>(null);

function makeOrderNumber(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  const y = new Date().getFullYear();
  return `SPZ-${y}-${n}`;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({ cart: [] });

  const setRoom = useCallback((room: RoomSelection) => {
    setState((s) => ({ ...s, room }));
  }, []);

  const setStyle = useCallback((style: StyleSelection) => {
    setState((s) => ({ ...s, style }));
  }, []);

  // Setting a render auto-populates the cart from its tagged items (FR-031).
  const setRender = useCallback((render: RenderResult) => {
    setState((s) => ({
      ...s,
      render,
      cart: render.items.map((i) => i.productId),
    }));
  }, []);

  const isInCart = useCallback(
    (productId: string) => state.cart.includes(productId),
    [state.cart],
  );

  const addToCart = useCallback((productId: string) => {
    setState((s) =>
      s.cart.includes(productId) ? s : { ...s, cart: [...s.cart, productId] },
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setState((s) => ({ ...s, cart: s.cart.filter((id) => id !== productId) }));
  }, []);

  const toggleCart = useCallback((productId: string) => {
    setState((s) =>
      s.cart.includes(productId)
        ? { ...s, cart: s.cart.filter((id) => id !== productId) }
        : { ...s, cart: [...s.cart, productId] },
    );
  }, []);

  const placeOrder = useCallback((contact: Contact): OrderInfo => {
    const order: OrderInfo = {
      number: makeOrderNumber(),
      placedAt: new Date(),
      contact,
      productIds: [],
    };
    setState((s) => {
      const finalized = { ...order, productIds: [...s.cart] };
      return { ...s, order: finalized };
    });
    // Return a best-effort copy for immediate navigation; the stored order
    // captures the real cart snapshot above.
    return order;
  }, []);

  const reset = useCallback(() => {
    setState({ cart: [] });
  }, []);

  const value = useMemo<DemoStore>(
    () => ({
      ...state,
      budgetCop: state.style?.budgetCop ?? BUDGET_DEFAULT,
      setRoom,
      setStyle,
      setRender,
      isInCart,
      addToCart,
      removeFromCart,
      toggleCart,
      placeOrder,
      reset,
    }),
    [
      state,
      setRoom,
      setStyle,
      setRender,
      isInCart,
      addToCart,
      removeFromCart,
      toggleCart,
      placeOrder,
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
