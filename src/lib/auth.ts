// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { splitIdentifier } from "@/lib/normalize";

/** Привязать незакреплённые брони к пользователю по его нормализованным ключам */
async function linkBookingsToUserByIdentifiers(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phoneNormalized: true,
      telegramHandleNormalized: true,
    },
  });
  if (!u) return;

  const keys: string[] = [];
  if (u.email) keys.push(u.email.toLowerCase());
  if (u.phoneNormalized) keys.push(u.phoneNormalized);
  if (u.telegramHandleNormalized) keys.push(u.telegramHandleNormalized);
  if (keys.length === 0) return;

  await prisma.booking.updateMany({
    where: {
      userId: null,
      contactNormalized: { in: keys },
    },
    data: { userId },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // ОБЯЗАТЕЛЬНО jwt для Credentials
  session: { strategy: "jwt" },

  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      name: "Email / Phone / Telegram",
      credentials: {
        identifier: { label: "Email/Phone/Telegram", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.toString().trim() ?? "";
        const password = credentials?.password?.toString() ?? "";
        if (!identifier || !password) return null;

        // Парсим единое поле во все возможные идентификаторы
        const { email, phone, telegram } = splitIdentifier(identifier);

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              email    ? { email } : undefined,
              phone    ? { phoneNormalized: phone } : undefined,
              telegram ? { telegramHandleNormalized: telegram } : undefined,
            ].filter(Boolean) as any,
          },
          select: { id: true, email: true, passwordHash: true, name: true, role: true },
        });

        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // ВАЖНО: вернуть роль — пробросим её в JWT/Session
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  callbacks: {
    // Пишем id и роль в токен при логине
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role ?? "USER";
      }
      return token;
    },
    // Прокидываем id и роль из токена в session.user
    async session({ session, token }) {
      if (session.user) {
        if (token?.uid)  (session.user as any).id = token.uid as string;
        if (token?.role) (session.user as any).role = token.role as string;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      try {
        const userId = (user as any)?.id as string | undefined;
        if (userId) {
          await linkBookingsToUserByIdentifiers(userId);
        }
      } catch (e) {
        console.error("[NextAuth events.signIn] link error:", e);
      }
    },
  },
};
