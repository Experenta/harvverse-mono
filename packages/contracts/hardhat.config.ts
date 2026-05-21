import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/web/.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    ...(process.env.CELO_SEPOLIA_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY
      ? {
          celoSepolia: {
            url: process.env.CELO_SEPOLIA_RPC_URL,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
            chainId: 44787,
          },
        }
      : {}),
  },
};

export default config;
