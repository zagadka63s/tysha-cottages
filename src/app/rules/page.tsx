// app/rules/page.tsx
import { site } from "@/data/site";

export const metadata = {
  title: "Правила і оснащення — Тиша Котеджі",
  description:
    "Умови проживання, FAQ та повний список оснащення котеджу (кухня, вітальня, спальня, ванна та територія).",
};

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge whitespace-nowrap">{children}</span>;
}

function GlassCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        rounded-2xl backdrop-blur-md bg-white/10
        border border-white/15 shadow-[0_8px_30px_rgb(0_0_0/0.12)]
        p-4 md:p-6
      "
    >
      <h2 className="text-xl md:text-2xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-sm md:text-base">{children}</div>
    </section>
  );
}

export default function RulesPage() {
  const { rules, faq, amenities } = site;

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
      {/* затемнення для контрасту */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 container pt-24 md:pt-28 pb-16 md:pb-20 space-y-6 md:space-y-8">
        {/* Заголовок */}
        <header>
          <h1 className="text-3xl md:text-4xl font-semibold">
            Правила і скасування
          </h1>
          <p className="mt-2 opacity-90">
            Ознайомтеся з умовами проживання перед бронюванням.
          </p>
        </header>

        {/* Правила */}
        <GlassCard title="Правила проживання">
          <ul className="list-disc pl-5 space-y-1">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </GlassCard>

        {/* Додаткова інформація */}
        <GlassCard title={amenities.extra.title}>
          <ul className="list-disc pl-5 space-y-1">
            {amenities.extra.text.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </GlassCard>

        {/* Покупки по дорозі */}
        <GlassCard title="Покупки по дорозі">
          <p className="opacity-95">
            Якщо потрібно зробити покупки по дорозі або щось докупити (дрова, продукти, розпалювач):
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>МегаМаркет (Дмитрівка) – траса Київ–Житомир</li>
            <li>Сільпо (Avenir Plaza, Буча) – вул. Б. Хмельницького, 4</li>
            <li>Novus (Буча) — вул. Києво-Мироцька, 104д</li>
          </ul>
          <p className="opacity-95">
            Якщо щось забули: у 500 метрах від комплексу є невеликий магазин — Хутрок.
          </p>
        </GlassCard>

        {/* FAQ */}
        <GlassCard title="FAQ">
          <div className="space-y-4">
            {faq.map((item, i) => (
              <div key={i}>
                <div className="font-semibold">{item.q}</div>
                <div className="opacity-95">{item.a}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Невеликий callout */}
        <div
          className="
            rounded-2xl backdrop-blur-md bg-white/10
            border border-white/15 p-4 md:p-5 text-sm md:text-base
          "
        >
          Просимо дбайливо ставитися до природи й простору.
        </div>
      </div>
    </section>
  );
}
