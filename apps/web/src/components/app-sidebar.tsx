"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import FarmerSidebar from "@/app/(app)/dashboard/farmer/_components/farmer-sidebar";
import PlayerSidebar from "@/app/(app)/dashboard/player/_components/player-sidebar";

export default function AppSidebar() {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  if (user.role === "farmer") return <FarmerSidebar />;
  return <PlayerSidebar />;
}
