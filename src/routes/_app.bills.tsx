import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Download,
  Eye,
  ReceiptText,
  Search,
  Smartphone,
} from "lucide-react";
import { billsStore, type Bill } from "@/lib/storage";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { downloadBillPdf } from "@/lib/bill-pdf";
import { toast } from "sonner";

type FilterRange = "all" | "day" | "month" | "year" | "custom";
type PayFilter = "all" | "cash" | "online";
type BillsSearch = { range?: FilterRange; from?: string; to?: string; pay?: PayFilter };

export const Route = createFileRoute("/_app/bills")({
  validateSearch: (search: Record<string, unknown>): BillsSearch => {
    const r = search.range as string | undefined;
    const valid: FilterRange[] = ["all", "day", "month", "year", "custom"];
    const p = search.pay as string | undefined;
    const validPay: PayFilter[] = ["all", "cash", "online"];
    return {
      range: valid.includes(r as FilterRange) ? (r as FilterRange) : undefined,
      from: typeof search.from === "string" ? search.from : undefined,
      to: typeof search.to === "string" ? search.to : undefined,
      pay: validPay.includes(p as PayFilter) ? (p as PayFilter) : undefined,
    };
  },
  component: BillsPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [query, setQuery] = useState("");
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range: FilterRange = search.range ?? "all";
  const pay: PayFilter = search.pay ?? "all";

  useEffect(() => {
    let cancelled = false;
    billsStore
      .list()
      .then((b) => {
        if (!cancelled) setBills(b);
      })
      .catch(() => {
        if (!cancelled) setBills([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setRange = (r: FilterRange) => {
    navigate({
      search: (prev: BillsSearch) => ({ ...prev, range: r === "all" ? undefined : r }),
      replace: true,
    });
  };

  const setFrom = (v: string) =>
    navigate({
      search: (prev: BillsSearch) => ({ ...prev, range: "custom", from: v || undefined }),
      replace: true,
    });
  const setTo = (v: string) =>
    navigate({
      search: (prev: BillsSearch) => ({ ...prev, range: "custom", to: v || undefined }),
      replace: true,
    });

  const filtered = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;
    if (range === "day") {
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
    } else if (range === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === "year") {
      from = new Date(now.getFullYear(), 0, 1);
    } else if (range === "custom") {
      if (search.from) from = new Date(search.from);
      if (search.to) {
        to = new Date(search.to);
        to.setHours(23, 59, 59, 999);
      }
    }

    return bills.filter((b) => {
      const t = new Date(b.createdAt).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      if (pay !== "all" && b.paymentMethod !== pay) return false;
      const q = query.toLowerCase();
      if (
        q &&
        !b.number.toLowerCase().includes(q) &&
        !(b.customerName ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [bills, range, search.from, search.to, query, pay]);

  const totalForRange = filtered.reduce((s, b) => s + b.total, 0);
  const cashTotal = filtered
    .filter((b) => b.paymentMethod === "cash")
    .reduce((s, b) => s + b.total, 0);
  const onlineTotal = filtered
    .filter((b) => b.paymentMethod === "online")
    .reduce((s, b) => s + b.total, 0);

  const setPay = (p: PayFilter) => {
    navigate({
      search: (prev: BillsSearch) => ({ ...prev, pay: p === "all" ? undefined : p }),
      replace: true,
    });
  };

  const handleDownload = async (b: Bill, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const fresh = (await billsStore.get(b.id)) ?? b;
      downloadBillPdf(fresh);
    } catch {
      downloadBillPdf(b);
      toast.error("Could not refresh, downloaded cached copy");
    }
  };

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

      <Card className="shadow-soft p-4 flex flex-col lg:flex-row lg:items-end gap-4">
        <Tabs
          value={range}
          onValueChange={(v) => setRange(v as FilterRange)}
          className="w-full lg:w-auto"
        >
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
            <TabsTrigger value="year">This year</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        {range === "custom" && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={search.from ?? ""}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={search.to ?? ""}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        )}
        <div className="lg:ml-auto text-left lg:text-right">
          <div className="text-xs text-muted-foreground">
            {filtered.length} bill{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {formatMoney(totalForRange)}
          </div>
        </div>
      </Card>

      <Card className="shadow-soft p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs
          value={pay}
          onValueChange={(v) => setPay(v as PayFilter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All payments</TabsTrigger>
            <TabsTrigger value="cash">
              <Banknote className="h-3.5 w-3.5" /> Cash
            </TabsTrigger>
            <TabsTrigger value="online">
              <Smartphone className="h-3.5 w-3.5" /> Online
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="sm:ml-auto flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 text-success font-medium">
            <Banknote className="h-3.5 w-3.5" /> Cash {formatMoney(cashTotal)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
            <Smartphone className="h-3.5 w-3.5" /> Online {formatMoney(onlineTotal)}
          </span>
        </div>
      </Card>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <Card className="shadow-soft p-10 text-center text-muted-foreground">
            <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No bills in this range.
          </Card>
        ) : (
          filtered.map((b) => (
            <Card
              key={b.id}
              className="shadow-soft p-4 active:scale-[0.99] transition-smooth"
            >
              <Link
                to="/bills/$id"
                params={{ id: b.id }}
                className="block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-primary">{b.number}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm mt-1.5 truncate">
                      {b.customerName ?? "Walk-in"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums">
                      {formatMoney(b.total)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {b.items.length} item{b.items.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </Link>
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize " +
                    (b.paymentMethod === "cash"
                      ? "bg-success/15 text-success"
                      : "bg-primary/10 text-primary")
                  }
                >
                  {b.paymentMethod === "cash" ? (
                    <Banknote className="h-3 w-3" />
                  ) : (
                    <Smartphone className="h-3 w-3" />
                  )}
                  {b.paymentMethod}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => void handleDownload(b, e)}
                  >
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/bills/$id" params={{ id: b.id }}>
                      <Eye className="h-4 w-4" /> View
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop / tablet table */}
      <Card className="shadow-soft overflow-x-auto hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No bills in this range.
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
                  <TableCell className="whitespace-nowrap">
                    {new Date(b.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{b.customerName ?? "Walk-in"}</TableCell>
                  <TableCell>
                    <span
                      className={
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize " +
                        (b.paymentMethod === "cash"
                          ? "bg-success/15 text-success"
                          : "bg-primary/10 text-primary")
                      }
                    >
                      {b.paymentMethod === "cash" ? (
                        <Banknote className="h-3 w-3" />
                      ) : (
                        <Smartphone className="h-3 w-3" />
                      )}
                      {b.paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{b.items.length}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(b.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" title="View details">
                      <Link to="/bills/$id" params={{ id: b.id }}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => void handleDownload(b, e)}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
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
