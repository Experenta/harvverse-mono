"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useChainId } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { keccak256, encodePacked, type Hex } from "viem";
import { useMutation } from "@tanstack/react-query";

import { MockUSDCAbi, HarvversePartnershipAbi } from "@harvverse-monorepo/contracts";
import { wagmiConfig } from "@/lib/wagmi";
import { queryClient, trpc } from "@/utils/trpc";
import { useCurrentUser } from "@/hooks/use-auth";

export type ReserveStep =
  | "idle"
  | "approving"
  | "approved"
  | "opening"
  | "confirmed"
  | "saving"
  | "done"
  | "error";

interface Projections {
  revenueCents: number;
  profitCents: number;
  farmerCents: number;
  partnerCents: number;
}

interface LotRef {
  id: number;
  code: string | null;
  farmerWallet: string;
}

interface PlanRef {
  id: number;
  ticketCents: number;
}

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useReservePartnership(params: {
  lot: LotRef | null;
  activePlan: PlanRef | null;
  projections: Projections | null;
  /** When provided, skips proposal creation and confirms an existing approved proposal */
  existingProposalId?: number | null;
}) {
  const { lot, activePlan, projections, existingProposalId } = params;
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: user, clerkUser } = useCurrentUser();

  const [step, setStep] = useState<ReserveStep>("idle");
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const createProposal = useMutation(trpc.proposals.create.mutationOptions());
  const updateProposal = useMutation(trpc.proposals.updateStatus.mutationOptions());
  const createPartnership = useMutation(trpc.partnerships.create.mutationOptions());
  const updateLotStatus = useMutation(trpc.lots.updateStatus.mutationOptions());

  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}` | undefined;
  const partnershipContractAddress = process.env.NEXT_PUBLIC_PARTNERSHIP_ADDRESS as `0x${string}` | undefined;

  const effectiveWallet = address ?? null;

  const isReady =
    !!lot &&
    !!activePlan &&
    !!projections &&
    !!effectiveWallet &&
    !!user &&
    !!usdcAddress &&
    !!partnershipContractAddress &&
    !!address;

  const start = useCallback(async () => {
    if (!lot || !activePlan || !projections || !address || !user || !usdcAddress || !partnershipContractAddress || !effectiveWallet) {
      setError(!address ? "Connect your wallet to invest." : "Contracts not configured — check NEXT_PUBLIC_USDC_ADDRESS and NEXT_PUBLIC_PARTNERSHIP_ADDRESS in .env.");
      setStep("error");
      return;
    }

    setStep("approving");
    setError(null);
    setTxHash(null);

    try {
      // 1 — Approve USDC spend: ticketCents * 10,000 (6-decimal USDC units)
      const ticketUsdcUnits = BigInt(activePlan.ticketCents) * BigInt(10000);

      const approveTx = await writeContractAsync({
        address: usdcAddress,
        abi: MockUSDCAbi,
        functionName: "approve",
        args: [partnershipContractAddress, ticketUsdcUnits],
      });
      setTxHash(approveTx);
      await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });
      setStep("approved");

      // 2 — Call invest() on HarvversePartnership
      setStep("opening");

      const lotKey = lot.code ?? String(lot.id);
      const onchainLotId = keccak256(encodePacked(["string"], [lotKey]));
      const onchainPartnershipId = keccak256(
        encodePacked(
          ["string", "address", "uint256"],
          [lotKey, address, BigInt(Date.now())],
        ),
      );

      const investTx = await writeContractAsync({
        address: partnershipContractAddress,
        abi: HarvversePartnershipAbi,
        functionName: "invest",
        args: [onchainPartnershipId, onchainLotId, activePlan.ticketCents],
      });
      setTxHash(investTx);
      await waitForTransactionReceipt(wagmiConfig, { hash: investTx });
      setStep("confirmed");

      // 3 — Persist to DB: proposal → partnership → lot status
      setStep("saving");

      const chainKey = chainId === 31337 ? ("hardhat" as const) : ("celoSepolia" as const);

      let proposalId: number;

      if (existingProposalId) {
        // Confirm an already-approved proposal: attach wallet address
        await updateProposal.mutateAsync({
          id: existingProposalId,
          status: "signed",
          walletAddress: effectiveWallet,
          submittedTxHash: investTx,
        });
        proposalId = existingProposalId;
      } else {
        // Legacy path: create proposal + partnership in one shot
        const proposalHash = await sha256Hex(
          JSON.stringify({ lotId: lot.id, planId: activePlan.id, userId: user.id, ts: Date.now() }),
        );

        const proposal = await createProposal.mutateAsync({
          lotId: lot.id,
          planId: activePlan.id,
          userId: user.id,
          walletAddress: effectiveWallet,
          partnershipType: "phygital",
          status: "signed",
          revenueCents: projections.revenueCents,
          profitCents: projections.profitCents,
          farmerCents: projections.farmerCents,
          partnerCents: projections.partnerCents,
          proposalHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        proposalId = proposal.id;
      }

      await createPartnership.mutateAsync({
        proposalId,
        lotId: lot.id,
        planId: activePlan.id,
        partnerUserId: user.id,
        partnerWallet: effectiveWallet,
        farmerWallet: lot.farmerWallet,
        status: "active",
        chainKey,
        openedTxHash: investTx,
      });

      await updateLotStatus.mutateAsync({ id: lot.id, status: "reserved" });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.lots.byId.queryKey({ id: lot.id }),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.lots.list.queryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.partnerships.myPartnerships.queryKey({
            clerkId: clerkUser?.id,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.proposals.myProposals.queryKey({
            clerkId: clerkUser?.id,
          }),
        }),
      ]);

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStep("error");
    }
  }, [
    lot,
    activePlan,
    projections,
    address,
    user,
    usdcAddress,
    partnershipContractAddress,
    effectiveWallet,
    chainId,
    existingProposalId,
    writeContractAsync,
    createProposal,
    updateProposal,
    createPartnership,
    updateLotStatus,
  ]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    step,
    txHash,
    error,
    isLoading: step !== "idle" && step !== "done" && step !== "error",
    isReady,
    start,
    reset,
  };
}
