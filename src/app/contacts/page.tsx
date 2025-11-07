// app/contacts/page.tsx
import { site } from "@/data/site";

export default function ContactsPage() {
  const mapSrc = `https://www.google.com/maps?q=${site.coords.lat},${site.coords.lng}&output=embed`;
  const cleanPhone = site.contacts.phone.replace(/\s/g, "");

  return (
    <section
      className="relative isolate text-white"
      style={{
        backgroundImage: 'url("/images/1.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
      }}
    >
      {/* затемняющий слой */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 container pt-24 md:pt-28 pb-16 md:pb-20 space-y-6">
        {/* Заголовок */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold">Контакти</h1>
          <p className="text-sm md:text-base opacity-90">
            Ми на звʼязку щодня. Пишіть або телефонуйте — допоможемо спланувати приїзд.
          </p>
        </div>

        {/* Контакти + карта */}
        <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start">
          {/* Контакти — glass */}
          <div
            className="
              rounded-2xl backdrop-blur-md bg-white/10
              border border-white/15 p-6 space-y-4 shadow-lg
            "
          >
            <ul className="space-y-3 text-sm md:text-base">
              <li>
                <a
                  className="group inline-flex items-center gap-3 hover:opacity-100 opacity-95 transition"
                  href={`tel:${cleanPhone}`}
                  aria-label="Зателефонувати"
                >
                  <PhoneIcon className="h-5 w-5 opacity-80 group-hover:opacity-100" />
                  {site.contacts.phone}
                </a>
              </li>
              <li>
                <a
                  className="group inline-flex items-center gap-3 hover:opacity-100 opacity-95 transition"
                  href={`mailto:${site.contacts.email}`}
                  aria-label="Написати email"
                >
                  <MailIcon className="h-5 w-5 opacity-80 group-hover:opacity-100" />
                  {site.contacts.email}
                </a>
              </li>
              {site.brand.instagram && (
                <li>
                  <a
                    className="group inline-flex items-center gap-3 hover:opacity-100 opacity-95 transition"
                    href={site.brand.instagram}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label="Відкрити Instagram"
                  >
                    <InstagramIcon className="h-5 w-5 opacity-80 group-hover:opacity-100" />
                    Instagram
                  </a>
                </li>
              )}
              {site.contacts.telegram && (
                <li>
                  <a
                    className="group inline-flex items-center gap-3 hover:opacity-100 opacity-95 transition"
                    href={site.contacts.telegram}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label="Відкрити Telegram"
                  >
                    <TelegramIcon className="h-5 w-5 opacity-80 group-hover:opacity-100" />
                    Telegram
                  </a>
                </li>
              )}
            </ul>

            {/* Кнопки-мессенджеры (быстрый доступ) */}
            <div className="pt-2">
              {site.contacts.telegram && (
                <a
                  className="btn btn-primary text-center w-full"
                  href={site.contacts.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Відкрити Telegram
                </a>
              )}
            </div>
          </div>

          {/* Карта — glass */}
          <div
            className="
              rounded-2xl overflow-hidden backdrop-blur-md bg-white/10
              border border-white/15 shadow-lg
            "
          >
            <iframe
              title="Карта розташування"
              src={mapSrc}
              className="w-full h-72 md:h-[420px]"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>

        {/* Примітка — glass */}
        <div
          className="
            rounded-2xl backdrop-blur-md bg-white/10
            border border-white/15 p-4 text-sm md:text-base shadow-lg opacity-95
          "
        >
          Зустрінемо на території або організуємо трансфер з Києва.
        </div>
      </div>
    </section>
  );
}

/* =========================
   Лёгкие inline-иконки (SVG), без зависимостей
   ========================= */
function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.9 2 2 0 0 1 4.11 2h2a2 2 0 0 1 2 1.72c.13.98.36 1.93.69 2.84a2 2 0 0 1-.45 2.11L7 10a16 16 0 0 0 7 7l1.33-1.35a2 2 0 0 1 2.11-.45c.91.33 1.86.56 2.84.69A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}
function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.944 4.508c.34-.145.704.15.62.505l-3.17 13.572c-.085.363-.49.543-.82.373l-4.39-2.219-2.123 2.08c-.27.265-.72.166-.867-.18l-1.02-2.406-3.606-1.38c-.38-.145-.382-.676-.005-.824l15.281-6.068c.222-.088.457.1.395.335l-3.372 12.92" />
    </svg>
  );
}
