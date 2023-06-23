import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { ZeroCodeSizeVulnerable, ZeroCodeSizeAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("ZeroCodeSize", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let zeroCodeSizeVulnerable: ZeroCodeSizeVulnerable;
    let zeroCodeSizeAttacker: ZeroCodeSizeAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const ZeroCodeSizeVulnerable = await ethers.getContractFactory("ZeroCodeSizeVulnerable");
        zeroCodeSizeVulnerable = await ZeroCodeSizeVulnerable.deploy();
        await zeroCodeSizeVulnerable.deployed();
    });

    it("should be vulnerable to zero code size", async () => {
        console.log("Is vulnerable contract accessed:", await zeroCodeSizeVulnerable.accessed());

        console.log("...");
        console.log("Attacker deploys attacker contract...");
        const ZeroCodeSizeAttacker = await ethers.getContractFactory("ZeroCodeSizeAttacker");
        zeroCodeSizeAttacker = await ZeroCodeSizeAttacker.deploy(zeroCodeSizeVulnerable.address);
        await zeroCodeSizeAttacker.deployed();

        console.log("...");
        console.log("Is vulnerable contract accessed:", await zeroCodeSizeVulnerable.accessed());
        expect(await zeroCodeSizeVulnerable.accessed()).to.be.true;
    });
});
