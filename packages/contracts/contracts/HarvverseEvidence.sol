// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @dev Immutable evidence log for lot milestones (photos, NDVI, harvest reports, etc.).
contract HarvverseEvidence is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum EvidenceType {
        Photo,
        NDVIReport,
        HarvestReport,
        AgronomistVisit,
        Other
    }

    struct EvidenceRecord {
        bytes32 lotId;
        EvidenceType evidenceType;
        string cid;       // IPFS CID or off-chain URI
        string notes;
        uint64 timestamp;
        address submitter;
    }

    // lotId => array of evidence records
    mapping(bytes32 => EvidenceRecord[]) private _evidence;

    event EvidenceAdded(
        bytes32 indexed lotId,
        uint256 indexed index,
        EvidenceType evidenceType,
        string cid
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function addEvidence(
        bytes32 lotId,
        EvidenceType evidenceType,
        string calldata cid,
        string calldata notes
    ) external onlyRole(OPERATOR_ROLE) {
        uint256 idx = _evidence[lotId].length;
        _evidence[lotId].push(EvidenceRecord({
            lotId: lotId,
            evidenceType: evidenceType,
            cid: cid,
            notes: notes,
            timestamp: uint64(block.timestamp),
            submitter: msg.sender
        }));
        emit EvidenceAdded(lotId, idx, evidenceType, cid);
    }

    function getEvidence(bytes32 lotId) external view returns (EvidenceRecord[] memory) {
        return _evidence[lotId];
    }

    function getEvidenceCount(bytes32 lotId) external view returns (uint256) {
        return _evidence[lotId].length;
    }
}
