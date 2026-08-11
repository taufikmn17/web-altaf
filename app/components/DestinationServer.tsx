import React from "react";
import DestinationClientWrapper from "./DestinationClientWrapper";

interface DestinasiItem {
  id: string;
  src: string;
  title: string;
  tag: string;
  desc: string;
  geo: string;
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

// Fungsi untuk mengambil data destinasi menggunakan arsitektur ISR (revalidate 60 detik)
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
      return formatted.reverse(); // Dibalik agar data terbaru tampil di urutan pertama
    }
    return [];
  } catch (err) {
    console.error("Gagal memuat data destinasi:", err);
    return [];
  }
}

export default async function Destination() {
  const destinations = await getDestinations();

  return (
    <section
      id="destinasi"
      className="py-28 relative overflow-hidden text-center"
      style={{
        // Mulai dari warna akhir VirtualWish (#0a0508) agar tersambung sempurna,
        // lalu mengalir ke tone berikutnya (#120a0f dan #1a0d14).
        background: "linear-gradient(to bottom, #0a0508, #120a0f, #1a0d14)",
      }}
    >
      {/* Efek Cahaya Ambient Background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Our Adventure
          </span>

          <h2 className="text-3xl md:text-5xl font-extrabold text-white font-sans tracking-tight">
            Geser Ke Kanan <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">
              Lihat Berbagai Destinasi Kita
            </span>
          </h2>

          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
        </div>
      </div>

      {/* Memanggil Client Component untuk drag scroll */}
      <DestinationClientWrapper destinations={destinations} />
    </section>
  );
}
