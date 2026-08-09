import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WelcomeCatModal from "./components/welcome/WelcomeModal"; // Sesuaikan path jika berbeda

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Mengoptimalkan performa teks agar tidak render blocking
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        {/* Welcome Modal */}
        <WelcomeCatModal />

        {children}
      </body>
    </html>
  );
}
