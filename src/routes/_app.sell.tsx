import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { productsStore, billsStore, type Product } from "@/lib/storage";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sell")({
  component: SellPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function SellPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState("");
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setProducts(productsStore.list());
  }, []);

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

  const checkout = () => {
    if (cart.items.length === 0) return;
    const bill = billsStore.add({
      customerName: customer.trim() || undefined,
      cashier: session?.name,
      items: cart.items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.product.price,
        qty: i.qty,
        taxPercent: i.product.taxPercent ?? 0,
      })),
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
    });
    cart.items.forEach((i) => productsStore.decrementStock(i.product.id, i.qty));
    cart.clear();
    setCustomer("");
    setProducts(productsStore.list());
    toast.success(`Bill ${bill.number} generated`);
    navigate({ to: "/bills/$id", params: { id: bill.id } });
  };

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
                  onClick={() => {
                    cart.add(p, 1);
                    toast.success(`${p.name} added`);
                  }}
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

            <div className="space-y-1.5">
              <Label htmlFor="cust" className="text-xs">
                Customer name (optional)
              </Label>
              <Input
                id="cust"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Walk-in customer"
              />
            </div>

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
