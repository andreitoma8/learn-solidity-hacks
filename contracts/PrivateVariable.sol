// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PasswordManager is Ownable {
    // Slot 0 : OwnerAddress
    // Slot 1 : Password
    bytes32 private password;

    function setPassword(bytes32 _password) public onlyOwner {
        password = _password;
    }
}
