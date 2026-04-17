import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReceiptText, Search } from "lucide-react";
import { billsStore, type Bill } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/bills")({
  component: BillsPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setBills(billsStore.list());
  }, []);

  const filtered = bills.filter(
    (b) =>
      b.number.toLowerCase().includes(query.toLowerCase()) ||
      (b.customerName ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All sales and invoices generated in your store.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice or customer…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No bills yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => (
                <TableRow key={b.id} className="animate-fade-in">
                  <TableCell>
                    <Link
                      to="/bills/$id"
                      params={{ id: b.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {b.number}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(b.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{b.customerName ?? "Walk-in"}</TableCell>
                  <TableCell className="text-right">{b.items.length}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(b.total)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
