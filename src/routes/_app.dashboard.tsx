import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, ReceiptText, ShoppingCart, AlertTriangle, IndianRupee } from "lucide-react";
import { productsStore, billsStore, type Product, type Bill } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    setProducts(productsStore.list());
    setBills(billsStore.list());
  }, []);

  const totalSales = bills.reduce((s, b) => s + b.total, 0);
  const lowStock = products.filter((p) => p.stock <= 10);
  const expiringSoon = products.filter((p) => {
    const d = new Date(p.expiry).getTime();
    const days = (d - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 60 && days >= 0;
  });

  const stats = [
    {
      label: "Products",
      value: products.length,
      icon: Package,
      tint: "bg-primary/10 text-primary",
    },
    {
      label: "Bills generated",
      value: bills.length,
      icon: ReceiptText,
      tint: "bg-accent text-accent-foreground",
    },
    {
      label: "Total revenue",
      value: formatMoney(totalSales),
      icon: IndianRupee,
      tint: "bg-success/15 text-success",
    },
    {
      label: "Low stock",
      value: lowStock.length,
      icon: AlertTriangle,
      tint: "bg-warning/20 text-warning-foreground",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your pharmacy at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/inventory" search={{ add: 1 }}>Add product</Link>
          </Button>
          <Button asChild className="shadow-soft">
            <Link to="/sell">
              <ShoppingCart className="h-4 w-4" /> New sale
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card
            key={s.label}
            className="shadow-soft border-border/60 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="p-5">
              <div className={`inline-flex h-10 w-10 rounded-xl items-center justify-center ${s.tint}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-2xl font-semibold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="shadow-soft animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base">Recent bills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bills.length === 0 ? (
              <EmptyHint label="No bills yet. Make your first sale." to="/sell" cta="Open sell" />
            ) : (
              bills.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-smooth"
                >
                  <div>
                    <div className="font-medium text-sm">{b.number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString()} · {b.items.length} items
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{formatMoney(b.total)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base">Attention needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 && expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">All good — nothing urgent.</p>
            ) : (
              <>
                {lowStock.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-warning-foreground bg-warning/30 px-2 py-0.5 rounded-md text-xs">
                      {p.stock} left
                    </span>
                  </div>
                ))}
                {expiringSoon.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded-md text-xs">
                      Expires {new Date(p.expiry).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyHint({ label, to, cta }: { label: string; to: string; cta: string }) {
  return (
    <div className="text-center py-6 space-y-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Button asChild size="sm">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
