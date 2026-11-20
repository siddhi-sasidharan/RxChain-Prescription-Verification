const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("PrescriptionVerification");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("PrescriptionVerification deployed to:", address);
  console.log("This account is the admin:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
