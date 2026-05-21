export const MockUSDCAbi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "allowance", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "approver", type: "address" }],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "receiver", type: "address" }],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "spender", type: "address" }],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "address", name: "spender", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const HarvverseLotAbi = [
  {
    inputs: [{ internalType: "address", name: "admin", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "bytes32", name: "neededRole", type: "bytes32" },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "lotId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "farmer", type: "address" },
    ],
    name: "LotCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "lotId", type: "bytes32" },
      { indexed: false, internalType: "uint8", name: "status", type: "uint8" },
    ],
    name: "LotStatusUpdated",
    type: "event",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "lotId", type: "bytes32" },
      { internalType: "address", name: "farmer", type: "address" },
      { internalType: "uint32", name: "targetYieldTenthsQq", type: "uint32" },
      { internalType: "uint32", name: "priceCentsPerLb", type: "uint32" },
      { internalType: "uint32", name: "ticketCents", type: "uint32" },
      { internalType: "uint32", name: "farmerShareBps", type: "uint32" },
    ],
    name: "createLot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "lotId", type: "bytes32" }],
    name: "getLot",
    outputs: [
      {
        components: [
          { internalType: "bytes32", name: "lotId", type: "bytes32" },
          { internalType: "address", name: "farmer", type: "address" },
          { internalType: "uint32", name: "targetYieldTenthsQq", type: "uint32" },
          { internalType: "uint32", name: "priceCentsPerLb", type: "uint32" },
          { internalType: "uint32", name: "ticketCents", type: "uint32" },
          { internalType: "uint32", name: "farmerShareBps", type: "uint32" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "uint64", name: "createdAt", type: "uint64" },
        ],
        internalType: "struct HarvverseLot.LotRecord",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }],
    name: "getRoleAdmin",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "hasRole",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "lotId", type: "bytes32" },
      { internalType: "uint8", name: "newStatus", type: "uint8" },
    ],
    name: "updateLotStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OPERATOR_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const HarvversePartnershipAbi = [
  {
    inputs: [
      { internalType: "address", name: "admin", type: "address" },
      { internalType: "address", name: "_usdc", type: "address" },
      { internalType: "address", name: "_lotContract", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "bytes32", name: "neededRole", type: "bytes32" },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "partnershipId", type: "bytes32" },
      { indexed: true, internalType: "bytes32", name: "lotId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "partner", type: "address" },
    ],
    name: "PartnershipCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "partnershipId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "partner", type: "address" },
      { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
    ],
    name: "RefundIssued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "partnershipId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "partner", type: "address" },
      { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
    ],
    name: "SettlementPaid",
    type: "event",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "partnershipId", type: "bytes32" },
      { internalType: "bytes32", name: "lotId", type: "bytes32" },
      { internalType: "uint32", name: "ticketCents", type: "uint32" },
    ],
    name: "invest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "partnershipId", type: "bytes32" },
      { internalType: "uint32", name: "actualYieldTenthsQq", type: "uint32" },
      { internalType: "uint32", name: "agronomicCostCents", type: "uint32" },
    ],
    name: "recordSettlement",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "partnershipId", type: "bytes32" }],
    name: "refund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "partnerships",
    outputs: [
      { internalType: "address", name: "partner", type: "address" },
      { internalType: "bytes32", name: "lotId", type: "bytes32" },
      { internalType: "uint32", name: "ticketCents", type: "uint32" },
      { internalType: "bool", name: "settled", type: "bool" },
      { internalType: "bool", name: "refunded", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "CENTS_TO_USDC",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OPERATOR_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "hasRole",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lotContract",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdc",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const HarvverseEvidenceAbi = [
  {
    inputs: [{ internalType: "address", name: "admin", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "bytes32", name: "neededRole", type: "bytes32" },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "lotId", type: "bytes32" },
      { indexed: true, internalType: "uint256", name: "index", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "evidenceType", type: "uint8" },
      { indexed: false, internalType: "string", name: "cid", type: "string" },
    ],
    name: "EvidenceAdded",
    type: "event",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "lotId", type: "bytes32" },
      { internalType: "uint8", name: "evidenceType", type: "uint8" },
      { internalType: "string", name: "cid", type: "string" },
      { internalType: "string", name: "notes", type: "string" },
    ],
    name: "addEvidence",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "lotId", type: "bytes32" }],
    name: "getEvidence",
    outputs: [
      {
        components: [
          { internalType: "bytes32", name: "lotId", type: "bytes32" },
          { internalType: "uint8", name: "evidenceType", type: "uint8" },
          { internalType: "string", name: "cid", type: "string" },
          { internalType: "string", name: "notes", type: "string" },
          { internalType: "uint64", name: "timestamp", type: "uint64" },
          { internalType: "address", name: "submitter", type: "address" },
        ],
        internalType: "struct HarvverseEvidence.EvidenceRecord[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "lotId", type: "bytes32" }],
    name: "getEvidenceCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OPERATOR_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type DeploymentAddresses = {
  mockUsdc: `0x${string}`;
  harvverseLot: `0x${string}`;
  harvversePartnership: `0x${string}`;
  harvverseEvidence: `0x${string}`;
  chainId: number;
  network: string;
};
