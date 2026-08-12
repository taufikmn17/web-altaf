"use client";

import React, { useState } from "react";

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

export default function KulinerGridClient({
  culinaries,
}: {
  culinaries: KulinerItem[];
}) {
  const [selectedKuliner, setSelectedKuliner] = useState<KulinerItem | null>(
    null
  );

  if (culinaries.length === 0) {
    return (
      <div
        style={{ fontFamily: "Georgia, serif" }}
        className="w-full text-center py-16 text-sm text-pink-300/50 italic bg-[#1a1017]/60 backdrop-blur-md max-w-lg mx-auto rounded-3xl border border-pink-500/20 p-8"
      >
        Belum ada data galeri kuliner yang tersimpan atau gagal memuat data.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Georgia, serif" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
        {culinaries.map((item) => (
          <div
            key={item.id}
            className="bg-[#1a1017]/70 backdrop-blur-xl border border-pink-500/20 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-500/20 hover:border-pink-500/50 transition-all duration-300 flex flex-col justify-between group"
          >
            {/* Bagian Gambar */}
            <div
              onClick={() => setSelectedKuliner(item)}
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1017] via-transparent to-black/30"></div>

              {/* Rating di pojok kanan atas */}
              <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-amber-300 border border-white/10 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                ⭐ {item.rating}
              </span>

              {/* Hover Hint Overlay dengan Ikon Search SVG */}
              <div className="absolute inset-0 bg-pink-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-2 rounded-full border border-pink-500/30 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-pink-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>Lihat</span>
                </span>
              </div>
            </div>

            {/* Bagian Deskripsi (Card Utama) */}
            <div className="p-6 flex flex-col justify-between flex-grow">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <span className="text-pink-400/90 font-medium bg-black/40 border border-pink-500/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider text-[10px] shrink-0">
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-pink-200/70 leading-relaxed line-clamp-3">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-pink-500/10 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-pink-300 normal-case">
                  <svg
                    className="w-4 h-4 text-pink-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{item.geo ? item.geo : "Kuliner Kita"}</span>
                </span>

                <span className="text-[11px] bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                  {item.tag}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Popup Perbesar Foto & Detail Kuliner */}
      {selectedKuliner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex justify-center items-center p-4 pt-20 animate-fadeIn">
          <div className="bg-[#1a0f18] border-2 border-pink-900/60 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative transform transition-all scale-100 flex flex-col max-h-[85vh]">
            {/* Foto Lebih Besar di Modal */}
            <div className="relative h-56 md:h-64 w-full bg-black/60 flex-shrink-0">
              <img
                src={selectedKuliner.src}
                alt={selectedKuliner.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f18] via-transparent to-transparent"></div>

              {/* Rating Badge di Modal */}
              <span className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-amber-300 border border-white/10 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                ⭐ {selectedKuliner.rating}
              </span>
            </div>

            {/* Konten Detail di Modal */}
            <div className="p-6 md:p-8 text-left overflow-y-auto flex-grow">
              <div className="text-xs font-semibold text-pink-400 mb-1 normal-case">
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-pink-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>
                    {selectedKuliner.geo ? selectedKuliner.geo : "Kuliner Kita"}
                  </span>
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3">
                {selectedKuliner.title}
              </h3>

              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                {selectedKuliner.desc}
              </p>

              {/* Tag & Status di bawah deskripsi khusus dalam modal */}
              <div className="flex items-center gap-2 flex-wrap mb-6">
                <span className="text-xs bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold px-3 py-1 rounded-full">
                  {selectedKuliner.tag}
                </span>
                <span className="text-pink-400/90 font-medium bg-black/40 border border-pink-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider text-[10px]">
                  {selectedKuliner.status}
                </span>
              </div>

              <button
                onClick={() => setSelectedKuliner(null)}
                className="w-full bg-pink-600 hover:bg-rose-600 text-white font-bold py-3 rounded-full transition-all shadow-md text-sm tracking-wider cursor-pointer"
              >
                Tutup Kenangan 🤍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
