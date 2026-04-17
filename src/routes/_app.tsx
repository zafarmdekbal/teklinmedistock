import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { authStore } from "@/lib/storage";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !authStore.session()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { session, ready } = useAuth();
  if (!ready) return null;
  if (!session) return null;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
