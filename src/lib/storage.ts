// Cloud-backed data layer (Supabase) for products and bills.
// Each user only sees their own data via RLS.

import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "cash" | "online";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  expiry: string; // ISO
  batch?: string;
  manufacturer?: string;
  sku?: string;
  prescription?: boolean;
  taxPercent?: number;
  createdAt: string;
};

export type BillItem = {
  productId: string;
  name: string;
  price: number;
  costPrice?: number;
  qty: number;
  taxPercent: number;
};

export type Bill = {
  id: string;
  number: string;
  customerName?: string;
  customerPhone?: string;
  customerNotes?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  cashier?: string;
};

// --- Mappers (DB row -> domain) ---
type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number | string;
  cost_price: number | string | null;
  stock: number;
  expiry: string;
  batch: string | null;
  manufacturer: string | null;
  sku: string | null;
  prescription: boolean;
  tax_percent: number | string;
  created_at: string;
};

const num = (v: number | string | null | undefined) =>
  v == null ? undefined : typeof v === "string" ? Number(v) : v;

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    price: Number(r.price) || 0,
    costPrice: num(r.cost_price),
    stock: r.stock,
    expiry: r.expiry,
    batch: r.batch ?? undefined,
    manufacturer: r.manufacturer ?? undefined,
    sku: r.sku ?? undefined,
    prescription: r.prescription,
    taxPercent: Number(r.tax_percent) || 0,
    createdAt: r.created_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

// --- Products ---
export const productsStore = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => rowToProduct(r as ProductRow));
  },

  async add(p: Omit<Product, "id" | "createdAt">): Promise<Product> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id,
        name: p.name,
        category: p.category,
        price: p.price,
        cost_price: p.costPrice ?? null,
        stock: p.stock,
        expiry: p.expiry,
        batch: p.batch ?? null,
        manufacturer: p.manufacturer ?? null,
        sku: p.sku ?? null,
        prescription: !!p.prescription,
        tax_percent: p.taxPercent ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToProduct(data as ProductRow);
  },

  async update(id: string, patch: Partial<Product>): Promise<void> {
    const update: {
      name?: string;
      category?: string;
      price?: number;
      cost_price?: number | null;
      stock?: number;
      expiry?: string;
      batch?: string | null;
      manufacturer?: string | null;
      sku?: string | null;
      prescription?: boolean;
      tax_percent?: number;
    } = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.price !== undefined) update.price = patch.price;
    if (patch.costPrice !== undefined) update.cost_price = patch.costPrice ?? null;
    if (patch.stock !== undefined) update.stock = patch.stock;
    if (patch.expiry !== undefined) update.expiry = patch.expiry;
    if (patch.batch !== undefined) update.batch = patch.batch ?? null;
    if (patch.manufacturer !== undefined) update.manufacturer = patch.manufacturer ?? null;
    if (patch.sku !== undefined) update.sku = patch.sku ?? null;
    if (patch.prescription !== undefined) update.prescription = patch.prescription;
    if (patch.taxPercent !== undefined) update.tax_percent = patch.taxPercent ?? 0;
    const { error } = await supabase.from("products").update(update).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },

  async decrementStock(id: string, qty: number): Promise<void> {
    // Read-modify-write (single user, low contention)
    const { data, error } = await supabase
      .from("products")
      .select("stock")
      .eq("id", id)
      .single();
    if (error) throw error;
    const next = Math.max(0, (data?.stock ?? 0) - qty);
    const { error: upErr } = await supabase
      .from("products")
      .update({ stock: next })
      .eq("id", id);
    if (upErr) throw upErr;
  },
};

// --- Bills ---
type BillRow = {
  id: string;
  number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  cashier: string | null;
  payment_method: PaymentMethod;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  created_at: string;
};
type BillItemRow = {
  bill_id: string;
  product_id: string | null;
  name: string;
  price: number | string;
  cost_price: number | string | null;
  qty: number;
  tax_percent: number | string;
};

function rowToBill(b: BillRow, items: BillItemRow[]): Bill {
  return {
    id: b.id,
    number: b.number,
    customerName: b.customer_name ?? undefined,
    customerPhone: b.customer_phone ?? undefined,
    customerNotes: b.customer_notes ?? undefined,
    cashier: b.cashier ?? undefined,
    paymentMethod: b.payment_method,
    subtotal: Number(b.subtotal) || 0,
    tax: Number(b.tax) || 0,
    total: Number(b.total) || 0,
    createdAt: b.created_at,
    items: items.map((it) => ({
      productId: it.product_id ?? "",
      name: it.name,
      price: Number(it.price) || 0,
      costPrice: num(it.cost_price),
      qty: it.qty,
      taxPercent: Number(it.tax_percent) || 0,
    })),
  };
}

export const billsStore = {
  async list(): Promise<Bill[]> {
    const { data: bills, error } = await supabase
      .from("bills")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!bills || bills.length === 0) return [];
    const ids = bills.map((b) => b.id);
    const { data: items, error: itErr } = await supabase
      .from("bill_items")
      .select("*")
      .in("bill_id", ids);
    if (itErr) throw itErr;
    const map = new Map<string, BillItemRow[]>();
    for (const it of (items ?? []) as BillItemRow[]) {
      const arr = map.get(it.bill_id) ?? [];
      arr.push(it);
      map.set(it.bill_id, arr);
    }
    return (bills as BillRow[]).map((b) => rowToBill(b, map.get(b.id) ?? []));
  },

  async get(id: string): Promise<Bill | null> {
    const { data: b, error } = await supabase
      .from("bills")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!b) return null;
    const { data: items, error: itErr } = await supabase
      .from("bill_items")
      .select("*")
      .eq("bill_id", id);
    if (itErr) throw itErr;
    return rowToBill(b as BillRow, (items ?? []) as BillItemRow[]);
  },

  async add(b: Omit<Bill, "id" | "number" | "createdAt">): Promise<Bill> {
    const user_id = await requireUserId();
    // Compute next invoice number per user
    const { count, error: cErr } = await supabase
      .from("bills")
      .select("*", { count: "exact", head: true });
    if (cErr) throw cErr;
    const number = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
    const { data: bill, error: insErr } = await supabase
      .from("bills")
      .insert({
        user_id,
        number,
        customer_name: b.customerName ?? null,
        customer_phone: b.customerPhone ?? null,
        customer_notes: b.customerNotes ?? null,
        cashier: b.cashier ?? null,
        payment_method: b.paymentMethod,
        subtotal: b.subtotal,
        tax: b.tax,
        total: b.total,
      })
      .select()
      .single();
    if (insErr) throw insErr;
    const itemsRows: BillItemRow[] = b.items.map((it) => ({
      bill_id: bill.id,
      product_id: it.productId || null,
      name: it.name,
      price: it.price,
      cost_price: it.costPrice ?? null,
      qty: it.qty,
      tax_percent: it.taxPercent,
    }));
    if (b.items.length > 0) {
      const { error: itErr } = await supabase.from("bill_items").insert(
        itemsRows.map((it) => ({ ...it, user_id })),
      );
      if (itErr) throw itErr;
    }
    return rowToBill(bill as BillRow, itemsRows);
  },
};

// --- Customers (derived from bills) ---
export type Customer = {
  phone: string;
  name: string;
  notes?: string;
  visits: number;
  totalSpent: number;
  lastVisit: string; // ISO
};

export const customersStore = {
  /**
   * Derive unique customers from past bills.
   * Grouped by phone number (or by name if phone is missing).
   * Returns most recent first.
   */
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from("bills")
      .select("customer_name, customer_phone, customer_notes, total, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const map = new Map<string, Customer>();
    for (const b of data ?? []) {
      const phone = (b.customer_phone ?? "").trim();
      const name = (b.customer_name ?? "").trim();
      if (!phone && !name) continue;
      const key = phone || `name:${name.toLowerCase()}`;
      const existing = map.get(key);
      const total = Number(b.total) || 0;
      if (existing) {
        existing.visits += 1;
        existing.totalSpent += total;
        // Keep most recent name/notes (bills are sorted desc, so first wins)
      } else {
        map.set(key, {
          phone,
          name,
          notes: (b.customer_notes ?? "").trim() || undefined,
          visits: 1,
          totalSpent: total,
          lastVisit: b.created_at,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.lastVisit < b.lastVisit ? 1 : -1,
    );
  },
};

// --- Theme (localStorage stays — UI preference only) ---
const THEME_KEY = "pharma.theme";
export const themeStore = {
  get: (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return (window.localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light";
  },
  set: (t: "light" | "dark") => {
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, t);
  },
};

// Kept for backwards-compat call sites; cloud is per-user via RLS automatically.
export function setStorageUser(_userId: string | null) {
  // no-op
}
