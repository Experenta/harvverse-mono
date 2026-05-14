import FarmerSidebar from "./_components/farmer-sidebar";

export default function FarmerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white flex">
      <FarmerSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
