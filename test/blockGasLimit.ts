import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { BlockGasLimitVulnerable, BlockGasLimitAttacker, RejectEtherAttacker } from "../typechain-types";

chai.use(chaiAsPromised);

describe("BlockGasLimit", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let blockGasLimitVulnerable: BlockGasLimitVulnerable;
    let blockGasLimitAttacker: BlockGasLimitAttacker;
    let rejectEtherAttacker: RejectEtherAttacker;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();
    });

    beforeEach(async () => {
        const BlockGasLimitVulnerable = await ethers.getContractFactory("BlockGasLimitVulnerable");
        blockGasLimitVulnerable = await BlockGasLimitVulnerable.deploy();
        await blockGasLimitVulnerable.deployed();

        const BlockGasLimitAttacker = await ethers.getContractFactory("BlockGasLimitAttacker");
        blockGasLimitAttacker = await BlockGasLimitAttacker.deploy(blockGasLimitVulnerable.address);
        await blockGasLimitAttacker.deployed();

        const RejectEtherAttacker = await ethers.getContractFactory("RejectEtherAttacker");
        rejectEtherAttacker = await RejectEtherAttacker.deploy(blockGasLimitVulnerable.address);
        await rejectEtherAttacker.deployed();
    });

    it("should not be vulnerable to RejectEtherAttacker DoS", async () => {
        await blockGasLimitVulnerable.bid({ value: ethers.utils.parseEther("1") });
        console.log("Balance after first bid: ", ethers.utils.formatEther(await ethers.provider.getBalance(blockGasLimitVulnerable.address)));

        console.log("Attacker is attacking...");
        await rejectEtherAttacker.connect(attacker).attack({ value: ethers.utils.parseEther("2") });
        console.log("Balance after attack bid: ", ethers.utils.formatEther(await ethers.provider.getBalance(blockGasLimitVulnerable.address)));

        await blockGasLimitVulnerable.bid({ value: ethers.utils.parseEther("3") });
        expect(await blockGasLimitVulnerable.highestBid()).to.equal(ethers.utils.parseEther("3"));
        expect(await blockGasLimitVulnerable.highestBidder()).to.equal(deployer.address);

        console.log("Balance after third bid: ", ethers.utils.formatEther(await ethers.provider.getBalance(blockGasLimitVulnerable.address)));
    });

    it("should be vulnerable to BlockGasLimitAttacker DoS", async () => {
        await blockGasLimitVulnerable.bid({ value: ethers.utils.parseEther("1") });

        console.log("Attacker is attacking...");
        await blockGasLimitAttacker.connect(attacker).attack({ value: ethers.utils.parseEther("2") });

        try {
            await blockGasLimitVulnerable.bid({ value: ethers.utils.parseEther("3"), gasLimit: 100000 });
        } catch (error: any) {
            console.log("...");
            console.log("Bid transaction reverted with reason: ", error.message);
        }
    });
});
