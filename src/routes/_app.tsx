import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { authStore, seedDemoProducts } from "@/lib/storage";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !authStore.session()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  useEffect(() => {
    seedDemoProducts();
  }, []);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
