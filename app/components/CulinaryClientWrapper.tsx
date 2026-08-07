"use client";

import React, { useState } from "react";
import Link from "next/link";

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

export default function CulinaryClientWrapper({
  culinaries,
}: {
  culinaries: KulinerItem[];
}) {
  const [showAll] = useState(false);

  // State untuk modal foto/detail kuliner
  const [selectedCulinary, setSelectedCulinary] = useState<KulinerItem | null>(
    null
  );

  // Menentukan item yang akan ditampilkan (3 terbaru atau semua jika diperlukan)
  const displayedCulinaries = showAll ? culinaries : culinaries.slice(0, 3);

  return (
    <>
      {culinaries.length === 0 ? (
        <div className="w-full text-center py-12 text-sm text-pink-300/50 italic bg-[#1a1017]/60 backdrop-blur-md max-w-lg mx-auto rounded-3xl border border-pink-500/20 p-8">
          Belum ada data kuliner di sheet &quot;kuliner&quot;.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
            {displayedCulinaries.map((item) => (
              <div
                key={item.id}
                className="bg-[#1a1017]/70 backdrop-blur-xl border border-pink-500/20 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-500/20 hover:border-pink-500/50 transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Bagian Gambar, Tag Badge & Rating (Bisa diklik untuk buka modal) */}
                <div
                  onClick={() => setSelectedCulinary(item)}
                  className="relative h-52 w-full bg-black/40 overflow-hidden cursor-pointer"
                  title="Klik untuk memperbesar foto kuliner"
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover pointer-events-none group-hover:scale-110 transition-transform duration-700 ease-out"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1017] via-transparent to-black/30"></div>

                  {/* Tag Badge */}
                  <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-pink-200 border border-white/10 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                    {item.tag}
                  </span>

                  {/* Rating Badge */}
                  <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-amber-300 border border-white/10 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                    ⭐ {item.rating}
                  </span>

                  {/* Hover Hint Overlay */}
                  <div className="absolute inset-0 bg-pink-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-pink-500/30 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      🔍 Lihat Foto
                    </span>
                  </div>
                </div>

                {/* Bagian Deskripsi */}
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-pink-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-pink-200/70 leading-relaxed line-clamp-3">
                      {item.desc}
                    </p>
                  </div>

                  {/* Bagian Bawah Card: Lokasi & Status */}
                  <div className="mt-6 pt-4 border-t border-pink-500/10 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-pink-300">
                      {item.geo ? `📍 ${item.geo}` : "✨ Kuliner Kita"}
                    </span>
                    <span className="text-pink-400/80 font-medium italic">
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tombol Lihat Selengkapnya menuju halaman /kuliner */}
          {culinaries.length > 3 && (
            <div className="mt-14 text-center">
              <Link
                href="/kuliner"
                className="inline-block px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-pink-200 bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20 hover:border-pink-500/60 transition-all duration-300 backdrop-blur-md shadow-lg active:scale-95"
              >
                Lihat Selengkapnya
              </Link>
            </div>
          )}
        </>
      )}

      {/* Modal Popup Perbesar Foto & Detail Kuliner */}
      {selectedCulinary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex justify-center items-center p-4 pt-20 animate-fadeIn">
          <div className="bg-[#1a0f18] border-2 border-pink-900/60 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative transform transition-all scale-100 flex flex-col max-h-[85vh]">
            {/* Foto Lebih Besar di Modal */}
            <div className="relative h-56 md:h-64 w-full bg-black/60 flex-shrink-0">
              <img
                src={selectedCulinary.src}
                alt={selectedCulinary.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f18] via-transparent to-transparent"></div>

              {/* Tag Badge di Modal */}
              <span className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-pink-200 border border-white/10 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg">
                {selectedCulinary.tag}
              </span>

              {/* Rating Badge di Modal */}
              <span className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-amber-300 border border-white/10 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                ⭐ {selectedCulinary.rating}
              </span>
            </div>

            {/* Konten Detail di Modal */}
            <div className="p-6 md:p-8 text-left overflow-y-auto flex-grow">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-pink-400 mb-1">
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  <span>
                    {selectedCulinary.geo
                      ? selectedCulinary.geo
                      : "Kuliner Kita"}
                  </span>
                </span>
                <span className="text-pink-300/80 italic lowercase font-normal">
                  {selectedCulinary.status}
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3">
                {selectedCulinary.title}
              </h3>

              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {selectedCulinary.desc}
              </p>

              <button
                onClick={() => setSelectedCulinary(null)}
                className="w-full bg-pink-600 hover:bg-rose-600 text-white font-bold py-3 rounded-full transition-all shadow-md text-sm tracking-wider cursor-pointer"
              >
                Tutup Kenangan 🤍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
