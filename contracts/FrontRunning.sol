// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FrontRunningVulnerable {
    address public winner;
    bytes32 public passwordHash;

    // The deployer of the contract sets a password hash and some Ether to be claimed.
    constructor(bytes32 _passwordHash) payable {
        passwordHash = _passwordHash;
    }

    // The winner can claim their prize by providing the password as a string
    // that has to be hashed to the password hash to verify it.
    function claimPrize(string memory _password) public {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Wrong password");
        winner = msg.sender;
        (bool sc,) = msg.sender.call{value: address(this).balance}("");
        require(sc, "Failed to send Ether");
    }
}
