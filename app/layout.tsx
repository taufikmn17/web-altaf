import type { Metadata } from "next";
import "./globals.css";
import WelcomeCatModal from "./components/welcome/WelcomeModal";

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
