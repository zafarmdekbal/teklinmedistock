import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Pencil, Plus, ScanLine, Search, ShoppingCart, Trash2 } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { productsStore, type Product } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SkuScanner } from "@/components/sku-scanner";
import { toast } from "sonner";

import { TableSkeleton } from "@/components/loading-skeleton";

type InventorySearch = {
  add?: number;
  filter?: "low" | "expiring" | "expired";
  q?: string;
};

export const Route = createFileRoute("/_app/inventory")({
  validateSearch: (search: Record<string, unknown>): InventorySearch => {
    const f = search.filter as string | undefined;
    const valid = ["low", "expiring", "expired"];
    return {
      add: search.add ? Number(search.add) : undefined,
      filter: valid.includes(f as string) ? (f as InventorySearch["filter"]) : undefined,
      q: typeof search.q === "string" ? search.q : undefined,
    };
  },
  component: InventoryPage,
});

type FormState = {
  name: string;
  category: string;
  costPrice: string;
  price: string;
  stock: string;
  expiry: string;
  batch: string;
  manufacturer: string;
  sku: string;
  taxPercent: string;
  prescription: boolean;
};

const empty: FormState = {
  name: "",
  category: "",
  costPrice: "",
  price: "",
  stock: "",
  expiry: "",
  batch: "",
  manufacturer: "",
  sku: "",
  taxPercent: "12",
  prescription: false,
};

function InventoryPage() {
  const { q: qParam } = Route.useSearch();
  const [items, setItems] = useState<Product[]>([]);
  const [query, setQuery] = useState(qParam ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof qParam === "string") setQuery(qParam);
  }, [qParam]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [scannerOpen, setScannerOpen] = useState(false);

  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const cart = useCart();

  const quickAdd = (p: Product) => {
    if (p.stock <= 0) {
      toast.error(`${p.name} is out of stock`);
      return;
    }
    cart.add(p, 1);
    toast.success(`${p.name} added to cart`);
  };

  const handleScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    // Match an existing product by SKU
    const match = items.find(
      (p) => (p.sku ?? "").trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (match) {
      // Edit flow with all existing info pre-filled
      setEditing(match);
      setForm({
        name: match.name,
        category: match.category,
        costPrice: match.costPrice != null ? String(match.costPrice) : "",
        price: String(match.price),
        stock: String(match.stock),
        expiry: match.expiry.slice(0, 10),
        batch: match.batch ?? "",
        manufacturer: match.manufacturer ?? "",
        sku: match.sku ?? trimmed,
        taxPercent: String(match.taxPercent ?? 0),
        prescription: !!match.prescription,
      });
      toast.success(`Found ${match.name} · adjust stock and save`);
    } else {
      // New product flow with SKU pre-filled
      setEditing(null);
      setForm({ ...empty, sku: trimmed });
      toast.info("New SKU — fill the rest to add the product");
    }
    setOpen(true);
  };

  const refresh = () => {
    setLoading(true);
    productsStore
      .list()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setLoading(false);
      });
  };
  useEffect(refresh, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const q = query.toLowerCase();
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q) &&
        !(p.sku ?? "").toLowerCase().includes(q)
      )
        return false;

      if (search.filter === "low") return p.stock <= 10;
      if (search.filter === "expiring") {
        const d = new Date(p.expiry).getTime();
        const days = (d - Date.now()) / (1000 * 60 * 60 * 24);
        return days <= 60 && days >= 0;
      }
      if (search.filter === "expired") {
        return new Date(p.expiry).getTime() < Date.now();
      }
      return true;
    });
  }, [items, query, search.filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  useEffect(() => {
    if (search.add) {
      setEditing(null);
      setForm(empty);
      setOpen(true);
      navigate({ search: (prev) => ({ ...prev, add: undefined }), replace: true });
    }
  }, [search.add, navigate]);

  if (loading && items.length === 0) return <TableSkeleton cols={6} />;

  const startAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      price: String(p.price),
      stock: String(p.stock),
      expiry: p.expiry.slice(0, 10),
      batch: p.batch ?? "",
      manufacturer: p.manufacturer ?? "",
      sku: p.sku ?? "",
      taxPercent: String(p.taxPercent ?? 0),
      prescription: !!p.prescription,
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "General",
      costPrice: form.costPrice === "" ? undefined : Number(form.costPrice),
      price: Number(form.price),
      stock: Number(form.stock),
      expiry: form.expiry,
      batch: form.batch.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      sku: form.sku.trim() || undefined,
      taxPercent: Number(form.taxPercent) || 0,
      prescription: form.prescription,
    };
    if (!payload.name || !payload.expiry || isNaN(payload.price) || isNaN(payload.stock)) {
      toast.error("Please fill name, price, stock and expiry.");
      return;
    }
    try {
      if (editing) {
        await productsStore.update(editing.id, payload);
        toast.success("Product updated");
      } else {
        await productsStore.add(payload);
        toast.success("Product added");
      }
      refresh();
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Failed to save product");
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    try {
      await productsStore.remove(p.id);
      refresh();
      toast.success("Product removed");
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete");
    }
  };

  const filterLabel: Record<NonNullable<InventorySearch["filter"]>, string> = {
    low: "Low stock (≤ 10)",
    expiring: "Expiring within 60 days",
    expired: "Expired products",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your products, stock and expiry.
          </p>
          {search.filter && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              Filtered: {filterLabel[search.filter as NonNullable<InventorySearch["filter"]>]}
              <button
                onClick={() => navigate({ search: {}, replace: true })}
                className="hover:underline font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            title="Scan SKU / barcode"
          >
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">Scan SKU</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startAdd} className="shadow-soft">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add product</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
              <DialogHeader className="bg-primary text-primary-foreground px-4 py-2.5 border-b">
                <DialogTitle className="text-sm font-semibold tracking-wide uppercase flex items-center justify-between">
                  <span>{editing ? "Edit Item Master" : "New Item Master"}</span>
                  <span className="text-[10px] font-normal opacity-80 hidden sm:inline">
                    Enter ▸ Next · Ctrl+S Save · Esc Cancel
                  </span>
                </DialogTitle>
              </DialogHeader>
              <MargProductForm
                form={form}
                setForm={setForm}
                editing={!!editing}
                onSubmit={submit}
                onCancel={() => setOpen(false)}
                onScan={() => setScannerOpen(true)}
              />
            </DialogContent>

          </Dialog>
        </div>
      </div>

      <Card className="shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  {items.length === 0
                    ? "No products yet. Add your first one to get started."
                    : "No products match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const lowStock = p.stock <= 10;
                return (
                  <TableRow key={p.id} className="animate-fade-in">
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.manufacturer ?? "—"} {p.batch ? `· Batch ${p.batch}` : ""}
                        {p.prescription ? " · Rx" : ""}
                      </div>
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.price.toFixed(2)}
                      {p.taxPercent ? (
                        <span className="text-xs text-muted-foreground"> +{p.taxPercent}%</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          lowStock
                            ? "inline-block bg-warning/30 text-warning-foreground px-2 py-0.5 rounded-md text-xs"
                            : "tabular-nums"
                        }
                      >
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(p.expiry).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => quickAdd(p)}
                        disabled={p.stock <= 0}
                        className="text-primary hover:text-primary"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(p)}
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <SkuScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleScan}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ---------- Marg-style dense Item Master form ----------
function MargProductForm({
  form,
  setForm,
  editing,
  onSubmit,
  onCancel,
  onScan,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  editing: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  onScan: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Enter advances to next focusable input (Marg style); Shift+Enter goes back.
  const handleKey = (e: KeyboardEvent<HTMLFormElement>) => {
    // Ctrl/Cmd + S => save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      formRef.current?.requestSubmit();
      return;
    }
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.getAttribute("type") === "submit") return;
    e.preventDefault();
    const focusables = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), button[type="submit"], [role="switch"]',
      ) ?? [],
    );
    const idx = focusables.indexOf(target);
    if (idx === -1) return;
    const next = e.shiftKey ? focusables[idx - 1] : focusables[idx + 1];
    next?.focus();
    if (next instanceof HTMLInputElement) next.select?.();
  };

  const margin =
    form.price && form.costPrice
      ? (((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100).toFixed(1)
      : null;
  const stockValue =
    form.stock && form.costPrice
      ? (Number(form.stock) * Number(form.costPrice)).toFixed(2)
      : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} onKeyDown={handleKey} className="flex flex-col">
      <div className="px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto bg-muted/30">
        {/* Section: Item identity */}
        <Section title="Item Information" accent="F2">
          <Row label="Item Name" hint="(Required)" span={2}>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-8 text-sm"
              required
            />
          </Row>
          <Row label="Category">
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Antibiotic / Tablet / Syrup"
              className="h-8 text-sm"
            />
          </Row>
          <Row label="Manufacturer">
            <Input
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              className="h-8 text-sm"
            />
          </Row>
          <Row label="Batch No.">
            <Input
              value={form.batch}
              onChange={(e) => setForm({ ...form, batch: e.target.value })}
              className="h-8 text-sm font-mono uppercase"
            />
          </Row>
          <Row label="Barcode / SKU">
            <div className="flex gap-1">
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Type or scan"
                className="h-8 text-sm font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onScan}
                title="Scan barcode (F4)"
              >
                <ScanLine className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Row>
        </Section>

        {/* Section: Pricing */}
        <Section title="Pricing & Tax" accent="F3">
          <Row label="Purchase Rate" hint="₹/unit">
            <Input
              type="number"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              className="h-8 text-sm text-right tabular-nums"
            />
          </Row>
          <Row label="Sale Rate / MRP" hint="₹/unit (Required)">
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="h-8 text-sm text-right tabular-nums"
              required
            />
          </Row>
          <Row label="GST %">
            <Input
              type="number"
              step="0.01"
              value={form.taxPercent}
              onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
              className="h-8 text-sm text-right tabular-nums"
            />
          </Row>
          <Row label="Margin" hint="auto">
            <div className="h-8 px-2 flex items-center justify-end text-sm tabular-nums rounded-md bg-background border border-input text-muted-foreground">
              {margin !== null ? `${margin} %` : "—"}
            </div>
          </Row>
        </Section>

        {/* Section: Stock */}
        <Section title="Stock & Expiry" accent="F5">
          <Row label="Opening Stock" hint="(Required)">
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="h-8 text-sm text-right tabular-nums"
              required
            />
          </Row>
          <Row label="Expiry Date" hint="(Required)">
            <Input
              type="date"
              value={form.expiry}
              onChange={(e) => setForm({ ...form, expiry: e.target.value })}
              className="h-8 text-sm"
              required
            />
          </Row>
          <Row label="Stock Value" hint="auto" span={2}>
            <div className="h-8 px-2 flex items-center justify-end text-sm tabular-nums rounded-md bg-background border border-input text-muted-foreground">
              {stockValue !== null ? `₹ ${stockValue}` : "—"}
            </div>
          </Row>
        </Section>

        {/* Section: Flags */}
        <Section title="Properties" accent="F6">
          <div className="col-span-full flex items-center justify-between rounded-md border bg-background px-3 py-2">
            <div>
              <div className="text-sm font-medium">Prescription (Rx) required</div>
              <div className="text-[11px] text-muted-foreground">
                Cashier must capture a prescription before sale.
              </div>
            </div>
            <Switch
              checked={form.prescription}
              onCheckedChange={(v) => setForm({ ...form, prescription: v })}
            />
          </div>
        </Section>
      </div>

      {/* Marg-style status / shortcut bar */}
      <div className="border-t bg-muted/60 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          <KeyHint k="Enter" label="Next" />
          <KeyHint k="Shift+Enter" label="Prev" />
          <KeyHint k="Ctrl+S" label="Save" />
          <KeyHint k="Esc" label="Cancel" />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" className="shadow-soft">
            {editing ? "Save (Ctrl+S)" : "Add Item (Ctrl+S)"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <div className="flex items-center justify-between bg-muted/70 border-b px-3 py-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
          {title}
        </div>
        {accent && (
          <div className="text-[10px] font-mono text-muted-foreground">{accent}</div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 p-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  hint,
  span,
  children,
}: {
  label: string;
  hint?: string;
  span?: 2;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-[130px_1fr] items-center gap-2 ${span === 2 ? "md:col-span-2" : ""}`}
    >
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px] shadow-sm">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  );
}

  );
}
