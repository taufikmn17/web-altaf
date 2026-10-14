import { Metadata } from "next";
import Navbar from "../components/Navbar";
import KulinerGridClient from "./KulinerGridClient";
import Footer from "../components/Footer";
import { getCulinaries } from "@/app/lib/google-sheets";

// Metadata SEO agar optimal di mesin pencari
export const metadata: Metadata = {
  title: "Kuliner Favorit & Tempat Makan - Altaf Story",
  description:
    "Temukan kuliner favorit, tempat makan hits, dan petualangan rasa yang menjadi bagian dari cerita kita di Altaf Story.",
  keywords: [
    "kuliner favorit",
    "tempat makan",
    "petualangan kuliner",
    "Altaf Story",
    "wisata kuliner",
  ],
  alternates: {
    canonical: "/kuliner",
  },
  openGraph: {
    title: "Kuliner Favorit & Tempat Makan - Altaf Story",
    description:
      "Temukan kuliner favorit, tempat makan hits, dan petualangan rasa yang menjadi bagian dari cerita kita di Altaf Story.",
    url: "/kuliner",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Halaman kuliner Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kuliner Favorit & Tempat Makan - Altaf Story",
    description:
      "Temukan kuliner favorit, tempat makan hits, dan petualangan rasa yang menjadi bagian dari cerita kita di Altaf Story.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default async function SemuaGaleriPage() {
  const culinaries = await getCulinaries();

  return (
    <div
      className="min-h-screen relative overflow-hidden text-white flex flex-col justify-between"
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
              Kuliner Kita
            </span>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Semua Petualangan & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">
                Kuliner Favorit Kita
              </span>
            </h1>

            <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Grid Container & Modal Handler (Client Component) */}
          <KulinerGridClient culinaries={culinaries} />
        </div>
      </main>

      {/* Footer Utama Website */}
      <Footer />
    </div>
  );
}
