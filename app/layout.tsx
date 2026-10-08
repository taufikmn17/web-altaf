import type { Metadata } from "next";
import "./globals.css";
import WelcomeCatModal from "./components/welcome/WelcomeModal";

export const metadata: Metadata = {
  title: "Altaf Story - Cerita Kita",
  description:
    "Kumpulan cerita, destinasi, kuliner, dan game seru Altaf Story.",
  keywords: ["altaf story", "altaf", "cerita kita", "destinasi", "kuliner"],
  metadataBase: new URL("https://altafstory.my.id"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className="h-full antialiased scroll-smooth"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        {/* Welcome Modal */}
        <WelcomeCatModal />

        {children}
      </body>
    </html>
  );
}
