"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Wallet, ArrowLeft } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";

import { queryClient, trpc } from "@/utils/trpc";

type Role = "partner" | "farmer";

const DEMO_WALLET = process.env.NEXT_PUBLIC_DEMO_WALLET ?? null;

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [step, setStep] = useState<"connect" | "role" | "saving">("connect");
  const [isMiniPay, setIsMiniPay] = useState(false);
  // Only true after the user explicitly clicks "Connect Wallet", MiniPay auto-detects,
  // or DEMO_WALLET bypasses real connection. Prevents wagmi's auto-reconnect on mount
  // from silently driving the login flow before the user clicks anything.
  const [hasTriggeredConnect, setHasTriggeredConnect] = useState(
    DEMO_WALLET !== null,
  );

  const walletAddress = DEMO_WALLET ?? address ?? null;

  // Detect MiniPay environment (only available on client after mount)
  useEffect(() => {
    const detected = !!(
      window as unknown as { ethereum?: { isMiniPay?: boolean } }
    ).ethereum?.isMiniPay;
    setIsMiniPay(detected);
  }, []);

  // Auto-connect when running inside MiniPay webview
  useEffect(() => {
    if (!isMiniPay || isConnected || isConnecting) return;
    const miniPayConnector = connectors.find((c) => c.id === "miniPay");
    if (miniPayConnector) {
      setHasTriggeredConnect(true);
      connect({ connector: miniPayConnector });
    }
  }, [isMiniPay, connectors, isConnected, isConnecting, connect]);

  const { data: existingUser, isLoading: userLoading } = useQuery({
    ...trpc.users.me.queryOptions({ walletAddress: walletAddress ?? "" }),
    enabled: hasTriggeredConnect && !!walletAddress,
  });

  const upsertUser = useMutation(trpc.users.upsert.mutationOptions());

  // Redirect existing users, or advance to role picker for new ones.
  // Only runs after the user has triggered the connect flow.
  useEffect(() => {
    if (!hasTriggeredConnect || !walletAddress || userLoading) return;
    if (existingUser) {
      const dest =
        existingUser.role === "farmer"
          ? "/dashboard/farmer"
          : "/dashboard/player";
      router.replace(dest as Route);
    } else {
      setStep("role");
    }
  }, [hasTriggeredConnect, existingUser, walletAddress, userLoading, router]);

  async function handleConfirmRole() {
    if (!walletAddress || !selectedRole) return;
    setStep("saving");
    try {
      const displayName = address
        ? `${address.slice(0, 6)}…${address.slice(-4)}`
        : walletAddress;
      const user = await upsertUser.mutateAsync({
        walletAddress,
        role: selectedRole,
        displayName,
      });
      await queryClient.invalidateQueries({
        queryKey: trpc.users.me.queryKey({ walletAddress }),
      });
      const dest =
        user.role === "farmer" ? "/dashboard/farmer" : "/dashboard/player";
      router.replace(dest as Route);
    } catch {
      setStep("role");
    }
  }

  // Pick the right connector for the button: MiniPay if detected, else generic injected
  const buttonConnector = isMiniPay
    ? connectors.find((c) => c.id === "miniPay")
    : connectors.find((c) => c.id === "injected");

  // True only when the user has clicked and we're waiting for something
  const isActivelyLoading =
    hasTriggeredConnect && (isConnecting || (isConnected && userLoading));

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 z-20">
        <Link href="/">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Harvverse" className="h-14 w-auto" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">
              {step === "connect" ? "Welcome to Harvverse" : "Choose Your Role"}
            </h1>
            <div className="h-1 w-20 bg-primary rounded-full mx-auto" />
          </div>

          {step === "connect" && (
            <div className="space-y-4">
              {isMiniPay ? (
                // MiniPay auto-connects — show loading state
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-gray-400">
                    Connecting with MiniPay…
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400 text-center">
                    Connect your Web3 wallet to continue
                  </p>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold h-12"
                    disabled={isActivelyLoading || !buttonConnector}
                    onClick={() => {
                      if (!buttonConnector) return;
                      setHasTriggeredConnect(true);
                      // If wagmi already reconnected silently, no need to call connect again;
                      // setting the flag above is enough to trigger the redirect effect.
                      if (!isConnected) {
                        connect({ connector: buttonConnector });
                      }
                    }}
                  >
                    {isActivelyLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wallet className="w-4 h-4 mr-2" />
                    )}
                    {isActivelyLoading
                      ? isConnecting
                        ? "Connecting…"
                        : "Loading…"
                      : "Connect Wallet"}
                  </Button>
                  {!buttonConnector && (
                    <p className="text-xs text-yellow-400 text-center">
                      No wallet detected. Install MetaMask or Rabby to
                      continue.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {(step === "role" || step === "saving") && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 text-center">
                How will you use Harvverse?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedRole("partner")}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedRole === "partner"
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/30 bg-white/5"
                  }`}
                >
                  <div className="text-2xl mb-2">💎</div>
                  <p className="font-bold text-white">Partner</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Invest in coffee lots
                  </p>
                </button>
                <button
                  onClick={() => setSelectedRole("farmer")}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedRole === "farmer"
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/30 bg-white/5"
                  }`}
                >
                  <div className="text-2xl mb-2">🌿</div>
                  <p className="font-bold text-white">Farmer</p>
                  <p className="text-xs text-gray-400 mt-1">
                    List your coffee lots
                  </p>
                </button>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold h-11"
                disabled={!selectedRole || step === "saving"}
                onClick={handleConfirmRole}
              >
                {step === "saving" && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {step === "saving" ? "Setting up…" : "Continue →"}
              </Button>
              <button
                onClick={() => {
                  disconnect();
                  setStep("connect");
                  setSelectedRole(null);
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Use a different wallet
              </button>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
