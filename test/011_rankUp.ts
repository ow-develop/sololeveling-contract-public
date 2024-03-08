import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import {
  getCurrentBlockNumber,
  setNextBlockNumber,
} from "../helpers/block-timestamp";
import { RankType } from "../helpers/constant/contract";
import { GateCreated } from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";

describe("RankUp", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    creator: SignerWithAddress,
    randomSigner: SignerWithAddress,
    hunter1: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    monsterFactory: Contract,
    season: Contract,
    random: Contract,
    testUSDC: Contract,
    shop: Contract,
    gateKey: Contract,
    dungeonGate: Contract,
    essenceStone: Contract,
    normalMonster: Contract,
    shadowMonster: Contract,
    season0HunterRank: Contract,
    season1HunterRank: Contract,
    season0SeasonPack: Contract,
    season1SeasonPack: Contract;

  let GateCreatedEvent: GateCreated;

  let gateId: number;
  let gateCount: number;

  const requiredGateCountForRankUp = [1, 2, 3, 4, 5];
  const gateBloks = [5, 150, 300, 600, 1200, 2400];

  before(async () => {
    [operatorMaster, operatorManager, creator, randomSigner, hunter1] =
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
    season = await upgrades.deployProxy(SLSeason, [project.address], {
      kind: "uups",
    });
    await season.deployed();
    console.log(`Season deployed to: ${season.address}`);

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

    // deploy test USDC token
    const TestUSDC = await ethers.getContractFactory("TestUSDC");
    testUSDC = await TestUSDC.deploy(0);
    await testUSDC.deployed();
    console.log(`Test USDC deployed to: ${testUSDC.address}`);

    // deploy shop
    const Shop = await ethers.getContractFactory("SLShop");
    shop = await upgrades.deployProxy(
      Shop,
      [project.address, testUSDC.address, 8, 1],
      { kind: "uups" }
    );
    console.log(`Shop deployed to: ${shop.address}`);

    // deploy dungeonGate
    const DungeonGate = await ethers.getContractFactory("SLDungeonGate");
    dungeonGate = await upgrades.deployProxy(
      DungeonGate,
      [
        project.address,
        season.address,
        random.address,
        shop.address,
        monsterFactory.address,
        1, // essenceStone
        8, // gateKey
        2, // normalMonster
      ],
      {
        kind: "uups",
      }
    );
    await dungeonGate.deployed();
    console.log(`DungeonGate deployed to: ${dungeonGate.address}`);

    // deploy test essenceStone - collectionId 1
    const EssenceStone = await ethers.getContractFactory("SLTestEssenceStone");
    essenceStone = await upgrades.deployProxy(
      EssenceStone,
      [project.address, ZERO_ADDRESS, [dungeonGate.address], "baseTokenURI"],
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
        [dungeonGate.address],
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
        [dungeonGate.address],
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

    // deploy test season0 hunterRank - collectionId 4
    const HunterRank = await ethers.getContractFactory("SLTestHunterRank");
    season0HunterRank = await HunterRank.deploy(
      project.address,
      [dungeonGate.address],
      "baseTokenURI"
    );
    await season0HunterRank.deployed();
    console.log(`Season0 HunterRank deployed to: ${season0HunterRank.address}`);

    const addCollectionTx4 = await project
      .connect(operatorManager)
      .addCollection(season0HunterRank.address, creator.address);
    await addCollectionTx4.wait();

    // deploy test season1 hunterRank - collectionId 5
    season1HunterRank = await HunterRank.deploy(
      project.address,
      [dungeonGate.address],
      "baseTokenURI"
    );
    await season1HunterRank.deployed();
    console.log(`Season1 HunterRank deployed to: ${season1HunterRank.address}`);

    const addCollectionTx5 = await project
      .connect(operatorManager)
      .addCollection(season1HunterRank.address, creator.address);
    await addCollectionTx5.wait();

    // deploy season0 seasonPack - collectionId 6
    const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
    season0SeasonPack = await SeasonPack.deploy(
      project.address,
      ZERO_ADDRESS,
      [dungeonGate.address],
      "baseTokenURI"
    );
    await season0SeasonPack.deployed();
    console.log(`Season0 SeasonPack deployed to: ${season0SeasonPack.address}`);

    const addCollectionTx6 = await project
      .connect(operatorManager)
      .addCollection(season0SeasonPack.address, creator.address);
    await addCollectionTx6.wait();

    // deploy season1 seasonPack - collectionId 7
    season1SeasonPack = await SeasonPack.deploy(
      project.address,
      ZERO_ADDRESS,
      [dungeonGate.address],
      "baseTokenURI"
    );
    await season1SeasonPack.deployed();
    console.log(`Season1 SeasonPack deployed to: ${season1SeasonPack.address}`);

    const addCollectionTx7 = await project
      .connect(operatorManager)
      .addCollection(season1SeasonPack.address, creator.address);
    await addCollectionTx7.wait();

    // deploy gateKey - collectionId 8
    const GateKey = await ethers.getContractFactory("SLGateKey");
    gateKey = await upgrades.deployProxy(
      GateKey,
      [project.address, ZERO_ADDRESS, [shop.address], "baseTokenURI"],
      {
        kind: "uups",
      }
    );
    await gateKey.deployed();
    console.log(`GateKey deployed to: ${gateKey.address}`);

    const setProjectApprovalModeTx4 = await gateKey.setProjectApprovalMode(
      false
    );
    await setProjectApprovalModeTx4.wait();

    const addCollectionTx8 = await project
      .connect(operatorManager)
      .addCollection(gateKey.address, creator.address);
    await addCollectionTx8.wait();

    // add season0
    const currentBlockNumber = await getCurrentBlockNumber();
    const addSeason0Tx = await season
      .connect(operatorManager)
      .addSeason(
        4,
        6,
        currentBlockNumber + 100,
        currentBlockNumber + 500,
        [2, 3]
      );
    await addSeason0Tx.wait();

    // add season1
    const addSeason1Tx = await season
      .connect(operatorManager)
      .addSeason(
        5,
        7,
        currentBlockNumber + 600,
        currentBlockNumber + 10000000,
        [2, 3]
      );
    await addSeason1Tx.wait();

    // add monster
    for (let i = 1; i <= 5; i++) {
      const addNormalMonsterTx = await monsterFactory.addMonster(
        RankType.E,
        false
      );
      await addNormalMonsterTx.wait(); // E normalMonsterId 1-5

      const addNormalMonsterTx2 = await monsterFactory.addMonster(
        RankType.D,
        false
      );
      await addNormalMonsterTx2.wait(); // D normalMonsterId 6-10

      const addNormalMonsterTx3 = await monsterFactory.addMonster(
        RankType.C,
        false
      );
      await addNormalMonsterTx3.wait(); // C normalMonsterId 11-15

      const addNormalMonsterTx4 = await monsterFactory.addMonster(
        RankType.B,
        false
      );
      await addNormalMonsterTx4.wait(); // B normalMonsterId 16-20

      const addNormalMonsterTx5 = await monsterFactory.addMonster(
        RankType.A,
        false
      );
      await addNormalMonsterTx5.wait(); // A normalMonsterId 21-25

      const addNormalMonsterTx6 = await monsterFactory.addMonster(
        RankType.S,
        false
      );
      await addNormalMonsterTx6.wait(); // A normalMonsterId 26-30

      const openTokenTx = await season0SeasonPack.openToken(i);
      await openTokenTx.wait(); // season0 seasonPackId 1-5

      const openTokenTx2 = await season1SeasonPack.openToken(i);
      await openTokenTx2.wait(); // season1 seasonPackId 1-5
    }
  });

  //////////
  // Gate //
  //////////

  describe("Gate", async () => {
    it("RankUp : D", async () => {
      const setSlotTx = await dungeonGate.setSlotPerHunterRank([
        5, 5, 5, 5, 5, 5,
      ]);
      await setSlotTx.wait();

      const setGateCountTx = await dungeonGate.setRequiredGateCountForRankUp(
        requiredGateCountForRankUp
      );
      await setGateCountTx.wait();

      await setNextBlockNumber(110);

      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, RankType.E, 1);
      await mintKeyTx.wait();

      const approveTx = await gateKey
        .connect(hunter1)
        .setApprovalForAll(dungeonGate.address, true);
      await approveTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.E);

      gateId = 1;
      gateCount = 1;

      GateCreatedEvent = {
        seasonId: 0,
        gateRank: RankType.E,
        hunter: hunter1.address,
        gateId,
        startBlock: enterToGateTx.blockNumber,
        endBlock: enterToGateTx.blockNumber + gateBloks[RankType.E],
        isRankUp: true,
        nextHunterRank: RankType.D,
      };

      await expect(enterToGateTx)
        .to.emit(dungeonGate, "GateCreated")
        .withArgs(
          GateCreatedEvent.seasonId,
          GateCreatedEvent.gateRank,
          GateCreatedEvent.hunter,
          GateCreatedEvent.gateId,
          GateCreatedEvent.startBlock,
          GateCreatedEvent.endBlock,
          GateCreatedEvent.isRankUp,
          GateCreatedEvent.nextHunterRank
        );

      const hunterRank = await season.getHunterRank(0, hunter1.address);
      expect(hunterRank).to.equal(RankType.D);
    });

    it("RankUp : C", async () => {
      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, RankType.D, 1);
      await mintKeyTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.D);

      gateId = 2;
      gateCount = 2;

      GateCreatedEvent = {
        seasonId: 0,
        gateRank: RankType.D,
        hunter: hunter1.address,
        gateId,
        startBlock: enterToGateTx.blockNumber,
        endBlock: enterToGateTx.blockNumber + gateBloks[RankType.D],
        isRankUp: true,
        nextHunterRank: RankType.C,
      };

      await expect(enterToGateTx)
        .to.emit(dungeonGate, "GateCreated")
        .withArgs(
          GateCreatedEvent.seasonId,
          GateCreatedEvent.gateRank,
          GateCreatedEvent.hunter,
          GateCreatedEvent.gateId,
          GateCreatedEvent.startBlock,
          GateCreatedEvent.endBlock,
          GateCreatedEvent.isRankUp,
          GateCreatedEvent.nextHunterRank
        );

      const hunterRank = await season.getHunterRank(0, hunter1.address);
      expect(hunterRank).to.equal(RankType.C);
    });

    it("RankUp : B", async () => {
      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, RankType.C, 1);
      await mintKeyTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.C);

      gateId = 3;
      gateCount = 3;

      GateCreatedEvent = {
        seasonId: 0,
        gateRank: RankType.C,
        hunter: hunter1.address,
        gateId,
        startBlock: enterToGateTx.blockNumber,
        endBlock: enterToGateTx.blockNumber + gateBloks[RankType.C],
        isRankUp: true,
        nextHunterRank: RankType.B,
      };

      await expect(enterToGateTx)
        .to.emit(dungeonGate, "GateCreated")
        .withArgs(
          GateCreatedEvent.seasonId,
          GateCreatedEvent.gateRank,
          GateCreatedEvent.hunter,
          GateCreatedEvent.gateId,
          GateCreatedEvent.startBlock,
          GateCreatedEvent.endBlock,
          GateCreatedEvent.isRankUp,
          GateCreatedEvent.nextHunterRank
        );

      const hunterRank = await season.getHunterRank(0, hunter1.address);
      expect(hunterRank).to.equal(RankType.B);
    });

    it("RankUp : A", async () => {
      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, RankType.C, 1);
      await mintKeyTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.C);

      gateId = 4;
      gateCount = 4;

      GateCreatedEvent = {
        seasonId: 0,
        gateRank: RankType.C,
        hunter: hunter1.address,
        gateId,
        startBlock: enterToGateTx.blockNumber,
        endBlock: enterToGateTx.blockNumber + gateBloks[RankType.C],
        isRankUp: true,
        nextHunterRank: RankType.A,
      };

      await expect(enterToGateTx)
        .to.emit(dungeonGate, "GateCreated")
        .withArgs(
          GateCreatedEvent.seasonId,
          GateCreatedEvent.gateRank,
          GateCreatedEvent.hunter,
          GateCreatedEvent.gateId,
          GateCreatedEvent.startBlock,
          GateCreatedEvent.endBlock,
          GateCreatedEvent.isRankUp,
          GateCreatedEvent.nextHunterRank
        );

      const hunterRank = await season.getHunterRank(0, hunter1.address);
      expect(hunterRank).to.equal(RankType.A);
    });

    it("RankUp : S", async () => {
      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, RankType.C, 1);
      await mintKeyTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.C);

      gateId = 5;
      gateCount = 5;

      GateCreatedEvent = {
        seasonId: 0,
        gateRank: RankType.C,
        hunter: hunter1.address,
        gateId,
        startBlock: enterToGateTx.blockNumber,
        endBlock: enterToGateTx.blockNumber + gateBloks[RankType.C],
        isRankUp: true,
        nextHunterRank: RankType.S,
      };

      await expect(enterToGateTx)
        .to.emit(dungeonGate, "GateCreated")
        .withArgs(
          GateCreatedEvent.seasonId,
          GateCreatedEvent.gateRank,
          GateCreatedEvent.hunter,
          GateCreatedEvent.gateId,
          GateCreatedEvent.startBlock,
          GateCreatedEvent.endBlock,
          GateCreatedEvent.isRankUp,
          GateCreatedEvent.nextHunterRank
        );

      const hunterRank = await season.getHunterRank(0, hunter1.address);
      expect(hunterRank).to.equal(RankType.S);
    });
  });
});
