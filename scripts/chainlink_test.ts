import { ethers } from "hardhat";

async function main() {
  const MaticToUSD = await ethers.getContractFactory("PriceFeed");
  const maticToUsd = await MaticToUSD.deploy();
  const price = await maticToUsd.getLatestPrice();

  console.log("1 USD to WEI", Number(price));
  console.log("1 USD to MATIC", ethers.utils.formatEther(price));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
