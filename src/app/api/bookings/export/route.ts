// src/app/api/bookings/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";

// --- helpers -------------------------------------------------
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function fmtDT(d: Date | null) {
  if (!d) return "";
  const dd = new Date(d);
  const txt = `${pad(dd.getDate())}.${pad(dd.getMonth() + 1)}.${dd.getFullYear()} ${pad(
    dd.getHours()
  )}:${pad(dd.getMinutes())}`;
  // Хак, чтобы Excel не «переформатировал» дату/время:
  // возвращаем формулу ="…"
  return `="${txt}"`;
}
function esc(v: unknown) {
  if (v == null) return "";
  const s = String(v);
  // Экранируем кавычки и заключаем поле в кавычки — так CSV корректно читается Excel
  return `"${s.replace(/"/g, '""')}"`;
}
function isStatus(v: string | null): v is BookingStatus {
  return v === "PENDING" || v === "CONFIRMED" || v === "CANCELLED";
}

// --- handler -------------------------------------------------
export async function GET(req: Request) {
  const url = new URL(req.url);

  const key = url.searchParams.get("key") ?? "";
  const adminKey = process.env.ADMIN_KEY ?? "";
  if (!adminKey || key !== adminKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Опциональный фильтр: ?status=PENDING|CONFIRMED|CANCELLED
  const statusParam = url.searchParams.get("status");
  const where =
    statusParam && isStatus(statusParam) ? { status: statusParam } : undefined;

  const rows = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Заголовок CSV
  const header = [
    "id",
    "createdAt",
    "name",
    "contact",
    "checkIn",
    "checkOut",
    "guests",
    "status",
    "source",
    "comment",
  ];

  const lines: string[] = [];
  // Подсказываем Excel, что разделитель — точка с запятой
  lines.push("sep=;");
  lines.push(header.join(";"));

  for (const r of rows) {
    lines.push(
      [
        esc(r.id),
        fmtDT(r.createdAt),
        esc(r.name ?? ""),
        esc(r.contact ?? ""),
        fmtDT(r.checkIn),
        fmtDT(r.checkOut),
        esc(r.guests ?? ""),
        esc(r.status),
        esc(r.source ?? "web"),
        esc(r.comment ?? ""),
      ].join(";")
    );
  }

  // Добавим UTF-8 BOM, чтобы Excel корректно распознал кодировку
  const BOM = "\uFEFF";
  const csv = BOM + lines.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings.csv"`,
    },
  });
}
