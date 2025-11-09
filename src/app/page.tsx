// app/page.tsx
import FabCabinet from "@/components/FabCabinet";
import { site } from "@/data/site";

export default function Home() {
  const coords = site?.coords ?? { lat: 50.0, lng: 30.0 };

  return (
    <main className="relative text-white">
      {/* HERO */}
      <section
        className="relative isolate"
        style={{
          backgroundImage: 'url("/images/1.jpg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 container pt-24 pb-24 md:pt-28 md:pb-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Тиша — для тих, хто шукає спокій.
            </h1>

            <p className="mt-4 opacity-95">
              34 м² камерного простору серед сосен — відпочинок поруч із Києвом.
            </p>

            <div className="mt-8 flex gap-3">
              <a href="/book#form" className="btn btn-primary">
                Забронювати
              </a>
              <a href="/rules" className="btn btn-ghost">
                Правила
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ПЛАШКА БРОНЮВАННЯ (оновлений мінімалістичний UI) */}
      <section className="relative -mt-8 md:-mt-10">
        <div className="container pb-8 md:pb-10 relative z-10">
          <form
            action="/book#form"
            method="GET"
            className="
              rounded-2xl shadow-2xl border border-black/5
              bg-[color:var(--tg-sand)]/92 text-[#173A2A]
              p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_1fr_auto] gap-3
            "
          >
            {/* Дата з */}
            <label className="relative">
              <span className="sr-only">Дата заїзду</span>
              <input
                type="date"
                name="checkIn"
                aria-label="Дата заїзду"
                className="
                  w-full rounded-full bg-white/70 backdrop-blur
                  px-4 py-3 pl-11 outline-none
                  ring-1 ring-black/10 focus:ring-2 focus:ring-[#0b3b22]
                  placeholder:text-[#173A2A]/60
                "
                placeholder="ДД.ММ.РРРР"
              />
              <CalIcon />
            </label>

            {/* Дата по */}
            <label className="relative">
              <span className="sr-only">Дата виїзду</span>
              <input
                type="date"
                name="checkOut"
                aria-label="Дата виїзду"
                className="
                  w-full rounded-full bg-white/70 backdrop-blur
                  px-4 py-3 pl-11 outline-none
                  ring-1 ring-black/10 focus:ring-2 focus:ring-[#0b3b22]
                  placeholder:text-[#173A2A]/60
                "
                placeholder="ДД.ММ.РРРР"
              />
              <CalIcon />
            </label>

            {/* Гості (простий селект — стабільно працює без JS) */}
            <label className="relative">
              <span className="sr-only">Кількість гостей</span>
              <select
                name="guests"
                aria-label="Кількість гостей"
                defaultValue="2"
                className="
                  w-full rounded-full bg-white/70 backdrop-blur
                  px-4 py-3 pl-11 pr-10 outline-none appearance-none
                  ring-1 ring-black/10 focus:ring-2 focus:ring-[#0b3b22]
                "
              >
                <option value="1">1 гість</option>
                <option value="2">2 гості</option>
              </select>
              <UserIcon />
              <ChevronIcon />
            </label>

            {/* Промокод */}
            <label className="relative">
              <span className="sr-only">Промокод</span>
              <input
                type="text"
                name="promo"
                inputMode="text"
                aria-label="Промокод"
                placeholder="Промокод"
                className="
                  w-full rounded-full bg-white/70 backdrop-blur
                  px-4 py-3 pl-11 outline-none
                  ring-1 ring-black/10 focus:ring-2 focus:ring-[#0b3b22]
                  placeholder:text-[#173A2A]/60
                "
              />
              <TagIcon />
            </label>

            {/* Кнопка переходу на сторінку /book (передамо query як GET) */}
            <button
              type="submit"
              className="
                w-full rounded-full bg-[#0b3b22] text-white px-6 py-3 font-semibold
                shadow-md hover:shadow-lg hover:opacity-95 transition
              "
            >
              Бронювати
            </button>
          </form>

          {/* Підказка-рядок (лайтово, без логіки): */}
          <div className="px-2 md:px-1 mt-2 text-xs text-[#173A2A]/75">
            * Дати та деталі можна змінити на сторінці бронювання.
          </div>
        </div>
      </section>

      {/* Навколо будинку */}
      <section className="container section">
        <h2 className="mb-8 text-center">Навколо будинку</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[3, 4, 98, 99].map((n) => (
            <div
              key={n}
              className="overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <img
                src={`/images/${n}.jpg`}
                alt=""
                className="w-full h-56 md:h-64 lg:h-72 object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Всередині */}
      <section className="section pt-4 relative overflow-visible">
        {/* Водяной знак sun white.png справа от экрана (sticky) */}
        <div className="absolute top-0 right-0 translate-x-1/3 pointer-events-none z-0">
          <div className="sticky top-10">
            <img
              src="/images/sun white.png"
              alt=""
              className="w-[600px] h-[600px] md:w-[750px] md:h-[750px] lg:w-[900px] lg:h-[900px] opacity-[0.75] -rotate-90"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="container relative">
          <h2 className="mb-8 text-center relative z-10">Всередині</h2>

        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {/* Спальня */}
          <div className="group overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl">
            <div className="relative h-64 md:h-72 overflow-hidden">
              <img
                src="/images/9.jpg"
                alt="Спальня"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="glass p-5 text-white/90">
              <h3 className="text-lg font-semibold mb-3">Спальня</h3>
              <ul className="text-xs space-y-1 opacity-90">
                {site.amenities.bedroom.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Кухня-вітальня */}
          <div className="group overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl">
            <div className="relative h-64 md:h-72 overflow-hidden">
              <img
                src="/images/132.jpg"
                alt="Кухня-вітальня"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="glass p-5 text-white/90">
              <h3 className="text-lg font-semibold mb-3">Кухня-вітальня</h3>
              <div className="text-xs space-y-2 opacity-90">
                <div>
                  <strong className="text-white/95">Кухня:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {site.amenities.kitchen.slice(0, 7).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-white/95">Вітальня:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {site.amenities.living.slice(0, 5).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Ванна кімната */}
          <div className="group overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl">
            <div className="relative h-64 md:h-72 overflow-hidden">
              <img
                src="/images/333.jpg"
                alt="Ванна кімната"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="glass p-5 text-white/90">
              <h3 className="text-lg font-semibold mb-3">Ванна кімната</h3>
              <ul className="text-xs space-y-1 opacity-90">
                {site.amenities.bathroom.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

          {/* Тераса та територія */}
          <div className="mt-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/15 shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-3 text-white">Тераса та територія</h3>
            <div className="flex flex-wrap gap-2">
              {site.amenities.outdoor.map((item, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/90">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Карта */}
      <section className="container section pt-4 pb-24">
        <h2 className="mb-6">Карта</h2>
        <div className="house-frame overflow-hidden rounded-2xl">
          <iframe
            title="Мапа"
            src={`https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=14&output=embed`}
            className="w-full h-[360px] md:h-[460px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <FabCabinet />
    </main>
  );
}

/* ——— маленькі svg-іконки під поля — без JS, чистий серверний компонент ——— */
function CalIcon() {
  return (
    <svg
      aria-hidden
      className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect x="3" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      aria-hidden
      className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg
      aria-hidden
      className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M21 12l-9 9-9-9 6-6h6l6 6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1.25" fill="currentColor" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-60"
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
