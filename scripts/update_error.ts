import { ethers, network } from "hardhat";

import { PublicNetwork } from "../helpers/constant/common";
import { getErrorData } from "../helpers/ddbHelper";

async function main() {
  if (!PublicNetwork.includes(network.name)) {
    console.log("Invalid network");
    return;
  }

  const Project = await ethers.getContractFactory("SLProject");
  const MonsterFactory = await ethers.getContractFactory("SLMonsterFactory");
  const Season = await ethers.getContractFactory("SLSeason");
  // const SeasonQuest = await ethers.getContractFactory("SLSeasonQuest");
  const Random = await ethers.getContractFactory("SLRandom");
  const DungeonGate = await ethers.getContractFactory("SLDungeonGate");
  const Shop = await ethers.getContractFactory("SLShop");
  const SeasonSettlement = await ethers.getContractFactory(
    "SLSeasonSettlement"
  );
  const System = await ethers.getContractFactory("SLSystem");
  const PriceFeed = await ethers.getContractFactory("PriceFeed");
  const ApprovalController = await ethers.getContractFactory(
    "SLApprovalController"
  );
  const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
  const EssenceStone = await ethers.getContractFactory("SLEssenceStone");
  const NormalMonster = await ethers.getContractFactory("SLMonster");
  const ShadowMonster = await ethers.getContractFactory("SLShadowArmy");
  const GateKey = await ethers.getContractFactory("SLGateKey");
  const LegendaryScene = await ethers.getContractFactory("SLLegendaryScene");
  const Achievement = await ethers.getContractFactory("SLAchievement");
  const SeasonScore = await ethers.getContractFactory("SLSeasonScore");
  const HunterRank = await ethers.getContractFactory("SLHunterRank");
  const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
  const Top100 = await ethers.getContractFactory("SLTop100");

  /* GET ERROR */
  const error = getErrorData([
    Project.interface,
    MonsterFactory.interface,
    Season.interface,
    // SeasonQuest.interface,
    Random.interface,
    DungeonGate.interface,
    Shop.interface,
    SeasonSettlement.interface,
    System.interface,
    PriceFeed.interface,
    ApprovalController.interface,
    ShadowMonarch.interface,
    EssenceStone.interface,
    NormalMonster.interface,
    ShadowMonster.interface,
    GateKey.interface,
    LegendaryScene.interface,
    Achievement.interface,
    SeasonScore.interface,
    HunterRank.interface,
    SeasonPack.interface,
    Top100.interface,
  ]);

  console.log(error);

  console.log("👍🏻 SUCCESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
