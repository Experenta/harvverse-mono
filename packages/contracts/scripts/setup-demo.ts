/**
 * setup-demo.ts — Deploy contracts to a local Hardhat node and configure the demo environment.
 *
 * Usage:
 *   npx hardhat node              (in a separate terminal)
 *   pnpm setup:demo               (runs this script against localhost:8545)
 *
 * What it does:
 *  1. Deploys MockUSDC, HarvverseLot, HarvversePartnership, HarvverseEvidence
 *  2. Grants OPERATOR_ROLE on HarvverseLot to the Partnership contract
 *  3. Registers the Finca Zafiro lot (HV-HN-ZAF-L02) on-chain
 *  4. Mints 10,000 mock USDC to the demo partner wallet (Hardhat accounts[1])
 *  5. Saves addresses to deployments/hardhat.json and apps/web/public/contracts/hardhat.json
 *  6. Updates apps/web/.env with NEXT_PUBLIC_ vars so the UI can find the contracts
 */

import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

// Finca Zafiro demo lot — must match seed.ts values
const DEMO_LOT_CODE = "HV-HN-ZAF-L02";
const DEMO_LOT = {
  targetYieldTenthsQq: 60,
  priceCentsPerLb: 350,
  ticketCents: 342500,
  farmerShareBps: 6000,
} as const;

async function main() {
  const [deployer, demoPartner] = await ethers.getSigners();

  console.log(`Network:          ${network.name}`);
  console.log(`Deployer:         ${deployer.address}`);
  console.log(`Demo partner:     ${demoPartner.address}`);

  // 1 — Deploy contracts
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`\nMockUSDC          → ${usdcAddress}`);

  const HarvverseLot = await ethers.getContractFactory("HarvverseLot");
  const lotContract = await HarvverseLot.deploy(deployer.address);
  await lotContract.waitForDeployment();
  const lotAddress = await lotContract.getAddress();
  console.log(`HarvverseLot      → ${lotAddress}`);

  const HarvversePartnership = await ethers.getContractFactory("HarvversePartnership");
  const partnership = await HarvversePartnership.deploy(deployer.address, usdcAddress, lotAddress);
  await partnership.waitForDeployment();
  const partnershipAddress = await partnership.getAddress();
  console.log(`HarvversePartnership → ${partnershipAddress}`);

  const HarvverseEvidence = await ethers.getContractFactory("HarvverseEvidence");
  const evidence = await HarvverseEvidence.deploy(deployer.address);
  await evidence.waitForDeployment();
  const evidenceAddress = await evidence.getAddress();
  console.log(`HarvverseEvidence → ${evidenceAddress}`);

  // 2 — Grant OPERATOR_ROLE on HarvverseLot to the Partnership contract
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  await lotContract.grantRole(OPERATOR_ROLE, partnershipAddress);
  console.log(`\nGranted OPERATOR_ROLE on HarvverseLot → HarvversePartnership`);

  // 3 — Register Finca Zafiro lot on-chain
  const onchainLotId = ethers.keccak256(ethers.toUtf8Bytes(DEMO_LOT_CODE));
  await lotContract.createLot(
    onchainLotId,
    deployer.address, // stand-in farmer for demo
    DEMO_LOT.targetYieldTenthsQq,
    DEMO_LOT.priceCentsPerLb,
    DEMO_LOT.ticketCents,
    DEMO_LOT.farmerShareBps,
  );
  console.log(`Registered lot ${DEMO_LOT_CODE} on-chain (id: ${onchainLotId.slice(0, 10)}…)`);

  // 4 — Mint 10,000 mock USDC to demo partner
  const mintAmount = ethers.parseUnits("10000", 6);
  await usdc.mint(demoPartner.address, mintAmount);
  console.log(`Minted 10,000 USDC to demo partner (${demoPartner.address})`);

  // 5 — Save deployment JSON
  const deploymentData = {
    chainId: 31337,
    network: "hardhat",
    deployer: deployer.address,
    contracts: {
      mockUsdc: usdcAddress,
      harvverseLot: lotAddress,
      harvversePartnership: partnershipAddress,
      harvverseEvidence: evidenceAddress,
    },
    demoPartnerWallet: demoPartner.address,
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, "hardhat.json"),
    JSON.stringify(deploymentData, null, 2),
  );

  const publicContractsDir = path.join(__dirname, "../../../apps/web/public/contracts");
  if (!fs.existsSync(publicContractsDir)) fs.mkdirSync(publicContractsDir, { recursive: true });
  fs.writeFileSync(
    path.join(publicContractsDir, "hardhat.json"),
    JSON.stringify(deploymentData, null, 2),
  );

  console.log(`\nDeployment saved → deployments/hardhat.json`);
  console.log(`Deployment saved → apps/web/public/contracts/hardhat.json`);

  // 6 — Update apps/web/.env with NEXT_PUBLIC_ vars
  const envPath = path.join(__dirname, "../../../apps/web/.env");
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  const filteredLines = existing
    .split("\n")
    .filter(
      (l) =>
        !l.startsWith("NEXT_PUBLIC_USE_LOCAL_CONTRACTS") &&
        !l.startsWith("NEXT_PUBLIC_HARDHAT_CHAIN_ID") &&
        !l.startsWith("NEXT_PUBLIC_USDC_ADDRESS") &&
        !l.startsWith("NEXT_PUBLIC_PARTNERSHIP_ADDRESS") &&
        !l.match(/^#?\s*NEXT_PUBLIC_DEMO_WALLET/),
    );

  const newVars = [
    "",
    "# Local Hardhat demo contracts — written by pnpm setup:demo",
    "NEXT_PUBLIC_USE_LOCAL_CONTRACTS=true",
    "NEXT_PUBLIC_HARDHAT_CHAIN_ID=31337",
    `NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`,
    `NEXT_PUBLIC_PARTNERSHIP_ADDRESS=${partnershipAddress}`,
    `NEXT_PUBLIC_DEMO_WALLET=${demoPartner.address}`,
  ];

  fs.writeFileSync(envPath, [...filteredLines, ...newVars].join("\n") + "\n");
  console.log(`Updated apps/web/.env with NEXT_PUBLIC_ vars`);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Demo setup complete! Next steps:                           ║
║                                                              ║
║  1. Import this private key into MetaMask:                   ║
║     0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603f5fd92fa ║
║     (Hardhat account #1 — the demo partner wallet)           ║
║                                                              ║
║  2. Add localhost:8545 (chain ID 31337) to MetaMask          ║
║                                                              ║
║  3. Run: pnpm dev:web                                        ║
║                                                              ║
║  4. The DB seed uses placeholder wallet addresses.           ║
║     Update FARMER_WALLET / PARTNER_WALLET in seed.ts to:    ║
║       FARMER_WALLET = ${deployer.address}  ║
║       PARTNER_WALLET = ${demoPartner.address}  ║
║     Then run: pnpm db:seed                                   ║
╚══════════════════════════════════════════════════════════════╝
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
