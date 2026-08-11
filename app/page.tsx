import { Metadata } from "next";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import FootPrints from "./components/FootPrints";
import CharacterCards from "./components/CharacterCards";
import VirtualWish from "./components/VirtualWish";
import DestinationServer from "./components/DestinationServer";
import CulinaryServer from "./components/kuliner/CulinaryServer";
import Footer from "./components/Footer";

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
