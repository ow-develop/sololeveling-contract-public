import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import { getBlockTimestamp } from "../helpers/block-timestamp";
import { getEventArgs } from "./../helpers/event-parser";
import { RankType } from "../helpers/constant/contract";
import { MonsterSet, UseMonster } from "../helpers/type/contract";
import {
  MonsterArose,
  MonsterReturned,
  MonsterReturnedBatch,
  MonsterUpgraded,
} from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";

describe("System", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    creator: SignerWithAddress,
    randomSigner: SignerWithAddress,
    hunter1: SignerWithAddress,
    hunter2: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    monsterFactory: Contract,
    random: Contract,
    system: Contract,
    essenceStone: Contract,
    normalMonster: Contract,
    shadowMonster: Contract;

  let MonsterUpgradedEvent: MonsterUpgraded,
    MonsterAroseEvent: MonsterArose,
    MonsterReturnedEvent: MonsterReturned,
    MonsterReturnedBatchEvent: MonsterReturnedBatch;

  let monsterRank: RankType,
    nextMonsterRank: RankType,
    requestAmount: number,
    usedStone: number,
    requiredStone: number,
    isShadow: boolean,
    usedMonster: UseMonster,
    monsterId: number,
    nextMonsterId: number,
    monsterIds: number[],
    monsterAmounts: number[],
    monsterSet: MonsterSet;

  const essenceStoneTokenId = 1;
  const requiredMonsterForUpgrade = 2;
  const requiredStoneForUpgrade = 10;
  const requiredStoneForArise = 100;
  const percentageForArise = [10_00000, 1_50000, 50000];

  const resultTokenParser = (
    tokenIds: number[]
  ): { tokenId: number; amount: number }[] => {
    const parsingToken: any = [];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];

      if (parsingToken.length === 0) {
        parsingToken.push({
          tokenId,
          amount: 1,
        });
      } else {
        let isExist = false;

        for (let j = 0; j < parsingToken.length; j++) {
          if (parsingToken[j].tokenId === tokenId) {
            parsingToken[j].amount += 1;
            isExist = true;
            break;
          }
        }

        if (!isExist) {
          parsingToken.push({
            tokenId,
            amount: 1,
          });
        }
      }
    }

    return parsingToken;
  };

  const generateMonsterUpgraded = async (
    hunter: string,
    nonce: number,
    nextMonsterRank: RankType,
    requestAmount: number
  ): Promise<{ resultMonsterIds: number[]; monsterSignatures: string[] }> => {
    const resultMonsterIds = [];
    const monsterSignatures = [];

    for (let i = 0; i < requestAmount; i++) {
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256"],
        [hunter, nonce]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const monsterSignature = await randomSigner.signMessage(messageBinary);

      monsterSignatures.push(monsterSignature);

      const randomNumber = ethers.BigNumber.from(
        ethers.utils.solidityKeccak256(["bytes"], [monsterSignature])
      );

      const monsterIds = await monsterFactory.getMonsterIdOfRankType(
        nextMonsterRank,
        false
      );
      const modNumber = randomNumber.mod(monsterIds.length).toNumber();

      resultMonsterIds.push(monsterIds[modNumber]);

      nonce += 1;
    }

    return { resultMonsterIds, monsterSignatures };
  };

  const generateMonsterArose = async (
    hunter: string,
    nonce: number,
    nextMonsterRank: RankType,
    requestAmount: number
  ): Promise<{
    monsterSignatures: string[];
    aroseCount: number;
    usedStone: number;
    isSuccess: boolean;
  }> => {
    const monsterSignatures = [];
    const percentage = percentageForArise[nextMonsterRank - 3];

    let aroseCount = 0;
    let isSuccess = false;

    for (let i = 0; i < requestAmount; i++) {
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256"],
        [hunter, nonce]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const monsterSignature = await randomSigner.signMessage(messageBinary);

      monsterSignatures.push(monsterSignature);

      nonce += 1;
    }

    for (let i = 0; i < monsterSignatures.length; i++) {
      aroseCount++;

      const randomNumber = ethers.BigNumber.from(
        ethers.utils.solidityKeccak256(["bytes"], [monsterSignatures[i]])
      );
      const ariseModNumber = randomNumber.mod(100_00000).toNumber() + 1;

      if (ariseModNumber <= percentage) {
        isSuccess = true;
        break;
      }
    }

    return {
      monsterSignatures,
      aroseCount,
      usedStone: requiredStoneForArise * aroseCount,
      isSuccess,
    };
  };

  const monsterUpgradedEventChecker = (
    event: any,
    monsterUpgraded: MonsterUpgraded
  ) => {
    expect(event.hunter).to.equal(monsterUpgraded.hunter);
    expect(event.upgradedRank).to.equal(monsterUpgraded.upgradedRank);
    expect(event.upgradedAmount).to.equal(monsterUpgraded.upgradedAmount);
    expect(event.usedStone).to.equal(monsterUpgraded.usedStone);
    expect(event.timestamp).to.equal(monsterUpgraded.timestamp);

    for (let i = 0; i < event.usedMonster.monsterIds.length; i++) {
      expect(event.usedMonster.monsterIds[i]).to.equal(
        monsterUpgraded.usedMonster.monsterIds[i]
      );
      expect(event.usedMonster.monsterAmounts[i]).to.equal(
        monsterUpgraded.usedMonster.monsterAmounts[i]
      );
    }

    for (let i = 0; i < event.resultMonsterIds.length; i++) {
      expect(event.resultMonsterIds[i]).to.equal(
        monsterUpgraded.resultMonsterIds[i]
      );
    }
  };

  before(async () => {
    [
      operatorMaster,
      operatorManager,
      notOperator,
      creator,
      randomSigner,
      hunter1,
      hunter2,
    ] = await ethers.getSigners();
    console.log(
      "Deploying contracts with the account: " + operatorMaster.address
    );

    // deploy operator wallet
    const RoleWallet = await ethers.getContractFactory("SLRoleWallet");
    operator = await RoleWallet.deploy(
      [operatorMaster.address],
      [operatorManager.address]
    );
    await operator.deployed();
    console.log(`Operator deployed to: ${operator.address}`);

    // deploy project
    const Project = await ethers.getContractFactory("SLProject");
    project = await upgrades.deployProxy(Project, [operator.address], {
      kind: "uups",
    });
    await project.deployed();
    console.log(`Project deployed to: ${project.address}`);

    // deploy monsterFactory
    const MonsterFactory = await ethers.getContractFactory("SLMonsterFactory");
    monsterFactory = await upgrades.deployProxy(
      MonsterFactory,
      [project.address],
      { kind: "uups" }
    );
    await monsterFactory.deployed();
    console.log(`MonsterFactory deployed to: ${monsterFactory.address}`);

    // deploy random
    const Random = await ethers.getContractFactory("SLRandom");
    random = await upgrades.deployProxy(
      Random,
      [project.address, randomSigner.address],
      {
        kind: "uups",
      }
    );
    await random.deployed();
    console.log(`Random deployed to: ${random.address}`);

    // deploy system
    const System = await ethers.getContractFactory("SLSystem");
    system = await upgrades.deployProxy(
      System,
      [project.address, monsterFactory.address, random.address, 1, 2, 3],
      {
        kind: "uups",
      }
    );
    await system.deployed();
    console.log(`System deployed to: ${system.address}`);

    // deploy test essenceStone - collectionId 1
    const EssenceStone = await ethers.getContractFactory("SLTestEssenceStone");
    essenceStone = await upgrades.deployProxy(
      EssenceStone,
      [
        project.address,
        ZERO_ADDRESS,
        [project.address, system.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await essenceStone.deployed();
    console.log(`EssenceStone deployed to: ${essenceStone.address}`);

    const setProjectApprovalModeTx = await essenceStone.setProjectApprovalMode(
      false
    );
    await setProjectApprovalModeTx.wait();

    const addCollectionTx1 = await project
      .connect(operatorManager)
      .addCollection(essenceStone.address, creator.address);
    await addCollectionTx1.wait();

    // deploy normalMonster - collectionId 2
    const TestMonster = await ethers.getContractFactory("SLTestMonster");
    normalMonster = await upgrades.deployProxy(
      TestMonster,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [system.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await normalMonster.deployed();
    console.log(`NormalMonster deployed to: ${normalMonster.address}`);

    const setProjectApprovalModeTx2 =
      await normalMonster.setProjectApprovalMode(false);
    await setProjectApprovalModeTx2.wait();

    const addCollectionTx2 = await project
      .connect(operatorManager)
      .addCollection(normalMonster.address, creator.address);
    await addCollectionTx2.wait();

    // deploy shadowMonster - collectionId 3
    shadowMonster = await upgrades.deployProxy(
      TestMonster,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [system.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await shadowMonster.deployed();
    console.log(`ShadowMonster deployed to: ${shadowMonster.address}`);

    const setProjectApprovalModeTx3 =
      await shadowMonster.setProjectApprovalMode(false);
    await setProjectApprovalModeTx3.wait();

    const addCollectionTx3 = await project
      .connect(operatorManager)
      .addCollection(shadowMonster.address, creator.address);
    await addCollectionTx3.wait();

    // add monster
    // E Rank : 1~100
    // D Rank : 101~200
    // C Rank : 201~300
    // B Rank : 301~400
    // A Rank : 401~500
    // S Rank : 501~600
    // Shadow-B : 1~100
    // Shadow-A : 101~200
    // Shadow-S : 201~300
    for (let i = 0; i <= 5; i++) {
      for (let j = 1; j <= 100; j++) {
        const addNormalMonsterTx = await monsterFactory.addMonster(i, false);
        await addNormalMonsterTx.wait();

        if (i >= 3) {
          const addShadowMonsterTx = await monsterFactory.addMonster(i, true);
          await addShadowMonsterTx.wait();
        }
      }
    }

    // B : 501-1
    // A : 1-101
    // S : 101-201
    const setAriseMonsterTx1 = await monsterFactory.setAriseMonster(
      RankType.B,
      501,
      1
    );
    await setAriseMonsterTx1.wait();

    const setAriseMonsterTx2 = await monsterFactory.setAriseMonster(
      RankType.A,
      1,
      101
    );
    await setAriseMonsterTx2.wait();

    const setAriseMonsterTx3 = await monsterFactory.setAriseMonster(
      RankType.S,
      101,
      201
    );
    await setAriseMonsterTx3.wait();
  });

  /////////////
  // Upgrade //
  /////////////

  describe("Upgrade", async () => {
    it("Get Required Monster For Upgrade", async () => {
      const required = await system.getRequiredMonsterForUpgrade();

      expect(required[RankType.E]).to.equal(requiredMonsterForUpgrade);
      expect(required[RankType.D]).to.equal(requiredMonsterForUpgrade);
      expect(required[RankType.C]).to.equal(requiredMonsterForUpgrade);
      expect(required[RankType.B]).to.equal(requiredMonsterForUpgrade);
      expect(required[RankType.A]).to.equal(requiredMonsterForUpgrade);
    });

    it("Get Required Stone For Upgrade", async () => {
      const required = await system.getRequiredStoneForUpgrade();

      expect(required[RankType.E]).to.equal(requiredStoneForUpgrade);
      expect(required[RankType.D]).to.equal(requiredStoneForUpgrade);
      expect(required[RankType.C]).to.equal(requiredStoneForUpgrade);
      expect(required[RankType.B]).to.equal(requiredStoneForUpgrade);
      expect(required[RankType.A]).to.equal(requiredStoneForUpgrade);
    });

    it("Get Required Stone For Arise", async () => {
      const required = await system.getRequiredStoneForArise();

      expect(required[0]).to.equal(requiredStoneForArise);
      expect(required[1]).to.equal(requiredStoneForArise);
      expect(required[2]).to.equal(requiredStoneForArise);
    });

    it("Get Percentage For Arise", async () => {
      const percentage = await system.getPercentageForArise();

      expect(percentage[0]).to.equal(percentageForArise[0]);
      expect(percentage[1]).to.equal(percentageForArise[1]);
      expect(percentage[2]).to.equal(percentageForArise[2]);
    });

    it("Get EssenceStone When Returned", async () => {
      const essenceStones = await system.getEssenceStoneWhenReturned();
      const normalEssenceStones = essenceStones.normalEssenceStones;
      const shadowEssenceStones = essenceStones.shadowEssenceStones;

      expect(normalEssenceStones[RankType.E]).to.equal(5);
      expect(normalEssenceStones[RankType.D]).to.equal(15);
      expect(normalEssenceStones[RankType.C]).to.equal(40);
      expect(normalEssenceStones[RankType.B]).to.equal(90);
      expect(normalEssenceStones[RankType.A]).to.equal(190);
      expect(normalEssenceStones[RankType.S]).to.equal(380);

      expect(shadowEssenceStones[0]).to.equal(1180);
      expect(shadowEssenceStones[1]).to.equal(6500);
      expect(shadowEssenceStones[2]).to.equal(22500);
    });

    it("Upgrade Monster : Success : E Rank", async () => {
      monsterRank = RankType.E;
      nextMonsterRank = RankType.D;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [1],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        usedStone
      );
      await mintStoneTx.wait();

      // E Rank : 1~100
      // D Rank : 101~200
      // C Rank : 201~300
      // B Rank : 301~400
      // A Rank : 401~500
      // S Rank : 501~600
      // Shadow-B : 1~100
      // Shadow-A : 101~200
      // Shadow-S : 201~300
      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const approveStoneTx = await essenceStone
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveStoneTx.wait();

      const approveMonsterTx = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveMonsterTx.wait();

      const { resultMonsterIds, monsterSignatures } =
        await generateMonsterUpgraded(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const upgradeMonsterTx = await system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );
      const receipt = await upgradeMonsterTx.wait();

      const timestamp = await getBlockTimestamp(upgradeMonsterTx.blockNumber);

      MonsterUpgradedEvent = {
        hunter: hunter1.address,
        upgradedRank: nextMonsterRank,
        upgradedAmount: requestAmount,
        usedMonster,
        usedStone,
        resultMonsterIds,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "MonsterUpgraded");
      monsterUpgradedEventChecker(event, MonsterUpgradedEvent);

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(0);

      const monsterBalance = await normalMonster.balanceOf(
        hunter1.address,
        usedMonster.monsterIds[0]
      );
      expect(monsterBalance).to.equal(0);

      const upgradeCount = await system.getHunterUpgradeCount(
        hunter1.address,
        monsterRank
      );
      expect(upgradeCount).to.equal(requestAmount);

      const mintedMonster = resultTokenParser(resultMonsterIds);
      for (let i = 0; i < mintedMonster.length; i++) {
        await normalMonster
          .connect(hunter1)
          .burn(
            hunter1.address,
            mintedMonster[i].tokenId,
            mintedMonster[i].amount
          );
      }
    });

    it("Upgrade Monster : Success : D Rank", async () => {
      monsterRank = RankType.D;
      nextMonsterRank = RankType.C;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [101],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        usedStone
      );
      await mintStoneTx.wait();

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const { resultMonsterIds, monsterSignatures } =
        await generateMonsterUpgraded(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const upgradeMonsterTx = await system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );
      const receipt = await upgradeMonsterTx.wait();

      const timestamp = await getBlockTimestamp(upgradeMonsterTx.blockNumber);

      MonsterUpgradedEvent = {
        hunter: hunter1.address,
        upgradedRank: nextMonsterRank,
        upgradedAmount: requestAmount,
        usedMonster,
        usedStone,
        resultMonsterIds,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "MonsterUpgraded");
      monsterUpgradedEventChecker(event, MonsterUpgradedEvent);

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(0);

      const monsterBalance = await normalMonster.balanceOf(
        hunter1.address,
        usedMonster.monsterIds[0]
      );
      expect(monsterBalance).to.equal(0);

      const upgradeCount = await system.getHunterUpgradeCount(
        hunter1.address,
        monsterRank
      );
      expect(upgradeCount).to.equal(requestAmount);

      const mintedMonster = resultTokenParser(resultMonsterIds);
      for (let i = 0; i < mintedMonster.length; i++) {
        await normalMonster
          .connect(hunter1)
          .burn(
            hunter1.address,
            mintedMonster[i].tokenId,
            mintedMonster[i].amount
          );
      }
    });

    it("Upgrade Monster : Success : C Rank", async () => {
      monsterRank = RankType.C;
      nextMonsterRank = RankType.B;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [201],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        usedStone
      );
      await mintStoneTx.wait();

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const { resultMonsterIds, monsterSignatures } =
        await generateMonsterUpgraded(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const upgradeMonsterTx = await system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );
      const receipt = await upgradeMonsterTx.wait();

      const timestamp = await getBlockTimestamp(upgradeMonsterTx.blockNumber);

      MonsterUpgradedEvent = {
        hunter: hunter1.address,
        upgradedRank: nextMonsterRank,
        upgradedAmount: requestAmount,
        usedMonster,
        usedStone,
        resultMonsterIds,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "MonsterUpgraded");
      monsterUpgradedEventChecker(event, MonsterUpgradedEvent);

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(0);

      const monsterBalance = await normalMonster.balanceOf(
        hunter1.address,
        usedMonster.monsterIds[0]
      );
      expect(monsterBalance).to.equal(0);

      const upgradeCount = await system.getHunterUpgradeCount(
        hunter1.address,
        monsterRank
      );
      expect(upgradeCount).to.equal(requestAmount);

      const mintedMonster = resultTokenParser(resultMonsterIds);
      for (let i = 0; i < mintedMonster.length; i++) {
        await normalMonster
          .connect(hunter1)
          .burn(
            hunter1.address,
            mintedMonster[i].tokenId,
            mintedMonster[i].amount
          );
      }
    });

    it("Upgrade Monster : Success : B Rank", async () => {
      monsterRank = RankType.B;
      nextMonsterRank = RankType.A;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [301],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        usedStone
      );
      await mintStoneTx.wait();

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const { resultMonsterIds, monsterSignatures } =
        await generateMonsterUpgraded(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const upgradeMonsterTx = await system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );
      const receipt = await upgradeMonsterTx.wait();

      const timestamp = await getBlockTimestamp(upgradeMonsterTx.blockNumber);

      MonsterUpgradedEvent = {
        hunter: hunter1.address,
        upgradedRank: nextMonsterRank,
        upgradedAmount: requestAmount,
        usedMonster,
        usedStone,
        resultMonsterIds,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "MonsterUpgraded");
      monsterUpgradedEventChecker(event, MonsterUpgradedEvent);

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(0);

      const monsterBalance = await normalMonster.balanceOf(
        hunter1.address,
        usedMonster.monsterIds[0]
      );
      expect(monsterBalance).to.equal(0);

      const upgradeCount = await system.getHunterUpgradeCount(
        hunter1.address,
        monsterRank
      );
      expect(upgradeCount).to.equal(requestAmount);

      const mintedMonster = resultTokenParser(resultMonsterIds);
      for (let i = 0; i < mintedMonster.length; i++) {
        await normalMonster
          .connect(hunter1)
          .burn(
            hunter1.address,
            mintedMonster[i].tokenId,
            mintedMonster[i].amount
          );
      }
    });

    it("Upgrade Monster : Success : A Rank", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        usedStone
      );
      await mintStoneTx.wait();

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const { resultMonsterIds, monsterSignatures } =
        await generateMonsterUpgraded(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const upgradeMonsterTx = await system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );
      const receipt = await upgradeMonsterTx.wait();

      const timestamp = await getBlockTimestamp(upgradeMonsterTx.blockNumber);

      MonsterUpgradedEvent = {
        hunter: hunter1.address,
        upgradedRank: nextMonsterRank,
        upgradedAmount: requestAmount,
        usedMonster,
        usedStone,
        resultMonsterIds,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "MonsterUpgraded");
      monsterUpgradedEventChecker(event, MonsterUpgradedEvent);

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(0);

      const monsterBalance = await normalMonster.balanceOf(
        hunter1.address,
        usedMonster.monsterIds[0]
      );
      expect(monsterBalance).to.equal(0);

      const upgradeCount = await system.getHunterUpgradeCount(
        hunter1.address,
        monsterRank
      );
      expect(upgradeCount).to.equal(requestAmount);

      const mintedMonster = resultTokenParser(resultMonsterIds);
      for (let i = 0; i < mintedMonster.length; i++) {
        await normalMonster
          .connect(hunter1)
          .burn(
            hunter1.address,
            mintedMonster[i].tokenId,
            mintedMonster[i].amount
          );
      }
    });

    it("Upgrade Monster : Success : A Rank * 180", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 180;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        usedStone
      );
      await mintStoneTx.wait();

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const { resultMonsterIds, monsterSignatures } =
        await generateMonsterUpgraded(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const upgradeMonsterTx = await system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );
      const receipt = await upgradeMonsterTx.wait();

      const timestamp = await getBlockTimestamp(upgradeMonsterTx.blockNumber);

      MonsterUpgradedEvent = {
        hunter: hunter1.address,
        upgradedRank: nextMonsterRank,
        upgradedAmount: requestAmount,
        usedMonster,
        usedStone,
        resultMonsterIds,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "MonsterUpgraded");
      monsterUpgradedEventChecker(event, MonsterUpgradedEvent);

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(0);

      const monsterBalance = await normalMonster.balanceOf(
        hunter1.address,
        usedMonster.monsterIds[0]
      );
      expect(monsterBalance).to.equal(0);

      const mintedMonster = resultTokenParser(resultMonsterIds);
      for (let i = 0; i < mintedMonster.length; i++) {
        await normalMonster
          .connect(hunter1)
          .burn(
            hunter1.address,
            mintedMonster[i].tokenId,
            mintedMonster[i].amount
          );
      }
    });

    it("Upgrade Monster : Failed : Invalid Argument : Request Amount 0", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 0;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidArgument"
      );
    });

    it("Upgrade Monster : Failed : Invalid Argument : Invalid Length", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401, 402],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidArgument"
      );
    });

    it("Upgrade Monster : Failed : Invalid Monster Signature", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(monsterRank, requestAmount, usedMonster, [
          monsterSignatures[0],
        ]);

      await expect(upgradeMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidMonsterSignature"
      );
    });

    it("Upgrade Monster : Failed : Invalid Rank Type", async () => {
      monsterRank = RankType.S;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidRankType"
      );
    });

    it("Upgrade Monster : Failed : Invalid Monster : Amount", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade + 1],
      };

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Upgrade Monster : Failed : Invalid Monster : Rank", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [301],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Upgrade Monster : Failed : Not Approve : Monster", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const approveTx = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, false);
      await approveTx.wait();

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveTx2.wait();
    });

    it("Upgrade Monster : Failed : Not Enough Token Balance : Monster", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );
    });

    it("Upgrade Monster : Failed : Not Approve : Essence Stone", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const approveTx = await essenceStone
        .connect(hunter1)
        .setApprovalForAll(system.address, false);
      await approveTx.wait();

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await essenceStone
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveTx2.wait();

      const burnTx = await normalMonster
        .connect(hunter1)
        .burn(
          hunter1.address,
          usedMonster.monsterIds[0],
          usedMonster.monsterAmounts[0]
        );
      await burnTx.wait();
    });

    it("Upgrade Monster : Failed : Not Enough Token Balance : Essence Stone", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );

      const burnTx = await normalMonster
        .connect(hunter1)
        .burn(
          hunter1.address,
          usedMonster.monsterIds[0],
          usedMonster.monsterAmounts[0]
        );
      await burnTx.wait();
    });

    it("Upgrade Monster : Failed : Random Signature Verify Failed", async () => {
      monsterRank = RankType.A;
      nextMonsterRank = RankType.S;
      requestAmount = 10;
      usedStone = requestAmount * requiredStoneForUpgrade;
      usedMonster = {
        monsterIds: [401],
        monsterAmounts: [requestAmount * requiredMonsterForUpgrade],
      };

      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        usedMonster.monsterIds[0],
        usedMonster.monsterAmounts[0]
      );
      await mintMonsterTx.wait();

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        usedStone
      );
      await mintStoneTx.wait();

      const { monsterSignatures } = await generateMonsterUpgraded(
        hunter2.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const upgradeMonsterTx = system
        .connect(hunter1)
        .upgradeMonster(
          monsterRank,
          requestAmount,
          usedMonster,
          monsterSignatures
        );

      await expect(upgradeMonsterTx).to.revertedWithCustomError(
        random,
        "RandomSignatureVerifyFailed"
      );

      const burnTx = await normalMonster
        .connect(hunter1)
        .burn(
          hunter1.address,
          usedMonster.monsterIds[0],
          usedMonster.monsterAmounts[0]
        );
      await burnTx.wait();

      const burnTx2 = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, usedStone);
      await burnTx2.wait();
    });

    it("Set Required Monster For Upgrade : Success", async () => {
      const requiredMonster = [1, 2, 3, 4, 5];

      const setRequiredMonsterForUpgradeTx =
        await system.setRequiredMonsterForUpgrade(requiredMonster);
      await setRequiredMonsterForUpgradeTx.wait();

      const newMonsters = await system.getRequiredMonsterForUpgrade();

      expect(newMonsters[RankType.E]).to.equal(1);
      expect(newMonsters[RankType.D]).to.equal(2);
      expect(newMonsters[RankType.C]).to.equal(3);
      expect(newMonsters[RankType.B]).to.equal(4);
      expect(newMonsters[RankType.A]).to.equal(5);
    });

    it("Set Required Monster For Upgrade : Failed : Only Operator", async () => {
      const requiredMonster = [1, 2, 3, 4, 5];

      const setRequiredMonsterForUpgradeTx = system
        .connect(notOperator)
        .setRequiredMonsterForUpgrade(requiredMonster);

      await expect(setRequiredMonsterForUpgradeTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });

    it("Set Required Monster For Upgrade : Failed : Invalid Argument", async () => {
      const requiredMonster = [0, 2, 3, 4, 5];

      const setRequiredMonsterForUpgradeTx =
        system.setRequiredMonsterForUpgrade(requiredMonster);

      await expect(setRequiredMonsterForUpgradeTx).to.revertedWithCustomError(
        system,
        "InvalidArgument"
      );
    });

    it("Set Required Stone For Upgrade : Success", async () => {
      const requiredStone = [1, 2, 3, 4, 5];

      const setRequiredStoneForUpgradeTx =
        await system.setRequiredStoneForUpgrade(requiredStone);
      await setRequiredStoneForUpgradeTx.wait();

      const newStones = await system.getRequiredStoneForUpgrade();

      expect(newStones[RankType.E]).to.equal(1);
      expect(newStones[RankType.D]).to.equal(2);
      expect(newStones[RankType.C]).to.equal(3);
      expect(newStones[RankType.B]).to.equal(4);
      expect(newStones[RankType.A]).to.equal(5);
    });

    it("Set Required Stone For Upgrade : Failed : Only Operator", async () => {
      const requiredStone = [1, 2, 3, 4, 5];

      const setRequiredStoneForUpgradeTx = system
        .connect(notOperator)
        .setRequiredStoneForUpgrade(requiredStone);

      await expect(setRequiredStoneForUpgradeTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });
  });

  ///////////
  // Arise //
  ///////////

  describe("Arise", async () => {
    it("Arise Monster : Success : B Rank", async () => {
      nextMonsterRank = RankType.B;
      monsterId = 501;
      nextMonsterId = await monsterFactory.getAriseNextMonster(
        nextMonsterRank,
        monsterId
      );
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintStoneTx.wait();

      // B : 501-1
      // A : 1-101
      // S : 101-201
      const mintMonsterTx = await normalMonster.mintOfTest(
        hunter1.address,
        monsterId,
        1
      );
      await mintMonsterTx.wait();

      const approveMonsterTx = await shadowMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveMonsterTx.wait();

      const { monsterSignatures, aroseCount, usedStone, isSuccess } =
        await generateMonsterArose(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const ariseMonsterTx = await system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );
      const timestamp = await getBlockTimestamp(ariseMonsterTx.blockNumber);

      MonsterAroseEvent = {
        hunter: hunter1.address,
        nextMonsterRank,
        monsterId,
        requestAmount,
        aroseCount,
        usedStone,
        isSuccess,
        nextMonsterId,
        timestamp,
      };

      await expect(ariseMonsterTx)
        .to.emit(system, "MonsterArose")
        .withArgs(
          MonsterAroseEvent.hunter,
          MonsterAroseEvent.nextMonsterRank,
          MonsterAroseEvent.monsterId,
          MonsterAroseEvent.requestAmount,
          MonsterAroseEvent.aroseCount,
          MonsterAroseEvent.usedStone,
          MonsterAroseEvent.isSuccess,
          MonsterAroseEvent.nextMonsterId,
          MonsterAroseEvent.timestamp
        );

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(requiredStone - usedStone);

      const beforeMonsterBalance = await normalMonster.balanceOf(
        hunter1.address,
        monsterId
      );
      expect(beforeMonsterBalance).to.equal(isSuccess ? 0 : 1);

      const afterMonsterBalance = await shadowMonster.balanceOf(
        hunter1.address,
        nextMonsterId
      );
      expect(afterMonsterBalance).to.equal(isSuccess ? 1 : 0);

      const ariseCount = await system.getHunterAriseCount(
        hunter1.address,
        nextMonsterRank
      );
      expect(ariseCount).to.equal(aroseCount);

      if (requiredStone - usedStone > 0) {
        await essenceStone
          .connect(hunter1)
          .burn(
            hunter1.address,
            essenceStoneTokenId,
            requiredStone - usedStone
          );
      }

      if (isSuccess) {
        await shadowMonster
          .connect(hunter1)
          .burn(hunter1.address, nextMonsterId, 1);
      } else {
        await normalMonster
          .connect(hunter1)
          .burn(hunter1.address, monsterId, 1);
      }
    });

    it("Arise Monster : Success : A Rank", async () => {
      nextMonsterRank = RankType.A;
      monsterId = 1;
      nextMonsterId = await monsterFactory.getAriseNextMonster(
        nextMonsterRank,
        monsterId
      );
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintStoneTx.wait();

      // B : 501-1
      // A : 1-101
      // S : 101-201
      const mintMonsterTx = await shadowMonster.mintOfTest(
        hunter1.address,
        monsterId,
        1
      );
      await mintMonsterTx.wait();

      const { monsterSignatures, aroseCount, usedStone, isSuccess } =
        await generateMonsterArose(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const ariseMonsterTx = await system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );
      const timestamp = await getBlockTimestamp(ariseMonsterTx.blockNumber);

      MonsterAroseEvent = {
        hunter: hunter1.address,
        nextMonsterRank,
        monsterId,
        requestAmount,
        aroseCount,
        usedStone,
        isSuccess,
        nextMonsterId,
        timestamp,
      };

      await expect(ariseMonsterTx)
        .to.emit(system, "MonsterArose")
        .withArgs(
          MonsterAroseEvent.hunter,
          MonsterAroseEvent.nextMonsterRank,
          MonsterAroseEvent.monsterId,
          MonsterAroseEvent.requestAmount,
          MonsterAroseEvent.aroseCount,
          MonsterAroseEvent.usedStone,
          MonsterAroseEvent.isSuccess,
          MonsterAroseEvent.nextMonsterId,
          MonsterAroseEvent.timestamp
        );

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(requiredStone - usedStone);

      const beforeMonsterBalance = await shadowMonster.balanceOf(
        hunter1.address,
        monsterId
      );
      expect(beforeMonsterBalance).to.equal(isSuccess ? 0 : 1);

      const afterMonsterBalance = await shadowMonster.balanceOf(
        hunter1.address,
        nextMonsterId
      );
      expect(afterMonsterBalance).to.equal(isSuccess ? 1 : 0);

      const ariseCount = await system.getHunterAriseCount(
        hunter1.address,
        nextMonsterRank
      );
      expect(ariseCount).to.equal(aroseCount);

      if (requiredStone - usedStone > 0) {
        await essenceStone
          .connect(hunter1)
          .burn(
            hunter1.address,
            essenceStoneTokenId,
            requiredStone - usedStone
          );
      }

      if (isSuccess) {
        await shadowMonster
          .connect(hunter1)
          .burn(hunter1.address, nextMonsterId, 1);
      } else {
        await shadowMonster
          .connect(hunter1)
          .burn(hunter1.address, monsterId, 1);
      }
    });

    it("Arise Monster : Success : S Rank", async () => {
      nextMonsterRank = RankType.S;
      monsterId = 101;
      nextMonsterId = await monsterFactory.getAriseNextMonster(
        nextMonsterRank,
        monsterId
      );
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintStoneTx.wait();

      // B : 501-1
      // A : 1-101
      // S : 101-201
      const mintMonsterTx = await shadowMonster.mintOfTest(
        hunter1.address,
        monsterId,
        1
      );
      await mintMonsterTx.wait();

      const { monsterSignatures, aroseCount, usedStone, isSuccess } =
        await generateMonsterArose(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const ariseMonsterTx = await system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );
      const timestamp = await getBlockTimestamp(ariseMonsterTx.blockNumber);

      MonsterAroseEvent = {
        hunter: hunter1.address,
        nextMonsterRank,
        monsterId,
        requestAmount,
        aroseCount,
        usedStone,
        isSuccess,
        nextMonsterId,
        timestamp,
      };

      await expect(ariseMonsterTx)
        .to.emit(system, "MonsterArose")
        .withArgs(
          MonsterAroseEvent.hunter,
          MonsterAroseEvent.nextMonsterRank,
          MonsterAroseEvent.monsterId,
          MonsterAroseEvent.requestAmount,
          MonsterAroseEvent.aroseCount,
          MonsterAroseEvent.usedStone,
          MonsterAroseEvent.isSuccess,
          MonsterAroseEvent.nextMonsterId,
          MonsterAroseEvent.timestamp
        );

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(requiredStone - usedStone);

      const beforeMonsterBalance = await shadowMonster.balanceOf(
        hunter1.address,
        monsterId
      );
      expect(beforeMonsterBalance).to.equal(isSuccess ? 0 : 1);

      const afterMonsterBalance = await shadowMonster.balanceOf(
        hunter1.address,
        nextMonsterId
      );
      expect(afterMonsterBalance).to.equal(isSuccess ? 1 : 0);

      const ariseCount = await system.getHunterAriseCount(
        hunter1.address,
        nextMonsterRank
      );
      expect(ariseCount).to.equal(aroseCount);

      if (requiredStone - usedStone > 0) {
        await essenceStone
          .connect(hunter1)
          .burn(
            hunter1.address,
            essenceStoneTokenId,
            requiredStone - usedStone
          );
      }

      if (isSuccess) {
        await shadowMonster
          .connect(hunter1)
          .burn(hunter1.address, nextMonsterId, 1);
      } else {
        await shadowMonster
          .connect(hunter1)
          .burn(hunter1.address, monsterId, 1);
      }
    });

    it("Arise Monster : Success : S Rank * 180", async () => {
      nextMonsterRank = RankType.S;
      monsterId = 101;
      nextMonsterId = await monsterFactory.getAriseNextMonster(
        nextMonsterRank,
        monsterId
      );
      requestAmount = 180;
      requiredStone = requestAmount * requiredStoneForArise;

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintStoneTx.wait();

      // B : 501-1
      // A : 1-101
      // S : 101-201
      const mintMonsterTx = await shadowMonster.mintOfTest(
        hunter1.address,
        monsterId,
        1
      );
      await mintMonsterTx.wait();

      const { monsterSignatures, aroseCount, usedStone, isSuccess } =
        await generateMonsterArose(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          nextMonsterRank,
          requestAmount
        );

      const ariseMonsterTx = await system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );
      const timestamp = await getBlockTimestamp(ariseMonsterTx.blockNumber);

      MonsterAroseEvent = {
        hunter: hunter1.address,
        nextMonsterRank,
        monsterId,
        requestAmount,
        aroseCount,
        usedStone,
        isSuccess,
        nextMonsterId,
        timestamp,
      };

      await expect(ariseMonsterTx)
        .to.emit(system, "MonsterArose")
        .withArgs(
          MonsterAroseEvent.hunter,
          MonsterAroseEvent.nextMonsterRank,
          MonsterAroseEvent.monsterId,
          MonsterAroseEvent.requestAmount,
          MonsterAroseEvent.aroseCount,
          MonsterAroseEvent.usedStone,
          MonsterAroseEvent.isSuccess,
          MonsterAroseEvent.nextMonsterId,
          MonsterAroseEvent.timestamp
        );

      const stoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(stoneBalance).to.equal(requiredStone - usedStone);

      const beforeMonsterBalance = await shadowMonster.balanceOf(
        hunter1.address,
        monsterId
      );
      expect(beforeMonsterBalance).to.equal(isSuccess ? 0 : 1);

      const afterMonsterBalance = await shadowMonster.balanceOf(
        hunter1.address,
        nextMonsterId
      );
      expect(afterMonsterBalance).to.equal(isSuccess ? 1 : 0);

      if (requiredStone - usedStone > 0) {
        await essenceStone
          .connect(hunter1)
          .burn(
            hunter1.address,
            essenceStoneTokenId,
            requiredStone - usedStone
          );
      }

      if (isSuccess) {
        await shadowMonster
          .connect(hunter1)
          .burn(hunter1.address, nextMonsterId, 1);
      } else {
        await shadowMonster
          .connect(hunter1)
          .burn(hunter1.address, monsterId, 1);
      }
    });

    it("Arise Monster : Failed : Invalid Argument : Request Amount 0", async () => {
      nextMonsterRank = RankType.S;
      monsterId = 101;
      requestAmount = 0;
      requiredStone = requestAmount * requiredStoneForArise;

      const { monsterSignatures } = await generateMonsterArose(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const ariseMonsterTx = system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );

      await expect(ariseMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidArgument"
      );
    });

    it("Arise Monster : Failed : Invalid Rank Type", async () => {
      nextMonsterRank = RankType.E;
      monsterId = 101;
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const ariseMonsterTx = system
        .connect(hunter1)
        .ariseMonster(nextMonsterRank, monsterId, requestAmount, []);

      await expect(ariseMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidRankType"
      );
    });

    it("Arise Monster : Failed : Invalid Monster Signature", async () => {
      nextMonsterRank = RankType.S;
      monsterId = 101;
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const { monsterSignatures } = await generateMonsterArose(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const ariseMonsterTx = system
        .connect(hunter1)
        .ariseMonster(nextMonsterRank, monsterId, requestAmount, [
          monsterSignatures[0],
        ]);

      await expect(ariseMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidMonsterSignature"
      );
    });

    it("Arise Monster : Failed : Invalid Monster", async () => {
      nextMonsterRank = RankType.B;
      monsterId = 101;
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const { monsterSignatures } = await generateMonsterArose(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const ariseMonsterTx = system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );

      await expect(ariseMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Arise Monster : Failed : Does Not Enough Stone Balance", async () => {
      nextMonsterRank = RankType.S;
      monsterId = 101;
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const { monsterSignatures } = await generateMonsterArose(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const ariseMonsterTx = system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );

      await expect(ariseMonsterTx).to.revertedWithCustomError(
        system,
        "DoesNotEnoughStoneBalance"
      );
    });

    it("Arise Monster : Failed : Does Not Exist Arise Monster", async () => {
      nextMonsterRank = RankType.S;
      monsterId = 102;
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintStoneTx.wait();

      const { monsterSignatures } = await generateMonsterArose(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const ariseMonsterTx = system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );

      await expect(ariseMonsterTx).to.revertedWithCustomError(
        monsterFactory,
        "DoesNotExistAriseMonster"
      );

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, requiredStone);
      await burnTx.wait();
    });

    it("Arise Monster : Failed : Random Signature Verify Failed", async () => {
      nextMonsterRank = RankType.S;
      monsterId = 101;
      requestAmount = 10;
      requiredStone = requestAmount * requiredStoneForArise;

      const mintStoneTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintStoneTx.wait();

      const { monsterSignatures } = await generateMonsterArose(
        hunter2.address,
        Number(await random.getNonce(hunter1.address)),
        nextMonsterRank,
        requestAmount
      );

      const ariseMonsterTx = system
        .connect(hunter1)
        .ariseMonster(
          nextMonsterRank,
          monsterId,
          requestAmount,
          monsterSignatures
        );

      await expect(ariseMonsterTx).to.revertedWithCustomError(
        random,
        "RandomSignatureVerifyFailed"
      );

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, requiredStone);
      await burnTx.wait();
    });

    it("Set Required Stone For Arise : Success", async () => {
      const requiredStone = [1, 2, 3];

      const setRequiredStoneForAriseTx = await system.setRequiredStoneForArise(
        requiredStone
      );
      await setRequiredStoneForAriseTx.wait();

      const newStones = await system.getRequiredStoneForArise();

      expect(newStones[0]).to.equal(1);
      expect(newStones[1]).to.equal(2);
      expect(newStones[2]).to.equal(3);
    });

    it("Set Required Stone For Arise : Failed : Only Operator", async () => {
      const requiredStone = [1, 2, 3];

      const setRequiredStoneForAriseTx = system
        .connect(notOperator)
        .setRequiredStoneForArise(requiredStone);

      await expect(setRequiredStoneForAriseTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });

    it("Set Percentage For Arise : Success", async () => {
      const percentages = [10_00000, 20_00000, 30_00000];

      const setPercentageForAriseTx = await system.setPercentageForArise(
        percentages
      );
      await setPercentageForAriseTx.wait();

      const newPercentages = await system.getPercentageForArise();

      expect(newPercentages[0]).to.equal(10_00000);
      expect(newPercentages[1]).to.equal(20_00000);
      expect(newPercentages[2]).to.equal(30_00000);
    });

    it("Set Percentage For Arise : Failed : Only Operator", async () => {
      const percentages = [10_00000, 20_00000, 30_00000];

      const setPercentageForAriseTx = system
        .connect(notOperator)
        .setPercentageForArise(percentages);

      await expect(setPercentageForAriseTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });

    it("Set Percentage For Arise : Failed : Invalid Percentage", async () => {
      const percentages = [101_00000, 20_00000, 30_00000];

      const setPercentageForAriseTx = system.setPercentageForArise(percentages);

      await expect(setPercentageForAriseTx).to.revertedWithCustomError(
        system,
        "InvalidPercentage"
      );
    });
  });

  ////////////
  // Return //
  ////////////

  describe("Return", async () => {
    it("Return Monster : Success : E Rank", async () => {
      requestAmount = 10;
      monsterRank = RankType.E;
      isShadow = false;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[0][monsterRank];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );
        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : D Rank", async () => {
      requestAmount = 10;
      monsterRank = RankType.D;
      isShadow = false;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[0][monsterRank];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : C Rank", async () => {
      requestAmount = 10;
      monsterRank = RankType.C;
      isShadow = false;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[0][monsterRank];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : B Rank : Normal", async () => {
      requestAmount = 10;
      monsterRank = RankType.B;
      isShadow = false;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[0][monsterRank];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : A Rank : Normal", async () => {
      requestAmount = 10;
      monsterRank = RankType.A;
      isShadow = false;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[0][monsterRank];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : S Rank : Normal", async () => {
      requestAmount = 10;
      monsterRank = RankType.S;
      isShadow = false;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[0][monsterRank];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : S Rank : Normal * 1500", async () => {
      requestAmount = 1500;
      monsterRank = RankType.S;
      isShadow = false;
      monsterIds = [];
      monsterAmounts = [];

      for (let i = 0; i < 1500; i++) {
        const addNormalMonsterTx = await monsterFactory.addMonster(
          monsterRank,
          false
        );
        await addNormalMonsterTx.wait();
      }

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[0][monsterRank];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);
      const receipt = await returnMonsterTx.wait();

      console.log(`Return Monster 1500 Gase Used : ${receipt.gasUsed}`);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount + 10);
    });

    it("Return Monster : Success : B Rank : Shadow", async () => {
      requestAmount = 10;
      monsterRank = RankType.B;
      isShadow = true;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[1][0];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await shadowMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const approveTx = await shadowMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveTx.wait();

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await shadowMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : A Rank : Shadow", async () => {
      requestAmount = 10;
      monsterRank = RankType.A;
      isShadow = true;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[1][1];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await shadowMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await shadowMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Success : S Rank : Shadow", async () => {
      requestAmount = 10;
      monsterRank = RankType.S;
      isShadow = true;
      monsterIds = [];
      monsterAmounts = [];

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const stonePerReturn = essenceStoneWhenReturned[1][2];
      const returnedStone = requestAmount * stonePerReturn;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        monsterRank,
        isShadow
      );
      monsterIds = rankMonsterIds.slice(0, requestAmount);

      for (let i = 0; i < monsterIds.length; i++) {
        monsterAmounts.push(1);

        const mintTx = await shadowMonster.mintOfTest(
          hunter1.address,
          monsterIds[i],
          1
        );
        await mintTx.wait();
      }

      const returnMonsterTx = await system
        .connect(hunter1)
        .returnMonster(monsterRank, monsterIds, monsterAmounts, isShadow);

      const timestamp = await getBlockTimestamp(returnMonsterTx.blockNumber);

      MonsterReturnedEvent = {
        hunter: hunter1.address,
        monsterRank: monsterRank,
        isShadow,
        essenceStone: returnedStone,
        monsterIds,
        monsterAmounts,
        timestamp,
      };

      await expect(returnMonsterTx)
        .to.emit(system, "MonsterReturned")
        .withArgs(
          MonsterReturnedEvent.hunter,
          MonsterReturnedEvent.monsterRank,
          MonsterReturnedEvent.isShadow,
          MonsterReturnedEvent.essenceStone,
          MonsterReturnedEvent.monsterIds,
          MonsterReturnedEvent.monsterAmounts,
          MonsterReturnedEvent.timestamp
        );

      for (let i = 0; i < monsterIds.length; i++) {
        const monsterBalance = await shadowMonster.balanceOf(
          hunter1.address,
          monsterIds[i]
        );

        expect(monsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const returnCount = await system.getHunterReturnCount(
        hunter1.address,
        isShadow,
        monsterRank
      );
      expect(returnCount).to.equal(requestAmount);
    });

    it("Return Monster : Failed : Invalid Argument", async () => {
      monsterRank = RankType.E;

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [], [], false);

      await expect(returnMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidArgument"
      );
    });

    it("Return Monster : Failed : Invalid Monster", async () => {
      monsterRank = RankType.E;

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [1], [1, 2], false);

      await expect(returnMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Return Monster : Failed : Invalid RankType", async () => {
      monsterRank = RankType.E;

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [1], [1], true);

      await expect(returnMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidRankType"
      );
    });

    it("Return Monster : Failed : Invalid Monster : Invalid Monster Rank", async () => {
      monsterRank = RankType.E;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.D,
        false
      );

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [rankMonsterIds[0]], [1], false);

      await expect(returnMonsterTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Return Monster : Failed : Not Approve : Normal", async () => {
      monsterRank = RankType.E;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.E,
        false
      );

      const approveTx = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, false);
      await approveTx.wait();

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [rankMonsterIds[0]], [1], false);

      await expect(returnMonsterTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveTx2.wait();
    });

    it("Return Monster : Failed : Not Approve : Shadow", async () => {
      monsterRank = RankType.B;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.B,
        true
      );

      const approveTx = await shadowMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, false);
      await approveTx.wait();

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [rankMonsterIds[0]], [1], true);

      await expect(returnMonsterTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await shadowMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveTx2.wait();
    });

    it("Return Monster : Failed : Not Enough Token Balance : Normal", async () => {
      monsterRank = RankType.E;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.E,
        false
      );

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [rankMonsterIds[0]], [1], false);

      await expect(returnMonsterTx).to.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );
    });

    it("Return Monster : Failed : Not Enough Token Balance : Shadow", async () => {
      monsterRank = RankType.B;

      const rankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.B,
        true
      );

      const returnMonsterTx = system
        .connect(hunter1)
        .returnMonster(monsterRank, [rankMonsterIds[0]], [1], true);

      await expect(returnMonsterTx).to.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );
    });

    it("Return Monster Batch : Success * 200", async () => {
      requestAmount = 200;

      monsterSet = {
        normalMonsterIds: [],
        normalMonsterAmounts: [],
        shadowMonsterIds: [],
        shadowMonsterAmounts: [],
      };

      const normalRankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.E,
        false
      );
      monsterSet.normalMonsterIds = normalRankMonsterIds.slice(
        0,
        requestAmount / 2
      );

      const shadowRankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.B,
        true
      );
      monsterSet.shadowMonsterIds = shadowRankMonsterIds.slice(
        0,
        requestAmount / 2
      );

      let returnedStone = 0;
      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const normalStonePerReturn = essenceStoneWhenReturned[0][RankType.E];
      const shadowStonePerReturn = essenceStoneWhenReturned[1][0];

      returnedStone += normalStonePerReturn * (requestAmount / 2);
      returnedStone += shadowStonePerReturn * (requestAmount / 2);

      for (let i = 0; i < requestAmount / 2; i++) {
        monsterSet.normalMonsterAmounts.push(1);
        monsterSet.shadowMonsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterSet.normalMonsterIds[i],
          1
        );
        await mintTx.wait();

        const mintTx2 = await shadowMonster.mintOfTest(
          hunter1.address,
          monsterSet.shadowMonsterIds[i],
          1
        );
        await mintTx2.wait();
      }

      const returnMonsterBatchTx = await system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);
      const receipt = await returnMonsterBatchTx.wait();

      console.log(`Return Monster Batch 200 Gase Used : ${receipt.gasUsed}`);

      const timestamp = await getBlockTimestamp(
        returnMonsterBatchTx.blockNumber
      );

      const event = getEventArgs(receipt.events, "MonsterReturnedBatch");

      MonsterReturnedBatchEvent = {
        hunter: hunter1.address,
        essenceStone: returnedStone,
        returnedMonster: monsterSet,
        timestamp,
      };

      expect(event.hunter).to.equal(MonsterReturnedBatchEvent.hunter);
      expect(event.essenceStone).to.equal(
        MonsterReturnedBatchEvent.essenceStone
      );
      expect(event.timestamp).to.equal(MonsterReturnedBatchEvent.timestamp);

      for (let i = 0; i < requestAmount / 2; i++) {
        const normalMonsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterSet.normalMonsterIds[i]
        );
        expect(normalMonsterBalance).to.equal(0);

        const shadowMonsterBalance = await shadowMonster.balanceOf(
          hunter1.address,
          monsterSet.shadowMonsterIds[i]
        );
        expect(shadowMonsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();

      const normalReturnCount = await system.getHunterReturnCount(
        hunter1.address,
        false,
        RankType.E
      );
      expect(normalReturnCount).to.equal(110);

      const shadowReturnCount = await system.getHunterReturnCount(
        hunter1.address,
        true,
        RankType.B
      );
      expect(shadowReturnCount).to.equal(110);
    });

    it("Return Monster Batch : Success * 1400", async () => {
      requestAmount = 1400;

      monsterSet = {
        normalMonsterIds: [],
        normalMonsterAmounts: [],
        shadowMonsterIds: [],
        shadowMonsterAmounts: [],
      };

      for (let i = 0; i < requestAmount / 2; i++) {
        const addShadowMonsterTx = await monsterFactory.addMonster(
          RankType.S,
          true
        );
        await addShadowMonsterTx.wait();
      }

      const normalRankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.S,
        false
      );
      monsterSet.normalMonsterIds = normalRankMonsterIds.slice(
        0,
        requestAmount / 2
      );

      const shadowRankMonsterIds = await monsterFactory.getMonsterIdOfRankType(
        RankType.S,
        true
      );
      monsterSet.shadowMonsterIds = shadowRankMonsterIds.slice(
        0,
        requestAmount / 2
      );

      let returnedStone = 0;
      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();
      const normalStonePerReturn = essenceStoneWhenReturned[0][RankType.S];
      const shadowStonePerReturn = essenceStoneWhenReturned[1][2];

      returnedStone += normalStonePerReturn * (requestAmount / 2);
      returnedStone += shadowStonePerReturn * (requestAmount / 2);

      for (let i = 0; i < requestAmount / 2; i++) {
        monsterSet.normalMonsterAmounts.push(1);
        monsterSet.shadowMonsterAmounts.push(1);

        const mintTx = await normalMonster.mintOfTest(
          hunter1.address,
          monsterSet.normalMonsterIds[i],
          1
        );
        await mintTx.wait();

        const mintTx2 = await shadowMonster.mintOfTest(
          hunter1.address,
          monsterSet.shadowMonsterIds[i],
          1
        );
        await mintTx2.wait();
      }

      const returnMonsterBatchTx = await system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);
      const receipt = await returnMonsterBatchTx.wait();

      console.log(`Return Monster Batch 1400 Gase Used : ${receipt.gasUsed}`);

      const timestamp = await getBlockTimestamp(
        returnMonsterBatchTx.blockNumber
      );

      const event = getEventArgs(receipt.events, "MonsterReturnedBatch");

      MonsterReturnedBatchEvent = {
        hunter: hunter1.address,
        essenceStone: returnedStone,
        returnedMonster: monsterSet,
        timestamp,
      };

      expect(event.hunter).to.equal(MonsterReturnedBatchEvent.hunter);
      expect(event.essenceStone).to.equal(
        MonsterReturnedBatchEvent.essenceStone
      );
      expect(event.timestamp).to.equal(MonsterReturnedBatchEvent.timestamp);

      for (let i = 0; i < requestAmount / 2; i++) {
        const normalMonsterBalance = await normalMonster.balanceOf(
          hunter1.address,
          monsterSet.normalMonsterIds[i]
        );
        expect(normalMonsterBalance).to.equal(0);

        const shadowMonsterBalance = await shadowMonster.balanceOf(
          hunter1.address,
          monsterSet.shadowMonsterIds[i]
        );
        expect(shadowMonsterBalance).to.equal(0);
      }

      const essenceStoneBalance = await essenceStone.balanceOf(
        hunter1.address,
        essenceStoneTokenId
      );
      expect(essenceStoneBalance).to.equal(returnedStone);

      const burnTx = await essenceStone
        .connect(hunter1)
        .burn(hunter1.address, essenceStoneTokenId, returnedStone);
      await burnTx.wait();
    });

    it("Return Monster Batch : Failed : Invalid Monster : Length 0", async () => {
      monsterSet = {
        normalMonsterIds: [],
        normalMonsterAmounts: [],
        shadowMonsterIds: [],
        shadowMonsterAmounts: [],
      };

      const returnMonsterBatchTx = system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);

      await expect(returnMonsterBatchTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Return Monster Batch : Failed : Invalid Monster : Invalid Length : Normal", async () => {
      monsterSet = {
        normalMonsterIds: [1],
        normalMonsterAmounts: [1, 2],
        shadowMonsterIds: [],
        shadowMonsterAmounts: [],
      };

      const returnMonsterBatchTx = system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);

      await expect(returnMonsterBatchTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Return Monster Batch : Failed : Invalid Monster : Invalid Length : Shadow", async () => {
      monsterSet = {
        normalMonsterIds: [],
        normalMonsterAmounts: [],
        shadowMonsterIds: [1, 2],
        shadowMonsterAmounts: [1],
      };

      const returnMonsterBatchTx = system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);

      await expect(returnMonsterBatchTx).to.revertedWithCustomError(
        system,
        "InvalidMonster"
      );
    });

    it("Return Monster Batch : Failed : Not Approve : Normal", async () => {
      monsterSet = {
        normalMonsterIds: [1],
        normalMonsterAmounts: [1],
        shadowMonsterIds: [],
        shadowMonsterAmounts: [],
      };

      const approveTx = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, false);
      await approveTx.wait();

      const returnMonsterBatchTx = system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);

      await expect(returnMonsterBatchTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveTx2.wait();
    });

    it("Return Monster Batch : Failed : Not Approve : Shadow", async () => {
      monsterSet = {
        normalMonsterIds: [],
        normalMonsterAmounts: [],
        shadowMonsterIds: [1],
        shadowMonsterAmounts: [1],
      };

      const approveTx = await shadowMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, false);
      await approveTx.wait();

      const returnMonsterBatchTx = system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);

      await expect(returnMonsterBatchTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await shadowMonster
        .connect(hunter1)
        .setApprovalForAll(system.address, true);
      await approveTx2.wait();
    });

    it("Return Monster Batch : Failed : Not Enough Token Balance : Normal", async () => {
      monsterSet = {
        normalMonsterIds: [1],
        normalMonsterAmounts: [1],
        shadowMonsterIds: [],
        shadowMonsterAmounts: [],
      };

      const returnMonsterBatchTx = system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);

      await expect(returnMonsterBatchTx).to.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );
    });

    it("Return Monster Batch : Failed : Not Enough Token Balance : Shadow", async () => {
      monsterSet = {
        normalMonsterIds: [],
        normalMonsterAmounts: [],
        shadowMonsterIds: [1],
        shadowMonsterAmounts: [1],
      };

      const returnMonsterBatchTx = system
        .connect(hunter1)
        .returnMonsterBatch(monsterSet);

      await expect(returnMonsterBatchTx).to.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );
    });

    it("Set EssenceStone When Returned : Success", async () => {
      const normalEssenceStones = [10, 20, 30, 40, 50, 60];
      const shadowEssenceStones = [100, 200, 300];

      const setEssenceStoneWhenReturnedTx =
        await system.setEssenceStoneWhenReturned(
          normalEssenceStones,
          shadowEssenceStones
        );
      await setEssenceStoneWhenReturnedTx.wait();

      const essenceStoneWhenReturned =
        await system.getEssenceStoneWhenReturned();

      expect(essenceStoneWhenReturned[0][RankType.E]).to.equal(10);
      expect(essenceStoneWhenReturned[0][RankType.D]).to.equal(20);
      expect(essenceStoneWhenReturned[0][RankType.C]).to.equal(30);
      expect(essenceStoneWhenReturned[0][RankType.B]).to.equal(40);
      expect(essenceStoneWhenReturned[0][RankType.A]).to.equal(50);
      expect(essenceStoneWhenReturned[0][RankType.S]).to.equal(60);

      expect(essenceStoneWhenReturned[1][0]).to.equal(100);
      expect(essenceStoneWhenReturned[1][1]).to.equal(200);
      expect(essenceStoneWhenReturned[1][2]).to.equal(300);
    });

    it("Set EssenceStone When Returned : Failed : Only Operator", async () => {
      const normalEssenceStones = [10, 20, 30, 40, 50, 60];
      const shadowEssenceStones = [100, 200, 300];

      const setEssenceStoneWhenReturnedTx = system
        .connect(notOperator)
        .setEssenceStoneWhenReturned(normalEssenceStones, shadowEssenceStones);

      await expect(setEssenceStoneWhenReturnedTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });
  });

  //////////
  // Base //
  //////////

  describe("Base", async () => {
    it("Set Monster Collection Id : Success", async () => {
      isShadow = false;
      const setMonsterCollectionIdTx = await system.setMonsterCollectionId(
        2,
        isShadow
      );
      await setMonsterCollectionIdTx.wait();

      const monsterCollectionId = await system.getMonsterCollectionId(isShadow);
      expect(monsterCollectionId).to.equal(2);
    });

    it("Set Monster Collection Id : Failed : Only Operator", async () => {
      const setMonsterCollectionIdTx = system
        .connect(notOperator)
        .setMonsterCollectionId(2, isShadow);

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });

    it("Set Monster Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
      const setMonsterCollectionIdTx = system.setMonsterCollectionId(
        200,
        isShadow
      );

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        system,
        "InvalidCollectionId"
      );
    });

    it("Set Monster Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(2, false);
      await setCollectionActiveTx.wait();

      const setMonsterCollectionIdTx = system.setMonsterCollectionId(
        2,
        isShadow
      );

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        system,
        "InvalidCollectionId"
      );
    });

    it("Set Monster Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
      const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
      const shadowMonarch = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        { kind: "uups" }
      );
      await shadowMonarch.deployed();

      const addCollectionTx = await project.addCollection(
        shadowMonarch.address,
        creator.address
      );
      await addCollectionTx.wait(); // collectionId 4

      const setMonsterCollectionIdTx = system.setMonsterCollectionId(
        4,
        isShadow
      );

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        system,
        "InvalidCollectionId"
      );
    });

    it("Set EssenceStone Collection Id : Success", async () => {
      const setEssenceStoneCollectionIdTx =
        await system.setEssenceStoneCollectionId(3);
      await setEssenceStoneCollectionIdTx.wait();

      const essenceStoneCollectionId =
        await system.getEssenceStoneCollectionId();
      expect(essenceStoneCollectionId).to.equal(3);
    });

    it("Set EssenceStone Collection Id : Failed : Only Operator", async () => {
      const setEssenceStoneCollectionIdTx = system
        .connect(notOperator)
        .setEssenceStoneCollectionId(3);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });

    it("Set EssenceStone Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
      const setEssenceStoneCollectionIdTx =
        system.setEssenceStoneCollectionId(200);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        system,
        "InvalidCollectionId"
      );
    });

    it("Set EssenceStone Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(2, false);
      await setCollectionActiveTx.wait();

      const setEssenceStoneCollectionIdTx =
        system.setEssenceStoneCollectionId(2);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        system,
        "InvalidCollectionId"
      );
    });

    it("Set EssenceStone Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
      const setEssenceStoneCollectionIdTx =
        system.setEssenceStoneCollectionId(4);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        system,
        "InvalidCollectionId"
      );
    });

    it("Set MonsterFactory Contract : Success", async () => {
      const setMonsterFactoryContractTx =
        await system.setMonsterFactoryContract(project.address);
      await setMonsterFactoryContractTx.wait();

      const monsterFactoryContract = await system.getMonsterFactoryContract();
      expect(monsterFactoryContract).to.equal(project.address);
    });

    it("Set MonsterFactory Contract : Failed : Only Operator", async () => {
      const setMonsterFactoryContractTx = system
        .connect(notOperator)
        .setMonsterFactoryContract(project.address);

      await expect(setMonsterFactoryContractTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });

    it("Set Random Contract : Success", async () => {
      const setRandomContractTx = await system.setRandomContract(
        project.address
      );
      await setRandomContractTx.wait();

      const randomContract = await system.getRandomContract();
      expect(randomContract).to.equal(project.address);
    });

    it("Set Random Contract : Failed : Only Operator", async () => {
      const setRandomContractTx = system
        .connect(notOperator)
        .setRandomContract(project.address);

      await expect(setRandomContractTx).to.revertedWithCustomError(
        system,
        "OnlyOperator"
      );
    });
  });
});
