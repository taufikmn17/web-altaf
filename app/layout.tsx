import type { Metadata } from "next";
// HAPUS: import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display, Lora } from "next/font/google"; // TAMBAH: Import Google Fonts baru
import "./globals.css";
import WelcomeCatModal from "./components/welcome/WelcomeModal";

// Konfigurasi Playfair Display untuk Judul (Heading)
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading", // Variabel CSS untuk font heading
  display: "swap",
});

// Konfigurasi Lora untuk Teks Biasa (Body)
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-body", // Variabel CSS untuk font body
  display: "swap",
});

export const metadata: Metadata = {
  title: "Altaf - Cerita Kita",
  description: "Website Bucin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      // Terapkan variabel font ke elemen html
      className={`${playfairDisplay.variable} ${lora.variable} h-full antialiased scroll-smooth`}
    >
      {/* Terapkan font body secara default ke body, dan set font heading melalui kelas */}
      <body className="min-h-full flex flex-col font-body ">
        {/* Welcome Modal */}
        <WelcomeCatModal />

        {children}
      </body>
    </html>
  );
}
