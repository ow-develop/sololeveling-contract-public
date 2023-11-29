import fs from "fs";
import { network } from "hardhat";

import { ContractType, PublicNetwork } from "./../helpers/constant/common";

const hre = require("hardhat");

async function main() {
  if (!PublicNetwork.includes(network.name)) {
    console.log("Invalid network");
    return;
  }

  const deployed = JSON.parse(fs.readFileSync("./deployed.json", "utf8"));

  // verify upgradeable contracts
  const proxyContracts = [
    ContractType.Project,
    ContractType.MonsterFactory,
    ContractType.Season,
    // ContractType.SeasonQuest,
    ContractType.Random,
    ContractType.DungeonGate,
    ContractType.Shop,
    ContractType.SeasonSettlement,
    ContractType.System,
    ContractType.ShadowMonarch,
    ContractType.EssenceStone,
    ContractType.Monster,
    ContractType.ShadowArmy,
    ContractType.GateKey,
    ContractType.LegendaryScene,
    ContractType.SeasonScore,
    // ContractType.Achievement,
  ];

  for (const contract of proxyContracts) {
    if (
      deployed[contract] === undefined ||
      deployed[contract][network.name] === undefined
    ) {
      console.log(`does not exist ${contract} contract data`);
      continue;
    }

    const verifyAddress = deployed[contract][network.name].implementation;

    try {
      await hre.run("verify:verify", {
        address: verifyAddress,
      });
    } catch (error: any) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log(`💎 ${contract} contract already verify`);
        continue;
      } else {
        console.log(`🔴 ${contract} verify error : ${error.message}`);
        continue;
      }
    }

    console.log(`💎 ${contract} contract success verify`);
  }

  // verify general contracts
  // TestUSDC
  try {
    await hre.run("verify:verify", {
      address: deployed[ContractType.TestUSDC][network.name].address,
      constructorArguments: [0],
    });
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log(`💎 ${ContractType.TestUSDC} contract already verify`);
    } else {
      console.log(
        `🔴 ${ContractType.TestUSDC} verify error : ${error.message}`
      );
    }
  }
  console.log(`💎 ${ContractType.TestUSDC} contract success verify`);

  // approvalController
  try {
    await hre.run("verify:verify", {
      address: deployed[ContractType.ApprovalController][network.name].address,
      constructorArguments: [
        deployed[ContractType.Project][network.name].address,
        [
          deployed[ContractType.Season][network.name].address,
          deployed[ContractType.DungeonGate][network.name].address,
          deployed[ContractType.System][network.name].address,
        ],
      ],
    });
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log(
        `💎 ${ContractType.ApprovalController} contract already verify`
      );
    } else {
      console.log(
        `🔴 ${ContractType.ApprovalController} verify error : ${error.message}`
      );
    }
  }
  console.log(`💎 ${ContractType.ApprovalController} contract success verify`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
