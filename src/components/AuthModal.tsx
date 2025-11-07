"use client";

import { useEffect, useRef, useState, useTransition, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useAuthModal } from "./AuthModalProvider";
import { useSearchParams } from "next/navigation";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function AuthModalContent() {
  const { isOpen, mode, setMode, close, returnTo } = useAuthModal();
  const sp = useSearchParams();
  const fallbackReturn = sp.get("return") || "/cabinet";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl bg-[color:var(--tg-glass)]/80 backdrop-blur shadow-xl border border-white/10">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex gap-2">
            <button
              className={cx(
                "px-3 py-1.5 rounded-lg text-sm",
                mode === "login" ? "bg-white/15 text-white" : "text-white/80 hover:text-white"
              )}
              onClick={() => setMode("login")}
            >
              Вхід
            </button>
            <button
              className={cx(
                "px-3 py-1.5 rounded-lg text-sm",
                mode === "register" ? "bg-white/15 text-white" : "text-white/80 hover:text-white"
              )}
              onClick={() => setMode("register")}
            >
              Реєстрація
            </button>
          </div>
          <button
            onClick={close}
            aria-label="Закрити"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5">
          {mode === "login" ? (
            <LoginForm returnTo={returnTo ?? fallbackReturn} onDone={close} />
          ) : (
            <RegisterForm
              returnTo={returnTo ?? fallbackReturn}
              onDone={close}
              switchToLogin={() => setMode("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthModal() {
  return (
    <Suspense fallback={null}>
      <AuthModalContent />
    </Suspense>
  );
}

/** ====== LOGIN: единое поле контакта ====== */
function LoginForm({ returnTo, onDone }: { returnTo: string; onDone: () => void }) {
  const [identifier, setIdentifier] = useState(""); // email / phone / @tg
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    idRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const ident = identifier.trim();
    const pass = password;

    if (!ident || !pass) {
      setErr("Заповніть контакт та пароль.");
      return;
    }

    start(async () => {
      const res = await signIn("credentials", {
        redirect: false,
        identifier: ident,
        password: pass,
        callbackUrl: returnTo,
      });
      if (res?.error) {
        setErr("Невірні дані або користувач не знайдений.");
      } else {
        onDone();
        window.location.assign(returnTo);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="ui-field">
        <span className="ui-label">Email / Телефон / Telegram</span>
        <input
          className="ui-input"
          type="text"
          required
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@example.com або +380..., або @username"
          ref={idRef}
        />
      </label>

      <label className="ui-field">
        <span className="ui-label">Пароль</span>
        <input
          className="ui-input"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      {err && <p className="text-red-300 text-sm">{err}</p>}

      <button type="submit" className="btn btn-primary mt-1" disabled={isPending}>
        {isPending ? "Входимо..." : "Увійти"}
      </button>

      <div className="mt-3 rounded-xl border border-blue-400/30 bg-blue-500/10 p-3 text-xs">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 size-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-base">ℹ</span>
          <p className="text-white/90 leading-relaxed">
            <strong>Вже робили бронь?</strong> Введіть той самий контакт (email, телефон або Telegram), який залишали при бронюванні — ваші заявки автоматично підтягнуться до кабінету.
          </p>
        </div>
      </div>
    </form>
  );
}

/** ====== REGISTER: имя + единое поле контакта + пароль ====== */
function RegisterForm({
  returnTo,
  onDone,
  switchToLogin,
}: {
  returnTo: string;
  onDone: () => void;
  switchToLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // email / phone / @tg (ЕДИНОЕ поле)
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const nm = name.trim();
    const ident = identifier.trim();
    const pass = password;

    if (!ident || !pass) {
      setErr("Заповніть контакт та пароль.");
      return;
    }

    start(async () => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nm, identifier: ident, password: pass }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setErr(data?.error ?? "Помилка реєстрації");
          return;
        }
        setOk(true);

        // автовхід
        const si = await signIn("credentials", {
          redirect: false,
          identifier: ident,
          password: pass,
          callbackUrl: returnTo,
        });
        if (si?.error) {
          // если вдруг вход не удался — переключим в «Вхід»
          switchToLogin();
        } else {
          onDone();
          window.location.assign(returnTo);
        }
      } catch {
        setErr("Server error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="ui-field">
        <span className="ui-label">Ім’я</span>
        <input
          className="ui-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше ім’я"
          ref={nameRef}
        />
      </label>

      <label className="ui-field">
        <span className="ui-label">Email / Телефон / Telegram</span>
        <input
          className="ui-input"
          type="text"
          required
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@example.com або +380..., або @username"
        />
      </label>

      <label className="ui-field">
        <span className="ui-label">Пароль</span>
        <input
          className="ui-input"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="мін. 6 символів"
        />
      </label>

      {err && <p className="text-red-300 text-sm">{err}</p>}
      {ok && <p className="text-emerald-300 text-sm">Реєстрація успішна!</p>}

      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs mb-3">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 size-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 text-base">💡</span>
          <p className="text-white/90 leading-relaxed">
            <strong>Вже робили бронь до реєстрації?</strong> Обов&apos;язково вкажіть той самий контакт (email, телефон або Telegram), який використовували при бронюванні — тоді ваше бронювання автоматично підв&apos;яжеться до вашого кабінету.
          </p>
        </div>
      </div>

      <button type="submit" className="btn btn-primary mt-1" disabled={isPending}>
        {isPending ? "Реєструємо..." : "Зареєструватись"}
      </button>
    </form>
  );
}
