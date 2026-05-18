"use client";

import Link from "next/link";
import type { Route } from "next";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Users,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  MapPin,
  Mountain,
  Mail,
} from "lucide-react";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";

interface PublicFarm {
  id: number;
  farmName: string;
  country: string;
  region: string;
  altitude: number | null;
  varieties: string[] | null;
  photoUrls: string[] | null;
  verified: boolean;
  rating: string | null;
  totalLots: number;
  availableLots: number;
  partnershipTypes: string[];
}

const PUBLIC_FARMS: PublicFarm[] = [];

function PartnershipBadges({ types }: { types: string[] }) {
  const t = useTranslations("landing");
  return (
    <div className="flex gap-2 flex-wrap">
      {types.includes("PHYSICAL") && (
        <span className="text-xs px-2 py-1 rounded-full bg-[#93d832]/10 text-[#93d832] border border-[#93d832]/20">
          🌿 {t("badge_physical")}
        </span>
      )}
      {types.includes("DIGITAL") && (
        <span className="text-xs px-2 py-1 rounded-full bg-[#6766c4]/10 text-[#6766c4] border border-[#6766c4]/20">
          💎 {t("badge_digital")}
        </span>
      )}
      {types.includes("PHYGITAL") && (
        <span className="text-xs px-2 py-1 rounded-full bg-[#67b9c1]/10 text-[#67b9c1] border border-[#67b9c1]/20">
          ✨ {t("badge_phygital")}
        </span>
      )}
    </div>
  );
}

function FarmCard({ farm }: { farm: PublicFarm }) {
  const t = useTranslations("landing");
  return (
    <Link href={`/farms/${farm.id}`}>
      <div
        className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(147,216,50,0.1)]"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="h-40 overflow-hidden relative">
          <img
            src={farm.photoUrls?.[0] ?? "/logo-square.png"}
            alt={farm.farmName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {farm.verified && (
            <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-[#93d832]/90 text-[#080E04] font-semibold">
              {t("verified")}
            </span>
          )}
        </div>
        <div className="p-5 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 className="text-lg font-bold text-white group-hover:text-[#93d832] transition-colors">
            {farm.farmName}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-[#a37241]" />
            <span>{farm.region}, {farm.country}</span>
          </div>
          {farm.altitude && (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Mountain className="w-3.5 h-3.5 text-[#67b9c1]" />
              <span>{farm.altitude.toLocaleString()} masl</span>
            </div>
          )}
          <p className="text-sm text-[#93d832] font-medium">
            {t("lots_available", { count: farm.availableLots })}
          </p>
          <PartnershipBadges types={farm.partnershipTypes} />
          <Button
            variant="outline"
            className="w-full mt-2 border-[#93d832]/40 text-[#93d832] hover:bg-[#93d832]/10 hover:border-[#93d832] rounded-xl"
          >
            {t("view_details")} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const t = useTranslations("landing");
  const tn = useTranslations("nav");
  const farms = PUBLIC_FARMS;

  const scrollToLots = () => {
    document.getElementById("available-partnerships")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden flex flex-col selection:bg-[#93d832] selection:text-[#080E04]"
      style={{ background: "#080E04" }}
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-[#93d832]/15 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 -right-20 w-[600px] h-[600px] bg-[#a37241]/15 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -80, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-[#6766c4]/10 rounded-full blur-[100px]"
        />
      </div>

      {/* Navbar */}
      <header className="relative z-20 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <img src="/logo-white.png" alt="Harvverse" className="h-10 w-auto" />
          <a
            href="https://harvverse.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-block"
            style={{ color: "#5A6A4E", fontSize: "12px" }}
          >
            harvverse.com
          </a>
        </div>
        <div className="hidden md:flex gap-4 items-center">
          <Button
            variant="ghost"
            className="text-white hover:text-[#93d832] hover:bg-white/5 text-sm rounded-xl"
            onClick={scrollToLots}
          >
            {tn("marketplace")}
          </Button>
          <Link href="/login">
            <Button
              variant="outline"
              className="border-[#93d832]/50 text-[#93d832] hover:bg-[#93d832] hover:text-[#080E04] text-sm rounded-xl focus-visible:ring-[#93d832]/50"
            >
              {tn("login")}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center mt-8 md:mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#93d832]/30 bg-[#93d832]/10 text-[#93d832] text-sm font-medium mb-6 backdrop-blur-sm">
              {t("award_badge")}
            </span>
            <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">
              {t("hero_title_1")} <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#93d832] via-[#67b9c1] to-white">
                {t("hero_title_2")}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t("hero_subtitle")}
            </p>
          </motion.div>

          {/* Role Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto"
          >
            <Link href={"/sign-up" as Route}>
              <div className="group cursor-pointer">
                <GlassCard className="h-full p-8 hover:border-[#93d832]/50 transition-colors duration-300 flex flex-col items-center justify-between gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#93d832] to-[#93d832]/50 flex items-center justify-center shadow-lg shadow-[#93d832]/20 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-8 h-8 text-[#080E04]" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">{t("partner_role")}</h3>
                    <p className="text-sm text-gray-400">{t("partner_desc")}</p>
                  </div>
                  <Button className="w-full bg-[#93d832] hover:bg-[#93d832]/90 text-[#080E04] font-bold h-12 rounded-xl group-hover:shadow-[0_0_20px_rgba(147,216,50,0.4)] transition-all">
                    {t("start_investing")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </GlassCard>
              </div>
            </Link>

            <Link href={"/sign-up" as Route}>
              <div className="group cursor-pointer">
                <GlassCard className="h-full p-8 hover:border-[#a37241]/50 transition-colors duration-300 flex flex-col items-center justify-between gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a37241] to-[#5e3c1e] flex items-center justify-center shadow-lg shadow-[#a37241]/20 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">{t("farmer_role")}</h3>
                    <p className="text-sm text-gray-400">{t("farmer_desc")}</p>
                  </div>
                  <Button className="w-full bg-[#a37241] hover:bg-[#8f6336] text-white font-bold h-12 rounded-xl group-hover:shadow-[0_0_20px_rgba(163,114,65,0.4)] transition-all">
                    {t("get_funded")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </GlassCard>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Trust Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-20 flex flex-wrap justify-center gap-6 md:gap-8 opacity-60 hover:opacity-90 transition-all duration-500"
        >
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-mono">{t("trust_certik")}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/20 hidden md:block" />
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-xs font-mono">{t("trust_dubai")}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/20 hidden md:block" />
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-xs font-mono">{t("trust_fintech")}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/20 hidden md:block" />
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-xs font-mono">{t("trust_farmers")}</span>
          </div>
        </motion.div>

        {/* Available Partnerships */}
        <section id="available-partnerships" className="w-full max-w-6xl mx-auto mt-24 mb-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t("partnerships_title")}
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              {t("partnerships_subtitle")}
            </p>
          </motion.div>

          {farms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {farms.map((farm) => (
                <FarmCard key={farm.id} farm={farm} />
              ))}
            </motion.div>
          )}
        </section>

        {/* Cross-Links Banner */}
        <section className="w-full max-w-4xl mx-auto mb-20 px-4">
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <h3 className="text-xl font-bold text-white mb-2">{t("new_title")}</h3>
            <p style={{ color: "#7A8A6E" }} className="text-sm">
              {t("new_desc")}{" "}
              <a
                href="https://harvverse.farm"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
                style={{ color: "#93d832" }}
              >
                harvverse.farm
              </a>
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        className="relative z-10 w-full mt-auto"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t("footer_platform")}</h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={scrollToLots}
                    className="text-gray-400 hover:text-[#93d832] text-sm transition-colors"
                  >
                    {t("footer_available_lots")}
                  </button>
                </li>
                <li>
                  <span className="text-gray-400 hover:text-[#93d832] text-sm cursor-pointer transition-colors">
                    {tn("marketplace")}
                  </span>
                </li>
                <li>
                  <Link href="/login" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    {t("footer_login_register")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t("footer_company")}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="https://harvverse.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    {t("footer_about")}
                  </a>
                </li>
                <li>
                  <a href="https://harvverse.com#invest" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    {t("footer_investors")}
                  </a>
                </li>
                <li>
                  <a href="https://harvverse.com#team" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    {t("footer_team")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t("footer_learn")}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="https://harvverse.farm#howitworks" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    {t("footer_how")}
                  </a>
                </li>
                <li>
                  <a href="https://harvverse.farm#partnerships" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    {t("footer_partnership_types")}
                  </a>
                </li>
                <li>
                  <a href="https://harvverse.farm#tokens" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    {t("footer_tokens")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t("footer_contact")}</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <a href="mailto:jorge.lanza@harvverse.com" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    jorge.lanza@harvverse.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <a href="mailto:hello@harvverse.com" className="text-gray-400 hover:text-[#93d832] text-sm transition-colors">
                    hello@harvverse.com
                  </a>
                </li>
                <li>
                  <p className="text-gray-500 text-sm flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    La Esperanza, Intibucá, Honduras
                  </p>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-xs">{t("footer_copyright")}</p>
              <div className="flex gap-6">
                <span className="text-gray-500 text-xs hover:text-gray-400 cursor-pointer transition-colors">{t("footer_privacy")}</span>
                <span className="text-gray-500 text-xs hover:text-gray-400 cursor-pointer transition-colors">{t("footer_terms")}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
