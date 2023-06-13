import { task } from "hardhat/config";

task("deploy", "Deploy the contract")
    .setAction(async (hre) => {
        const contractFactory = await hre.ethers.getContractFactory("Contract");
        const contract = await contractFactory.deploy();

        console.log("Contract deployed to:", contract.address);
    });
