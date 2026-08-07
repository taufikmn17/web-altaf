import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Metadata khusus untuk SEO halaman Kisah Kita
export const metadata: Metadata = {
  title: "Kisah Cinta Taufik & Alya - Perjalanan Lengkap Cerita Kita",
  description:
    "Baca perjalanan lengkap kisah cinta Taufik dan Alya dari awal pertemuan hingga melangkah bersama menuju masa depan.",
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
    title: "Takdir yang Tak Terduga",
    description:
      "Semua berawal dari sebuah ketidaksengajaan yang menuntun langkah Taufik dan Alya ke satu arah yang sama. Di antara miliaran pasang mata dan riuhnya dunia, takdir mempertemukan lewat sapaan sederhana.",
    image: "/assets/img/about1.jpeg",
    icon: "✨",
  },
  {
    id: "2",
    date: "Pendekatan & Obrolan",
    title: "Menemukan Kenyamanan",
    description:
      "Dari obrolan-obrolan kecil tentang hal sehari-hari hingga percakapan mendalam. Tawa kecil yang tercipta perlahan-lahan mulai terasa hangat dan memberikan warna baru di hari-hari mereka.",
    image: "/assets/img/about2.jpeg",
    icon: "💬",
  },
  {
    id: "3",
    date: "Momen Spesial",
    title: "Saling Memahami & Mendukung",
    description:
      "Waktu terus berjalan, dan hubungan ini diuji oleh berbagai cerita. Belajar untuk saling mendengarkan, saling menguatkan dalam setiap keadaan, dan menyadari bahwa kita adalah rumah bagi satu sama lain.",
    image: "/assets/img/about3.jpeg",
    icon: "❤️",
  },
  {
    id: "4",
    date: "Masa Depan",
    title: "Melangkah Bersama Menuju Impian",
    description:
      "Kini, merajut masa depan bersama, menyatukan doa, harapan, dan tekad untuk saling menjaga dalam ikatan yang lebih indah, selamanya.",
    image: "/assets/img/about4.jpeg",
    icon: "💍",
  },
];

export default async function KisahKitaPage() {
  return (
    <div
      className="min-h-screen relative overflow-hidden text-white font-sans flex flex-col justify-between"
      style={{
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
          <div className="space-y-16 relative">
            {timelineData.map((item, index) => {
              const isEven = index % 2 === 0; // Menentukan posisi ganti posisi foto & teks

              return (
                <div
                  key={item.id}
                  className={`flex flex-col md:flex-row items-center gap-8 md:gap-12 ${
                    isEven ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Bagian Foto */}
                  <div className="w-full md:w-1/2">
                    <div className="relative h-64 md:h-80 w-full rounded-3xl overflow-hidden border border-pink-500/30 shadow-2xl group">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1017] via-transparent to-transparent opacity-60"></div>

                      {/* Badge Icon di atas foto */}
                      <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                        <span>{item.icon}</span> {item.date}
                      </span>
                    </div>
                  </div>

                  {/* Bagian Deskripsi Teks */}
                  <div className="w-full md:w-1/2 text-left">
                    <div className="bg-[#1a1017]/70 backdrop-blur-xl p-8 rounded-3xl border border-pink-500/20 shadow-xl transition-all duration-300 hover:border-pink-500/50 hover:shadow-2xl">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full mb-3 border border-pink-500/20">
                        {item.date}
                      </span>
                      <h3 className="text-2xl font-bold text-white mb-3">
                        {item.title}
                      </h3>
                      <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
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
