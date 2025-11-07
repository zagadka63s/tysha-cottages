// src/components/CabinetAuthWidget.tsx
"use client";

import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/AuthModalProvider";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

export default function CabinetAuthWidget() {
  const { data: session, status } = useSession();
  const { open, setReturnTo } = useAuthModal();
  const pathname = usePathname();

  // Пока сессия определяется — показываем лёгкий плейсхолдер
  if (status === "loading") {
    return (
      <div className="flex items-center gap-3">
        <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
        <div className="h-8 w-16 bg-white/10 rounded animate-pulse ml-auto" />
      </div>
    );
  }

  // Залогинен — показываем инфо + кнопку выхода
  if (session?.user) {
    const name = session.user.name || "Користувач";
    const email = session.user.email || "";
    return (
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <svg className="size-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="text-xs opacity-70">Ви увійшли як</div>
          </div>
          <div className="font-semibold text-sm">{name}</div>
          {email && <div className="text-xs opacity-80 mt-0.5">{email}</div>}
        </div>
        <SignOutButton className="btn btn-outline btn-sm shrink-0" />
      </div>
    );
  }

  // Не залогинен — кнопка открывает модалку «Вхід»
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg className="size-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div className="text-sm font-medium">Вхід не виконано</div>
      </div>
      <div className="text-xs opacity-75 leading-relaxed">
        Увійдіть, щоб переглядати свої бронювання та відслідковувати статус заявок
      </div>
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() => {
          setReturnTo(pathname || "/cabinet");
          open("login");
        }}
      >
        Увійти
      </button>
    </div>
  );
}
