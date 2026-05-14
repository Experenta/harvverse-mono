import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_DEMO_WALLET: z.string().optional(),
    NEXT_PUBLIC_USE_LOCAL_CONTRACTS: z.enum(["true", "false"]).optional(),
    NEXT_PUBLIC_HARDHAT_CHAIN_ID: z.coerce.number().optional(),
    NEXT_PUBLIC_USDC_ADDRESS: z.string().optional(),
    NEXT_PUBLIC_PARTNERSHIP_ADDRESS: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DEMO_WALLET: process.env.NEXT_PUBLIC_DEMO_WALLET,
    NEXT_PUBLIC_USE_LOCAL_CONTRACTS: process.env.NEXT_PUBLIC_USE_LOCAL_CONTRACTS,
    NEXT_PUBLIC_HARDHAT_CHAIN_ID: process.env.NEXT_PUBLIC_HARDHAT_CHAIN_ID,
    NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
    NEXT_PUBLIC_PARTNERSHIP_ADDRESS: process.env.NEXT_PUBLIC_PARTNERSHIP_ADDRESS,
  },
  emptyStringAsUndefined: true,
});
