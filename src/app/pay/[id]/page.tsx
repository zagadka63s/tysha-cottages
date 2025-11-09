// src/app/pay/[id]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import CopyField from "@/components/CopyField";
import { site } from "@/data/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Оплата бронювання — Тиша Котеджі" };

// Реквізити отримувача (ФОП)
const BANK = {
  iban: "UA603052990000026008020114227",
  recipient: "ФОП Сервелль Ганна Андріївна",
  edrpou: "3358811282",
};

function fmt(d: Date) {
  try {
    return new Date(d).toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function money(n: number | null | undefined) {
  if (!n || n <= 0) return null;
  try {
    return "₴" + n.toLocaleString("uk-UA");
  } catch {
    return "₴" + n;
  }
}

/** Next 15: params Promise */
type ParamsResolved = { id: string };

export default async function PayPage({ params }: { params: Promise<ParamsResolved> }) {
  // ✅ Акуратно «дістаємо» id з params / Promise<params>
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      contact: true,
      checkIn: true,
      checkOut: true,
      adults: true,
      childrenTotal: true,
      childrenOver6: true,
      hasPet: true,
      quoteTotalUAH: true,
      currency: true,
      status: true,
      createdAt: true,
    },
  });

  if (!booking) return notFound();

  const amount = money(booking.quoteTotalUAH);
  const amountPlain =
    booking.quoteTotalUAH && booking.quoteTotalUAH > 0
      ? String(booking.quoteTotalUAH)
      : "";

  const purpose = `Оплата бронювання ${booking.id} (${fmt(booking.checkIn)}–${fmt(
    booking.checkOut
  )})`;

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Tyshacottagesbot";
  const tg = `https://t.me/${botUsername}?start=booking_${booking.id}`;
  const phone = site?.contacts?.phone ?? "";
  const email = site?.contacts?.email ?? "";

  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  const guestParts: string[] = [];
  if (booking.adults) guestParts.push(`${booking.adults} дорослих`);
  if (booking.childrenTotal) guestParts.push(`${booking.childrenTotal} дітей`);
  if (booking.hasPet) guestParts.push("з питомцем");
  const guestInfo = guestParts.length ? guestParts.join(", ") : "—";

  const statusLabel: Record<string, string> = {
    PENDING: "Очікує оплати",
    CONFIRMED: "Підтверджено",
    CANCELLED: "Скасовано",
  };
  const statusColor: Record<string, string> = {
    PENDING: "border-yellow-400/40 bg-yellow-400/15 text-yellow-200",
    CONFIRMED: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
    CANCELLED: "border-rose-400/40 bg-rose-400/15 text-rose-200",
  };

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <img src="/images/1.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      <main className="container py-10 md:py-14 space-y-6 max-w-4xl">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-14 rounded-full bg-white/10 mb-2">
            <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">Оплата бронювання</h1>
          <p className="text-white/80 max-w-xl mx-auto">
            Здійсніть оплату за банківськими реквізитами, і ми підтвердимо ваше замовлення в найближчий час
          </p>
        </header>

        <section className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="size-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-lg font-semibold">Деталі бронювання</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass-inner rounded-xl p-4">
              <div className="text-xs opacity-70 mb-1">Період проживання</div>
              <div className="font-semibold text-lg">
                {fmt(booking.checkIn)} — {fmt(booking.checkOut)}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {nights} {nights === 1 ? "ніч" : nights < 5 ? "ночі" : "ночей"}
              </div>
            </div>

            <div className="glass-inner rounded-xl p-4">
              <div className="text-xs opacity-70 mb-1">Гості</div>
              <div className="font-semibold text-lg">{guestInfo}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="text-xs opacity-70 mb-2">Сума до сплати</div>
              <div className="text-2xl md:text-3xl font-bold">
                {amount ?? "сума буде повідомлена"}
              </div>
              {!!amountPlain && (
                <div className="text-[10px] opacity-60 mt-1">
                  * фіксована котирування на момент заявки
                </div>
              )}
            </div>

            <div className="glass-inner rounded-xl p-4 flex flex-col justify-center">
              <div className="text-xs opacity-70 mb-2">Статус замовлення</div>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full border w-fit ${
                  statusColor[booking.status] || statusColor.PENDING
                }`}
              >
                <span className="inline-block size-1.5 rounded-full bg-current" />
                {statusLabel[booking.status] || booking.status}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="text-xs opacity-60">Номер бронювання: {booking.id}</div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="size-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <h2 className="text-lg font-semibold">Реквізити для оплати</h2>
          </div>

          <div className="space-y-3">
            <CopyField label="Отримувач" value={BANK.recipient} />
            <CopyField label="IBAN" value={BANK.iban} mono />
            <CopyField label="Код одержувача (ЄДРПОУ)" value={BANK.edrpou} mono />
            <CopyField label="Призначення платежу" value={purpose} />
            {amountPlain ? <CopyField label="Сума (грн)" value={amountPlain} mono /> : null}
          </div>

          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 mt-4">
            <div className="flex gap-3">
              <svg className="size-5 shrink-0 mt-0.5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-white/90 space-y-1">
                <p className="font-medium">Важливо:</p>
                <p className="opacity-90">
                  Обов&apos;язково вкажіть <b>номер бронювання</b> у призначенні платежу або надішліть нам квитанцію в месенджері для швидкого підтвердження.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="size-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-lg font-semibold">Надіслати квитанцію</h2>
          </div>

          <p className="text-sm text-white/80">
            Після оплати надішліть нам квитанцію або скріншот для швидкого підтвердження
          </p>

          <div className="grid gap-3">
            {tg && (
              <a className="btn btn-primary w-full" href={tg} target="_blank">
                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Telegram
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {phone && (
              <a className="btn btn-ghost" href={`tel:${phone}`}>
                Подзвонити: {phone}
              </a>
            )}
            {email && (
              <a className="btn btn-ghost" href={`mailto:${email}`}>
                {email}
              </a>
            )}
          </div>
        </section>

        <section className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="size-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h2 className="text-lg font-semibold">Що буде далі?</h2>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 size-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <p className="text-sm text-white/85 pt-0.5">
                Здійсніть оплату за реквізитами у вашому банківському додатку
              </p>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 size-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
                2
              </div>
              <p className="text-sm text-white/85 pt-0.5">
                Надішліть квитанцію в Telegram для швидкого підтвердження
              </p>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 size-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <p className="text-sm text-white/85 pt-0.5">
                Ми перевіримо оплату та змінимо статус на <b className="text-emerald-300">&quot;Підтверджено&quot;</b> у вашому кабінеті
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-center pt-2">
          <a href="/cabinet" className="btn btn-outline">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Повернутися до кабінету
          </a>
        </div>
      </main>
    </div>
  );
}
