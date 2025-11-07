// src/components/AdminCalendar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type BookingRow = {
  id: string;
  name: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  quoteTotalUAH?: number | null;
  guests?: number;
  adults?: number;
  childrenTotal?: number;
  hasPet?: boolean;
};

type Props = {
  bookings: BookingRow[];
  monthISO?: string; // '2025-03-01' -> будь-який день потрібного місяця; якщо не передано — поточний
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function toDate(d: string | Date | null): Date | null {
  if (!d) return null;
  return typeof d === "string" ? new Date(d) : d;
}

// старт місяця (1-е число, 00:00)
function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

// понеділок тижня для дати
function startOfWeekMon(d: Date) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0..6, де 0 — Пн
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function inRange(day: Date, a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  const dd = day.getTime();
  // порівнюємо по датах (без часу)
  const aa = new Date(a); aa.setHours(0, 0, 0, 0);
  const bb = new Date(b); bb.setHours(0, 0, 0, 0);
  return dd >= aa.getTime() && dd <= bb.getTime();
}

function statusColor(status: BookingRow["status"]) {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-500/25 border-emerald-400/40";
    case "PENDING":
      return "bg-yellow-500/25 border-yellow-400/40";
    case "CANCELLED":
      return "bg-red-500/25 border-red-400/40";
  }
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function fmtDate(d: Date | null) {
  if (!d) return "—";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function fmtDateRange(a: Date | null, b: Date | null) {
  return `${fmtDate(a)} — ${fmtDate(b)}`;
}

function fmtPrice(price: number | null | undefined) {
  if (!price) return "—";
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 0,
  }).format(price);
}

function getGuestDetails(b: BookingRow) {
  const parts: string[] = [];
  if (b.adults) parts.push(`${b.adults} дорослих`);
  if (b.childrenTotal) parts.push(`${b.childrenTotal} дітей`);
  if (b.hasPet) parts.push("з питомцем");
  return parts.length ? parts.join(", ") : `${b.guests || 0} гостей`;
}

export default function AdminCalendar({ bookings, monthISO }: Props) {
  // стан для навігації по місяцях
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);

  const monthBase = useMemo(() => {
    if (monthISO) return new Date(monthISO);
    const d = new Date();
    d.setMonth(d.getMonth() + currentMonthOffset);
    return d;
  }, [monthISO, currentMonthOffset]);

  const monthStart = startOfMonth(monthBase);
  const gridStart = startOfWeekMon(monthStart);

  // 6 тижнів * 7 днів = 42 клітинки (для надійності відображення)
  const days = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [gridStart]);

  const thisMonth = monthStart.getMonth();

  // ── СТАН для модалки з деталями дня
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [openDayHits, setOpenDayHits] = useState<BookingRow[]>([]);

  // закриття по ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenDay(null);
        setOpenDayHits([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openDetails(day: Date, hits: BookingRow[]) {
    if (!hits.length) return;
    setOpenDay(day);
    setOpenDayHits(hits);
  }

  return (
    <div className="glass rounded-2xl p-4 md:p-5">
      {/* Шапка місяця з навігацією */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!monthISO && (
            <>
              <button
                onClick={() => setCurrentMonthOffset((prev) => prev - 1)}
                className="btn btn-outline px-2.5 py-1.5 text-sm"
                aria-label="Попередній місяць"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentMonthOffset(0)}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
                disabled={currentMonthOffset === 0}
              >
                Сьогодні
              </button>
              <button
                onClick={() => setCurrentMonthOffset((prev) => prev + 1)}
                className="btn btn-outline px-2.5 py-1.5 text-sm"
                aria-label="Наступний місяць"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          <div className="text-lg md:text-xl font-semibold">
            {monthStart.toLocaleDateString("uk-UA", {
              year: "numeric",
              month: "long",
            })}
          </div>
        </div>

        {/* легенда */}
        <div className="hidden md:flex items-center gap-3 text-xs opacity-80">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block size-3 rounded border border-emerald-400/40 bg-emerald-500/25" />
            Підтверджено
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="inline-block size-3 rounded border border-yellow-400/40 bg-yellow-500/25" />
            Очікує
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="inline-block size-3 rounded border border-red-400/40 bg-red-500/25" />
            Скасовано
          </span>
        </div>
      </div>

      {/* Назви днів */}
      <div className="grid grid-cols-7 text-center text-xs md:text-sm opacity-80 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      {/* Сітка календаря */}
      <div className="grid grid-cols-7 gap-[2px] md:gap-1">
        {days.map((d, i) => {
          const inCurr = d.getMonth() === thisMonth;
          const today = isSameDay(d, new Date());

          // бронювання, що зачіпають цей день (може бути кілька)
          const hits = bookings.filter((b) =>
            inRange(d, toDate(b.checkIn), toDate(b.checkOut))
          );

          const hasHits = hits.length > 0;

          return (
            <div
              key={i}
              role={hasHits ? "button" : undefined}
              aria-label={hasHits ? `Деталі за ${fmtDate(d)}` : undefined}
              onClick={() => hasHits && openDetails(d, hits)}
              className={[
                "relative rounded-md border",
                inCurr ? "border-white/15 bg-white/[0.06]" : "border-white/10 bg-white/[0.03] opacity-70",
                today ? "ring-1 ring-white/40" : "",
                "min-h-[70px] md:min-h-[92px] p-1 md:p-1.5",
                hasHits ? "cursor-pointer hover:bg-white/[0.08]" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between text-[11px] md:text-xs">
                <span className="opacity-85">{d.getDate()}</span>
                {hasHits && (
                  <span className="text-[10px] md:text-[11px] opacity-70">
                    {hits.length} бронь
                  </span>
                )}
              </div>

              {/* «стрічки» внизу комірки по кожному бронюванню */}
              <div className="mt-1 flex flex-col gap-1">
                {hits.slice(0, 3).map((b) => {
                  const guestInfo = getGuestDetails(b);
                  const priceInfo = fmtPrice(b.quoteTotalUAH);
                  const tooltipText = [
                    b.status,
                    b.name || "—",
                    fmtDateRange(toDate(b.checkIn), toDate(b.checkOut)),
                    guestInfo,
                    priceInfo !== "—" ? `Сума: ${priceInfo}` : null,
                  ].filter(Boolean).join(" · ");

                  return (
                    <div
                      key={b.id}
                      title={tooltipText}
                      className={[
                        "h-2.5 md:h-3 rounded border",
                        statusColor(b.status),
                      ].join(" ")}
                    />
                  );
                })}
                {hits.length > 3 && (
                  <div className="text-[10px] md:text-[11px] opacity-70">+{hits.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Список за місяць під календарем */}
      <div className="mt-4 max-h-64 overflow-auto rounded-md border border-white/10">
        <table className="w-full text-xs md:text-sm">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="py-1.5 px-2">Період проживання</th>
              <th className="py-1.5 px-2">Ім'я</th>
              <th className="py-1.5 px-2">Гості</th>
              <th className="py-1.5 px-2">Сума</th>
              <th className="py-1.5 px-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {bookings
              .filter((b) => {
                const a = toDate(b.checkIn);
                const z = toDate(b.checkOut);
                if (!a || !z) return false;
                return a.getMonth() === thisMonth || z.getMonth() === thisMonth;
              })
              .map((b) => {
                const nights = toDate(b.checkIn) && toDate(b.checkOut)
                  ? Math.ceil((toDate(b.checkOut)!.getTime() - toDate(b.checkIn)!.getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <tr key={b.id} className="border-t border-white/10 align-top">
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="font-medium">
                        {fmtDate(toDate(b.checkIn))} — {fmtDate(toDate(b.checkOut))}
                      </div>
                      {nights > 0 && (
                        <div className="text-[10px] opacity-70">
                          {nights} {nights === 1 ? "ніч" : nights < 5 ? "ночі" : "ночей"}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2">{b.name ?? "—"}</td>
                    <td className="py-1.5 px-2 text-xs opacity-90">
                      {getGuestDetails(b)}
                    </td>
                    <td className="py-1.5 px-2 font-medium">
                      {fmtPrice(b.quoteTotalUAH)}
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className={[
                          "inline-block text-[10px] px-2 py-0.5 rounded-full border",
                          b.status === "CONFIRMED"
                            ? "border-emerald-400/40 bg-emerald-500/15"
                            : b.status === "PENDING"
                            ? "border-yellow-400/40 bg-yellow-500/15"
                            : "border-red-400/40 bg-red-500/15",
                        ].join(" ")}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ── МОДАЛКА ДЕТАЛЕЙ ДНЯ ─────────────────────────────────────────── */}
      {openDay && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 md:p-6"
          onClick={(e) => {
            // закриваємо по кліку по фону
            if (e.target === e.currentTarget) {
              setOpenDay(null);
              setOpenDayHits([]);
            }
          }}
        >
          <div className="glass w-full max-w-xl rounded-2xl p-4 md:p-5 border border-white/10">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-lg md:text-xl font-semibold">
                  Бронювання на {fmtDate(openDay)}
                </div>
                <div className="text-xs opacity-75">
                  Натисніть поза вікном або Esc, щоб закрити
                </div>
              </div>
              <button
                className="btn btn-outline px-3 py-1.5 text-sm"
                onClick={() => {
                  setOpenDay(null);
                  setOpenDayHits([]);
                }}
              >
                Закрити
              </button>
            </div>

            {openDayHits.length === 0 ? (
              <div className="text-white/70">На цю дату немає бронювань.</div>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                {openDayHits.map((b) => {
                  const a = toDate(b.checkIn);
                  const z = toDate(b.checkOut);
                  const nights = a && z
                    ? Math.ceil((z.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                  return (
                    <li
                      key={b.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        <span className="text-sm font-medium">
                          {b.name ?? "—"}
                        </span>
                        <span
                          className={[
                            "text-[11px] px-2 py-[2px] rounded-full border",
                            b.status === "CONFIRMED"
                              ? "border-emerald-400/40 bg-emerald-500/15"
                              : b.status === "PENDING"
                              ? "border-yellow-400/40 bg-yellow-500/15"
                              : "border-red-400/40 bg-red-500/15",
                          ].join(" ")}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-baseline gap-2">
                          <span className="opacity-70">Період:</span>
                          <span className="font-medium">
                            {fmtDateRange(a, z)}
                            {nights > 0 && (
                              <span className="opacity-70 ml-1">
                                ({nights} {nights === 1 ? "ніч" : nights < 5 ? "ночі" : "ночей"})
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="opacity-70">Гості:</span>
                          <span>{getGuestDetails(b)}</span>
                        </div>

                        {b.quoteTotalUAH && (
                          <div className="flex items-baseline gap-2">
                            <span className="opacity-70">Сума:</span>
                            <span className="font-semibold text-sm">
                              {fmtPrice(b.quoteTotalUAH)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] opacity-60 mt-2">ID: {b.id}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
