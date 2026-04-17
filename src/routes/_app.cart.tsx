import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, UserRound, Pencil } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { billsStore, productsStore } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerDetailsDialog } from "@/components/customer-details-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/cart")({
  component: CartPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function CartPage() {
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [customerOpen, setCustomerOpen] = useState(false);

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
        qty: i.qty,
        taxPercent: i.product.taxPercent ?? 0,
      })),
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
    });
    cart.items.forEach((i) => productsStore.decrementStock(i.product.id, i.qty));
    cart.clear();
    toast.success(`Bill ${bill.number} generated`);
    navigate({ to: "/bills/$id", params: { id: bill.id } });
  };

  const hasCustomer =
    cart.customer.name.trim() || cart.customer.phone.trim() || cart.customer.notes.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" /> Cart
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review items and finalize the sale.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/sell">Add more products</Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">
              Items {cart.count > 0 ? `(${cart.count})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.items.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                <Button asChild size="sm">
                  <Link to="/sell">Browse products</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {cart.items.map((i) => (
                  <div
                    key={i.product.id}
                    className="flex items-center gap-3 py-3 animate-fade-in"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{i.product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMoney(i.product.price)} · {i.product.taxPercent ?? 0}% tax
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cart.setQty(i.product.id, i.qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">{i.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cart.setQty(i.product.id, i.qty + 1)}
                        disabled={i.qty >= i.product.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-24 text-right tabular-nums font-medium">
                      {formatMoney(i.product.price * i.qty)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => cart.remove(i.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" /> Customer
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomerOpen(true)}
                disabled={cart.items.length === 0}
              >
                <Pencil className="h-3.5 w-3.5" /> {hasCustomer ? "Edit" : "Add"}
              </Button>
            </CardHeader>
            <CardContent className="text-sm">
              {hasCustomer ? (
                <div className="space-y-1">
                  {cart.customer.name && (
                    <div className="font-medium">{cart.customer.name}</div>
                  )}
                  {cart.customer.phone && (
                    <div className="text-muted-foreground">{cart.customer.phone}</div>
                  )}
                  {cart.customer.notes && (
                    <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                      {cart.customer.notes}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Walk-in customer.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(cart.subtotal)} />
              <Row label="Tax" value={formatMoney(cart.tax)} />
              <div className="border-t pt-2">
                <Row label="Total" value={formatMoney(cart.total)} bold />
              </div>
              <Button
                className="w-full shadow-soft mt-3"
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
