import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pill, Printer } from "lucide-react";
import { billsStore, type Bill } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/bills/$id")({
  component: BillDetailPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function BillDetailPage() {
  const { id } = useParams({ from: "/_app/bills/$id" });
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => {
    let cancelled = false;
    billsStore
      .get(id)
      .then((b) => {
        if (!cancelled) setBill(b);
      })
      .catch(() => {
        if (!cancelled) setBill(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!bill) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Bill not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/bills">Back to bills</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/bills">
            <ArrowLeft className="h-4 w-4" /> All bills
          </Link>
        </Button>
        <Button onClick={() => window.print()} className="shadow-soft">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      <Card className="shadow-soft p-8 animate-scale-in print:shadow-none print:border-0">
        <div className="flex items-start justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Pill className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-lg">MediStock Pharmacy</div>
              <div className="text-xs text-muted-foreground">Invoice / Tax bill</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{bill.number}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(bill.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Billed to</div>
            <div className="font-medium mt-1">{bill.customerName ?? "Walk-in customer"}</div>
            {bill.customerPhone && (
              <div className="text-xs text-muted-foreground mt-0.5">{bill.customerPhone}</div>
            )}
            {bill.customerNotes && (
              <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                {bill.customerNotes}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Cashier</div>
            <div className="font-medium mt-1">{bill.cashier ?? "—"}</div>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Price</th>
                <th className="text-right p-3 font-medium">Tax</th>
                <th className="text-right p-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((it) => {
                const line = it.price * it.qty;
                const tax = (line * it.taxPercent) / 100;
                return (
                  <tr key={it.productId} className="border-t">
                    <td className="p-3">{it.name}</td>
                    <td className="p-3 text-right tabular-nums">{it.qty}</td>
                    <td className="p-3 text-right tabular-nums">{it.price.toFixed(2)}</td>
                    <td className="p-3 text-right tabular-nums">
                      {it.taxPercent}% ({tax.toFixed(2)})
                    </td>
                    <td className="p-3 text-right tabular-nums font-medium">
                      {(line + tax).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto w-full sm:w-72 space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatMoney(bill.subtotal)} />
          <Row label="Tax" value={formatMoney(bill.tax)} />
          <div className="border-t pt-2">
            <Row label="Grand total" value={formatMoney(bill.total)} bold />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Thank you for choosing MediStock — get well soon!
        </p>
      </Card>
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
