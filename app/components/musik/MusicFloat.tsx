"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface MusicFloatProps {
  /** Daftar URL foto dari Google Sheets */
  photos: string[];
  /** Lokasi file lagu di folder /public */
  audioSrc?: string;
  title?: string;
  subtitle?: string;
}

const HEART_COLORS = [
  "#ec4899",
  "#f472b6",
  "#fbcfe8",
  "#fb7185",
  "#ec4899",
  "#f43f5e",
];

// Bentuk hati yang sama dengan Hero (kurva bezier), dalam kotak 100x100
const HEART_PATH =
  "M50 25 C50 0 0 0 0 25 C0 50 50 75 50 100 C50 75 100 50 100 25 C100 0 50 0 50 25 Z";

const MAX_PHOTOS = 10;

/** Minta Google mengirim versi kecil (lebar 480px) agar ringan di HP */
function optimizeImage(url: string) {
  const m = url.match(
    /^(https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+)(=.*)?$/,
  );
  return m ? `${m[1]}=w480` : url;
}

export default function MusicFloat({
  photos,
  audioSrc = "/musik.mp3",
  title = "Untuk Kamu, Cintaku",
  subtitle = "Setiap momen bersamamu adalah lagu terindah",
}: MusicFloatProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Halaman game tidak memakai tombol musik
  const isGame = pathname === "/game" || pathname?.startsWith("/game/");

  // Batasi jumlah foto, perkecil ukurannya, ulangi bila datanya sedikit
  const rowPhotos = useMemo(() => {
    const valid = photos
      .filter(Boolean)
      .slice(0, MAX_PHOTOS)
      .map(optimizeImage);
    if (valid.length === 0) return [];
    const out: string[] = [];
    while (out.length < 6) out.push(...valid);
    return out;
  }, [photos]);

  const rowA = rowPhotos;
  const rowB = useMemo(() => [...rowPhotos].reverse(), [rowPhotos]);

  // Hati & bintang: jumlahnya lebih sedikit di layar kecil
  const hearts = useMemo(() => {
    if (!open) return [];
    const count = window.innerWidth < 768 ? 10 : 20;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 14 + Math.random() * 26,
      duration: 8 + Math.random() * 7,
      delay: Math.random() * 8,
      sway: 20 + Math.random() * 40,
      color: HEART_COLORS[i % HEART_COLORS.length],
    }));
  }, [open]);

  const sparkles = useMemo(() => {
    if (!open) return [];
    const count = window.innerWidth < 768 ? 10 : 20;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 4,
    }));
  }, [open]);

  // Masuk halaman game -> hentikan musik & tutup tampilan
  useEffect(() => {
    if (!isGame) return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setOpen(false);
  }, [isGame]);

  // Kunci scroll body & tutup dengan tombol Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleFloatClick = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Kalau musik sedang jalan, cukup buka kembali tampilannya
    if (playing) {
      setOpen(true);
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play(); // dipanggil langsung dari klik user -> lolos aturan autoplay
      setPlaying(true);
      setOpen(true);
    } catch (err) {
      console.error("Gagal memutar musik:", err);
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setOpen(false);
  };

  const handleEnded = () => {
    setPlaying(false);
    setOpen(false); // lagu selesai -> tampilan otomatis tertutup
  };

  // Kecepatan konstan berapa pun jumlah fotonya
  const durationA = Math.max(30, rowA.length * 4.5);
  const durationB = Math.max(36, rowB.length * 5.5);

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="none"
        onEnded={handleEnded}
      />

      {!isGame && (
        <>
          {/* Tombol Float (kanan bawah) */}
          <button
            onClick={handleFloatClick}
            aria-label={playing ? "Buka tampilan musik" : "Putar musik"}
            className="fixed bottom-5 right-5 z-[9990] h-14 w-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/40 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
          >
            {playing && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-pink-400 animate-[mf-ring_1.8s_ease-out_infinite]" />
                <span className="absolute inset-0 rounded-full border-2 border-pink-300 animate-[mf-ring_1.8s_ease-out_0.9s_infinite]" />
              </>
            )}
            <svg
              className={`h-7 w-7 relative ${playing ? "animate-[mf-spin_4s_linear_infinite]" : ""}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
          </button>

          {/* Overlay Megah: kolom -> judul di atas, foto mengisi sisa ruang */}
          {open && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[9999] overflow-hidden flex flex-col bg-[radial-gradient(ellipse_at_center,#3b0a24_0%,#1a0510_55%,#0a0208_100%)] animate-[mf-fade_0.6s_ease-out]"
            >
              {/* Hati besar berdenyut di tengah (tanpa filter, hanya transform) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-[60vmin] h-[60vmin] rounded-full bg-[radial-gradient(circle,rgba(255,45,120,0.35)_0%,transparent_70%)]" />
                <svg
                  viewBox="0 0 100 100"
                  className="relative w-[70vmin] h-[70vmin] text-pink-600/20 animate-[mf-beat_1.6s_ease-in-out_infinite] [will-change:transform]"
                  fill="currentColor"
                >
                  <path d={HEART_PATH} />
                </svg>
              </div>

              {/* Kerlip bintang */}
              {sparkles.map((s) => (
                <span
                  key={s.id}
                  className="absolute rounded-full bg-pink-100 pointer-events-none [will-change:transform,opacity]"
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    width: s.size,
                    height: s.size,
                    animation: `mf-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                  }}
                />
              ))}

              {/* Hati melayang naik (bentuk sama dengan Hero) */}
              {hearts.map((h) => (
                <span
                  key={h.id}
                  className="absolute bottom-[-60px] pointer-events-none select-none [will-change:transform,opacity]"
                  style={
                    {
                      left: `${h.left}%`,
                      width: h.size,
                      height: h.size,
                      color: h.color,
                      "--sway": `${h.sway}px`,
                      animation: `mf-rise ${h.duration}s ease-in ${h.delay}s infinite`,
                    } as React.CSSProperties
                  }
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    fill="currentColor"
                  >
                    <path d={HEART_PATH} />
                  </svg>
                </span>
              ))}

              {/* Tombol kontrol (tutup & matikan musik) */}
              <div className="absolute top-4 right-4 md:top-5 md:right-5 z-30 flex items-center gap-3">
                <button
                  onClick={handleStop}
                  aria-label="Matikan musik"
                  className="group h-10 pl-2.5 pr-4 rounded-full flex items-center gap-2 whitespace-nowrap cursor-pointer text-pink-100 text-xs font-semibold tracking-wide bg-gradient-to-r from-pink-600/40 to-rose-600/40 border border-pink-400/50 shadow-[0_0_14px_rgba(255,80,150,0.35)] hover:from-pink-500/60 hover:to-rose-500/60 hover:border-pink-300 active:scale-95 transition-all duration-300"
                >
                  <span className="h-6 w-6 rounded-full bg-pink-500/30 border border-pink-300/40 flex items-center justify-center group-hover:bg-pink-500/60 transition-colors">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <polygon
                        points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                        fill="currentColor"
                      />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  </span>
                  <span>Matikan Musik</span>
                </button>

                <button
                  onClick={() => setOpen(false)}
                  aria-label="Tutup tampilan"
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center cursor-pointer border border-pink-300/40 shadow-[0_0_14px_rgba(255,80,150,0.5)] hover:scale-110 active:scale-95 transition-transform duration-300"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 6l12 12M18 6L6 18"
                    />
                  </svg>
                </button>
              </div>

              {/* Judul (statis, tanpa animasi filter) */}
              <div className="relative z-10 shrink-0 text-center px-6 pt-16 md:pt-10 pb-2 pointer-events-none">
                <h2
                  style={{ fontFamily: "Georgia, serif" }}
                  className="text-2xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-white to-pink-300"
                >
                  {title}
                </h2>
                <p
                  style={{ fontFamily: "Georgia, serif" }}
                  className="mt-2 text-xs md:text-base italic text-pink-200/80"
                >
                  {subtitle}
                </p>
              </div>

              {/* Foto: mengisi sisa ruang di bawah judul */}
              {rowPhotos.length > 0 && (
                <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-0 md:gap-2 pb-4">
                  <MarqueeRow
                    photos={rowA}
                    direction="left"
                    duration={durationA}
                  />
                  <MarqueeRow
                    photos={rowB}
                    direction="right"
                    duration={durationB}
                  />

                  {/* Pudar di tepi kiri & kanan (statis, jauh lebih ringan dari mask-image) */}
                  <div className="absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-[#12030b] to-transparent pointer-events-none z-10" />
                  <div className="absolute inset-y-0 right-0 w-[10%] bg-gradient-to-l from-[#12030b] to-transparent pointer-events-none z-10" />
                </div>
              )}
            </div>
          )}

          <style>{`
            @keyframes mf-ring { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(1.9);opacity:0} }
            @keyframes mf-spin { to{transform:rotate(360deg)} }
            @keyframes mf-fade { from{opacity:0} to{opacity:1} }
            @keyframes mf-beat { 0%,100%{transform:scale(1)} 15%{transform:scale(1.08)} 30%{transform:scale(1)} 45%{transform:scale(1.05)} }
            @keyframes mf-twinkle { 0%,100%{opacity:0;transform:scale(.4)} 50%{opacity:1;transform:scale(1.2)} }
            @keyframes mf-rise {
              0%   { transform: translate3d(0,0,0) scale(.6); opacity: 0; }
              10%  { opacity: .95; }
              50%  { transform: translate3d(var(--sway),-55vh,0) scale(1); }
              100% { transform: translate3d(calc(var(--sway) * -1),-115vh,0) scale(1.2); opacity: 0; }
            }
            @keyframes mf-left  { from{transform:translate3d(0,0,0)} to{transform:translate3d(-50%,0,0)} }
            @keyframes mf-right { from{transform:translate3d(-50%,0,0)} to{transform:translate3d(0,0,0)} }
          `}</style>
        </>
      )}
    </>
  );
}

function MarqueeRow({
  photos,
  direction,
  duration,
}: {
  photos: string[];
  direction: "left" | "right";
  duration: number;
}) {
  // Dobel agar loop mulus (geser -50% lalu ulang)
  const items = [...photos, ...photos];
  return (
    <div className="overflow-hidden py-3 [contain:paint]">
      <div
        className="flex w-max gap-4 md:gap-5 px-3 [will-change:transform] [backface-visibility:hidden]"
        style={{
          animation: `${direction === "left" ? "mf-left" : "mf-right"} ${duration}s linear infinite`,
        }}
      >
        {items.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="shrink-0 rounded-2xl overflow-hidden border-2 border-pink-300/40 bg-black/40"
            style={{
              // tinggi mengikuti tinggi layar, lebar otomatis (rasio 3:4)
              height: "clamp(120px, 30vh, 380px)",
              aspectRatio: "3 / 4",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="eager"
              decoding="async"
              draggable={false}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display =
                  "none";
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
