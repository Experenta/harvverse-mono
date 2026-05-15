"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (status === "disconnected") {
      router.replace("/login" as Route);
    }
  }, [status, router]);

  // During reconnect attempt on mount, render nothing to avoid flash.
  if (status === "disconnected") {
    return null;
  }

  return <>{children}</>;
}
