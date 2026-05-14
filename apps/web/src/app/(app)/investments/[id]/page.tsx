"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, Clock } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Progress } from "@harvverse-monorepo/ui/components/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@harvverse-monorepo/ui/components/dialog";

const mockInvestment = {
  id: 1,
  returnType: "PHYGITAL",
  farmName: "Finca Zafiro",
  lotName: "HVPLAN-ZAF-L02-2026",
  lotArea: "1",
  amount: "3425",
  status: "active",
};

type ActivityStatus = "released" | "in_progress" | "pending";

interface Activity {
  id: number;
  code: string;
  name: string;
  tokens: number;
  status: ActivityStatus;
  icon: string;
}

interface ScheduleMonth {
  month: number;
  monthName: string;
  subtotal: number;
  activities: Activity[];
}

const mockSchedule: {
  totalTokens: number;
  tokensReleased: number;
  schedule: ScheduleMonth[];
} = {
  totalTokens: 85,
  tokensReleased: 12,
  schedule: [
    {
      month: 1,
      monthName: "January",
      subtotal: 8,
      activities: [
        {
          id: 1,
          code: "FERT-001",
          name: "Fertilización Base",
          tokens: 5,
          status: "released",
          icon: "🌱",
        },
        {
          id: 2,
          code: "PEST-001",
          name: "Control de Plagas",
          tokens: 3,
          status: "released",
          icon: "🐛",
        },
      ],
    },
    {
      month: 2,
      monthName: "February",
      subtotal: 6,
      activities: [
        {
          id: 3,
          code: "PODA-001",
          name: "Poda de Formación",
          tokens: 6,
          status: "in_progress",
          icon: "✂️",
        },
      ],
    },
    {
      month: 3,
      monthName: "March",
      subtotal: 10,
      activities: [
        {
          id: 4,
          code: "RIEG-001",
          name: "Riego Tecnificado",
          tokens: 10,
          status: "pending",
          icon: "💧",
        },
      ],
    },
  ],
};

type SelectedToken = Activity & { monthName: string };

function ActivityRow({
  activity,
  monthName,
  onSelect,
}: {
  activity: Activity;
  monthName: string;
  onSelect: (token: SelectedToken) => void;
}) {
  return (
    <div
      onClick={() => onSelect({ ...activity, monthName })}
      className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-lg cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <span className="text-xl">{activity.icon}</span>
        <div>
          <p className="text-xs font-mono text-gray-500 mb-0.5">
            {activity.code}
          </p>
          <p className="font-semibold">{activity.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <p className="font-bold">{activity.tokens} HARVI</p>
        {activity.status === "released" && (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        )}
        {activity.status === "in_progress" && (
          <Clock className="w-4 h-4 text-yellow-400" />
        )}
        {activity.status === "pending" && <span>⏳</span>}
      </div>
    </div>
  );
}

export default function InvestmentDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(
    null,
  );
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>(
    { 1: true },
  );

  const fromFarmer = searchParams.get("from") === "farmer";
  const backPath = fromFarmer
    ? "/dashboard/farmer/investments"
    : "/my-investments";
  const backLabel = fromFarmer
    ? "Back to Farm Investments"
    : "Back to My Investments";

  const progressPercent = Math.round(
    (mockSchedule.tokensReleased / mockSchedule.totalTokens) * 100,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-8 text-white/70"
          onClick={() => router.push(backPath)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <GlassCard className="p-8 border-primary/20 h-full md:col-span-2">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">✨</span>
              <div>
                <h1 className="text-2xl font-bold uppercase">
                  {mockInvestment.returnType} Investment
                </h1>
                <p className="text-primary font-semibold">
                  {mockInvestment.farmName} • {mockInvestment.lotName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-400">Area</p>
                <p className="text-lg font-bold">
                  {mockInvestment.lotArea} manzanas
                </p>
              </div>
              <div>
                <p className="text-gray-400">Invested</p>
                <p className="text-lg font-bold text-primary">
                  ${Number(mockInvestment.amount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Status</p>
                <p className="text-lg font-bold capitalize">
                  {mockInvestment.status}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Yield Strategy</p>
                <p className="text-lg font-bold">Specialty Blend</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-sm font-semibold text-gray-400 mb-4">
                EXPECTED RETURNS
              </p>
              <ul className="space-y-2">
                <li>☕ 15 qq specialty coffee</li>
                <li>🪙 85 HARVI tokens</li>
                <li>📜 NFT Certificate</li>
                <li>📊 IoT Data Access</li>
              </ul>
            </div>
          </GlassCard>

          <GlassCard className="p-8 border-primary/20 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider">
                Investment Breakdown
              </p>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Agricultural Operations</span>
                  <span className="font-bold">$2,534.50</span>
                </div>
                <div className="flex justify-between">
                  <span>Digital Layer</span>
                  <span className="font-bold">$890.50</span>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-white/10 mt-6">
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>Total</span>
                <span>$3,425</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-8 border-primary/20 mb-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold uppercase tracking-tight">
                Token Release Schedule
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-1">Total Value</p>
              <p className="text-xl font-bold text-primary">
                {mockSchedule.totalTokens} HARVI
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">
                Progress: {progressPercent}%
              </span>
              <span className="font-bold text-primary">
                {mockSchedule.tokensReleased} of {mockSchedule.totalTokens}{" "}
                tokens released
              </span>
            </div>
            <Progress
              value={progressPercent}
              className="h-3 bg-black/40"
            />
          </div>

          <div className="space-y-4">
            {mockSchedule.schedule.map((month) => {
              const expanded = !!expandedMonths[month.month];
              return (
                <div
                  key={month.month}
                  className="border border-white/10 rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMonths((prev) => ({
                        ...prev,
                        [month.month]: !prev[month.month],
                      }))
                    }
                    className="w-full flex justify-between items-center p-4 bg-white/5 hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-primary text-xs">
                        {expanded ? "▼" : "▶"}
                      </span>
                      <h4 className="text-lg font-bold text-white uppercase tracking-wider">
                        📆 {month.monthName}
                      </h4>
                      <span className="text-xs text-gray-500">
                        ({month.activities.length} activities)
                      </span>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {month.subtotal} HARVI
                    </span>
                  </button>

                  {expanded && (
                    <div className="p-4 space-y-3 bg-black/20">
                      {month.activities.map((activity) => (
                        <ActivityRow
                          key={activity.id}
                          activity={activity}
                          monthName={month.monthName}
                          onSelect={setSelectedToken}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <Dialog
        open={!!selectedToken}
        onOpenChange={(open) => {
          if (!open) setSelectedToken(null);
        }}
      >
        <DialogContent className="bg-[#1a1f3a] text-white border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <span className="text-3xl">{selectedToken?.icon}</span>
              {selectedToken?.code}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-lg">
              {selectedToken?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedToken && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded-lg">
                  <p className="text-xs text-gray-400">Value</p>
                  <p className="text-xl font-bold text-primary">
                    {selectedToken.tokens} HARVI
                  </p>
                  <p className="text-xs text-gray-400">
                    (${selectedToken.tokens}.00 USD)
                  </p>
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                  <p className="text-xs text-gray-400">Scheduled</p>
                  <p className="text-xl font-bold">
                    {selectedToken.monthName} 2026
                  </p>
                </div>
              </div>

              <div className="bg-black/20 p-4 rounded-lg">
                <p className="text-xs text-gray-400">Status</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold text-yellow-400 uppercase tracking-wider">
                    Pending Release
                  </span>
                </div>
              </div>

              <p className="text-gray-300 text-sm">
                This token represents your contribution to the{" "}
                {selectedToken.name} activity. Tokens are released once the
                activity is verified on-chain by the producer and agricultural
                auditors.
              </p>

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold"
                onClick={() => setSelectedToken(null)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
