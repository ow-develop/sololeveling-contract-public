import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import { getBlockTimestamp } from "../helpers/block-timestamp";
import { RankType } from "../helpers/constant/contract";
import {
  AddMonster,
  Create,
  SetAriseMonster,
  SetAriseMonsterBatch,
  SetMonsterRankType,
} from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";

describe("MonsterFactory", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    creator: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    monsterFactory: Contract,
    normalMonster: Contract,
    shadowMonster: Contract;

  let CreateEvent: Create,
    AddMonsterEvent: AddMonster,
    SetMonsterRankTypeEvent: SetMonsterRankType,
    SetAriseMonsterEvent: SetAriseMonster,
    SetAriseMonsterBatchEvent: SetAriseMonsterBatch;

  let isShadow: boolean,
    nextMonsterRank: RankType,
    beforeMonsterId: number,
    nextMonsterId: number;

  before(async () => {
    [operatorMaster, operatorManager, notOperator, creator] =
      await ethers.getSigners();
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

    // deploy normalMonster
    const NormalMonster = await ethers.getContractFactory("SLMonster");
    normalMonster = await upgrades.deployProxy(
      NormalMonster,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await normalMonster.deployed();
    console.log(`NormalMonster deployed to: ${normalMonster.address}`);

    const addCollectionTx1 = await project
      .connect(operatorManager)
      .addCollection(normalMonster.address, creator.address);
    await addCollectionTx1.wait();

    // deploy shadowMonster
    const ShadowMonster = await ethers.getContractFactory("SLShadowArmy");
    shadowMonster = await upgrades.deployProxy(
      ShadowMonster,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await shadowMonster.deployed();
    console.log(`ShadowMonster deployed to: ${shadowMonster.address}`);

    const addCollectionTx2 = await project
      .connect(operatorManager)
      .addCollection(shadowMonster.address, creator.address);
    await addCollectionTx2.wait();
  });

  /////////////
  // Monster //
  /////////////

  describe("Monster", async () => {
    it("Get Monster Scores", async () => {
      isShadow = false;
      const normalMonsterScores = await monsterFactory.getMonsterScores(
        isShadow
      );

      isShadow = true;
      const shadowMonsterScores = await monsterFactory.getMonsterScores(
        isShadow
      );

      expect(normalMonsterScores[RankType.E]).to.equal(1);
      expect(normalMonsterScores[RankType.D]).to.equal(2);
      expect(normalMonsterScores[RankType.C]).to.equal(4);
      expect(normalMonsterScores[RankType.B]).to.equal(16);
      expect(normalMonsterScores[RankType.A]).to.equal(32);
      expect(normalMonsterScores[RankType.S]).to.equal(64);

      expect(shadowMonsterScores[0]).to.equal(160);
      expect(shadowMonsterScores[1]).to.equal(320);
      expect(shadowMonsterScores[2]).to.equal(640);
    });

    it("Add Monster : Success : Normal", async () => {
      isShadow = false;
      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.E, isShadow);
      const timestamp = await getBlockTimestamp(addMonsterTx.blockNumber);

      AddMonsterEvent = {
        monsterRank: RankType.E,
        isShadow: isShadow,
        monsterId: 1,
        timestamp: timestamp,
      };

      await expect(addMonsterTx)
        .to.emit(monsterFactory, "AddMonster")
        .withArgs(
          AddMonsterEvent.monsterRank,
          AddMonsterEvent.isShadow,
          AddMonsterEvent.monsterId,
          AddMonsterEvent.timestamp
        );

      const exists = await normalMonster.exists("1");
      const isValidMonster = await monsterFactory.isValidMonster(
        RankType.E,
        isShadow,
        "1"
      );

      expect(exists).to.equal(true);
      expect(isValidMonster).to.equal(true);
    });

    it("Add Monster : Success : Shadow", async () => {
      isShadow = true;
      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.B, isShadow);
      const timestamp = await getBlockTimestamp(addMonsterTx.blockNumber);

      AddMonsterEvent = {
        monsterRank: RankType.B,
        isShadow: isShadow,
        monsterId: 1,
        timestamp: timestamp,
      };

      await expect(addMonsterTx)
        .to.emit(monsterFactory, "AddMonster")
        .withArgs(
          AddMonsterEvent.monsterRank,
          AddMonsterEvent.isShadow,
          AddMonsterEvent.monsterId,
          AddMonsterEvent.timestamp
        );

      const exists = await shadowMonster.exists("1");
      const isValidMonster = await monsterFactory.isValidMonster(
        RankType.B,
        isShadow,
        "1"
      );

      expect(exists).to.equal(true);
      expect(isValidMonster).to.equal(true);
    });

    it("Add Monster : Failed : Only Operator", async () => {
      isShadow = false;
      const addMonsterTx = monsterFactory
        .connect(notOperator)
        .addMonster(RankType.E, isShadow);

      await expect(addMonsterTx).to.revertedWithCustomError(
        monsterFactory,
        "OnlyOperator"
      );
    });

    it("Add Monster : Failed : Invalid Rank Type", async () => {
      isShadow = true;
      const addMonsterTx = monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.E, isShadow);

      await expect(addMonsterTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidRankType"
      );
    });

    it("Set Monster Rank Type : Success : Normal", async () => {
      isShadow = false;
      const beforeMonsterOfRankType =
        await monsterFactory.getMonsterIdOfRankType(RankType.E, isShadow);

      const setMonsterRankTypeTx = await monsterFactory
        .connect(operatorManager)
        .setMonsterRankType(isShadow, "1", RankType.D);
      const timestamp = await getBlockTimestamp(
        setMonsterRankTypeTx.blockNumber
      );

      SetMonsterRankTypeEvent = {
        isShadow: isShadow,
        monsterId: 1,
        monsterRank: RankType.D,
        timestamp: timestamp,
      };

      await expect(setMonsterRankTypeTx)
        .to.emit(monsterFactory, "SetMonsterRankType")
        .withArgs(
          SetMonsterRankTypeEvent.isShadow,
          SetMonsterRankTypeEvent.monsterId,
          SetMonsterRankTypeEvent.monsterRank,
          SetMonsterRankTypeEvent.timestamp
        );

      const afterMonsterOfRankType =
        await monsterFactory.getMonsterIdOfRankType(RankType.E, isShadow);
      const monsterOfRankType = await monsterFactory.getMonsterIdOfRankType(
        RankType.D,
        isShadow
      );

      const monsterRank = await monsterFactory.getMonsterRankType(
        isShadow,
        "1"
      );
      expect(monsterRank).to.equal(RankType.D);
      expect(beforeMonsterOfRankType[0]).to.equal("1");
      expect(afterMonsterOfRankType.length).to.equal(0);
      expect(monsterOfRankType[0]).to.equal("1");
    });

    it("Set Monster Rank Type : Success : Shadow", async () => {
      isShadow = true;
      const setMonsterRankTypeTx = await monsterFactory
        .connect(operatorManager)
        .setMonsterRankType(isShadow, "1", RankType.A);
      const timestamp = await getBlockTimestamp(
        setMonsterRankTypeTx.blockNumber
      );

      SetMonsterRankTypeEvent = {
        isShadow: isShadow,
        monsterId: 1,
        monsterRank: RankType.A,
        timestamp: timestamp,
      };

      await expect(setMonsterRankTypeTx)
        .to.emit(monsterFactory, "SetMonsterRankType")
        .withArgs(
          SetMonsterRankTypeEvent.isShadow,
          SetMonsterRankTypeEvent.monsterId,
          SetMonsterRankTypeEvent.monsterRank,
          SetMonsterRankTypeEvent.timestamp
        );

      const monsterRank = await monsterFactory.getMonsterRankType(
        isShadow,
        "1"
      );
      expect(monsterRank).to.equal(RankType.A);
    });

    it("Set Monster Rank Type : Failed : Only Operator", async () => {
      isShadow = false;
      const setMonsterRankTypeTx = monsterFactory
        .connect(notOperator)
        .setMonsterRankType(isShadow, "1", RankType.E);

      await expect(setMonsterRankTypeTx).to.revertedWithCustomError(
        monsterFactory,
        "OnlyOperator"
      );
    });

    it("Set Monster Rank Type : Failed : Invalid Rank Type", async () => {
      isShadow = true;
      const setMonsterRankTypeTx = monsterFactory
        .connect(operatorManager)
        .setMonsterRankType(isShadow, "1", RankType.E);

      await expect(setMonsterRankTypeTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidRankType"
      );
    });

    it("Set Monster Rank Type : Failed : Invalid Monster Id", async () => {
      isShadow = false;
      const setMonsterRankTypeTx = monsterFactory
        .connect(operatorManager)
        .setMonsterRankType(isShadow, "100", RankType.E);

      await expect(setMonsterRankTypeTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidMonsterId"
      );
    });

    it("Set Arise Monster : Success : B", async () => {
      nextMonsterRank = RankType.B;

      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.S, false); // monsterId 2 S
      await addMonsterTx.wait();

      const addMonsterTx2 = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.B, true); // monsterId 2 B
      await addMonsterTx2.wait();

      beforeMonsterId = 2;
      nextMonsterId = 2;

      const setAriseMonsterTx = await monsterFactory.setAriseMonster(
        nextMonsterRank,
        beforeMonsterId,
        nextMonsterId
      );

      const timestamp = await getBlockTimestamp(setAriseMonsterTx.blockNumber);

      SetAriseMonsterEvent = {
        nextMonsterRank,
        beforeMonsterId,
        nextMonsterId,
        timestamp,
      };

      await expect(setAriseMonsterTx)
        .to.emit(monsterFactory, "SetAriseMonster")
        .withArgs(
          SetAriseMonsterEvent.nextMonsterRank,
          SetAriseMonsterEvent.beforeMonsterId,
          SetAriseMonsterEvent.nextMonsterId,
          SetAriseMonsterEvent.timestamp
        );

      const nextMonster = await monsterFactory.getAriseNextMonster(
        nextMonsterRank,
        beforeMonsterId
      );
      const beforeMonster = await monsterFactory.getAriseBeforeMonster(
        nextMonsterRank,
        nextMonsterId
      );

      expect(nextMonster).to.equal(nextMonsterId);
      expect(beforeMonster).to.equal(beforeMonsterId);
    });

    it("Set Arise Monster : Success : A", async () => {
      nextMonsterRank = RankType.A;

      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.A, true); // monsterId 3 A
      await addMonsterTx.wait();

      beforeMonsterId = 2;
      nextMonsterId = 3;

      const setAriseMonsterTx = await monsterFactory.setAriseMonster(
        nextMonsterRank,
        beforeMonsterId,
        nextMonsterId
      );

      const timestamp = await getBlockTimestamp(setAriseMonsterTx.blockNumber);

      SetAriseMonsterEvent = {
        nextMonsterRank,
        beforeMonsterId,
        nextMonsterId,
        timestamp,
      };

      await expect(setAriseMonsterTx)
        .to.emit(monsterFactory, "SetAriseMonster")
        .withArgs(
          SetAriseMonsterEvent.nextMonsterRank,
          SetAriseMonsterEvent.beforeMonsterId,
          SetAriseMonsterEvent.nextMonsterId,
          SetAriseMonsterEvent.timestamp
        );

      const nextMonster = await monsterFactory.getAriseNextMonster(
        nextMonsterRank,
        beforeMonsterId
      );
      const beforeMonster = await monsterFactory.getAriseBeforeMonster(
        nextMonsterRank,
        nextMonsterId
      );

      expect(nextMonster).to.equal(nextMonsterId);
      expect(beforeMonster).to.equal(beforeMonsterId);
    });

    it("Set Arise Monster : Success : S", async () => {
      nextMonsterRank = RankType.S;

      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.S, true); // monsterId 4 S
      await addMonsterTx.wait();

      beforeMonsterId = 3;
      nextMonsterId = 4;

      const setAriseMonsterTx = await monsterFactory.setAriseMonster(
        nextMonsterRank,
        beforeMonsterId,
        nextMonsterId
      );

      const timestamp = await getBlockTimestamp(setAriseMonsterTx.blockNumber);

      SetAriseMonsterEvent = {
        nextMonsterRank,
        beforeMonsterId,
        nextMonsterId,
        timestamp,
      };

      await expect(setAriseMonsterTx)
        .to.emit(monsterFactory, "SetAriseMonster")
        .withArgs(
          SetAriseMonsterEvent.nextMonsterRank,
          SetAriseMonsterEvent.beforeMonsterId,
          SetAriseMonsterEvent.nextMonsterId,
          SetAriseMonsterEvent.timestamp
        );

      const nextMonster = await monsterFactory.getAriseNextMonster(
        nextMonsterRank,
        beforeMonsterId
      );
      const beforeMonster = await monsterFactory.getAriseBeforeMonster(
        nextMonsterRank,
        nextMonsterId
      );

      expect(nextMonster).to.equal(nextMonsterId);
      expect(beforeMonster).to.equal(beforeMonsterId);
    });

    it("Set Arise Monster : Failed : Only Operator", async () => {
      const setAriseMonsterTx = monsterFactory
        .connect(notOperator)
        .setAriseMonster(nextMonsterRank, beforeMonsterId, nextMonsterId);

      await expect(setAriseMonsterTx).to.revertedWithCustomError(
        monsterFactory,
        "OnlyOperator"
      );
    });

    it("Set Arise Monster : Failed : Invalid Rank Type", async () => {
      const setAriseMonsterTx = monsterFactory
        .connect(operatorManager)
        .setAriseMonster(RankType.E, beforeMonsterId, nextMonsterId);

      await expect(setAriseMonsterTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidRankType"
      );
    });

    it("Set Arise Monster : Failed : Invalid Monster Id : B", async () => {
      const setAriseMonsterTx = monsterFactory
        .connect(operatorManager)
        .setAriseMonster(RankType.B, 1, 2);

      await expect(setAriseMonsterTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidMonsterId"
      );
    });

    it("Set Arise Monster : Failed : Invalid Monster Id : A", async () => {
      const setAriseMonsterTx = monsterFactory
        .connect(operatorManager)
        .setAriseMonster(RankType.A, 3, 4);

      await expect(setAriseMonsterTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidMonsterId"
      );
    });

    it("Set Arise Monster Batch : Success : B", async () => {
      nextMonsterRank = RankType.B;

      // normalMonster : 2(S), 3(S)
      // shadowMonster : 2(B), 3(A), 4(S), 5(B)

      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.S, false); // monsterId 3 S
      await addMonsterTx.wait();

      const addMonsterTx2 = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.B, true); // monsterId 5 B
      await addMonsterTx2.wait();

      const beforeMonsterIds = [2, 3];
      const nextMonsterIds = [5, 2];

      const setAriseMonsterBatchTx = await monsterFactory.setAriseMonsterBatch(
        nextMonsterRank,
        beforeMonsterIds,
        nextMonsterIds
      );

      const timestamp = await getBlockTimestamp(
        setAriseMonsterBatchTx.blockNumber
      );

      SetAriseMonsterBatchEvent = {
        nextMonsterRank,
        beforeMonsterIds,
        nextMonsterIds,
        timestamp,
      };

      await expect(setAriseMonsterBatchTx)
        .to.emit(monsterFactory, "SetAriseMonsterBatch")
        .withArgs(
          SetAriseMonsterBatchEvent.nextMonsterRank,
          SetAriseMonsterBatchEvent.beforeMonsterIds,
          SetAriseMonsterBatchEvent.nextMonsterIds,
          SetAriseMonsterBatchEvent.timestamp
        );

      const nextMonsters = await monsterFactory.getAriseNextMonsterBatch(
        nextMonsterRank,
        beforeMonsterIds
      );

      const beforeMonsters = await monsterFactory.getAriseBeforeMonsterBatch(
        nextMonsterRank,
        nextMonsterIds
      );

      const ariseMonster = await monsterFactory.getAriseMonster(
        nextMonsterRank
      );

      expect(nextMonsters.length).to.equal(2);
      expect(beforeMonsters.length).to.equal(2);
      expect(nextMonsters[0]).to.equal(nextMonsterIds[0]);
      expect(beforeMonsters[0]).to.equal(beforeMonsterIds[0]);
      expect(nextMonsters[1]).to.equal(nextMonsterIds[1]);
      expect(beforeMonsters[1]).to.equal(beforeMonsterIds[1]);
      expect(ariseMonster.beforeMonsterIds.length).to.equal(2);
      expect(ariseMonster.nextMonsterIds.length).to.equal(2);
      expect(ariseMonster.beforeMonsterIds[0]).to.equal(beforeMonsterIds[0]);
      expect(ariseMonster.beforeMonsterIds[1]).to.equal(beforeMonsterIds[1]);
      expect(ariseMonster.nextMonsterIds[0]).to.equal(nextMonsterIds[0]);
      expect(ariseMonster.nextMonsterIds[1]).to.equal(nextMonsterIds[1]);
    });

    it("Set Arise Monster Batch : Failed : Only Operator", async () => {
      const setAriseMonsterBatchTx = monsterFactory
        .connect(notOperator)
        .setAriseMonsterBatch(nextMonsterRank, [1], [1]);

      await expect(setAriseMonsterBatchTx).to.revertedWithCustomError(
        monsterFactory,
        "OnlyOperator"
      );
    });

    it("Set Arise Monster Batch : Failed : Invalid Rank Type", async () => {
      const setAriseMonsterBatchTx = monsterFactory
        .connect(operatorManager)
        .setAriseMonsterBatch(RankType.E, [1], [1]);

      await expect(setAriseMonsterBatchTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidRankType"
      );
    });

    it("Set Arise Monster Batch : Failed : Invalid Monster Id", async () => {
      const setAriseMonsterBatchTx = monsterFactory
        .connect(operatorManager)
        .setAriseMonsterBatch(RankType.B, [1], [2]);

      await expect(setAriseMonsterBatchTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidMonsterId"
      );
    });

    it("Set Monster Score : Success : Normal", async () => {
      isShadow = false;

      const setMonsterScoreTx = await monsterFactory
        .connect(operatorManager)
        .setMonsterScore(isShadow, [1, 2, 3, 4, 5, 6]);
      await setMonsterScoreTx.wait();

      const monsterScores = await monsterFactory.getMonsterScores(isShadow);
      const ERankSocre = await monsterFactory.getMonsterScore(
        RankType.E,
        isShadow
      );

      expect(monsterScores[RankType.E]).to.equal(1);
      expect(monsterScores[RankType.D]).to.equal(2);
      expect(monsterScores[RankType.C]).to.equal(3);
      expect(monsterScores[RankType.B]).to.equal(4);
      expect(monsterScores[RankType.A]).to.equal(5);
      expect(monsterScores[RankType.S]).to.equal(6);
      expect(ERankSocre).to.equal(1);
    });

    it("Set Monster Score : Success : Shadow", async () => {
      isShadow = true;

      const setMonsterScoreTx = await monsterFactory
        .connect(operatorManager)
        .setMonsterScore(isShadow, [1, 2, 3]);
      await setMonsterScoreTx.wait();

      const monsterScores = await monsterFactory.getMonsterScores(isShadow);
      const BRankSocre = await monsterFactory.getMonsterScore(
        RankType.B,
        isShadow
      );

      expect(monsterScores[0]).to.equal(1);
      expect(monsterScores[1]).to.equal(2);
      expect(monsterScores[2]).to.equal(3);
      expect(BRankSocre).to.equal(1);
    });

    it("Set Monster Score : Failed : Only Operator", async () => {
      isShadow = false;
      const setMonsterScoreTx = monsterFactory
        .connect(notOperator)
        .setMonsterScore(isShadow, [1, 2, 3, 4, 5, 6]);

      await expect(setMonsterScoreTx).to.revertedWithCustomError(
        monsterFactory,
        "OnlyOperator"
      );
    });

    it("Set Monster Score : Failed : Invalid Argument : Normal", async () => {
      isShadow = false;
      const setMonsterScoreTx = monsterFactory
        .connect(operatorManager)
        .setMonsterScore(isShadow, [1, 2, 3, 4, 5]);

      await expect(setMonsterScoreTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidArgument"
      );
    });

    it("Set Monster Score : Failed : Invalid Argument : Shadow", async () => {
      isShadow = false;
      const setMonsterScoreTx = monsterFactory
        .connect(operatorManager)
        .setMonsterScore(isShadow, [1, 2, 3, 4, 5]);

      await expect(setMonsterScoreTx).to.revertedWithCustomError(
        monsterFactory,
        "InvalidArgument"
      );
    });
  });
});
