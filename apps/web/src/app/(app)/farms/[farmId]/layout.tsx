import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { db, farms } from "@harvverse-monorepo/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ farmId: string }>;
}): Promise<Metadata> {
  const { farmId } = await params;
  const farm = await db.query.farms.findFirst({
    where: eq(farms.id, Number(farmId)),
    columns: { name: true, id: true },
  });
  return {
    title: farm ? `Harvverse | ${farm.name}` : "Harvverse | Farm",
  };
}

export default function FarmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
