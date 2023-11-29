import fs from "fs";
import { prompt } from "prompts";
import { ethers, upgrades, network } from "hardhat";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

import {
  DDBTableName,
  PublicNetwork,
  ContractType,
  Season,
  OPERATOR_MASTER,
  CREATOR,
  RANDOM_SIGNER,
  SJW_OWNERSHIP_ACCOUNTS,
  SJW_OWNERSHIP_SUPPLIES,
  SJW_DISTRIBUTED_ACCOUNTS,
  SJW_DISTRIBUTED_RATES,
  ZERO_ADDRESS,
} from "../helpers/constant/common";
import {
  getContractABI,
  getDate,
  getContractByteCode,
  delay,
} from "../helpers/ddbHelper";
import {
  updateDeployed,
  getImplementationAddress,
} from "../helpers/deployed-address";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

async function main() {
  const [operatorManager] = await ethers.getSigners();

  const { isDeploy, isUpload, isTesting } = await prompt([
    {
      type: "confirm",
      name: "isDeploy",
      message: `Deploying SoloLeveling V1 Contracts
      🔱 with the account: ${await operatorManager.getAddress()}
      Running on network: ${network.name}
      Do you continue?`,
    },
    {
      type: (prev: boolean) =>
        prev && PublicNetwork.includes(network.name) ? "confirm" : null,
      name: "isUpload",
      message: "Do you upload contract ABI at ddb?",
    },
    {
      type: "confirm",
      name: "isTesting",
      message: "Do you deploy testing collection contract?",
    },
  ]);

  if (!isDeploy) {
    return;
  }

  const ddbTableName =
    network.name === "polygon" ? DDBTableName.polygon : DDBTableName.mumbai;

  let deployed = JSON.parse(fs.readFileSync("./deployed.json", "utf8"));

  /* DEPLOY OPERATOR WALLET */
  const RoleWallet = await ethers.getContractFactory("SLRoleWallet");
  const operator = await RoleWallet.deploy(
    [OPERATOR_MASTER],
    [operatorManager.address]
  );
  await operator.deployed();
  console.log(`💎 OperatorWallet deployed to: ${operator.address}`);

  /* DEPLOY PROJECT
     REQUIRE : _operator */
  const Project = await ethers.getContractFactory("SLProject");
  const project = await upgrades.deployProxy(Project, [operator.address], {
    kind: "uups",
  });
  await project.deployed();
  console.log(`💎 Project deployed to: ${project.address}`);

  if (isUpload) {
    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.Project,
          season: Season.All,
          address: project.address,
          date: getDate(),
          abi: getContractABI(ContractType.Project),
          byteCode: getContractByteCode(ContractType.Project),
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.Project,
      network.name,
      project.address,
      await getImplementationAddress(project.address)
    );
  }

  /* DEPLOY MONSTER FACTORY
     REQUIRE : _projectContract */
  const MonsterFactory = await ethers.getContractFactory("SLMonsterFactory");
  const monsterFactory = await upgrades.deployProxy(
    MonsterFactory,
    [project.address],
    { kind: "uups" }
  );
  await monsterFactory.deployed();
  console.log(`💎 MonsterFactory deployed to: ${monsterFactory.address}`);

  if (isUpload) {
    await delay(3000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.MonsterFactory,
          season: Season.All,
          address: monsterFactory.address,
          date: getDate(),
          abi: getContractABI(ContractType.MonsterFactory),
          byteCode: getContractByteCode(ContractType.MonsterFactory),
          dependencyType: [ContractType.Project],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.MonsterFactory,
      network.name,
      monsterFactory.address,
      await getImplementationAddress(monsterFactory.address)
    );
  }

  /* DEPLOY SEASON
     REQUIRE : _projectContract, _monsterFactoryContract, _nomalMonsterCollectionId, _shadowMonsterCollectionId */
  const SLSeason = await ethers.getContractFactory("SLSeason");
  const season = await upgrades.deployProxy(
    SLSeason,
    [project.address, monsterFactory.address, 3, 4],
    {
      kind: "uups",
    }
  );
  await season.deployed();
  console.log(`💎 Season deployed to: ${season.address}`);

  if (isUpload) {
    await delay(3000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.Season,
          season: Season.All,
          address: season.address,
          date: getDate(),
          abi: getContractABI(ContractType.Season),
          byteCode: getContractByteCode(ContractType.Season),
          dependencyType: [ContractType.Project, ContractType.MonsterFactory],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.Season,
      network.name,
      season.address,
      await getImplementationAddress(season.address)
    );
  }

  /* DEPLOY SEASON QUEST
     REQUIRE : _projectContract, _monsterFactoryContract, _seasonContract, _hunterItemCollectionId, _nomalMonsterCollectionId, _shadowMonsterCollectionId */
  const SeasonQuest = await ethers.getContractFactory("SLSeasonQuest");
  const seasonQuest = await upgrades.deployProxy(
    SeasonQuest,
    [project.address, monsterFactory.address, season.address, 8, 3, 4],
    {
      kind: "uups",
    }
  );
  await seasonQuest.deployed();
  console.log(`💎 SeasonQuest deployed to: ${seasonQuest.address}`);

  if (isUpload) {
    await delay(3000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.SeasonQuest,
          season: Season.All,
          address: seasonQuest.address,
          date: getDate(),
          abi: getContractABI(ContractType.SeasonQuest),
          byteCode: getContractByteCode(ContractType.SeasonQuest),
          dependencyType: [
            ContractType.Project,
            ContractType.MonsterFactory,
            ContractType.Season,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.SeasonQuest,
      network.name,
      seasonQuest.address,
      await getImplementationAddress(seasonQuest.address)
    );
  }

  /* DEPLOY RANDOM
     REQUIRE : _projectContract, _signer */
  const Random = await ethers.getContractFactory("SLRandom");
  const random = await upgrades.deployProxy(
    Random,
    [project.address, RANDOM_SIGNER],
    {
      kind: "uups",
    }
  );
  await random.deployed();
  console.log(`💎 Random deployed to: ${random.address}`);

  if (isUpload) {
    await delay(3000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.Random,
          season: Season.All,
          address: random.address,
          date: getDate(),
          abi: getContractABI(ContractType.Random),
          byteCode: getContractByteCode(ContractType.Random),
          dependencyType: [ContractType.Project],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.Random,
      network.name,
      random.address,
      await getImplementationAddress(random.address)
    );
  }

  /* DEPLOY DUNGEON GATE
     REQUIRE : _projectContract, _seasonContract, _randomContract, _essenceStoneCollectionId, _gateKeyCollectionId */
  const DungeonGate = await ethers.getContractFactory("SLDungeonGate");
  const dungeonGate = await upgrades.deployProxy(
    DungeonGate,
    [project.address, season.address, random.address, 2, 100],
    {
      kind: "uups",
    }
  );
  await dungeonGate.deployed();
  console.log(`💎 DungeonGate deployed to: ${dungeonGate.address}`);

  if (isUpload) {
    await delay(3000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.DungeonGate,
          season: Season.All,
          address: dungeonGate.address,
          date: getDate(),
          abi: getContractABI(ContractType.DungeonGate),
          byteCode: getContractByteCode(ContractType.DungeonGate),
          dependencyType: [
            ContractType.Project,
            ContractType.Season,
            ContractType.Random,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.DungeonGate,
      network.name,
      dungeonGate.address,
      await getImplementationAddress(dungeonGate.address)
    );
  }

  /* DEPLOY SEASON SETTLEMENT
     REQUIRE : _projectContract, _seasonContract, _seasonQuestContract, _dungeonGateContract, _SRankRewardCollectionId, _seasonScoreCollectionId */
  const SeasonSettlement = await ethers.getContractFactory(
    "SLSeasonSettlement"
  );
  const seasonSettlement = await upgrades.deployProxy(
    SeasonSettlement,
    [
      project.address,
      season.address,
      seasonQuest.address,
      dungeonGate.address,
      5,
      7,
    ],
    {
      kind: "uups",
    }
  );
  await seasonSettlement.deployed();
  console.log(`💎 SeasonSettlement deployed to: ${seasonSettlement.address}`);

  if (isUpload) {
    await delay(3000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.SeasonSettlement,
          season: Season.All,
          address: seasonSettlement.address,
          date: getDate(),
          abi: getContractABI(ContractType.SeasonSettlement),
          byteCode: getContractByteCode(ContractType.SeasonSettlement),
          dependencyType: [
            ContractType.Project,
            ContractType.Season,
            ContractType.SeasonQuest,
            ContractType.DungeonGate,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.SeasonSettlement,
      network.name,
      seasonSettlement.address,
      await getImplementationAddress(seasonSettlement.address)
    );
  }

  /* DEPLOY SYSTEM
     REQUIRE : _projectContract, _monsterFactoryContract, _randomContract, _essenceStoneCollectionId, _normalMonsterCollectionId, _shadowMonsterCollectionId */
  const System = await ethers.getContractFactory("SLSystem");
  const system = await upgrades.deployProxy(
    System,
    [project.address, monsterFactory.address, random.address, 2, 3, 4],
    {
      kind: "uups",
    }
  );
  await system.deployed();
  console.log(`💎 System deployed to: ${system.address}`);

  if (isUpload) {
    await delay(3000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.System,
          season: Season.All,
          address: system.address,
          date: getDate(),
          abi: getContractABI(ContractType.System),
          byteCode: getContractByteCode(ContractType.System),
          dependencyType: [
            ContractType.Project,
            ContractType.MonsterFactory,
            ContractType.Random,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.System,
      network.name,
      system.address,
      await getImplementationAddress(system.address)
    );
  }

  const nonce = (await operatorManager.getTransactionCount()) + 1;
  const distributionAddress = ethers.utils.getContractAddress({
    from: operatorManager.address,
    nonce,
  });
  console.log(`💎 SJWOffering distribution address: ${distributionAddress}`);

  /* DEPLOY SJW OFFERING
     REQUIRE : _projectContract, _distributionContract, _shadowMonarchCollectionId, _ownershipAccounts, _ownershipSupplies */
  const SJWOffering = await ethers.getContractFactory("SLSJWOffering");
  const offering = await upgrades.deployProxy(
    SJWOffering,
    [
      project.address,
      distributionAddress,
      1,
      SJW_OWNERSHIP_ACCOUNTS,
      SJW_OWNERSHIP_SUPPLIES,
    ],
    {
      kind: "uups",
    }
  );
  await offering.deployed();
  console.log(`💎 SJWOffering deployed to: ${offering.address}`);

  if (isUpload) {
    await delay(5000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.SJWOffering,
          season: Season.All,
          address: offering.address,
          date: getDate(),
          abi: getContractABI(ContractType.SJWOffering),
          byteCode: getContractByteCode(ContractType.SJWOffering),
          dependencyType: [ContractType.Project, ContractType.SJWDistribution],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.SJWOffering,
      network.name,
      offering.address,
      await getImplementationAddress(offering.address)
    );
  }

  /* DEPLOY SJW DISTRIBUTION
     REQUIRE : _projectContract, _offeringContract, _distributedAccounts, _distributedRates */
  const SJWDistribution = await ethers.getContractFactory("SLSJWDistribution");
  const distribution = await upgrades.deployProxy(
    SJWDistribution,
    [
      project.address,
      offering.address,
      SJW_DISTRIBUTED_ACCOUNTS,
      SJW_DISTRIBUTED_RATES,
    ],
    {
      kind: "uups",
    }
  );
  await distribution.deployed();
  console.log(`💎 SJWDistribution deployed to: ${distribution.address}`);

  if (isUpload) {
    await delay(5000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.SJWDistribution,
          season: Season.All,
          address: distribution.address,
          date: getDate(),
          abi: getContractABI(ContractType.SJWDistribution),
          byteCode: getContractByteCode(ContractType.SJWDistribution),
          dependencyType: [ContractType.Project, ContractType.SJWOffering],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.SJWDistribution,
      network.name,
      distribution.address,
      await getImplementationAddress(distribution.address)
    );
  }

  /* DEPLOY SHADOW MONARCH COLLECTION
     REQUIRE : _projectContract, _SJWOfferingContract, _baseTokenURI */
  const ShadowMonarch = isTesting
    ? await ethers.getContractFactory("SLTestShadowMonarch")
    : await ethers.getContractFactory("SLShadowMonarch");
  const shadowMonarch = await upgrades.deployProxy(
    ShadowMonarch,
    [project.address, offering.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await shadowMonarch.deployed();
  console.log(`💎 ShadowMonarch deployed to: ${shadowMonarch.address}`);

  const addCollectionTx1 = await project.addCollection(
    shadowMonarch.address,
    CREATOR
  );
  await addCollectionTx1.wait();
  console.log("ShadowMonarch collection id: 1");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.ShadowMonarch,
          season: Season.All,
          address: shadowMonarch.address,
          date: getDate(),
          abi: getContractABI(ContractType.ShadowMonarch),
          byteCode: getContractByteCode(ContractType.ShadowMonarch),
          dependencyType: [ContractType.Project, ContractType.SJWOffering],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.ShadowMonarch,
      network.name,
      shadowMonarch.address,
      await getImplementationAddress(shadowMonarch.address)
    );
  }

  /* DEPLOY ESSENCE STONE COLLECTION
     REQUIRE : _projectContract, _dungeonGateContract, _systemContract, _baseTokenURI */
  const EssenceStone = isTesting
    ? await ethers.getContractFactory("SLTestEssenceStone")
    : await ethers.getContractFactory("SLEssenceStone");
  const essenceStone = await upgrades.deployProxy(
    EssenceStone,
    [project.address, dungeonGate.address, system.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await essenceStone.deployed();
  console.log(`💎 EssenceStone deployed to: ${essenceStone.address}`);

  const addCollectionTx2 = await project.addCollection(
    essenceStone.address,
    CREATOR
  );
  await addCollectionTx2.wait();
  console.log("EssenceStone collection id: 2");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.EssenceStone,
          season: Season.All,
          address: essenceStone.address,
          date: getDate(),
          abi: getContractABI(ContractType.EssenceStone),
          byteCode: getContractByteCode(ContractType.EssenceStone),
          dependencyType: [
            ContractType.Project,
            ContractType.DungeonGate,
            ContractType.System,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.EssenceStone,
      network.name,
      essenceStone.address,
      await getImplementationAddress(essenceStone.address)
    );
  }

  /* DEPLOY MONSTER COLLECTION
     REQUIRE : _projectContract, _monsterFactoryContract, _systemContract, _baseTokenURI */
  const Monster = isTesting
    ? await ethers.getContractFactory("SLTestMonster")
    : await ethers.getContractFactory("SLMonster");
  const monster = await upgrades.deployProxy(
    Monster,
    [project.address, monsterFactory.address, system.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await monster.deployed();
  console.log(`💎 Monster deployed to: ${monster.address}`);

  const addCollectionTx3 = await project.addCollection(
    monster.address,
    CREATOR
  );
  await addCollectionTx3.wait();
  console.log("Monster collection id: 3");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.Monster,
          season: Season.All,
          address: monster.address,
          date: getDate(),
          abi: getContractABI(ContractType.Monster),
          byteCode: getContractByteCode(ContractType.Monster),
          dependencyType: [
            ContractType.Project,
            ContractType.MonsterFactory,
            ContractType.System,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.Monster,
      network.name,
      monster.address,
      await getImplementationAddress(monster.address)
    );
  }

  /* DEPLOY SHADOW ARMY COLLECTION
     REQUIRE : _projectContract, _monsterFactoryContract, _systemContract, _baseTokenURI */
  const ShadowArmy = isTesting
    ? await ethers.getContractFactory("SLTestShadowArmy")
    : await ethers.getContractFactory("SLShadowArmy");
  const shadowArmy = await upgrades.deployProxy(
    ShadowArmy,
    [project.address, monsterFactory.address, system.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await shadowArmy.deployed();
  console.log(`💎 ShadowArmy deployed to: ${shadowArmy.address}`);

  const addCollectionTx4 = await project.addCollection(
    shadowArmy.address,
    CREATOR
  );
  await addCollectionTx4.wait();
  console.log("ShadowArmy collection id: 4");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.ShadowArmy,
          season: Season.All,
          address: shadowArmy.address,
          date: getDate(),
          abi: getContractABI(ContractType.ShadowArmy),
          byteCode: getContractByteCode(ContractType.ShadowArmy),
          dependencyType: [
            ContractType.Project,
            ContractType.MonsterFactory,
            ContractType.System,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.ShadowArmy,
      network.name,
      shadowArmy.address,
      await getImplementationAddress(shadowArmy.address)
    );
  }

  /* DEPLOY LEGENDARY SCENE COLLECTION
     REQUIRE : _projectContract, _seasonContract, _seasonSettlementContract, _baseTokenURI */
  const LegendaryScene = await ethers.getContractFactory("SLLegendaryScene");
  const legendaryScene = await upgrades.deployProxy(
    LegendaryScene,
    [project.address, season.address, seasonSettlement.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await legendaryScene.deployed();
  console.log(`💎 LegendaryScene deployed to: ${legendaryScene.address}`);

  const addCollectionTx5 = await project.addCollection(
    legendaryScene.address,
    CREATOR
  );
  await addCollectionTx5.wait();
  console.log("LegendaryScene collection id: 5");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.LegendaryScene,
          season: Season.All,
          address: legendaryScene.address,
          date: getDate(),
          abi: getContractABI(ContractType.LegendaryScene),
          byteCode: getContractByteCode(ContractType.LegendaryScene),
          dependencyType: [
            ContractType.Project,
            ContractType.Season,
            ContractType.SeasonSettlement,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.LegendaryScene,
      network.name,
      legendaryScene.address,
      await getImplementationAddress(legendaryScene.address)
    );
  }

  /* DEPLOY ACHIEVEMENT COLLECTION
     REQUIRE : _projectContract, _baseTokenURI */
  const Achievement = await ethers.getContractFactory("SLAchievement");
  const achievement = await upgrades.deployProxy(
    Achievement,
    [project.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await achievement.deployed();
  console.log(`💎 Achievement deployed to: ${achievement.address}`);

  const addCollectionTx6 = await project.addCollection(
    achievement.address,
    CREATOR
  );
  await addCollectionTx6.wait();
  console.log("Achievement collection id: 6");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.Achievement,
          season: Season.All,
          address: achievement.address,
          date: getDate(),
          abi: getContractABI(ContractType.Achievement),
          byteCode: getContractByteCode(ContractType.Achievement),
          dependencyType: [ContractType.Project],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.Achievement,
      network.name,
      achievement.address,
      await getImplementationAddress(achievement.address)
    );
  }

  /* DEPLOY SEASON SCORE COLLECTION
     REQUIRE : _projectContract, _seasonContract, _seasonSettlementContract, _baseTokenURI */
  const SeasonScore = await ethers.getContractFactory("SLSeasonScore");
  const seasonScore = await upgrades.deployProxy(
    SeasonScore,
    [project.address, season.address, seasonSettlement.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await seasonScore.deployed();
  console.log(`💎 SeasonScore deployed to: ${seasonScore.address}`);

  const addCollectionTx7 = await project.addCollection(
    seasonScore.address,
    CREATOR
  );
  await addCollectionTx7.wait();
  console.log("SeasonScore collection id: 7");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.SeasonScore,
          season: Season.All,
          address: seasonScore.address,
          date: getDate(),
          abi: getContractABI(ContractType.SeasonScore),
          byteCode: getContractByteCode(ContractType.SeasonScore),
          dependencyType: [
            ContractType.Project,
            ContractType.Season,
            ContractType.SeasonSettlement,
          ],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.SeasonScore,
      network.name,
      seasonScore.address,
      await getImplementationAddress(seasonScore.address)
    );
  }

  /* DEPLOY HUNTER ITEM COLLECTION
     REQUIRE : _projectContract, _seasonQuestContract, _baseTokenURI */
  const HunterItem = isTesting
    ? await ethers.getContractFactory("SLTestHunterItem")
    : await ethers.getContractFactory("SLHunterItem");
  const hunterItem = await upgrades.deployProxy(
    HunterItem,
    [project.address, seasonQuest.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await hunterItem.deployed();
  console.log(`💎 HunterItem deployed to: ${hunterItem.address}`);

  const addCollectionTx8 = await project.addCollection(
    hunterItem.address,
    CREATOR
  );
  await addCollectionTx8.wait();
  console.log("HunterItem collection id: 8");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.HunterItem,
          season: Season.All,
          address: hunterItem.address,
          date: getDate(),
          abi: getContractABI(ContractType.HunterItem),
          byteCode: getContractByteCode(ContractType.HunterItem),
          dependencyType: [ContractType.Project, ContractType.SeasonQuest],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.HunterItem,
      network.name,
      hunterItem.address,
      await getImplementationAddress(hunterItem.address)
    );
  }

  /* DEPLOY HUNTER RANK COLLECTION
     REQUIRE : _projectContract, _seasonContract, _baseTokenURI */
  const HunterRank = isTesting
    ? await ethers.getContractFactory("SLTestHunterRank")
    : await ethers.getContractFactory("SLHunterRank");
  const hunterRank = await HunterRank.deploy(
    project.address,
    [season.address],
    "baseTokenURI"
  );
  await hunterRank.deployed();
  console.log(`💎 HunterRank deployed to: ${hunterRank.address}`);

  const addCollectionTx9 = await project.addCollection(
    hunterRank.address,
    CREATOR
  );
  await addCollectionTx9.wait();
  console.log("PreSeason HunterRank collection id: 9");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.HunterRank,
          season: Season.PreSeason,
          address: hunterRank.address,
          date: getDate(),
          abi: getContractABI(ContractType.HunterRank),
          byteCode: getContractByteCode(ContractType.HunterRank),
          dependencyType: [ContractType.Project, ContractType.Season],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.HunterRank,
      network.name,
      hunterRank.address,
      ZERO_ADDRESS
    );
  }

  /* DEPLOY TOP100 COLLECTION
     REQUIRE : _projectContract, _baseTokenURI */
  const Top100 = await ethers.getContractFactory("SLTop100");
  const top100 = await upgrades.deployProxy(
    Top100,
    [project.address, "baseTokenURI"],
    {
      kind: "uups",
    }
  );
  await top100.deployed();
  console.log(`💎 Top100 deployed to: ${top100.address}`);

  const addCollectionTx10 = await project.addCollection(
    top100.address,
    CREATOR
  );
  await addCollectionTx10.wait();
  console.log("PreSeason Top100 collection id: 10");

  if (isUpload) {
    await delay(10000);

    await ddbClient.send(
      new PutItemCommand({
        TableName: ddbTableName,
        Item: marshall({
          type: ContractType.Top100,
          season: Season.PreSeason,
          address: top100.address,
          date: getDate(),
          abi: getContractABI(ContractType.Top100),
          byteCode: getContractByteCode(ContractType.Top100),
          dependencyType: [ContractType.Project],
        }),
      })
    );

    deployed = updateDeployed(
      deployed,
      ContractType.Top100,
      network.name,
      top100.address,
      await getImplementationAddress(top100.address)
    );
  }

  deployed = JSON.stringify(deployed);
  fs.writeFileSync("./deployed.json", deployed);

  console.log("👍🏻 SUCCESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
