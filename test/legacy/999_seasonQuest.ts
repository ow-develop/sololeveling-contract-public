// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { Contract } from "ethers";
// import { ethers, expect, upgrades } from "hardhat";
//
// import {
//   getBlockTimestamp,
//   getCurrentBlockNumber,
//   setNextBlockNumber,
// } from "../../helpers/block-timestamp";
// import { QuestType, RankType } from "../../helpers/constant/contract";
// import { Create, QuestCompleted } from "../../helpers/type/event";
// import {
//   MonsterSet,
//   MonsterTrait,
//   QuestInput,
//   Trait,
// } from "../../helpers/type/contract";
// import { ZERO_ADDRESS } from "../../helpers/constant/common";
//
// describe("SeasonQuest", () => {
//   let operatorMaster: SignerWithAddress,
//     operatorManager: SignerWithAddress,
//     notOperator: SignerWithAddress,
//     creator: SignerWithAddress,
//     hunter1: SignerWithAddress,
//     hunter2: SignerWithAddress;
//
//   let project: Contract,
//     operator: Contract,
//     monsterFactory: Contract,
//     season: Contract,
//     seasonQuest: Contract,
//     normalMonster: Contract,
//     shadowMonster: Contract,
//     hunterItem: Contract,
//     season0HunterRank: Contract,
//     season1HunterRank: Contract,
//     season0SeasonPack: Contract,
//     season1SeasonPack: Contract;
//
//   let CreateEvent: Create, QuestCompletedEvent: QuestCompleted;
//
//   let isShadow: boolean,
//     questInput: QuestInput,
//     monsterSet: MonsterSet,
//     traits: Trait[],
//     monsterTrait: MonsterTrait,
//     questId: number,
//     operatorSignature: string;
//
//   before(async () => {
//     [operatorMaster, operatorManager, notOperator, creator, hunter1, hunter2] =
//       await ethers.getSigners();
//     console.log(
//       "Deploying contracts with the account: " + operatorMaster.address
//     );
//
//     // deploy operator wallet
//     const RoleWallet = await ethers.getContractFactory("SLRoleWallet");
//     operator = await RoleWallet.deploy(
//       [operatorMaster.address],
//       [operatorManager.address]
//     );
//     await operator.deployed();
//     console.log(`Operator deployed to: ${operator.address}`);
//
//     // deploy project
//     const Project = await ethers.getContractFactory("SLProject");
//     project = await upgrades.deployProxy(Project, [operator.address], {
//       kind: "uups",
//     });
//     await project.deployed();
//     console.log(`Project deployed to: ${project.address}`);
//
//     // deploy monsterFactory
//     const MonsterFactory = await ethers.getContractFactory("SLMonsterFactory");
//     monsterFactory = await upgrades.deployProxy(
//       MonsterFactory,
//       [project.address],
//       { kind: "uups" }
//     );
//     await monsterFactory.deployed();
//     console.log(`MonsterFactory deployed to: ${monsterFactory.address}`);
//
//     // deploy season
//     const SLSeason = await ethers.getContractFactory("SLSeason");
//     season = await upgrades.deployProxy(
//       SLSeason,
//       [project.address, monsterFactory.address, 1, 2],
//       {
//         kind: "uups",
//       }
//     );
//     await season.deployed();
//     console.log(`Season deployed to: ${season.address}`);
//
//     // deploy seasonQuest
//     const SeasonQuest = await ethers.getContractFactory("SLSeasonQuest");
//     seasonQuest = await upgrades.deployProxy(
//       SeasonQuest,
//       [project.address, monsterFactory.address, season.address, 3, 1, 2],
//       {
//         kind: "uups",
//       }
//     );
//     await seasonQuest.deployed();
//     console.log(`SeasonQuest deployed to: ${seasonQuest.address}`);
//
//     // deploy normalMonster
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
//
//     const setProjectApprovalModeTx = await normalMonster.setProjectApprovalMode(
//       false
//     );
//     await setProjectApprovalModeTx.wait();
//
//     const addCollectionTx1 = await project
//       .connect(operatorManager)
//       .addCollection(normalMonster.address, creator.address);
//     await addCollectionTx1.wait();
//
//     // deploy shadowMonster
//     shadowMonster = await upgrades.deployProxy(
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
//     await shadowMonster.deployed();
//     console.log(`ShadowMonster deployed to: ${shadowMonster.address}`);
//
//     const setProjectApprovalModeTx2 =
//       await shadowMonster.setProjectApprovalMode(false);
//     await setProjectApprovalModeTx2.wait();
//
//     const addCollectionTx2 = await project
//       .connect(operatorManager)
//       .addCollection(shadowMonster.address, creator.address);
//     await addCollectionTx2.wait();
//
//     // deploy hunterItem
//     const HunterItem = await ethers.getContractFactory("SLHunterItem");
//     hunterItem = await upgrades.deployProxy(
//       HunterItem,
//       [project.address, [seasonQuest.address], "baseTokenURI"],
//       {
//         kind: "uups",
//       }
//     );
//     await hunterItem.deployed();
//     console.log(`HunterItem deployed to: ${hunterItem.address}`);
//
//     const addCollectionTx3 = await project
//       .connect(operatorManager)
//       .addCollection(hunterItem.address, creator.address);
//     await addCollectionTx3.wait();
//
//     // deploy season0 hunterRank - collectionId 4
//     const HunterRank = await ethers.getContractFactory("SLHunterRank");
//     season0HunterRank = await HunterRank.deploy(
//       project.address,
//       [season.address],
//       "baseTokenURI"
//     );
//     await season0HunterRank.deployed();
//     console.log(`Season0 HunterRank deployed to: ${season0HunterRank.address}`);
//
//     const addCollectionTx4 = await project
//       .connect(operatorManager)
//       .addCollection(season0HunterRank.address, creator.address);
//     await addCollectionTx4.wait();
//
//     // deploy season1 hunterRank - collectionId 5
//     season1HunterRank = await HunterRank.deploy(
//       project.address,
//       [season.address],
//       "baseTokenURI"
//     );
//     await season1HunterRank.deployed();
//     console.log(`Season1 HunterRank deployed to: ${season1HunterRank.address}`);
//
//     const addCollectionTx5 = await project
//       .connect(operatorManager)
//       .addCollection(season1HunterRank.address, creator.address);
//     await addCollectionTx5.wait();
//
//     // deploy season0 seasonPack - collectionId 6
//     const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
//     season0SeasonPack = await SeasonPack.deploy(
//       project.address,
//       ZERO_ADDRESS,
//       [project.address],
//       "baseTokenURI"
//     );
//     await season0SeasonPack.deployed();
//     console.log(`Season0 SeasonPack deployed to: ${season0SeasonPack.address}`);
//
//     const addCollectionTx6 = await project
//       .connect(operatorManager)
//       .addCollection(season0SeasonPack.address, creator.address);
//     await addCollectionTx6.wait();
//
//     // deploy season1 seasonPack - collectionId 7
//     season1SeasonPack = await SeasonPack.deploy(
//       project.address,
//       ZERO_ADDRESS,
//       [project.address],
//       "baseTokenURI"
//     );
//     await season1SeasonPack.deployed();
//     console.log(`Season1 SeasonPack deployed to: ${season1SeasonPack.address}`);
//
//     const addCollectionTx7 = await project
//       .connect(operatorManager)
//       .addCollection(season1SeasonPack.address, creator.address);
//     await addCollectionTx7.wait();
//
//     // add season0
//     const currentBlockNumber = await getCurrentBlockNumber();
//     const addSeason0Tx = await season
//       .connect(operatorManager)
//       .addSeason(
//         4,
//         6,
//         currentBlockNumber + 100,
//         currentBlockNumber + 500,
//         [1, 2]
//       );
//     await addSeason0Tx.wait();
//
//     // add season1
//     const addSeason1Tx = await season
//       .connect(operatorManager)
//       .addSeason(
//         5,
//         7,
//         currentBlockNumber + 600,
//         currentBlockNumber + 50000,
//         [1, 2]
//       );
//     await addSeason1Tx.wait();
//
//     // hunterItem open token 1-5
//     for (let i = 1; i <= 5; i++) {
//       const openTokenTx = await hunterItem
//         .connect(operatorManager)
//         .openToken(i);
//       await openTokenTx.wait();
//     }
//
//     // add monster
//     for (let i = 1; i <= 5; i++) {
//       const addNormalMonsterTx = await monsterFactory.addMonster(
//         RankType.E,
//         false
//       );
//       await addNormalMonsterTx.wait(); // normalMonsterId 1-5
//
//       const addShadowMonsterTx = await monsterFactory.addMonster(
//         RankType.B,
//         true
//       );
//       await addShadowMonsterTx.wait(); // shadowMonsterId 1-5
//     }
//
//     // add monster trait 1
//     const addMonsterTraitTypeTx1 = await monsterFactory.addMonsterTraitType(
//       "Type1"
//     );
//     await addMonsterTraitTypeTx1.wait(); // typeId 1
//
//     const addMonsterTraitValueTx1 = await monsterFactory.addMonsterTraitValue(
//       1,
//       "Value1"
//     );
//     await addMonsterTraitValueTx1.wait(); // valueId 1
//
//     const addMonsterTraitValueTx2 = await monsterFactory.addMonsterTraitValue(
//       1,
//       "Value2"
//     );
//     await addMonsterTraitValueTx2.wait(); // valueId 2
//
//     const addMonsterOfTraitTx = await monsterFactory.addMonsterOfTrait(1, [
//       {
//         valueId: 1,
//         normalMonsterIds: [1, 2, 3],
//         shadowMonsterIds: [1, 2, 3],
//       },
//       {
//         valueId: 2,
//         normalMonsterIds: [4, 5],
//         shadowMonsterIds: [4, 5],
//       },
//     ]);
//     await addMonsterOfTraitTx.wait();
//
//     // add monster trait 2
//     const addMonsterTraitTypeTx2 = await monsterFactory.addMonsterTraitType(
//       "Type2"
//     );
//     await addMonsterTraitTypeTx2.wait(); // typeId 2
//
//     const addMonsterTraitValueTx3 = await monsterFactory.addMonsterTraitValue(
//       2,
//       "Value1"
//     );
//     await addMonsterTraitValueTx3.wait(); // valueId 3
//
//     const addMonsterTraitValueTx4 = await monsterFactory.addMonsterTraitValue(
//       2,
//       "Value2"
//     );
//     await addMonsterTraitValueTx4.wait(); // valueId 4
//
//     const addMonsterOfTraitTx2 = await monsterFactory.addMonsterOfTrait(2, [
//       {
//         valueId: 3,
//         normalMonsterIds: [4, 5],
//         shadowMonsterIds: [4, 5],
//       },
//       {
//         valueId: 4,
//         normalMonsterIds: [1, 2, 3],
//         shadowMonsterIds: [1, 2, 3],
//       },
//     ]);
//     await addMonsterOfTraitTx2.wait();
//   });
//
//   ///////////
//   // Quest //
//   ///////////
//
//   describe("Quest", async () => {
//     it("Add General Quest : Success", async () => {
//       await setNextBlockNumber(110); // 110
//
//       questInput = {
//         seasonId: 0,
//         rewardScore: 10,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [1],
//       };
//
//       const addGeneralQuestTx = await seasonQuest
//         .connect(operatorManager)
//         .addGeneralQuest(questInput); // questId 1
//
//       const timestamp = await getBlockTimestamp(addGeneralQuestTx.blockNumber);
//
//       CreateEvent = {
//         target: "Quest",
//         targetId: 1,
//         timestamp: timestamp,
//       };
//
//       await expect(addGeneralQuestTx)
//         .to.emit(seasonQuest, "Create")
//         .withArgs(
//           CreateEvent.target,
//           CreateEvent.targetId,
//           CreateEvent.timestamp
//         );
//
//       const isExist = await seasonQuest.isExistQuestById(1);
//       expect(isExist).to.equal(true);
//
//       const isActive = await seasonQuest.isActiveQuest(1);
//       expect(isActive).to.equal(true);
//
//       const quest = await seasonQuest.getQuestById(1);
//       expect(quest.rewardScore).to.equal(10);
//       expect(quest.questType).to.equal(QuestType.General);
//       expect(quest.rankType).to.equal(RankType.E);
//       expect(quest.hunterItemIds.length).to.equal(1);
//       expect(quest.hunterItemIds[0]).to.equal(1);
//
//       const questIdOfQuestType = await seasonQuest.getQuestIdOfQuestType(
//         0,
//         QuestType.General
//       );
//       expect(questIdOfQuestType.length).to.equal(1);
//       expect(questIdOfQuestType[0]).to.equal(1);
//     });
//
//     it("Add Monster Set Quest : Success", async () => {
//       questInput = {
//         seasonId: 0,
//         rewardScore: 10,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [1],
//       };
//
//       monsterSet = {
//         normalMonsterIds: [1, 2],
//         normalMonsterAmounts: [1, 1],
//         shadowMonsterIds: [1, 2],
//         shadowMonsterAmounts: [1, 1],
//       };
//
//       const addMonsterSetQuestTx = await seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       ); // questId 2
//
//       const timestamp = await getBlockTimestamp(
//         addMonsterSetQuestTx.blockNumber
//       );
//
//       CreateEvent = {
//         target: "Quest",
//         targetId: 2,
//         timestamp: timestamp,
//       };
//
//       await expect(addMonsterSetQuestTx)
//         .to.emit(seasonQuest, "Create")
//         .withArgs(
//           CreateEvent.target,
//           CreateEvent.targetId,
//           CreateEvent.timestamp
//         );
//
//       const monsterQuest = await seasonQuest.getMonsterSetQuestById(2);
//       expect(monsterQuest.monsterSet.normalMonsterIds.length).to.equal(2);
//       expect(monsterQuest.monsterSet.normalMonsterIds[1]).to.equal(2);
//
//       const questIdOfQuestType = await seasonQuest.getQuestIdOfQuestType(
//         0,
//         QuestType.MonsterSet
//       );
//       expect(questIdOfQuestType.length).to.equal(1);
//       expect(questIdOfQuestType[0]).to.equal(2);
//     });
//
//     it("Add Monster Trait Quest : Success", async () => {
//       questInput = {
//         seasonId: 0,
//         rewardScore: 10,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [1],
//       };
//
//       traits = [{ traitTypeId: 1, traitValueId: 1 }];
//
//       monsterTrait = {
//         requiredNormalMonster: 1,
//         requiredShadowMonster: 1,
//         traits,
//       };
//
//       const addMonsterTraitQuestTx = await seasonQuest.addMonsterTraitQuest(
//         questInput,
//         monsterTrait
//       ); // questId 3
//
//       const timestamp = await getBlockTimestamp(
//         addMonsterTraitQuestTx.blockNumber
//       );
//
//       CreateEvent = {
//         target: "Quest",
//         targetId: 3,
//         timestamp: timestamp,
//       };
//
//       await expect(addMonsterTraitQuestTx)
//         .to.emit(seasonQuest, "Create")
//         .withArgs(
//           CreateEvent.target,
//           CreateEvent.targetId,
//           CreateEvent.timestamp
//         );
//
//       const monsterTraitQuest = await seasonQuest.getMonsterTraitQuestById(3);
//       expect(monsterTraitQuest.monsterTrait.requiredNormalMonster).to.equal(1);
//       expect(monsterTraitQuest.monsterTrait.requiredShadowMonster).to.equal(1);
//       expect(monsterTraitQuest.monsterTrait.traits.length).to.equal(1);
//       expect(monsterTraitQuest.monsterTrait.traits[0].traitTypeId).to.equal(1);
//
//       const questLength = await seasonQuest.getQuestLength();
//       expect(questLength).to.equal(3);
//
//       const questIdOfSeason = await seasonQuest.getQuestIdOfSeason(0, true);
//       expect(questIdOfSeason.length).to.equal(3);
//
//       const setQuestActiveTx = await seasonQuest.setQuestActive(3, false);
//       await setQuestActiveTx.wait();
//
//       const questIdOfSeason2 = await seasonQuest.getQuestIdOfSeason(0, true);
//       expect(questIdOfSeason2.length).to.equal(2);
//
//       const questIdOfSeason3 = await seasonQuest.getQuestIdOfSeason(0, false);
//       expect(questIdOfSeason3.length).to.equal(3);
//
//       const setQuestActiveTx2 = await seasonQuest.setQuestActive(3, true);
//       await setQuestActiveTx2.wait();
//
//       const questIdOfQuestType = await seasonQuest.getQuestIdOfQuestType(
//         0,
//         QuestType.MonsterTrait
//       );
//       expect(questIdOfQuestType.length).to.equal(1);
//       expect(questIdOfQuestType[0]).to.equal(3);
//     });
//
//     it("Add General Quest : Failed : Only Operator", async () => {
//       const addGeneralQuestTx = seasonQuest
//         .connect(notOperator)
//         .addGeneralQuest(questInput);
//
//       await expect(addGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "OnlyOperator"
//       );
//     });
//
//     it("Add Monster Set Quest : Failed : Only Operator", async () => {
//       const addMonsterSetQuestTx = seasonQuest
//         .connect(notOperator)
//         .addMonsterSetQuest(questInput, monsterSet);
//
//       await expect(addMonsterSetQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "OnlyOperator"
//       );
//     });
//
//     it("Add Monster Set Quest : Failed : Invalid Monster : Length < 1", async () => {
//       monsterSet = {
//         normalMonsterIds: [],
//         normalMonsterAmounts: [],
//         shadowMonsterIds: [],
//         shadowMonsterAmounts: [],
//       };
//
//       const addMonsterSetQuestTx = seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//
//       await expect(addMonsterSetQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Add Monster Set Quest : Failed : Invalid Monster : Invalid Length", async () => {
//       monsterSet = {
//         normalMonsterIds: [1],
//         normalMonsterAmounts: [1, 2],
//         shadowMonsterIds: [1],
//         shadowMonsterAmounts: [1],
//       };
//
//       const addMonsterSetQuestTx = seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//
//       await expect(addMonsterSetQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Add Monster Set Quest : Failed : Invalid Monster : Not Exist : Normal", async () => {
//       monsterSet = {
//         normalMonsterIds: [100],
//         normalMonsterAmounts: [1],
//         shadowMonsterIds: [1],
//         shadowMonsterAmounts: [1],
//       };
//
//       const addMonsterSetQuestTx = seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//
//       await expect(addMonsterSetQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Add Monster Set Quest : Failed : Invalid Monster : Not Exist : Shadow", async () => {
//       monsterSet = {
//         normalMonsterIds: [1],
//         normalMonsterAmounts: [1],
//         shadowMonsterIds: [100],
//         shadowMonsterAmounts: [1],
//       };
//
//       const addMonsterSetQuestTx = seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//
//       await expect(addMonsterSetQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Add Monster Trait Quest : Failed : Only Operator", async () => {
//       const addMonsterTraitQuestTx = seasonQuest
//         .connect(notOperator)
//         .addMonsterTraitQuest(questInput, monsterTrait);
//
//       await expect(addMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "OnlyOperator"
//       );
//     });
//
//     it("Add Monster Trait Quest : Failed : Invalid Trait : Required Monster < 1", async () => {
//       traits = [{ traitTypeId: 1, traitValueId: 1 }];
//
//       monsterTrait = {
//         requiredNormalMonster: 0,
//         requiredShadowMonster: 0,
//         traits,
//       };
//
//       const addMonsterTraitQuestTx = seasonQuest.addMonsterTraitQuest(
//         questInput,
//         monsterTrait
//       );
//
//       await expect(addMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidTrait"
//       );
//     });
//
//     it("Add Monster Trait Quest : Failed : Invalid Trait : Un Active Trait Type", async () => {
//       const setMonsterTraitTypeActiveTx =
//         await monsterFactory.setMonsterTraitTypeActive(1, false);
//       await setMonsterTraitTypeActiveTx.wait();
//
//       traits = [{ traitTypeId: 1, traitValueId: 1 }];
//
//       monsterTrait = {
//         requiredNormalMonster: 1,
//         requiredShadowMonster: 0,
//         traits,
//       };
//
//       const addMonsterTraitQuestTx = seasonQuest.addMonsterTraitQuest(
//         questInput,
//         monsterTrait
//       );
//
//       await expect(addMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidTrait"
//       );
//
//       const setMonsterTraitTypeActiveTx2 =
//         await monsterFactory.setMonsterTraitTypeActive(1, true);
//       await setMonsterTraitTypeActiveTx2.wait();
//     });
//
//     it("Add Monster Trait Quest : Failed : Invalid Trait : Not Contain Trait Value Of Type", async () => {
//       traits = [{ traitTypeId: 1, traitValueId: 10 }];
//
//       monsterTrait = {
//         requiredNormalMonster: 1,
//         requiredShadowMonster: 0,
//         traits,
//       };
//
//       const addMonsterTraitQuestTx = seasonQuest.addMonsterTraitQuest(
//         questInput,
//         monsterTrait
//       );
//
//       await expect(addMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidTrait"
//       );
//     });
//
//     it("Add Monster Trait Quest : Failed : Invalid Trait : Duplicate Trait Type", async () => {
//       traits = [
//         { traitTypeId: 1, traitValueId: 1 },
//         { traitTypeId: 1, traitValueId: 2 },
//       ];
//
//       monsterTrait = {
//         requiredNormalMonster: 1,
//         requiredShadowMonster: 0,
//         traits,
//       };
//
//       const addMonsterTraitQuestTx = seasonQuest.addMonsterTraitQuest(
//         questInput,
//         monsterTrait
//       );
//
//       await expect(addMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidTrait"
//       );
//     });
//
//     it("Add Quest : Failed : Un Active Quest", async () => {
//       const setQuestActiveTx = await seasonQuest.setQuestActive(1, false);
//       await setQuestActiveTx.wait();
//
//       questInput = {
//         seasonId: 0,
//         rewardScore: 10,
//         completableCount: 1,
//         requiredQuestId: 1,
//         rankType: RankType.E,
//         hunterItemIds: [1],
//       };
//
//       const addGeneralQuestTx = seasonQuest.addGeneralQuest(questInput);
//
//       await expect(addGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "UnActiveQuest"
//       );
//
//       const setQuestActiveTx2 = await seasonQuest.setQuestActive(1, true);
//       await setQuestActiveTx2.wait();
//     });
//
//     it("Add Quest : Failed : Invalid Hunter Item Id", async () => {
//       questInput = {
//         seasonId: 0,
//         rewardScore: 10,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [10],
//       };
//
//       const addGeneralQuestTx = seasonQuest.addGeneralQuest(questInput);
//
//       await expect(addGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidHunterItemId"
//       );
//     });
//
//     it("Add Quest : Failed : Ended Season", async () => {
//       await setNextBlockNumber(600); // 710
//
//       questInput = {
//         seasonId: 0,
//         rewardScore: 10,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [1],
//       };
//
//       const addGeneralQuestTx = seasonQuest.addGeneralQuest(questInput);
//
//       await expect(addGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "EndedSeason"
//       );
//     });
//
//     it("Set Quest Active : Success", async () => {
//       const setQuestActiveTx = await seasonQuest.setQuestActive(1, false);
//       await setQuestActiveTx.wait();
//
//       const isActive = await seasonQuest.isActiveQuest(1);
//       expect(isActive).to.equal(false);
//
//       const setQuestActiveTx2 = await seasonQuest.setQuestActive(1, true);
//       await setQuestActiveTx2.wait();
//     });
//
//     it("Set Quest Active : Failed : Only Operator", async () => {
//       const setQuestActiveTx = seasonQuest
//         .connect(notOperator)
//         .setQuestActive(1, false);
//
//       await expect(setQuestActiveTx).to.revertedWithCustomError(
//         seasonQuest,
//         "OnlyOperator"
//       );
//     });
//
//     it("Set Quest Active : Failed : Invalid Quest Id", async () => {
//       const setQuestActiveTx = seasonQuest.setQuestActive(100, false);
//
//       await expect(setQuestActiveTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidQuestId"
//       );
//     });
//   });
//
//   /////////////
//   // Confirm //
//   /////////////
//
//   describe("Confirm", async () => {
//     it("Confirm General Quest : Success", async () => {
//       const hunterRank = await season.getHunterRank(1, hunter1.address);
//       expect(hunterRank).to.equal(RankType.E);
//
//       questInput = {
//         seasonId: 1,
//         rewardScore: 50,
//         completableCount: 2,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [1],
//       };
//
//       const addGeneralQuestTx = await seasonQuest.addGeneralQuest(questInput);
//       await addGeneralQuestTx.wait();
//
//       questId = 4;
//
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [questId, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//
//       const timestamp = await getBlockTimestamp(
//         confirmGeneralQuestTx.blockNumber
//       );
//
//       QuestCompletedEvent = {
//         hunter: hunter1.address,
//         questId: questId,
//         currentScore: 50,
//         timestamp: timestamp,
//       };
//
//       await expect(confirmGeneralQuestTx)
//         .to.emit(seasonQuest, "QuestCompleted")
//         .withArgs(
//           QuestCompletedEvent.hunter,
//           QuestCompletedEvent.questId,
//           QuestCompletedEvent.currentScore,
//           QuestCompletedEvent.timestamp
//         );
//
//       const questScore = await seasonQuest.getHunterQuestScore(
//         1,
//         hunter1.address
//       );
//       expect(questScore).to.equal(50);
//
//       const completedCount2 = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//       expect(completedCount2).to.equal(1);
//
//       const hunterItemBalance = await hunterItem.balanceOf(hunter1.address, 1);
//       expect(hunterItemBalance).to.equal(1);
//     });
//
//     it("Confirm General Quest : Failed : General Quest Verify Failed : Invalid Hunter Address", async () => {
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [questId, hunter2.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "GeneralQuestVerifyFailed"
//       );
//     });
//
//     it("Confirm General Quest : Failed : General Quest Verify Failed : Invalid Quest Id", async () => {
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [1, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "GeneralQuestVerifyFailed"
//       );
//     });
//
//     it("Confirm General Quest : Failed : General Quest Verify Failed : Invalid Signer", async () => {
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [questId, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await notOperator.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "GeneralQuestVerifyFailed"
//       );
//     });
//
//     it("Confirm General Quest : Failed : General Quest Verify Failed : Invalid Quest Completed Count", async () => {
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [questId, hunter1.address, 100]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "GeneralQuestVerifyFailed"
//       );
//     });
//
//     it("Confirm Monster Set Quest : Success", async () => {
//       questInput = {
//         seasonId: 1,
//         rewardScore: 50,
//         completableCount: 2,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [2],
//       };
//
//       monsterSet = {
//         normalMonsterIds: [1, 2],
//         normalMonsterAmounts: [5, 5],
//         shadowMonsterIds: [],
//         shadowMonsterAmounts: [],
//       };
//
//       const addMonsterSetQuestTx = await seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//       await addMonsterSetQuestTx.wait();
//
//       questId = 5;
//
//       const monsterMintTx = await normalMonster.mintOfTestBatch(
//         hunter1.address,
//         [1, 2],
//         [5, 5]
//       );
//       await monsterMintTx.wait();
//
//       const approveTx = await normalMonster
//         .connect(hunter1)
//         .setApprovalForAll(seasonQuest.address, true);
//       await approveTx.wait();
//
//       const confirmMonsterSetQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(questId);
//
//       const timestamp = await getBlockTimestamp(
//         confirmMonsterSetQuestTx.blockNumber
//       );
//
//       QuestCompletedEvent = {
//         hunter: hunter1.address,
//         questId: questId,
//         currentScore: 100,
//         timestamp: timestamp,
//       };
//
//       await expect(confirmMonsterSetQuestTx)
//         .to.emit(seasonQuest, "QuestCompleted")
//         .withArgs(
//           QuestCompletedEvent.hunter,
//           QuestCompletedEvent.questId,
//           QuestCompletedEvent.currentScore,
//           QuestCompletedEvent.timestamp
//         );
//
//       const questScore = await seasonQuest.getHunterQuestScore(
//         1,
//         hunter1.address
//       );
//       expect(questScore).to.equal(100);
//
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//       expect(completedCount).to.equal(1);
//
//       const hunterItemBalance = await hunterItem.balanceOf(hunter1.address, 2);
//       expect(hunterItemBalance).to.equal(1);
//
//       const monsterBalance = await normalMonster.balanceOfBatch(
//         [hunter1.address, hunter1.address],
//         [1, 2]
//       );
//       expect(monsterBalance[0]).to.equal(0);
//       expect(monsterBalance[1]).to.equal(0);
//     });
//
//     it("Confirm Monster Set Quest : Failed : Not Enough Token Balance", async () => {
//       const confirmMonsterSetQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(questId);
//
//       await expect(confirmMonsterSetQuestTx).to.revertedWith(
//         "ERC1155: burn amount exceeds totalSupply"
//       );
//     });
//
//     it("Confirm Monster Set Quest : Failed : Not Approve", async () => {
//       const approveTx = await normalMonster
//         .connect(hunter1)
//         .setApprovalForAll(seasonQuest.address, false);
//       await approveTx.wait();
//
//       const confirmMonsterSetQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(questId);
//
//       await expect(confirmMonsterSetQuestTx).to.revertedWith(
//         "ERC1155: caller is not token owner nor approved"
//       );
//
//       const approveTx2 = await normalMonster
//         .connect(hunter1)
//         .setApprovalForAll(seasonQuest.address, true);
//       await approveTx2.wait();
//     });
//
//     it("Confirm Monster Trait Quest : Success", async () => {
//       questInput = {
//         seasonId: 1,
//         rewardScore: 50,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [3],
//       };
//
//       traits = [{ traitTypeId: 1, traitValueId: 1 }]; // monsterId 1,2,3
//
//       monsterTrait = {
//         requiredNormalMonster: 10,
//         requiredShadowMonster: 5,
//         traits,
//       };
//
//       const addMonsterTraitQuestTx = await seasonQuest.addMonsterTraitQuest(
//         questInput,
//         monsterTrait
//       );
//       await addMonsterTraitQuestTx.wait();
//
//       questId = 6;
//
//       const normalMonsterMintTx = await normalMonster.mintOfTestBatch(
//         hunter1.address,
//         [1, 2],
//         [5, 5]
//       );
//       await normalMonsterMintTx.wait();
//
//       const shadowMonsterMintTx = await shadowMonster.mintOfTestBatch(
//         hunter1.address,
//         [2, 3],
//         [2, 3]
//       );
//       await shadowMonsterMintTx.wait();
//
//       const approveTx = await shadowMonster
//         .connect(hunter1)
//         .setApprovalForAll(seasonQuest.address, true);
//       await approveTx.wait();
//
//       monsterSet = {
//         normalMonsterIds: [1, 2],
//         normalMonsterAmounts: [5, 5],
//         shadowMonsterIds: [2, 3],
//         shadowMonsterAmounts: [2, 3],
//       };
//
//       const confirmMonsterTraitQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmMonsterTraitQuest(questId, monsterSet);
//
//       const timestamp = await getBlockTimestamp(
//         confirmMonsterTraitQuestTx.blockNumber
//       );
//
//       QuestCompletedEvent = {
//         hunter: hunter1.address,
//         questId: questId,
//         currentScore: 150,
//         timestamp: timestamp,
//       };
//
//       await expect(confirmMonsterTraitQuestTx)
//         .to.emit(seasonQuest, "QuestCompleted")
//         .withArgs(
//           QuestCompletedEvent.hunter,
//           QuestCompletedEvent.questId,
//           QuestCompletedEvent.currentScore,
//           QuestCompletedEvent.timestamp
//         );
//
//       const questScore = await seasonQuest.getHunterQuestScore(
//         1,
//         hunter1.address
//       );
//       expect(questScore).to.equal(150);
//
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//       expect(completedCount).to.equal(1);
//
//       const hunterItemBalance = await hunterItem.balanceOf(hunter1.address, 3);
//       expect(hunterItemBalance).to.equal(1);
//
//       const normalMonsterBalance = await normalMonster.balanceOfBatch(
//         [hunter1.address, hunter1.address],
//         [1, 2]
//       );
//       expect(normalMonsterBalance[0]).to.equal(0);
//       expect(normalMonsterBalance[1]).to.equal(0);
//
//       const shadowMonsterBalance = await shadowMonster.balanceOfBatch(
//         [hunter1.address, hunter1.address],
//         [2, 3]
//       );
//       expect(shadowMonsterBalance[0]).to.equal(0);
//       expect(shadowMonsterBalance[1]).to.equal(0);
//     });
//
//     it("Confirm Monster Trait Quest : Success : 2 Trait", async () => {
//       questInput = {
//         seasonId: 1,
//         rewardScore: 50,
//         completableCount: 2,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [3],
//       };
//
//       traits = [
//         { traitTypeId: 1, traitValueId: 1 },
//         { traitTypeId: 2, traitValueId: 4 },
//       ]; // monsterId 1,2,3
//
//       monsterTrait = {
//         requiredNormalMonster: 10,
//         requiredShadowMonster: 5,
//         traits,
//       };
//
//       const addMonsterTraitQuestTx = await seasonQuest.addMonsterTraitQuest(
//         questInput,
//         monsterTrait
//       );
//       await addMonsterTraitQuestTx.wait();
//
//       questId = 7;
//
//       const normalMonsterMintTx = await normalMonster.mintOfTestBatch(
//         hunter1.address,
//         [1, 2],
//         [5, 5]
//       );
//       await normalMonsterMintTx.wait();
//
//       const shadowMonsterMintTx = await shadowMonster.mintOfTestBatch(
//         hunter1.address,
//         [2, 3],
//         [2, 3]
//       );
//       await shadowMonsterMintTx.wait();
//
//       monsterSet = {
//         normalMonsterIds: [1, 2],
//         normalMonsterAmounts: [5, 5],
//         shadowMonsterIds: [2, 3],
//         shadowMonsterAmounts: [2, 3],
//       };
//
//       const confirmMonsterTraitQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmMonsterTraitQuest(questId, monsterSet);
//
//       const timestamp = await getBlockTimestamp(
//         confirmMonsterTraitQuestTx.blockNumber
//       );
//
//       QuestCompletedEvent = {
//         hunter: hunter1.address,
//         questId: questId,
//         currentScore: 200,
//         timestamp: timestamp,
//       };
//
//       await expect(confirmMonsterTraitQuestTx)
//         .to.emit(seasonQuest, "QuestCompleted")
//         .withArgs(
//           QuestCompletedEvent.hunter,
//           QuestCompletedEvent.questId,
//           QuestCompletedEvent.currentScore,
//           QuestCompletedEvent.timestamp
//         );
//
//       const questScore = await seasonQuest.getHunterQuestScore(
//         1,
//         hunter1.address
//       );
//       expect(questScore).to.equal(200);
//
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//       expect(completedCount).to.equal(1);
//
//       const hunterItemBalance = await hunterItem.balanceOf(hunter1.address, 3);
//       expect(hunterItemBalance).to.equal(2);
//
//       const normalMonsterBalance = await normalMonster.balanceOfBatch(
//         [hunter1.address, hunter1.address],
//         [1, 2]
//       );
//       expect(normalMonsterBalance[0]).to.equal(0);
//       expect(normalMonsterBalance[1]).to.equal(0);
//
//       const shadowMonsterBalance = await shadowMonster.balanceOfBatch(
//         [hunter1.address, hunter1.address],
//         [2, 3]
//       );
//       expect(shadowMonsterBalance[0]).to.equal(0);
//       expect(shadowMonsterBalance[1]).to.equal(0);
//     });
//
//     it("Confirm Monster Trait Quest : Failed : Invalid Monster : Invalid Monster Amount : Normal", async () => {
//       monsterSet = {
//         normalMonsterIds: [1, 2],
//         normalMonsterAmounts: [5, 10],
//         shadowMonsterIds: [2, 3],
//         shadowMonsterAmounts: [2, 3],
//       };
//
//       const confirmMonsterTraitQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmMonsterTraitQuest(questId, monsterSet);
//
//       await expect(confirmMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Confirm Monster Trait Quest : Failed : Invalid Monster : Invalid Monster Amount : Shadow", async () => {
//       monsterSet = {
//         normalMonsterIds: [1, 2],
//         normalMonsterAmounts: [5, 5],
//         shadowMonsterIds: [2, 3],
//         shadowMonsterAmounts: [1, 3],
//       };
//
//       const confirmMonsterTraitQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmMonsterTraitQuest(questId, monsterSet);
//
//       await expect(confirmMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Confirm Monster Trait Quest : Failed : Invalid Monster : Not Contain Trait Value : Normal", async () => {
//       monsterSet = {
//         normalMonsterIds: [1, 4],
//         normalMonsterAmounts: [5, 5],
//         shadowMonsterIds: [2, 3],
//         shadowMonsterAmounts: [2, 3],
//       };
//
//       const confirmMonsterTraitQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmMonsterTraitQuest(questId, monsterSet);
//
//       await expect(confirmMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Confirm Monster Trait Quest : Failed : Invalid Monster : Not Contain Trait Value : Shadow", async () => {
//       monsterSet = {
//         normalMonsterIds: [1, 2],
//         normalMonsterAmounts: [5, 5],
//         shadowMonsterIds: [2, 4],
//         shadowMonsterAmounts: [2, 3],
//       };
//
//       const confirmMonsterTraitQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmMonsterTraitQuest(questId, monsterSet);
//
//       await expect(confirmMonsterTraitQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidMonster"
//       );
//     });
//
//     it("Confirm Quest : Failed : Un Active Quest", async () => {
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         4,
//         hunter1.address
//       );
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [4, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const setQuestActiveTx = await seasonQuest.setQuestActive(4, false);
//       await setQuestActiveTx.wait();
//
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(4, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "UnActiveQuest"
//       );
//
//       const setQuestActiveTx2 = await seasonQuest.setQuestActive(4, true);
//       await setQuestActiveTx2.wait();
//     });
//
//     it("Confirm Quest : Failed : Invalid Season Id", async () => {
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(1, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidSeasonId"
//       );
//     });
//
//     it("Confirm Quest : Failed : Invalid Quest Type", async () => {
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(4);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidQuestType"
//       );
//     });
//
//     it("Confirm Quest : Failed : Exceed Completable Count", async () => {
//       const confirmGeneralQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(4, operatorSignature);
//       await confirmGeneralQuestTx.wait();
//
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         4,
//         hunter1.address
//       );
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [4, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx2 = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(4, operatorSignature);
//
//       await expect(confirmGeneralQuestTx2).to.revertedWithCustomError(
//         seasonQuest,
//         "ExceedCompletableCount"
//       );
//     });
//
//     it("Confirm Quest : Failed : Not Complete Required Quest", async () => {
//       questInput = {
//         seasonId: 1,
//         rewardScore: 50,
//         completableCount: 1,
//         requiredQuestId: 1,
//         rankType: RankType.E,
//         hunterItemIds: [1],
//       };
//
//       const addGeneralQuestTx = await seasonQuest.addGeneralQuest(questInput);
//       await addGeneralQuestTx.wait();
//
//       questId = 8;
//
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [questId, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "NotCompleteRequiredQuest"
//       );
//     });
//
//     it("Confirm Quest : Failed : Invalid Hunter Rank", async () => {
//       questInput = {
//         seasonId: 1,
//         rewardScore: 50,
//         completableCount: 1,
//         requiredQuestId: 0,
//         rankType: RankType.D,
//         hunterItemIds: [1],
//       };
//
//       const addGeneralQuestTx = await seasonQuest.addGeneralQuest(questInput);
//       await addGeneralQuestTx.wait();
//
//       questId = 9;
//
//       const completedCount = await seasonQuest.getQuestCompletedCount(
//         questId,
//         hunter1.address
//       );
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["uint256", "address", "uint256"],
//         [questId, hunter1.address, completedCount]
//       );
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       operatorSignature = await operatorManager.signMessage(messageBinary);
//
//       const confirmGeneralQuestTx = seasonQuest
//         .connect(hunter1)
//         .confirmGeneralQuest(questId, operatorSignature);
//
//       await expect(confirmGeneralQuestTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidHunterRank"
//       );
//     });
//
//     it("Monster Set Quest : Gas Used : Monster 100", async () => {
//       const latestMonsterId = 5;
//       const normalMonsterIds = [];
//       const normalMonsterAmounts = [];
//       const shadowMonsterIds = [];
//       const shadowMonsterAmounts = [];
//
//       for (let i = 1; i <= 50; i++) {
//         const addNormalMonsterTx = await monsterFactory.addMonster(
//           RankType.E,
//           false
//         );
//         await addNormalMonsterTx.wait(); // normalMonsterId 6-55
//
//         const addShadowMonsterTx = await monsterFactory.addMonster(
//           RankType.B,
//           true
//         );
//         await addShadowMonsterTx.wait(); // shadowMonsterId 6-55
//
//         const monsterId = latestMonsterId + i;
//
//         normalMonsterIds.push(monsterId);
//         normalMonsterAmounts.push(1);
//         shadowMonsterIds.push(monsterId);
//         shadowMonsterAmounts.push(1);
//
//         const normalMonsterMintTx = await normalMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await normalMonsterMintTx.wait();
//
//         const shadowMonsterMintTx = await shadowMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await shadowMonsterMintTx.wait();
//       }
//
//       questInput = {
//         seasonId: 1,
//         rewardScore: 0,
//         completableCount: 0,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [],
//       };
//
//       monsterSet = {
//         normalMonsterIds,
//         normalMonsterAmounts,
//         shadowMonsterIds,
//         shadowMonsterAmounts,
//       };
//
//       const addMonsterSetQuestTx = await seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//       const addQuestReceipt = await addMonsterSetQuestTx.wait();
//
//       console.log(
//         `Add Monster Set Quest Tx Gas Used : Normal Monster 50, Shadow Monster 50 : ${addQuestReceipt.gasUsed}`
//       );
//
//       questId = 10;
//
//       const confirmMonsterSetQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(questId);
//       const confirmQuestReceipt = await confirmMonsterSetQuestTx.wait();
//
//       console.log(
//         `Confirm Monster Set Quest Tx Gas Used : Normal Monster 50, Shadow Monster 50 : ${confirmQuestReceipt.gasUsed}`
//       );
//     });
//
//     it("Monster Set Quest : Gas Used : Monster 200", async () => {
//       const latestMonsterId = 55;
//       const normalMonsterIds = [];
//       const normalMonsterAmounts = [];
//       const shadowMonsterIds = [];
//       const shadowMonsterAmounts = [];
//
//       for (let i = 1; i <= 100; i++) {
//         const addNormalMonsterTx = await monsterFactory.addMonster(
//           RankType.E,
//           false
//         );
//         await addNormalMonsterTx.wait(); // normalMonsterId 56-155
//
//         const addShadowMonsterTx = await monsterFactory.addMonster(
//           RankType.B,
//           true
//         );
//         await addShadowMonsterTx.wait(); // shadowMonsterId 56-155
//
//         const monsterId = latestMonsterId + i;
//
//         normalMonsterIds.push(monsterId);
//         normalMonsterAmounts.push(1);
//         shadowMonsterIds.push(monsterId);
//         shadowMonsterAmounts.push(1);
//
//         const normalMonsterMintTx = await normalMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await normalMonsterMintTx.wait();
//
//         const shadowMonsterMintTx = await shadowMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await shadowMonsterMintTx.wait();
//       }
//
//       questInput = {
//         seasonId: 1,
//         rewardScore: 0,
//         completableCount: 0,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [],
//       };
//
//       monsterSet = {
//         normalMonsterIds,
//         normalMonsterAmounts,
//         shadowMonsterIds,
//         shadowMonsterAmounts,
//       };
//
//       const addMonsterSetQuestTx = await seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//       const addQuestReceipt = await addMonsterSetQuestTx.wait();
//
//       console.log(
//         `Add Monster Set Quest Tx Gas Used : Normal Monster 100, Shadow Monster 100 : ${addQuestReceipt.gasUsed}`
//       );
//
//       questId = 11;
//
//       const confirmMonsterSetQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(questId);
//       const confirmQuestReceipt = await confirmMonsterSetQuestTx.wait();
//
//       console.log(
//         `Confirm Monster Set Quest Tx Gas Used : Normal Monster 100, Shadow Monster 100 : ${confirmQuestReceipt.gasUsed}`
//       );
//     });
//
//     it("Monster Set Quest : Gas Used : Monster 400", async () => {
//       const latestMonsterId = 155;
//       const normalMonsterIds = [];
//       const normalMonsterAmounts = [];
//       const shadowMonsterIds = [];
//       const shadowMonsterAmounts = [];
//
//       for (let i = 1; i <= 200; i++) {
//         const addNormalMonsterTx = await monsterFactory.addMonster(
//           RankType.E,
//           false
//         );
//         await addNormalMonsterTx.wait(); // normalMonsterId 156-355
//
//         const addShadowMonsterTx = await monsterFactory.addMonster(
//           RankType.B,
//           true
//         );
//         await addShadowMonsterTx.wait(); // shadowMonsterId 156-355
//
//         const monsterId = latestMonsterId + i;
//
//         normalMonsterIds.push(monsterId);
//         normalMonsterAmounts.push(1);
//         shadowMonsterIds.push(monsterId);
//         shadowMonsterAmounts.push(1);
//
//         const normalMonsterMintTx = await normalMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await normalMonsterMintTx.wait();
//
//         const shadowMonsterMintTx = await shadowMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await shadowMonsterMintTx.wait();
//       }
//
//       questInput = {
//         seasonId: 1,
//         rewardScore: 0,
//         completableCount: 0,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [],
//       };
//
//       monsterSet = {
//         normalMonsterIds,
//         normalMonsterAmounts,
//         shadowMonsterIds,
//         shadowMonsterAmounts,
//       };
//
//       const addMonsterSetQuestTx = await seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//       const addQuestReceipt = await addMonsterSetQuestTx.wait();
//
//       console.log(
//         `Add Monster Set Quest Tx Gas Used : Normal Monster 200, Shadow Monster 200 : ${addQuestReceipt.gasUsed}`
//       );
//
//       questId = 12;
//
//       const confirmMonsterSetQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(questId);
//       const confirmQuestReceipt = await confirmMonsterSetQuestTx.wait();
//
//       console.log(
//         `Confirm Monster Set Quest Tx Gas Used : Normal Monster 200, Shadow Monster 200 : ${confirmQuestReceipt.gasUsed}`
//       );
//     });
//
//     it("Monster Set Quest : Gas Used : Monster 600", async () => {
//       const latestMonsterId = 355;
//       const normalMonsterIds = [];
//       const normalMonsterAmounts = [];
//       const shadowMonsterIds = [];
//       const shadowMonsterAmounts = [];
//
//       for (let i = 1; i <= 300; i++) {
//         const addNormalMonsterTx = await monsterFactory.addMonster(
//           RankType.E,
//           false
//         );
//         await addNormalMonsterTx.wait(); // normalMonsterId 356-655
//
//         const addShadowMonsterTx = await monsterFactory.addMonster(
//           RankType.B,
//           true
//         );
//         await addShadowMonsterTx.wait(); // shadowMonsterId 356-655
//
//         const monsterId = latestMonsterId + i;
//
//         normalMonsterIds.push(monsterId);
//         normalMonsterAmounts.push(1);
//         shadowMonsterIds.push(monsterId);
//         shadowMonsterAmounts.push(1);
//
//         const normalMonsterMintTx = await normalMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await normalMonsterMintTx.wait();
//
//         const shadowMonsterMintTx = await shadowMonster.mintOfTest(
//           hunter1.address,
//           monsterId,
//           1
//         );
//         await shadowMonsterMintTx.wait();
//       }
//
//       questInput = {
//         seasonId: 1,
//         rewardScore: 0,
//         completableCount: 0,
//         requiredQuestId: 0,
//         rankType: RankType.E,
//         hunterItemIds: [],
//       };
//
//       monsterSet = {
//         normalMonsterIds,
//         normalMonsterAmounts,
//         shadowMonsterIds,
//         shadowMonsterAmounts,
//       };
//
//       const addMonsterSetQuestTx = await seasonQuest.addMonsterSetQuest(
//         questInput,
//         monsterSet
//       );
//       const addQuestReceipt = await addMonsterSetQuestTx.wait();
//
//       console.log(
//         `Add Monster Set Quest Tx Gas Used : Normal Monster 300, Shadow Monster 300 : ${addQuestReceipt.gasUsed}`
//       );
//
//       questId = 13;
//
//       const confirmMonsterSetQuestTx = await seasonQuest
//         .connect(hunter1)
//         .confirmMonsterSetQuest(questId);
//       const confirmQuestReceipt = await confirmMonsterSetQuestTx.wait();
//
//       console.log(
//         `Confirm Monster Set Quest Tx Gas Used : Normal Monster 300, Shadow Monster 300 : ${confirmQuestReceipt.gasUsed}`
//       );
//     });
//   });
//
//   //////////
//   // Base //
//   //////////
//
//   describe("Base", async () => {
//     it("Set Hunter Item Collection Id : Success", async () => {
//       isShadow = false;
//       const setHunterItemCollectionIdTx =
//         await seasonQuest.setHunterItemCollectionId(2);
//       await setHunterItemCollectionIdTx.wait();
//
//       const monsterCollectionId = await seasonQuest.getHunterItemCollectionId();
//       expect(monsterCollectionId).to.equal(2);
//     });
//
//     it("Set Hunter Item Collection Id : Failed : Only Operator", async () => {
//       const setHunterItemCollectionIdTx = seasonQuest
//         .connect(notOperator)
//         .setHunterItemCollectionId(2);
//
//       await expect(setHunterItemCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "OnlyOperator"
//       );
//     });
//
//     it("Set Hunter Item Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
//       const setHunterItemCollectionIdTx =
//         seasonQuest.setHunterItemCollectionId(200);
//
//       await expect(setHunterItemCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidCollectionId"
//       );
//     });
//
//     it("Set Hunter Item Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
//       const setCollectionActiveTx = await project.setCollectionActive(2, false);
//       await setCollectionActiveTx.wait();
//
//       const setHunterItemCollectionIdTx =
//         seasonQuest.setHunterItemCollectionId(2);
//
//       await expect(setHunterItemCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidCollectionId"
//       );
//
//       const setCollectionActiveTx2 = await project.setCollectionActive(2, true);
//       await setCollectionActiveTx2.wait();
//     });
//
//     it("Set Hunter Item Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
//       const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
//       const shadowMonarch = await upgrades.deployProxy(
//         ShadowMonarch,
//         [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
//         { kind: "uups" }
//       );
//       await shadowMonarch.deployed();
//
//       const addCollectionTx = await project.addCollection(
//         shadowMonarch.address,
//         creator.address
//       );
//       await addCollectionTx.wait(); // collectionId 8
//
//       const setHunterItemCollectionIdTx =
//         seasonQuest.setHunterItemCollectionId(8);
//
//       await expect(setHunterItemCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidCollectionId"
//       );
//     });
//
//     it("Set Monster Collection Id : Success", async () => {
//       isShadow = false;
//       const setMonsterCollectionIdTx = await seasonQuest.setMonsterCollectionId(
//         2,
//         isShadow
//       );
//       await setMonsterCollectionIdTx.wait();
//
//       const monsterCollectionId = await seasonQuest.getMonsterCollectionId(
//         isShadow
//       );
//       expect(monsterCollectionId).to.equal(2);
//     });
//
//     it("Set Monster Collection Id : Failed : Only Operator", async () => {
//       const setMonsterCollectionIdTx = seasonQuest
//         .connect(notOperator)
//         .setMonsterCollectionId(2, isShadow);
//
//       await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "OnlyOperator"
//       );
//     });
//
//     it("Set Monster Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
//       const setMonsterCollectionIdTx = seasonQuest.setMonsterCollectionId(
//         200,
//         isShadow
//       );
//
//       await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidCollectionId"
//       );
//     });
//
//     it("Set Monster Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
//       const setCollectionActiveTx = await project.setCollectionActive(2, false);
//       await setCollectionActiveTx.wait();
//
//       const setMonsterCollectionIdTx = seasonQuest.setMonsterCollectionId(
//         2,
//         isShadow
//       );
//
//       await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidCollectionId"
//       );
//     });
//
//     it("Set Monster Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
//       const setMonsterCollectionIdTx = seasonQuest.setMonsterCollectionId(
//         8,
//         isShadow
//       );
//
//       await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
//         seasonQuest,
//         "InvalidCollectionId"
//       );
//     });
//
//     it("Set MonsterFactory Contract : Success", async () => {
//       const setMonsterFactoryContractTx =
//         await seasonQuest.setMonsterFactoryContract(project.address);
//       await setMonsterFactoryContractTx.wait();
//
//       const monsterFactoryContract =
//         await seasonQuest.getMonsterFactoryContract();
//       expect(monsterFactoryContract).to.equal(project.address);
//     });
//
//     it("Set Season Contract : Success", async () => {
//       const setSeasonContractTx = await seasonQuest.setSeasonContract(
//         project.address
//       );
//       await setSeasonContractTx.wait();
//
//       const seasonContract = await seasonQuest.getSeasonContract();
//       expect(seasonContract).to.equal(project.address);
//     });
//   });
// });
