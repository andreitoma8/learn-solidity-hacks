import { ethers } from "hardhat";

async function main() {
    const contractFactory = await ethers.getContractFactory("Contract");
    const contract = await contractFactory.deploy();

    console.log("Contract deployed to:", contract.address);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});