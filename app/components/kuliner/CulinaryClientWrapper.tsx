"use client";

import React, { useState } from "react";
import Link from "next/link";
import DepthCarousel from "./DepthCarousel"; // Sesuaikan path jika berbeda

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
  // State untuk modal foto/detail kuliner
  const [selectedCulinary, setSelectedCulinary] = useState<KulinerItem | null>(
    null
  );

  // Batasi hanya 5 item saja yang diambil
  const limitedCulinaries = culinaries.slice(0, 5);

  // Mapping data kuliner agar sesuai dengan format item yang diterima oleh DepthCarousel
  const carouselItems = limitedCulinaries.map((item) => ({
    image: item.src,
    alt: item.title,
  }));

  // State untuk melacak index slide aktif pada DepthCarousel
  const [activeIndex, setActiveIndex] = useState(0);

  // Ambil data kuliner yang sedang aktif berdasarkan index carousel
  const activeCulinary = limitedCulinaries[activeIndex] || limitedCulinaries[0];

  return (
    <>
      {limitedCulinaries.length === 0 ? (
        <div className="w-full text-center py-12 text-sm text-pink-300/50 italic bg-[#1a1017]/60 backdrop-blur-md max-w-lg mx-auto rounded-3xl border border-pink-500/20 p-8">
          Belum ada data kuliner di sheet &quot;kuliner&quot;.
        </div>
      ) : (
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Depth Carousel Container */}
          <div className="w-full h-[480px] relative mb-8">
            <DepthCarousel
              items={carouselItems}
              depth={220}
              spread={90}
              tilt={22}
              tiltDirection="right"
              perspective={1400}
              visibleCards={5}
              falloff={0.2}
              blur={6}
              autoplay={false}
              loop
              cardWidth={280}
              cardHeight={360}
              radius={18}
              tint="#05060a"
              duration={700}
              ease="power3.out"
              showControls
              showIndicators
              onChange={(index) => setActiveIndex(index)}
            />
          </div>

          {/* Informasi Detail Card yang Sedang Aktif di Bawah Carousel */}
          {activeCulinary && (
            <div className="w-full max-w-xl bg-[#1a1017]/80 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-6 shadow-2xl text-left transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="flex items-center gap-1.5 font-semibold text-pink-300 text-xs">
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
                      {activeCulinary.geo ? activeCulinary.geo : "Kuliner Kita"}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="bg-black/60 backdrop-blur-md text-amber-300 border border-white/10 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                      ⭐ {activeCulinary.rating}
                    </span>
                    <span className="text-pink-400/90 font-medium bg-black/40 border border-pink-500/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider text-[10px] shrink-0">
                      {activeCulinary.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  {activeCulinary.title}
                </h3>

                <p className="text-xs text-pink-200/70 leading-relaxed line-clamp-3 mb-4">
                  {activeCulinary.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-pink-500/10">
                <span className="text-[11px] bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold px-2.5 py-0.5 rounded-full">
                  {activeCulinary.tag}
                </span>

                <button
                  onClick={() => setSelectedCulinary(activeCulinary)}
                  className="bg-pink-600/80 hover:bg-pink-600 text-white text-xs font-semibold px-4 py-2 rounded-full border border-pink-500/40 shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <svg
                    className="w-4 h-4 text-white shrink-0"
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
                  <span>Lihat Detail</span>
                </button>
              </div>
            </div>
          )}

          {/* Tombol Lihat Selengkapnya menuju halaman /kuliner */}
          {culinaries.length > 5 && (
            <div className="mt-10 text-center">
              <Link
                href="/kuliner"
                className="inline-block px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-pink-200 bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20 hover:border-pink-500/60 transition-all duration-300 backdrop-blur-md shadow-lg active:scale-95"
              >
                Lihat Selengkapnya
              </Link>
            </div>
          )}
        </div>
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

              {/* Rating Badge di Modal */}
              <span className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-amber-300 border border-white/10 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                ⭐ {selectedCulinary.rating}
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
                    {selectedCulinary.geo
                      ? selectedCulinary.geo
                      : "Kuliner Kita"}
                  </span>
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3">
                {selectedCulinary.title}
              </h3>

              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                {selectedCulinary.desc}
              </p>

              {/* Tag & Status di bawah deskripsi khusus dalam modal */}
              <div className="flex items-center gap-2 flex-wrap mb-6">
                <span className="text-xs bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold px-3 py-1 rounded-full">
                  {selectedCulinary.tag}
                </span>
                <span className="text-pink-400/90 font-medium bg-black/40 border border-pink-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider text-[10px]">
                  {selectedCulinary.status}
                </span>
              </div>

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
