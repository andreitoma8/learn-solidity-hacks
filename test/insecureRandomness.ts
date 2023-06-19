import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { InsecureRandomnessVulnerable, InsecureRandomnessAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("InsecureRandomness", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let insecureRandomnessVulnerable: InsecureRandomnessVulnerable;
    let insecureRandomnessAttacker: InsecureRandomnessAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const InsecureRandomnessVulnerable = await ethers.getContractFactory("InsecureRandomnessVulnerable");
        insecureRandomnessVulnerable = await InsecureRandomnessVulnerable.deploy({ value: ethers.utils.parseEther("10") });
        await insecureRandomnessVulnerable.deployed();

        const InsecureRandomnessAttacker = await ethers.getContractFactory("InsecureRandomnessAttacker");
        insecureRandomnessAttacker = await InsecureRandomnessAttacker.deploy(insecureRandomnessVulnerable.address);
        await insecureRandomnessAttacker.deployed();
    });

    it("should be vulnerable to insecure randomness", async () => {
        console.log(
            "Vulnerable ETH balance before the hack: ",
            ethers.utils.formatEther(await ethers.provider.getBalance(insecureRandomnessVulnerable.address))
        );
        console.log("Attacker ETH balance before the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(insecureRandomnessAttacker.address)));
        console.log("...");

        console.log("Attacker is attacking...");
        await expect(insecureRandomnessAttacker.connect(attacker).attack()).to.changeEtherBalance(insecureRandomnessAttacker, ethers.utils.parseEther("10"));

        console.log("...");
        console.log(
            "Vulnerable ETH balance after the hack: ",
            ethers.utils.formatEther(await ethers.provider.getBalance(insecureRandomnessVulnerable.address))
        );
        console.log("Attacker ETH balance after the hack: ", ethers.utils.formatEther(await ethers.provider.getBalance(insecureRandomnessAttacker.address)));
    });
});
