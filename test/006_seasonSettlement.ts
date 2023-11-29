// import { StoneType } from "./../helpers/constant/contract";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { Contract } from "ethers";
// import { ethers, expect, upgrades } from "hardhat";

// import {
//   getBlockTimestamp,
//   getCurrentBlockNumber,
//   setNextBlockNumber,
// } from "../helpers/block-timestamp";
// import { RankType } from "../helpers/constant/contract";
// import { SeasonScore } from "./../helpers/type/contract";
// import { SetScoreRate, SeasonRewardClaimed } from "../helpers/type/event";
// import { ZERO_ADDRESS } from "../helpers/constant/common";

// describe("SeasonSettlement", () => {
//   let operatorMaster: SignerWithAddress,
//     operatorManager: SignerWithAddress,
//     notOperator: SignerWithAddress,
//     creator: SignerWithAddress,
//     randomSigner: SignerWithAddress,
//     hunter1: SignerWithAddress,
//     hunter2: SignerWithAddress;

//   let project: Contract,
//     operator: Contract,
//     monsterFactory: Contract,
//     season: Contract,
//     seasonQuest: Contract,
//     random: Contract,
//     dungeonGate: Contract,
//     seasonSettlement: Contract,
//     essenceStone: Contract,
//     normalMonster: Contract,
//     shadowMonster: Contract,
//     legendaryScene: Contract,
//     seasonScore: Contract,
//     hunterItem: Contract,
//     season0HunterRank: Contract,
//     season1HunterRank: Contract,
//     season0SeasonPack: Contract,
//     season1SeasonPack: Contract;

//   let SetScoreRateEvent: SetScoreRate,
//     SeasonRewardClaimedEvent: SeasonRewardClaimed;

//   let seasonScoreObj: SeasonScore,
//     seasonId: number,
//     questScore: number,
//     convertedQuestScore: number,
//     activityScore: number,
//     convertedActivityScore: number,
//     collectingScore: number,
//     convertedCollectingScore: number;

//   const scoreRate = {
//     quest: 50_00000,
//     activity: 30_00000,
//     collecting: 20_00000,
//   };
//   const denomiantor = 100_00000;
//   const scorePerGate = 100;

//   before(async () => {
//     [
//       operatorMaster,
//       operatorManager,
//       notOperator,
//       creator,
//       randomSigner,
//       hunter1,
//       hunter2,
//     ] = await ethers.getSigners();
//     console.log(
//       "Deploying contracts with the account: " + operatorMaster.address
//     );

//     // deploy operator wallet
//     const RoleWallet = await ethers.getContractFactory("SLRoleWallet");
//     operator = await RoleWallet.deploy(
//       [operatorMaster.address],
//       [operatorManager.address]
//     );
//     await operator.deployed();
//     console.log(`Operator deployed to: ${operator.address}`);

//     // deploy project
//     const Project = await ethers.getContractFactory("SLProject");
//     project = await upgrades.deployProxy(Project, [operator.address], {
//       kind: "uups",
//     });
//     await project.deployed();
//     console.log(`Project deployed to: ${project.address}`);

//     // deploy monsterFactory
//     const MonsterFactory = await ethers.getContractFactory("SLMonsterFactory");
//     monsterFactory = await upgrades.deployProxy(
//       MonsterFactory,
//       [project.address],
//       { kind: "uups" }
//     );
//     await monsterFactory.deployed();
//     console.log(`MonsterFactory deployed to: ${monsterFactory.address}`);

//     // deploy season
//     const Season = await ethers.getContractFactory("SLSeason");
//     season = await upgrades.deployProxy(
//       Season,
//       [project.address, monsterFactory.address, 2, 3],
//       {
//         kind: "uups",
//       }
//     );
//     await season.deployed();
//     console.log(`Season deployed to: ${season.address}`);

//     // deploy seasonQuest
//     const SeasonQuest = await ethers.getContractFactory("SLSeasonQuest");
//     seasonQuest = await upgrades.deployProxy(
//       SeasonQuest,
//       [project.address, monsterFactory.address, season.address, 6, 1, 2],
//       {
//         kind: "uups",
//       }
//     );
//     await seasonQuest.deployed();
//     console.log(`SeasonQuest deployed to: ${seasonQuest.address}`);

//     // deploy random
//     const Random = await ethers.getContractFactory("SLRandom");
//     random = await upgrades.deployProxy(
//       Random,
//       [project.address, randomSigner.address],
//       {
//         kind: "uups",
//       }
//     );
//     await random.deployed();
//     console.log(`Random deployed to: ${random.address}`);

//     // deploy dungeonGate
//     const DungeonGate = await ethers.getContractFactory("SLDungeonGate");
//     dungeonGate = await upgrades.deployProxy(
//       DungeonGate,
//       [
//         project.address,
//         season.address,
//         random.address,
//         monsterFactory.address,
//         1,
//         [operatorManager.address],
//         [100_00000],
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await dungeonGate.deployed();
//     console.log(`DungeonGate deployed to: ${dungeonGate.address}`);

//     const SeasonSettlement = await ethers.getContractFactory(
//       "SLSeasonSettlement"
//     );
//     seasonSettlement = await upgrades.deployProxy(
//       SeasonSettlement,
//       [
//         project.address,
//         season.address,
//         seasonQuest.address,
//         dungeonGate.address,
//         4,
//         5,
//       ], // legendaryScene, seasonScore
//       {
//         kind: "uups",
//       }
//     );
//     await seasonSettlement.deployed();
//     console.log(`SeasonSettlement deployed to: ${seasonSettlement.address}`);

//     // deploy test essenceStone - collectionId 1
//     const EssenceStone = await ethers.getContractFactory("SLTestEssenceStone");
//     essenceStone = await upgrades.deployProxy(
//       EssenceStone,
//       [
//         project.address,
//         ZERO_ADDRESS,
//         [dungeonGate.address, dungeonGate.address],
//         "baseTokenURI",
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await essenceStone.deployed();
//     console.log(`EssenceStone deployed to: ${essenceStone.address}`);

//     const setProjectApprovalModeTx = await essenceStone.setProjectApprovalMode(
//       false
//     );
//     await setProjectApprovalModeTx.wait();

//     const addCollectionTx1 = await project
//       .connect(operatorManager)
//       .addCollection(essenceStone.address, creator.address);
//     await addCollectionTx1.wait();

//     // deploy normalMonster - collectionId 2
//     const TestMonster = await ethers.getContractFactory("SLTestMonster");
//     normalMonster = await upgrades.deployProxy(
//       TestMonster,
//       [
//         project.address,
//         monsterFactory.address,
//         ZERO_ADDRESS,
//         [monsterFactory.address],
//         "baseTokenURI",
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await normalMonster.deployed();
//     console.log(`NormalMonster deployed to: ${normalMonster.address}`);

//     const setProjectApprovalModeTx2 =
//       await normalMonster.setProjectApprovalMode(false);
//     await setProjectApprovalModeTx2.wait();

//     const addCollectionTx2 = await project
//       .connect(operatorManager)
//       .addCollection(normalMonster.address, creator.address);
//     await addCollectionTx2.wait();

//     // deploy shadowMonster - collectionId 3
//     const TestShadowMonster = await ethers.getContractFactory(
//       "SLTestShadowArmy"
//     );
//     shadowMonster = await upgrades.deployProxy(
//       TestShadowMonster,
//       [
//         project.address,
//         monsterFactory.address,
//         ZERO_ADDRESS,
//         [monsterFactory.address],
//         "baseTokenURI",
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await shadowMonster.deployed();
//     console.log(`ShadowMonster deployed to: ${shadowMonster.address}`);

//     const setProjectApprovalModeTx3 =
//       await shadowMonster.setProjectApprovalMode(false);
//     await setProjectApprovalModeTx3.wait();

//     const addCollectionTx3 = await project
//       .connect(operatorManager)
//       .addCollection(shadowMonster.address, creator.address);
//     await addCollectionTx3.wait();

//     // deploy legendaryScene - collectionId 4
//     const LegendaryScene = await ethers.getContractFactory("SLLegendaryScene");
//     legendaryScene = await upgrades.deployProxy(
//       LegendaryScene,
//       [
//         project.address,
//         season.address,
//         ZERO_ADDRESS,
//         [seasonSettlement.address],
//         "baseTokenURI",
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await legendaryScene.deployed();
//     console.log(`LegendaryScene deployed to: ${legendaryScene.address}`);

//     const setProjectApprovalModeTx4 =
//       await legendaryScene.setProjectApprovalMode(false);
//     await setProjectApprovalModeTx4.wait();

//     const addCollectionTx4 = await project
//       .connect(operatorManager)
//       .addCollection(legendaryScene.address, creator.address);
//     await addCollectionTx4.wait();

//     // deploy seasonScore - collectionId 5
//     const SeasonScore = await ethers.getContractFactory("SLSeasonScore");
//     seasonScore = await upgrades.deployProxy(
//       SeasonScore,
//       [
//         project.address,
//         season.address,
//         [seasonSettlement.address],
//         "baseTokenURI",
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await seasonScore.deployed();
//     console.log(`SeasonScore deployed to: ${seasonScore.address}`);

//     const addCollectionTx5 = await project
//       .connect(operatorManager)
//       .addCollection(seasonScore.address, creator.address);
//     await addCollectionTx5.wait();

//     // deploy test hunterItem - collectionId 6
//     const HunterItem = await ethers.getContractFactory("SLTestHunterItem");
//     hunterItem = await upgrades.deployProxy(
//       HunterItem,
//       [project.address, [seasonQuest.address], "baseTokenURI"],
//       {
//         kind: "uups",
//       }
//     );
//     await hunterItem.deployed();
//     console.log(`HunterItem deployed to: ${hunterItem.address}`);

//     const addCollectionTx6 = await project
//       .connect(operatorManager)
//       .addCollection(hunterItem.address, creator.address);
//     await addCollectionTx6.wait();

//     // deploy test season0 hunterRank - collectionId 7
//     const HunterRank = await ethers.getContractFactory("SLTestHunterRank");
//     season0HunterRank = await HunterRank.deploy(
//       project.address,
//       [season.address],
//       "baseTokenURI"
//     );
//     await season0HunterRank.deployed();
//     console.log(`HunterRank deployed to: ${season0HunterRank.address}`);

//     const addCollectionTx7 = await project
//       .connect(operatorManager)
//       .addCollection(season0HunterRank.address, creator.address);
//     await addCollectionTx7.wait();

//     // deploy test season1 hunterRank - collectionId 8
//     season1HunterRank = await HunterRank.deploy(
//       project.address,
//       [season.address],
//       "baseTokenURI"
//     );
//     await season1HunterRank.deployed();
//     console.log(`HunterRank deployed to: ${season1HunterRank.address}`);

//     const addCollectionTx8 = await project
//       .connect(operatorManager)
//       .addCollection(season1HunterRank.address, creator.address);
//     await addCollectionTx8.wait();

//     // deploy season0 seasonPack - collectionId 9
//     const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
//     season0SeasonPack = await SeasonPack.deploy(
//       project.address,
//       ZERO_ADDRESS,
//       [project.address],
//       "baseTokenURI"
//     );
//     await season0SeasonPack.deployed();
//     console.log(`Season0 SeasonPack deployed to: ${season0SeasonPack.address}`);

//     const addCollectionTx9 = await project
//       .connect(operatorManager)
//       .addCollection(season0SeasonPack.address, creator.address);
//     await addCollectionTx9.wait();

//     // deploy season1 seasonPack - collectionId 10
//     season1SeasonPack = await SeasonPack.deploy(
//       project.address,
//       ZERO_ADDRESS,
//       [project.address],
//       "baseTokenURI"
//     );
//     await season1SeasonPack.deployed();
//     console.log(`Season1 SeasonPack deployed to: ${season1SeasonPack.address}`);

//     const addCollectionTx10 = await project
//       .connect(operatorManager)
//       .addCollection(season1SeasonPack.address, creator.address);
//     await addCollectionTx10.wait();

//     // add season0
//     const currentBlockNumber = await getCurrentBlockNumber();
//     const addSeason0Tx = await season
//       .connect(operatorManager)
//       .addSeason(
//         7,
//         9,
//         currentBlockNumber + 100,
//         currentBlockNumber + 500,
//         [2, 3]
//       );
//     await addSeason0Tx.wait();

//     // add season1
//     const addSeason1Tx = await season
//       .connect(operatorManager)
//       .addSeason(
//         8,
//         10,
//         currentBlockNumber + 600,
//         currentBlockNumber + 1000,
//         [2, 3]
//       );
//     await addSeason1Tx.wait();

//     // add monster
//     const addNormalMonsterTx = await monsterFactory.addMonster(
//       RankType.E,
//       false
//     );
//     await addNormalMonsterTx.wait();

//     const addNormalMonsterTx2 = await monsterFactory.addMonster(
//       RankType.D,
//       false
//     );
//     await addNormalMonsterTx2.wait();

//     const addNormalMonsterTx3 = await monsterFactory.addMonster(
//       RankType.C,
//       false
//     );
//     await addNormalMonsterTx3.wait();

//     const addNormalMonsterTx4 = await monsterFactory.addMonster(
//       RankType.B,
//       false
//     );
//     await addNormalMonsterTx4.wait();

//     const addNormalMonsterTx5 = await monsterFactory.addMonster(
//       RankType.A,
//       false
//     );
//     await addNormalMonsterTx5.wait();

//     const addNormalMonsterTx6 = await monsterFactory.addMonster(
//       RankType.S,
//       false
//     );
//     await addNormalMonsterTx6.wait();

//     const addShadowMonsterTx = await monsterFactory.addMonster(
//       RankType.B,
//       true
//     );
//     await addShadowMonsterTx.wait();

//     const addShadowMonsterTx2 = await monsterFactory.addMonster(
//       RankType.A,
//       true
//     );
//     await addShadowMonsterTx2.wait();

//     const addShadowMonsterTx3 = await monsterFactory.addMonster(
//       RankType.S,
//       true
//     );
//     await addShadowMonsterTx3.wait();

//     // monster score set
//     const setNormalMonsterScoreTx = await monsterFactory.setMonsterScore(
//       false,
//       [10, 20, 30, 40, 50, 60]
//     );
//     await setNormalMonsterScoreTx.wait();

//     const setShadowMonsterScoreTx = await monsterFactory.setMonsterScore(
//       true,
//       [100, 200, 300]
//     );
//     await setShadowMonsterScoreTx.wait();
//   });

//   ///////////
//   // Score //
//   ///////////

//   describe("Score", async () => {
//     it("Get Score Rate", async () => {
//       const scoreRate = await seasonSettlement.getScoreRate();

//       expect(scoreRate.quest).to.equal(50_00000);
//       expect(scoreRate.activity).to.equal(30_00000);
//       expect(scoreRate.collecting).to.equal(20_00000);
//     });

//     it("Get Score Per Gate", async () => {
//       const scorePerGate = await seasonSettlement.getScorePerGate();

//       expect(scorePerGate).to.equal(100);
//     });

//     it("Get Current Season Score : 0", async () => {
//       await setNextBlockNumber(100);

//       seasonId = 0;

//       seasonScoreObj = await seasonSettlement.getCurrentSeasonScore(
//         seasonId,
//         hunter1.address
//       );

//       expect(seasonScoreObj.questScore).to.equal(0);
//       expect(seasonScoreObj.convertedQuestScore).to.equal(0);
//       expect(seasonScoreObj.activityScore).to.equal(0);
//       expect(seasonScoreObj.convertedActivityScore).to.equal(0);
//       expect(seasonScoreObj.collectingScore).to.equal(0);
//       expect(seasonScoreObj.convertedCollectingScore).to.equal(0);
//       expect(seasonScoreObj.seasonScore).to.equal(0);
//     });

//     it("Get Current Season Score : Quest Score", async () => {
//       seasonId = 0;

//       const addGeneralQuestTx = await seasonQuest.addGeneralQuest({
//         seasonId,
//         rewardScore: 100,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [],
//       });
//       await addGeneralQuestTx.wait();

//       const questId = 1;

//       const claimERankTx = await season.connect(hunter1).claimERank(seasonId);
//       await claimERankTx.wait();

//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [questId, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       const operatorSignature = await operatorManager.signMessage(
//         messageBinary
//       );

//       const confirmGeneralQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//       await confirmGeneralQuestTx.wait();

//       questScore = 100;
//       activityScore = 0;
//       collectingScore = 0;

//       convertedQuestScore = (questScore * scoreRate.quest) / denomiantor;
//       convertedActivityScore =
//         (activityScore * scoreRate.activity) / denomiantor;
//       convertedCollectingScore =
//         (collectingScore * scoreRate.collecting) / denomiantor;

//       seasonScoreObj = await seasonSettlement.getCurrentSeasonScore(
//         seasonId,
//         hunter1.address
//       );

//       expect(seasonScoreObj.questScore).to.equal(questScore);
//       expect(seasonScoreObj.convertedQuestScore).to.equal(convertedQuestScore);
//       expect(seasonScoreObj.activityScore).to.equal(activityScore);
//       expect(seasonScoreObj.convertedActivityScore).to.equal(
//         convertedActivityScore
//       );
//       expect(seasonScoreObj.collectingScore).to.equal(collectingScore);
//       expect(seasonScoreObj.convertedCollectingScore).to.equal(
//         convertedCollectingScore
//       );
//       expect(seasonScoreObj.seasonScore).to.equal(
//         convertedQuestScore + convertedActivityScore + convertedCollectingScore
//       );
//     });

//     it("Get Current Season Score : Activity Score", async () => {
//       seasonId = 0;

//       const enterToGateTx = await dungeonGate
//         .connect(hunter1)
//         .enterToGate(seasonId, RankType.E, {
//           value: ethers.utils.parseEther("1"),
//         });
//       await enterToGateTx.wait();

//       activityScore = scorePerGate * 1;

//       seasonScoreObj = await seasonSettlement.getCurrentSeasonScore(
//         seasonId,
//         hunter1.address
//       );

//       convertedActivityScore =
//         (activityScore * scoreRate.activity) / denomiantor;

//       expect(seasonScoreObj.questScore).to.equal(questScore);
//       expect(seasonScoreObj.convertedQuestScore).to.equal(convertedQuestScore);
//       expect(seasonScoreObj.activityScore).to.equal(activityScore);
//       expect(seasonScoreObj.convertedActivityScore).to.equal(
//         convertedActivityScore
//       );
//       expect(seasonScoreObj.collectingScore).to.equal(collectingScore);
//       expect(seasonScoreObj.convertedCollectingScore).to.equal(
//         convertedCollectingScore
//       );
//       expect(seasonScoreObj.seasonScore).to.equal(
//         convertedQuestScore + convertedActivityScore + convertedCollectingScore
//       );
//     });

//     it("Get Current Season Score : Collecting Score", async () => {
//       seasonId = 0;

//       const mintTx = await normalMonster.mintOfTestBatch(
//         hunter1.address,
//         [1, 2, 3, 4, 5, 6],
//         [1, 1, 1, 1, 1, 1]
//       );
//       await mintTx.wait();

//       const mintTx2 = await shadowMonster.mintOfTestBatch(
//         hunter1.address,
//         [1, 2, 3],
//         [1, 1, 1]
//       );
//       await mintTx2.wait();

//       const normalCollectingScore =
//         await normalMonster.getLatestCollectingScore(hunter1.address);
//       const shadowCollectingScore =
//         await shadowMonster.getLatestCollectingScore(hunter1.address);

//       expect(normalCollectingScore).to.equal(10 + 20 + 30 + 40 + 50 + 60);
//       expect(shadowCollectingScore).to.equal(100 + 200 + 300);

//       const totalCollectingScore = normalCollectingScore.add(
//         shadowCollectingScore
//       );

//       collectingScore = totalCollectingScore;

//       convertedCollectingScore =
//         (collectingScore * scoreRate.collecting) / denomiantor;

//       seasonScoreObj = await seasonSettlement.getCurrentSeasonScore(
//         seasonId,
//         hunter1.address
//       );

//       expect(seasonScoreObj.questScore).to.equal(questScore);
//       expect(seasonScoreObj.convertedQuestScore).to.equal(convertedQuestScore);
//       expect(seasonScoreObj.activityScore).to.equal(activityScore);
//       expect(seasonScoreObj.convertedActivityScore).to.equal(
//         convertedActivityScore
//       );
//       expect(seasonScoreObj.collectingScore).to.equal(collectingScore);
//       expect(seasonScoreObj.convertedCollectingScore).to.equal(
//         convertedCollectingScore
//       );
//       expect(seasonScoreObj.seasonScore).to.equal(
//         convertedQuestScore + convertedActivityScore + convertedCollectingScore
//       );
//     });

//     it("Get Current Season Score Batch", async () => {
//       const seasonScores = await seasonSettlement.getCurrentSeasonScoreBatch(
//         seasonId,
//         [hunter1.address, hunter2.address]
//       );

//       const hunter1SeasonScore = seasonScores[0];
//       const hunter2SeasonScore = seasonScores[1];

//       expect(hunter1SeasonScore.questScore).to.equal(questScore);
//       expect(hunter1SeasonScore.convertedQuestScore).to.equal(
//         convertedQuestScore
//       );
//       expect(hunter1SeasonScore.activityScore).to.equal(activityScore);
//       expect(hunter1SeasonScore.convertedActivityScore).to.equal(
//         convertedActivityScore
//       );
//       expect(hunter1SeasonScore.collectingScore).to.equal(collectingScore);
//       expect(hunter1SeasonScore.convertedCollectingScore).to.equal(
//         convertedCollectingScore
//       );
//       expect(hunter1SeasonScore.seasonScore).to.equal(
//         convertedQuestScore + convertedActivityScore + convertedCollectingScore
//       );

//       expect(hunter2SeasonScore.questScore).to.equal(0);
//       expect(hunter2SeasonScore.convertedQuestScore).to.equal(0);
//       expect(hunter2SeasonScore.activityScore).to.equal(0);
//       expect(hunter2SeasonScore.convertedActivityScore).to.equal(0);
//       expect(hunter2SeasonScore.collectingScore).to.equal(0);
//       expect(hunter2SeasonScore.convertedCollectingScore).to.equal(0);
//       expect(hunter2SeasonScore.seasonScore).to.equal(0);
//     });

//     it("Get Ended Season Score", async () => {
//       await setNextBlockNumber(500);

//       seasonId = 0;

//       const mintTx = await normalMonster.mintOfTestBatch(
//         hunter1.address,
//         [1, 2, 3, 4, 5, 6],
//         [1, 1, 1, 1, 1, 1]
//       );
//       await mintTx.wait();

//       const mintTx2 = await shadowMonster.mintOfTestBatch(
//         hunter1.address,
//         [1, 2, 3],
//         [1, 1, 1]
//       );
//       await mintTx2.wait();

//       seasonScoreObj = await seasonSettlement.getEndedSeasonScore(
//         seasonId,
//         hunter1.address
//       );

//       expect(seasonScoreObj.questScore).to.equal(questScore);
//       expect(seasonScoreObj.convertedQuestScore).to.equal(convertedQuestScore);
//       expect(seasonScoreObj.activityScore).to.equal(activityScore);
//       expect(seasonScoreObj.convertedActivityScore).to.equal(
//         convertedActivityScore
//       );
//       expect(seasonScoreObj.collectingScore).to.equal(collectingScore);
//       expect(seasonScoreObj.convertedCollectingScore).to.equal(
//         convertedCollectingScore
//       );
//       expect(seasonScoreObj.seasonScore).to.equal(
//         convertedQuestScore + convertedActivityScore + convertedCollectingScore
//       );
//     });

//     it("Get Ended Season Score Batch", async () => {
//       const seasonScores = await seasonSettlement.getEndedSeasonScoreBatch(
//         seasonId,
//         [hunter1.address, hunter2.address]
//       );

//       const hunter1SeasonScore = seasonScores[0];
//       const hunter2SeasonScore = seasonScores[1];

//       expect(hunter1SeasonScore.questScore).to.equal(questScore);
//       expect(hunter1SeasonScore.convertedQuestScore).to.equal(
//         convertedQuestScore
//       );
//       expect(hunter1SeasonScore.activityScore).to.equal(activityScore);
//       expect(hunter1SeasonScore.convertedActivityScore).to.equal(
//         convertedActivityScore
//       );
//       expect(hunter1SeasonScore.collectingScore).to.equal(collectingScore);
//       expect(hunter1SeasonScore.convertedCollectingScore).to.equal(
//         convertedCollectingScore
//       );
//       expect(hunter1SeasonScore.seasonScore).to.equal(
//         convertedQuestScore + convertedActivityScore + convertedCollectingScore
//       );

//       expect(hunter2SeasonScore.questScore).to.equal(0);
//       expect(hunter2SeasonScore.convertedQuestScore).to.equal(0);
//       expect(hunter2SeasonScore.activityScore).to.equal(0);
//       expect(hunter2SeasonScore.convertedActivityScore).to.equal(0);
//       expect(hunter2SeasonScore.collectingScore).to.equal(0);
//       expect(hunter2SeasonScore.convertedCollectingScore).to.equal(0);
//       expect(hunter2SeasonScore.seasonScore).to.equal(0);
//     });

//     it("Set Score Rate : Success", async () => {
//       const setScoreRateTx = await seasonSettlement.setScoreRate(
//         40_00000,
//         30_00000,
//         30_00000
//       );

//       const timestamp = await getBlockTimestamp(setScoreRateTx.blockNumber);

//       SetScoreRateEvent = {
//         quest: 40_00000,
//         activity: 30_00000,
//         collecting: 30_00000,
//         timestamp,
//       };

//       await expect(setScoreRateTx)
//         .to.emit(seasonSettlement, "SetScoreRate")
//         .withArgs(
//           SetScoreRateEvent.quest,
//           SetScoreRateEvent.activity,
//           SetScoreRateEvent.collecting,
//           SetScoreRateEvent.timestamp
//         );

//       const setScoreRateTx2 = await seasonSettlement.setScoreRate(
//         50_00000,
//         30_00000,
//         20_00000
//       );
//       await setScoreRateTx2.wait();
//     });

//     it("Set Score Rate : Failed : Only Operator", async () => {
//       const setScoreRateTx = seasonSettlement
//         .connect(notOperator)
//         .setScoreRate(40_00000, 30_00000, 30_00000);

//       await expect(setScoreRateTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "OnlyOperator"
//       );
//     });

//     it("Set Score Rate : Failed : Invalid Rate", async () => {
//       const setScoreRateTx = seasonSettlement.setScoreRate(
//         40_00000,
//         30_00000,
//         60_00000
//       );

//       await expect(setScoreRateTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidRate"
//       );
//     });

//     it("Set Score Per Gate : Success", async () => {
//       const setScorePerGateTx = await seasonSettlement.setScorePerGate(200);
//       await setScorePerGateTx.wait();

//       expect(await seasonSettlement.getScorePerGate()).to.equal(200);

//       const setScorePerGateTx2 = await seasonSettlement.setScorePerGate(100);
//       await setScorePerGateTx2.wait();
//     });

//     it("Set Score Per Gate : Failed : Only Operator", async () => {
//       const setScorePerGateTx = seasonSettlement
//         .connect(notOperator)
//         .setScorePerGate(200);

//       await expect(setScorePerGateTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "OnlyOperator"
//       );
//     });
//   });

//   ////////////
//   // Reward //
//   ////////////

//   describe("Reward", async () => {
//     it("Claim Season Reward : Success : Season 0", async () => {
//       seasonId = 0;

//       const claimSeasonRewardTx = await seasonSettlement
//         .connect(hunter1)
//         .claimSeasonReward(seasonId);

//       const timestamp = await getBlockTimestamp(
//         claimSeasonRewardTx.blockNumber
//       );

//       const totalScore =
//         convertedQuestScore + convertedActivityScore + convertedCollectingScore;

//       SeasonRewardClaimedEvent = {
//         seasonId,
//         hunter: hunter1.address,
//         mintedSeasonScore: totalScore,
//         SRankRewardTokenId: 0,
//         timestamp,
//       };

//       await expect(claimSeasonRewardTx)
//         .to.emit(seasonSettlement, "SeasonRewardClaimed")
//         .withArgs(
//           SeasonRewardClaimedEvent.seasonId,
//           SeasonRewardClaimedEvent.hunter,
//           SeasonRewardClaimedEvent.mintedSeasonScore,
//           SeasonRewardClaimedEvent.SRankRewardTokenId,
//           SeasonRewardClaimedEvent.timestamp
//         );

//       const scoreBalance = await seasonScore.balanceOf(
//         hunter1.address,
//         seasonId
//       );
//       expect(scoreBalance).to.equal(totalScore);

//       const isSeasonRewardClaimed =
//         await seasonSettlement.isSeasonRewardClaimed(seasonId, hunter1.address);
//       expect(isSeasonRewardClaimed).to.equal(true);
//     });

//     it("Claim Season Reward : Failed : Already Claimed", async () => {
//       const claimSeasonRewardTx = seasonSettlement
//         .connect(hunter1)
//         .claimSeasonReward(seasonId);

//       await expect(claimSeasonRewardTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "AlreadyClaimed"
//       );
//     });

//     it("Claim Season Reward : Failed : Invalid Season Id : Not Ended", async () => {
//       seasonId = 1;

//       const claimSeasonRewardTx = seasonSettlement
//         .connect(hunter1)
//         .claimSeasonReward(seasonId);

//       await expect(claimSeasonRewardTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidSeasonId"
//       );
//     });

//     it("Claim Season Reward : Failed : Invalid Season Id : Not Exist", async () => {
//       seasonId = 100;

//       const claimSeasonRewardTx = seasonSettlement
//         .connect(hunter1)
//         .claimSeasonReward(seasonId);

//       await expect(claimSeasonRewardTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidSeasonId"
//       );
//     });

//     it("Claim Season Reward : Failed : Invalid RankType", async () => {
//       seasonId = 0;

//       const claimSeasonRewardTx = seasonSettlement
//         .connect(hunter2)
//         .claimSeasonReward(seasonId);

//       await expect(claimSeasonRewardTx).to.revertedWithCustomError(
//         season,
//         "InvalidRankType"
//       );
//     });

//     it("Claim Season Reward : Success : Season 1 : S Rank", async () => {
//       await setNextBlockNumber(1000);

//       seasonId = 1;

//       const mintTx = await season1HunterRank.mintOfTest(
//         hunter1.address,
//         StoneType.S,
//         1
//       );
//       await mintTx.wait();

//       const claimSeasonRewardTx = await seasonSettlement
//         .connect(hunter1)
//         .claimSeasonReward(seasonId);

//       const timestamp = await getBlockTimestamp(
//         claimSeasonRewardTx.blockNumber
//       );

//       const totalScore = convertedCollectingScore + convertedCollectingScore;

//       SeasonRewardClaimedEvent = {
//         seasonId,
//         hunter: hunter1.address,
//         mintedSeasonScore: totalScore,
//         SRankRewardTokenId: seasonId,
//         timestamp,
//       };

//       await expect(claimSeasonRewardTx)
//         .to.emit(seasonSettlement, "SeasonRewardClaimed")
//         .withArgs(
//           SeasonRewardClaimedEvent.seasonId,
//           SeasonRewardClaimedEvent.hunter,
//           SeasonRewardClaimedEvent.mintedSeasonScore,
//           SeasonRewardClaimedEvent.SRankRewardTokenId,
//           SeasonRewardClaimedEvent.timestamp
//         );

//       const legendarySceneBalance = await legendaryScene.balanceOf(
//         hunter1.address,
//         seasonId
//       );
//       expect(legendarySceneBalance).to.equal(1);

//       const scoreBalance = await seasonScore.balanceOf(
//         hunter1.address,
//         seasonId
//       );
//       expect(scoreBalance).to.equal(totalScore);

//       const isSeasonRewardClaimed =
//         await seasonSettlement.isSeasonRewardClaimed(seasonId, hunter1.address);
//       expect(isSeasonRewardClaimed).to.equal(true);
//     });
//   });

//   //////////
//   // Base //
//   //////////

//   describe("Base", async () => {
//     it("Set S Rank Reward Collection Id : Success", async () => {
//       const setSRankRewardCollectionIdTx =
//         await seasonSettlement.setSRankRewardCollectionId(3);
//       await setSRankRewardCollectionIdTx.wait();

//       const SRankRewardCollectionId =
//         await seasonSettlement.getSRankRewardCollectionId();
//       expect(SRankRewardCollectionId).to.equal(3);
//     });

//     it("Set S Rank Reward Collection Id : Failed : Only Operator", async () => {
//       const setSRankRewardCollectionIdTx = seasonSettlement
//         .connect(notOperator)
//         .setSRankRewardCollectionId(3);

//       await expect(setSRankRewardCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "OnlyOperator"
//       );
//     });

//     it("Set S Rank Reward Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
//       const setSRankRewardCollectionIdTx =
//         seasonSettlement.setSRankRewardCollectionId(200);

//       await expect(setSRankRewardCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidCollectionId"
//       );
//     });

//     it("Set S Rank Reward Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
//       const setCollectionActiveTx = await project.setCollectionActive(2, false);
//       await setCollectionActiveTx.wait();

//       const setSRankRewardCollectionIdTx =
//         seasonSettlement.setSRankRewardCollectionId(2);

//       await expect(setSRankRewardCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidCollectionId"
//       );
//     });

//     it("Set S Rank Reward Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
//       const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
//       const shadowMonarch = await upgrades.deployProxy(
//         ShadowMonarch,
//         [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
//         { kind: "uups" }
//       );
//       await shadowMonarch.deployed();

//       const addCollectionTx = await project.addCollection(
//         shadowMonarch.address,
//         creator.address
//       );
//       await addCollectionTx.wait(); // collectionId 11

//       const setSRankRewardCollectionIdTx =
//         seasonSettlement.setSRankRewardCollectionId(11);

//       await expect(setSRankRewardCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidCollectionId"
//       );
//     });

//     it("Set Season Score Collection Id : Success", async () => {
//       const setSeasonScoreCollectionIdTx =
//         await seasonSettlement.setSeasonScoreCollectionId(3);
//       await setSeasonScoreCollectionIdTx.wait();

//       const seasonScoreCollectionId =
//         await seasonSettlement.getSeasonScoreCollectionId();
//       expect(seasonScoreCollectionId).to.equal(3);
//     });

//     it("Set Season Score Collection Id : Failed : Only Operator", async () => {
//       const setSeasonScoreCollectionIdTx = seasonSettlement
//         .connect(notOperator)
//         .setSeasonScoreCollectionId(3);

//       await expect(setSeasonScoreCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "OnlyOperator"
//       );
//     });

//     it("Set Season Score Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
//       const setSeasonScoreCollectionIdTx =
//         seasonSettlement.setSeasonScoreCollectionId(200);

//       await expect(setSeasonScoreCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidCollectionId"
//       );
//     });

//     it("Set Season Score Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
//       const setCollectionActiveTx = await project.setCollectionActive(2, false);
//       await setCollectionActiveTx.wait();

//       const setSeasonScoreCollectionIdTx =
//         seasonSettlement.setSeasonScoreCollectionId(2);

//       await expect(setSeasonScoreCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidCollectionId"
//       );
//     });

//     it("Set Season Score Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
//       const setSeasonScoreCollectionIdTx =
//         seasonSettlement.setSeasonScoreCollectionId(11);

//       await expect(setSeasonScoreCollectionIdTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "InvalidCollectionId"
//       );
//     });

//     it("Set Season Contract : Success", async () => {
//       const setSeasonContractTx = await seasonSettlement.setSeasonContract(
//         project.address
//       );
//       await setSeasonContractTx.wait();

//       const seasonContract = await seasonSettlement.getSeasonContract();
//       expect(seasonContract).to.equal(project.address);
//     });

//     it("Set Season Contract : Failed : Only Operator", async () => {
//       const setSeasonContractTx = seasonSettlement
//         .connect(notOperator)
//         .setSeasonContract(project.address);

//       await expect(setSeasonContractTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "OnlyOperator"
//       );
//     });

//     it("Set SeasonQuest Contract : Success", async () => {
//       const setSeasonQuestContractTx =
//         await seasonSettlement.setSeasonQuestContract(project.address);
//       await setSeasonQuestContractTx.wait();

//       const seasonQuestContract =
//         await seasonSettlement.getSeasonQuestContract();
//       expect(seasonQuestContract).to.equal(project.address);
//     });

//     it("Set SeasonQuest Contract : Failed : Only Operator", async () => {
//       const setSeasonQuestContractTx = seasonSettlement
//         .connect(notOperator)
//         .setSeasonQuestContract(project.address);

//       await expect(setSeasonQuestContractTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "OnlyOperator"
//       );
//     });

//     it("Set DungeonGate Contract : Success", async () => {
//       const setDungeonGateContractTx =
//         await seasonSettlement.setDungeonGateContract(project.address);
//       await setDungeonGateContractTx.wait();

//       const dungeonGateContract =
//         await seasonSettlement.getDungeonGateContract();
//       expect(dungeonGateContract).to.equal(project.address);
//     });

//     it("Set DungeonGate Contract : Failed : Only Operator", async () => {
//       const setDungeonGateContractTx = seasonSettlement
//         .connect(notOperator)
//         .setDungeonGateContract(project.address);

//       await expect(setDungeonGateContractTx).to.revertedWithCustomError(
//         seasonSettlement,
//         "OnlyOperator"
//       );
//     });
//   });
// });
