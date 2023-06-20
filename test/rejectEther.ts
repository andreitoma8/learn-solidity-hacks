import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { RejectEtherVulnerable, RejectEtherAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("RejectEther", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let rejectEtherVulnerable: RejectEtherVulnerable;
    let rejectEtherAttacker: RejectEtherAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const RejectEtherVulnerable = await ethers.getContractFactory("RejectEtherVulnerable");
        rejectEtherVulnerable = await RejectEtherVulnerable.deploy();
        await rejectEtherVulnerable.deployed();

        const RejectEtherAttacker = await ethers.getContractFactory("RejectEtherAttacker");
        rejectEtherAttacker = await RejectEtherAttacker.deploy(rejectEtherVulnerable.address);
        await rejectEtherAttacker.deployed();
    });

    it("should be vulnerable to rejectEther", async () => {
        await rejectEtherVulnerable.bid({ value: ethers.utils.parseEther("1") });

        console.log("Attacker is attacking...");
        await rejectEtherAttacker.connect(attacker).attack({ value: ethers.utils.parseEther("2") });

        await expect(rejectEtherVulnerable.bid({ value: ethers.utils.parseEther("3") })).to.be.revertedWith("Failed to refund previous bidder");

        try {
            await rejectEtherVulnerable.bid({ value: ethers.utils.parseEther("3") });
        } catch (error: any) {
            console.log("...");
            console.log("Bid transaction reverted with reason: ", error.message);
        }
    });
});
