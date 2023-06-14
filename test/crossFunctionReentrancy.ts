import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { CrossFunctionReentrancyVulnerable, CrossFunctionReentrancyAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("CrossFunctionReentrancyVulnerable", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let crossFunctionReentrancyVulnerable: CrossFunctionReentrancyVulnerable;
    let reentrancyAttacker: CrossFunctionReentrancyAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const ReentrancyVulnerable = await ethers.getContractFactory("CrossFunctionReentrancyVulnerable");
        crossFunctionReentrancyVulnerable = await ReentrancyVulnerable.deploy();
        await crossFunctionReentrancyVulnerable.deployed();

        crossFunctionReentrancyVulnerable.connect(deployer).deposit({ value: ethers.utils.parseEther("10") });

        const ReentrancyAttacker = await ethers.getContractFactory("CrossFunctionReentrancyAttacker");
        reentrancyAttacker = await ReentrancyAttacker.connect(attacker).deploy(crossFunctionReentrancyVulnerable.address);
        await reentrancyAttacker.deployed();
    });

    it("should be vulnerable to reentrancy", async () => {
        console.log("Deployer ETH balance before the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "Ether");
        console.log("Attacker ETH balance before the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(attacker.address)), "Ether");
        console.log("...");

        console.log("Attacker is attacking...");

        await reentrancyAttacker.connect(attacker).attack({ value: ethers.utils.parseEther("10") });
        expect(await crossFunctionReentrancyVulnerable.shares(attacker.address)).to.be.equal(ethers.utils.parseEther("10"));
        await crossFunctionReentrancyVulnerable.connect(attacker).withdraw();

        console.log("...");
        console.log("Deployer ETH balance after the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "Ether");
        console.log("Attacker ETH balance after the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(attacker.address)), "Ether");
    });
});
