import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product } from "./storage";

export type CartItem = { product: Product; qty: number };

type CartCtx = {
  items: CartItem[];
  add: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  tax: number;
  total: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add: CartCtx["add"] = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, qty: Math.min(product.stock, i.qty + qty) }
            : i,
        );
      }
      return [...prev, { product, qty: Math.min(product.stock, qty) }];
    });
  };

  const remove: CartCtx["remove"] = (id) =>
    setItems((prev) => prev.filter((i) => i.product.id !== id));

  const setQty: CartCtx["setQty"] = (id, qty) =>
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === id ? { ...i, qty: Math.max(1, Math.min(i.product.stock, qty)) } : i,
      ),
    );

  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const tax = items.reduce(
    (s, i) => s + (i.product.price * i.qty * (i.product.taxPercent ?? 0)) / 100,
    0,
  );
  const total = subtotal + tax;
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, setQty, clear, subtotal, tax, total, count }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
