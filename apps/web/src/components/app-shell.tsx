"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import AppSidebar from "./app-sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-[#001020] text-white">
      {/* Mobile top bar — hidden on md+ */}
      <header className="fixed top-0 inset-x-0 h-14 bg-[#000d1a] border-b border-white/5 flex items-center justify-between px-4 z-50 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <img src="/logo-white.png" alt="Harvverse" className="h-7 w-auto" />
        </Link>
        <UserButton />
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={close}
        />
      )}

      <div className="flex">
        <AppSidebar isMobileOpen={sidebarOpen} onClose={close} />
        <main className="flex-1 p-4 md:p-8 pt-[72px] md:pt-8 overflow-y-auto min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
