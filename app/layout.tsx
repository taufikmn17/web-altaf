import type { Metadata } from "next";
import "./globals.css";
import WelcomeCatModal from "./components/welcome/WelcomeModal";

export const metadata: Metadata = {
  title: {
    default: "Altaf Story - Cerita Kita",
    template: "%s",
  },
  description:
    "Kumpulan cerita, destinasi, kuliner, dan game seru Altaf Story. Website bucin tempat menyimpan kenangan indah.",
  keywords: ["altaf story", "altaf", "cerita kita", "destinasi", "kuliner"],
  metadataBase: new URL("https://www.altafstory.my.id"),
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
