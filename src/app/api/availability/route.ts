// src/app/api/availability/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET() {
  try {
    const items = await prisma.booking.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] } },
      select: { checkIn: true, checkOut: true },
    });

    const busy = items.map((b) => ({
      // полуоткрытый диапазон [start, end) !
      start: toISO(startOfDay(b.checkIn)),
      end: toISO(startOfDay(b.checkOut)),
    }));

    return NextResponse.json(
      { ok: true, busy },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[GET /api/availability] error:", e);
    return NextResponse.json({ ok: false, busy: [] }, { status: 500 });
  }
}
