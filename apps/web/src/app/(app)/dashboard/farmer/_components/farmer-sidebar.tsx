"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sprout,
  DollarSign,
  Plus,
  Settings,
  LogOut,
} from "lucide-react";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { useLogout } from "@/hooks/use-auth";

const ACTIVE_CLASSES =
  "w-full justify-start text-[#a37241] bg-[#a37241]/10 hover:bg-[#a37241]/20 hover:text-[#a37241]";
const INACTIVE_CLASSES =
  "w-full justify-start text-gray-400 hover:text-white hover:bg-white/5";

export default function FarmerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();

  const isActive = (match: string, exact = true) =>
    exact ? pathname === match : pathname.startsWith(match);

  return (
    <aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-xl hidden md:flex flex-col h-screen sticky top-0">
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
          onClick={() => router.push("/dashboard/farmer")}
        >
          <LayoutDashboard className="w-4 h-4 mr-3" />
          Dashboard
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/farmer/my-farms", false)
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => router.push("/dashboard/farmer/my-farms")}
        >
          <Sprout className="w-4 h-4 mr-3" />
          My Farms
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/farmer/investments")
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => router.push("/dashboard/farmer/investments")}
        >
          <DollarSign className="w-4 h-4 mr-3" />
          Investments
        </Button>

        <Button
          variant="ghost"
          className={
            isActive("/dashboard/farmer/create-farm")
              ? ACTIVE_CLASSES
              : INACTIVE_CLASSES
          }
          onClick={() => router.push("/dashboard/farmer/create-farm")}
        >
          <Plus className="w-4 h-4 mr-3" />
          Create Farm
        </Button>

        <Button variant="ghost" className={INACTIVE_CLASSES}>
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Button>
      </nav>

      <div className="p-4 border-t border-white/5">
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
          {logout.isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </aside>
  );
}
