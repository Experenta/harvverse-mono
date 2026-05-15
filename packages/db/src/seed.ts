import { createHash } from "node:crypto";

import { db } from "./index";
import {
  farms,
  lots,
  plans,
  users,
  type Farm,
  type Lot,
  type Plan,
  type User,
} from "./schema";
import { and, eq } from "drizzle-orm";

const DEMO_LOT = {
  lotCode: "HV-HN-ZAF-L02",
  farmName: "Zafiro",
  country: "Honduras",
  region: "Comayagua",
  latitude: "14.9465",
  longitude: "-88.0863",
  altitudeMasl: 1300,
  variety: "Parainema",
  areaManzanas: "1.0",
  ticketCents: 342500,
  farmerShareBps: 6000,
  partnerShareBps: 4000,
} as const;

const FARMER_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PARTNER_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const PLAN_CODE = "HVPLAN-ZAF-L02-2026";

function sha256Hex(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

async function upsertUser(values: {
  walletAddress: string;
  displayName: string;
  role: "farmer" | "partner";
}): Promise<User> {
  await db.insert(users).values(values).onConflictDoNothing({
    target: users.walletAddress,
  });
  const user = await db.query.users.findFirst({
    where: eq(users.walletAddress, values.walletAddress),
  });
  if (!user) throw new Error(`Failed to upsert user ${values.walletAddress}`);
  return user;
}

async function upsertFarm(
  values: Omit<typeof farms.$inferInsert, "id" | "createdAt" | "updatedAt">,
): Promise<Farm> {
  const existing = await db.query.farms.findFirst({
    where: and(eq(farms.farmerId, values.farmerId), eq(farms.name, values.name)),
  });
  if (existing) return existing;
  const [farm] = await db.insert(farms).values(values).returning();
  if (!farm) throw new Error(`Failed to insert farm ${values.name}`);
  return farm;
}

async function upsertLot(
  values: Omit<typeof lots.$inferInsert, "id" | "createdAt" | "updatedAt">,
): Promise<Lot> {
  await db.insert(lots).values(values).onConflictDoNothing({
    target: lots.code,
  });
  if (!values.code) throw new Error("Lot code is required for seed");
  const lot = await db.query.lots.findFirst({
    where: eq(lots.code, values.code),
  });
  if (!lot) throw new Error(`Failed to upsert lot ${values.code}`);
  return lot;
}

async function upsertPlan(
  values: Omit<typeof plans.$inferInsert, "id" | "createdAt" | "updatedAt">,
): Promise<Plan> {
  await db.insert(plans).values(values).onConflictDoNothing({
    target: plans.planCode,
  });
  const plan = await db.query.plans.findFirst({
    where: eq(plans.planCode, values.planCode),
  });
  if (!plan) throw new Error(`Failed to upsert plan ${values.planCode}`);
  return plan;
}

async function seed() {
  console.log("Seeding Harvverse demo data...");

  const farmer = await upsertUser({
    walletAddress: FARMER_WALLET,
    displayName: "Jorge Lanza",
    role: "farmer",
  });
  console.log(`  farmer user #${farmer.id} (${farmer.walletAddress})`);

  const partner = await upsertUser({
    walletAddress: PARTNER_WALLET,
    displayName: "Demo Partner",
    role: "partner",
  });
  console.log(`  partner user #${partner.id} (${partner.walletAddress})`);

  const farm = await upsertFarm({
    farmerId: farmer.id,
    name: "Finca Zafiro",
    country: DEMO_LOT.country,
    region: DEMO_LOT.region,
    altitudeMasl: DEMO_LOT.altitudeMasl,
    areaManzanas: DEMO_LOT.areaManzanas,
    varieties: [DEMO_LOT.variety],
    latitude: DEMO_LOT.latitude,
    longitude: DEMO_LOT.longitude,
    coeScore: "92.75",
    verified: true,
  });
  console.log(`  farm #${farm.id} (${farm.name})`);

  const lot = await upsertLot({
    farmId: farm.id,
    code: DEMO_LOT.lotCode,
    farmName: farm.name,
    farmerWallet: FARMER_WALLET,
    region: DEMO_LOT.region,
    country: DEMO_LOT.country,
    variety: DEMO_LOT.variety,
    altitudeMasl: DEMO_LOT.altitudeMasl,
    areaManzanas: DEMO_LOT.areaManzanas,
    gpsLat: DEMO_LOT.latitude,
    gpsLng: DEMO_LOT.longitude,
    harvestYear: 2026,
    status: "available",
    activePlanCode: PLAN_CODE,
  });
  console.log(`  lot #${lot.id} (${lot.code})`);

  const planEconomics = {
    planCode: PLAN_CODE,
    lotCode: DEMO_LOT.lotCode,
    ticketCents: DEMO_LOT.ticketCents,
    priceCentsPerLb: 350,
    priceFloorCentsPerLb: 250,
    agronomicCostCents: 149000,
    projectedYieldY1TenthsQq: 60,
    yieldCapY1TenthsQq: 80,
    splitFarmerBps: DEMO_LOT.farmerShareBps,
    splitPartnerBps: DEMO_LOT.partnerShareBps,
  };

  const plan = await upsertPlan({
    ...planEconomics,
    lotId: lot.id,
    version: "v1",
    status: "approved_for_demo",
    validatedByName: "Jorge Alberto Lanza",
    validatedByCredential: "Cup of Excellence Honduras 2013",
    planHash: sha256Hex(planEconomics),
  });
  console.log(`  plan #${plan.id} (${plan.planCode})`);

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
