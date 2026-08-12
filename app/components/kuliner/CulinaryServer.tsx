import React from "react";
import CulinaryClientWrapper from "./CulinaryClientWrapper";

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

// Helper untuk mengonversi link Google Drive agar langsung tampil gambarnya
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

// Fungsi fetch menggunakan arsitektur ISR (revalidate 60 detik)
async function getCulinaries(): Promise<KulinerItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";
    const targetUrl = `${baseUrl}?sheet=kuliner`;

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
      return formatted.reverse(); // Dibalik agar data terbaru di Google Sheets tampil di atas
    }
    return [];
  } catch (err) {
    console.error("Gagal memuat data kuliner:", err);
    return [];
  }
}

export default async function CulinarySection() {
  const culinaries = await getCulinaries();

  return (
    <section
      id="kuliner"
      style={{ fontFamily: "Georgia, serif" }}
      className="py-28 relative overflow-hidden text-center bg-gradient-to-b from-[#1a0d14] via-[#150b12] to-[#0a0508]"
    >
      {/* Efek Cahaya Ambient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Memory Lane
          </span>

          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Tempat Favorit & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">
              Petualangan Kuliner Kita
            </span>
          </h2>

          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Kirim data hasil ISR ke Client Component untuk interaksi tombol & grid */}
        <CulinaryClientWrapper culinaries={culinaries} />
      </div>
    </section>
  );
}
