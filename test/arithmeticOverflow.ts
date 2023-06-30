import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { ArithmeticOverflowVulnerable } from "../typechain-types";

chai.use(chaiAsPromised);

describe("ArithmeticOverflow", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let arithmeticOverflowVulnerable: ArithmeticOverflowVulnerable;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();
    });

    beforeEach(async () => {
        const ArithmeticOverflowVulnerable = await ethers.getContractFactory("ArithmeticOverflowVulnerable");
        arithmeticOverflowVulnerable = await ArithmeticOverflowVulnerable.deploy();
        await arithmeticOverflowVulnerable.deployed();
    });

    it("should be vulnerable to ArithmeticOverflow", async () => {
        await arithmeticOverflowVulnerable.deposit(200);
        console.log("Balance after first deposit: ", await arithmeticOverflowVulnerable.balance());

        console.log("...");
        console.log("Depositing another 100 units...");

        await arithmeticOverflowVulnerable.deposit(100);
        console.log("...");
        console.log("Balance after second deposit: ", await arithmeticOverflowVulnerable.balance());

        expect(await arithmeticOverflowVulnerable.balance()).to.equal(300 - 256);
    });
});
