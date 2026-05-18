"use client";

import { useRouter } from "next/navigation";

export function LanguageSwitcher() {
  const router = useRouter();

  function setLocale(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => setLocale("es")}
        className="px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
      >
        ES
      </button>
      <span className="text-white/30">|</span>
      <button
        onClick={() => setLocale("en")}
        className="px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
      >
        EN
      </button>
    </div>
  );
}
