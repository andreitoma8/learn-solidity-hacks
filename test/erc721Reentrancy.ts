import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { ERC721ReentrancyVulnerable, ERC721ReentrancyAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("ERC721Reentrancy", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let erc721ReentrancyVulnerable: ERC721ReentrancyVulnerable;
    let erc721ReentrancyAttacker: ERC721ReentrancyAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const ERC721ReentrancyVulnerable = await ethers.getContractFactory("ERC721ReentrancyVulnerable");
        erc721ReentrancyVulnerable = await ERC721ReentrancyVulnerable.deploy();
        await erc721ReentrancyVulnerable.deployed();

        const ERC721ReentrancyAttacker = await ethers.getContractFactory("ERC721ReentrancyAttacker");
        erc721ReentrancyAttacker = await ERC721ReentrancyAttacker.deploy(erc721ReentrancyVulnerable.address);
        await erc721ReentrancyAttacker.deployed();
    });

    it("should be vulnerable to reentrancy", async () => {
        console.log("Attacker NFT balance before the hack: ", (await erc721ReentrancyVulnerable.balanceOf(erc721ReentrancyAttacker.address)).toString());
        console.log("...");

        console.log("Attacker is attacking...");
        await erc721ReentrancyAttacker.connect(attacker).attack();
        expect(await erc721ReentrancyVulnerable.balanceOf(erc721ReentrancyAttacker.address)).to.be.equal(10);

        console.log("...");
        console.log("Attacker NFT balance after the hack: ", (await erc721ReentrancyVulnerable.balanceOf(erc721ReentrancyAttacker.address)).toString());
    });
});
