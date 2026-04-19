import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session as SbSession, User as SbUser } from "@supabase/supabase-js";
import { setStorageUser } from "./storage";

export type Session = { userId: string; name: string; email: string };

type AuthCtx = {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function toSession(sb: SbSession | null): Session | null {
  if (!sb?.user) return null;
  return userToSession(sb.user);
}

function userToSession(u: SbUser): Session {
  const meta = (u.user_metadata ?? {}) as { name?: string; full_name?: string };
  return {
    userId: u.id,
    email: u.email ?? "",
    name: meta.name || meta.full_name || (u.email?.split("@")[0] ?? "User"),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listener FIRST, then fetch existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sb) => {
      const next = toSession(sb);
      setStorageUser(next?.userId ?? null);
      setSession(next);
    });

    supabase.auth.getSession().then(({ data }) => {
      const next = toSession(data.session);
      setStorageUser(next?.userId ?? null);
      setSession(next);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    ready,
    login: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    signup: async (name, email, password) => {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw new Error(error.message);
    },
    logout: async () => {
      await supabase.auth.signOut();
      setSession(null);
    },
    requestPasswordReset: async (email) => {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw new Error(error.message);
    },
    updatePassword: async (newPassword) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
