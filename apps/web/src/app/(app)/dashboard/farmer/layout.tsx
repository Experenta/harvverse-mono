import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harvverse | Farmer Dashboard",
};

export default function FarmerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
