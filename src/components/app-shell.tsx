import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  ReceiptText,
  LogOut,
  Pill,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/sell", label: "Sell", icon: ShoppingCart },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/bills", label: "Bills", icon: ReceiptText },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { count } = useCart();
  const location = useLocation();

  const sidebar = (
    <aside className="h-full flex flex-col border-r border-sidebar-border bg-sidebar shadow-soft overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
          <Pill className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sidebar-foreground leading-tight truncate">
            MediStock
          </div>
          <div className="text-[11px] text-muted-foreground truncate">Pharmacy Suite</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {to === "/cart" && count > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 shrink-0">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-2 text-xs">
          <div className="font-medium text-sidebar-foreground truncate">{session?.name}</div>
          <div className="text-muted-foreground truncate">{session?.email}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void logout()}
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </aside>
  );

  const main = (
    <div className="h-full flex flex-col min-w-0 bg-gradient-soft">
      <header className="h-14 flex items-center gap-3 md:gap-4 px-4 md:px-8 border-b border-border bg-background/70 backdrop-blur-md sticky top-0 z-10">
        {/* Mobile brand */}
        <div className="md:hidden flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Pill className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        {/* Global search — left side */}
        <div className="flex-1 min-w-0 max-w-md animate-fade-in">
          <GlobalSearch />
        </div>

        <nav className="md:hidden flex gap-1 shrink-0">
          {nav.map(({ to, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "p-2 rounded-md transition-smooth",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex flex-1" />

        <Link
          to="/sell"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium shadow-soft hover:shadow-glow hover:scale-[1.03] transition-smooth shrink-0"
        >
          <ShoppingCart className="h-4 w-4" /> Sell
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Toggle theme"
          className="relative overflow-hidden shrink-0 hover:bg-accent transition-smooth"
        >
          <Sun
            className={cn(
              "h-4 w-4 absolute transition-all duration-500",
              theme === "light"
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-0 opacity-0",
            )}
          />
          <Moon
            className={cn(
              "h-4 w-4 absolute transition-all duration-500",
              theme === "dark"
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-0 opacity-0",
            )}
          />
        </Button>
      </header>

      <main className="flex-1 overflow-auto px-4 md:px-8 py-6 md:py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );

  return (
    <div className="h-screen w-full bg-gradient-soft overflow-hidden">
      {/* Mobile: stacked, no resizing */}
      <div className="md:hidden h-full">{main}</div>

      {/* Desktop: resizable two-pane */}
      <div className="hidden md:block h-full">
        <ResizablePanelGroup orientation="horizontal" id="medistock-shell" className="h-full">
          <ResizablePanel
            id="sidebar"
            defaultSize="256px"
            minSize="180px"
            maxSize="480px"
            className="h-full"
          >
            {sidebar}
          </ResizablePanel>
          <ResizableHandle className="pointer-events-none opacity-0" />
          <ResizablePanel id="main" className="h-full">
            {main}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
