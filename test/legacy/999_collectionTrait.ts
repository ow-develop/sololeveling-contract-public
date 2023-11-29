// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { Contract } from "ethers";
// import { ethers, expect, upgrades } from "hardhat";
//
// import { getBlockTimestamp } from "../../helpers/block-timestamp";
// import { RankType } from "../../helpers/constant/contract";
// import {
//   AddMonster,
//   Create,
//   SetAriseMonster,
//   SetAriseMonsterBatch,
//   SetMonsterRankType,
// } from "../../helpers/type/event";
// import { ZERO_ADDRESS } from "../../helpers/constant/common";
//
// describe("MonsterFactory", () => {
//   let operatorMaster: SignerWithAddress,
//     operatorManager: SignerWithAddress,
//     notOperator: SignerWithAddress,
//     creator: SignerWithAddress;
//
//   let project: Contract,
//     operator: Contract,
//     monsterFactory: Contract,
//     normalMonster: Contract,
//     shadowMonster: Contract;
//
//   let CreateEvent: Create,
//     AddMonsterEvent: AddMonster,
//     SetMonsterRankTypeEvent: SetMonsterRankType,
//     SetAriseMonsterEvent: SetAriseMonster,
//     SetAriseMonsterBatchEvent: SetAriseMonsterBatch;
//
//   let isShadow: boolean,
//     nextMonsterRank: RankType,
//     beforeMonsterId: number,
//     nextMonsterId: number,
//     traitMonsterSets;
//
//   before(async () => {
//     [operatorMaster, operatorManager, notOperator, creator] =
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
//     // deploy normalMonster
//     const NormalMonster = await ethers.getContractFactory("SLMonster");
//     normalMonster = await upgrades.deployProxy(
//       NormalMonster,
//       [
//         project.address,
//         monsterFactory.address,
//         ZERO_ADDRESS,
//         [],
//         "baseTokenURI",
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await normalMonster.deployed();
//     console.log(`NormalMonster deployed to: ${normalMonster.address}`);
//
//     const addCollectionTx1 = await project
//       .connect(operatorManager)
//       .addCollection(normalMonster.address, creator.address);
//     await addCollectionTx1.wait();
//
//     // deploy shadowMonster
//     const ShadowMonster = await ethers.getContractFactory("SLShadowArmy");
//     shadowMonster = await upgrades.deployProxy(
//       ShadowMonster,
//       [
//         project.address,
//         monsterFactory.address,
//         ZERO_ADDRESS,
//         [],
//         "baseTokenURI",
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await shadowMonster.deployed();
//     console.log(`ShadowMonster deployed to: ${shadowMonster.address}`);
//
//     const addCollectionTx2 = await project
//       .connect(operatorManager)
//       .addCollection(shadowMonster.address, creator.address);
//     await addCollectionTx2.wait();
//   });
//
//   describe("Trait", async () => {
//     it("Add Monster Trait Type : Success", async () => {
//       const addMonsterTraitTypeTx = await monsterFactory
//         .connect(operatorManager)
//         .addMonsterTraitType("TraitName");
//       const timestamp = await getBlockTimestamp(
//         addMonsterTraitTypeTx.blockNumber
//       );
//
//       CreateEvent = {
//         target: "MonsterTraitType",
//         targetId: 1,
//         timestamp: timestamp,
//       };
//
//       await expect(addMonsterTraitTypeTx)
//         .to.emit(monsterFactory, "Create")
//         .withArgs(
//           CreateEvent.target,
//           CreateEvent.targetId,
//           CreateEvent.timestamp
//         );
//
//       const isExist = await monsterFactory.isExistTraitTypeByName("TraitName");
//
//       expect(isExist).to.equal(true);
//     });
//
//     it("Add Monster Trait Type : Failed : Only Operator", async () => {
//       const addMonsterTraitTypeTx = monsterFactory
//         .connect(notOperator)
//         .addMonsterTraitType("TraitName2");
//
//       await expect(addMonsterTraitTypeTx).to.revertedWithCustomError(
//         monsterFactory,
//         "OnlyOperator"
//       );
//     });
//
//     it("Add Monster Trait Type : Failed : Already Exist Type Name", async () => {
//       const addMonsterTraitTypeTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterTraitType("TraitName");
//
//       await expect(addMonsterTraitTypeTx).to.revertedWithCustomError(
//         monsterFactory,
//         "AlreadyExistTypeName"
//       );
//     });
//
//     it("Set Monster Trait Type Name : Success", async () => {
//       const setMonsterTraitTypeNameTx = await monsterFactory
//         .connect(operatorManager)
//         .setMonsterTraitTypeName("1", "NewName");
//       await setMonsterTraitTypeNameTx.wait();
//
//       const isExist = await monsterFactory.isExistTraitTypeByName("TraitName");
//       const isExist2 = await monsterFactory.isExistTraitTypeByName("NewName");
//       const traitId = await monsterFactory.getTraitTypeIdByName("NewName");
//
//       expect(isExist).to.equal(false);
//       expect(isExist2).to.equal(true);
//       expect(traitId).to.equal("1");
//     });
//
//     it("Set Monster Trait Type Name : Failed : Only Operator", async () => {
//       const setMonsterTraitTypeNameTx = monsterFactory
//         .connect(notOperator)
//         .setMonsterTraitTypeName("1", "TraitName2");
//
//       await expect(setMonsterTraitTypeNameTx).to.revertedWithCustomError(
//         monsterFactory,
//         "OnlyOperator"
//       );
//     });
//
//     it("Set Monster Trait Type Name : Failed : Invalid Trait Type Id", async () => {
//       const setMonsterTraitTypeNameTx = monsterFactory
//         .connect(operatorManager)
//         .setMonsterTraitTypeName("100", "TraitName2");
//
//       await expect(setMonsterTraitTypeNameTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitTypeId"
//       );
//     });
//
//     it("Set Monster Trait Type Name : Failed : Already Exist Type Name", async () => {
//       const setMonsterTraitTypeNameTx = monsterFactory
//         .connect(operatorManager)
//         .setMonsterTraitTypeName("1", "NewName");
//
//       await expect(setMonsterTraitTypeNameTx).to.revertedWithCustomError(
//         monsterFactory,
//         "AlreadyExistTypeName"
//       );
//     });
//
//     it("Set Monster Trait Type Active : Success", async () => {
//       const setMonsterTraitTypeActiveTx = await monsterFactory
//         .connect(operatorManager)
//         .setMonsterTraitTypeActive("1", false);
//       await setMonsterTraitTypeActiveTx.wait();
//
//       const isActive = await monsterFactory.isActiveTraitType("1");
//
//       expect(isActive).to.equal(false);
//
//       const setMonsterTraitTypeActiveTx2 = await monsterFactory
//         .connect(operatorManager)
//         .setMonsterTraitTypeActive("1", true);
//       await setMonsterTraitTypeActiveTx2.wait();
//     });
//
//     it("Set Monster Trait Type Active : Failed : Only Operator", async () => {
//       const setMonsterTraitTypeActiveTx = monsterFactory
//         .connect(notOperator)
//         .setMonsterTraitTypeActive("1", true);
//
//       await expect(setMonsterTraitTypeActiveTx).to.revertedWithCustomError(
//         monsterFactory,
//         "OnlyOperator"
//       );
//     });
//
//     it("Set Monster Trait Type Active : Failed : Invalid Trait Type Id", async () => {
//       const setMonsterTraitTypeActiveTx = monsterFactory
//         .connect(operatorManager)
//         .setMonsterTraitTypeActive("100", true);
//
//       await expect(setMonsterTraitTypeActiveTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitTypeId"
//       );
//     });
//
//     it("Add Monster Trait Value : Success", async () => {
//       const addMonsterTraitValueTx = await monsterFactory
//         .connect(operatorManager)
//         .addMonsterTraitValue("1", "ValueName");
//       const timestamp = await getBlockTimestamp(
//         addMonsterTraitValueTx.blockNumber
//       );
//
//       CreateEvent = {
//         target: "MonsterTraitValue",
//         targetId: 1,
//         timestamp: timestamp,
//       };
//
//       await expect(addMonsterTraitValueTx)
//         .to.emit(monsterFactory, "Create")
//         .withArgs(
//           CreateEvent.target,
//           CreateEvent.targetId,
//           CreateEvent.timestamp
//         );
//
//       const isExist = await monsterFactory.isExistTraitValueByName(
//         "1",
//         "ValueName"
//       );
//       const isExist2 = await monsterFactory.isExistTraitValueByName(
//         "2",
//         "ValueName"
//       );
//       const isValid = await monsterFactory.isContainTraitValueOfType("1", "1");
//       const valueIds = await monsterFactory.getTraitValueIdOfType("1");
//
//       expect(isExist).to.equal(true);
//       expect(isExist2).to.equal(false);
//       expect(isValid).to.equal(true);
//       expect(valueIds[0]).to.equal("1");
//     });
//
//     it("Add Monster Trait Value : Failed : Only Operator", async () => {
//       const addMonsterTraitValueTx = monsterFactory
//         .connect(notOperator)
//         .addMonsterTraitValue("1", "ValueName2");
//
//       await expect(addMonsterTraitValueTx).to.revertedWithCustomError(
//         monsterFactory,
//         "OnlyOperator"
//       );
//     });
//
//     it("Add Monster Trait Value : Failed : Invalid Trait Type Id", async () => {
//       const addMonsterTraitValueTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterTraitValue("100", "ValueName2");
//
//       await expect(addMonsterTraitValueTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitTypeId"
//       );
//     });
//
//     it("Add Monster Trait Value : Failed : Already Exist Value Name", async () => {
//       const addMonsterTraitValueTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterTraitValue("1", "ValueName");
//
//       await expect(addMonsterTraitValueTx).to.revertedWithCustomError(
//         monsterFactory,
//         "AlreadyExistValueName"
//       );
//     });
//
//     it("Remove Monster Trait Value : Success", async () => {
//       const removeMonsterTraitValueTx = await monsterFactory
//         .connect(operatorManager)
//         .removeMonsterTraitValue("1");
//       await removeMonsterTraitValueTx.wait();
//
//       const isExist = await monsterFactory.isExistTraitValueById("1");
//       const isExist2 = await monsterFactory.isExistTraitValueByName(
//         "1",
//         "ValueName"
//       );
//       const isValid = await monsterFactory.isContainTraitValueOfType("1", "1");
//       const valueIds = await monsterFactory.getTraitValueIdOfType("1");
//
//       expect(isExist).to.equal(false);
//       expect(isExist2).to.equal(false);
//       expect(isValid).to.equal(false);
//       expect(valueIds.length).to.equal(0);
//     });
//
//     it("Remove Monster Trait Type : Failed : Only Operator", async () => {
//       const addMonsterTraitValueTx = await monsterFactory
//         .connect(operatorManager)
//         .addMonsterTraitValue("1", "ValueName");
//
//       await addMonsterTraitValueTx.wait();
//
//       const removeMonsterTraitValueTx = monsterFactory
//         .connect(notOperator)
//         .removeMonsterTraitValue("2");
//
//       await expect(removeMonsterTraitValueTx).to.revertedWithCustomError(
//         monsterFactory,
//         "OnlyOperator"
//       );
//     });
//
//     it("Remove Monster Trait Type : Failed : Already Exist Monster", async () => {
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [1],
//           shadowMonsterIds: [],
//         },
//       ];
//
//       const addMonsterOfTraitTx = await monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//       await addMonsterOfTraitTx.wait();
//
//       const removeMonsterTraitValueTx = monsterFactory
//         .connect(operatorManager)
//         .removeMonsterTraitValue("2");
//
//       await expect(removeMonsterTraitValueTx).to.revertedWithCustomError(
//         monsterFactory,
//         "AlreadyExistMonster"
//       );
//
//       const removeMonsterOfTraitTx = await monsterFactory
//         .connect(operatorManager)
//         .removeMonsterOfTrait(2, false, [1]);
//       await removeMonsterOfTraitTx.wait();
//     });
//
//     it("Add Monster Of Trait : Success : Normal", async () => {
//       isShadow = false;
//
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [1],
//           shadowMonsterIds: [],
//         },
//       ];
//
//       const addMonsterOfTraitTx = await monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//       await addMonsterOfTraitTx.wait();
//
//       const isContainOfType = await monsterFactory.isContainMonsterOfTraitType(
//         1,
//         isShadow,
//         1
//       );
//       const isContainOfValue =
//         await monsterFactory.isContainMonsterOfTraitValue(2, isShadow, 1);
//       const monsterLength = await monsterFactory.getMonsterLengthOfTraitValue(
//         2,
//         isShadow
//       );
//       const monsterIdOfType = await monsterFactory.getMonsterIdOfTraitType(
//         1,
//         isShadow
//       );
//       const monsterIdOfValue = await monsterFactory.getMonsterIdOfTraitValue(
//         2,
//         isShadow
//       );
//
//       expect(isContainOfType).to.equal(true);
//       expect(isContainOfValue).to.equal(true);
//       expect(monsterLength).to.equal(1);
//       expect(monsterIdOfType[0]).to.equal(1);
//       expect(monsterIdOfValue[0]).to.equal(1);
//     });
//
//     it("Add Monster Of Trait : Success : Shadow", async () => {
//       isShadow = true;
//
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [],
//           shadowMonsterIds: [1],
//         },
//       ];
//
//       const addMonsterOfTraitTx = await monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//       await addMonsterOfTraitTx.wait();
//
//       const isContainOfType = await monsterFactory.isContainMonsterOfTraitType(
//         1,
//         isShadow,
//         1
//       );
//       const isContainOfValue =
//         await monsterFactory.isContainMonsterOfTraitValue(2, isShadow, 1);
//       const monsterLength = await monsterFactory.getMonsterLengthOfTraitValue(
//         2,
//         isShadow
//       );
//       const monsterIdOfType = await monsterFactory.getMonsterIdOfTraitType(
//         1,
//         isShadow
//       );
//       const monsterIdOfValue = await monsterFactory.getMonsterIdOfTraitValue(
//         2,
//         isShadow
//       );
//
//       expect(isContainOfType).to.equal(true);
//       expect(isContainOfValue).to.equal(true);
//       expect(monsterLength).to.equal(1);
//       expect(monsterIdOfType[0]).to.equal(1);
//       expect(monsterIdOfValue[0]).to.equal(1);
//     });
//
//     it("Add Monster Of Trait : Failed : Only Operator", async () => {
//       isShadow = false;
//
//       const addMonsterTx = await monsterFactory
//         .connect(operatorManager)
//         .addMonster(RankType.D, isShadow);
//       await addMonsterTx.wait(); // normalMonsterId 2
//
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [2],
//           shadowMonsterIds: [],
//         },
//       ];
//
//       const addMonsterOfTraitTx = monsterFactory
//         .connect(notOperator)
//         .addMonsterOfTrait(1, traitMonsterSets);
//
//       await expect(addMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "OnlyOperator"
//       );
//     });
//
//     it("Add Monster Of Trait : Failed : Invalid Trait Type Id", async () => {
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [2],
//           shadowMonsterIds: [],
//         },
//       ];
//
//       const addMonsterOfTraitTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(100, traitMonsterSets);
//
//       await expect(addMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitTypeId"
//       );
//     });
//
//     it("Add Monster Of Trait : Failed : Invalid Trait Monster Set : Invalid Trait Value", async () => {
//       traitMonsterSets = [
//         {
//           valueId: 1,
//           normalMonsterIds: [2],
//           shadowMonsterIds: [],
//         },
//       ];
//
//       const addMonsterOfTraitTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//
//       await expect(addMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitMonsterSet"
//       );
//     });
//
//     it("Add Monster Of Trait : Failed : Invalid Trait Monster Set : Does Not Exist Monster : Normal", async () => {
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [100],
//           shadowMonsterIds: [],
//         },
//       ];
//
//       const addMonsterOfTraitTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//
//       await expect(addMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitMonsterSet"
//       );
//     });
//
//     it("Add Monster Of Trait : Failed : Invalid Trait Monster Set : Does Not Exist Monster : Shadow", async () => {
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [],
//           shadowMonsterIds: [100],
//         },
//       ];
//
//       const addMonsterOfTraitTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//
//       await expect(addMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitMonsterSet"
//       );
//     });
//
//     it("Add Monster Of Trait : Failed : Already Exist Monster : Normal", async () => {
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [2],
//           shadowMonsterIds: [],
//         },
//         {
//           valueId: 2,
//           normalMonsterIds: [2],
//           shadowMonsterIds: [],
//         },
//       ];
//
//       const addMonsterOfTraitTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//
//       await expect(addMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "AlreadyExistMonster"
//       );
//     });
//
//     it("Add Monster Of Trait : Failed : Already Exist Monster : Shadow", async () => {
//       traitMonsterSets = [
//         {
//           valueId: 2,
//           normalMonsterIds: [],
//           shadowMonsterIds: [1],
//         },
//       ];
//
//       const addMonsterOfTraitTx = monsterFactory
//         .connect(operatorManager)
//         .addMonsterOfTrait(1, traitMonsterSets);
//
//       await expect(addMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "AlreadyExistMonster"
//       );
//     });
//
//     it("Remove Monster Of Trait : Success : Normal", async () => {
//       isShadow = false;
//
//       const removeMonsterOfTraitTx = await monsterFactory
//         .connect(operatorManager)
//         .removeMonsterOfTrait(2, isShadow, [1]);
//       await removeMonsterOfTraitTx.wait();
//
//       const isContainOfType = await monsterFactory.isContainMonsterOfTraitType(
//         1,
//         isShadow,
//         1
//       );
//       const isContainOfValue =
//         await monsterFactory.isContainMonsterOfTraitValue(2, isShadow, 1);
//       const monsterLength = await monsterFactory.getMonsterLengthOfTraitValue(
//         2,
//         isShadow
//       );
//       const monsterIdOfType = await monsterFactory.getMonsterIdOfTraitType(
//         1,
//         isShadow
//       );
//       const monsterIdOfValue = await monsterFactory.getMonsterIdOfTraitValue(
//         2,
//         isShadow
//       );
//
//       expect(isContainOfType).to.equal(false);
//       expect(isContainOfValue).to.equal(false);
//       expect(monsterLength).to.equal(0);
//       expect(monsterIdOfType.length).to.equal(0);
//       expect(monsterIdOfValue.length).to.equal(0);
//     });
//
//     it("Remove Monster Of Trait : Success : Shadow", async () => {
//       isShadow = true;
//
//       const removeMonsterOfTraitTx = await monsterFactory
//         .connect(operatorManager)
//         .removeMonsterOfTrait(2, isShadow, [1]);
//       await removeMonsterOfTraitTx.wait();
//
//       const isContainOfType = await monsterFactory.isContainMonsterOfTraitType(
//         1,
//         isShadow,
//         1
//       );
//       const isContainOfValue =
//         await monsterFactory.isContainMonsterOfTraitValue(2, isShadow, 1);
//       const monsterLength = await monsterFactory.getMonsterLengthOfTraitValue(
//         2,
//         isShadow
//       );
//       const monsterIdOfType = await monsterFactory.getMonsterIdOfTraitType(
//         1,
//         isShadow
//       );
//       const monsterIdOfValue = await monsterFactory.getMonsterIdOfTraitValue(
//         2,
//         isShadow
//       );
//
//       expect(isContainOfType).to.equal(false);
//       expect(isContainOfValue).to.equal(false);
//       expect(monsterLength).to.equal(0);
//       expect(monsterIdOfType.length).to.equal(0);
//       expect(monsterIdOfValue.length).to.equal(0);
//     });
//
//     it("Remove Monster Of Trait : Failed : Only Operator", async () => {
//       const removeMonsterOfTraitTx = monsterFactory
//         .connect(notOperator)
//         .removeMonsterOfTrait(2, isShadow, [1]);
//
//       await expect(removeMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "OnlyOperator"
//       );
//     });
//
//     it("Remove Monster Of Trait : Failed : Invalid Trait Value Id", async () => {
//       const removeMonsterOfTraitTx = monsterFactory
//         .connect(operatorManager)
//         .removeMonsterOfTrait(100, isShadow, [1]);
//
//       await expect(removeMonsterOfTraitTx).to.revertedWithCustomError(
//         monsterFactory,
//         "InvalidTraitValueId"
//       );
//     });
//   });
// });
