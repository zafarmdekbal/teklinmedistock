import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, IndianRupee, ReceiptText, TrendingUp } from "lucide-react";
import { billsStore, type Bill } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_app/revenue")({
  component: RevenuePage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

function RevenuePage() {
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    setBills(billsStore.list());
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = bills.reduce((s, b) => s + b.total, 0);
    const totalTax = bills.reduce((s, b) => s + b.tax, 0);
    const avgBill = bills.length ? totalRevenue / bills.length : 0;
    return { totalRevenue, totalTax, avgBill };
  }, [bills]);

  // Daily revenue (last 30 days)
  const dailyData = useMemo(() => {
    const days: { date: string; label: string; revenue: number; bills: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: 0,
        bills: 0,
      });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    for (const b of bills) {
      const key = new Date(b.createdAt).toISOString().slice(0, 10);
      const row = map.get(key);
      if (row) {
        row.revenue += b.total;
        row.bills += 1;
      }
    }
    return days;
  }, [bills]);

  // Monthly revenue (last 12 months)
  const monthlyData = useMemo(() => {
    const months: { key: string; label: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        revenue: 0,
      });
    }
    const map = new Map(months.map((m) => [m.key, m]));
    for (const b of bills) {
      const d = new Date(b.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (row) row.revenue += b.total;
    }
    return months;
  }, [bills]);

  // Top products by revenue
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; qty: number }>();
    for (const b of bills) {
      for (const it of b.items) {
        const cur = map.get(it.productId) ?? { name: it.name, revenue: 0, qty: 0 };
        cur.revenue += it.price * it.qty;
        cur.qty += it.qty;
        map.set(it.productId, cur);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [bills]);

  const PIE_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent-foreground))",
    "hsl(var(--success, 142 70% 45%))",
    "hsl(var(--warning, 38 92% 50%))",
    "hsl(var(--destructive))",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Revenue analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trends, top products and tax breakdown.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total revenue" value={formatMoney(stats.totalRevenue)} icon={IndianRupee} />
        <StatCard label="Tax collected" value={formatMoney(stats.totalTax)} icon={TrendingUp} />
        <StatCard label="Avg bill value" value={formatMoney(stats.avgBill)} icon={ReceiptText} />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Daily revenue · last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatMoney(v)}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Monthly revenue · last 12 months</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Top 5 products by revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {topProducts.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                No sales yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProducts}
                    dataKey="revenue"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <div className="inline-flex h-10 w-10 rounded-xl items-center justify-center bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-4 text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
