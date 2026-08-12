import { Metadata } from "next";
import dynamic from "next/dynamic";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";

// Komponen di bawah lipatan layar di-import secara dinamis (lazy load)
const About = dynamic(() => import("./components/About"));
const FootPrints = dynamic(() => import("./components/FootPrints"));
const CharacterCards = dynamic(() => import("./components/CharacterCards"));
const VirtualWish = dynamic(() => import("./components/VirtualWish"));
const DestinationServer = dynamic(
  () => import("./components/DestinationServer")
);
const CulinaryServer = dynamic(
  () => import("./components/kuliner/CulinaryServer")
);
const Footer = dynamic(() => import("./components/Footer"));

export const metadata: Metadata = {
  title: "Altaf | Cerita Kita",
  description: "Website perjalanan kisah cinta Taufik dan Alya",
};

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
