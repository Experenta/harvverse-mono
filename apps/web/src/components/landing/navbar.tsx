"use client";

import Link from "next/link";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Menu, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { LanguageSwitcher } from "@/components/language-switcher";

export function LandingNavbar() {
  const t = useTranslations("landing");
  const [isOpen, setIsOpen] = useState(false);

  const navLinks: Array<
    | { href: Route; label: string; external?: false }
    | { href: `https://${string}`; label: string; external: true }
  > = [
    { href: "/" as Route, label: t("nav_home") },
    { href: "/farms" as Route, label: t("nav_open_farms") },
    { href: "https://harvverse.com", label: t("nav_investors"), external: true },
    { href: "/about" as Route, label: t("nav_about") },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0F1A24]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-16 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/figma/logo-full.png" alt="Harvverse" className="h-8 w-auto" />
          </Link>

          {/* Desktop Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-white/70 transition-colors hover:text-primary flex items-center gap-1"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-white/70 transition-colors hover:text-primary flex items-center gap-1"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop CTA & Lang */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 rounded-full px-6"
            >
              <Link href={"/login" as Route}>Login</Link>
            </Button>
            <Button
              asChild
              className="bg-primary font-bold text-[#0F1A24] hover:bg-primary/90 rounded-full px-6"
            >
              <Link href={"/sign-up" as Route}>{t("nav_register_cta")}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-4">
            <LanguageSwitcher />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Link href={"/login" as Route}>Login</Link>
            </Button>
            <button
              className="text-white"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-white/10 bg-[#0F1A24] overflow-hidden"
            >
              <div className="flex flex-col gap-4 p-4">
                {navLinks.map((link) => (
                  link.external ? (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-lg font-medium text-white/70 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-lg font-medium text-white/70 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  )
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
        <Button
          asChild
          className="w-full h-12 bg-primary font-bold text-[#0F1A24] hover:bg-primary/90 shadow-2xl shadow-primary/20"
        >
          <Link href={"/sign-up" as Route}>{t("nav_register_cta")}</Link>
        </Button>
      </div>
    </>
  );
}
