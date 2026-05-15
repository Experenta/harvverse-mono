import { Settings } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";

export default function SettingsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7" />
          Settings
        </h1>
      </header>
      <GlassCard className="p-12 text-center border-primary/20">
        <p className="text-gray-400 text-lg">Coming soon</p>
        <p className="text-gray-500 text-sm mt-2">
          Account settings will be available here.
        </p>
      </GlassCard>
    </div>
  );
}
