import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import {
  getBlockTimestamp,
  getCurrentBlockNumber,
  setNextBlockNumber,
} from "../helpers/block-timestamp";
import { PriceMode, RankType, StoneType } from "../helpers/constant/contract";
import { GateCleared, GateCreated, KeySold } from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";
import { getEventArgs } from "../helpers/event-parser";
import { MonsterReward, SeasonPackReward } from "../helpers/type/contract";

describe("DungeonGate", () => {
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

  let GateCreatedEvent: GateCreated,
    GateClearedEvent: GateCleared,
    KeySoldEvent: KeySold;

  let gateId: number;

  const essenceStoneTokenId = 1;
  const boostBlockCount = 72;
  const maticPrices = [
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("2"),
    ethers.utils.parseEther("2"),
    ethers.utils.parseEther("2"),
  ];
  const usdPrices = [1000000, 4000000, 12000000, 30000000, 66000000, 140000000];
  const gateBloks = [24, 720, 1440, 2880, 5760, 11520];

  const gateClearedEventChecker = (event: any, gateCleared: GateCleared) => {
    expect(event.gateRank).to.equal(gateCleared.gateRank);
    expect(event.hunter).to.equal(gateCleared.hunter);
    expect(event.gateId).to.equal(gateCleared.gateId);
    expect(event.seasonId).to.equal(gateCleared.seasonId);
    expect(event.usedStone).to.equal(gateCleared.usedStone);
    expect(event.gateSignatures.length).to.equal(
      gateCleared.gateSignatures.length
    );
    expect(event.timestamp).to.equal(gateCleared.timestamp);

    for (let i = 0; i < gateCleared.gateSignatures.length; i++) {
      expect(event.gateSignatures[i]).to.equal(gateCleared.gateSignatures[i]);
    }

    for (let i = 0; i < gateCleared.monsterReward.monsterIds.length; i++) {
      expect(event.monsterReward.monsterIds[i]).to.equal(
        gateCleared.monsterReward.monsterIds[i]
      );
      expect(event.monsterReward.monsterAmounts[i]).to.equal(
        gateCleared.monsterReward.monsterAmounts[i]
      );
    }

    for (
      let i = 0;
      i < gateCleared.seasonPackReward.seasonPackIds.length;
      i++
    ) {
      expect(event.seasonPackReward.seasonPackIds[i]).to.equal(
        gateCleared.seasonPackReward.seasonPackIds[i]
      );
      expect(event.seasonPackReward.seasonPackAmounts[i]).to.equal(
        gateCleared.seasonPackReward.seasonPackAmounts[i]
      );
    }
  };

  const generateGateCleared = async (
    hunter: string,
    nonce: number,
    gateRank: RankType
  ) => {
    const gateRewardPerRank = await dungeonGate.getGateRewardPerRank();
    const rewards = gateRewardPerRank[gateRank].rewardTokens;

    const gateSignatures = [];
    const monsterReward: MonsterReward = {
      monsterIds: [],
      monsterAmounts: [],
    };
    const seasonPackReward: SeasonPackReward = {
      seasonPackIds: [],
      seasonPackAmounts: [],
    };

    // normal rank monster
    for (let i = 0; i < 6; i++) {
      const rewardToken = rewards[i];

      for (let j = 0; j < rewardToken; j++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [hunter, nonce]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const gateSignature = await randomSigner.signMessage(messageBinary);

        gateSignatures.push(gateSignature);

        const randomNumber = ethers.BigNumber.from(
          ethers.utils.solidityKeccak256(["bytes"], [gateSignature])
        );

        const monsterIds = await monsterFactory.getMonsterIdOfRankType(
          i,
          false
        );
        const convertedMonsterIds = monsterIds.map((m: BigNumber) =>
          m.toNumber()
        );
        const modNumber = randomNumber.mod(monsterIds.length).toNumber();

        const monsterId = convertedMonsterIds[modNumber];
        const monsterIdx = monsterReward.monsterIds.findIndex(
          (m) => m === monsterId
        );
        if (monsterIdx === -1) {
          monsterReward.monsterIds.push(monsterId);
          monsterReward.monsterAmounts.push(1);
        } else {
          monsterReward.monsterAmounts[monsterIdx] += 1;
        }

        nonce += 1;
      }
    }

    // season pack
    for (let i = 0; i < rewards[6]; i++) {
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256"],
        [hunter, nonce]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const gateSignature = await randomSigner.signMessage(messageBinary);

      gateSignatures.push(gateSignature);

      const randomNumber = ethers.BigNumber.from(
        ethers.utils.solidityKeccak256(["bytes"], [gateSignature])
      );

      const seasonPackIds = await season1SeasonPack.getOpenTokens();
      const convertedSeasonPackIds = seasonPackIds.map((s: BigNumber) =>
        s.toNumber()
      );
      const modNumber = randomNumber.mod(seasonPackIds.length).toNumber();

      const seasonPackId = convertedSeasonPackIds[modNumber];
      const seasonPackIdx = seasonPackReward.seasonPackIds.findIndex(
        (s) => s === seasonPackId
      );
      if (seasonPackIdx === -1) {
        seasonPackReward.seasonPackIds.push(seasonPackId);
        seasonPackReward.seasonPackAmounts.push(1);
      } else {
        seasonPackReward.seasonPackAmounts[seasonPackIdx] += 1;
      }

      nonce += 1;
    }

    return {
      gateSignatures,
      nonce,
      monsterReward,
      seasonPackReward,
    };
  };

  before(async () => {
    [
      operatorMaster,
      operatorManager,
      notOperator,
      creator,
      randomSigner,
      hunter2,
      hunter1,
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

    // deploy season
    const SLSeason = await ethers.getContractFactory("SLSeason");
    season = await upgrades.deployProxy(
      SLSeason,
      [project.address, monsterFactory.address, 2, 3],
      {
        kind: "uups",
      }
    );
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
      [season.address],
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
      [season.address],
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
    it("Get Gate Block Per Rank", async () => {
      const gateBlocks = await dungeonGate.getGateBlockPerRank();

      expect(gateBlocks[RankType.E]).to.equal(24);
      expect(gateBlocks[RankType.D]).to.equal(720);
      expect(gateBlocks[RankType.C]).to.equal(1440);
      expect(gateBlocks[RankType.B]).to.equal(2880);
      expect(gateBlocks[RankType.A]).to.equal(5760);
      expect(gateBlocks[RankType.S]).to.equal(11520);
    });

    it("Get Slot Per Hunter Rank", async () => {
      const slots = await dungeonGate.getSlotPerHunterRank();

      expect(slots[RankType.E]).to.equal(1);
      expect(slots[RankType.D]).to.equal(1);
      expect(slots[RankType.C]).to.equal(2);
      expect(slots[RankType.B]).to.equal(2);
      expect(slots[RankType.A]).to.equal(3);
      expect(slots[RankType.S]).to.equal(4);
    });

    it("Get Gate Reward Per Rank", async () => {
      const gateRewardPerRank = await dungeonGate.getGateRewardPerRank();
      const seasonPackIndex = 6;

      const ERankReward = gateRewardPerRank[RankType.E].rewardTokens;
      expect(ERankReward[RankType.E]).to.equal(3);
      expect(ERankReward[RankType.D]).to.equal(0);
      expect(ERankReward[RankType.C]).to.equal(0);
      expect(ERankReward[RankType.B]).to.equal(0);
      expect(ERankReward[RankType.A]).to.equal(0);
      expect(ERankReward[RankType.S]).to.equal(0);
      expect(ERankReward[seasonPackIndex]).to.equal(1);

      const DRankReward = gateRewardPerRank[RankType.D].rewardTokens;
      expect(DRankReward[StoneType.E]).to.equal(4);
      expect(DRankReward[StoneType.D]).to.equal(2);
      expect(DRankReward[StoneType.C]).to.equal(0);
      expect(DRankReward[StoneType.B]).to.equal(0);
      expect(DRankReward[StoneType.A]).to.equal(0);
      expect(DRankReward[StoneType.S]).to.equal(0);
      expect(DRankReward[seasonPackIndex]).to.equal(2);

      const CRankReward = gateRewardPerRank[RankType.C].rewardTokens;
      expect(CRankReward[StoneType.E]).to.equal(5);
      expect(CRankReward[StoneType.D]).to.equal(3);
      expect(CRankReward[StoneType.C]).to.equal(2);
      expect(CRankReward[StoneType.B]).to.equal(0);
      expect(CRankReward[StoneType.A]).to.equal(0);
      expect(CRankReward[StoneType.S]).to.equal(0);
      expect(CRankReward[seasonPackIndex]).to.equal(3);

      const BRankReward = gateRewardPerRank[RankType.B].rewardTokens;
      expect(BRankReward[StoneType.E]).to.equal(6);
      expect(BRankReward[StoneType.D]).to.equal(4);
      expect(BRankReward[StoneType.C]).to.equal(3);
      expect(BRankReward[StoneType.B]).to.equal(2);
      expect(BRankReward[StoneType.A]).to.equal(0);
      expect(BRankReward[StoneType.S]).to.equal(0);
      expect(BRankReward[seasonPackIndex]).to.equal(4);

      const ARankReward = gateRewardPerRank[RankType.A].rewardTokens;
      expect(ARankReward[StoneType.E]).to.equal(7);
      expect(ARankReward[StoneType.D]).to.equal(5);
      expect(ARankReward[StoneType.C]).to.equal(4);
      expect(ARankReward[StoneType.B]).to.equal(3);
      expect(ARankReward[StoneType.A]).to.equal(2);
      expect(ARankReward[StoneType.S]).to.equal(0);
      expect(ARankReward[seasonPackIndex]).to.equal(5);

      const SRankReward = gateRewardPerRank[RankType.S].rewardTokens;
      expect(SRankReward[StoneType.E]).to.equal(8);
      expect(SRankReward[StoneType.D]).to.equal(6);
      expect(SRankReward[StoneType.C]).to.equal(5);
      expect(SRankReward[StoneType.B]).to.equal(4);
      expect(SRankReward[StoneType.A]).to.equal(3);
      expect(SRankReward[StoneType.S]).to.equal(2);
      expect(SRankReward[seasonPackIndex]).to.equal(6);
    });

    it("Enter to Gate : Success : Key Owner", async () => {
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

      GateCreatedEvent = {
        seasonId: 0,
        gateRank: RankType.E,
        hunter: hunter1.address,
        gateId: 1,
        startBlock: enterToGateTx.blockNumber,
        endBlock: enterToGateTx.blockNumber + gateBloks[RankType.E],
      };

      await expect(enterToGateTx)
        .to.emit(dungeonGate, "GateCreated")
        .withArgs(
          GateCreatedEvent.seasonId,
          GateCreatedEvent.gateRank,
          GateCreatedEvent.hunter,
          GateCreatedEvent.gateId,
          GateCreatedEvent.startBlock,
          GateCreatedEvent.endBlock
        );

      const isExist = await dungeonGate.isExistGateById(gateId);
      expect(isExist).to.equal(true);

      const gateHunter = await dungeonGate.getGateHunter(gateId);
      expect(gateHunter).to.equal(hunter1.address);

      const gate = await dungeonGate.getGateById(gateId);
      expect(gate.startBlock).to.equal(enterToGateTx.blockNumber);
      expect(gate.endBlock).to.equal(
        enterToGateTx.blockNumber + gateBloks[RankType.E]
      );

      const currentBlock = await getCurrentBlockNumber();
      const remainingBlock = await dungeonGate.getGateRemainingBlock(gateId);
      expect(remainingBlock).to.equal(
        enterToGateTx.blockNumber + gateBloks[RankType.E] - currentBlock
      );

      const required =
        remainingBlock % boostBlockCount === 0
          ? remainingBlock / boostBlockCount
          : Math.floor(remainingBlock / boostBlockCount) + 1;
      const requiredStone = await dungeonGate.getRequiredStoneForClear(gateId);
      expect(requiredStone).to.equal(required);

      const isClear = await dungeonGate.isClearGate(gateId);
      expect(isClear).to.equal(false);

      const gateCountOfSeason = await dungeonGate.getGateCountOfSeason(
        0,
        hunter1.address
      );
      expect(gateCountOfSeason).to.equal(1);

      const hunterSlot = await dungeonGate.getHunterSlot(0, hunter1.address);
      expect(hunterSlot.availableSlot).to.equal(1);
      expect(hunterSlot.usingSlot).to.equal(1);

      const usingSlot = await dungeonGate.getHunterUsingSlot(hunter1.address);
      expect(usingSlot).to.equal(1);

      const gateIds = await dungeonGate.getGateIdOfHunterSlot(hunter1.address);
      expect(gateIds.length).to.equal(1);
      expect(gateIds[0]).to.equal(1);

      const gates = await dungeonGate.getGateOfHunterSlot(hunter1.address);
      expect(gates.gateOfHunterSlot.length).to.equal(1);
      expect(gates.gateOfHunterSlot[0].id).to.equal(1);
      expect(gates.requiredStones[0]).to.equal(required);

      const keyBalance = await gateKey.balanceOf(hunter1.address, RankType.E);
      expect(keyBalance).to.equal(0);
    });

    it("Enter To Gate : Failed : Invalid Price : Buy Key", async () => {
      const enterToGateTx = dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.E, { value: 100 });

      await expect(enterToGateTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidPrice"
      );
    });

    it("Enter To Gate : Failed : Insufficient Allowance : Other Key Owner", async () => {
      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, RankType.D, 1);
      await mintKeyTx.wait();

      const enterToGateTx = dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.E);

      await expect(enterToGateTx).to.revertedWith(
        "ERC20: insufficient allowance"
      );

      const burnTx = await gateKey
        .connect(hunter1)
        .burn(hunter1.address, RankType.D, 1);
      await burnTx.wait();
    });

    it("Enter To Gate : Failed : Invalid Price : Key Owner", async () => {
      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, RankType.E, 1);
      await mintKeyTx.wait();

      const enterToGateTx = dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.E, { value: ethers.utils.parseEther("1") });

      await expect(enterToGateTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidPrice"
      );
    });

    it("Enter To Gate : Failed : Not Approve", async () => {
      const approveTx = await gateKey
        .connect(hunter1)
        .setApprovalForAll(dungeonGate.address, false);
      await approveTx.wait();

      const enterToGateTx = dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.E);

      await expect(enterToGateTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await gateKey
        .connect(hunter1)
        .setApprovalForAll(dungeonGate.address, true);
      await approveTx2.wait();
    });

    it("Enter To Gate : Failed : Invalid Season Id", async () => {
      const enterToGateTx = dungeonGate
        .connect(hunter1)
        .enterToGate(1, RankType.E);

      await expect(enterToGateTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidSeasonId"
      );
    });

    it("Enter To Gate : Failed : Invalid Rank Type", async () => {
      const enterToGateTx = dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.D);

      await expect(enterToGateTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidRankType"
      );
    });

    it("Enter To Gate : Failed : Exceed Gate Slot", async () => {
      const enterToGateTx = dungeonGate
        .connect(hunter1)
        .enterToGate(0, RankType.E);

      await expect(enterToGateTx).to.revertedWithCustomError(
        dungeonGate,
        "ExceedGateSlot"
      );

      const burnTx = await gateKey
        .connect(hunter1)
        .burn(hunter1.address, RankType.E, 1);
      await burnTx.wait();
    });

    it("Clear Gate : Success : E Rank : Clear", async () => {
      await setNextBlockNumber(10);

      const { gateSignatures, nonce, monsterReward, seasonPackReward } =
        await generateGateCleared(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          RankType.E
        );

      const clearGateTx = await dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);
      const receipt = await clearGateTx.wait();

      const timestamp = await getBlockTimestamp(clearGateTx.blockNumber);

      GateClearedEvent = {
        gateRank: RankType.E,
        hunter: hunter1.address,
        gateId: gateId,
        seasonId: 0,
        usedStone: 0,
        gateSignatures,
        monsterReward,
        seasonPackReward,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "GateCleared");
      gateClearedEventChecker(event, GateClearedEvent);

      const isClear = await dungeonGate.isClearGate(gateId);
      expect(isClear).to.equal(true);

      const currentHunterNonce = await random.getNonce(hunter1.address);
      expect(currentHunterNonce).to.equal(nonce);
    });

    it("Enter To Gate : Buy Key : PriceMode.USD : Clear Gate : Success : D Rank : Boost", async () => {
      await setNextBlockNumber(800); // season 1

      const hunterRankMintTx = await season1HunterRank.mintOfTest(
        hunter1.address,
        RankType.D,
        1
      );
      await hunterRankMintTx.wait();

      const usdcMintTx = await testUSDC
        .connect(hunter1)
        .mint(hunter1.address, usdPrices[RankType.D]);
      await usdcMintTx.wait();

      const usdcApproveTx = await testUSDC
        .connect(hunter1)
        .approve(dungeonGate.address, usdPrices[RankType.D]);
      await usdcApproveTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(1, RankType.D);

      const timestamp = await getBlockTimestamp(enterToGateTx.blockNumber);

      KeySoldEvent = {
        buyer: dungeonGate.address,
        to: hunter1.address,
        keyRank: RankType.D,
        amount: 1,
        price: BigNumber.from(usdPrices[RankType.D]),
        timestamp,
      };

      await expect(enterToGateTx)
        .to.emit(shop, "KeySold")
        .withArgs(
          KeySoldEvent.buyer,
          KeySoldEvent.to,
          KeySoldEvent.keyRank,
          KeySoldEvent.amount,
          KeySoldEvent.price,
          KeySoldEvent.timestamp
        );

      const usdcBalance = await testUSDC.balanceOf(hunter1.address);
      expect(usdcBalance).to.equal(0);

      const shopBalance = await shop.getBalance(PriceMode.USD);
      expect(shopBalance).to.equal(usdPrices[RankType.D]);

      gateId = 2;

      // stone setting
      const requiredStone = await dungeonGate.getRequiredStoneForClear(gateId);
      expect(requiredStone).to.equal(gateBloks[RankType.D] / boostBlockCount);

      const mintTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintTx.wait();

      const approveTx = await essenceStone
        .connect(hunter1)
        .setApprovalForAll(dungeonGate.address, true);
      await approveTx.wait();

      // clear
      const { gateSignatures, nonce, monsterReward, seasonPackReward } =
        await generateGateCleared(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          RankType.D
        );

      const clearGateTx = await dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);
      const receipt = await clearGateTx.wait();

      const timestamp2 = await getBlockTimestamp(clearGateTx.blockNumber);

      GateClearedEvent = {
        gateRank: RankType.D,
        hunter: hunter1.address,
        gateId: gateId,
        seasonId: 1,
        usedStone: requiredStone,
        gateSignatures,
        monsterReward,
        seasonPackReward,
        timestamp: timestamp2,
      };

      const event = getEventArgs(receipt.events, "GateCleared");
      gateClearedEventChecker(event, GateClearedEvent);

      const isClear = await dungeonGate.isClearGate(gateId);
      expect(isClear).to.equal(true);

      const currentHunterNonce = await random.getNonce(hunter1.address);
      expect(currentHunterNonce).to.equal(nonce);
    });

    it("Enter To Gate : Buy Key : PriceMode.MATIC : Clear Gate : Success : C Rank : Clear", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.MATIC);
      await setPriceModeTx.wait();

      const hunterRankMintTx = await season1HunterRank.mintOfTest(
        hunter1.address,
        RankType.C,
        1
      );
      await hunterRankMintTx.wait(); // hunter1 availableSlot 2

      const { currentPriceMode, price } = await shop.getLatestKeyPrice(
        RankType.C
      );
      expect(currentPriceMode).to.equal(PriceMode.MATIC);
      expect(price).to.equal(maticPrices[RankType.C]);

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(1, RankType.C, { value: price });

      const timestamp = await getBlockTimestamp(enterToGateTx.blockNumber);

      KeySoldEvent = {
        buyer: dungeonGate.address,
        to: hunter1.address,
        keyRank: RankType.C,
        amount: 1,
        price,
        timestamp,
      };

      await expect(enterToGateTx)
        .to.emit(shop, "KeySold")
        .withArgs(
          KeySoldEvent.buyer,
          KeySoldEvent.to,
          KeySoldEvent.keyRank,
          KeySoldEvent.amount,
          KeySoldEvent.price,
          KeySoldEvent.timestamp
        );

      const shopBalance = await shop.getBalance(PriceMode.MATIC);
      expect(shopBalance).to.equal(maticPrices[RankType.C]);

      gateId = 3;

      await setNextBlockNumber(1440);

      const { gateSignatures, nonce, monsterReward, seasonPackReward } =
        await generateGateCleared(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          RankType.C
        );

      const clearGateTx = await dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);
      const receipt = await clearGateTx.wait();

      const timestamp2 = await getBlockTimestamp(clearGateTx.blockNumber);

      GateClearedEvent = {
        gateRank: RankType.C,
        hunter: hunter1.address,
        gateId: gateId,
        seasonId: 1,
        usedStone: 0,
        gateSignatures,
        monsterReward,
        seasonPackReward,
        timestamp: timestamp2,
      };

      const event = getEventArgs(receipt.events, "GateCleared");
      gateClearedEventChecker(event, GateClearedEvent);

      const isClear = await dungeonGate.isClearGate(gateId);
      expect(isClear).to.equal(true);

      const currentHunterNonce = await random.getNonce(hunter1.address);
      expect(currentHunterNonce).to.equal(nonce);
    });

    it("Enter To Gate : Key Owner : Clear Gate : Success : B Rank : Clear", async () => {
      const hunterRankMintTx = await season1HunterRank.mintOfTest(
        hunter1.address,
        RankType.B,
        1
      );
      await hunterRankMintTx.wait(); // hunter1 availableSlot 2

      const mintKeyTx = await gateKey.mintKey(hunter1.address, RankType.B, 1);
      await mintKeyTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(1, RankType.B);
      await enterToGateTx.wait();

      gateId = 4;

      await setNextBlockNumber(2880);

      const { gateSignatures, nonce, monsterReward, seasonPackReward } =
        await generateGateCleared(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          RankType.B
        );

      const clearGateTx = await dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);
      const receipt = await clearGateTx.wait();

      const timestamp = await getBlockTimestamp(clearGateTx.blockNumber);

      GateClearedEvent = {
        gateRank: RankType.B,
        hunter: hunter1.address,
        gateId: gateId,
        seasonId: 1,
        usedStone: 0,
        gateSignatures,
        monsterReward,
        seasonPackReward,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "GateCleared");
      gateClearedEventChecker(event, GateClearedEvent);

      const isClear = await dungeonGate.isClearGate(gateId);
      expect(isClear).to.equal(true);

      const currentHunterNonce = await random.getNonce(hunter1.address);
      expect(currentHunterNonce).to.equal(nonce);
    });

    it("Clear Gate : Success : A Rank : Boost", async () => {
      const hunterRankMintTx = await season1HunterRank.mintOfTest(
        hunter1.address,
        RankType.A,
        1
      );
      await hunterRankMintTx.wait(); // hunter1 availableSlot 3

      const { price } = await shop.getLatestKeyPrice(RankType.A);

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(1, RankType.A, { value: price });
      await enterToGateTx.wait();

      gateId = 5;

      const requiredStone = await dungeonGate.getRequiredStoneForClear(gateId);
      expect(requiredStone).to.equal(gateBloks[RankType.A] / boostBlockCount);

      const mintTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintTx.wait();

      const { gateSignatures, nonce, monsterReward, seasonPackReward } =
        await generateGateCleared(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          RankType.A
        );

      const clearGateTx = await dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);
      const receipt = await clearGateTx.wait();

      const timestamp = await getBlockTimestamp(clearGateTx.blockNumber);

      GateClearedEvent = {
        gateRank: RankType.A,
        hunter: hunter1.address,
        gateId: gateId,
        seasonId: 1,
        usedStone: requiredStone,
        gateSignatures,
        monsterReward,
        seasonPackReward,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "GateCleared");
      gateClearedEventChecker(event, GateClearedEvent);

      const isClear = await dungeonGate.isClearGate(gateId);
      expect(isClear).to.equal(true);

      const currentHunterNonce = await random.getNonce(hunter1.address);
      expect(currentHunterNonce).to.equal(nonce);
    });

    it("Clear Gate : Success : S Rank : Clear", async () => {
      const hunterRankMintTx = await season1HunterRank.mintOfTest(
        hunter1.address,
        RankType.S,
        1
      );
      await hunterRankMintTx.wait(); // hunter 1 availableSlot 4

      const { price } = await shop.getLatestKeyPrice(RankType.S);

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(1, RankType.S, { value: price });
      await enterToGateTx.wait();

      gateId = 6;

      await setNextBlockNumber(11520);

      const { gateSignatures, nonce, monsterReward, seasonPackReward } =
        await generateGateCleared(
          hunter1.address,
          Number(await random.getNonce(hunter1.address)),
          RankType.S
        );

      const hunterArray = Array(monsterReward.monsterIds.length).fill(
        hunter1.address
      );
      const hunterArray2 = Array(seasonPackReward.seasonPackIds.length).fill(
        hunter1.address
      );

      const beforeNormalBalance = await normalMonster.balanceOfBatch(
        hunterArray,
        monsterReward.monsterIds
      );
      const beforeSeasonPackBalance = await season1SeasonPack.balanceOfBatch(
        hunterArray2,
        seasonPackReward.seasonPackIds
      );

      const clearGateTx = await dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);
      const receipt = await clearGateTx.wait();

      const timestamp = await getBlockTimestamp(clearGateTx.blockNumber);

      GateClearedEvent = {
        gateRank: RankType.S,
        hunter: hunter1.address,
        gateId: gateId,
        seasonId: 1,
        usedStone: 0,
        gateSignatures,
        monsterReward,
        seasonPackReward,
        timestamp,
      };

      const event = getEventArgs(receipt.events, "GateCleared");
      gateClearedEventChecker(event, GateClearedEvent);

      const isClear = await dungeonGate.isClearGate(gateId);
      expect(isClear).to.equal(true);

      const currentHunterNonce = await random.getNonce(hunter1.address);
      expect(currentHunterNonce).to.equal(nonce);

      const gateCountOfSeason = await dungeonGate.getGateCountOfSeason(
        1,
        hunter1.address
      );
      expect(gateCountOfSeason).to.equal(5);

      const afterNormalBalance = await normalMonster.balanceOfBatch(
        hunterArray,
        monsterReward.monsterIds
      );
      const afterSeasonPackBalance = await season1SeasonPack.balanceOfBatch(
        hunterArray2,
        seasonPackReward.seasonPackIds
      );

      for (let i = 0; i < beforeNormalBalance.length; i++) {
        expect(afterNormalBalance[i]).to.equal(
          beforeNormalBalance[i].add(monsterReward.monsterAmounts[i])
        );
      }

      for (let i = 0; i < beforeSeasonPackBalance.length; i++) {
        expect(afterSeasonPackBalance[i]).to.equal(
          beforeSeasonPackBalance[i].add(seasonPackReward.seasonPackAmounts[i])
        );
      }
    });

    it("Clear Gate : Failed : Already Clear Gate", async () => {
      const clearGateTx = dungeonGate.connect(hunter1).clearGate(gateId, []);

      await expect(clearGateTx).to.revertedWithCustomError(
        dungeonGate,
        "AlreadyClearGate"
      );
    });

    it("Clear Gate : Failed : Invalid Gate Signature", async () => {
      const { price } = await shop.getLatestKeyPrice(RankType.S);

      const enterToGateTx = await dungeonGate
        .connect(hunter1)
        .enterToGate(1, RankType.S, { value: price });
      await enterToGateTx.wait();

      gateId = 7;

      const clearGateTx = dungeonGate.connect(hunter1).clearGate(gateId, []);

      await expect(clearGateTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidGateSignature"
      );
    });

    it("Clear Gate : Failed : Invalid Gate Id", async () => {
      const clearGateTx = dungeonGate.connect(hunter2).clearGate(gateId, []);

      await expect(clearGateTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidGateId"
      );
    });

    it("Clear Gate : Failed : Not Approve", async () => {
      // gateId 7 s rank
      const { gateSignatures } = await generateGateCleared(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        RankType.S
      );

      const approveTx = await essenceStone
        .connect(hunter1)
        .setApprovalForAll(dungeonGate.address, false);
      await approveTx.wait();

      const clearGateTx = dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);

      await expect(clearGateTx).to.revertedWith(
        "ERC1155: caller is not token owner nor approved"
      );

      const approveTx2 = await essenceStone
        .connect(hunter1)
        .setApprovalForAll(dungeonGate.address, true);
      await approveTx2.wait();
    });

    it("Clear Gate : Failed : Not Enough Token Balance", async () => {
      // gateId 7 s rank
      const { gateSignatures } = await generateGateCleared(
        hunter1.address,
        Number(await random.getNonce(hunter1.address)),
        RankType.S
      );

      const clearGateTx = dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);

      await expect(clearGateTx).to.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );
    });

    it("Clear Gate : Failed : Random Signature Verify Failed", async () => {
      // gateId 7 s rank
      const { gateSignatures } = await generateGateCleared(
        hunter2.address,
        Number(await random.getNonce(hunter1.address)),
        RankType.S
      );

      const requiredStone = await dungeonGate.getRequiredStoneForClear(gateId);

      const mintTx = await essenceStone.mintOfTest(
        hunter1.address,
        essenceStoneTokenId,
        requiredStone
      );
      await mintTx.wait();

      const clearGateTx = dungeonGate
        .connect(hunter1)
        .clearGate(gateId, gateSignatures);

      await expect(clearGateTx).to.revertedWithCustomError(
        random,
        "RandomSignatureVerifyFailed"
      );
    });

    it("Set Gate Block Per Rank : Success", async () => {
      const gateBlocks = [10, 20, 30, 40, 50, 60];

      const setGateBlockPerRankTx = await dungeonGate.setGateBlockPerRank(
        gateBlocks
      );
      await setGateBlockPerRankTx.wait();

      const newGateBlocks = await dungeonGate.getGateBlockPerRank();

      expect(newGateBlocks[RankType.E]).to.equal(10);
      expect(newGateBlocks[RankType.D]).to.equal(20);
      expect(newGateBlocks[RankType.C]).to.equal(30);
      expect(newGateBlocks[RankType.B]).to.equal(40);
      expect(newGateBlocks[RankType.A]).to.equal(50);
      expect(newGateBlocks[RankType.S]).to.equal(60);
    });

    it("Set Gate Block Per Rank : Failed : Only Operator", async () => {
      const gateBlocks = [10, 20, 30, 40, 50, 60];

      const setGateBlockPerRankTx = dungeonGate
        .connect(notOperator)
        .setGateBlockPerRank(gateBlocks);

      await expect(setGateBlockPerRankTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set Gate Reward Per Rank : Success", async () => {
      const rewards = [
        { rewardTokens: [10, 0, 0, 0, 0, 0, 0] },
        { rewardTokens: [0, 10, 0, 0, 0, 0, 0] },
        { rewardTokens: [0, 0, 10, 0, 0, 0, 0] },
        { rewardTokens: [0, 0, 0, 10, 0, 0, 0] },
        { rewardTokens: [0, 0, 0, 0, 10, 0, 0] },
        { rewardTokens: [0, 0, 0, 0, 0, 10, 0] },
      ];

      const setGateRewardPerRankTx = await dungeonGate.setGateRewardPerRank(
        rewards
      );
      await setGateRewardPerRankTx.wait();

      const newRewards = await dungeonGate.getGateRewardPerRank();

      const ERankPercentages = newRewards[RankType.E].rewardTokens;
      expect(ERankPercentages[StoneType.E]).to.equal(10);
      expect(ERankPercentages[StoneType.D]).to.equal(0);
      expect(ERankPercentages[StoneType.C]).to.equal(0);
      expect(ERankPercentages[StoneType.B]).to.equal(0);
      expect(ERankPercentages[StoneType.A]).to.equal(0);
      expect(ERankPercentages[StoneType.S]).to.equal(0);
      expect(ERankPercentages[6]).to.equal(0);

      const DRankPercentages = newRewards[RankType.D].rewardTokens;
      expect(DRankPercentages[StoneType.E]).to.equal(0);
      expect(DRankPercentages[StoneType.D]).to.equal(10);
      expect(DRankPercentages[StoneType.C]).to.equal(0);
      expect(DRankPercentages[StoneType.B]).to.equal(0);
      expect(DRankPercentages[StoneType.A]).to.equal(0);
      expect(DRankPercentages[StoneType.S]).to.equal(0);
      expect(DRankPercentages[6]).to.equal(0);

      const CRankPercentages = newRewards[RankType.C].rewardTokens;
      expect(CRankPercentages[StoneType.E]).to.equal(0);
      expect(CRankPercentages[StoneType.D]).to.equal(0);
      expect(CRankPercentages[StoneType.C]).to.equal(10);
      expect(CRankPercentages[StoneType.B]).to.equal(0);
      expect(CRankPercentages[StoneType.A]).to.equal(0);
      expect(CRankPercentages[StoneType.S]).to.equal(0);
      expect(CRankPercentages[6]).to.equal(0);

      const BRankPercentages = newRewards[RankType.B].rewardTokens;
      expect(BRankPercentages[StoneType.E]).to.equal(0);
      expect(BRankPercentages[StoneType.D]).to.equal(0);
      expect(BRankPercentages[StoneType.C]).to.equal(0);
      expect(BRankPercentages[StoneType.B]).to.equal(10);
      expect(BRankPercentages[StoneType.A]).to.equal(0);
      expect(BRankPercentages[StoneType.S]).to.equal(0);
      expect(BRankPercentages[6]).to.equal(0);

      const ARankPercentages = newRewards[RankType.A].rewardTokens;
      expect(ARankPercentages[StoneType.E]).to.equal(0);
      expect(ARankPercentages[StoneType.D]).to.equal(0);
      expect(ARankPercentages[StoneType.C]).to.equal(0);
      expect(ARankPercentages[StoneType.B]).to.equal(0);
      expect(ARankPercentages[StoneType.A]).to.equal(10);
      expect(ARankPercentages[StoneType.S]).to.equal(0);
      expect(ARankPercentages[6]).to.equal(0);

      const SRankPercentages = newRewards[RankType.S].rewardTokens;
      expect(SRankPercentages[StoneType.E]).to.equal(0);
      expect(SRankPercentages[StoneType.D]).to.equal(0);
      expect(SRankPercentages[StoneType.C]).to.equal(0);
      expect(SRankPercentages[StoneType.B]).to.equal(0);
      expect(SRankPercentages[StoneType.A]).to.equal(0);
      expect(SRankPercentages[StoneType.S]).to.equal(10);
      expect(SRankPercentages[6]).to.equal(0);
    });

    it("Set Gate Reward Per Rank : Failed : Only Operator", async () => {
      const rewards = [
        { rewardTokens: [10, 0, 0, 0, 0, 0, 0] },
        { rewardTokens: [0, 10, 0, 0, 0, 0, 0] },
        { rewardTokens: [0, 0, 10, 0, 0, 0, 0] },
        { rewardTokens: [0, 0, 0, 10, 0, 0, 0] },
        { rewardTokens: [0, 0, 0, 0, 10, 0, 0] },
        { rewardTokens: [0, 0, 0, 0, 0, 10, 0] },
      ];

      const setGateRewardPerRankTx = dungeonGate
        .connect(notOperator)
        .setGateRewardPerRank(rewards);

      await expect(setGateRewardPerRankTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set Boost Block Count : Success", async () => {
      const setBoostBlockCountTx = await dungeonGate.setBoostBlockCount(500);
      await setBoostBlockCountTx.wait();

      const boostBlockCount = await dungeonGate.getBoostBlockCount();

      expect(boostBlockCount).to.equal(500);
    });

    it("Set Boost Block Count : Failed : Only Operator", async () => {
      const setBoostBlockCountTx = dungeonGate
        .connect(notOperator)
        .setBoostBlockCount(500);

      await expect(setBoostBlockCountTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set Boost Block Count : Failed : Invalid Argument", async () => {
      const setBoostBlockCountTx = dungeonGate.setBoostBlockCount(0);

      await expect(setBoostBlockCountTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidArgument"
      );
    });
  });

  //////////
  // Slot //
  //////////

  describe("Slot", async () => {
    it("Enter to Gate : Rank Slot", async () => {
      const seasonId = 1;

      const hunterSlot = await dungeonGate.getHunterSlot(
        seasonId,
        hunter2.address
      );
      expect(hunterSlot.availableSlot).to.equal(1);
      expect(hunterSlot.usingSlot).to.equal(0);

      const approveTx = await gateKey
        .connect(hunter2)
        .setApprovalForAll(dungeonGate.address, true);
      await approveTx.wait();

      const mintKeyTx = await gateKey.mintKey(hunter2.address, RankType.E, 1);
      await mintKeyTx.wait();

      const enterToGateTx = await dungeonGate
        .connect(hunter2)
        .enterToGate(seasonId, RankType.E);
      await enterToGateTx.wait();

      const dRankMintTx = await season1HunterRank.mintOfTest(
        hunter2.address,
        RankType.D,
        1
      );
      await dRankMintTx.wait();

      const hunterSlot2 = await dungeonGate.getHunterSlot(
        seasonId,
        hunter2.address
      );
      expect(hunterSlot2.availableSlot).to.equal(1);
      expect(hunterSlot2.usingSlot).to.equal(1);

      const cRankMintTx = await season1HunterRank.mintOfTest(
        hunter2.address,
        RankType.C,
        1
      );
      await cRankMintTx.wait();

      const hunterSlot3 = await dungeonGate.getHunterSlot(
        seasonId,
        hunter2.address
      );
      expect(hunterSlot3.availableSlot).to.equal(2);
      expect(hunterSlot3.usingSlot).to.equal(1);

      const mintKeyTx2 = await gateKey.mintKey(hunter2.address, RankType.C, 1);
      await mintKeyTx2.wait();

      const enterToGateTx2 = await dungeonGate
        .connect(hunter2)
        .enterToGate(seasonId, RankType.C);
      await enterToGateTx2.wait();

      const bRankMintTx = await season1HunterRank.mintOfTest(
        hunter2.address,
        RankType.B,
        1
      );
      await bRankMintTx.wait();

      const hunterSlot4 = await dungeonGate.getHunterSlot(
        seasonId,
        hunter2.address
      );
      expect(hunterSlot4.availableSlot).to.equal(2);
      expect(hunterSlot4.usingSlot).to.equal(2);

      const aRankMintTx = await season1HunterRank.mintOfTest(
        hunter2.address,
        RankType.A,
        1
      );
      await aRankMintTx.wait();

      const hunterSlot5 = await dungeonGate.getHunterSlot(
        seasonId,
        hunter2.address
      );
      expect(hunterSlot5.availableSlot).to.equal(3);
      expect(hunterSlot5.usingSlot).to.equal(2);

      const sRankMintTx = await season1HunterRank.mintOfTest(
        hunter2.address,
        RankType.S,
        1
      );
      await sRankMintTx.wait();

      const hunterSlot6 = await dungeonGate.getHunterSlot(
        seasonId,
        hunter2.address
      );
      expect(hunterSlot6.availableSlot).to.equal(4);
      expect(hunterSlot6.usingSlot).to.equal(2);
    });

    it("Set Slot Per Hunter Rank : Success", async () => {
      const slots = [1, 1, 2, 3, 3, 4];

      const setSlotPerHunterRankTx = await dungeonGate.setSlotPerHunterRank(
        slots
      );
      await setSlotPerHunterRankTx.wait();

      const newSlots = await dungeonGate.getSlotPerHunterRank();

      expect(newSlots[RankType.E]).to.equal(1);
      expect(newSlots[RankType.D]).to.equal(1);
      expect(newSlots[RankType.C]).to.equal(2);
      expect(newSlots[RankType.B]).to.equal(3);
      expect(newSlots[RankType.A]).to.equal(3);
      expect(newSlots[RankType.S]).to.equal(4);
    });

    it("Set Slot Per Hunter Rank : Failed : Only Operator", async () => {
      const slots = [1, 1, 2, 3, 3, 4];

      const setSlotPerHunterRankTx = dungeonGate
        .connect(notOperator)
        .setSlotPerHunterRank(slots);

      await expect(setSlotPerHunterRankTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set Slot Per Hunter Rank : Failed : Invalid Slot", async () => {
      const slots = [1, 1, 2, 3, 0, 4];
      const setSlotPerHunterRankTx = dungeonGate.setSlotPerHunterRank(slots);

      await expect(setSlotPerHunterRankTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidSlot"
      );
    });
  });

  //////////
  // Base //
  //////////

  describe("Base", async () => {
    it("Set EssenceStone Collection Id : Success", async () => {
      const setEssenceStoneCollectionIdTx =
        await dungeonGate.setEssenceStoneCollectionId(2);
      await setEssenceStoneCollectionIdTx.wait();

      const essenceStoneCollectionId =
        await dungeonGate.getEssenceStoneCollectionId();
      expect(essenceStoneCollectionId).to.equal(2);
    });

    it("Set EssenceStone Collection Id : Failed : Only Operator", async () => {
      const setEssenceStoneCollectionIdTx = dungeonGate
        .connect(notOperator)
        .setEssenceStoneCollectionId(2);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set EssenceStone Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
      const setEssenceStoneCollectionIdTx =
        dungeonGate.setEssenceStoneCollectionId(200);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );
    });

    it("Set EssenceStone Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(2, false);
      await setCollectionActiveTx.wait();

      const setEssenceStoneCollectionIdTx =
        dungeonGate.setEssenceStoneCollectionId(2);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project.setCollectionActive(2, true);
      await setCollectionActiveTx2.wait();
    });

    it("Set EssenceStone Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
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
      await addCollectionTx.wait(); // collectionId 9

      const setEssenceStoneCollectionIdTx =
        dungeonGate.setEssenceStoneCollectionId(9);

      await expect(setEssenceStoneCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );
    });

    it("Set GateKey Collection Id : Success", async () => {
      const setGateKeyCollectionIdTx = await dungeonGate.setGateKeyCollectionId(
        2
      );
      await setGateKeyCollectionIdTx.wait();

      const gateKeyCollectionId = await dungeonGate.getGateKeyCollectionId();
      expect(gateKeyCollectionId).to.equal(2);
    });

    it("Set GateKey Collection Id : Failed : Only Operator", async () => {
      const setGateKeyCollectionIdTx = dungeonGate
        .connect(notOperator)
        .setGateKeyCollectionId(2);

      await expect(setGateKeyCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set GateKey Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
      const setGateKeyCollectionIdTx = dungeonGate.setGateKeyCollectionId(200);

      await expect(setGateKeyCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );
    });

    it("Set GateKey Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(2, false);
      await setCollectionActiveTx.wait();

      const setGateKeyCollectionIdTx = dungeonGate.setGateKeyCollectionId(2);

      await expect(setGateKeyCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project.setCollectionActive(2, true);
      await setCollectionActiveTx2.wait();
    });

    it("Set GateKey Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
      const setGateKeyCollectionIdTx = dungeonGate.setGateKeyCollectionId(9);

      await expect(setGateKeyCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );
    });

    it("Set Normal Monster Collection Id : Success", async () => {
      const setNormalMonsterCollectionIdTx =
        await dungeonGate.setNormalMonsterCollectionId(2);
      await setNormalMonsterCollectionIdTx.wait();

      const monsterCollectionId =
        await dungeonGate.getNormalMonsterCollectionId();
      expect(monsterCollectionId).to.equal(2);
    });

    it("Set Normal Monster Collection Id : Failed : Only Operator", async () => {
      const setNormalMonsterCollectionIdTx = dungeonGate
        .connect(notOperator)
        .setNormalMonsterCollectionId(2);

      await expect(setNormalMonsterCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set Normal Monster Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
      const setNormalMonsterCollectionIdTx =
        dungeonGate.setNormalMonsterCollectionId(200);

      await expect(setNormalMonsterCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );
    });

    it("Set Normal Monster Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(2, false);
      await setCollectionActiveTx.wait();

      const setNormalMonsterCollectionIdTx =
        dungeonGate.setNormalMonsterCollectionId(2);

      await expect(setNormalMonsterCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );

      const setCollectionActiveTx2 = await project.setCollectionActive(2, true);
      await setCollectionActiveTx2.wait();
    });

    it("Set Normal Monster Collection Id : Failed : Invalid Collection Id : Not ERC1155", async () => {
      const setNormalMonsterCollectionIdTx =
        dungeonGate.setNormalMonsterCollectionId(9);

      await expect(setNormalMonsterCollectionIdTx).to.revertedWithCustomError(
        dungeonGate,
        "InvalidCollectionId"
      );
    });

    it("Set Season Contract : Success", async () => {
      const setSeasonContractTx = await dungeonGate.setSeasonContract(
        project.address
      );
      await setSeasonContractTx.wait();

      const seasonContract = await dungeonGate.getSeasonContract();
      expect(seasonContract).to.equal(project.address);
    });

    it("Set Season Contract : Failed : Only Operator", async () => {
      const setSeasonContractTx = dungeonGate
        .connect(notOperator)
        .setSeasonContract(project.address);

      await expect(setSeasonContractTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set Random Contract : Success", async () => {
      const setRandomContractTx = await dungeonGate.setRandomContract(
        project.address
      );
      await setRandomContractTx.wait();

      const randomContract = await dungeonGate.getRandomContract();
      expect(randomContract).to.equal(project.address);
    });

    it("Set Random Contract : Failed : Only Operator", async () => {
      const setRandomContractTx = dungeonGate
        .connect(notOperator)
        .setRandomContract(project.address);

      await expect(setRandomContractTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set Shop Contract : Success", async () => {
      const setShopContractTx = await dungeonGate.setShopContract(
        project.address
      );
      await setShopContractTx.wait();

      const shopContract = await dungeonGate.getShopContract();
      expect(shopContract).to.equal(project.address);
    });

    it("Set Shop Contract : Failed : Only Operator", async () => {
      const setShopContractTx = dungeonGate
        .connect(notOperator)
        .setShopContract(project.address);

      await expect(setShopContractTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });

    it("Set MonsterFactory Contract : Success", async () => {
      const setMonsterFactoryContractTx =
        await dungeonGate.setMonsterFactoryContract(project.address);
      await setMonsterFactoryContractTx.wait();

      const monsterFactoryContract =
        await dungeonGate.getMonsterFactoryContract();
      expect(monsterFactoryContract).to.equal(project.address);
    });

    it("Set MonsterFactory Contract : Failed : Only Operator", async () => {
      const setMonsterFactoryContractTx = dungeonGate
        .connect(notOperator)
        .setMonsterFactoryContract(project.address);

      await expect(setMonsterFactoryContractTx).to.revertedWithCustomError(
        dungeonGate,
        "OnlyOperator"
      );
    });
  });
});
