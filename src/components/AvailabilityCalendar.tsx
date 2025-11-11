"use client";

import { useMemo, useState, useEffect } from "react";

/** BusyInterval uses half-open [start, end) in YYYY-MM-DD */
export type BusyInterval = { start: string; end: string; status?: string };

type Range = { from: string | null; to: string | null };

type Props = {
  busy: BusyInterval[];
  value: Range;
  onChange: (r: Range) => void;

  /** fallback, якщо API цін недоступне */
  priceForDate?: (d: Date) => number;

  /** скільки місяців показувати (типово 2) */
  monthCount?: number;

  /** обмеження вибору */
  minStartISO?: string;
  minEndISO?: string;
};

/* ---------- утиліти дат ---------- */
function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromISO(s: string) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeekMon(d: Date) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Пн=0..Нд=6
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
/** напіввідкриті інтервали перетинаються? */
function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return fromISO(aStart) < fromISO(bEnd) && fromISO(bStart) < fromISO(aEnd);
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
type MonthPrices = Record<string, number>; // "YYYY-MM-DD" -> price

export default function AvailabilityCalendar({
  busy,
  value,
  onChange,
  priceForDate,
  monthCount = 2,
  minStartISO,
  minEndISO,
}: Props) {
  /* перший показуваний місяць */
  const [baseMonth, setBaseMonth] = useState(startOfMonth(new Date()));

  /* стадія вибору (від/до) */
  const [picking, setPicking] = useState<"from" | "to">("from");

  /* нормалізовані зайняті інтервали */
  const normalizedBusy = useMemo(
    () =>
      (busy || []).map((b) => ({
        start: toISO(fromISO(b.start)),
        end: toISO(fromISO(b.end)),
        status: b.status,
      })),
    [busy]
  );

  /* зовнішні значення */
  const fromISOValue = value?.from || null;
  const toISOValue = value?.to || null;

  useEffect(() => {
    if (fromISOValue && !toISOValue) setPicking("to");
    else setPicking("from");
  }, [fromISOValue, toISOValue]);

  /* місяці (кожен: 6*7 клітинок) */
  const months = useMemo(() => {
    return Array.from({ length: monthCount }).map((_, idx) => {
      const firstDay = startOfMonth(addDays(baseMonth, 32 * idx));
      const gridStart = startOfWeekMon(firstDay);
      const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
      const ym = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}`;
      return { firstDay, days, ym };
    });
  }, [baseMonth, monthCount]);

  /* ---------- ціни: підвантажуємо для видимих місяців із кешем ---------- */
  const [pricesByMonth, setPricesByMonth] = useState<Record<string, MonthPrices>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const m of months) {
        if (pricesByMonth[m.ym]) continue;
        try {
          const res = await fetch(`/api/pricing?month=${m.ym}`, { cache: "no-store" });
          const data = await res.json();
          if (!alive || !data?.ok || !Array.isArray(data.days)) continue;
          const mp: MonthPrices = {};
          for (const x of data.days) {
            if (x?.date && Number.isFinite(x?.priceUAH)) mp[x.date] = x.priceUAH;
          }
          setPricesByMonth((p) => ({ ...p, [m.ym]: mp }));
        } catch {
          // тихо: буде fallback через priceForDate
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [months, pricesByMonth]);

  function priceForDay(d: Date, ym: string): number | undefined {
    const iso = toISO(d);
    const m = pricesByMonth[ym];
    if (m && m[iso] != null) return m[iso];
    return priceForDate?.(d);
  }

  /* helpers */
  function getBookingStatus(d: Date): "CONFIRMED" | "PENDING" | null {
    const dayStartISO = toISO(d);
    const dayEndISO = toISO(addDays(d, 1));
    const booking = normalizedBusy.find((b) => intervalsOverlap(dayStartISO, dayEndISO, b.start, b.end));
    return booking ? (booking.status as "CONFIRMED" | "PENDING") || null : null;
  }

  function isBusyDay(d: Date) {
    return getBookingStatus(d) !== null;
  }

  function isSelectableDay(d: Date) {
    const iso = toISO(d);
    if (minStartISO && iso < minStartISO) return false;
    if (picking === "to" && minEndISO && iso < minEndISO) return false;
    // Блокируем только CONFIRMED, PENDING можно выбирать
    return getBookingStatus(d) !== "CONFIRMED";
  }
  function inPickedRange(d: Date) {
    if (!fromISOValue || !toISOValue) return false;
    const t = d.getTime();
    const a = fromISO(fromISOValue).getTime();
    const b = fromISO(toISOValue).getTime();
    return t >= a && t <= b;
  }

  function handleDayClick(d: Date) {
    const iso = toISO(d);
    if (!isSelectableDay(d)) return;

    if (picking === "from") {
      onChange({ from: iso, to: null });
      setPicking("to");
      return;
    }

    if (!fromISOValue) {
      onChange({ from: iso, to: null });
      setPicking("to");
      return;
    }
    if (fromISO(iso) <= fromISO(fromISOValue)) return;

    // перевірка CONFIRMED всередині [from, iso] -> напіввідкритий [from, iso+1)
    const isoNext = toISO(addDays(fromISO(iso), 1));
    const hasOverlap = normalizedBusy.some(
      (b) => b.status === "CONFIRMED" && intervalsOverlap(fromISOValue, isoNext, b.start, b.end)
    );
    if (hasOverlap) return;

    onChange({ from: fromISOValue, to: iso });
    setPicking("from");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {months.map(({ firstDay, days, ym }, mIdx) => {
        const thisMonthNum = firstDay.getMonth();

        return (
          <div key={mIdx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {/* заголовок місяця + стрілки на першому місяці */}
            <div className="mb-2 flex items-center justify-between">
              <div className="text-base font-semibold">
                {firstDay.toLocaleDateString("uk-UA", { year: "numeric", month: "long" })}
              </div>
              {mIdx === 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded-lg border border-white/20 hover:border-white/40"
                    onClick={() => setBaseMonth(startOfMonth(addDays(baseMonth, -1)))}
                    aria-label="Попередній місяць"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-lg border border-white/20 hover:border-white/40"
                    onClick={() => setBaseMonth(startOfMonth(addDays(baseMonth, 31)))}
                    aria-label="Наступний місяць"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* назви днів */}
            <div className="grid grid-cols-7 text-center text-xs opacity-80 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* сітка днів */}
            <div className="grid grid-cols-7 gap-[6px]">
              {days.map((d, i) => {
                const inCurr = d.getMonth() === thisMonthNum;
                const bookingStatus = getBookingStatus(d);
                const busyDay = bookingStatus !== null;
                const disabled = !isSelectableDay(d);
                const picked = inPickedRange(d);
                const isFrom = fromISOValue && isSameDay(d, fromISO(fromISOValue));
                const isTo = toISOValue && isSameDay(d, fromISO(toISOValue));
                const price = priceForDay(d, ym);

                const wd = d.getDay();
                const isWeekend = wd === 0 || wd === 6;

                const base =
                  "relative overflow-hidden h-18 md:h-22 rounded-lg border text-[12px] md:text-sm leading-none p-1.5 transition-all duration-200 " +
                  (inCurr ? "bg-white/[0.06] border-white/15 " : "bg-white/[0.03] border-white/10 opacity-75 ");

                // Разные цвета по статусу
                let busyCls = "";
                let busyStyle: React.CSSProperties | undefined = undefined;
                let dotColor = "";

                if (bookingStatus === "CONFIRMED") {
                  // Красный для подтвержденных
                  busyCls = "border-rose-500 ";
                  busyStyle = {
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(244,63,94,.34) 0, rgba(244,63,94,.34) 6px, rgba(244,63,94,.18) 6px, rgba(244,63,94,.18) 12px)",
                  };
                  dotColor = "bg-rose-300";
                } else if (bookingStatus === "PENDING") {
                  // Желтый/оранжевый для ожидающих
                  busyCls = "border-amber-500 ";
                  busyStyle = {
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(245,158,11,.34) 0, rgba(245,158,11,.34) 6px, rgba(245,158,11,.18) 6px, rgba(245,158,11,.18) 12px)",
                  };
                  dotColor = "bg-amber-300";
                }

                const pickedCls = picked ? "bg-emerald-500/15 border-emerald-400/40 " : "";
                const endsCls = (isFrom || isTo) ? "outline outline-2 outline-emerald-300 " : "";
                const disabledCls = disabled && !busyDay ? "cursor-not-allowed opacity-50 " : "";
                const hoverCls = !disabled ? "hover:bg-white/[0.08] hover:scale-105 hover:shadow-lg hover:z-10 " : "";

                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleDayClick(d)}
                    disabled={disabled}
                    className={base + busyCls + pickedCls + endsCls + disabledCls + hoverCls}
                    title={price !== undefined ? `${price.toLocaleString("uk-UA")} ₴` : undefined}
                    style={busyStyle}
                  >
                    <div className="flex justify-between items-start">
                      <span>{d.getDate()}</span>
                      {busyDay && <i className={`inline-block size-1.5 rounded-full ${dotColor}`} />}
                    </div>

                    {price !== undefined && (
                      <div
                        className={
                          "absolute bottom-1 left-1 right-1 text-[11px] md:text-[12px] text-center opacity-95 truncate " +
                          (isWeekend ? "text-emerald-300" : "text-gray-100")
                        }
                        style={{ textShadow: "0 1px 6px rgba(0,0,0,.35)" }}
                      >
                        {price.toLocaleString("uk-UA")} ₴
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
