"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

// Set NEXT_PUBLIC_DEMO_WALLET in .env.local to bypass wallet connection (dev only).
export const DEMO_WALLET = process.env.NEXT_PUBLIC_DEMO_WALLET ?? null;

export function useCurrentUser() {
  const { address } = useAccount();
  const walletAddress = DEMO_WALLET ?? address ?? null;

  const query = useQuery({
    ...trpc.users.me.queryOptions({ walletAddress: walletAddress ?? "" }),
    enabled: !!walletAddress,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
  };
}

export function useLogout() {
  const { disconnect } = useDisconnect();
  return {
    mutate: (_?: unknown, options?: { onSuccess?: () => void }) => {
      disconnect();
      options?.onSuccess?.();
    },
    isPending: false,
  };
}
