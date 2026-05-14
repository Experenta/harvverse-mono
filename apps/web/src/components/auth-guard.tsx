"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

const DEMO_WALLET = process.env.NEXT_PUBLIC_DEMO_WALLET ?? null;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!DEMO_WALLET && status === "disconnected") {
      router.replace("/login" as Route);
    }
  }, [status, router]);

  // During reconnect attempt on mount, render nothing to avoid flash.
  if (!DEMO_WALLET && status === "disconnected") {
    return null;
  }

  return <>{children}</>;
}
