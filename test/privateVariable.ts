import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { PasswordManager } from "../typechain-types";

chai.use(chaiAsPromised);

describe("PasswordManager", () => {
    let deployer: SignerWithAddress;
    let passwordManager: PasswordManager;

    const password = ethers.utils.formatBytes32String("password");

    before(async () => {
        [deployer] = await ethers.getSigners();

        const PasswordManager = await ethers.getContractFactory("PasswordManager");
        passwordManager = await PasswordManager.deploy();
        await passwordManager.deployed();

        await passwordManager.connect(deployer).setPassword(password);
    });

    it("should be able to read the password", async () => {
        expect(await ethers.provider.getStorageAt(passwordManager.address, 1)).to.be.equal(password);
    });
});
