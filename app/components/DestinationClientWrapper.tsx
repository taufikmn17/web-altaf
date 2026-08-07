"use client";

import React, { useState, useRef } from "react";

interface DestinasiItem {
  id: string;
  src: string;
  title: string;
  tag: string;
  desc: string;
  geo: string;
}

export default function DestinationClientWrapper({
  destinations,
}: {
  destinations: DestinasiItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // State untuk modal foto/detail destinasi
  const [selectedDestination, setSelectedDestination] =
    useState<DestinasiItem | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <>
      <div
        ref={containerRef}
        id="destinasiGridContainer"
        className={`flex overflow-x-auto pb-12 pt-4 gap-6 px-6 md:px-12 snap-x scroll-smooth select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {destinations.length === 0 ? (
          <div className="w-full text-center py-12 text-sm text-pink-300/50 italic bg-[#1a1017]/60 backdrop-blur-md max-w-lg mx-auto rounded-3xl border border-pink-500/20 p-8">
            Belum ada data destinasi di sheet &quot;destinasi&quot;.
          </div>
        ) : (
          destinations.map((item) => (
            <div
              key={item.id}
              className="min-w-[290px] md:min-w-[330px] max-w-[330px] bg-[#1a1017]/70 backdrop-blur-xl border border-pink-500/20 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-500/20 hover:border-pink-500/50 transition-all duration-300 flex-shrink-0 snap-center flex flex-col justify-between text-left group"
            >
              {/* Bagian Gambar (Bisa diklik untuk buka modal) */}
              <div
                onClick={() => setSelectedDestination(item)}
                className="relative h-52 w-full bg-black/40 overflow-hidden cursor-pointer"
                title="Klik untuk memperbesar foto"
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

                {/* Bagian Bawah Card: Lokasi di Kiri dengan Logo Maps SVG, Tag di Kanan */}
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
                    <span>{item.geo ? item.geo : "Destinasi Kita"}</span>
                  </span>

                  {/* Tag di Posisi Kanan */}
                  <span className="bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    {item.tag}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Popup Perbesar Foto & Detail Destinasi */}
      {selectedDestination && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex justify-center items-center p-4 pt-20 animate-fadeIn">
          <div className="bg-[#1a0f18] border-2 border-pink-900/60 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative transform transition-all scale-100 flex flex-col max-h-[85vh]">
            {/* Foto Lebih Besar di Modal */}
            <div className="relative h-56 md:h-64 w-full bg-black/60 flex-shrink-0">
              <img
                src={selectedDestination.src}
                alt={selectedDestination.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f18] via-transparent to-transparent"></div>

              {/* Tag Badge di Modal */}
              <span className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-pink-200 border border-white/10 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg">
                {selectedDestination.tag}
              </span>
            </div>

            {/* Konten Detail di Modal */}
            <div className="p-6 md:p-8 text-left overflow-y-auto flex-grow">
              <div className="flex items-center justify-between text-xs font-semibold text-pink-400 mb-1 normal-case">
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
                    {selectedDestination.geo
                      ? selectedDestination.geo
                      : "Destinasi Kita"}
                  </span>
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3">
                {selectedDestination.title}
              </h3>

              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {selectedDestination.desc}
              </p>

              <button
                onClick={() => setSelectedDestination(null)}
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
