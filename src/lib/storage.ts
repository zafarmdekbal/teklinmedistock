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

// Theme
export const themeStore = {
  get: () => read<"light" | "dark">(KEYS.theme, "light"),
  set: (t: "light" | "dark") => write(KEYS.theme, t),
};
