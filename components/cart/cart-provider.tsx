"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const MAX_CART_ITEMS = 30;
export const MAX_CART_QUANTITY = 100000;
const storageKey = "dla-ac-cart-v1";

export type CartItem = { id: string; quantity: number };
type AddResult = "added" | "full" | "invalid-quantity" | "quantity-limit" | "not-ready";
type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  addItem: (id: string, quantity?: number) => AddResult;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function parseCart(value: string | null): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const result: CartItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !entry.id || entry.id.length > 80 || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > MAX_CART_QUANTITY) continue;
      const existing = result.find((item) => item.id === entry.id);
      if (existing) existing.quantity = Math.min(MAX_CART_QUANTITY, existing.quantity + entry.quantity);
      else if (result.length < MAX_CART_ITEMS) result.push({ id: entry.id, quantity: entry.quantity });
    }
    return result;
  } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setItems(parseCart(window.localStorage.getItem(storageKey))); } catch { setItems([]); }
    setReady(true);
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) setItems(parseCart(event.newValue)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* The cart remains available for this session. */ }
  }, [items, ready]);

  const addItem = useCallback((id: string, quantity = 1): AddResult => {
    if (!ready || !id || id.length > 80) return "not-ready";
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) return "invalid-quantity";
    const existing = items.find((item) => item.id === id);
    if (!existing && items.length >= MAX_CART_ITEMS) return "full";
    if (existing && existing.quantity + quantity > MAX_CART_QUANTITY) return "quantity-limit";
    setItems((current) => {
      const match = current.find((item) => item.id === id);
      if (match) return current.map((item) => item.id === id ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + quantity) } : item);
      return current.length < MAX_CART_ITEMS ? [...current, { id, quantity }] : current;
    });
    return "added";
  }, [items, ready]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity)) return;
    const valid = Math.max(1, Math.min(quantity, MAX_CART_QUANTITY));
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: valid } : item));
  }, []);
  const removeItem = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clearCart = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, ready, addItem, updateQuantity, removeItem, clearCart }), [items, ready, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart requires CartProvider");
  return context;
}
