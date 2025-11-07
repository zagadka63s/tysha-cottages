import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppProviders from "@/components/AppProviders";

export const metadata = {
  title: "Тиша Котеджі",
  description: "Камерний простір серед сосен — відпочинок поруч із Києвом.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="min-h-screen bg-[color:var(--tg-bg)] text-white">
        <AppProviders>
          <Header />
          <main className="pt-10 md:pt-12">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
