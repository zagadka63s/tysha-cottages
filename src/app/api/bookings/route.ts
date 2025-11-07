// src/app/api/bookings/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeAnyContact } from "@/lib/normalize";
import { notifyAdminNewBooking } from "@/lib/telegram";

// Тип тела запроса из формы
type BookingPayload = {
  name: string;
  contact: string;           // телефон / @username / email
  checkIn: string;           // ISO-строка: "2025-10-20"
  checkOut: string;          // ISO-строка
  guests?: number | string;  // устаревшее поле формы (на совместимость)

  // NEW: детализированные поля
  adults?: number | string;
  childrenTotal?: number | string;
  childrenOver6?: number | string;
  hasPet?: boolean | string;

  comment?: string | null;
  source?: string | null;    // "web" по умолчанию
};

function isValidDate(d: Date) {
  return !isNaN(d.getTime());
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Перевірка перетину відрізків дат:
 * існуюча бронь (A..B) перетинається з новою (C..D), якщо:
 * A < D  &&  B > C
 */
async function hasOverlap(checkIn: Date, checkOut: Date) {
  const conflict = await prisma.booking.findFirst({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
    },
    select: { id: true },
  });
  return Boolean(conflict);
}

// Вызов нашего калькулятора (/api/pricing) на сервере
async function getQuoteTotal(
  req: Request,
  params: {
    checkInISO: string;
    checkOutISO: string;
    adults: number;
    childrenOver6: number;
    hasPet: boolean;
  }
): Promise<{ totalUAH: number; baseNightsSumUAH: number } | null> {
  try {
    const { origin } = new URL(req.url);
    const url =
      `${origin}/api/pricing` +
      `?checkIn=${encodeURIComponent(params.checkInISO)}` +
      `&checkOut=${encodeURIComponent(params.checkOutISO)}` +
      `&adults=${params.adults}` +
      `&childrenOver6=${params.childrenOver6}` +
      `&hasPet=${params.hasPet ? "true" : "false"}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.ok) return null;
    return {
      totalUAH: Number(data.totalUAH ?? 0),
      baseNightsSumUAH: Number(data.baseNightsSumUAH ?? 0),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<BookingPayload>;

    const name = (body.name ?? "").trim();
    const contact = (body.contact ?? "").trim();

    const checkIn = new Date(String(body.checkIn));
    const checkOut = new Date(String(body.checkOut));

    // Совместимость: если не пришли новые поля — используем дефолты
    const adults = Number(body.adults ?? body.guests ?? 2);
    const childrenTotal = Number(body.childrenTotal ?? 0);
    const childrenOver6 = Number(body.childrenOver6 ?? 0);
    const hasPet =
      typeof body.hasPet === "string"
        ? body.hasPet === "true"
        : Boolean(body.hasPet);

    const comment = body.comment?.toString().trim() || null;
    const source = body.source?.toString().trim() || "web";

    // Базові валідації
    if (!name || !contact) {
      return NextResponse.json(
        { ok: false, error: "Вкажіть імʼя та контакт." },
        { status: 400 }
      );
    }
    if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
      return NextResponse.json(
        { ok: false, error: "Невірні дати заїзду/виїзду." },
        { status: 400 }
      );
    }

    const inDay = startOfDay(checkIn);
    const outDay = startOfDay(checkOut);

    if (outDay <= inDay) {
      return NextResponse.json(
        { ok: false, error: "Дата виїзду має бути пізніша за дату заїзду (мінімум +1 день)." },
        { status: 400 }
      );
    }

    const today = startOfDay(new Date());
    if (inDay < today) {
      return NextResponse.json(
        { ok: false, error: "Дата заїзду не може бути в минулому." },
        { status: 400 }
      );
    }

    // Валідації складу гостей
    if (!Number.isFinite(adults) || adults <= 0) {
      return NextResponse.json(
        { ok: false, error: "Невірна кількість дорослих." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(childrenTotal) || childrenTotal < 0) {
      return NextResponse.json(
        { ok: false, error: "Невірна кількість дітей." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(childrenOver6) || childrenOver6 < 0 || childrenOver6 > childrenTotal) {
      return NextResponse.json(
        { ok: false, error: "Невірні дані щодо віку дітей." },
        { status: 400 }
      );
    }

    // 1) Серверна перевірка перетинів
    const overlap = await hasOverlap(inDay, outDay);
    if (overlap) {
      return NextResponse.json(
        { ok: false, error: "На обрані дати вже є бронювання. Оберіть, будь ласка, інший період." },
        { status: 409 }
      );
    }

    // 2) Єдиний нормалізований ключ для автоприв'язки
    const contactNormalized = normalizeAnyContact(contact);

    // 3) Якщо користувач авторизований — прив'язуємо бронь
    const session = await getServerSession(authOptions);
    let userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    // 4) Если не авторизован, но это телефон - ищем/создаем User по телефону
    if (!userId && contactNormalized && contactNormalized.startsWith("+")) {
      // Это номер телефона
      let user = await prisma.user.findUnique({
        where: { phoneNormalized: contactNormalized },
      });

      if (!user) {
        // Создаем нового User с этим телефоном
        user = await prisma.user.create({
          data: {
            phoneNormalized: contactNormalized,
            name: name || undefined,
          },
        });
      }

      userId = user.id;
    }

    // 5) Розрахунок котирування (через /api/pricing)
    const quote = await getQuoteTotal(req, {
      checkInISO: inDay.toISOString().slice(0, 10),
      checkOutISO: outDay.toISOString().slice(0, 10),
      adults,
      childrenOver6,
      hasPet,
    });

    // 6) Створення бронювання
    const booking = await prisma.booking.create({
      data: {
        name,
        contact,
        contactNormalized,
        checkIn: inDay,
        checkOut: outDay,

        // историческое поле: на совместимость (оставим равным взрослым по умолчанию)
        guests: adults,

        // NEW: детализируем состав
        adults,
        childrenTotal,
        childrenOver6,
        hasPet,

        comment,
        status: "PENDING",
        source,
        ...(userId ? { userId } : {}),

        // замороженная сумма
        quoteTotalUAH: quote?.totalUAH ?? null,
        currency: "UAH",
      },
      select: { id: true, createdAt: true, status: true, quoteTotalUAH: true },
    });

    // 7) Отправляем уведомление админу в Telegram
    try {
      await notifyAdminNewBooking({
        id: booking.id,
        guestName: name,
        guestContact: contact,
        checkIn: inDay,
        checkOut: outDay,
        adults,
        childrenTotal,
        childrenOver6,
        hasPet,
        totalUAH: booking.quoteTotalUAH || 0,
        comment: comment || undefined,
        source,
      });
    } catch (telegramError) {
      console.error("[Telegram] Failed to notify admin:", telegramError);
      // Не ломаем запрос, если уведомление не отправилось
    }

    // 8) Отправляем уведомление клиенту (если есть telegramChatId)
    if (userId) {
      try {
        const { sendTelegramMessage } = await import("@/lib/telegram");
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { telegramChatId: true },
        });

        if (user?.telegramChatId) {
          // Клиент авторизован в боте - отправляем уведомление
          const clientMessage =
            `✅ <b>Бронь створено!</b>\n\n` +
            `📋 Номер брони: <code>${booking.id}</code>\n` +
            `📅 Заїзд: ${inDay.toLocaleDateString("uk-UA")}\n` +
            `📅 Виїзд: ${outDay.toLocaleDateString("uk-UA")}\n` +
            `💰 Сумма: ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}\n\n` +
            `⏳ Статус: Очікує підтвердження\n\n` +
            `Ми зв'яжемося з вами найближчим часом!`;

          await sendTelegramMessage(user.telegramChatId, clientMessage);
        }
      } catch (telegramError) {
        console.error("[Telegram] Failed to notify client:", telegramError);
      }
    }

    // Формируем ссылку на бота
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "your_bot";
    const telegramBotLink = `https://t.me/${botUsername}`;

    // Проверяем авторизацию в боте
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { telegramChatId: true },
        })
      : null;

    const isTelegramAuthorized = Boolean(user?.telegramChatId);

    return NextResponse.json(
      {
        ok: true,
        booking,
        telegram: {
          authorized: isTelegramAuthorized,
          botLink: telegramBotLink,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/bookings] error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// (опціонально) швидкий перегляд останніх броней — зручно для тестів
export async function GET() {
  try {
    const latest = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        contact: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        adults: true,
        childrenTotal: true,
        childrenOver6: true,
        hasPet: true,
        quoteTotalUAH: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, items: latest });
  } catch (err) {
    console.error("[GET /api/bookings] error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
