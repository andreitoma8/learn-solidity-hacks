import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { PhishingTxOriginVulnerable, PhishingTxOriginAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("PhishingTxOrigin", () => {
    let deployer: SignerWithAddress;
    let victim: SignerWithAddress;
    let phishingTxOriginVulnerable: PhishingTxOriginVulnerable;
    let phishingTxOriginAttacker: PhishingTxOriginAttacker;

    before(async () => {
        [deployer, victim] = await ethers.getSigners();

        const PhishingTxOriginVulnerable = await ethers.getContractFactory("PhishingTxOriginVulnerable");
        phishingTxOriginVulnerable = await PhishingTxOriginVulnerable.connect(victim).deploy();
        await phishingTxOriginVulnerable.deployed();

        const PhishingTxOriginAttacker = await ethers.getContractFactory("PhishingTxOriginAttacker");
        phishingTxOriginAttacker = await PhishingTxOriginAttacker.deploy(phishingTxOriginVulnerable.address);
        await phishingTxOriginAttacker.deployed();
    });

    it("should be vulnerable to phishingTxOrigin", async () => {
        console.log("Attacker address: ", phishingTxOriginAttacker.address);
        console.log("Victim address: ", victim.address);
        console.log("Owner of vulnerable contract before hack:", await phishingTxOriginVulnerable.owner());

        console.log("...");
        console.log("Victing is claiming free money...");
        await phishingTxOriginAttacker.connect(victim).winFreeMoney();

        expect(await phishingTxOriginVulnerable.owner()).to.equal(phishingTxOriginAttacker.address);
        console.log("...");
        console.log("Owner of vulnerable contract after hack: ", await phishingTxOriginVulnerable.owner());
    });
});
