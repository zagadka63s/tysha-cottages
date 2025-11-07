// src/app/book/page.tsx
import { site } from "@/data/site";
import BookingForm from "@/components/BookingForm";

export default function BookPage() {
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
      {/* затемнение для читабельности */}
      <div className="absolute inset-0 bg-black/50 md:bg-black/45" />

      <div className="relative z-10 container py-12 md:py-16">
        {/* Одна колонка на всю ширину контейнера */}
        <div className="space-y-6 max-w-[1200px] mx-auto">
          {/* Заголовок + компактные контакты одной строкой */}
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-semibold">Бронювання</h1>
            <p className="text-sm md:text-base opacity-90">
              Залиште запит — ми підтвердимо в месенджері.
            </p>

            {/* тонкая полоса контактов (без большой правой карточки) */}
            <div className="glass p-3 md:p-4 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="opacity-90">
                Пишіть у месенджері або телефонуйте — відповідаємо щодня 09:00–21:00.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a className="hover:underline" href={`tel:${cleanPhone}`}>
                  {site.contacts.phone}
                </a>
                <span className="opacity-50">•</span>
                <a className="hover:underline" href={`mailto:${site.contacts.email}`}>
                  {site.contacts.email}
                </a>
                <span className="opacity-50 hidden md:inline">•</span>
                <a
                  className="btn btn-primary"
                  href={site.contacts.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Telegram
                </a>
              </div>
            </div>
          </div>

          {/* Форма бронирования на всю доступную ширину */}
          <div className="w-full">
            <BookingForm />
          </div>

          {/* Коротка примітка */}
          <div className="glass p-4 text-sm opacity-90 max-w-[900px]">
            Ранній/пізній заїзд: +50% за наявності
          </div>
        </div>
      </div>
    </section>
  );
}
