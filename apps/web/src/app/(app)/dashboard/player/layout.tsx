import PlayerSidebar from "./_components/player-sidebar";

export default function PlayerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white flex">
      <PlayerSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
