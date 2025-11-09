// src/components/DateRangePicker.tsx
"use client";

import * as React from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, startOfDay } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";

export type BusyInterval = { start: string; end: string }; // [start, end) — YYYY-MM-DD

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function ymdToDate(s: string) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Преобразуем [start, end) => {from,to} (включительно) для disabled */
function busyToDisabled(busy: BusyInterval[]) {
  return busy.map((b) => {
    const from = startOfDay(ymdToDate(b.start));
    const endExclusive = startOfDay(ymdToDate(b.end));
    const to = addDays(endExclusive, -1); // делаем включительным
    return { from, to };
  });
}

export interface DateRangePickerProps {
  value: { from: string | null; to: string | null }; // YYYY-MM-DD
  onChange: (v: { from: string | null; to: string | null }) => void;
  busy: BusyInterval[]; // интервалы занятости [start, end)
  minFrom?: string; // YYYY-MM-DD
  className?: string;
}

export default function DateRangePicker({
  value,
  onChange,
  busy,
  minFrom,
  className,
}: DateRangePickerProps) {
  const selected: DateRange | undefined =
    value.from && value.to
      ? { from: ymdToDate(value.from), to: ymdToDate(value.to) }
      : value.from
      ? { from: ymdToDate(value.from) }
      : undefined;

  const disabled = React.useMemo(() => {
    const rules: Array<{ from: Date; to: Date } | { before: Date }> = busyToDisabled(busy);
    if (minFrom) rules.push({ before: ymdToDate(minFrom) });
    return rules;
  }, [busy, minFrom]);

  const defaultMonth = React.useMemo(
    () => (minFrom ? ymdToDate(minFrom) : startOfDay(new Date())),
    [minFrom]
  );

  return (
    <div className={className}>
      <DayPicker
        mode="range"
        numberOfMonths={2}               /* два месяца рядом, как «два календаря» */
        selected={selected}
        onSelect={(range) => {
          const from = range?.from ? ymd(range.from) : null;
          const to = range?.to ? ymd(range.to) : null;
          onChange({ from, to });
        }}
        disabled={disabled}
        weekStartsOn={1}
        showOutsideDays
        defaultMonth={defaultMonth}
        locale={ukLocale}               /* ← УКРАЇНСЬКА ЛОКАЛЬ */
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
          range_start: "bg-emerald-500 text-white",
          range_end: "bg-emerald-500 text-white",
          range_middle: "bg-emerald-500/25 text-white",
          disabled: "rdp-day_disabled",
        }}
      />
      <div className="mt-2 text-xs text-white/80">
        {value.from && value.to ? (
          <>Обрано: {value.from} — {value.to}</>
        ) : (
          <>Оберіть період заїзду та виїзду</>
        )}
      </div>
    </div>
  );
}
