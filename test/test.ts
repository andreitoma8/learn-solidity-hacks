import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";

import { Contract } from "../typechain-types";

chai.use(chaiAsPromised);

describe("Contract", function () {
    let contract: Contract;
    let deployer: SignerWithAddress;
    let user: SignerWithAddress;

    beforeEach(async function () {
        [deployer, user] = await ethers.getSigners();

        const ContractFactory = await ethers.getContractFactory("Contract");
        contract = (await ContractFactory.deploy()) as Contract;
        await contract.deployed();
    });

    it("should allow user to set a value", async function () {
        await contract.setValue(42);
        expect(await contract.value()).to.equal(42);
    });
});
