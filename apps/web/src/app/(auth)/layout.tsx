export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#0a0e27]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#a37241]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
