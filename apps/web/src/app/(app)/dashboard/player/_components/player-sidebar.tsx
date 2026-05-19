"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  FileText,
  TrendingUp,
  Sprout,
  Settings,
  LogOut,
} from "lucide-react";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { useLogout } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";

const ACTIVE_CLASSES =
  "w-full justify-start text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary";
const INACTIVE_CLASSES =
  "w-full justify-start text-gray-400 hover:text-white hover:bg-white/5";

interface Props {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function PlayerSidebar({ isMobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const t = useTranslations("nav");

  const isActive = (match: string, exact = true) =>
    exact ? pathname === match : pathname.startsWith(match);

  function navigate(path: string) {
    router.push(path as Route);
    onClose?.();
  }

  return (
    <aside className={`w-64 border-r border-white/5 bg-[#000d1a] flex-col h-screen transition-transform ${isMobileOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex sticky top-0"}`}>
      <div className="p-6 border-b border-white/5">
        <Link href="/dashboard/player">
          <img
            src="/logo-white.png"
            alt="Harvverse"
            className="h-8 w-auto"
          />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Button
          variant="ghost"
          className={
            isActive("/dashboard/player") ? ACTIVE_CLASSES : INACTIVE_CLASSES
          }
          onClick={() => navigate("/dashboard/player")}
        >
          <BarChart3 className="w-4 h-4 mr-3" />
          {t("dashboard")}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/player/explore", false)
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => navigate("/dashboard/player/explore")}
        >
          <Sprout className="w-4 h-4 mr-3" />
          {t("explore")}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/my-investments") ? ACTIVE_CLASSES : INACTIVE_CLASSES
          }
          onClick={() => navigate("/my-investments")}
        >
          <TrendingUp className="w-4 h-4 mr-3" />
          {t("my_investments")}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/my-proposals") ? ACTIVE_CLASSES : INACTIVE_CLASSES
          }
          onClick={() => navigate("/my-proposals")}
        >
          <FileText className="w-4 h-4 mr-3" />
          {t("my_proposals")}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/settings") ? ACTIVE_CLASSES : INACTIVE_CLASSES
          }
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-4 h-4 mr-3" />
          {t("settings")}
        </Button>
      </nav>

      <div className="p-4 border-t border-white/5 space-y-3">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => router.push("/"),
            })
          }
        >
          <LogOut className="w-4 h-4 mr-3" />
          {logout.isPending ? t("signing_out") : t("sign_out")}
        </Button>
      </div>
    </aside>
  );
}
