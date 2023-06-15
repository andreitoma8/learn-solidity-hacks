import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { ReadOnlyReentrancyBank, ReadOnlyReentrancyVulnerable, ReadOnlyReentrancyAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("ReadOnlyReentrancy", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let readOnlyReentrancyBank: ReadOnlyReentrancyBank;
    let readOnlyReentrancyVulnerable: ReadOnlyReentrancyVulnerable;
    let readOnlyReentrancyAttacker: ReadOnlyReentrancyAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const ReadOnlyReentrancyBank = await ethers.getContractFactory("ReadOnlyReentrancyBank");
        readOnlyReentrancyBank = await ReadOnlyReentrancyBank.deploy();
        await readOnlyReentrancyBank.deployed();

        const ReadOnlyReentrancyVulnerable = await ethers.getContractFactory("ReadOnlyReentrancyVulnerable");
        readOnlyReentrancyVulnerable = await ReadOnlyReentrancyVulnerable.deploy(readOnlyReentrancyBank.address);
        await readOnlyReentrancyVulnerable.deployed();

        const ReadOnlyReentrancyAttacker = await ethers.getContractFactory("ReadOnlyReentrancyAttacker");
        readOnlyReentrancyAttacker = await ReadOnlyReentrancyAttacker.deploy(readOnlyReentrancyVulnerable.address);
        await readOnlyReentrancyAttacker.deployed();
    });

    it("should be vulnerable to view only reentrancy", async () => {
        console.log("Attacker Reward before the hack: ", ethers.utils.formatEther(await readOnlyReentrancyVulnerable.balanceOf(attacker.address)), "Ether");
        console.log("...");
        console.log("Attacker is attacking...");
        await expect(readOnlyReentrancyAttacker.connect(attacker).attack({ value: ethers.utils.parseEther("10") })).to.changeTokenBalance(
            readOnlyReentrancyVulnerable,
            attacker,
            ethers.utils.parseEther("10")
        );
        console.log("...");
        console.log("Attacker Reward after the hack: ", ethers.utils.formatEther(await readOnlyReentrancyVulnerable.balanceOf(attacker.address)), "Ether");
    });
});
