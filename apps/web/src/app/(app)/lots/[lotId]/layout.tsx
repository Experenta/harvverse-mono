import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { db, lots } from "@harvverse-monorepo/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lotId: string }>;
}): Promise<Metadata> {
  const { lotId } = await params;
  const lot = await db.query.lots.findFirst({
    where: eq(lots.id, Number(lotId)),
    columns: { code: true, id: true },
  });
  return {
    title: lot
      ? `Harvverse | ${lot.code ?? `Lot #${lot.id}`}`
      : "Harvverse | Lot",
  };
}

export default function LotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
