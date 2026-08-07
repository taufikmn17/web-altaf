"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Efek untuk mengubah background navbar saat halaman di-scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        {/* Logo / Nama Pasangan */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-pink-600 dark:text-pink-400"
        >
          Altaf<span className="text-zinc-800 dark:text-zinc-200">.story</span>
        </Link>

        {/* Menu Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <Link href="/" className="hover:text-pink-600 transition-colors">
            Beranda
          </Link>
          {/* Diubah mengarah ke halaman /kisah-kita */}
          <Link
            href="/kisah-kita"
            className="hover:text-pink-600 transition-colors"
          >
            Kisah Kita
          </Link>
          <Link
            href="/destinasi"
            className="hover:text-pink-600 transition-colors"
          >
            Destinasi
          </Link>
          <Link
            href="/kuliner"
            className="hover:text-pink-600 transition-colors"
          >
            Kuliner
          </Link>
          <Link href="/game" className="hover:text-pink-600 transition-colors">
            Game
          </Link>
        </div>

        {/* Tombol Aksi Kanan (Opsional) */}
        <div className="hidden md:block">
          <span className="text-xs px-3 py-1.5 rounded-full bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-300 font-medium border border-pink-200 dark:border-pink-800">
            Forever & Always 🤍
          </span>
        </div>

        {/* Hamburger Button (Mobile) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-zinc-700 dark:text-zinc-300 focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Menu Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg border-b border-zinc-100 dark:border-zinc-800 py-4 px-6 flex flex-col gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-pink-600"
          >
            Beranda
          </Link>
          {/* Diubah mengarah ke halaman /kisah-kita */}
          <Link
            href="/kisah-kita"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-pink-600"
          >
            Kisah Kita
          </Link>
          <Link
            href="/destinasi"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-pink-600"
          >
            Destinasi
          </Link>
          <Link
            href="/kuliner"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-pink-600"
          >
            Kuliner
          </Link>
          <Link
            href="/game"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-pink-600"
          >
            Game
          </Link>
        </div>
      )}
    </nav>
  );
}
