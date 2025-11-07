"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

type AuthMode = "login" | "register";

type Ctx = {
  isOpen: boolean;
  mode: AuthMode;
  open: (mode?: AuthMode) => void;
  close: () => void;
  setMode: (m: AuthMode) => void;
  returnTo?: string;
  setReturnTo: (url?: string) => void;
};

const AuthModalCtx = createContext<Ctx | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [returnTo, setReturnTo] = useState<string | undefined>();

  const open = useCallback((m: AuthMode = "login") => {
    setMode(m);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // UX: закрытие по Escape и блокировка скролла боди
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  return (
    <AuthModalCtx.Provider
      value={{ isOpen, mode, open, close, setMode, returnTo, setReturnTo }}
    >
      {children}
    </AuthModalCtx.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalCtx);
  if (!ctx) throw new Error("useAuthModal must be used inside <AuthModalProvider>");
  return ctx;
}
