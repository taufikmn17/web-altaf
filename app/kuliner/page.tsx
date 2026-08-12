import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import Navbar from "../components/Navbar";
import KulinerGridClient from "./KulinerGridClient";
import Footer from "../components/Footer";

interface KulinerItem {
  id: string;
  src: string;
  title: string;
  rating: string;
  tag: string;
  desc: string;
  geo: string;
  status: string;
}

// Metadata SEO agar optimal di mesin pencari
export const metadata: Metadata = {
  title: "Arsip Galeri Kuliner & Petualangan | Altaf Story",
  description:
    "Kumpulan lengkap daftar tempat makan favorit, kuliner hits, dan petualangan kuliner bersama.",
};

// Helper untuk mengonversi link Google Drive agar langsung tampil
const formatDriveImage = (url: string) => {
  if (!url) return "";
  const cleanUrl = url.trim();

  if (cleanUrl.includes("drive.google.com")) {
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
  }
  return cleanUrl;
};

// Fungsi untuk mengambil data menggunakan arsitektur ISR
async function getCulinaries(): Promise<KulinerItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";
    const targetUrl = `${baseUrl}?sheet=kuliner`;

    // Menggunakan ISR dengan revalidate 60 detik agar tidak selalu fetch ulang secara instan
    const res = await fetch(targetUrl, {
      next: { revalidate: 60 },
    });
    const data = await res.json();

    if (Array.isArray(data)) {
      const formatted = data.map((item: any, index: number) => ({
        id: index.toString(),
        src: formatDriveImage(
          item.src || item.image || item.foto || item.gambar || ""
        ),
        title: item.title || item.nama || item.judul || "Tanpa Judul",
        rating: item.rating || item.skor || "5.0",
        tag: item.tag || item.category || item.kategori || "Kuliner",
        desc: item.desc || item.description || item.deskripsi || "",
        geo: item.geo || item.location || item.lokasi || "",
        status: item.status || item.state || "Favorite",
      }));
      return formatted.reverse(); // Dibalik agar yang terbaru di atas
    }
    return [];
  } catch (err) {
    console.error("Gagal memuat data kuliner:", err);
    return [];
  }
}

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
