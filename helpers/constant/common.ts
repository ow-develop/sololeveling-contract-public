export const PublicNetwork = ["polygon", "mumbai"];

export enum ContractType {
  Project = "Project",
  MonsterFactory = "MonsterFactory",
  Season = "Season",
  SeasonQuest = "SeasonQuest",
  Random = "Random",
  DungeonGate = "DungeonGate",
  SeasonSettlement = "SeasonSettlement",
  System = "System",
  SJWOffering = "SJWOffering",
  SJWDistribution = "SJWDistribution",
  PriceFeed = "PriceFeed",
  Shop = "Shop",
  ApprovalController = "ApprovalController",
  ShadowMonarch = "ShadowMonarch",
  EssenceStone = "EssenceStone",
  Monster = "Monster",
  ShadowArmy = "ShadowArmy",
  GateKey = "GateKey",
  LegendaryScene = "LegendaryScene",
  SeasonScore = "SeasonScore",
  Achievement = "Achievement",
  HunterItem = "HunterItem",
  HunterRank = "HunterRank",
  SeasonPack = "SeasonPack",
  Top100 = "Top100",
  TestUSDC = "TestUSDC",
}

export enum CollectionId {
  ShadowMonarch = 1,
  EssenceStone = 2,
  Monster = 3,
  ShadowArmy = 4,
  GateKey = 5,
  LegendaryScene = 6,
  SeasonScore = 7,
  Achievement = 8,
}

export enum DDBTableName {
  mumbai = "dev-sl-contract-abi",
  polygon = "prod-sl-contract-abi",
}

export const ContractPath = {
  Project: "./artifacts/contracts/project/SLProject.sol/SLProject.json",
  MonsterFactory:
    "./artifacts/contracts/monsterFactory/SLMonsterFactory.sol/SLMonsterFactory.json",
  Season: "./artifacts/contracts/season/SLSeason.sol/SLSeason.json",
  SeasonQuest:
    "./artifacts/contracts/seasonQuest/SLSeasonQuest.sol/SLSeasonQuest.json",
  Random: "./artifacts/contracts/random/SLRandom.sol/SLRandom.json",
  DungeonGate:
    "./artifacts/contracts/dungeonGate/SLDungeonGate.sol/SLDungeonGate.json",
  SeasonSettlement:
    "./artifacts/contracts/seasonSettlement/SLSeasonSettlement.sol/SLSeasonSettlement.json",
  System: "./artifacts/contracts/system/SLSystem.sol/SLSystem.json",
  SJWOffering:
    "./artifacts/contracts/SJWOffering/SLSJWOffering.sol/SLSJWOffering.json",
  SJWDistribution:
    "./artifacts/contracts/SJWDistribution/SLSJWDistribution.sol/SLSJWDistribution.json",
  PriceFeed: "./artifacts/contracts/chainlink/PriceFeed.sol/PriceFeed.json",
  Shop: "./artifacts/contracts/shop/SLShop.sol/SLShop.json",
  ApprovalController:
    "./artifacts/contracts/collections/approvalController/SLApprovalController.sol/SLApprovalController.json",
  ShadowMonarch:
    "./artifacts/contracts/collections/shadowMonarch/SLShadowMonarch.sol/SLShadowMonarch.json",
  EssenceStone:
    "./artifacts/contracts/collections/essenceStone/SLEssenceStone.sol/SLEssenceStone.json",
  Monster:
    "./artifacts/contracts/collections/monster/normalMonster/SLMonster.sol/SLMonster.json",
  ShadowArmy:
    "./artifacts/contracts/collections/monster/shadowMonster/SLShadowArmy.sol/SLShadowArmy.json",
  GateKey:
    "./artifacts/contracts/collections/gateKey/SLGateKey.sol/SLGateKey.json",
  LegendaryScene:
    "./artifacts/contracts/collections/legendaryScene/SLLegendaryScene.sol/SLLegendaryScene.json",
  SeasonScore:
    "./artifacts/contracts/collections/seasonScore/SLSeasonScore.sol/SLSeasonScore.json",
  Achievement:
    "./artifacts/contracts/collections/achievement/SLAchievement.sol/SLAchievement.json",
  HunterItem:
    "./artifacts/contracts/collections/hunterItem/SLHunterItem.sol/SLHunterItem.json",
  HunterRank:
    "./artifacts/contracts/collections/hunterRank/SLHunterRank.sol/SLHunterRank.json",
  SeasonPack:
    "./artifacts/contracts/collections/seasonPack/SLSeasonPack.sol/SLSeasonPack.json",
  Top100: "./artifacts/contracts/collections/top100/SLTop100.sol/SLTop100.json",
};

export enum Season {
  All = "all",
  PreSeason = "0",
  Season1 = "1",
}

// account
export const OPERATOR_MASTER = "0xA552b00A6f79e7e40eFf56DC6B8C79bE1a333E60";
export const CREATOR = "0x0000000000000000000000000000000000000000";
export const RANDOM_SIGNER = "0x36B061c8B9252A3A89c90d6ce9aeF02B5708eaAE";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// SJW ownership account
export const SJW_OWNERSHIP_ACCOUNTS = [
  "0xA552b00A6f79e7e40eFf56DC6B8C79bE1a333E60",
];
export const SJW_OWNERSHIP_SUPPLIES = [2000];

// SJW offering distributed account
export const SJW_DISTRIBUTED_ACCOUNTS = [
  "0xA552b00A6f79e7e40eFf56DC6B8C79bE1a333E60",
];
export const SJW_DISTRIBUTED_RATES = [100_00000];

// token
export const WMATIC_ADDRESS_POLYGON =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
export const WETH_ADDRESS_POLYGON =
  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
export const WMATIC_ADDRESS_MUMBAI =
  "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889";
export const WETH_ADDRESS_MUMBAI = "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa";

export const USDC_ADDRESS_POLYGON =
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

export const API_URL = "http://localhost:8001/admin/deploy";
