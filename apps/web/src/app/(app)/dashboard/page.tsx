"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-auth";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

export default function DashboardPage() {
  const { data: user, isLoading, isSignedIn } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "farmer") {
      router.replace("/dashboard/farmer" as Route);
    } else if (user) {
      router.replace("/dashboard/player" as Route);
    } else if (isSignedIn) {
      router.replace("/onboarding" as Route);
    } else {
      router.replace("/sign-in" as Route);
    }
  }, [user, isLoading, isSignedIn, router]);

  return (
    <div className="p-8">
      <Skeleton className="h-10 w-1/3 mb-6" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
