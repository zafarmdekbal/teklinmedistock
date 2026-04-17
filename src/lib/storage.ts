// Tiny localStorage helpers + domain types for the pharma app.

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number; // selling price per unit (incl. tax base)
  stock: number;
  expiry: string; // ISO date
  batch?: string;
  manufacturer?: string;
  sku?: string;
  prescription?: boolean;
  taxPercent?: number; // GST %
  createdAt: string;
};

export type BillItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  taxPercent: number;
};

export type Bill = {
  id: string;
  number: string; // human friendly INV-0001
  customerName?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  cashier?: string;
};

const KEYS = {
  products: "pharma.products",
  bills: "pharma.bills",
  users: "pharma.users",
  session: "pharma.session",
  theme: "pharma.theme",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// Products
export const productsStore = {
  list: () => read<Product[]>(KEYS.products, []),
  save: (items: Product[]) => write(KEYS.products, items),
  add: (p: Omit<Product, "id" | "createdAt">) => {
    const list = productsStore.list();
    const item: Product = { ...p, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    list.unshift(item);
    productsStore.save(list);
    return item;
  },
  update: (id: string, patch: Partial<Product>) => {
    const list = productsStore.list().map((p) => (p.id === id ? { ...p, ...patch } : p));
    productsStore.save(list);
  },
  remove: (id: string) => {
    productsStore.save(productsStore.list().filter((p) => p.id !== id));
  },
  decrementStock: (id: string, qty: number) => {
    const list = productsStore.list().map((p) =>
      p.id === id ? { ...p, stock: Math.max(0, p.stock - qty) } : p,
    );
    productsStore.save(list);
  },
};

// Bills
export const billsStore = {
  list: () => read<Bill[]>(KEYS.bills, []),
  save: (items: Bill[]) => write(KEYS.bills, items),
  add: (b: Omit<Bill, "id" | "number" | "createdAt">) => {
    const list = billsStore.list();
    const number = `INV-${String(list.length + 1).padStart(4, "0")}`;
    const bill: Bill = {
      ...b,
      id: crypto.randomUUID(),
      number,
      createdAt: new Date().toISOString(),
    };
    list.unshift(bill);
    billsStore.save(list);
    return bill;
  },
  get: (id: string) => billsStore.list().find((b) => b.id === id),
};

// Users + session (DEMO ONLY — passwords stored in localStorage; not for production use)
export type User = { id: string; name: string; email: string; password: string };
export type Session = { userId: string; name: string; email: string };

export const authStore = {
  users: () => read<User[]>(KEYS.users, []),
  saveUsers: (u: User[]) => write(KEYS.users, u),
  session: () => read<Session | null>(KEYS.session, null),
  setSession: (s: Session | null) => {
    if (s) write(KEYS.session, s);
    else if (typeof window !== "undefined") window.localStorage.removeItem(KEYS.session);
  },
  signup: (name: string, email: string, password: string) => {
    const users = authStore.users();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    const user: User = { id: crypto.randomUUID(), name, email, password };
    users.push(user);
    authStore.saveUsers(users);
    const session: Session = { userId: user.id, name: user.name, email: user.email };
    authStore.setSession(session);
    return session;
  },
  login: (email: string, password: string) => {
    const user = authStore
      .users()
      .find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error("Invalid email or password.");
    const session: Session = { userId: user.id, name: user.name, email: user.email };
    authStore.setSession(session);
    return session;
  },
  logout: () => authStore.setSession(null),
};

// Demo seed
export function seedDemoProducts(force = false) {
  if (typeof window === "undefined") return;
  const existing = productsStore.list();
  if (existing.length > 0 && !force) return;

  const today = new Date();
  const addMonths = (m: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    return d.toISOString();
  };

  const demo: Array<Omit<Product, "id" | "createdAt">> = [
    { name: "Paracetamol 500mg", category: "Analgesic", price: 25, stock: 120, expiry: addMonths(18), batch: "PCM2245", manufacturer: "Cipla", sku: "MED-001", taxPercent: 12, prescription: false },
    { name: "Amoxicillin 250mg", category: "Antibiotic", price: 85, stock: 40, expiry: addMonths(12), batch: "AMX1180", manufacturer: "Sun Pharma", sku: "MED-002", taxPercent: 12, prescription: true },
    { name: "Cetirizine 10mg", category: "Antihistamine", price: 35, stock: 75, expiry: addMonths(20), batch: "CTZ0921", manufacturer: "Dr. Reddy's", sku: "MED-003", taxPercent: 5, prescription: false },
    { name: "Ibuprofen 400mg", category: "Analgesic", price: 45, stock: 8, expiry: addMonths(2), batch: "IBU3340", manufacturer: "Abbott", sku: "MED-004", taxPercent: 12, prescription: false },
    { name: "Metformin 500mg", category: "Diabetes", price: 60, stock: 90, expiry: addMonths(15), batch: "MET7702", manufacturer: "USV", sku: "MED-005", taxPercent: 5, prescription: true },
    { name: "Omeprazole 20mg", category: "Gastro", price: 55, stock: 50, expiry: addMonths(10), batch: "OMP4412", manufacturer: "Cipla", sku: "MED-006", taxPercent: 12, prescription: true },
    { name: "Vitamin D3 60K", category: "Supplement", price: 95, stock: 30, expiry: addMonths(24), batch: "VTD0088", manufacturer: "Mankind", sku: "MED-007", taxPercent: 18, prescription: false },
    { name: "ORS Sachet (Orange)", category: "Hydration", price: 22, stock: 200, expiry: addMonths(14), batch: "ORS5521", manufacturer: "FDC", sku: "MED-008", taxPercent: 5, prescription: false },
    { name: "Cough Syrup 100ml", category: "Cold & Flu", price: 110, stock: 18, expiry: addMonths(9), batch: "CGH1190", manufacturer: "Glenmark", sku: "MED-009", taxPercent: 12, prescription: false },
    { name: "Insulin Pen 100IU", category: "Diabetes", price: 720, stock: 12, expiry: addMonths(6), batch: "INS0034", manufacturer: "Novo Nordisk", sku: "MED-010", taxPercent: 5, prescription: true },
    { name: "Surgical Mask (50pc)", category: "Consumable", price: 180, stock: 60, expiry: addMonths(36), batch: "MSK2024", manufacturer: "3M", sku: "MED-011", taxPercent: 18, prescription: false },
    { name: "Digital Thermometer", category: "Device", price: 250, stock: 15, expiry: addMonths(48), batch: "THR0012", manufacturer: "Omron", sku: "MED-012", taxPercent: 18, prescription: false },
  ];

  const list = demo.map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));
  productsStore.save(force ? list : [...list, ...existing]);
}

// Theme
export const themeStore = {
  get: () => read<"light" | "dark">(KEYS.theme, "light"),
  set: (t: "light" | "dark") => write(KEYS.theme, t),
};
