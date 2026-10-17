import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Metadata khusus untuk SEO halaman Kisah Kita
export const metadata: Metadata = {
  title: "Kisah Cinta & Perjalanan Kita - Altaf Story",
  description:
    "Baca perjalanan lengkap kisah cinta, momen indah, dan jejak langkah bersama di halaman kisah kita Altaf Story.",
  keywords: [
    "kisah cinta",
    "kisah kita",
    "cerita cinta",
    "perjalanan cinta",
    "Altaf Story",
  ],
  alternates: {
    canonical: "/kisah-kita",
  },
  openGraph: {
    title: "Kisah Cinta & Perjalanan Kita - Altaf Story",
    description:
      "Baca perjalanan lengkap kisah cinta, momen indah, dan jejak langkah bersama di halaman kisah kita Altaf Story.",
    url: "/kisah-kita",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Halaman kisah cinta Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kisah Cinta & Perjalanan Kita - Altaf Story",
    description:
      "Baca perjalanan lengkap kisah cinta, momen indah, dan jejak langkah bersama di halaman kisah kita Altaf Story.",
    images: ["/assets/img/hero.jpeg"],
  },
};

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
  icon: string;
}

const timelineData: TimelineItem[] = [
  {
    id: "1",
    date: "Awal Pertemuan",
    title: "Pertemuan Pertama",
    description:
      "Sebuah momen tak terduga yang mempertemukan kita untuk pertama kalinya.",
    image: "/assets/img/about1.jpeg",
    icon: "✨",
  },
  {
    id: "2",
    date: "Mengenal Lebih Dekat",
    title: "Proses Mengenal",
    description:
      "Lewat obrolan dan cerita harian, kita mulai mengenal sifat serta pribadi satu sama lain.",
    image: "/assets/img/about2.jpeg",
    icon: "💬",
  },
  {
    id: "3",
    date: "Tumbuh Bersama",
    title: "Komitmen & Dukungan",
    description:
      "Belajar saling menerima kelebihan dan kekurangan, serta menjadi ruang aman di setiap situasi.",
    image: "/assets/img/about3.jpeg",
    icon: "❤️",
  },
  {
    id: "4",
    date: "Langkah Selanjutnya",
    title: "Menuju Masa Depan",
    description:
      "Menyatukan impian dan melangkah ke jenjang yang lebih serius secara bersama-sama.",
    image: "/assets/img/about4.jpeg",
    icon: "💍",
  },
];

export default async function KisahKitaPage() {
  return (
    <div
      className="min-h-screen relative overflow-hidden text-white flex flex-col justify-between"
      style={{
        fontFamily: "Georgia, serif",
        background: "linear-gradient(to bottom, #1a0d14, #150b12, #0a0508)",
      }}
    >
      {/* Navbar */}
      <Navbar />

      <main className="py-28 relative flex-grow">
        <div className="container mx-auto max-w-5xl px-6 relative z-10">
          {/* Header Halaman dengan Efek Cahaya Ambient di belakangnya */}
          <div className="text-center mb-20 relative">
            {/* Efek Cahaya Ambient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full pointer-events-none -z-10"></div>

            <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
              Kisah Kita
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Perjalanan Lengkap <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">
                Kisah Cinta Alya & Taufik
              </span>
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto rounded-full"></div>
            <p className="text-sm md:text-base text-zinc-300 max-w-2xl mx-auto mt-6 leading-relaxed">
              Setiap detik, setiap tawa, dan setiap cerita kecil telah membawa
              Altaf ke titik ini. Inilah jejak langkah perjalanan cinta yang
              kita ukir bersama.
            </p>
          </div>

          {/* Timeline Section dengan Foto (Layout Zig-Zag interaktif) */}
          <div className="relative space-y-12 md:space-y-16">
            <div
              aria-hidden="true"
              className="absolute bottom-8 left-5 top-8 w-px bg-gradient-to-b from-transparent via-pink-400/50 to-transparent md:left-1/2"
            />

            {timelineData.map((item, index) => {
              const isEven = index % 2 === 0; // Menentukan posisi ganti posisi foto & teks

              return (
                <article
                  key={item.id}
                  className={`relative grid items-center gap-5 pl-12 md:grid-cols-2 md:gap-12 md:pl-0 ${
                    isEven ? "" : "md:[&>div:first-of-type]:order-2"
                  }`}
                >
                  <span className="absolute left-0 top-7 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-pink-400/40 bg-[#1a1017] text-xs font-bold text-pink-300 shadow-lg shadow-pink-900/20 md:left-1/2 md:-translate-x-1/2">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Bagian Foto */}
                  <div className="w-full">
                    <div className="group relative h-64 w-full overflow-hidden rounded-3xl border border-pink-500/30 shadow-2xl md:h-80">
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1017] via-transparent to-transparent opacity-70"></div>

                      {/* Badge Icon di atas foto */}
                      <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md">
                        <span aria-hidden="true">{item.icon}</span>
                        {item.date}
                      </span>
                    </div>
                  </div>

                  {/* Bagian Deskripsi Teks */}
                  <div className="w-full text-left">
                    <div className="rounded-3xl border border-pink-500/20 bg-[#1a1017]/70 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-pink-500/50 hover:shadow-2xl md:p-8">
                      <span className="mb-3 inline-block rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-400">
                        {item.date}
                      </span>
                      <h2 className="mb-3 text-xl font-bold text-white md:text-2xl">
                        {item.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
                        {item.description}
                      </p>

                      <details className="group/details mt-5 border-t border-pink-500/20 pt-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-pink-300 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-400">
                          <span>♡ Buka pesan kecil</span>
                          <span
                            aria-hidden="true"
                            className="text-lg transition-transform duration-300 group-open/details:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <p className="mt-3 rounded-2xl bg-pink-500/5 p-4 text-sm leading-relaxed text-zinc-300">
                          Setiap babak baru membawa cerita dan pelajaran
                          tersendiri. Semoga niat baik ini senantiasa bertumbuh
                          dan membawa keberkahan di setiap langkah selanjutnya.
                        </p>
                      </details>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Footer Penutup Halaman */}
          <div className="mt-24 text-center bg-[#1a1017]/70 backdrop-blur-xl p-8 rounded-3xl border border-pink-500/20 shadow-xl max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
              Terima Kasih Telah Menjadi Bagian dari Cerita Ini
            </h3>
            <p className="text-sm text-zinc-300 mb-6">
              Doa dan dukungan kalian sangat berarti bagi kelanjutan langkah
              altaf.
            </p>
            <Link
              href="/#virtualWish"
              className="inline-block px-6 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg hover:opacity-95 transition-all"
            >
              Tulis Harapan untuk altaf ✨
            </Link>
          </div>
        </div>
      </main>

      {/* Footer Utama Website */}
      <Footer />
    </div>
  );
}
