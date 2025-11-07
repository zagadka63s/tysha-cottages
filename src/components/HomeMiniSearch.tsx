// src/components/HomeMiniSearch.tsx
"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { uk } from "date-fns/locale";

/* ───────── helpers ───────── */
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
function addDaysISO(iso: string, days: number) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}
function isValidISO(s?: string | null) {
  if (!s) return false;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return !isNaN(d.getTime()) && s === toISO(d);
}

/* ───────── маленькая кнопка-дата с попап-календарём ───────── */
function DatePopover({
  label,
  value,
  min,
  onSelect,
}: {
  label: string;
  value: string | "";
  min?: string;
  onSelect: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // клики вне — закрыть
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = isValidISO(value) ? fromISO(value) : undefined;
  const defaultMonth = selected ?? (min ? fromISO(min) : new Date());
  const disabled = [{ before: min ? fromISO(min) : undefined }];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="
          ui-input w-full flex items-center justify-between gap-2
          text-left
        "
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
      >
        <span className="inline-flex items-center gap-2">
          <i className="i-lucide-calendar size-4 opacity-70" aria-hidden />
          {selected
            ? selected.toLocaleDateString("uk-UA")
            : (label || "Дата")}
        </span>
        <i className="i-lucide-chevron-down size-4 opacity-70" aria-hidden />
      </button>

      {open && (
        <div
          className="
            absolute left-0 top-[calc(100%+8px)] z-40
            rounded-xl border border-white/15 bg-[color:var(--tg-glass)]/90 backdrop-blur
            shadow-xl p-2
          "
        >
          <DayPicker
            mode="single"
            weekStartsOn={1}
            showOutsideDays
            locale={uk}
            selected={selected}
            defaultMonth={defaultMonth}
            onSelect={(d) => {
              if (d) {
                onSelect(toISO(d));
                setOpen(false);
              }
            }}
            disabled={disabled as any}
            className="rdp"
            classNames={{
              caption_label: "rdp-caption_label text-white/90",
              head_cell: "rdp-head_cell text-white/70 font-medium",
              day: "rdp-day text-sm hover:bg-white/10 text-white",
              nav: "rdp-nav",
              button_next: "rounded-md px-2 py-1 hover:bg-white/10",
              button_previous: "rounded-md px-2 py-1 hover:bg-white/10",
            }}
            modifiersClassNames={{
              selected: "bg-emerald-500 text-white",
              disabled: "rdp-day_disabled",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function HomeMiniSearch() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toISO(d);
  }, []);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [guests, setGuests] = useState<number>(1);
  const [promo, setPromo] = useState<string>("");

  // «виїзд» не раніше «заїзду + 1»
  const minTo = useMemo(() => {
    if (isValidISO(from)) return addDaysISO(from, 1);
    return addDaysISO(today, 1);
  }, [from, today]);

  function submit() {
    const params = new URLSearchParams();
    if (isValidISO(from)) params.set("checkIn", from);
    if (isValidISO(to)) params.set("checkOut", to);
    if (guests > 0) params.set("guests", String(guests));
    if (promo.trim()) params.set("promo", promo.trim());
    const qs = params.toString();
    window.location.href = `/book${qs ? `?${qs}` : ""}#form`;
  }

  return (
    <div
      className="
        rounded-2xl shadow-2xl border border-black/5
        bg-[color:var(--tg-sand)]/92 text-[#173A2A]
        p-3 md:p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_1fr_auto] gap-3
      "
    >
      {/* Дата з (кастомний попап) */}
      <DatePopover
        label={from ? new Date(from).toLocaleDateString("uk-UA") : "ДД.ММ.РРРР"}
        value={from}
        min={today}
        onSelect={(iso) => {
          setFrom(iso);
          if (!isValidISO(to) || to <= iso) setTo(addDaysISO(iso, 1));
        }}
      />

      {/* Дата по (кастомний попап) */}
      <DatePopover
        label={to ? new Date(to).toLocaleDateString("uk-UA") : "ДД.ММ.РРРР"}
        value={to}
        min={minTo}
        onSelect={(iso) => setTo(iso)}
      />

      {/* Гості */}
      <div className="relative">
        <select
          aria-label="Гості"
          className="ui-select w-full"
          value={guests}
          onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
        >
          <option value="1">1 гість</option>
          <option value="2">2 гості</option>
          <option value="3">3 гості</option>
          <option value="4">4 гості</option>
        </select>
      </div>

      {/* Промокод */}
      <input
        aria-label="Промокод"
        placeholder="Промокод"
        className="ui-input"
        value={promo}
        onChange={(e) => setPromo(e.target.value)}
      />

      {/* Кнопка */}
      <button
        type="button"
        className="w-full rounded-xl bg-[#0b3b22] text-white px-4 py-3 font-semibold hover:opacity-95 transition"
        onClick={submit}
      >
        Бронювати
      </button>
    </div>
  );
}
