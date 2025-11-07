"use client";

import { SessionProvider } from "next-auth/react";
import { AuthModalProvider } from "@/components/AuthModalProvider";
import AuthModal from "@/components/AuthModal";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        {children}
        {/* Модалка всегда смонтирована на всех страницах */}
        <AuthModal />
      </AuthModalProvider>
    </SessionProvider>
  );
}
