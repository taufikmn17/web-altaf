import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import Navbar from "../components/Navbar";
import DestinationGridClient from "./DestinationGridClient";
import Footer from "../components/Footer";

interface DestinasiItem {
  id: string;
  src: string;
  title: string;
  tag: string;
  desc: string;
  geo: string;
}

export const metadata: Metadata = {
  title: "Arsip Destinasi & Tempat Wisata Favorit | Altaf Story",
  description:
    "Kumpulan lengkap daftar destinasi wisata, tempat jalan-jalan, dan memori perjalanan favorit bersama.",
};

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

async function getDestinations(): Promise<DestinasiItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";
    const targetUrl = `${baseUrl}?sheet=destinasi`;

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
        tag: item.tag || item.category || item.kategori || "Destinasi",
        desc: item.desc || item.description || item.deskripsi || "",
        geo: item.geo || item.location || item.lokasi || "",
      }));
      return formatted.reverse();
    }
    return [];
  } catch (err) {
    console.error("Gagal memuat data destinasi:", err);
    return [];
  }
}

export default async function SemuaDestinasiPage() {
  const destinations = await getDestinations();

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col justify-between"
      style={{
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

            <h1 className="text-3xl md:text-5xl font-extrabold text-white font-sans tracking-tight">
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
