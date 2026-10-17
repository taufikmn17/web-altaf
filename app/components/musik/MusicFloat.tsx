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
  "#ff4d8d",
  "#ff7eb3",
  "#ff2e63",
  "#ffb3d1",
  "#f43f5e",
  "#fda4af",
];

export default function MusicFloat({
  photos,
  audioSrc = "/musik.mp3",
  title = "Our Moments",
  subtitle = "Setiap momen bersamamu adalah lagu terindah",
}: MusicFloatProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Halaman game tidak memakai tombol musik
  const isGame = pathname === "/game" || pathname?.startsWith("/game/");

  // Ulangi foto agar baris marquee selalu penuh walau datanya sedikit
  const rowPhotos = useMemo(() => {
    const valid = photos.filter(Boolean);
    if (valid.length === 0) return [];
    const out: string[] = [];
    while (out.length < 8) out.push(...valid);
    return out;
  }, [photos]);

  const rowA = rowPhotos;
  const rowB = useMemo(() => [...rowPhotos].reverse(), [rowPhotos]);

  // Hati melayang (hanya dibuat saat overlay dibuka -> aman dari hydration mismatch)
  const hearts = useMemo(() => {
    if (!open) return [];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 14 + Math.random() * 30,
      duration: 7 + Math.random() * 7,
      delay: Math.random() * 8,
      sway: 20 + Math.random() * 50,
      color: HEART_COLORS[i % HEART_COLORS.length],
    }));
  }, [open]);

  const sparkles = useMemo(() => {
    if (!open) return [];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 1.5 + Math.random() * 3,
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
              {/* Hati besar berdenyut di tengah */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg
                  viewBox="0 0 24 24"
                  className="w-[70vmin] h-[70vmin] text-pink-600/20 animate-[mf-beat_1.6s_ease-in-out_infinite] drop-shadow-[0_0_60px_rgba(255,45,120,0.6)]"
                  fill="currentColor"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>

              {/* Kerlip bintang */}
              {sparkles.map((s) => (
                <span
                  key={s.id}
                  className="absolute rounded-full bg-white pointer-events-none"
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    width: s.size,
                    height: s.size,
                    boxShadow: "0 0 10px 2px rgba(255,200,230,0.9)",
                    animation: `mf-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                  }}
                />
              ))}

              {/* Hati melayang naik */}
              {hearts.map((h) => (
                <span
                  key={h.id}
                  className="absolute bottom-[-60px] pointer-events-none select-none"
                  style={
                    {
                      left: `${h.left}%`,
                      fontSize: h.size,
                      color: h.color,
                      textShadow: `0 0 14px ${h.color}`,
                      "--sway": `${h.sway}px`,
                      animation: `mf-rise ${h.duration}s ease-in ${h.delay}s infinite`,
                    } as React.CSSProperties
                  }
                >
                  ❤
                </span>
              ))}

              {/* Tombol kontrol (tutup & matikan musik) */}
              <div className="absolute top-4 right-4 md:top-5 md:right-5 z-30 flex items-center gap-3">
                <button
                  onClick={handleStop}
                  aria-label="Matikan musik"
                  className="group h-10 pl-2.5 pr-4 rounded-full flex items-center gap-2 whitespace-nowrap cursor-pointer text-pink-100 text-xs font-semibold tracking-wide bg-gradient-to-r from-pink-500/25 to-rose-500/25 backdrop-blur-md border border-pink-400/50 shadow-[0_0_18px_rgba(255,80,150,0.35)] hover:from-pink-500/50 hover:to-rose-500/50 hover:border-pink-300 hover:shadow-[0_0_26px_rgba(255,80,150,0.65)] active:scale-95 transition-all duration-300"
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
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center cursor-pointer border border-pink-300/40 shadow-[0_0_18px_rgba(255,80,150,0.5)] hover:scale-110 hover:shadow-[0_0_26px_rgba(255,80,150,0.8)] active:scale-95 transition-all duration-300"
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

              {/* Judul (ikut alur kolom, tidak menimpa foto) */}
              <div className="relative z-10 shrink-0 text-center px-6 pt-16 md:pt-10 pb-2 pointer-events-none">
                <h2
                  style={{ fontFamily: "Georgia, serif" }}
                  className="text-2xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-white to-pink-300 drop-shadow-[0_0_25px_rgba(255,105,180,0.8)] animate-[mf-glow_3s_ease-in-out_infinite]"
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
                <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-0 md:gap-2 pb-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                  <MarqueeRow photos={rowA} direction="left" duration={45} />
                  <MarqueeRow photos={rowB} direction="right" duration={55} />
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
            @keyframes mf-glow { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.35)} }
            @keyframes mf-rise {
              0%   { transform: translate(0,0) rotate(-10deg) scale(.6); opacity: 0; }
              10%  { opacity: .95; }
              50%  { transform: translate(var(--sway),-55vh) rotate(10deg) scale(1); }
              100% { transform: translate(calc(var(--sway) * -1),-115vh) rotate(-10deg) scale(1.2); opacity: 0; }
            }
            @keyframes mf-left  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
            @keyframes mf-right { from{transform:translateX(-50%)} to{transform:translateX(0)} }
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
    <div className="overflow-hidden py-3">
      <div
        className="flex w-max gap-4 md:gap-5 px-3"
        style={{
          animation: `${direction === "left" ? "mf-left" : "mf-right"} ${duration}s linear infinite`,
        }}
      >
        {items.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="shrink-0 rounded-2xl overflow-hidden border-2 border-pink-300/40 bg-black/40 shadow-[0_0_30px_rgba(255,80,150,0.45)]"
            style={{
              // tinggi mengikuti tinggi layar, lebar otomatis (rasio 3:4)
              height: "clamp(120px, 30vh, 380px)",
              aspectRatio: "3 / 4",
              transform: `rotate(${i % 2 === 0 ? -3 : 3}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
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
