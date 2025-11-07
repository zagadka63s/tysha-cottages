// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/AuthModalProvider";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

const BRAND_LOGO = "/images/7.png";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { open, setReturnTo } = useAuthModal();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // compact on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll + Esc to close when drawer open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // close drawer on route change
  useEffect(() => {
    if (!menuOpen) return;
    setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const nav = [
    { href: "/", label: "Головна" },
    { href: "/book", label: "Бронь" },
    { href: "/prices", label: "Ціни" },
    { href: "/rules", label: "Правила" },
    { href: "/contacts", label: "Контакти" },
  ];

  const handleCabinetClick = useCallback(() => {
    if (status === "loading") return;
    if (session?.user) {
      router.push("/cabinet");
    } else {
      setReturnTo("/cabinet");
      open("login");
    }
  }, [status, session, router, setReturnTo, open]);

  return (
    <>
      <header
        className={cx(
          "sticky top-0 z-40 transition-colors",
          "backdrop-blur supports-[backdrop-filter]:bg-[color:var(--tg-bg)]/60",
          scrolled && "supports-[backdrop-filter]:bg-[color:var(--tg-bg)]/80"
        )}
      >
        <div
          className={cx(
            "container flex items-center justify-between",
            "h-10 md:h-12 transition-[height] duration-200",
            scrolled && "h-9 md:h-10"
          )}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {/* logo */}
          <Link href="/" aria-label="Тиша Котеджі" className="flex items-center">
            <img
              src={BRAND_LOGO}
              alt="Тиша Котеджі"
              className="h-9 md:h-10 lg:h-[2.8rem] w-auto select-none header-logo"
              style={{
                filter:
                  "drop-shadow(0 1px 0 rgba(0,0,0,.35)) drop-shadow(0 10px 28px rgba(0,0,0,.24))",
                transformOrigin: "left center",
              }}
              draggable={false}
            />
          </Link>

          {/* right side */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* desktop nav */}
            <nav className="hidden md:flex gap-1 text-sm">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "group relative px-3 py-1.5 rounded-lg text-white/85 transition-colors",
                      "hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                      active && "text-white"
                    )}
                  >
                    <span className="relative">
                      {item.label}
                      <span
                        className={cx(
                          "absolute left-0 -bottom-1 h-0.5 w-full origin-left scale-x-0 rounded-full",
                          "bg-white/70 transition-transform duration-200",
                          (active || scrolled) && "scale-x-100",
                          "group-hover:scale-x-100"
                        )}
                      />
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* desktop: cabinet + CTA */}
            <button
              type="button"
              onClick={handleCabinetClick}
              aria-label="Кабінет"
              className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="opacity-90"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hidden lg:inline">Кабінет</span>
            </button>

            <Link
              href="/book#form"
              className={cx(
                "btn btn-primary hidden sm:inline-flex",
                "ring-1 ring-white/10 hover:ring-white/30 transition"
              )}
            >
              Забронювати
            </Link>

            {/* mobile icons */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={handleCabinetClick}
                aria-label="Відкрити кабінет"
                className="p-2 rounded-lg text-white/90 hover:bg-white/10 active:scale-[0.98]"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Відкрити меню"
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-lg text-white/90 hover:bg:white/10 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Меню">
          {/* dim / blur background */}
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Закрити меню"
            onClick={() => setMenuOpen(false)}
          />

          {/* sheet */}
          <div
            className={cx(
              "absolute right-0 top-0 h-full w-[85%] max-w-[380px]",
              "bg-[color:var(--tg-bg)] shadow-2xl border-l border-white/10",
              "pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+16px)]"
            )}
          >
            <div className="flex items-center justify-between px-4 pb-2">
              <Link href="/" className="flex items-center gap-2 text-white/90" onClick={() => setMenuOpen(false)}>
                <img src={BRAND_LOGO} alt="" className="h-8 w-auto" />
                <span className="text-sm opacity-80">Меню</span>
              </Link>
              <button
                className="p-2 rounded-lg text-white/80 hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
                aria-label="Закрити меню"
              >
                ✕
              </button>
            </div>

            <nav className="px-2 pt-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "block px-4 py-3 rounded-xl text-base",
                      "text-white/90 hover:bg-white/10 active:bg-white/15",
                      active && "bg-white/15 text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* actions: одинаковый стиль и высота для обеих кнопок */}
            <div className="px-4 mt-4 space-y-2">
              <button
                type="button"
                onClick={handleCabinetClick}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-white/20 px-4 text-[15px] text-white/90 hover:border-white/40"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Кабінет
              </button>

              <Link
                href="/book#form"
                className="w-full inline-flex items-center justify-center h-11 rounded-xl border border-white/20 text-[15px] text-white/90 hover:border-white/40"
              >
                Забронювати
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
