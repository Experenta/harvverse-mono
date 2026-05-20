"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, FileText, TrendingUp, Sprout, Settings, LogOut } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { cn } from "@harvverse-monorepo/ui/lib/utils";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";

const ACTIVE_CLASSES =
  "w-full justify-start rounded-none border-l-2 border-primary bg-primary/10 pl-3 text-primary hover:bg-primary/15 hover:text-primary";
const INACTIVE_CLASSES =
  "w-full justify-start rounded-none border-l-2 border-transparent pl-3 text-white/50 hover:bg-white/5 hover:text-white";

interface Props {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function PlayerSidebar({ isMobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const t = useTranslations("nav");
  const { data: user, clerkUser } = useCurrentUser();

  const isActive = (match: string, exact = true) =>
    exact ? pathname === match : pathname.startsWith(match);
  const navClasses = (active: boolean) =>
    cn("h-11 gap-3 font-semibold transition-colors", active ? ACTIVE_CLASSES : INACTIVE_CLASSES);

  function navigate(path: string) {
    router.push(path as Route);
    onClose?.();
  }

  return (
    <aside className={`w-60 border-r border-white/10 bg-[#000d1a]/95 flex-col h-screen transition-transform ${isMobileOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex sticky top-0"}`}>
      <div className="border-b border-white/10 px-5 py-6">
        <Link href="/dashboard/player" className="flex items-center">
          <img
            src="/figma/logo-full.png"
            alt="Harvverse"
            className="h-10 w-auto"
          />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3 py-5">
        <Button
          variant="ghost"
          className={navClasses(isActive("/dashboard/player"))}
          onClick={() => navigate("/dashboard/player")}
        >
          <BarChart3 className="size-4" />
          {t("dashboard")}
        </Button>

        <Button
          variant="ghost"
          className={navClasses(isActive("/dashboard/player/explore", false))}
          onClick={() => navigate("/dashboard/player/explore")}
        >
          <Sprout className="size-4" />
          {t("explore")}
        </Button>

        <Button
          variant="ghost"
          className={navClasses(isActive("/my-investments"))}
          onClick={() => navigate("/my-investments")}
        >
          <TrendingUp className="size-4" />
          {t("my_investments")}
        </Button>

        <Button
          variant="ghost"
          className={navClasses(isActive("/my-proposals"))}
          onClick={() => navigate("/my-proposals")}
        >
          <FileText className="size-4" />
          {t("my_proposals")}
        </Button>

        <Button
          variant="ghost"
          className={navClasses(isActive("/settings"))}
          onClick={() => navigate("/settings")}
        >
          <Settings className="size-4" />
          {t("settings")}
        </Button>
      </nav>

      <div className="flex flex-col gap-3 border-t border-white/10 p-4">
        <div className="card-dark p-3">
          <p className="truncate text-sm font-bold text-white">
            {user?.displayName ?? clerkUser?.fullName ?? "Harvverse"}
          </p>
          <Badge className="mt-2 rounded-full border-[#67B9C1]/25 bg-[#67B9C1]/10 text-xs text-[#67B9C1]">
            {t("partner_role")}
          </Badge>
        </div>
        <LanguageSwitcher />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-white/55 hover:bg-red-500/10 hover:text-red-300"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => router.push("/"),
            })
          }
        >
          <LogOut className="size-4" />
          {logout.isPending ? t("signing_out") : t("sign_out")}
        </Button>
      </div>
    </aside>
  );
}
