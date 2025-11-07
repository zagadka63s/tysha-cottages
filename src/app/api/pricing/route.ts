// src/app/api/pricing/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** Утилиты дат */
function toISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }

/** CSV выходных: "FRI,SAT" -> Set<number> (0=Sun..6=Sat) */
function parseWeekendDays(csv: string | null | undefined): Set<number> {
  const map: Record<string, number> = { SUN:0, MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6 };
  const set = new Set<number>();
  (csv || "FRI,SAT").split(",").map(s => s.trim().toUpperCase()).forEach(k => {
    if (map[k] !== undefined) set.add(map[k]);
  });
  return set;
}

/** Цена на один день */
async function priceForDate(date: Date) {
  const iso = toISODate(date);

  // 1) Override?
  const override = await prisma.priceOverride.findUnique({ where: { date: new Date(iso) } });
  if (override) return { price: override.price, source: "override" as const };

  // 2) Season?
  const season = await prisma.season.findFirst({
    where: { startDate: { lte: new Date(iso) }, endDate: { gte: new Date(iso) } },
  });
  if (!season) return { price: 0, source: "none" as const };

  const weekend = parseWeekendDays(season.weekendDays);
  const wd = new Date(iso).getDay(); // 0..6
  const isWeekend = weekend.has(wd);
  return { price: isWeekend ? season.weekendPrice : season.weekdayPrice, source: "season" as const };
}

/** Доплаты */
type SurchargesConf = {
  extraGuest?: { amount: number; unit: "PER_NIGHT" | "PER_STAY"; includedGuests: number };
  pet?: { amount: number; unit: "PER_NIGHT" | "PER_STAY" };
  childOverAge?: { amount: number; unit: "PER_NIGHT" | "PER_STAY"; ageThreshold: number };
};

async function loadSurcharges(): Promise<SurchargesConf> {
  const rows = await prisma.surcharge.findMany({ where: { active: true } });
  const conf: SurchargesConf = {};
  for (const s of rows) {
    if (s.type === "EXTRA_GUEST") {
      conf.extraGuest = {
        amount: s.amount,
        unit: s.unit as "PER_NIGHT" | "PER_STAY",
        includedGuests: (s.params as any)?.includedGuests ?? 2,
      };
    } else if (s.type === "PET") {
      conf.pet = { amount: s.amount, unit: s.unit as any };
    } else if (s.type === "CHILD_OVER_AGE") {
      conf.childOverAge = {
        amount: s.amount,
        unit: s.unit as any,
        ageThreshold: (s.params as any)?.ageThreshold ?? 6,
      };
    }
  }
  return conf;
}

/** GET /api/pricing
 * Варианты:
 *  - ?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&adults=&childrenOver6=&hasPet=
 *  - ?month=YYYY-MM  -> цены на каждый день месяца (для календаря)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");

    // Цены на месяц для календаря
    if (month) {
      const [y, m] = month.split("-").map(Number);
      if (!y || !m) return NextResponse.json({ ok: false, error: "Invalid month" }, { status: 400 });

      const first = startOfDay(new Date(y, m - 1, 1));
      const last = startOfDay(new Date(y, m, 0));
      const days: { date: string; priceUAH: number }[] = [];

      for (let d = first; d <= last; d = addDays(d, 1)) {
        const { price } = await priceForDate(d);
        days.push({ date: toISODate(d), priceUAH: price });
      }
      return NextResponse.json({ ok: true, month, days });
    }

    // Котировка по диапазону
    const checkInStr = url.searchParams.get("checkIn");
    const checkOutStr = url.searchParams.get("checkOut");
    if (!checkInStr || !checkOutStr) {
      return NextResponse.json({ ok: false, error: "checkIn/checkOut required" }, { status: 400 });
    }
    const checkIn = startOfDay(new Date(checkInStr));
    const checkOut = startOfDay(new Date(checkOutStr));
    if (!(checkIn < checkOut)) {
      return NextResponse.json({ ok: false, error: "Invalid date range" }, { status: 400 });
    }

    const adults = Number(url.searchParams.get("adults") ?? 2);
    const childrenOver6 = Number(url.searchParams.get("childrenOver6") ?? 0);
    const hasPet = (url.searchParams.get("hasPet") ?? "false") === "true";

    // Базовая сумма по ночам
    const perNight: { date: string; priceUAH: number }[] = [];
    for (let d = checkIn; d < checkOut; d = addDays(d, 1)) {
      const { price } = await priceForDate(d);
      perNight.push({ date: toISODate(d), priceUAH: price });
    }
    const baseNightsSumUAH = perNight.reduce((s, x) => s + x.priceUAH, 0);

    // Доплаты
    const cfg = await loadSurcharges();
    const nights = Math.max(0, Math.round((+checkOut - +checkIn) / 86400000));
    const surcharges: { type: string; amountUAH: number; unit: string }[] = [];

    // EXTRA_GUEST (взрослые + дети >6; дети ≤6 — бесплатно)
    if (cfg.extraGuest) {
      const totalGuestsForCalc = adults + childrenOver6;
      const extra = Math.max(0, totalGuestsForCalc - cfg.extraGuest.includedGuests);
      if (extra > 0) {
        const perUnit = cfg.extraGuest.amount * extra;
        const amount = cfg.extraGuest.unit === "PER_NIGHT" ? perUnit * nights : perUnit;
        surcharges.push({ type: "EXTRA_GUEST", amountUAH: amount, unit: cfg.extraGuest.unit });
      }
    }

    // PET
    if (hasPet && cfg.pet) {
      const amount = cfg.pet.unit === "PER_NIGHT" ? cfg.pet.amount * nights : cfg.pet.amount;
      surcharges.push({ type: "PET", amountUAH: amount, unit: cfg.pet.unit });
    }

    // CHILD_OVER_AGE
    if (childrenOver6 > 0 && cfg.childOverAge) {
      const perUnit = cfg.childOverAge.amount * childrenOver6;
      const amount = cfg.childOverAge.unit === "PER_NIGHT" ? perUnit * nights : perUnit;
      surcharges.push({ type: "CHILD_OVER_AGE", amountUAH: amount, unit: cfg.childOverAge.unit });
    }

    const surchargesSumUAH = surcharges.reduce((s, x) => s + x.amountUAH, 0);
    const totalUAH = baseNightsSumUAH + surchargesSumUAH;

    return NextResponse.json({
      ok: true,
      currency: "UAH",
      nights,
      perNight,
      baseNightsSumUAH,
      surcharges,
      surchargesSumUAH,
      totalUAH,
    });
  } catch (err) {
    console.error("[GET /api/pricing] error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
