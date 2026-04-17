import { createFileRoute, redirect } from "@tanstack/react-router";
import { authStore } from "@/lib/storage";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      throw redirect({ to: authStore.session() ? "/dashboard" : "/login" });
    }
  },
  component: () => null,
});
