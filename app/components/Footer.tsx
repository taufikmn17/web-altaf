import React from "react";

export default function Footer() {
  return (
    <footer
      style={{ fontFamily: "Georgia, serif" }}
      className="bg-[#0b050a] border-t border-pink-500/10 py-12 px-6"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center gap-4">
        <h3 className="text-lg font-medium text-zinc-200">
          Altaf<span className="text-pink-500">.</span> Story
        </h3>
        <p className="text-sm text-zinc-300 max-w-sm">
          Terima kasih telah menjadi bagian dari lembaran cerita terindah dalam
          hidup ini.
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-4">
          <span>Made with 🤍 for Alya & Taufik</span>
          <span>•</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
