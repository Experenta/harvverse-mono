"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import FarmerSidebar from "@/app/(app)/dashboard/farmer/_components/farmer-sidebar";
import PlayerSidebar from "@/app/(app)/dashboard/player/_components/player-sidebar";

interface Props {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ isMobileOpen, onClose }: Props) {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  if (user.role === "farmer")
    return <FarmerSidebar isMobileOpen={isMobileOpen} onClose={onClose} />;
  return <PlayerSidebar isMobileOpen={isMobileOpen} onClose={onClose} />;
}
