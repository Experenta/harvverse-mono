"use client";

import Link from "next/link";
import type { Route } from "next";
import { useTranslations } from "next-intl";

export function LandingFooter() {
  const t = useTranslations("landing");

  return (
    <footer className="bg-[#0A1218] pt-16 pb-24 md:pb-12 text-white/60">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Logo & Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <img src="/figma/logo-full.png" alt={t("alt_logo")} className="h-8 w-auto opacity-80" />
            </Link>
            <p className="text-sm">harvverse.farm</p>
            <div className="text-sm space-y-1">
              <p>jorge.lanza@harvverse.com</p>
              <p>+504 9992-7212</p>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-4">
            <h4 className="text-white font-bold tracking-wider uppercase text-xs mb-6">
              {t("footer_platform")}
            </h4>
            <nav className="flex flex-col gap-3 text-sm">
              <Link href="/farms" className="hover:text-primary transition-colors">
                {t("nav_open_farms")}
              </Link>
              <Link href={"/sign-up" as Route} className="hover:text-primary transition-colors">
                {t("nav_register_cta")}
              </Link>
              <Link href="https://harvverse.com" target="_blank" className="hover:text-primary transition-colors flex items-center gap-1">
                {t("nav_investors")}
              </Link>
            </nav>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h4 className="text-white font-bold tracking-wider uppercase text-xs mb-6">
              {t("footer_company")}
            </h4>
            <nav className="flex flex-col gap-3 text-sm">
              <Link href={"/about" as Route} className="hover:text-primary transition-colors">
                {t("nav_about")}
              </Link>
              <Link href="https://harvverse.com" target="_blank" className="hover:text-primary transition-colors">
                harvverse.com
              </Link>
              <Link href="https://www.bloomberglinea.com" target="_blank" className="hover:text-primary transition-colors">
                Bloomberg Línea ↗
              </Link>
            </nav>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <p>{t("footer_copyright")}</p>
            <p className="text-white/30 hidden md:block">|</p>
            <p>{t("footer_built_on")}</p>
          </div>
          <div className="flex gap-6">
            <Link href="https://harvverse.com/privacy" target="_blank" className="hover:text-white transition-colors">{t("footer_privacy")}</Link>
            <Link href="https://harvverse.com/terms" target="_blank" className="hover:text-white transition-colors">{t("footer_terms")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
