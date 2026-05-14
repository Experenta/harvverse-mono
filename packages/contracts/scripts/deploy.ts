import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);
  console.log(`Network: ${network.name}`);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`MockUSDC deployed to: ${usdcAddress}`);

  const HarvverseLot = await ethers.getContractFactory("HarvverseLot");
  const lot = await HarvverseLot.deploy(deployer.address);
  await lot.waitForDeployment();
  const lotAddress = await lot.getAddress();
  console.log(`HarvverseLot deployed to: ${lotAddress}`);

  const HarvversePartnership = await ethers.getContractFactory("HarvversePartnership");
  const partnership = await HarvversePartnership.deploy(deployer.address, usdcAddress, lotAddress);
  await partnership.waitForDeployment();
  const partnershipAddress = await partnership.getAddress();
  console.log(`HarvversePartnership deployed to: ${partnershipAddress}`);

  // Grant OPERATOR_ROLE on HarvverseLot to the Partnership contract
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  await lot.grantRole(OPERATOR_ROLE, partnershipAddress);
  console.log(`Granted OPERATOR_ROLE on HarvverseLot to HarvversePartnership`);

  const HarvverseEvidence = await ethers.getContractFactory("HarvverseEvidence");
  const evidence = await HarvverseEvidence.deploy(deployer.address);
  await evidence.waitForDeployment();
  const evidenceAddress = await evidence.getAddress();
  console.log(`HarvverseEvidence deployed to: ${evidenceAddress}`);

  const deployments = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      MockUSDC: usdcAddress,
      HarvverseLot: lotAddress,
      HarvversePartnership: partnershipAddress,
      HarvverseEvidence: evidenceAddress,
    },
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`Deployment addresses saved to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
