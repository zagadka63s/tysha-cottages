// src/app/api/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";                 // <- default import
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";

function isAllowed(keyFromReq: string) {
  const adminKey = process.env.ADMIN_KEY ?? "";
  return adminKey && keyFromReq === adminKey;
}

async function updateStatus(id: string, next: BookingStatus) {
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: next },
  });
  // Обновим серверный рендер /cabinet (и для админа, и для юзера)
  revalidatePath("/cabinet");
  return updated;
}

// PATCH /api/bookings/[id]?key=XXX   { status: "CONFIRMED" | "CANCELLED" }
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }        // <-- важно: params как Promise
) {
  try {
    const { id } = await ctx.params;              // <-- и обязательно await
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    if (!isAllowed(key)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const next = (body?.status ?? "") as BookingStatus;
    if (!["CONFIRMED", "CANCELLED"].includes(next)) {
      return NextResponse.json({ error: "unknown status" }, { status: 400 });
    }

    const booking = await updateStatus(id, next);
    return NextResponse.json({ ok: true, booking }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/bookings/[id]]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// POST /api/bookings/[id]   body: { action: "confirm" | "cancel", adminKey: "..." }
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }        // <-- то же самое
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = (body?.action ?? "").toString().toLowerCase();
    const key = (body?.adminKey ?? "").toString();

    if (!isAllowed(key)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const next: BookingStatus | null =
      action === "confirm" ? "CONFIRMED" :
      action === "cancel"  ? "CANCELLED" :
      null;

    if (!next) {
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    const booking = await updateStatus(id, next);
    return NextResponse.json({ ok: true, booking }, { status: 200 });
  } catch (e) {
    console.error("[POST /api/bookings/[id]]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
