"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Inbox,
  LayoutDashboard,
  Sprout,
  DollarSign,
  Plus,
  Settings,
  LogOut,
} from "lucide-react";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { trpc } from "@/utils/trpc";

const ACTIVE_CLASSES =
  "w-full justify-start text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary";
const INACTIVE_CLASSES =
  "w-full justify-start text-gray-400 hover:text-white hover:bg-white/5";

interface Props {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function FarmerSidebar({ isMobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const t = useTranslations("nav");
  const { clerkUser } = useCurrentUser();

  function navigate(path: string) {
    router.push(path as Route);
    onClose?.();
  }

  const { data: proposals } = useQuery(
    trpc.proposals.forFarmer.queryOptions(undefined, {
      enabled: !!clerkUser?.id,
    }),
  );

  const pendingCount =
    proposals?.filter(
      (p) => p.status === "pending" || p.status === "submitted",
    ).length ?? 0;

  const isActive = (match: string, exact = true) =>
    exact ? pathname === match : pathname.startsWith(match);

  return (
    <aside className={`w-64 border-r border-white/5 bg-[#000d1a] flex-col h-screen transition-transform ${isMobileOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex sticky top-0"}`}>
      <div className="p-6 border-b border-white/5">
        <Link href="/dashboard/farmer">
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
            isActive("/dashboard/farmer") ? ACTIVE_CLASSES : INACTIVE_CLASSES
          }
          onClick={() => navigate("/dashboard/farmer")}
        >
          <LayoutDashboard className="w-4 h-4 mr-3" />
          {t("dashboard")}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/farmer/my-farms", false)
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => navigate("/dashboard/farmer/my-farms")}
        >
          <Sprout className="w-4 h-4 mr-3" />
          {t("my_farms")}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/farmer/proposals", false)
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => navigate("/dashboard/farmer/proposals")}
        >
          <Inbox className="w-4 h-4 mr-3" />
          {t("proposals")}
          {pendingCount > 0 && (
            <span className="ml-auto bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/farmer/investments")
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => navigate("/dashboard/farmer/investments")}
        >
          <DollarSign className="w-4 h-4 mr-3" />
          {t("investments")}
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/farmer/create-farm")
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => navigate("/dashboard/farmer/create-farm")}
        >
          <Plus className="w-4 h-4 mr-3" />
          {t("create_farm")}
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
