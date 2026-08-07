export default function Footer() {
  return (
    <footer className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center gap-4">
        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
          Altaf<span className="text-pink-500">.</span> Story
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
          Terima kasih telah menjadi bagian dari lembaran cerita terindah dalam
          hidup ini.
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-600 mt-4">
          <span>Made with 🤍 for Alya & Taufik</span>
          <span>•</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
