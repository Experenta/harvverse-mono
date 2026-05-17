"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Sprout } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { useCurrentUser } from "@/hooks/use-auth";
import { formatUsdFromCents } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/sign-in" as Route);
    }
  }, [user, userLoading, router]);

  if (userLoading || !user) {
    return (
      <div>
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user.displayName}!</h1>
        <p className="text-gray-400">
          You are logged in as a{" "}
          <span className="text-primary font-semibold capitalize">
            {user.role}
          </span>
        </p>
      </header>

      {user.role === "farmer" ? (
        <FarmerView userId={user.id} />
      ) : user.role === "partner" ? (
        <PartnerView clerkId={clerkUser?.id ?? ""} />
      ) : (
        <GlassCard className="p-8 border-primary/20">
          <p className="text-gray-400">
            No dashboard view for role{" "}
            <span className="text-white capitalize">{user.role}</span> yet.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

function FarmerView({ userId }: { userId: number }) {
  const router = useRouter();
  const { data: farms, isLoading } = useQuery(
    trpc.farms.list.queryOptions({ farmerId: userId }),
  );

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">My Farms</h2>
        <Button
          variant="outline"
          onClick={() => router.push("/farms" as Route)}
        >
          View all farms
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !farms || farms.length === 0 ? (
        <GlassCard className="p-8 text-center border-primary/20">
          <p className="text-gray-400">
            You haven't registered any farms yet.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {farms.map((farm) => (
            <GlassCard
              key={farm.id}
              className="p-6 border-primary/20 cursor-pointer"
              onClick={() => router.push(`/farms/${farm.id}`)}
            >
              <h3 className="text-lg font-bold mb-2">{farm.name}</h3>
              <p className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <MapPin className="w-4 h-4" />
                {farm.region}, {farm.country}
              </p>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-[#0a0e27]"
              >
                Manage
                <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </GlassCard>
          ))}
        </div>
      )}
    </section>
  );
}

function PartnerView({ clerkId }: { clerkId: string }) {
  const router = useRouter();
  const lotsQuery = useQuery(
    trpc.lots.list.queryOptions({ status: "available" }),
  );
  const proposalsQuery = useQuery(
    trpc.proposals.myProposals.queryOptions(
      { clerkId },
      { enabled: !!clerkId },
    ),
  );

  return (
    <div className="space-y-12">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Available Lots</h2>
          <Button variant="outline" onClick={() => router.push("/lots" as Route)}>
            View all lots
          </Button>
        </div>

        {lotsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !lotsQuery.data || lotsQuery.data.length === 0 ? (
          <GlassCard className="p-8 text-center border-primary/20">
            <p className="text-gray-400">No available lots right now.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lotsQuery.data.slice(0, 3).map((lot) => {
              const activePlan = lot.plans.find(
                (p) => p.status !== "revoked",
              );
              return (
                <GlassCard
                  key={lot.id}
                  className="p-6 border-primary/20 cursor-pointer"
                  onClick={() => router.push(`/lots/${lot.id}`)}
                >
                  <h3 className="text-lg font-bold mb-2">
                    {lot.code ?? `Lot #${lot.id}`}
                  </h3>
                  <p className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Sprout className="w-4 h-4" />
                    {lot.variety ?? "—"} · {lot.region}
                  </p>
                  {activePlan ? (
                    <p className="text-xl font-bold text-primary">
                      {formatUsdFromCents(activePlan.ticketCents)}
                    </p>
                  ) : null}
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">My Proposals</h2>

        {proposalsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !proposalsQuery.data || proposalsQuery.data.length === 0 ? (
          <GlassCard className="p-8 text-center border-primary/20">
            <p className="text-gray-400">No proposals yet.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposalsQuery.data.map((proposal) => (
              <GlassCard key={proposal.id} className="p-6 border-primary/20">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold">
                      {proposal.lot.code ?? `Lot #${proposal.lot.id}`}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {proposal.plan.planCode}
                    </p>
                  </div>
                  <Badge className="uppercase">{proposal.status}</Badge>
                </div>
                <p className="text-sm text-gray-300">
                  Revenue: {formatUsdFromCents(proposal.revenueCents)} · Profit:{" "}
                  {formatUsdFromCents(proposal.profitCents)}
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
