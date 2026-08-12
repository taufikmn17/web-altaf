"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";

interface Wish {
  id: string;
  text: string;
  color: "pink" | "amber";
  timestamp: string;
}

// Fungsi fetcher untuk SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal mengambil data dari server.");
  const data = await res.json();

  if (Array.isArray(data) && data.length > 0) {
    return data.reverse().map((item: any, index: number) => ({
      id: index.toString(),
      text: item.text || "",
      color: item.color || "pink",
      timestamp: item.date ? item.date.toString().split("T")[0] : "Baru saja",
    }));
  }
  return [];
};

export default function VirtualWish() {
  const [wishText, setWishText] = useState("");
  const [lanternColor, setLanternColor] = useState<"pink" | "amber">("pink");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flyingLanterns, setFlyingLanterns] = useState<
    { id: number; text: string; color: string; left: number }[]
  >([]);

  const maxLength = 150;
  const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";
  const targetUrl = baseUrl ? `${baseUrl}?sheet=lentera` : null;

  // Menggunakan SWR untuk caching & otomatisasi revalidate tanpa loading terus-menerus
  const { data: wishes = [], isValidating: isLoadingWishes } = useSWR<Wish[]>(
    targetUrl,
    fetcher,
    {
      revalidateOnFocus: false, // Tidak refetch otomatis saat pindah tab browser
      dedupingInterval: 60000, // Cache data selama 1 menit untuk mencegah spam request ke GAS
    }
  );

  // Handle submit form dengan Optimistic Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedText = wishText.trim();
    if (!trimmedText || isSubmitting) return;

    setIsSubmitting(true);

    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timestampStr = now.toISOString();

    const payload = {
      sheet: "lentera",
      text: trimmedText,
      color: lanternColor,
      date: dateStr,
      timestamp: timestampStr,
    };

    // Data sementara untuk optimis UI (langsung tampil tanpa tunggu GAS selesai)
    const newWish: Wish = {
      id: Date.now().toString(),
      text: trimmedText,
      color: lanternColor,
      timestamp: "Baru saja",
    };

    // Update cache secara instan (Optimistic Update)
    mutate(targetUrl, [newWish, ...wishes], false);

    // Animasi Lentera Terbang
    const newFlyingId = Date.now();
    const randomLeft = Math.floor(Math.random() * 80) + 10;
    setFlyingLanterns((prev) => [
      ...prev,
      {
        id: newFlyingId,
        text: trimmedText,
        color: lanternColor,
        left: randomLeft,
      },
    ]);

    setTimeout(() => {
      setFlyingLanterns((prev) =>
        prev.filter((item) => item.id !== newFlyingId)
      );
    }, 4000);

    setWishText("");

    try {
      // Kirim data ke Google Apps Script di background
      await fetch(baseUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      // Validasi ulang data dari server setelah berhasil simpan
      mutate(targetUrl);
    } catch (error) {
      console.error("Gagal menyimpan harapan:", error);
      // Rollback cache jika gagal
      mutate(targetUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="virtualWish"
      style={{ fontFamily: "Georgia, serif" }}
      className="py-24 bg-gradient-to-b from-[#1a0d14] via-[#120a0f] to-[#0a0508] overflow-hidden text-center relative"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Sky Lantern
          </span>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Make A Wish Virtual <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
              Terbangkan Lenteramu
            </span>
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Input Form Card */}
        <div className="max-w-xl mx-auto bg-[#1a1017]/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-pink-500/20 shadow-2xl text-left mb-16">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-pink-200/80 mb-2">
                Ketik di Sini yaa :
              </label>
              <textarea
                rows={3}
                required
                maxLength={maxLength}
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[#120a0f]/60 border border-pink-500/30 rounded-2xl p-4 text-white placeholder-pink-300/40 focus:outline-none focus:ring-2 focus:ring-pink-500 transition resize-none text-sm disabled:opacity-50"
                placeholder="Contoh: Semoga kita bisa bareng terus sampai nikah... Aamiin!"
              ></textarea>
              <div className="text-right text-[10px] text-pink-300/60 mt-1">
                {wishText.length} / {maxLength} karakter
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold uppercase tracking-wider text-pink-200/80 mb-3">
                Pilih Warna Lentera :
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="lanternColor"
                    value="pink"
                    checked={lanternColor === "pink"}
                    onChange={() => setLanternColor("pink")}
                    className="hidden peer"
                  />
                  <span
                    className="w-5 h-5 rounded-full ring-offset-2 ring-offset-[#1a1017] peer-checked:ring-2 block transition transform group-hover:scale-110"
                    style={
                      {
                        backgroundColor: "#ec4899",
                        "--tw-ring-color": "#ec4899",
                      } as React.CSSProperties
                    }
                  ></span>
                  <span className="text-xs text-pink-200/70 font-semibold peer-checked:text-pink-400">
                    Romantic Pink
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="lanternColor"
                    value="amber"
                    checked={lanternColor === "amber"}
                    onChange={() => setLanternColor("amber")}
                    className="hidden peer"
                  />
                  <span className="w-5 h-5 rounded-full bg-amber-400 ring-offset-2 ring-offset-[#1a1017] peer-checked:ring-2 peer-checked:ring-amber-400 block transition transform group-hover:scale-110"></span>
                  <span className="text-xs text-pink-200/70 peer-checked:text-amber-400 font-semibold">
                    Warm Gold
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !wishText.trim()}
              className="w-full text-white font-bold text-sm py-4 px-6 rounded-2xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 tracking-wide uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(to right, #ec4899, #db2777, #d4af37)",
                boxShadow: "0 10px 20px -3px rgba(236, 72, 153, 0.4)",
              }}
            >
              {isSubmitting ? "Menerbangkan Lentera..." : "🔥 Terbangkan!"}
            </button>
          </form>
        </div>

        {/* Papan Harapan Terbaru */}
        <div className="max-w-3xl mx-auto border-t border-pink-500/20 pt-10 relative">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            📌 Papan Harapan Terbaru
          </h3>
          <p className="text-xs text-pink-300/60 mb-8">
            3 Catatan harapan terbaru yang diterbangkan
          </p>

          <div className="relative w-full min-h-[250px] bg-[#1a1017]/60 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-pink-500/20 shadow-xl overflow-hidden flex items-center justify-center">
            {isLoadingWishes && wishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 z-20">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm text-pink-300/70 italic">
                  Memuat papan harapan...
                </p>
              </div>
            ) : (
              <div className="relative w-full grid grid-cols-1 md:grid-cols-3 gap-4 z-20">
                {wishes.length === 0 ? (
                  <div className="col-span-3 text-center py-6 text-sm text-pink-300/50 italic bg-[#120a0f]/40 px-6 rounded-2xl border border-dashed border-pink-500/20">
                    Belum ada harapan yang diterbangkan. Jadilah yang pertama!
                  </div>
                ) : (
                  wishes.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#120a0f]/80 border border-pink-500/20 p-5 rounded-2xl text-left shadow-lg relative overflow-hidden group hover:border-pink-500/50 transition-all flex flex-col justify-between"
                    >
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full ${
                          item.color === "pink" ? "bg-pink-500" : "bg-amber-400"
                        }`}
                      ></div>
                      <p className="text-sm text-pink-100/90 mb-4 leading-relaxed break-words">
                        &ldquo;{item.text}&rdquo;
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-pink-300/50 pt-2 border-t border-pink-500/10">
                        <span>✨ Anonim</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animasi Lentera Terbang */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
        {flyingLanterns.map((lantern) => (
          <div
            key={lantern.id}
            className="absolute bottom-10 flex flex-col items-center animate-fly-up opacity-0"
            style={{ left: `${lantern.left}%` }}
          >
            <div
              className={`w-12 h-16 rounded-t-full rounded-b-xl shadow-xl flex items-center justify-center p-1 text-sm text-white text-center truncate ${
                lantern.color === "pink"
                  ? "bg-pink-500 shadow-pink-500/50"
                  : "bg-amber-500 shadow-amber-500/50"
              }`}
            >
              🏮
            </div>
            <div className="bg-black/70 backdrop-blur-sm text-xs text-white px-3 py-1 rounded-md max-w-[150px] truncate mt-2 border border-white/10 shadow-lg">
              {lantern.text}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes flyUp {
          0% {
            transform: translateY(0px) scale(0.9);
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1.4);
            opacity: 0;
          }
        }
        .animate-fly-up {
          animation: flyUp 8s ease-out forwards;
        }
      `}</style>
    </section>
  );
}
