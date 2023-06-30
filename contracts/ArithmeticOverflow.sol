// SPDX-License-Identifier: MIT
pragma solidity 0.6.0;

contract ArithmeticOverflowVulnerable {
    uint8 public balance; // Max value of 255

    // Deposit that gets the balance to more than 255 will overflow
    function deposit(uint8 _amount) public {
        balance += _amount;
    }
}
