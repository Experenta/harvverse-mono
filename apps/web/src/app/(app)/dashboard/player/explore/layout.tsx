import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harvverse | Explore Lots",
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
