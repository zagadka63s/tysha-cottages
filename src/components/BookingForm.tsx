"use client";

import { useEffect, useMemo, useState } from "react";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";

/* ---------- утилиты дат ---------- */
function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate() + 0).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDaysISO(iso: string, days: number) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toISO(d);
}
function isValidISO(s: string) {
  if (!s) return false;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return !isNaN(d.getTime()) && s === toISO(d);
}
function isoToDate(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}
/** полузакрытые: [start, end) пересекаются? */
function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return isoToDate(aStart) < isoToDate(bEnd) && isoToDate(bStart) < isoToDate(aEnd);
}
function fmtHuman(iso: string) {
  if (!isValidISO(iso)) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("uk-UA");
}

/* ---------- лёгкая нормализация контактов на клиенте ---------- */
function normalizeEmail(raw?: string | null) {
  const s = (raw ?? "").trim().toLowerCase();
  return /\S+@\S+\.\S+/.test(s) ? s : null;
}
function normalizePhone(raw?: string | null) {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}
function normalizeTelegram(raw?: string | null) {
  const s = (raw ?? "").trim();
  if (!s || /\s/.test(s)) return null;
  if (/\S+@\S+\.\S+/.test(s)) return null; // выглядит как email
  const h = s.startsWith("@") ? s.slice(1) : s;
  return h ? h.toLowerCase() : null;
}

/* ---------- типы ---------- */
type BusyInterval = { start: string; end: string };
type Surcharge = { type: string; amountUAH: number; unit: string };
type PerNight = { date: string; priceUAH: number };
type Quote = {
  ok: boolean;
  nights: number;
  baseNightsSumUAH: number;
  surchargeTotalUAH: number;
  totalUAH: number;
  surcharges?: Surcharge[];
  perNight?: PerNight[];
};

/** нормализуем ответ API к BusyInterval[] (YYYY-MM-DD) */
function normalizeBusyFromApi(raw: unknown): BusyInterval[] {
  const list: any[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && (raw as any).busy
    ? (raw as any).busy
    : [];

  return list
    .map((i) => {
      const s = i?.start ? new Date(i.start) : null;
      const e = i?.end ? new Date(i.end) : null;
      if (!s || !e || isNaN(+s) || isNaN(+e)) return null;
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      return { start: toISO(s), end: toISO(e) } as BusyInterval;
    })
    .filter(Boolean) as BusyInterval[];
}

export default function BookingForm() {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /* валидация контактов */
  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [telegramInput, setTelegramInput] = useState("");

  const firstNameValid = firstNameInput.length === 0 || firstNameInput.trim().length >= 2;
  const lastNameValid = lastNameInput.length === 0 || lastNameInput.trim().length >= 2;
  const emailValid = emailInput.length === 0 || /\S+@\S+\.\S+/.test(emailInput);
  const phoneValid = phoneInput.length === 0 || /^\+?\d{10,}$/.test(phoneInput.replace(/\s/g, ""));
  const telegramValid = telegramInput.length === 0 || (!/\s/.test(telegramInput) && !/\S+@\S+/.test(telegramInput));

  /* ---------- контролируемые даты ---------- */
  const todayISO = useMemo(() => toISO(new Date()), []);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const minDateTo = useMemo(() => {
    if (isValidISO(dateFrom)) return addDaysISO(dateFrom, 1);
    return addDaysISO(todayISO, 1);
  }, [dateFrom, todayISO]);

  const hasDateOrderError =
    isValidISO(dateFrom) && isValidISO(dateTo) && dateTo <= dateFrom;

  /* ---------- гости/дети/питомец ---------- */
  const [adults, setAdults] = useState<number>(2);
  const [childrenTotal, setChildrenTotal] = useState<number>(0);
  const [childrenOver6, setChildrenOver6] = useState<number>(0);
  const [hasPet, setHasPet] = useState<boolean>(false);

  useEffect(() => {
    if (childrenOver6 > childrenTotal) setChildrenOver6(childrenTotal);
    if (childrenTotal < 0) setChildrenTotal(0);
  }, [childrenTotal, childrenOver6]);

  /* ---------- загрузка зайнятих інтервалів ---------- */
  const [busy, setBusy] = useState<BusyInterval[]>([]);
  const [loadingBusy, setLoadingBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingBusy(true);
      try {
        const res = await fetch("/api/availability", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        setBusy(normalizeBusyFromApi(data));
      } catch {
        // тихо
      } finally {
        if (alive) setLoadingBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const busyHint = useMemo(() => busy.slice(0, 6), [busy]);

  function isRangeFree(startISO: string, endISO: string) {
    if (!startISO || !endISO) return true;
    if (isoToDate(endISO) <= isoToDate(startISO)) return false;
    return !busy.some((b) => overlap(startISO, endISO, b.start, b.end));
  }

  // live-валидация дат
  function validateDatesAndSetNote(fromISO: string, toISO_: string) {
    if (!fromISO || !toISO_) {
      setNote(null);
      return;
    }
    if (fromISO < todayISO) {
      setNote("Дата заїзду не може бути в минулому.");
      return;
    }
    if (toISO_ <= fromISO) {
      setNote("Дата виїзду має бути пізніше за дату заїзду (мінімум +1 день).");
      return;
    }
    if (!isRangeFree(fromISO, toISO_)) {
      setNote("Обраний період перетинається з вже зайнятими датами. Виберіть інший діапазон.");
    } else {
      setNote(null);
    }
  }

  /* ---------- live-котировка из /api/pricing ---------- */
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function fetchQuote() {
      if (!isValidISO(dateFrom) || !isValidISO(dateTo)) {
        setQuote(null);
        return;
      }
      if (isoToDate(dateTo) <= isoToDate(dateFrom)) {
        setQuote(null);
        return;
      }
      setQuoteLoading(true);
      try {
        const params = new URLSearchParams({
          checkIn: dateFrom,
          checkOut: dateTo,
          adults: String(adults),
          childrenOver6: String(childrenOver6),
          hasPet: hasPet ? "true" : "false",
        });
        const res = await fetch(`/api/pricing?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (data?.ok) {
          setQuote({
            ok: true,
            nights: Number(data.nights ?? 0),
            baseNightsSumUAH: Number(data.baseNightsSumUAH ?? 0),
            surchargeTotalUAH: Number(data.surchargesSumUAH ?? 0),
            totalUAH: Number(data.totalUAH ?? 0),
            surcharges: data.surcharges || [],
            perNight: data.perNight || [],
          });
        } else {
          setQuote(null);
        }
      } catch {
        if (alive) setQuote(null);
      } finally {
        if (alive) setQuoteLoading(false);
      }
    }

    fetchQuote();
    return () => {
      alive = false;
    };
  }, [dateFrom, dateTo, adults, childrenOver6, hasPet]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNote(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    // новые раздельные поля
    const firstName = String(fd.get("firstName") || "").trim();
    const lastName = String(fd.get("lastName") || "").trim();
    const email = normalizeEmail(String(fd.get("email") || ""));
    const phone = normalizePhone(String(fd.get("phone") || ""));
    const telegram = normalizeTelegram(String(fd.get("telegram") || ""));

    // собираем совместимый payload
    const payload = {
      name: [firstName, lastName].filter(Boolean).join(" ").trim(),
      contact: (email || phone || telegram || "").toString(),
      checkIn: dateFrom,
      checkOut: dateTo,
      adults,
      childrenTotal,
      childrenOver6,
      hasPet,
      guests: adults, // совместимость
      comment: String(fd.get("comment") || "").trim() || null,
      source: "web" as const,
    };

    // базовая валидация
    if (!payload.name) {
      setNote("Вкажіть імʼя та прізвище.");
      return;
    }
    if (!payload.contact) {
      setNote("Вкажіть хоча б один контакт: email, телефон або Telegram-нік.");
      return;
    }
    if (!isValidISO(payload.checkIn) || !isValidISO(payload.checkOut)) {
      setNote("Оберіть коректні дати заїзду та виїзду.");
      return;
    }
    if (payload.checkIn < todayISO) {
      setNote("Дата заїзду не може бути в минулому.");
      return;
    }
    if (payload.checkOut <= payload.checkIn) {
      setNote("Дата виїзду має бути пізніше за дату заїзду (мінімум +1 день).");
      return;
    }
    if (!isRangeFree(payload.checkIn, payload.checkOut)) {
      setNote("Обраний період перетинається з вже зайнятими датами.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Не вдалося надіслати запит.");
      }

      // ↳ НОВОЕ: редирект на оплату, если пришёл id бронювання
      const bookingId: string | undefined = data?.booking?.id;
      if (bookingId) {
        window.location.assign(`/pay/${bookingId}`);
        return;
      }

      // fallback: показать сообщение и очистить форму
      setNote("Дякуємо! Запит надіслано. Ми відповімо в месенджері протягом дня.");

      if (form && typeof form.reset === "function") form.reset();
      setDateFrom("");
      setDateTo("");
      setAdults(2);
      setChildrenTotal(0);
      setChildrenOver6(0);
      setHasPet(false);
      setQuote(null);
      setFirstNameInput("");
      setLastNameInput("");
      setEmailInput("");
      setPhoneInput("");
      setTelegramInput("");
    } catch (err: any) {
      setNote(err?.message || "Сталася помилка. Спробуйте ще раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      id="form"
      className="
        rounded-2xl backdrop-blur-md bg-white/10
        border border-white/15 shadow-[0_8px_30px_rgb(0_0_0/0.12)]
        p-6 space-y-5
      "
    >
      {/* Ім'я / Прізвище */}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Імʼя</span>
          <input
            className={`
              w-full rounded-xl bg-white/5 text-white placeholder-white/70
              border p-3 outline-none transition
              focus:border-white/30 focus:bg-white/10
              ${firstNameInput && !firstNameValid ? "border-rose-400" : "border-white/15"}
            `}
            name="firstName"
            placeholder="Ваше імʼя"
            autoComplete="given-name"
            disabled={pending}
            style={{ color: "#fff" }}
            value={firstNameInput}
            onChange={(e) => setFirstNameInput(e.target.value)}
          />
          {firstNameInput && !firstNameValid && (
            <div className="text-xs text-rose-300 flex items-center gap-1">
              <span>⚠</span> Мінімум 2 символи
            </div>
          )}
          {firstNameInput && firstNameValid && (
            <div className="text-xs text-emerald-300 flex items-center gap-1">
              <span>✓</span> Вірно
            </div>
          )}
        </label>

        <label className="space-y-2 text-sm">
          <span>Прізвище</span>
          <input
            className={`
              w-full rounded-xl bg-white/5 text-white placeholder-white/70
              border p-3 outline-none transition
              focus:border-white/30 focus:bg-white/10
              ${lastNameInput && !lastNameValid ? "border-rose-400" : "border-white/15"}
            `}
            name="lastName"
            placeholder="Ваше прізвище"
            autoComplete="family-name"
            disabled={pending}
            style={{ color: "#fff" }}
            value={lastNameInput}
            onChange={(e) => setLastNameInput(e.target.value)}
          />
          {lastNameInput && !lastNameValid && (
            <div className="text-xs text-rose-300 flex items-center gap-1">
              <span>⚠</span> Мінімум 2 символи
            </div>
          )}
          {lastNameInput && lastNameValid && (
            <div className="text-xs text-emerald-300 flex items-center gap-1">
              <span>✓</span> Вірно
            </div>
          )}
        </label>
      </div>

      {/* Контакти: email / телефон / telegram */}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span>Email</span>
          <input
            className={`
              w-full rounded-xl bg-white/5 text-white placeholder-white/70
              border p-3 outline-none transition
              focus:border-white/30 focus:bg-white/10
              ${emailInput && !emailValid ? "border-rose-400" : "border-white/15"}
            `}
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={pending}
            style={{ color: "#fff" }}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          {emailInput && !emailValid && (
            <div className="text-xs text-rose-300 flex items-center gap-1">
              <span>⚠</span> Некоректний формат email
            </div>
          )}
          {emailInput && emailValid && (
            <div className="text-xs text-emerald-300 flex items-center gap-1">
              <span>✓</span> Формат правильний
            </div>
          )}
        </label>

        <label className="space-y-2 text-sm">
          <span>Телефон</span>
          <input
            className={`
              w-full rounded-xl bg-white/5 text-white placeholder-white/70
              border p-3 outline-none transition
              focus:border-white/30 focus:bg-white/10
              ${phoneInput && !phoneValid ? "border-rose-400" : "border-white/15"}
            `}
            name="phone"
            placeholder="+380…"
            autoComplete="tel"
            disabled={pending}
            style={{ color: "#fff" }}
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
          />
          {phoneInput && !phoneValid && (
            <div className="text-xs text-rose-300 flex items-center gap-1">
              <span>⚠</span> Мінімум 10 цифр (наприклад: +380501234567)
            </div>
          )}
          {phoneInput && phoneValid && (
            <div className="text-xs text-emerald-300 flex items-center gap-1">
              <span>✓</span> Формат правильний
            </div>
          )}
        </label>

        <label className="space-y-2 text-sm">
          <span>Telegram-нік</span>
          <input
            className={`
              w-full rounded-xl bg-white/5 text-white placeholder-white/70
              border p-3 outline-none transition
              focus:border-white/30 focus:bg-white/10
              ${telegramInput && !telegramValid ? "border-rose-400" : "border-white/15"}
            `}
            name="telegram"
            placeholder="@username"
            autoComplete="off"
            disabled={pending}
            style={{ color: "#fff" }}
            value={telegramInput}
            onChange={(e) => setTelegramInput(e.target.value)}
          />
          {telegramInput && !telegramValid && (
            <div className="text-xs text-rose-300 flex items-center gap-1">
              <span>⚠</span> Без пробілів і не повинно бути email
            </div>
          )}
          {telegramInput && telegramValid && (
            <div className="text-xs text-emerald-300 flex items-center gap-1">
              <span>✓</span> Формат правильний
            </div>
          )}
        </label>

        <div className="md:col-span-3 text-xs opacity-70">
          Вкажіть <b>хоча б один</b> контакт: email, телефон або Telegram-нік.
        </div>
      </div>

      {/* выбранные даты + кнопка очистки в ОДНОЙ строке */}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
        <label className="space-y-2 text-sm">
          <span>Дата заїзду</span>
          <input
            readOnly
            value={dateFrom ? fmtHuman(dateFrom) : ""}
            placeholder="ДД.ММ.РРРР"
            className="
              w-full rounded-xl bg-white/5 text-white placeholder-white/70
              border border-white/15 p-3 outline-none
              focus:border-white/30 focus:bg-white/10 transition
            "
          />
        </label>

        <label className="space-y-2 text-sm">
          <span>Дата виїзду</span>
          <input
            readOnly
            value={dateTo ? fmtHuman(dateTo) : ""}
            placeholder="ДД.ММ.РРРР"
            className="
              w-full rounded-xl bg-white/5 text-white placeholder-white/70
              border border-white/15 p-3 outline-none
              focus:border-white/30 focus:bg-white/10 transition
            "
          />
        </label>

        <div className="flex md:justify-end">
          <button
            type="button"
            className="btn btn-ghost w-full md:w-auto h-[46px]"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setNote(null);
              setQuote(null);
            }}
            disabled={pending}
          >
            Очистити дати
          </button>
        </div>

        {/* подсказки про даты */}
        <div className="md:col-span-2 text-xs opacity-70">
          Неможливо обрати минулу дату.
        </div>
        <div className="text-xs opacity-70">
          Має бути пізніше заїзду мінімум на 1 день.
        </div>
      </div>

      {/* Календарь (цены из /api/pricing, "занято" — красным) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex items-center gap-4 text-xs mb-2">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block size-2.5 rounded-full bg-emerald-400" /> Вільно
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="inline-block size-2.5 rounded-full bg-rose-400" /> Зайнято
          </span>
          <span className="ml-auto opacity-70">* ціна за добу</span>
        </div>

        <AvailabilityCalendar
          busy={busy}
          value={{ from: dateFrom || null, to: dateTo || null }}
          onChange={(range: { from: string | null; to: string | null }) => {
            const fromISO = range.from || "";
            const toISO = range.to || "";

            setDateFrom(fromISO);
            setDateTo(toISO);

            if (fromISO && toISO) validateDatesAndSetNote(fromISO, toISO);
            else {
              setNote(null);
              setQuote(null);
            }
          }}
          monthCount={2}
          minStartISO={todayISO}
          minEndISO={minDateTo}
        />
      </div>

      {/* гости и доп. параметры */}
      <div className="grid gap-3 md:grid-cols-4">
        <label className="space-y-2 text-sm">
          <span>Дорослі</span>
          <input
            type="number"
            name="adults"
            inputMode="numeric"
            min={1}
            max={4}
            value={adults}
            onChange={(e) => setAdults(Math.max(1, Math.min(10, Number(e.target.value) || 0)))}
            className="
              w-full rounded-xl bg-white/5 text-white
              border border-white/15 p-3 outline-none
              focus:border-white/30 focus:bg-white/10 transition
            "
            disabled={pending}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span>Діти (усього)</span>
          <input
            type="number"
            name="childrenTotal"
            inputMode="numeric"
            min={0}
            max={6}
            value={childrenTotal}
            onChange={(e) =>
              setChildrenTotal(Math.max(0, Math.min(10, Number(e.target.value) || 0)))
            }
            className="
              w-full rounded-xl bg-white/5 text-white
              border border-white/15 p-3 outline-none
              focus:border-white/30 focus:bg-white/10 transition
            "
            disabled={pending}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span>Діти старше 6 років</span>
          <input
            type="number"
            name="childrenOver6"
            inputMode="numeric"
            min={0}
            max={childrenTotal}
            value={childrenOver6}
            onChange={(e) =>
              setChildrenOver6(
                Math.max(0, Math.min(childrenTotal, Number(e.target.value) || 0))
              )
            }
            className="
              w-full rounded-xl bg-white/5 text-white
              border border-white/15 p-3 outline-none
              focus:border-white/30 focus:bg-white/10 transition
            "
            disabled={pending}
          />
        </label>

        <label className="space-y-2 text-sm flex items-end">
          <span className="sr-only">Пухнастик</span>
          <div
            className="
              w-full rounded-xl bg-white/5 text-white
              border border-white/15 p-3 outline-none
              focus-within:border-white/30 focus-within:bg-white/10 transition
              flex items-center gap-2
            "
          >
            <input
              id="hasPet"
              type="checkbox"
              name="hasPet"
              checked={hasPet}
              onChange={(e) => setHasPet(e.target.checked)}
              className="size-4 accent-white"
              disabled={pending}
            />
            <label htmlFor="hasPet" className="text-sm select-none">
              Я візьму тваринку з собою
            </label>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-white/15 bg-white/10 p-4 space-y-2.5">
        <div className="font-semibold text-sm mb-3">Правила доплат:</div>
        <div className="grid gap-2.5 text-xs">
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 size-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">✓</span>
            <span className="opacity-90">Дитина до 6 років — <b>безкоштовно</b></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 size-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">+</span>
            <span className="opacity-90">Дитина старше 6 років — <b>+1500 грн</b> за період (за кожного)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 size-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">🐾</span>
            <span className="opacity-90">Пухнастик — <b>+700 грн</b> за період</span>
          </div>
        </div>
      </div>

      {/* live-котировка */}
      {quote && (
        <div className="rounded-xl border border-white/15 bg-white/10 p-4 space-y-3">
          <div className="font-semibold text-sm border-b border-white/10 pb-2">
            Розрахунок вартості
          </div>

          {/* Базовая стоимость */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="opacity-90">
                Проживання ({quote.nights} {quote.nights === 1 ? 'ніч' : quote.nights < 5 ? 'ночі' : 'ночей'})
              </span>
              <span className="font-medium">₴{quote.baseNightsSumUAH.toLocaleString("uk-UA")}</span>
            </div>
            {quote.perNight && quote.perNight.length > 0 && (
              <div className="text-xs opacity-70 pl-3">
                {quote.perNight.map((n, i) => (
                  <div key={i}>
                    {fmtHuman(n.date)}: ₴{n.priceUAH.toLocaleString("uk-UA")}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Доплаты */}
          {quote.surcharges && quote.surcharges.length > 0 && (
            <div className="space-y-1.5 border-t border-white/10 pt-3">
              <div className="text-xs opacity-70 font-medium mb-2">Доплати:</div>
              {quote.surcharges.map((s, i) => {
                let label = "";
                if (s.type === "CHILD_OVER_AGE") {
                  label = `${childrenOver6} ${childrenOver6 === 1 ? 'дитина' : 'дітей'} старше 6 років`;
                } else if (s.type === "PET") {
                  label = "Пухнастик";
                } else if (s.type === "EXTRA_GUEST") {
                  const extra = Math.max(0, adults + childrenOver6 - 2);
                  label = `${extra} додатков${extra === 1 ? 'ий' : 'их'} гість${extra === 1 ? '' : 'ів'}`;
                }
                return (
                  <div key={i} className="flex items-baseline justify-between text-sm">
                    <span className="opacity-90">{label}</span>
                    <span className="font-medium">+₴{s.amountUAH.toLocaleString("uk-UA")}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Итого */}
          <div className="flex items-baseline justify-between border-t border-white/20 pt-3">
            <div className="text-base font-semibold">Всього</div>
            <div className="text-xl font-bold">₴{quote.totalUAH.toLocaleString("uk-UA")}</div>
          </div>
        </div>
      )}
      {!quote && isValidISO(dateFrom) && isValidISO(dateTo) && (
        <div className="text-xs opacity-70">
          {quoteLoading ? "Розрахунок ціни…" : "Ціна зʼявиться після розрахунку."}
        </div>
      )}

      {/* Зайнято (підказка списком) */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-rose-400"></span>
          Зайнято (бронювання)
        </div>
        {loadingBusy && <div className="text-xs opacity-70">Завантаження…</div>}
        {!loadingBusy && busy.length === 0 && (
          <div className="text-xs opacity-70 text-center py-2">Немає зайнятих дат</div>
        )}
        {!loadingBusy && busy.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {busyHint.map((b, i) => (
              <div
                key={`${b.start}-${b.end}-${i}`}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs border border-rose-500/30"
              >
                {fmtHuman(b.start)} — {fmtHuman(b.end)}
              </div>
            ))}
            {busy.length > busyHint.length && (
              <div className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs">
                +{busy.length - busyHint.length} ще
              </div>
            )}
          </div>
        )}
      </div>

      {note && (
        <div className="text-sm rounded-xl border border-white/15 bg-white/10 p-3">
          {note}
        </div>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Надсилаємо…" : "Надіслати запит"}
      </button>
    </form>
  );
}
