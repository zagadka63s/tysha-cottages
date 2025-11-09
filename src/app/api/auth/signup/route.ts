// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  splitIdentifier,
  normalizeAnyContact,
  normalizeEmail,
  normalizePhone,
  normalizeTelegram,
} from "@/lib/normalize";

type Body =
  | {
      name?: string | null;
      // поддерживаем разные имена поля для совместимости форм
      identifier?: string | null;
      contact?: string | null;
      email?: string | null;
      password?: string | null;
    }
  | undefined;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const name = (body?.name ?? "").trim() || null;
    const password = (body?.password ?? "").toString();

    // Берём любой из вариантов поля контакта
    const rawInput =
      body?.identifier?.toString().trim() ||
      body?.contact?.toString().trim() ||
      body?.email?.toString().trim() ||
      "";

    if (!rawInput) {
      return NextResponse.json(
        { ok: false, error: "Вкажіть контакт (email/телефон/Telegram)." },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Пароль має містити щонайменше 6 символів." },
        { status: 400 }
      );
    }

    // Разбираем контакт на типы (все значения уже нормализованы)
    const { email, phone, telegram } = splitIdentifier(rawInput);
    if (!email && !phone && !telegram) {
      return NextResponse.json(
        { ok: false, error: "Невірний формат контакту." },
        { status: 400 }
      );
    }

    // Проверка уникальности по любому из идентификаторов
    const exist = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phoneNormalized: phone } : undefined,
          telegram ? { telegramHandleNormalized: telegram } : undefined,
        ].filter(Boolean) as Array<{ email?: string } | { phoneNormalized?: string } | { telegramHandleNormalized?: string }>,
      },
      select: { id: true },
    });

    if (exist) {
      return NextResponse.json(
        { ok: false, error: "Користувач з таким контактом уже існує." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        passwordHash,
        phoneNormalized: phone || null,
        telegramHandleNormalized: telegram || null,
        role: "USER",
      },
      select: { id: true, email: true },
    });

    // Список ВСЕХ возможных нормализованных ключей для автопривязки
    const keys = Array.from(
      new Set(
        [
          normalizeAnyContact(rawInput),
          normalizeEmail(rawInput),
          normalizePhone(rawInput),
          normalizeTelegram(rawInput),
          email,
          phone,
          telegram,
        ].filter(Boolean) as string[]
      )
    );

    if (keys.length > 0) {
      await prisma.booking.updateMany({
        where: {
          userId: null,
          contactNormalized: { in: keys },
        },
        data: { userId: user.id },
      });
    }

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/auth/signup] error:", e);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
