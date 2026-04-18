import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2, UserRound, X, Pencil } from "lucide-react";
import { productsStore, billsStore, type Product } from "@/lib/storage";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerDetailsDialog } from "@/components/customer-details-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type SellSearch = { add?: string };

export const Route = createFileRoute("/_app/sell")({
  validateSearch: (search: Record<string, unknown>): SellSearch => ({
    add: typeof search.add === "string" ? search.add : undefined,
  }),
  component: SellPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function SellPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [qtyProduct, setQtyProduct] = useState<Product | null>(null);
  const [qtyValue, setQtyValue] = useState(1);
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setProducts(productsStore.list());
  }, []);

  const search = Route.useSearch();
  const routeNavigate = Route.useNavigate();

  // Marg F2 flow: when arriving with ?add=<productId>, push it into the cart
  useEffect(() => {
    if (!search.add) return;
    const list = productsStore.list();
    setProducts(list);
    const p = list.find((x) => x.id === search.add);
    if (p && p.stock > 0) {
      const { isFirst } = cart.add(p, 1);
      toast.success(`${p.name} added to cart`);
      if (isFirst && !cart.customerSubmitted) setCustomerOpen(true);
    } else if (p) {
      toast.error(`${p.name} is out of stock`);
    }
    routeNavigate({ search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.add]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.stock > 0 &&
          (p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase())),
      ),
    [products, query],
  );

  const openQtyPicker = (p: Product) => {
    setQtyProduct(p);
    setQtyValue(1);
  };

  const confirmAdd = () => {
    if (!qtyProduct) return;
    const { isFirst } = cart.add(qtyProduct, qtyValue);
    toast.success(`${qtyProduct.name} × ${qtyValue} added`);
    setQtyProduct(null);
    if (isFirst && !cart.customerSubmitted) {
      setCustomerOpen(true);
    }
  };

  const checkout = () => {
    if (cart.items.length === 0) return;
    const bill = billsStore.add({
      customerName: cart.customer.name || undefined,
      customerPhone: cart.customer.phone || undefined,
      customerNotes: cart.customer.notes || undefined,
      cashier: session?.name,
      items: cart.items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.product.price,
        costPrice: i.product.costPrice,
        qty: i.qty,
        taxPercent: i.product.taxPercent ?? 0,
      })),
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
    });
    cart.items.forEach((i) => productsStore.decrementStock(i.product.id, i.qty));
    cart.clear();
    setProducts(productsStore.list());
    toast.success(`Bill ${bill.number} generated`);
    navigate({ to: "/bills/$id", params: { id: bill.id } });
  };

  const hasCustomer =
    cart.customer.name.trim() || cart.customer.phone.trim() || cart.customer.notes.trim();

  const maxQty = qtyProduct
    ? qtyProduct.stock - (cart.items.find((i) => i.product.id === qtyProduct.id)?.qty ?? 0)
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Sell</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add products to the cart and generate a bill.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Products */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products in stock…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {products.length === 0
                  ? "No products in inventory yet."
                  : "No matching products in stock."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => openQtyPicker(p)}
                  className="text-left rounded-xl border bg-card p-4 shadow-soft hover:shadow-glow hover:-translate-y-0.5 transition-smooth animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.category} {p.manufacturer ? `· ${p.manufacturer}` : ""}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground">
                      {p.stock} in stock
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold">{formatMoney(p.price)}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <Plus className="h-3 w-3" /> Add
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <Card className="shadow-soft h-fit lg:sticky lg:top-20">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Cart
              {cart.count > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                  {cart.count}
                </span>
              )}
            </CardTitle>
            {cart.items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={cart.clear}>
                <X className="h-4 w-4" /> Clear
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Your cart is empty. Tap a product to add it.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {cart.items.map((i) => (
                  <div
                    key={i.product.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-smooth"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{i.product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMoney(i.product.price)} ea
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => cart.setQty(i.product.id, i.qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-7 text-center text-sm tabular-nums">{i.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => cart.setQty(i.product.id, i.qty + 1)}
                        disabled={i.qty >= i.product.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => cart.remove(i.product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.items.length > 0 && (
              <button
                type="button"
                onClick={() => setCustomerOpen(true)}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-smooth"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserRound className="h-4 w-4 text-primary" />
                    {hasCustomer ? cart.customer.name || "Customer details" : "Add customer details"}
                  </div>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {hasCustomer && cart.customer.phone && (
                  <div className="text-xs text-muted-foreground mt-1 ml-6">
                    {cart.customer.phone}
                  </div>
                )}
              </button>
            )}

            <div className="border-t pt-3 space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatMoney(cart.subtotal)} />
              <Row label="Tax" value={formatMoney(cart.tax)} />
              <Row label="Total" value={formatMoney(cart.total)} bold />
            </div>

            <Button
              className="w-full shadow-soft"
              size="lg"
              onClick={checkout}
              disabled={cart.items.length === 0}
            >
              Generate bill
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quantity picker dialog */}
      <Dialog open={!!qtyProduct} onOpenChange={(v) => !v && setQtyProduct(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Add to cart</DialogTitle>
          </DialogHeader>
          {qtyProduct && (
            <div className="space-y-4">
              <div>
                <div className="font-medium">{qtyProduct.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatMoney(qtyProduct.price)} per unit · {maxQty} available
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQtyValue(Math.max(1, qtyValue - 1))}
                  disabled={qtyValue <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qtyValue}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setQtyValue(Math.max(1, Math.min(maxQty, v)));
                  }}
                  className="w-20 text-center text-lg font-semibold tabular-nums"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQtyValue(Math.min(maxQty, qtyValue + 1))}
                  disabled={qtyValue >= maxQty}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{formatMoney(qtyProduct.price * qtyValue)}</span>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setQtyProduct(null)}>
                  Cancel
                </Button>
                <Button className="shadow-soft" onClick={confirmAdd} disabled={maxQty < 1}>
                  <ShoppingCart className="h-4 w-4" /> Add × {qtyValue}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CustomerDetailsDialog open={customerOpen} onOpenChange={setCustomerOpen} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-base" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
