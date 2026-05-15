"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function useCurrentUser() {
  const { address } = useAccount();
  const walletAddress = address ?? null;

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
