import { Metadata } from "next";
import dynamic from "next/dynamic";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";

export const metadata: Metadata = {
  title: "Altaf Story - Cerita Cinta, Destinasi & Kuliner",
  description:
    "Altaf Story adalah halaman romantis yang menampilkan kisah cinta, destinasi, kuliner, dan momen spesial bersama dalam satu cerita yang hangat dan personal.",
  keywords: [
    "Altaf Story",
    "cerita cinta",
    "kisah kita",
    "destinasi romantis",
    "kuliner",
    "love story",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Altaf Story - Cerita Cinta, Destinasi & Kuliner",
    description:
      "Nikmati perjalanan cinta, destinasi, dan kuliner dalam satu cerita yang indah di Altaf Story.",
    url: "/",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Halaman utama Altaf Story dengan tema kisah cinta dan momen romantis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Altaf Story - Cerita Cinta, Destinasi & Kuliner",
    description:
      "Nikmati perjalanan cinta, destinasi, dan kuliner dalam satu cerita yang indah di Altaf Story.",
    images: ["/assets/img/hero.jpeg"],
  },
};

// Komponen di bawah lipatan layar di-import secara dinamis (lazy load)
const About = dynamic(() => import("./components/About"));
const FootPrints = dynamic(() => import("./components/FootPrints"));
const CharacterCards = dynamic(() => import("./components/CharacterCards"));
const VirtualWish = dynamic(() => import("./components/VirtualWish"));
const DestinationServer = dynamic(
  () => import("./components/DestinationServer"),
);
const CulinaryServer = dynamic(
  () => import("./components/kuliner/CulinaryServer"),
);
const Footer = dynamic(() => import("./components/Footer"));

export default function Home() {
  return (
    <main className="min-h-screen bg-soft-white text-pink-700 font-sans">
      <Navbar />
      <Hero />
      <About />
      <FootPrints />
      <CharacterCards />
      <VirtualWish />
      <DestinationServer />
      <CulinaryServer />
      <Footer />
    </main>
  );
}
