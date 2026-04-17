import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authStore, type Session } from "./storage";

type AuthCtx = {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<Session>;
  signup: (name: string, email: string, password: string) => Promise<Session>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() =>
    typeof window === "undefined" ? null : authStore.session(),
  );
  const [ready, setReady] = useState(typeof window !== "undefined");

  useEffect(() => {
    setSession(authStore.session());
    setReady(true);
  }, []);

  const value: AuthCtx = {
    session,
    ready,
    login: async (email, password) => {
      const s = authStore.login(email, password);
      setSession(s);
      return s;
    },
    signup: async (name, email, password) => {
      const s = authStore.signup(name, email, password);
      setSession(s);
      return s;
    },
    logout: () => {
      authStore.logout();
      setSession(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
