// app/prices/page.tsx
import { site } from "@/data/site";

export const metadata = {
  title: "Ціни — Тиша Котеджі",
  description:
    "Базові тарифи за добу проживання та короткі примітки щодо заїзду й знижок.",
};

function formatUAH(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: site.prices.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PricesPage() {
  const { weekday, weekend } = site.prices;

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
      {/* затемнение для читабельності */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 container pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="space-y-6 md:space-y-8">
          {/* Заголовок */}
          <header>
            <h1 className="text-3xl md:text-4xl font-semibold">Ціни</h1>
            <p className="mt-2 text-sm md:text-base opacity-90">
              Базові тарифи за добу проживання.
            </p>
          </header>

          {/* Таблиця цін — «glass» */}
          <div
            className="
              rounded-2xl backdrop-blur-md bg-white/10
              border border-white/15 shadow-[0_8px_30px_rgb(0_0_0/0.12)]
              p-4 md:p-6
            "
            role="region"
            aria-label="Таблиця базових тарифів"
          >
            {/* фиксируем сетку столбцов, чтобы выравнивание было стабильным */}
            <table className="w-full table-fixed text-sm md:text-base">
              <colgroup>
                <col className="w-1/2" />
                <col className="w-1/2" />
              </colgroup>

              <caption className="sr-only">
                Базові тарифи за добу проживання
              </caption>

              <thead className="text-xs uppercase tracking-wide opacity-80">
                <tr>
                  {/* главный фикс — центрируем заголовок левого столбца */}
                  <th scope="col" className="py-2 px-3 md:px-4 font-normal text-center">
                    Дні
                  </th>
                  <th scope="col" className="py-2 px-3 md:px-4 font-normal text-center">
                    Вартість
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                <tr>
                  {/* и сами значения в первом столбце также центрируем */}
                  <th scope="row" className="py-3 px-3 md:px-4 font-medium text-center">
                    Пн–Чт
                  </th>
                  <td className="py-3 px-3 md:px-4 text-center">
                    {formatUAH(weekday)}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 px-3 md:px-4 font-medium text-center">
                    Пт–Нд
                  </th>
                  <td className="py-3 px-3 md:px-4 text-center">
                    {formatUAH(weekend)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* тонка підрядкова примітка */}
            <div className="mt-3 text-xs opacity-70">* Ціни вказані за добу.</div>
          </div>

          {/* Примітки — «glass» */}
          <div
            className="
              rounded-2xl backdrop-blur-md bg-white/10
              border border-white/15 p-4 md:p-5 text-sm md:text-base space-y-1
            "
            role="note"
            aria-label="Примітки до тарифів"
          >
            <p>Ранній/пізній заїзд: +50% за наявності.</p>
            <p>15% знижка для військових.</p>
          </div>

          {/* CTA */}
          <div className="pt-1">
            <a href="/book#form" className="btn btn-primary">
              Перевірити доступність
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
