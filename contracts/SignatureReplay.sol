// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SignatureReplayVulnerable {
    using ECDSA for bytes32;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {}

    function transfer(address _to, uint256 _amount, bytes memory _signature) external {
        bytes32 txHash = getTxHash(_to, _amount);
        require(_checkSig(_signature, txHash), "Invalid signature");

        (bool sc,) = _to.call{value: _amount}("");
        require(sc, "Failed to send Ether");
    }

    function getTxHash(address _to, uint256 _amount) public view returns (bytes32) {
        return keccak256(abi.encodePacked(_to, _amount));
    }

    function _checkSig(bytes memory _sig, bytes32 _txHash) internal view returns (bool) {
        bytes32 ethSignedHash = _txHash.toEthSignedMessageHash();

        address signer = ethSignedHash.recover(_sig);
        return signer == owner;
    }
}
