// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IHarvverseLot {
    function getLot(bytes32 lotId) external view returns (
        bytes32,
        address farmer,
        uint32 targetYieldTenthsQq,
        uint32 priceCentsPerLb,
        uint32 ticketCents,
        uint32 farmerShareBps,
        uint8 status,
        uint64 createdAt
    );

    function updateLotStatus(bytes32 lotId, uint8 newStatus) external;
}

/// @dev Escrows USDC investment tickets and settles revenue at harvest.
/// All monetary inputs are in cents; 1 cent = 10,000 USDC base units (6 decimals).
contract HarvversePartnership is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant CENTS_TO_USDC = 10_000;

    // LotStatus.Funded == 1
    uint8 private constant STATUS_FUNDED = 1;
    // LotStatus.Settled == 4
    uint8 private constant STATUS_SETTLED = 4;
    // LotStatus.Cancelled == 5
    uint8 private constant STATUS_CANCELLED = 5;

    IERC20 public immutable usdc;
    IHarvverseLot public immutable lotContract;

    struct Partnership {
        address partner;
        bytes32 lotId;
        uint32 ticketCents;
        bool settled;
        bool refunded;
    }

    mapping(bytes32 => Partnership) public partnerships;
    // partnershipId => lotId linkage tracked via Partnership struct

    event PartnershipCreated(bytes32 indexed partnershipId, bytes32 indexed lotId, address indexed partner);
    event SettlementPaid(bytes32 indexed partnershipId, address indexed partner, uint256 usdcAmount);
    event RefundIssued(bytes32 indexed partnershipId, address indexed partner, uint256 usdcAmount);

    constructor(address admin, address _usdc, address _lotContract) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        usdc = IERC20(_usdc);
        lotContract = IHarvverseLot(_lotContract);
    }

    /// @dev Partner calls this to commit their ticket. USDC is pulled from partner.
    function invest(
        bytes32 partnershipId,
        bytes32 lotId,
        uint32 ticketCents
    ) external nonReentrant {
        require(partnerships[partnershipId].ticketCents == 0, "Partnership already exists");

        uint256 usdcAmount = uint256(ticketCents) * CENTS_TO_USDC;
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        partnerships[partnershipId] = Partnership({
            partner: msg.sender,
            lotId: lotId,
            ticketCents: ticketCents,
            settled: false,
            refunded: false
        });

        lotContract.updateLotStatus(lotId, STATUS_FUNDED);

        emit PartnershipCreated(partnershipId, lotId, msg.sender);
    }

    /// @dev Operator calls after harvest with actual yield and agronomic cost.
    ///      Revenue = yieldTenthsQq * 833 * priceCentsPerLb / 100
    ///      Profit  = revenue - ticketCents
    ///      Partner gets: ticketCents - agronomicCostCents + partnerShare
    function recordSettlement(
        bytes32 partnershipId,
        uint32 actualYieldTenthsQq,
        uint32 agronomicCostCents
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Partnership storage p = partnerships[partnershipId];
        require(p.ticketCents > 0, "Partnership not found");
        require(!p.settled && !p.refunded, "Already finalized");
        require(p.ticketCents >= agronomicCostCents, "Agronomic cost exceeds ticket");

        (
            ,
            ,
            ,
            uint32 priceCentsPerLb,
            ,
            uint32 farmerShareBps,
            ,

        ) = lotContract.getLot(p.lotId);

        uint256 revenueCents = (uint256(actualYieldTenthsQq) * 833 * uint256(priceCentsPerLb)) / 100;
        uint256 profitCents = revenueCents > p.ticketCents ? revenueCents - p.ticketCents : 0;
        uint256 partnerShareBps = 10_000 - farmerShareBps;
        uint256 partnerCents = (profitCents * partnerShareBps) / 10_000;

        uint256 partnerReturn = (uint256(p.ticketCents) - uint256(agronomicCostCents) + partnerCents) * CENTS_TO_USDC;

        // If the payout exceeds the escrowed ticket, the operator deposits the delta
        // (coffee sale proceeds flow through the operator/platform before on-chain settlement)
        uint256 escrowed = uint256(p.ticketCents) * CENTS_TO_USDC;
        if (partnerReturn > escrowed) {
            usdc.safeTransferFrom(msg.sender, address(this), partnerReturn - escrowed);
        }

        p.settled = true;
        lotContract.updateLotStatus(p.lotId, STATUS_SETTLED);

        usdc.safeTransfer(p.partner, partnerReturn);
        emit SettlementPaid(partnershipId, p.partner, partnerReturn);
    }

    /// @dev Operator issues full refund when a lot is cancelled.
    function refund(bytes32 partnershipId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Partnership storage p = partnerships[partnershipId];
        require(p.ticketCents > 0, "Partnership not found");
        require(!p.settled && !p.refunded, "Already finalized");

        uint256 usdcAmount = uint256(p.ticketCents) * CENTS_TO_USDC;

        p.refunded = true;
        lotContract.updateLotStatus(p.lotId, STATUS_CANCELLED);

        usdc.safeTransfer(p.partner, usdcAmount);
        emit RefundIssued(partnershipId, p.partner, usdcAmount);
    }
}
