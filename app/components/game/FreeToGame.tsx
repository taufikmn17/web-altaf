"use client";

import {
  ArrowLeft,
  ExternalLink,
  Gamepad2,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FreeGame = {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
  developer: string;
  release_date: string;
  freetogame_profile_url: string;
};

const CATEGORIES = [
  { value: "", label: "Semua" },
  { value: "mmorpg", label: "MMORPG" },
  { value: "shooter", label: "Shooter" },
  { value: "pvp", label: "PvP" },
  { value: "moba", label: "MOBA" },
  { value: "battle-royale", label: "Battle Royale" },
  { value: "mmofps", label: "MMOFPS" },
  { value: "social", label: "Social" },
];

const PLATFORMS = [
  { value: "", label: "Semua" },
  { value: "browser", label: "Browser" },
  { value: "pc", label: "PC" },
];

const SORTS = [
  { value: "", label: "Relevan" },
  { value: "release-date", label: "Terbaru" },
  { value: "popularity", label: "Populer" },
  { value: "alphabetical", label: "A-Z" },
];

export default function FreeToGame() {
  const [games, setGames] = useState<FreeGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [platform, setPlatform] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FreeGame | null>(null);

  const fetchGames = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (platform) params.set("platform", platform);
      if (sortBy) params.set("sort-by", sortBy);

      const res = await fetch(`/api/freetogame?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        games?: FreeGame[];
        error?: string;
      };
      if (data.error || !data.games) {
        setError(data.error ?? "Gagal memuat daftar game.");
        return;
      }
      setGames(data.games);
    } catch {
      setError("Kesalahan jaringan saat memuat daftar game.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, platform, sortBy]);

  const filteredGames = useMemo(() => {
    if (!search.trim()) return games;
    const q = search.trim().toLowerCase();
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.publisher.toLowerCase().includes(q),
    );
  }, [games, search]);

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">FREE TO GAME</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Gamepad2 size={14} /> JELAJAHI GAME GRATIS
          </div>
          <h1>
            Free to Game<span>!</span>
          </h1>
          <p>
            Katalog game gratis & multiplayer dari seluruh dunia. Klik untuk
            melihat detail & mainkan di situs resminya.
          </p>
        </header>

        {/* Filter Section */}
        <div className="ftg-filters">
          <div className="ftg-search-wrap">
            <Search size={16} className="ftg-search-icon" />
            <input
              type="text"
              className="ftg-search"
              placeholder="Cari game, genre, publisher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ftg-filter-block">
            <span className="ftg-filter-label">KATEGORI</span>
            <div className="ftg-filter-row">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`ftg-chip ${category === c.value ? "is-active" : ""}`}
                  onClick={() => setCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ftg-filter-block">
            <span className="ftg-filter-label">PLATFORM</span>
            <div className="ftg-filter-row">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`ftg-chip ${platform === p.value ? "is-active" : ""}`}
                  onClick={() => setPlatform(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ftg-filter-block">
            <span className="ftg-filter-label">URUTKAN</span>
            <div className="ftg-filter-row">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`ftg-chip ${sortBy === s.value ? "is-active" : ""}`}
                  onClick={() => setSortBy(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="ftg-state" role="status">
            <Loader2 size={24} className="ftg-spin" />
            <span>Memuat daftar game…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="ftg-state is-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="tap-rush-secondary"
              onClick={() => void fetchGames()}
            >
              <RefreshCw size={15} /> Coba lagi
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <>
            <div className="ftg-result-info">
              <Sparkles size={14} /> {filteredGames.length} game ditemukan
            </div>
            <div className="ftg-grid">
              {filteredGames.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="ftg-card"
                  onClick={() => setSelected(g)}
                >
                  <div className="ftg-card-img-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.thumbnail}
                      alt={g.title}
                      className="ftg-card-img"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity =
                          "0";
                      }}
                    />
                  </div>
                  <div className="ftg-card-body">
                    <h3 className="ftg-card-title">{g.title}</h3>
                    <span className="ftg-card-genre">{g.genre}</span>
                    <span className="ftg-card-platform">
                      <Monitor size={11} /> {g.platform.toUpperCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {filteredGames.length === 0 && (
              <div className="ftg-state">
                Tidak ada game yang cocok dengan filter ini.
              </div>
            )}
          </>
        )}

        <footer className="tap-rush-footnote">
          <span>POWERED BY FREETOGAME API</span>
          <span>KATALOG GRATIS</span>
          <span>KLIK UNTUK DETAIL</span>
        </footer>
      </section>

      {/* Modal detail */}
      {selected && (
        <div
          className="ftg-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div className="ftg-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ftg-modal-close"
              onClick={() => setSelected(null)}
              aria-label="Tutup"
            >
              ✕
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.thumbnail}
              alt={selected.title}
              className="ftg-modal-img"
            />

            <div className="ftg-modal-body">
              <h2 className="ftg-modal-title">{selected.title}</h2>

              <div className="ftg-modal-tags">
                <span className="ftg-modal-tag">{selected.genre}</span>
                <span className="ftg-modal-tag">
                  {selected.platform.toUpperCase()}
                </span>
              </div>

              <p className="ftg-modal-desc">{selected.short_description}</p>

              <div className="ftg-modal-info">
                <div>
                  <span>Developer</span>
                  <strong>{selected.developer}</strong>
                </div>
                <div>
                  <span>Publisher</span>
                  <strong>{selected.publisher}</strong>
                </div>
                <div>
                  <span>Rilis</span>
                  <strong>{selected.release_date}</strong>
                </div>
              </div>

              <a
                href={selected.game_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ftg-modal-cta"
              >
                <ExternalLink size={16} /> Mainkan Sekarang
              </a>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Filters wrapper */
        .ftg-filters {
          display: flex;
          flex-direction: column;
          gap: 22px;
          padding: 22px;
          margin-bottom: 26px;
          background: linear-gradient(
            145deg,
            rgba(32, 14, 24, 0.7),
            rgba(18, 10, 15, 0.85)
          );
          border: 1px solid rgba(236, 72, 153, 0.18);
          border-radius: 16px;
        }

        /* Search — icon DI DALAM input, pakai flexbox */
        .ftg-search-wrap {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          height: 48px;
          padding: 0 16px;
          background: rgba(18, 10, 15, 0.72);
          border: 1px solid rgba(236, 72, 153, 0.28);
          border-radius: 10px;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }
        .ftg-search-wrap:focus-within {
          border-color: #ec4899;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);
        }
        .ftg-search-icon {
          color: #ec4899;
          flex-shrink: 0;
          pointer-events: none;
        }
        .ftg-search {
          flex: 1;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #fdf8f6;
          font-family: inherit;
          font-size: 15px;
          padding: 0;
        }
        .ftg-search::placeholder {
          color: #9d7a8c;
        }

        /* Filter blocks */
        .ftg-filter-block {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ftg-filter-label {
          font-family: "Arial Narrow", "Trebuchet MS", sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #f9a8d4;
        }
        .ftg-filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ftg-chip {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.75);
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 130ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .ftg-chip:hover {
          border-color: rgba(236, 72, 153, 0.5);
          color: #fff;
        }
        .ftg-chip.is-active {
          background: linear-gradient(135deg, #ec4899, #db2777);
          border-color: #ec4899;
          color: #fff;
          box-shadow: 0 0 14px rgba(236, 72, 153, 0.5);
        }

        /* States */
        .ftg-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 48px 20px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: inherit;
          font-size: 13px;
          letter-spacing: 0.04em;
          opacity: 0.85;
          text-align: center;
          color: #c4a0b5;
        }
        .ftg-state.is-error {
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.08);
        }
        .ftg-spin {
          animation: ftgSpin 1s linear infinite;
          color: #ec4899;
        }
        @keyframes ftgSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Result info */
        .ftg-result-info {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
          font-family: "Arial Narrow", "Trebuchet MS", sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #f9a8d4;
        }

        /* Grid */
        .ftg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        .ftg-card {
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(236, 72, 153, 0.18);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: all 160ms ease;
          text-align: left;
          color: inherit;
          padding: 0;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .ftg-card:hover {
          border-color: rgba(236, 72, 153, 0.6);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(236, 72, 153, 0.22);
        }
        .ftg-card-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          background: #0a0f1a;
          overflow: hidden;
        }
        .ftg-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 220ms ease;
        }
        .ftg-card:hover .ftg-card-img {
          transform: scale(1.05);
        }
        .ftg-card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px 14px;
        }
        .ftg-card-title {
          margin: 0;
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 15px;
          letter-spacing: 0.02em;
          line-height: 1.25;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          color: #fdf8f6;
        }
        .ftg-card-genre {
          font-family: "Arial Narrow", "Trebuchet MS", sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #ec4899;
        }
        .ftg-card-platform {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          align-self: flex-start;
          border-radius: 999px;
          background: rgba(236, 72, 153, 0.12);
          border: 1px solid rgba(236, 72, 153, 0.3);
          color: #f9a8d4;
          font-family: "Arial Narrow", "Trebuchet MS", sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* Modal */
        .ftg-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 100;
          animation: ftgFade 0.18s ease-out;
        }
        @keyframes ftgFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .ftg-modal {
          position: relative;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          background: #1b0d15;
          border: 1px solid rgba(236, 72, 153, 0.5);
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(236, 72, 153, 0.35);
          animation: ftgSlideUp 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes ftgSlideUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .ftg-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          font-size: 15px;
          cursor: pointer;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 140ms ease;
        }
        .ftg-modal-close:hover {
          background: rgba(236, 72, 153, 0.85);
        }
        .ftg-modal-img {
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          display: block;
        }
        .ftg-modal-body {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ftg-modal-title {
          margin: 0;
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 24px;
          line-height: 1.15;
        }
        .ftg-modal-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ftg-modal-tag {
          padding: 4px 11px;
          border-radius: 999px;
          font-family: "Arial Narrow", "Trebuchet MS", sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: rgba(236, 72, 153, 0.15);
          border: 1px solid rgba(236, 72, 153, 0.4);
          color: #f9a8d4;
        }
        .ftg-modal-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: #c4a0b5;
        }
        .ftg-modal-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ftg-modal-info > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 12px;
        }
        .ftg-modal-info span {
          color: #9d7a8c;
          font-family: "Arial Narrow", "Trebuchet MS", sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .ftg-modal-info strong {
          font-size: 12px;
          font-weight: 600;
          color: #fdf8f6;
        }
        .ftg-modal-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 14px 20px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ec4899, #db2777);
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-decoration: none;
          transition: all 150ms ease;
          box-shadow: 0 6px 22px rgba(236, 72, 153, 0.4);
        }
        .ftg-modal-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(236, 72, 153, 0.6);
        }

        /* Mobile */
        @media (max-width: 640px) {
          .ftg-filters {
            padding: 16px;
            gap: 18px;
          }
          .ftg-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
          }
          .ftg-card-body {
            padding: 10px 12px 12px;
          }
          .ftg-card-title {
            font-size: 13px;
          }
          .ftg-modal-info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
