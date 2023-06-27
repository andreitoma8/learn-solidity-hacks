import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, network } from "hardhat";

import { OracleManipulationVulnerable, OracleManipulationAttacker, MockERC20, MinimalDex } from "../typechain-types";

chai.use(chaiAsPromised);

describe("OracleManipulation", () => {
    let deployer: SignerWithAddress;
    let attacker: SignerWithAddress;
    let oracleManipulationVulnerable: OracleManipulationVulnerable;
    let oracleManipulationAttacker: OracleManipulationAttacker;
    let mockERC20: MockERC20;
    let minimalDex: MinimalDex;

    before(async () => {
        [deployer, attacker] = await ethers.getSigners();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockERC20 = await MockERC20.deploy();
        await mockERC20.deployed();

        const MinimalDex = await ethers.getContractFactory("MinimalDex");
        minimalDex = await MinimalDex.deploy(mockERC20.address);
        await minimalDex.deployed();

        const OracleManipulationVulnerable = await ethers.getContractFactory("OracleManipulationVulnerable");
        oracleManipulationVulnerable = await OracleManipulationVulnerable.deploy(mockERC20.address, minimalDex.address);
        await oracleManipulationVulnerable.deployed();

        const OracleManipulationAttacker = await ethers.getContractFactory("OracleManipulationAttacker");
        oracleManipulationAttacker = await OracleManipulationAttacker.deploy(mockERC20.address, minimalDex.address, oracleManipulationVulnerable.address);
        await oracleManipulationAttacker.deployed();

        await mockERC20.mint(oracleManipulationVulnerable.address, ethers.utils.parseEther("100000"));

        await mockERC20.mint(deployer.address, ethers.utils.parseEther("10"));
        await mockERC20.approve(minimalDex.address, ethers.utils.parseEther("10"));
        await minimalDex.addLiquidity(ethers.utils.parseEther("10"), { value: ethers.utils.parseEther("10") });

        await mockERC20.mint(attacker.address, ethers.utils.parseEther("1000"));
        await mockERC20.connect(attacker).approve(oracleManipulationAttacker.address, ethers.utils.parseEther("1000"));

        const attackerBalanceInHex = ethers.utils.hexlify(ethers.utils.parseEther("11"));
        await network.provider.request({
            method: "hardhat_setBalance",
            params: [attacker.address, attackerBalanceInHex],
        });
    });

    it("should be vulnerable to oracle manipulation", async () => {
        console.log(
            "Vulnerable contract ERC20 balance before attack:",
            ethers.utils.formatEther(await mockERC20.balanceOf(oracleManipulationVulnerable.address))
        );
        console.log("Attacker ether balance before attack:", ethers.utils.formatEther(await ethers.provider.getBalance(attacker.address)));
        console.log("Attacker ERC20 balance before attack:", ethers.utils.formatEther(await mockERC20.balanceOf(attacker.address)));

        console.log("...");
        console.log("Attacker is attacking...");
        await oracleManipulationAttacker.connect(attacker).attack({ value: ethers.utils.parseEther("10.9") });

        console.log("...");
        console.log(
            "Vulnerable contract ERC20 balance after attack:",
            ethers.utils.formatEther(await mockERC20.balanceOf(oracleManipulationVulnerable.address))
        );
        console.log("Attacker ether balance after attack:", ethers.utils.formatEther(await ethers.provider.getBalance(attacker.address)));
        console.log("Attacker ERC20 balance after attack:", ethers.utils.formatEther(await mockERC20.balanceOf(attacker.address)));
    });
});
