"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useDisconnect } from "wagmi";

import { trpc } from "@/utils/trpc";

export function useCurrentUser() {
  const { user: clerkUser, isLoaded } = useUser();
  const { data: dbUser, isLoading: isLoadingDb } = useQuery({
    ...trpc.users.me.queryOptions({ clerkId: clerkUser?.id ?? "" }),
    enabled: isLoaded && !!clerkUser?.id,
  });

  return {
    data: dbUser ?? null,
    user: dbUser ?? null,
    clerkUser,
    isLoading: !isLoaded || isLoadingDb,
    isLoaded,
    isSignedIn: !!clerkUser,
    walletAddress: clerkUser?.web3Wallets?.[0]?.web3Wallet ?? null,
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
