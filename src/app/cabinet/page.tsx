// src/app/cabinet/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Booking, BookingStatus } from "@prisma/client";
import SignOutButton from "@/components/SignOutButton";
import { site } from "@/data/site";
import { normalizeAnyContact } from "@/lib/normalize";

// admin widgets
import AdminBookingRow from "@/components/AdminBookingRow";
import AdminCalendar from "@/components/AdminCalendar";

// auth widget (клиентский) — для пользовательского вида
import CabinetAuthWidget from "@/components/CabinetAuthWidget";

export const metadata = { title: "Кабінет — Тиша Котеджі" };
export const dynamic = "force-dynamic";

/* ───────── helpers ───────── */
function fmtDate(d: Date) {
  try {
    return new Date(d).toLocaleDateString("uk-UA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

const statusLabelUA: Record<BookingStatus | "ALL", string> = {
  ALL: "Усі",
  PENDING: "Очікує",
  CONFIRMED: "Підтверджено",
  CANCELLED: "Скасовано",
};

const isBookingStatus = (v: string): v is BookingStatus =>
  v === "PENDING" || v === "CONFIRMED" || v === "CANCELLED";

/** ── SearchParams: в Next 15 Promise<object> */
type SearchParamsResolved = Record<string, string | string[] | undefined>;

type StatusTab = "ALL" | BookingStatus;

/* ───────── фонове фото як на інших сторінках ───────── */
function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <img src="/images/1.jpg" alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}

export default async function CabinetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsResolved>;
}) {
  // --- resolve searchParams (Next 15 Promise API) ---
  const spObj = await searchParams;

  // 1) серверна сесія
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; name?: string | null; email?: string | null; role?: string | null }
    | undefined;
  const userId = user?.id ?? null;
  const role = (user?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN";

  // контакти
  const phone = site?.contacts?.phone ?? "";
  const email = site?.contacts?.email ?? "";
  const tg = site?.contacts?.telegram ?? "";

  // вибраний фільтр
  const raw = spObj.status;
  const rawStatus = Array.isArray(raw) ? raw[0] : raw;
  const sel: StatusTab = (rawStatus?.toUpperCase() as StatusTab) || "ALL";

  // where лише для валідного статусу
  const whereAdmin = sel === "ALL" ? {} : isBookingStatus(sel) ? { status: sel } : {};

  // якщо адмін — тягнемо відфільтровані броні
  let adminBookings: Booking[] = [];
  if (isAdmin) {
    adminBookings = await prisma.booking.findMany({
      where: whereAdmin,
      orderBy: [{ createdAt: "desc" }],
    });
  }

  // якщо звичайний користувач — тягнемо його заявки
  // м'яка прив'язка по contactNormalized (на випадок старих броней без userId)
  let myBookings: Booking[] = [];
  if (userId && !isAdmin) {
    const possibleKeys: string[] = [];
    if (user?.email) possibleKeys.push(normalizeAnyContact(user.email));
    // за потреби можна додати телефон/telegram з профілю:
    // if (user.phone)    possibleKeys.push(normalizeAnyContact(user.phone));
    // if (user.telegram) possibleKeys.push(normalizeAnyContact(user.telegram));

    const whereUserOrContact = {
      OR: [
        { userId },
        ...(possibleKeys.length ? [{ contactNormalized: { in: possibleKeys } }] : []),
      ],
    };

    myBookings = await prisma.booking.findMany({
      where: whereUserOrContact,
      orderBy: { createdAt: "desc" },
    });
  }

  // ADMIN KEY
  const adminKey = process.env.ADMIN_KEY || "";

  /* ───────── ADMIN VIEW ───────── */
  if (isAdmin) {
    return (
      <>
        <PageBackground />
        <div className="relative z-10">
          <main className="container py-14 md:py-16 space-y-6">
            <header className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-semibold">Кабінет адміністратора</h1>
              <p className="text-white/80">
                Розділ доступний користувачам із роллю <b>ADMIN</b>. Тут можна переглядати
                заявки, працювати з календарем та змінювати статуси бронювань.
              </p>
            </header>

            {/* панель користувача */}
            <aside className="glass rounded-2xl p-4 md:max-w-sm ml-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm">
                  <div className="opacity-70">Ви увійшли як</div>
                  <div className="font-medium">{user?.name || "Адміністратор"}</div>
                  {user?.email && <div className="opacity-80">{user.email}</div>}
                  {!adminKey && (
                    <div className="mt-2 text-amber-300/90">
                      Увага: змінна <code>ADMIN_KEY</code> не налаштована — окремі дії можуть бути
                      недоступні.
                    </div>
                  )}
                </div>
                <SignOutButton />
              </div>
            </aside>

            {/* вкладки-статуси */}
            <div className="flex flex-wrap gap-2">
              {(["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const).map((s) => {
                const href = s === "ALL" ? "/cabinet" : `/cabinet?status=${s}`;
                const active = sel === s;
                return (
                  <Link
                    key={s}
                    href={href}
                    className={[
                      "px-3 py-1.5 rounded-lg border transition",
                      active
                        ? "bg-white text-[color:var(--tg-bg)]"
                        : "border-white/25 hover:border-white/40",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    {statusLabelUA[s]}
                  </Link>
                );
              })}
            </div>

            {/* календар */}
            <AdminCalendar
              bookings={adminBookings.map((b) => ({
                id: b.id,
                name: b.name,
                status: b.status,
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                quoteTotalUAH: b.quoteTotalUAH,
                guests: b.guests,
                adults: b.adults,
                childrenTotal: b.childrenTotal,
                hasPet: b.hasPet,
              }))}
            />

            {/* таблиця */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-white/5 text-left">
                  <tr>
                    <th className="py-2 px-3">Дата створення</th>
                    <th className="py-2 px-3">Ім’я</th>
                    <th className="py-2 px-3">Контакт</th>
                    <th className="py-2 px-3">Дати</th>
                    <th className="py-2 px-3 text-center">Гості</th>
                    <th className="py-2 px-3">Статус</th>
                    <th className="py-2 px-3">Джерело</th>
                    <th className="py-2 px-3">Коментар</th>
                    <th className="py-2 px-3 w-[210px]">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {adminBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 px-3 text-white/70">
                        Немає заявок за вибраним фільтром.
                      </td>
                    </tr>
                  ) : (
                    adminBookings.map((b) => (
                      <AdminBookingRow key={b.id} booking={b} adminKey={adminKey} />
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  /* ───────── USER VIEW ───────── */
  return (
    <>
      <PageBackground />
      <div className="relative z-10">
        <main className="container py-14 md:py-16 space-y-6">
          {/* Хедер з інформацією про вхід */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <header className="flex-1">
              <h1 className="text-3xl md:text-4xl font-semibold mb-3">Особистий кабінет</h1>
              <div className="glass inline-flex items-start gap-3 rounded-xl p-4 max-w-2xl">
                <svg className="size-5 mt-0.5 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-white/85 leading-relaxed">
                  Тут ви можете переглядати свої бронювання, відслідковувати статус заявок та швидко зв&apos;язатися з нами через месенджер.
                </div>
              </div>
            </header>

            {/* Компактний статус входу */}
            <aside className="glass rounded-xl p-3 md:min-w-[280px] shrink-0">
              <CabinetAuthWidget />
            </aside>
          </div>

          {/* Основний блок: мої бронювання + швидкий контакт */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-2xl md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <svg className="size-6 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h2 className="text-xl font-semibold">Мої бронювання</h2>
              </div>

              {!userId && (
                <p className="text-white/80">
                  Поки що ви не авторизовані. Ви можете залишити запит на сторінці{" "}
                  <Link href="/book#form" className="underline">
                    Бронювання
                  </Link>
                  , а згодом увійти з тим самим контактом (email/телефон/Telegram), і заявки
                  підтягнуться автоматично.
                </p>
              )}

              {userId && myBookings.length === 0 && (
                <p className="text-white/80">
                  Поки що немає заявок. Залишити запит можна на сторінці{" "}
                  <Link href="/book#form" className="underline">
                    Бронювання
                  </Link>
                  .
                </p>
              )}

              {userId && myBookings.length > 0 && (
                <div className="space-y-3">
                  {myBookings.map((b) => {
                    const checkInDate = new Date(b.checkIn);
                    const checkOutDate = new Date(b.checkOut);
                    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

                    const guestParts: string[] = [];
                    if (b.adults) guestParts.push(`${b.adults} дорослих`);
                    if (b.childrenTotal) guestParts.push(`${b.childrenTotal} дітей`);
                    if (b.hasPet) guestParts.push("з питомцем");
                    const guestInfo = guestParts.length ? guestParts.join(", ") : `${b.guests} гостей`;

                    return (
                      <div
                        key={b.id}
                        className={`rounded-xl border p-4 transition-all ${
                          b.status === "CONFIRMED"
                            ? "border-emerald-400/30 bg-emerald-400/5"
                            : b.status === "CANCELLED"
                            ? "border-rose-400/30 bg-rose-400/5"
                            : "border-yellow-400/30 bg-yellow-400/5"
                        }`}
                      >
                        {/* Шапка: статус + дії */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                              b.status === "CONFIRMED"
                                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                                : b.status === "CANCELLED"
                                ? "border-rose-400/40 bg-rose-400/15 text-rose-200"
                                : "border-yellow-400/40 bg-yellow-400/15 text-yellow-200"
                            }`}
                          >
                            <span className="inline-block size-1.5 rounded-full bg-current" />
                            {statusLabelUA[b.status]}
                          </span>

                          {b.status === "PENDING" && (
                            <Link href={`/pay/${b.id}`} className="btn btn-primary btn-sm">
                              Оплатити
                            </Link>
                          )}
                        </div>

                        {/* Основна інформація */}
                        <div className="space-y-2">
                          {/* Період */}
                          <div className="flex items-baseline gap-2">
                            <div className="text-xs opacity-70 min-w-[70px]">Період:</div>
                            <div className="flex-1">
                              <div className="font-semibold">
                                {fmtDate(checkInDate)} — {fmtDate(checkOutDate)}
                              </div>
                              <div className="text-xs opacity-70 mt-0.5">
                                {nights} {nights === 1 ? "ніч" : nights < 5 ? "ночі" : "ночей"}
                              </div>
                            </div>
                          </div>

                          {/* Гості */}
                          <div className="flex items-baseline gap-2">
                            <div className="text-xs opacity-70 min-w-[70px]">Гості:</div>
                            <div className="text-sm">{guestInfo}</div>
                          </div>

                          {/* Сума */}
                          {b.quoteTotalUAH && (
                            <div className="flex items-baseline gap-2">
                              <div className="text-xs opacity-70 min-w-[70px]">Сума:</div>
                              <div className="font-semibold text-lg">
                                {new Intl.NumberFormat("uk-UA", {
                                  style: "currency",
                                  currency: "UAH",
                                  minimumFractionDigits: 0,
                                }).format(b.quoteTotalUAH)}
                              </div>
                            </div>
                          )}

                          {/* Коментар */}
                          {b.comment && (
                            <div className="flex gap-2 pt-2 mt-2 border-t border-white/10">
                              <div className="text-xs opacity-70 min-w-[70px]">Коментар:</div>
                              <div className="text-sm opacity-90 flex-1">{b.comment}</div>
                            </div>
                          )}
                        </div>

                        {/* Дата створення */}
                        <div className="text-[10px] opacity-60 mt-3 pt-2 border-t border-white/5">
                          Створено: {new Date(b.createdAt).toLocaleString("uk-UA")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <svg className="size-6 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h2 className="text-xl font-semibold">Швидкий контакт</h2>
              </div>
              <p className="text-sm text-white/75 mb-4 leading-relaxed">
                Пишіть у месенджері або телефонуйте — відповідаємо щодня з 09:00 до 21:00
              </p>

              <div className="grid gap-3">
                {tg && (
                  <a href={tg} target="_blank" className="btn btn-primary w-full">
                    Відкрити Telegram
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="btn btn-ghost w-full">
                    Подзвонити: {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="btn btn-ghost w-full">
                    Написати: {email}
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="glass p-6 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-1">
                <svg className="size-6 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Потрібна допомога?</h2>
                <p className="text-sm text-white/80 leading-relaxed">
                  Перегляньте{" "}
                  <Link href="/rules" className="underline hover:text-white transition-colors">
                    FAQ та правила проживання
                  </Link>
                  , або скористайтеся формою бронювання на{" "}
                  <Link href="/book" className="underline hover:text-white transition-colors">
                    головній сторінці
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
