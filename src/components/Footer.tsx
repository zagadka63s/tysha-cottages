// src/components/Footer.tsx
"use client";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-transparent">
      <section className="relative container mx-auto max-w-6xl px-4 md:px-6 py-10 md:py-14">
        {/* Лёгкая глубина фона */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/10 to-transparent" />
          <div className="absolute left-10 right-10 bottom-24 h-40 rounded-[100%] blur-3xl bg-white/5" />
        </div>

        {/* Финальный акцент (без галереи) */}
        <div className="text-center">
          <div className="relative mx-auto max-w-2xl rounded-2xl border border-white/15 backdrop-blur-md bg-white/10 p-5 md:p-7 shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl bg-white/5 blur-2xl" />
            <p className="text-lg md:text-xl font-medium leading-relaxed">
              Тиша — не просто місце.
              <br />
              Це стан, у який хочеться повертатись ✨
            </p>
          </div>
        </div>

        {/* Локація / копирайт */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm opacity-80">
          <div>
            <span className="mr-2">Локація:</span>
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:opacity-100"
            >
              Переглянути на Google Maps
            </a>
          </div>
          <div className="opacity-70">© 2025 Тиша Котеджі</div>
        </div>
      </section>
    </footer>
  );
}
