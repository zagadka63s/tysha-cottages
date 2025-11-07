'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking } from "@prisma/client";

type Props = {
  booking: Booking;
  adminKey: string;
};

async function patchStatus(id: string, status: string, adminKey: string) {
  const res = await fetch(`/api/bookings/${id}?key=${encodeURIComponent(adminKey)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Failed: ${res.status}`);
  }
  return res.json();
}

function fmtPrice(price: number | null | undefined) {
  if (!price) return "—";
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 0,
  }).format(price);
}

function fmtDateTime(d: Date) {
  const date = new Date(d).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = new Date(d).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

function fmtDateRange(checkIn: Date, checkOut: Date) {
  const start = new Date(checkIn).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
  });
  const end = new Date(checkOut).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
  return { range: `${start} — ${end}`, nights };
}

export default function AdminBookingRow({ booking, adminKey }: Props) {
  const router = useRouter();

  // локальный статус — чтобы сразу скрывать/менять кнопки
  const [status, setStatus] = useState<Booking["status"]>(booking.status);
  const [busy, setBusy] = useState<null | "CONFIRMED" | "CANCELLED">(null);

  const onConfirm = async () => {
    try {
      setBusy("CONFIRMED");
      await patchStatus(booking.id, "CONFIRMED", adminKey);
      setStatus("CONFIRMED");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Не вдалося оновити бронювання");
    } finally {
      setBusy(null);
    }
  };

  const onCancel = async () => {
    try {
      setBusy("CANCELLED");
      await patchStatus(booking.id, "CANCELLED", adminKey);
      setStatus("CANCELLED");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const created = fmtDateTime(booking.createdAt);
  const dateInfo = fmtDateRange(booking.checkIn, booking.checkOut);

  return (
    <tr className="border-t border-white/10">
      {/* Дата створення */}
      <td className="py-2 pr-3 align-top">
        <div className="font-medium text-sm">{created.date}</div>
        <div className="text-[11px] opacity-70">{created.time}</div>
      </td>

      <td className="py-2 pr-3 align-top">{booking.name}</td>
      <td className="py-2 pr-3 align-top text-sm opacity-90">{booking.contact}</td>

      {/* Дати проживання */}
      <td className="py-2 pr-3 align-top">
        <div className="font-medium text-sm whitespace-nowrap">{dateInfo.range}</div>
        <div className="text-[11px] opacity-70">
          {dateInfo.nights} {dateInfo.nights === 1 ? "ніч" : dateInfo.nights < 5 ? "ночі" : "ночей"}
        </div>
      </td>

      <td className="py-2 pr-3 text-center align-top">
        <div className="font-medium">{booking.guests}</div>
        {booking.quoteTotalUAH && (
          <div className="text-[11px] opacity-80 mt-0.5">{fmtPrice(booking.quoteTotalUAH)}</div>
        )}
      </td>

      <td className="py-2 pr-3 align-top">
        <span
          className={[
            "inline-block rounded-full px-2 py-0.5 text-xs border",
            status === "CONFIRMED"
              ? "border-emerald-400/40 bg-emerald-500/15"
              : status === "PENDING"
              ? "border-yellow-400/40 bg-yellow-500/15"
              : "border-red-400/40 bg-red-500/15",
          ].join(" ")}
        >
          {status}
        </span>
      </td>

      <td className="py-2 pr-3 align-top text-sm opacity-80">{booking.source}</td>
      <td className="py-2 pr-3 align-top max-w-[280px] truncate text-sm opacity-90" title={booking.comment ?? ""}>
        {booking.comment ?? "—"}
      </td>
      <td className="py-2 pr-3">
        <div className="flex gap-2">
          {status !== "CONFIRMED" && (
            <button
              className="rounded-lg bg-white text-[color:var(--tg-bg)] px-3 py-1 text-sm font-semibold disabled:opacity-60"
              onClick={onConfirm}
              disabled={busy !== null || !adminKey}
              title="Підтвердити"
            >
              {busy === "CONFIRMED" ? "..." : "Підтвердити"}
            </button>
          )}
          {status !== "CANCELLED" && (
            <button
              className="rounded-lg border border-white/30 px-3 py-1 text-sm disabled:opacity-60"
              onClick={onCancel}
              disabled={busy !== null || !adminKey}
              title="Скасувати"
            >
              {busy === "CANCELLED" ? "..." : "Скасувати"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
