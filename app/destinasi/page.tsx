import { Metadata } from "next";
import Navbar from "../components/Navbar";
import DestinationGridClient from "./DestinationGridClient";
import Footer from "../components/Footer";
import { getDestinations } from "@/app/lib/google-sheets";

export const metadata: Metadata = {
  title: "Destinasi Favorit & Tempat Wisata - Altaf Story",
  description:
    "Jelajahi destinasi favorit, tempat wisata romantis, dan momen perjalanan indah di Altaf Story.",
  keywords: [
    "destinasi wisata",
    "tempat wisata favorit",
    "jalan-jalan romantis",
    "Altaf Story",
    "kisah perjalanan",
  ],
  alternates: {
    canonical: "/destinasi",
  },
  openGraph: {
    title: "Destinasi Favorit & Tempat Wisata - Altaf Story",
    description:
      "Temukan destinasi favorit dan momen perjalanan indah yang menjadi bagian dari kisah kita di Altaf Story.",
    url: "/destinasi",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Halaman destinasi Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Destinasi Favorit & Tempat Wisata - Altaf Story",
    description:
      "Temukan destinasi favorit dan momen perjalanan indah yang menjadi bagian dari kisah kita di Altaf Story.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default async function SemuaDestinasiPage() {
  const destinations = await getDestinations();

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col justify-between"
      style={{
        fontFamily: "Georgia, serif",
        background: "linear-gradient(to bottom, #1a0d14, #150b12, #0a0508)",
      }}
    >
      <Navbar />

      <main className="pt-28 pb-24 relative flex-grow">
        <div className="container mx-auto px-6 relative z-10">
          {/* Header Section dengan Efek Cahaya Ambient di belakangnya */}
          <div className="max-w-2xl mx-auto mb-16 text-center relative">
            {/* Efek Cahaya Ambient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full pointer-events-none -z-10"></div>

            <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
              Destinasi Kita
            </span>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Semua Destinasi & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">
                Tempat Wisata Favorit Kita
              </span>
            </h1>

            <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Grid Container & Modal Handler (Client Component) */}
          <DestinationGridClient destinations={destinations} />
        </div>
      </main>

      {/* Footer Utama Website */}
      <Footer />
    </div>
  );
}
