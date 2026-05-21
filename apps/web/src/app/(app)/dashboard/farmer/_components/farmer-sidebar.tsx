"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Sprout, Plus, LogOut } from "lucide-react";

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

export default function FarmerSidebar({ isMobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const t = useTranslations("nav");
  const { data: user, clerkUser } = useCurrentUser();

  function navigate(path: string) {
    router.push(path as Route);
    onClose?.();
  }

  const isActive = (match: string, exact = true) =>
    exact ? pathname === match : pathname.startsWith(match);
  const navClasses = (active: boolean) =>
    cn("h-11 gap-3 font-semibold transition-colors", active ? ACTIVE_CLASSES : INACTIVE_CLASSES);

  return (
    <aside className={`w-60 border-r border-white/10 bg-[#000d1a]/95 flex-col h-screen transition-transform ${isMobileOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex sticky top-0"}`}>
      <div className="border-b border-white/10 px-5 py-6">
        <Link href="/dashboard/farmer" className="flex items-center">
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
          className={navClasses(isActive("/dashboard/farmer"))}
          onClick={() => navigate("/dashboard/farmer")}
        >
          <LayoutDashboard className="size-4" />
          {t("dashboard")}
        </Button>

        <Button
          variant="ghost"
          className={navClasses(isActive("/dashboard/farmer/my-farms", false))}
          onClick={() => navigate("/dashboard/farmer/my-farms")}
        >
          <Sprout className="size-4" />
          {t("my_farms")}
        </Button>

        {/*
        <Button
          variant="ghost"
          className={navClasses(isActive("/dashboard/farmer/proposals", false))}
          onClick={() => navigate("/dashboard/farmer/proposals")}
        >
          <Inbox className="size-4" />
          {t("proposals")}
          {pendingCount > 0 && (
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-black">
              {pendingCount}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          className={navClasses(isActive("/dashboard/farmer/investments"))}
          onClick={() => navigate("/dashboard/farmer/investments")}
        >
          <DollarSign className="size-4" />
          {t("investments")}
        </Button>
        */}

        <Button
          variant="ghost"
          className={navClasses(isActive("/dashboard/farmer/create-farm"))}
          onClick={() => navigate("/dashboard/farmer/create-farm")}
        >
          <Plus className="size-4" />
          {t("create_farm")}
        </Button>

        {/*
        <Button
          variant="ghost"
          className={navClasses(isActive("/settings"))}
          onClick={() => navigate("/settings")}
        >
          <Settings className="size-4" />
          {t("settings")}
        </Button>
        */}
      </nav>

      <div className="flex flex-col gap-3 border-t border-white/10 p-4">
        <div className="card-dark p-3">
          <p className="truncate text-sm font-bold text-white">
            {user?.displayName ?? clerkUser?.fullName ?? "Harvverse"}
          </p>
          <Badge className="mt-2 rounded-full border-primary/25 bg-primary/10 text-xs text-primary">
            {t("farmer_role")}
          </Badge>
        </div>
        <LanguageSwitcher />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-white/55 hover:bg-red-500/10 hover:text-red-300"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut className="size-4" />
          {logout.isPending ? t("signing_out") : t("sign_out")}
        </Button>
      </div>
    </aside>
  );
}
