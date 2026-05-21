import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harvverse | Partner Dashboard",
};

export default function PlayerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
