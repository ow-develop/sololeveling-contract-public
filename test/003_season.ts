import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import {
  getBlockTimestamp,
  getCurrentBlockNumber,
  setNextBlockNumber,
} from "../helpers/block-timestamp";
import { RankType } from "../helpers/constant/contract";
import { Create, HunterRankUp } from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";

describe("Season", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    creator: SignerWithAddress,
    hunter1: SignerWithAddress,
    hunter2: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    monsterFactory: Contract,
    season: Contract,
    normalMonster: Contract,
    shadowMonster: Contract,
    hunterRank: Contract,
    seasonPack: Contract;

  let CreateEvent: Create, HunterRankUpEvent: HunterRankUp;

  let isShadow: boolean,
    hunterRankCollectionId: number,
    seasonPackCollectionId: number,
    latestSeasonEndBlock: number,
    beforeSeasonEndBlock: number,
    afterSeasonStartBlock: number;

  before(async () => {
    [operatorMaster, operatorManager, notOperator, creator, hunter1, hunter2] =
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

    // deploy season
    const SLSeason = await ethers.getContractFactory("SLSeason");
    season = await upgrades.deployProxy(
      SLSeason,
      [project.address, monsterFactory.address, 1, 2],
      {
        kind: "uups",
      }
    );
    await season.deployed();
    console.log(`Season deployed to: ${season.address}`);

    // deploy normalMonster
    const TestMonster = await ethers.getContractFactory("SLTestMonster");
    normalMonster = await upgrades.deployProxy(
      TestMonster,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [monsterFactory.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await normalMonster.deployed();
    console.log(`NormalMonster deployed to: ${normalMonster.address}`);

    const setProjectApprovalModeTx = await normalMonster.setProjectApprovalMode(
      false
    );
    await setProjectApprovalModeTx.wait();

    const addCollectionTx1 = await project
      .connect(operatorManager)
      .addCollection(normalMonster.address, creator.address);
    await addCollectionTx1.wait();

    // deploy shadowMonster
    shadowMonster = await upgrades.deployProxy(
      TestMonster,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [monsterFactory.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await shadowMonster.deployed();
    console.log(`ShadowMonster deployed to: ${shadowMonster.address}`);

    const setProjectApprovalModeTx2 =
      await shadowMonster.setProjectApprovalMode(false);
    await setProjectApprovalModeTx2.wait();

    const addCollectionTx2 = await project
      .connect(operatorManager)
      .addCollection(shadowMonster.address, creator.address);
    await addCollectionTx2.wait();

    // deploy hunterRank
    const HunterRank = await ethers.getContractFactory("SLHunterRank");
    hunterRank = await HunterRank.deploy(
      project.address,
      [season.address],
      "baseTokenURI"
    );
    await hunterRank.deployed();
    console.log(`HunterRank deployed to: ${hunterRank.address}`);

    const addCollectionTx3 = await project
      .connect(operatorManager)
      .addCollection(hunterRank.address, creator.address);
    await addCollectionTx3.wait();
    hunterRankCollectionId = 3;

    // deploy seasonPack
    const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
    seasonPack = await SeasonPack.deploy(
      project.address,
      ZERO_ADDRESS,
      [project.address],
      "baseTokenURI"
    );
    await seasonPack.deployed();
    console.log(`SeasonPack deployed to: ${hunterRank.address}`);

    const addCollectionTx4 = await project
      .connect(operatorManager)
      .addCollection(seasonPack.address, creator.address);
    await addCollectionTx4.wait();
    seasonPackCollectionId = 4;
  });

  ////////////
  // Season //
  ////////////

  describe("Season", async () => {
    it("Get Required Monster For RankUp", async () => {
      const requiredMonsterForRankUp =
        await season.getRequiredMonsterForRankUp();
      const requiredNormalMonster = requiredMonsterForRankUp[0];
      const requiredShadowMonster = requiredMonsterForRankUp[1];

      expect(requiredNormalMonster[RankType.E]).to.equal(10);
      expect(requiredNormalMonster[RankType.D]).to.equal(10);
      expect(requiredNormalMonster[RankType.C]).to.equal(10);
      expect(requiredNormalMonster[RankType.B]).to.equal(10);
      expect(requiredNormalMonster[RankType.A]).to.equal(10);

      expect(requiredShadowMonster[0]).to.equal(1);
      expect(requiredShadowMonster[1]).to.equal(1);
    });

    it("Add Season : Success", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();
      latestSeasonEndBlock = currentBlockNumber + 1000;

      const addSeasonTx = await season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          currentBlockNumber + 100,
          latestSeasonEndBlock,
          [1, 2]
        );

      const timestamp = await getBlockTimestamp(addSeasonTx.blockNumber);

      CreateEvent = {
        target: "Season",
        targetId: 0,
        timestamp: timestamp,
      };

      await expect(addSeasonTx)
        .to.emit(season, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );
    });

    it("Add Season : Failed : Only Operator", async () => {
      const addSeasonTx = season
        .connect(notOperator)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 100,
          latestSeasonEndBlock + 200,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "OnlyOperator"
      );
    });

    it("Add Season : Failed : Invalid Block Number : Start Block <= Before End Block", async () => {
      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock,
          latestSeasonEndBlock + 200,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidBlockNumber"
      );
    });

    it("Add Season : Failed : Invalid Block Number : End Block <= Start Block", async () => {
      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 1000,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidBlockNumber"
      );
    });

    it("Add Season : Failed : Invalid Block Number : Start Block <= Current Block", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();

      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          currentBlockNumber,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidBlockNumber"
      );
    });

    it("Add Season : Failed : Invalid Collection Id : Hunter Rank : Does Not Exist", async () => {
      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          10,
          seasonPackCollectionId,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Add Season : Failed : Invalid Collection Id : Season Pack : Does Not Exist", async () => {
      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          100,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Add Season : Failed : Invalid Collection Id : Hunter Rank : Not SLMT", async () => {
      // deploy achievement
      const Achievement = await ethers.getContractFactory("SLAchievement");
      const achievement = await upgrades.deployProxy(
        Achievement,
        [project.address, "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await achievement.deployed();

      const addCollectionTx5 = await project
        .connect(operatorManager)
        .addCollection(achievement.address, creator.address);
      await addCollectionTx5.wait();

      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          5,
          seasonPackCollectionId,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Add Season : Failed : Invalid Collection Id : Season Pack : Not SLMT", async () => {
      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          5,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Add Season : Failed : Invalid Collection Id : Hunter Rank : Not Active", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive(hunterRankCollectionId, false);
      await setCollectionActiveTx.wait();

      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project
        .connect(operatorManager)
        .setCollectionActive(hunterRankCollectionId, true);
      await setCollectionActiveTx2.wait();
    });

    it("Add Season : Failed : Invalid Collection Id : Season Pack : Not Active", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive(seasonPackCollectionId, false);
      await setCollectionActiveTx.wait();

      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1, 2]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project
        .connect(operatorManager)
        .setCollectionActive(seasonPackCollectionId, true);
      await setCollectionActiveTx2.wait();
    });

    it("Add Season : Failed : Invalid Collection Id : Season Collection : Does Not Exist", async () => {
      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1, 100]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Add Season : Failed : Invalid Collection Id : Season Collection : Not Active", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive(1, false);
      await setCollectionActiveTx.wait();

      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [1]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project
        .connect(operatorManager)
        .setCollectionActive(1, true);
      await setCollectionActiveTx2.wait();
    });

    it("Add Season : Failed : Invalid Collection Id : Season Collection : Not Collectable", async () => {
      const addSeasonTx = season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 500,
          latestSeasonEndBlock + 1000,
          [hunterRankCollectionId]
        );

      await expect(addSeasonTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Season Collection : Success", async () => {
      const setSeasonCollectionTx = await season
        .connect(operatorManager)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [1]
        );
      await setSeasonCollectionTx.wait();

      const season0 = await season.getSeasonById(0);
      expect(season0.hunterRankCollectionId).to.equal(hunterRankCollectionId);
      expect(season0.seasonPackCollectionId).to.equal(seasonPackCollectionId);
      expect(season0.seasonCollectionIds.length).to.equal(1);
      expect(season0.seasonCollectionIds[0]).to.equal(1);
    });

    it("Set Season Collection : Failed : Only Operator", async () => {
      const setSeasonCollectionTx = season
        .connect(notOperator)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [1]
        );

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "OnlyOperator"
      );
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Hunter Rank : Does Not Exist", async () => {
      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(0, 10, seasonPackCollectionId, [1]);

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Season Pack : Does Not Exist", async () => {
      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(0, hunterRankCollectionId, 10, [1]);

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Hunter Rank : Not Active", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive(hunterRankCollectionId, false);
      await setCollectionActiveTx.wait();

      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [1, 2]
        );

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project
        .connect(operatorManager)
        .setCollectionActive(hunterRankCollectionId, true);
      await setCollectionActiveTx2.wait();
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Season Pack : Not Active", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive(seasonPackCollectionId, false);
      await setCollectionActiveTx.wait();

      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [1, 2]
        );

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project
        .connect(operatorManager)
        .setCollectionActive(seasonPackCollectionId, true);
      await setCollectionActiveTx2.wait();
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Hunter Rank : Not SLMT", async () => {
      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(0, 5, seasonPackCollectionId, [1]);

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Season Pack : Not SLMT", async () => {
      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(0, hunterRankCollectionId, 5, [1]);

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Season Collection : Does Not Exist", async () => {
      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [1, 100]
        );

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Season Collection : Not Active", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive(1, false);
      await setCollectionActiveTx.wait();

      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [1]
        );

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project
        .connect(operatorManager)
        .setCollectionActive(1, true);
      await setCollectionActiveTx2.wait();
    });

    it("Set Season Collection : Failed : Invalid Collection Id : Season Collection : Not Collectable", async () => {
      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [hunterRankCollectionId]
        );

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Season Collection : Failed : Already Start Season", async () => {
      await setNextBlockNumber(100);

      const setSeasonCollectionTx = season
        .connect(operatorManager)
        .setSeasonCollection(
          0,
          hunterRankCollectionId,
          seasonPackCollectionId,
          [1]
        );

      await expect(setSeasonCollectionTx).to.revertedWithCustomError(
        season,
        "AlreadyStartSeason"
      );
    });

    it("Set Season Block : Success", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();

      const addSeasonTx = await season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          currentBlockNumber + 1000,
          currentBlockNumber + 2000,
          [1]
        );
      await addSeasonTx.wait(); // seasonId 1

      const setSeasonBlockTx = await season
        .connect(operatorManager)
        .setSeasonBlock(
          1,
          currentBlockNumber + 1100,
          currentBlockNumber + 2500
        );
      await setSeasonBlockTx.wait();

      beforeSeasonEndBlock = latestSeasonEndBlock;
      latestSeasonEndBlock = currentBlockNumber + 2500;

      const season1 = await season.getSeasonById(1);
      expect(season1.startBlock).to.equal(currentBlockNumber + 1100);
      expect(season1.endBlock).to.equal(currentBlockNumber + 2500);
    });

    it("Set Season Block : Failed : Only Operator", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();

      const setSeasonBlockTx = season
        .connect(notOperator)
        .setSeasonBlock(
          1,
          currentBlockNumber + 1100,
          currentBlockNumber + 2100
        );

      await expect(setSeasonBlockTx).to.revertedWithCustomError(
        season,
        "OnlyOperator"
      );
    });

    it("Set Season Block : Failed : Invalid Season Id", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();

      const setSeasonBlockTx = season
        .connect(operatorManager)
        .setSeasonBlock(
          100,
          currentBlockNumber + 1100,
          currentBlockNumber + 2100
        );

      await expect(setSeasonBlockTx).to.revertedWithCustomError(
        season,
        "InvalidSeasonId"
      );
    });

    it("Set Season Block : Failed : Invalid Block Number : Start Block <= Before End Block", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();

      const setSeasonBlockTx = season
        .connect(operatorManager)
        .setSeasonBlock(1, currentBlockNumber, beforeSeasonEndBlock);

      await expect(setSeasonBlockTx).to.revertedWithCustomError(
        season,
        "InvalidBlockNumber"
      );
    });

    it("Set Season Block : Failed : Invalid Block Number : End Block <= Start Block", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();

      const setSeasonBlockTx = season
        .connect(operatorManager)
        .setSeasonBlock(
          1,
          currentBlockNumber + 1100,
          currentBlockNumber + 1100
        );

      await expect(setSeasonBlockTx).to.revertedWithCustomError(
        season,
        "InvalidBlockNumber"
      );
    });

    it("Set Season Block : Failed : Invalid Block Number : Start Block <= Current Block", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();

      const setSeasonBlockTx = season
        .connect(operatorManager)
        .setSeasonBlock(1, currentBlockNumber, latestSeasonEndBlock + 100);

      await expect(setSeasonBlockTx).to.revertedWithCustomError(
        season,
        "InvalidBlockNumber"
      );
    });

    it("Set Season Block : Failed : Invalid Block Number : After Start Block <= End Block", async () => {
      const addSeasonTx = await season
        .connect(operatorManager)
        .addSeason(
          hunterRankCollectionId,
          seasonPackCollectionId,
          latestSeasonEndBlock + 1000,
          latestSeasonEndBlock + 3000,
          [1]
        );
      await addSeasonTx.wait(); // seasonId 2

      afterSeasonStartBlock = latestSeasonEndBlock + 1000;

      const setSeasonBlockTx = season
        .connect(operatorManager)
        .setSeasonBlock(1, afterSeasonStartBlock - 500, afterSeasonStartBlock);

      await expect(setSeasonBlockTx).to.revertedWithCustomError(
        season,
        "InvalidBlockNumber"
      );
    });

    it("Set Season Block : Failed : Ended Season", async () => {
      await setNextBlockNumber(1100);

      const currentBlockNumber = await getCurrentBlockNumber();

      const setSeasonBlockTx = season
        .connect(operatorManager)
        .setSeasonBlock(0, currentBlockNumber + 100, currentBlockNumber + 500);

      await expect(setSeasonBlockTx).to.revertedWithCustomError(
        season,
        "EndedSeason"
      );
    });

    it("View Season", async () => {
      const isExist = await season.isExistSeasonById(0);
      const isExist2 = await season.isExistSeasonById(100);

      expect(isExist).to.equal(true);
      expect(isExist2).to.equal(false);

      const isCurrentSeason = await season.isCurrentSeasonById(0);
      const isCurrentSeason2 = await season.isCurrentSeasonById(1);

      expect(isCurrentSeason).to.equal(false);
      expect(isCurrentSeason2).to.equal(true);

      const isEndedSeason = await season.isEndedSeasonById(0);
      const isEndedSeason2 = await season.isEndedSeasonById(1);

      expect(isEndedSeason).to.equal(true);
      expect(isEndedSeason2).to.equal(false);

      const isStartSeason = await season.isStartSeasonById(0);
      const isStartSeason2 = await season.isStartSeasonById(1);

      expect(isStartSeason).to.equal(true);
      expect(isStartSeason2).to.equal(true);

      const seasonLength = await season.getSeasonLength();
      expect(seasonLength).to.equal(3);

      const eRank = await season.getHunterRank(1, hunter1.address);
      expect(eRank).to.equal(RankType.E);
    });
  });

  ////////////
  // RankUp //
  ////////////

  describe("RankUp", async () => {
    it("RankUp : Success : E Rank", async () => {
      isShadow = false;
      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.E, isShadow); // monsterId 1 : E
      await addMonsterTx.wait();

      const mintTx = await normalMonster
        .connect(operatorManager)
        .mintOfTest(hunter1.address, 1, 15);
      await mintTx.wait();

      const beforeBalance = await normalMonster.balanceOf(hunter1.address, 1);
      expect(beforeBalance).to.equal(15);

      const approveTx = await normalMonster
        .connect(hunter1)
        .setApprovalForAll(season.address, true);
      await approveTx.wait();

      const rankUpTx = await season
        .connect(hunter1)
        .rankUp(1, RankType.E, [1], [10], isShadow);

      const timestamp = await getBlockTimestamp(rankUpTx.blockNumber);

      HunterRankUpEvent = {
        seasonId: 1,
        hunter: hunter1.address,
        rankType: RankType.D,
        timestamp: timestamp,
      };

      await expect(rankUpTx)
        .to.emit(season, "HunterRankUp")
        .withArgs(
          HunterRankUpEvent.seasonId,
          HunterRankUpEvent.hunter,
          HunterRankUpEvent.rankType,
          HunterRankUpEvent.timestamp
        );

      const afterBalance = await normalMonster.balanceOf(hunter1.address, 1);
      expect(afterBalance).to.equal(5);

      const seasonHunterRank = await season.getHunterRank(1, hunter1.address);
      expect(seasonHunterRank).to.equal(RankType.D);
    });

    it("RankUp : Success : D Rank", async () => {
      isShadow = false;
      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.D, isShadow); // monsterId 2 : D
      await addMonsterTx.wait();

      const addMonsterTx2 = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.D, isShadow);
      await addMonsterTx2.wait(); // monsterId 3 : D

      const mintBatchTx = await normalMonster
        .connect(operatorManager)
        .mintOfTestBatch(hunter1.address, [2, 3], [15, 15]);
      await mintBatchTx.wait();

      const beforeBalance = await normalMonster.balanceOfBatch(
        [hunter1.address, hunter1.address],
        [2, 3]
      );
      expect(beforeBalance[0]).to.equal(15);
      expect(beforeBalance[1]).to.equal(15);

      const rankUpTx = await season
        .connect(hunter1)
        .rankUp(1, RankType.D, [2, 3], [5, 5], isShadow);

      const timestamp = await getBlockTimestamp(rankUpTx.blockNumber);

      HunterRankUpEvent = {
        seasonId: 1,
        hunter: hunter1.address,
        rankType: RankType.C,
        timestamp: timestamp,
      };

      await expect(rankUpTx)
        .to.emit(season, "HunterRankUp")
        .withArgs(
          HunterRankUpEvent.seasonId,
          HunterRankUpEvent.hunter,
          HunterRankUpEvent.rankType,
          HunterRankUpEvent.timestamp
        );

      const afterBalance = await normalMonster.balanceOfBatch(
        [hunter1.address, hunter1.address],
        [2, 3]
      );
      expect(afterBalance[0]).to.equal(10);
      expect(afterBalance[1]).to.equal(10);

      const seasonHunterRank = await season.getHunterRank(1, hunter1.address);
      expect(seasonHunterRank).to.equal(RankType.C);
    });

    it("RankUp : Success : C Rank", async () => {
      isShadow = false;
      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.C, isShadow); // monsterId 4 : C
      await addMonsterTx.wait();

      const mintTx = await normalMonster
        .connect(operatorManager)
        .mintOfTest(hunter1.address, 4, 10);
      await mintTx.wait();

      const beforeBalance = await normalMonster.balanceOf(hunter1.address, 4);
      expect(beforeBalance).to.equal(10);

      const rankUpTx = await season
        .connect(hunter1)
        .rankUp(1, RankType.C, [4], [10], isShadow);

      const timestamp = await getBlockTimestamp(rankUpTx.blockNumber);

      HunterRankUpEvent = {
        seasonId: 1,
        hunter: hunter1.address,
        rankType: RankType.B,
        timestamp: timestamp,
      };

      await expect(rankUpTx)
        .to.emit(season, "HunterRankUp")
        .withArgs(
          HunterRankUpEvent.seasonId,
          HunterRankUpEvent.hunter,
          HunterRankUpEvent.rankType,
          HunterRankUpEvent.timestamp
        );

      const afterBalance = await normalMonster.balanceOf(hunter1.address, 4);
      expect(afterBalance).to.equal(0);

      const seasonHunterRank = await season.getHunterRank(1, hunter1.address);
      expect(seasonHunterRank).to.equal(RankType.B);
    });

    it("RankUp : Success : B Rank : Shadow", async () => {
      isShadow = true;
      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.B, isShadow); // shadowMonsterId 1 : B
      await addMonsterTx.wait();

      const mintTx = await shadowMonster
        .connect(operatorManager)
        .mintOfTest(hunter1.address, 1, 5);
      await mintTx.wait();

      const beforeBalance = await shadowMonster.balanceOf(hunter1.address, 1);
      expect(beforeBalance).to.equal(5);

      const approveTx = await shadowMonster
        .connect(hunter1)
        .setApprovalForAll(season.address, true);
      await approveTx.wait();

      const rankUpTx = await season
        .connect(hunter1)
        .rankUp(1, RankType.B, [1], [1], isShadow);

      const timestamp = await getBlockTimestamp(rankUpTx.blockNumber);

      HunterRankUpEvent = {
        seasonId: 1,
        hunter: hunter1.address,
        rankType: RankType.A,
        timestamp: timestamp,
      };

      await expect(rankUpTx)
        .to.emit(season, "HunterRankUp")
        .withArgs(
          HunterRankUpEvent.seasonId,
          HunterRankUpEvent.hunter,
          HunterRankUpEvent.rankType,
          HunterRankUpEvent.timestamp
        );

      const afterBalance = await shadowMonster.balanceOf(hunter1.address, 1);
      expect(afterBalance).to.equal(4);

      const seasonHunterRank = await season.getHunterRank(1, hunter1.address);
      expect(seasonHunterRank).to.equal(RankType.A);
    });

    it("RankUp : Failed : Invalid Season Id : Not Current", async () => {
      isShadow = true;
      const addMonsterTx = await monsterFactory
        .connect(operatorManager)
        .addMonster(RankType.A, isShadow); // shadowMonsterId 2 : A
      await addMonsterTx.wait();

      const mintTx = await shadowMonster
        .connect(operatorManager)
        .mintOfTest(hunter1.address, 2, 5);
      await mintTx.wait();

      const rankUpTx = season
        .connect(hunter1)
        .rankUp(0, RankType.A, [2], [1], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidSeasonId"
      );
    });

    it("RankUp : Failed : Invalid Season Id : Not Exist", async () => {
      const rankUpTx = season
        .connect(hunter1)
        .rankUp(100, RankType.A, [2], [1], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidSeasonId"
      );
    });

    it("RankUp : Failed : Invalid Rank Type : S Rank", async () => {
      const rankUpTx = season
        .connect(hunter1)
        .rankUp(1, RankType.S, [2], [1], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidRankType"
      );
    });

    it("RankUp : Failed : Invalid Rank Type : Exceed Rank", async () => {
      isShadow = false;

      const rankUpTx = season
        .connect(hunter1)
        .rankUp(1, RankType.D, [2], [1], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidRankType"
      );
    });

    it("RankUp : Failed : Invalid Rank Type : Not Enough Rank", async () => {
      const rankUpTx = season
        .connect(hunter2)
        .rankUp(1, RankType.S, [2], [1], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidRankType"
      );
    });

    it("RankUp : Failed : Invalid Rank Type : Shadow", async () => {
      isShadow = true;

      const rankUpTx = season
        .connect(hunter2)
        .rankUp(1, RankType.E, [1], [1], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidRankType"
      );
    });

    it("RankUp : Failed : Invalid Monster", async () => {
      const rankUpTx = season
        .connect(hunter1)
        .rankUp(1, RankType.A, [2], [1, 5], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidMonster"
      );
    });

    it("RankUp : Failed : Invalid Monster : Invalid Amount", async () => {
      isShadow = false;

      const rankUpTx = season
        .connect(hunter2)
        .rankUp(1, RankType.E, [1], [20], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidMonster"
      );
    });

    it("RankUp : Failed : Invalid Season Id : Invalid Monster : Invalid Monster Rank", async () => {
      isShadow = false;

      const rankUpTx = season
        .connect(hunter2)
        .rankUp(1, RankType.E, [2], [10], isShadow);

      await expect(rankUpTx).to.revertedWithCustomError(
        season,
        "InvalidMonster"
      );
    });

    it("Set Required Monster For RankUp : Success", async () => {
      const requiredNormalMonster = [5, 6, 7, 8, 9]; // E - A
      const requiredShadowMonster = [1, 2]; // B - A

      const setRequiredMonsterForRankUpTx = await season
        .connect(operatorManager)
        .setRequiredMonsterForRankUp(
          requiredNormalMonster,
          requiredShadowMonster
        );
      await setRequiredMonsterForRankUpTx.wait();

      const requiredMonster = await season.getRequiredMonsterForRankUp();
      for (let i = 0; i < requiredMonster[0].length; i++) {
        expect(requiredNormalMonster[i]).to.equal(requiredMonster[0][i]);
      }

      for (let i = 0; i < requiredMonster[1].length; i++) {
        expect(requiredShadowMonster[i]).to.equal(requiredMonster[1][i]);
      }

      isShadow = true;
      const rankUpTx = await season
        .connect(hunter1)
        .rankUp(1, RankType.A, [2], [2], isShadow);
      await rankUpTx.wait();

      const seasonHunterRank = await season.getHunterRank(1, hunter1.address);
      expect(seasonHunterRank).to.equal(RankType.S);

      const hunterRankTokenBalance = await season.getHunterRankTokenBalance(
        1,
        hunter1.address
      );
      for (let i = 0; i < hunterRankTokenBalance.length; i++) {
        expect(hunterRankTokenBalance[i]).to.equal(1);
      }
    });

    it("Set Required Monster For RankUp : Failed : Only Operator", async () => {
      const requiredNormalMonster = [5, 6, 7, 8, 9];
      const requiredShadowMonster = [1, 2];

      const setRequiredMonsterForRankUpTx = season
        .connect(notOperator)
        .setRequiredMonsterForRankUp(
          requiredNormalMonster,
          requiredShadowMonster
        );

      await expect(setRequiredMonsterForRankUpTx).to.revertedWithCustomError(
        season,
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
      const setMonsterCollectionIdTx = await season
        .connect(operatorManager)
        .setMonsterCollectionId(2, isShadow);
      await setMonsterCollectionIdTx.wait();

      const monsterCollectionId = await season.getMonsterCollectionId(isShadow);
      expect(monsterCollectionId).to.equal(2);
    });

    it("Set Monster Collection Id : Failed : Only Operator", async () => {
      const setMonsterCollectionIdTx = season
        .connect(notOperator)
        .setMonsterCollectionId(2, isShadow);

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        season,
        "OnlyOperator"
      );
    });

    it("Set Monster Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
      const setMonsterCollectionIdTx = season
        .connect(operatorManager)
        .setMonsterCollectionId(200, isShadow);

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set Monster Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive(2, false);
      await setCollectionActiveTx.wait();

      const setMonsterCollectionIdTx = season
        .connect(operatorManager)
        .setMonsterCollectionId(2, isShadow);

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        season,
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

      const addCollectionTx = await project
        .connect(operatorManager)
        .addCollection(shadowMonarch.address, creator.address);
      await addCollectionTx.wait(); // collectionId 6

      const setMonsterCollectionIdTx = season
        .connect(operatorManager)
        .setMonsterCollectionId(6, isShadow);

      await expect(setMonsterCollectionIdTx).to.revertedWithCustomError(
        season,
        "InvalidCollectionId"
      );
    });

    it("Set MonsterFactory Contract : Success", async () => {
      const setMonsterFactoryContractTx = await season
        .connect(operatorMaster)
        .setMonsterFactoryContract(project.address);
      await setMonsterFactoryContractTx.wait();

      const monsterFactoryContract = await season.getMonsterFactoryContract();
      expect(monsterFactoryContract).to.equal(project.address);
    });

    it("Set MonsterFactory Contract : Failed : Only Operator", async () => {
      const setMonsterFactoryContractTx = season
        .connect(notOperator)
        .setMonsterFactoryContract(project.address);

      await expect(setMonsterFactoryContractTx).to.revertedWithCustomError(
        season,
        "OnlyOperator"
      );
    });
  });
});
