"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { MAX_CART_ITEMS, MAX_CART_QUANTITY, useCart } from "@/components/cart/cart-provider";
import type { Lot } from "@/lib/lots";

export function AddToCartButton({ lotId, title, status, quantity = 1, className }: { lotId: string; title: string; status: Lot["status"]; quantity?: number; className: string }) {
  const { addItem, ready } = useCart();
  const [feedback, setFeedback] = useState<"added" | "full" | "invalid-quantity" | "quantity-limit" | "not-ready" | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const message = feedback === "added" ? "Ditambahkan ke keranjang." : feedback === "full" ? `Keranjang maksimal ${MAX_CART_ITEMS} pilihan.` : feedback === "invalid-quantity" || feedback === "quantity-limit" ? `Jumlah harus antara 1 dan ${MAX_CART_QUANTITY.toLocaleString("id-ID")} unit.` : feedback === "not-ready" ? "Keranjang belum siap." : "";

  return <><button className={className} type="button" aria-label={status === "terjual" ? `${title} sudah terjual` : `Tambah ${title} ke keranjang`} disabled={!ready || status === "terjual"} onClick={() => setFeedback(addItem(lotId, quantity))}>{feedback === "added" ? <Check size={16} /> : <ShoppingBag size={16} />}{status === "terjual" ? "Terjual" : feedback === "added" ? "Ditambahkan" : "Tambah ke keranjang"}</button><span className={feedback && feedback !== "added" ? "cart-button-feedback" : "sr-only"} role="status">{message}</span></>;
}
