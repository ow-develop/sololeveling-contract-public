import fs from "fs";
import { prompt } from "prompts";
import { ethers, network, upgrades } from "hardhat";
import {
  CollectionId,
  ContractType,
  CREATOR,
  OPERATOR_MASTER,
  PublicNetwork,
  RANDOM_SIGNER,
  USDC_ADDRESS_POLYGON,
  ZERO_ADDRESS,
} from "../helpers/constant/common";
import { delay } from "../helpers/ddbHelper";
import {
  getImplementationAddress,
  updateDeployed,
} from "../helpers/deployed-address";

async function main() {
  const [operatorManager] = await ethers.getSigners();

  const { isDeploy, isUpdate, isTesting } = await prompt([
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
      name: "isUpdate",
      message: "Do you update contract deployed address",
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

  if (isUpdate) {
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

  if (isUpdate) {
    await delay(5000);

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
  const SLSeason = isTesting
    ? await ethers.getContractFactory("SLSeasonTest")
    : await ethers.getContractFactory("SLSeason");
  const season = await upgrades.deployProxy(
    SLSeason,
    [
      project.address,
      monsterFactory.address,
      CollectionId.Monster,
      CollectionId.ShadowArmy,
    ],
    {
      kind: "uups",
    }
  );
  await season.deployed();
  console.log(`💎 Season deployed to: ${season.address}`);

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.Season,
      network.name,
      season.address,
      await getImplementationAddress(season.address)
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

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.Random,
      network.name,
      random.address,
      await getImplementationAddress(random.address)
    );
  }

  let USDCTokenAddress;

  /* DEPLOY TEST USDC TOKEN
     REQUIRE : _initialSupply */
  if (isTesting) {
    const TestUSDC = await ethers.getContractFactory("TestUSDC");
    const testUSDC = await TestUSDC.deploy(0);
    await testUSDC.deployed();
    console.log(`💎 TestUSDC deployed to: ${testUSDC.address}`);

    if (isUpdate) {
      await delay(5000);

      deployed = updateDeployed(
        deployed,
        ContractType.TestUSDC,
        network.name,
        testUSDC.address,
        ZERO_ADDRESS
      );
    }

    USDCTokenAddress = testUSDC.address;
  } else {
    USDCTokenAddress = USDC_ADDRESS_POLYGON;
  }

  /* DEPLOY SHOP
     REQUIRE : _projectContract, _USDCTokenContract, _gateKeyCollectionId */
  const Shop = await ethers.getContractFactory("SLShop");
  const shop = await upgrades.deployProxy(
    Shop,
    [
      project.address,
      USDCTokenAddress,
      CollectionId.GateKey,
      CollectionId.EssenceStone,
    ],
    {
      kind: "uups",
    }
  );
  await shop.deployed();
  console.log(`💎 Shop deployed to: ${shop.address}`);

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.Shop,
      network.name,
      shop.address,
      await getImplementationAddress(shop.address)
    );
  }

  /* DEPLOY DUNGEON GATE
     REQUIRE : _projectContract, _seasonContract, _randomContract, _shopContract, _monsterFactoryContract, 
     _essenceStoneCollectionId, _gateKeyCollectionId _nomalMonsterCollectionId */
  const DungeonGate = await ethers.getContractFactory("SLDungeonGate");
  const dungeonGate = await upgrades.deployProxy(
    DungeonGate,
    [
      project.address,
      season.address,
      random.address,
      shop.address,
      monsterFactory.address,
      CollectionId.EssenceStone,
      CollectionId.GateKey,
      CollectionId.Monster,
    ],
    {
      kind: "uups",
    }
  );
  await dungeonGate.deployed();
  console.log(`💎 DungeonGate deployed to: ${dungeonGate.address}`);

  if (isUpdate) {
    await delay(5000);

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
      ZERO_ADDRESS,
      dungeonGate.address,
      CollectionId.LegendaryScene,
      CollectionId.SeasonScore,
    ],
    {
      kind: "uups",
    }
  );
  await seasonSettlement.deployed();
  console.log(`💎 SeasonSettlement deployed to: ${seasonSettlement.address}`);

  if (isUpdate) {
    await delay(5000);

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
    [
      project.address,
      monsterFactory.address,
      random.address,
      CollectionId.EssenceStone,
      CollectionId.Monster,
      CollectionId.ShadowArmy,
    ],
    {
      kind: "uups",
    }
  );
  await system.deployed();
  console.log(`💎 System deployed to: ${system.address}`);

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.System,
      network.name,
      system.address,
      await getImplementationAddress(system.address)
    );
  }

  /***************************
   **** DEPLOY COLLECTION ****
   ***************************/

  /************************ APPRPVOAL CONTROLLER ************************/

  /* DEPLOY APPROVAL CONTROLLER
     REQUIRE : _projectContract, _contracts(seasonContract, dungeonGateContract, systemContract) */
  const ApprovalController = await ethers.getContractFactory(
    "SLApprovalController"
  );
  const approvalController = await ApprovalController.deploy(project.address, [
    season.address,
    dungeonGate.address,
    system.address,
  ]);
  await approvalController.deployed();
  console.log(
    `💎 Approval Controller deployed to: ${approvalController.address}`
  );

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.ApprovalController,
      network.name,
      approvalController.address,
      ZERO_ADDRESS
    );
  }

  /************************ SHADOW MONARCH COLLECTION ID 1 ************************/

  /* DEPLOY SHADOW MONARCH COLLECTION
     REQUIRE : _projectContract, _approvalControllerContract, _controllers(offeringContract), _baseTokenURI */
  const ShadowMonarch = isTesting
    ? await ethers.getContractFactory("SLTestShadowMonarch")
    : await ethers.getContractFactory("SLShadowMonarch");
  const shadowMonarch = await upgrades.deployProxy(
    ShadowMonarch,
    [project.address, approvalController.address, [], "baseTokenURI"],
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

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.ShadowMonarch,
      network.name,
      shadowMonarch.address,
      await getImplementationAddress(shadowMonarch.address)
    );
  }

  /************************ ESSENCE STONE COLLECTION ID 2 ************************/

  /* DEPLOY ESSENCE STONE COLLECTION
     REQUIRE : _projectContract, _approvalControllerContract, _controllers(systemContract), _baseTokenURI */
  const EssenceStone = isTesting
    ? await ethers.getContractFactory("SLTestEssenceStone")
    : await ethers.getContractFactory("SLEssenceStone");
  const essenceStone = await upgrades.deployProxy(
    EssenceStone,
    [
      project.address,
      approvalController.address,
      [system.address],
      "baseTokenURI",
    ],
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

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.EssenceStone,
      network.name,
      essenceStone.address,
      await getImplementationAddress(essenceStone.address)
    );
  }

  /************************ MONSTER COLLECTION ID 3 ************************/

  /* DEPLOY MONSTER COLLECTION
     REQUIRE : _projectContract, _monsterFactoryContract,  _approvalControllerContract, _controllers(dungeonGateContract, systemContract), _baseTokenURI */
  const Monster = isTesting
    ? await ethers.getContractFactory("SLTestMonster")
    : await ethers.getContractFactory("SLMonster");
  const monster = await upgrades.deployProxy(
    Monster,
    [
      project.address,
      monsterFactory.address,
      approvalController.address,
      [dungeonGate.address, system.address],
      "baseTokenURI",
    ],
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

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.Monster,
      network.name,
      monster.address,
      await getImplementationAddress(monster.address)
    );
  }

  /************************ SHADOW ARMY COLLECTION ID 4 ************************/

  /* DEPLOY SHADOW ARMY COLLECTION
     REQUIRE : _projectContract, _monsterFactoryContract,  _approvalControllerContract, _controllers(systemContract), _baseTokenURI */
  const ShadowArmy = isTesting
    ? await ethers.getContractFactory("SLTestShadowArmy")
    : await ethers.getContractFactory("SLShadowArmy");
  const shadowArmy = await upgrades.deployProxy(
    ShadowArmy,
    [
      project.address,
      monsterFactory.address,
      approvalController.address,
      [system.address],
      "baseTokenURI",
    ],
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

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.ShadowArmy,
      network.name,
      shadowArmy.address,
      await getImplementationAddress(shadowArmy.address)
    );
  }

  /************************ GATE KEY COLLECTION ID 5 ************************/

  /* DEPLOY GATE KEY COLLECTION
     REQUIRE : _projectContract,  _approvalControllerContract, _controllers(shopContract), _baseTokenURI */
  const GateKey = await ethers.getContractFactory("SLGateKey");
  const gateKey = await upgrades.deployProxy(
    GateKey,
    [
      project.address,
      approvalController.address,
      isTesting ? [operatorManager.address, shop.address] : [shop.address],
      "baseTokenURI",
    ],
    {
      kind: "uups",
    }
  );
  await gateKey.deployed();
  console.log(`💎 GateKey deployed to: ${gateKey.address}`);

  const addCollectionTx5 = await project.addCollection(
    gateKey.address,
    CREATOR
  );
  await addCollectionTx5.wait();
  console.log("GateKey collection id: 5");

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.GateKey,
      network.name,
      gateKey.address,
      await getImplementationAddress(gateKey.address)
    );
  }

  /************************ LEGENDARY SCENE COLLECTION ID 6 ************************/

  /* DEPLOY LEGENDARY SCENE COLLECTION
     REQUIRE : _projectContract, _seasonContract,  _approvalControllerContract, _controllers(seasonSettlementContract), _baseTokenURI */
  const LegendaryScene = await ethers.getContractFactory("SLLegendaryScene");
  const legendaryScene = await upgrades.deployProxy(
    LegendaryScene,
    [
      project.address,
      season.address,
      approvalController.address,
      [seasonSettlement.address],
      "baseTokenURI",
    ],
    {
      kind: "uups",
    }
  );
  await legendaryScene.deployed();
  console.log(`💎 LegendaryScene deployed to: ${legendaryScene.address}`);

  const addCollectionTx6 = await project.addCollection(
    legendaryScene.address,
    CREATOR
  );
  await addCollectionTx6.wait();
  console.log("LegendaryScene collection id: 6");

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.LegendaryScene,
      network.name,
      legendaryScene.address,
      await getImplementationAddress(legendaryScene.address)
    );
  }

  /************************ SEASON SCORE COLLECTION ID 7 ************************/

  /* DEPLOY SEASON SCORE COLLECTION
     REQUIRE : _projectContract, _seasonContract, _controllers(seasonSettlementContract), _baseTokenURI */
  const SeasonScore = await ethers.getContractFactory("SLSeasonScore");
  const seasonScore = await upgrades.deployProxy(
    SeasonScore,
    [
      project.address,
      season.address,
      [seasonSettlement.address],
      "baseTokenURI",
    ],
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

  if (isUpdate) {
    await delay(5000);

    deployed = updateDeployed(
      deployed,
      ContractType.SeasonScore,
      network.name,
      seasonScore.address,
      await getImplementationAddress(seasonScore.address)
    );
  }

  // /************************ ACHIEVEMENT COLLECTION ID 8 ************************/
  //
  // /* DEPLOY ACHIEVEMENT COLLECTION
  //    REQUIRE : _projectContract, _baseTokenURI */
  // const Achievement = await ethers.getContractFactory("SLAchievement");
  // const achievement = await upgrades.deployProxy(
  //   Achievement,
  //   [project.address, "baseTokenURI"],
  //   {
  //     kind: "uups",
  //   }
  // );
  // await achievement.deployed();
  // console.log(`💎 Achievement deployed to: ${achievement.address}`);
  //
  // const addCollectionTx8 = await project.addCollection(
  //   achievement.address,
  //   CREATOR
  // );
  // await addCollectionTx8.wait();
  // console.log("Achievement collection id: 8");
  //
  // if (isUpdate) {
  //   await delay(5000);
  //
  //   deployed = updateDeployed(
  //     deployed,
  //     ContractType.Achievement,
  //     network.name,
  //     achievement.address,
  //     await getImplementationAddress(achievement.address)
  //   );
  // }

  deployed = JSON.stringify(deployed);
  fs.writeFileSync("./deployed.json", deployed);

  console.log("👍🏻 SUCCESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
