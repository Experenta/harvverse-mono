import { expect } from "chai";
import { ethers } from "hardhat";
import type { MockUSDC, HarvverseLot, HarvversePartnership, HarvverseEvidence } from "../typechain-types";

// Finca Zafiro scenario constants
const TICKET_CENTS = 342_500;         // $3,425.00 investment ticket
const TARGET_YIELD_TENTHS_QQ = 600;   // 60.0 quintals
const PRICE_CENTS_PER_LB = 350;       // $3.50/lb
const FARMER_SHARE_BPS = 6_000;       // 60% farmer profit share
const ACTUAL_YIELD_TENTHS_QQ = 600;   // at-target harvest
const AGRONOMIC_COST_CENTS = 149_000; // $1,490.00 agronomic cost

// Expected math:
// revenueCents = 600 * 833 * 350 / 100 = 1,749,300  (using tenths: 60 qq * 833 lbs/qq * $3.50/lb)
// Wait: yieldTenthsQq = 600 means 60.0 qq
// revenueCents = (600 * 833 * 350) / 100 = 174,930,000 / 100 = 1,749,300
// profitCents = 1,749,300 - 342,500 = 1,406,800
// partnerShareBps = 10000 - 6000 = 4000
// partnerCents = 1,406,800 * 4000 / 10000 = 562,720
// partnerReturn = (342,500 - 149,000 + 562,720) * 10,000 = 756,220 * 10,000 = 7,562,200,000 USDC units

const CENTS_TO_USDC = 10_000n;
const REVENUE_CENTS = (BigInt(ACTUAL_YIELD_TENTHS_QQ) * 833n * BigInt(PRICE_CENTS_PER_LB)) / 100n;
const PROFIT_CENTS = REVENUE_CENTS - BigInt(TICKET_CENTS);
const PARTNER_SHARE_BPS = 10_000n - BigInt(FARMER_SHARE_BPS);
const PARTNER_CENTS = (PROFIT_CENTS * PARTNER_SHARE_BPS) / 10_000n;
const EXPECTED_PARTNER_RETURN =
  (BigInt(TICKET_CENTS) - BigInt(AGRONOMIC_COST_CENTS) + PARTNER_CENTS) * CENTS_TO_USDC;

describe("Harvverse — Finca Zafiro happy path", function () {
  let usdc: MockUSDC;
  let lotContract: HarvverseLot;
  let partnership: HarvversePartnership;
  let evidence: HarvverseEvidence;

  let admin: Awaited<ReturnType<typeof ethers.getSigner>>;
  let farmer: Awaited<ReturnType<typeof ethers.getSigner>>;
  let partner: Awaited<ReturnType<typeof ethers.getSigner>>;

  const LOT_ID = ethers.keccak256(ethers.toUtf8Bytes("finca-zafiro-lot-1"));
  const PARTNERSHIP_ID = ethers.keccak256(ethers.toUtf8Bytes("finca-zafiro-partnership-1"));
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));

  before(async function () {
    [admin, farmer, partner] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const HarvverseLot = await ethers.getContractFactory("HarvverseLot");
    lotContract = await HarvverseLot.deploy(admin.address);

    const HarvversePartnership = await ethers.getContractFactory("HarvversePartnership");
    partnership = await HarvversePartnership.deploy(
      admin.address,
      await usdc.getAddress(),
      await lotContract.getAddress()
    );

    const HarvverseEvidence = await ethers.getContractFactory("HarvverseEvidence");
    evidence = await HarvverseEvidence.deploy(admin.address);

    // Grant OPERATOR_ROLE on HarvverseLot to Partnership (so it can update status)
    await lotContract.connect(admin).grantRole(OPERATOR_ROLE, await partnership.getAddress());

    // Mint ticket amount to partner
    const ticketUsdc = BigInt(TICKET_CENTS) * CENTS_TO_USDC;
    await usdc.mint(partner.address, ticketUsdc);
    await usdc.connect(partner).approve(await partnership.getAddress(), ticketUsdc);
  });

  it("admin creates a lot on-chain", async function () {
    await lotContract
      .connect(admin)
      .createLot(
        LOT_ID,
        farmer.address,
        TARGET_YIELD_TENTHS_QQ,
        PRICE_CENTS_PER_LB,
        TICKET_CENTS,
        FARMER_SHARE_BPS
      );

    const lot = await lotContract.getLot(LOT_ID);
    expect(lot.farmer).to.equal(farmer.address);
    expect(lot.ticketCents).to.equal(TICKET_CENTS);
    expect(lot.status).to.equal(0n); // LotStatus.Created
  });

  it("partner invests — escrow receives USDC and lot moves to Funded", async function () {
    const partnerBalanceBefore = await usdc.balanceOf(partner.address);

    await partnership.connect(partner).invest(PARTNERSHIP_ID, LOT_ID, TICKET_CENTS);

    const partnerBalanceAfter = await usdc.balanceOf(partner.address);
    const escrowBalance = await usdc.balanceOf(await partnership.getAddress());
    const ticketUsdc = BigInt(TICKET_CENTS) * CENTS_TO_USDC;

    expect(partnerBalanceBefore - partnerBalanceAfter).to.equal(ticketUsdc);
    expect(escrowBalance).to.equal(ticketUsdc);

    const lot = await lotContract.getLot(LOT_ID);
    expect(lot.status).to.equal(1n); // LotStatus.Funded
  });

  it("operator adds agronomist visit evidence", async function () {
    await evidence
      .connect(admin)
      .addEvidence(
        LOT_ID,
        3, // EvidenceType.AgronomistVisit
        "bafybeiabc123",
        "Initial farm visit — conditions good"
      );

    const count = await evidence.getEvidenceCount(LOT_ID);
    expect(count).to.equal(1n);

    const records = await evidence.getEvidence(LOT_ID);
    expect(records[0]!.cid).to.equal("bafybeiabc123");
    expect(records[0]!.evidenceType).to.equal(3n);
  });

  it("operator adds NDVI report evidence", async function () {
    await evidence
      .connect(admin)
      .addEvidence(LOT_ID, 1, "bafybeindvi456", "Mid-season NDVI — healthy canopy");

    const count = await evidence.getEvidenceCount(LOT_ID);
    expect(count).to.equal(2n);
  });

  it("operator records settlement — partner receives capital minus costs plus profit share", async function () {
    const partnerBalanceBefore = await usdc.balanceOf(partner.address);

    // Operator (platform) holds coffee sale proceeds; deposit delta above escrowed ticket
    const escrowed = BigInt(TICKET_CENTS) * CENTS_TO_USDC;
    if (EXPECTED_PARTNER_RETURN > escrowed) {
      const delta = EXPECTED_PARTNER_RETURN - escrowed;
      await usdc.mint(admin.address, delta);
      await usdc.connect(admin).approve(await partnership.getAddress(), delta);
    }

    await partnership
      .connect(admin)
      .recordSettlement(PARTNERSHIP_ID, ACTUAL_YIELD_TENTHS_QQ, AGRONOMIC_COST_CENTS);

    const partnerBalanceAfter = await usdc.balanceOf(partner.address);
    const received = partnerBalanceAfter - partnerBalanceBefore;

    expect(received).to.equal(EXPECTED_PARTNER_RETURN);

    const lot = await lotContract.getLot(LOT_ID);
    expect(lot.status).to.equal(4n); // LotStatus.Settled
  });

  it("partnership is marked settled — cannot re-settle", async function () {
    await expect(
      partnership.connect(admin).recordSettlement(PARTNERSHIP_ID, ACTUAL_YIELD_TENTHS_QQ, 0)
    ).to.be.revertedWith("Already finalized");
  });

  it("cannot duplicate a lot ID", async function () {
    await expect(
      lotContract
        .connect(admin)
        .createLot(LOT_ID, farmer.address, TARGET_YIELD_TENTHS_QQ, PRICE_CENTS_PER_LB, TICKET_CENTS, FARMER_SHARE_BPS)
    ).to.be.revertedWith("Lot already exists");
  });

  it("non-operator cannot create a lot", async function () {
    const otherLotId = ethers.keccak256(ethers.toUtf8Bytes("unauthorized-lot"));
    await expect(
      lotContract
        .connect(farmer)
        .createLot(otherLotId, farmer.address, 100, 300, 100_000, 6_000)
    ).to.be.reverted;
  });

  it("refund path — cancels a separate lot and returns full ticket", async function () {
    const cancelLotId = ethers.keccak256(ethers.toUtf8Bytes("cancel-lot-1"));
    const cancelPartnershipId = ethers.keccak256(ethers.toUtf8Bytes("cancel-partnership-1"));
    const smallTicket = 50_000; // $500
    const smallUsdc = BigInt(smallTicket) * CENTS_TO_USDC;

    // Setup second lot + partner
    const [, , , , secondPartner] = await ethers.getSigners();
    await usdc.mint(secondPartner!.address, smallUsdc);
    await usdc.connect(secondPartner!).approve(await partnership.getAddress(), smallUsdc);

    await lotContract
      .connect(admin)
      .createLot(cancelLotId, farmer.address, 100, 300, smallTicket, 6_000);

    await partnership.connect(secondPartner!).invest(cancelPartnershipId, cancelLotId, smallTicket);

    const balanceBefore = await usdc.balanceOf(secondPartner!.address);
    await partnership.connect(admin).refund(cancelPartnershipId);
    const balanceAfter = await usdc.balanceOf(secondPartner!.address);

    expect(balanceAfter - balanceBefore).to.equal(smallUsdc);

    const lot = await lotContract.getLot(cancelLotId);
    expect(lot.status).to.equal(5n); // LotStatus.Cancelled
  });
});
