import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import { getBlockTimestamp } from "./../helpers/block-timestamp";
import { Create, AchievementClaimed } from "../helpers/type/event";
import { RankType, AchievementType } from "../helpers/constant/contract";
import { Collection, CollectionSet } from "../helpers/type/contract";
import { ZERO_ADDRESS } from "../helpers/constant/common";

describe("Achievement", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    creator: SignerWithAddress,
    hunter1: SignerWithAddress,
    hunter2: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    monsterFactory: Contract,
    achievement: Contract,
    normalMonster: Contract,
    shadowMonster: Contract,
    shadowMonarch: Contract;

  let CreateEvent: Create, AchievementClaimedEvent: AchievementClaimed;

  let collection1: Collection,
    collection2: Collection,
    collectionSet: CollectionSet,
    achievementId: number;

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

    // deploy achievement
    const Achievement = await ethers.getContractFactory("SLAchievement");
    achievement = await upgrades.deployProxy(
      Achievement,
      [project.address, "baseTokenURI"],
      {
        kind: "uups",
      }
    );
    await achievement.deployed();
    console.log(`Achievement deployed to: ${achievement.address}`);

    // deploy normalMonster - collectionId 1
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

    // deploy shadowMonster - collectionId 2
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

    // add monster
    for (let i = 1; i <= 100; i++) {
      const addNormalMonsterTx = await monsterFactory.addMonster(
        RankType.E,
        false
      );
      await addNormalMonsterTx.wait();

      const addShadowMonsterTx = await monsterFactory.addMonster(
        RankType.B,
        true
      );
      await addShadowMonsterTx.wait();
    }
  });

  /////////////////
  // Achievement //
  /////////////////

  describe("Achievement", async () => {
    it("Name", async () => {
      expect(await achievement.name()).to.equal("Achievement");
    });

    it("Symbol", async () => {
      expect(await achievement.symbol()).to.equal("Achievement");
    });

    it("Add Achievement : Success : Collection", async () => {
      collection1 = {
        collectionId: 1,
        tokenIds: [1, 2, 3],
        amounts: [1, 1, 1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const addAchievementTx = await achievement.addAchievement(collectionSet);

      achievementId = 1;

      const timestamp = await getBlockTimestamp(addAchievementTx.blockNumber);

      CreateEvent = {
        target: "Achievement",
        targetId: achievementId,
        timestamp,
      };

      await expect(addAchievementTx)
        .to.emit(achievement, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );

      const achievementObj = await achievement.getAchievementById(
        achievementId
      );
      expect(achievementObj.achievementType).to.equal(
        AchievementType.Collection
      );
    });

    it("Add Achievement : Success : General", async () => {
      const addAchievementTx = await achievement.addAchievement({
        collections: [],
      });

      achievementId = 2;

      const timestamp = await getBlockTimestamp(addAchievementTx.blockNumber);

      CreateEvent = {
        target: "Achievement",
        targetId: achievementId,
        timestamp,
      };

      await expect(addAchievementTx)
        .to.emit(achievement, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );

      const achievementObj = await achievement.getAchievementById(
        achievementId
      );
      expect(achievementObj.achievementType).to.equal(AchievementType.General);
    });

    it("Add Achievement : Failed : Only Operator", async () => {
      const addAchievementTx = achievement
        .connect(notOperator)
        .addAchievement(collectionSet);

      await expect(addAchievementTx).to.revertedWithCustomError(
        achievement,
        "OnlyOperator"
      );
    });

    it("Add Achievement : Failed : Invalid Collection : Token Ids Length 0", async () => {
      collection1 = {
        collectionId: 1,
        tokenIds: [],
        amounts: [],
      };

      collectionSet = {
        collections: [collection1],
      };

      const addAchievementTx = achievement.addAchievement(collectionSet);

      await expect(addAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Add Achievement : Failed : Invalid Collection : Does Not Exist Collection", async () => {
      collection1 = {
        collectionId: 100,
        tokenIds: [1],
        amounts: [1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const addAchievementTx = achievement.addAchievement(collectionSet);

      await expect(addAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Add Achievement : Failed : Invalid Collection : Does Not Active Collection", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(1, false);
      await setCollectionActiveTx.wait();

      collection1 = {
        collectionId: 1,
        tokenIds: [1],
        amounts: [1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const addAchievementTx = achievement.addAchievement(collectionSet);

      await expect(addAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );

      const setCollectionActiveTx2 = await project.setCollectionActive(1, true);
      await setCollectionActiveTx2.wait();
    });

    it("Add Achievement : Failed : Invalid Collection : ERC1155 : Invalid Length", async () => {
      collection1 = {
        collectionId: 1,
        tokenIds: [1],
        amounts: [1, 1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const addAchievementTx = achievement.addAchievement(collectionSet);

      await expect(addAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Add Achievement : Failed : Invalid Collection : ERC721 : Invalid Amount", async () => {
      const ShadowMonarch = await ethers.getContractFactory(
        "SLTestShadowMonarch"
      );
      shadowMonarch = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        { kind: "uups" }
      );
      await shadowMonarch.deployed();

      const addCollectionTx = await project.addCollection(
        shadowMonarch.address,
        creator.address
      );
      await addCollectionTx.wait(); // collectionId 3

      collection1 = {
        collectionId: 3,
        tokenIds: [1],
        amounts: [1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const addAchievementTx = achievement.addAchievement(collectionSet);

      await expect(addAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Set Achievement Mint Enabled : Success", async () => {
      const setAchievementMintEnabledTx =
        await achievement.setAchievementMintEnabled(achievementId, false);
      await setAchievementMintEnabledTx.wait();

      const mintEnabled = await achievement.getAchievementMintEnabled(
        achievementId
      );
      expect(mintEnabled).to.equal(false);

      const setAchievementMintEnabledTx2 =
        await achievement.setAchievementMintEnabled(achievementId, true);
      await setAchievementMintEnabledTx2.wait();
    });

    it("Set Achievement Mint Enabled : Failed : Only Operator", async () => {
      const setAchievementMintEnabledTx = achievement
        .connect(notOperator)
        .setAchievementMintEnabled(achievementId, false);

      await expect(setAchievementMintEnabledTx).to.revertedWithCustomError(
        achievement,
        "OnlyOperator"
      );
    });

    it("Set Achievement Mint Enabled : Failed : Invalid Achievement Id", async () => {
      const setAchievementMintEnabledTx = achievement.setAchievementMintEnabled(
        100,
        false
      );

      await expect(setAchievementMintEnabledTx).to.revertedWithCustomError(
        achievement,
        "InvalidAchievementId"
      );
    });

    it("Set Collection Achievement : Success", async () => {
      achievementId = 1;

      collection1 = {
        collectionId: 1,
        tokenIds: [1, 2, 3],
        amounts: [1, 1, 1],
      };

      collection2 = {
        collectionId: 2,
        tokenIds: [1, 2],
        amounts: [1, 1],
      };

      collectionSet = {
        collections: [collection1, collection2],
      };

      const setCollectionAchievementTx =
        await achievement.setCollectionAchievement(
          achievementId,
          collectionSet
        );
      await setCollectionAchievementTx.wait();

      const achievementObj = await achievement.getCollectionAchievementById(
        achievementId
      );
      for (
        let i = 0;
        i < achievementObj.collectionSet.collections.length;
        i++
      ) {
        const collection = achievementObj.collectionSet.collections[i];

        expect(collection.collectionId).to.equal(
          collectionSet.collections[i].collectionId
        );
      }
    });

    it("Set Collection Achievement : Failed : Only Operator", async () => {
      const setCollectionAchievementTx = achievement
        .connect(notOperator)
        .setCollectionAchievement(achievementId, collectionSet);

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "OnlyOperator"
      );
    });

    it("Set Collection Achievement : Failed : Invalid Achievement Id : Not Exist", async () => {
      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        100,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidAchievementId"
      );
    });

    it("Set Collection Achievement : Failed : Invalid Achievement Id : Not Collection Type", async () => {
      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        2,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidAchievementId"
      );
    });

    it("Set Collection Achievement : Failed : Invalid Achievement Id : Mint Enabled True", async () => {
      const setAchievementMintEnabledTx =
        await achievement.setAchievementMintEnabled(achievementId, true);
      await setAchievementMintEnabledTx.wait();

      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        achievementId,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidAchievementId"
      );

      const setAchievementMintEnabledTx2 =
        await achievement.setAchievementMintEnabled(achievementId, false);
      await setAchievementMintEnabledTx2.wait();
    });

    it("Set Collection Achievement : Failed : Invalid Collection : Token Ids Length 0", async () => {
      collection1 = {
        collectionId: 1,
        tokenIds: [],
        amounts: [],
      };

      collectionSet = {
        collections: [collection1],
      };

      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        achievementId,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Set Collection Achievement : Failed : Invalid Collection : Does Not Exist Collection", async () => {
      collection1 = {
        collectionId: 100,
        tokenIds: [1],
        amounts: [1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        achievementId,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Set Collection Achievement : Failed : Invalid Collection : Does Not Active Collection", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(1, false);
      await setCollectionActiveTx.wait();

      collection1 = {
        collectionId: 1,
        tokenIds: [1],
        amounts: [1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        achievementId,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );

      const setCollectionActiveTx2 = await project.setCollectionActive(1, true);
      await setCollectionActiveTx2.wait();
    });

    it("Set Collection Achievement : Failed : Invalid Collection : ERC1155 : Invalid Length", async () => {
      collection1 = {
        collectionId: 1,
        tokenIds: [1],
        amounts: [1, 1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        achievementId,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Set Collection Achievement : Failed : Invalid Collection : ERC721 : Invalid Amount", async () => {
      collection1 = {
        collectionId: 3,
        tokenIds: [1],
        amounts: [1],
      };

      collectionSet = {
        collections: [collection1],
      };

      const setCollectionAchievementTx = achievement.setCollectionAchievement(
        achievementId,
        collectionSet
      );

      await expect(setCollectionAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidCollection"
      );
    });

    it("Claim Achievement : Success : Collection", async () => {
      collection1 = {
        collectionId: 1,
        tokenIds: [1, 2, 3],
        amounts: [1, 1, 1],
      };

      collection2 = {
        collectionId: 2,
        tokenIds: [1, 2, 3],
        amounts: [1, 1, 1],
      };

      collectionSet = {
        collections: [collection1, collection2],
      };

      const addAchievementTx = await achievement.addAchievement(collectionSet);
      await addAchievementTx.wait();

      achievementId = 3;

      const setAchievementMintEnabledTx =
        await achievement.setAchievementMintEnabled(achievementId, true);
      await setAchievementMintEnabledTx.wait();

      const normalMonsterMintTx = await normalMonster.mintOfTestBatch(
        hunter1.address,
        [1, 2, 3],
        [1, 1, 1]
      );
      await normalMonsterMintTx.wait();

      const shadowMonsterMintTx = await shadowMonster.mintOfTestBatch(
        hunter1.address,
        [1, 2, 3],
        [1, 1, 1]
      );
      await shadowMonsterMintTx.wait();

      const claimAchievementTx = await achievement
        .connect(hunter1)
        .claimAchievement(achievementId, "0x");

      const timestamp = await getBlockTimestamp(claimAchievementTx.blockNumber);

      AchievementClaimedEvent = {
        achievementId,
        hunter: hunter1.address,
        timestamp,
      };

      await expect(claimAchievementTx)
        .to.emit(achievement, "AchievementClaimed")
        .withArgs(
          AchievementClaimedEvent.achievementId,
          AchievementClaimedEvent.hunter,
          AchievementClaimedEvent.timestamp
        );

      const minted = await achievement.isMintedAchievement(
        achievementId,
        hunter1.address
      );
      expect(minted).to.equal(true);

      const balance = await achievement.balanceOf(
        hunter1.address,
        achievementId
      );
      expect(balance).to.equal(1);
    });

    it("Claim Achievement : Success : General", async () => {
      collectionSet = {
        collections: [],
      };

      const addAchievementTx = await achievement.addAchievement(collectionSet);
      await addAchievementTx.wait();

      achievementId = 4;

      const setAchievementMintEnabledTx =
        await achievement.setAchievementMintEnabled(achievementId, true);
      await setAchievementMintEnabledTx.wait();

      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "address"],
        [achievementId, hunter1.address]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const operatorSignature = await operatorManager.signMessage(
        messageBinary
      );

      const claimAchievementTx = await achievement
        .connect(hunter1)
        .claimAchievement(achievementId, operatorSignature);

      const timestamp = await getBlockTimestamp(claimAchievementTx.blockNumber);

      AchievementClaimedEvent = {
        achievementId,
        hunter: hunter1.address,
        timestamp,
      };

      await expect(claimAchievementTx)
        .to.emit(achievement, "AchievementClaimed")
        .withArgs(
          AchievementClaimedEvent.achievementId,
          AchievementClaimedEvent.hunter,
          AchievementClaimedEvent.timestamp
        );

      const minted = await achievement.isMintedAchievement(
        achievementId,
        hunter1.address
      );
      expect(minted).to.equal(true);

      const balance = await achievement.balanceOf(
        hunter1.address,
        achievementId
      );
      expect(balance).to.equal(1);
    });

    it("Claim Achievement : Success : Collection : ERC721", async () => {
      collection1 = {
        collectionId: 3,
        tokenIds: [1],
        amounts: [],
      };

      collectionSet = {
        collections: [collection1],
      };

      const addAchievementTx = await achievement.addAchievement(collectionSet);
      await addAchievementTx.wait();

      achievementId = 5;

      const setAchievementMintEnabledTx =
        await achievement.setAchievementMintEnabled(achievementId, true);
      await setAchievementMintEnabledTx.wait();

      const shadowMonarchMintTx = await shadowMonarch.mintOfTest(
        hunter1.address,
        1
      );
      await shadowMonarchMintTx.wait();

      const claimAchievementTx = await achievement
        .connect(hunter1)
        .claimAchievement(achievementId, "0x");

      const timestamp = await getBlockTimestamp(claimAchievementTx.blockNumber);

      AchievementClaimedEvent = {
        achievementId,
        hunter: hunter1.address,
        timestamp,
      };

      await expect(claimAchievementTx)
        .to.emit(achievement, "AchievementClaimed")
        .withArgs(
          AchievementClaimedEvent.achievementId,
          AchievementClaimedEvent.hunter,
          AchievementClaimedEvent.timestamp
        );

      const minted = await achievement.isMintedAchievement(
        achievementId,
        hunter1.address
      );
      expect(minted).to.equal(true);

      const balance = await achievement.balanceOf(
        hunter1.address,
        achievementId
      );
      expect(balance).to.equal(1);
    });

    it("Claim Achievement : Failed : Invalid Achievement Id", async () => {
      const claimAchievementTx = achievement
        .connect(hunter1)
        .claimAchievement(100, "0x");

      await expect(claimAchievementTx).to.revertedWithCustomError(
        achievement,
        "InvalidAchievementId"
      );
    });

    it("Claim Achievement : Failed : Does Not Mint Enabled", async () => {
      const setAchievementMintEnabledTx =
        await achievement.setAchievementMintEnabled(achievementId, false);
      await setAchievementMintEnabledTx.wait();

      const claimAchievementTx = achievement
        .connect(hunter1)
        .claimAchievement(achievementId, "0x");

      await expect(claimAchievementTx).to.revertedWithCustomError(
        achievement,
        "DoesNotMintEnabled"
      );

      const setAchievementMintEnabledTx2 =
        await achievement.setAchievementMintEnabled(achievementId, true);
      await setAchievementMintEnabledTx2.wait();
    });

    it("Claim Achievement : Failed : Already Minted", async () => {
      const claimAchievementTx = achievement
        .connect(hunter1)
        .claimAchievement(achievementId, "0x");

      await expect(claimAchievementTx).to.revertedWithCustomError(
        achievement,
        "AlreadyMinted"
      );
    });

    it("Claim Achievement : Failed : Not Enough Token Balance", async () => {
      achievementId = 3;

      const claimAchievementTx = achievement
        .connect(hunter2)
        .claimAchievement(achievementId, "0x");

      await expect(claimAchievementTx).to.revertedWithCustomError(
        achievement,
        "NotEnoughTokenBalance"
      );
    });

    it("Claim Achievement : Failed : Not Enough Token Balance : ERC721", async () => {
      achievementId = 5;

      const claimAchievementTx = achievement
        .connect(hunter2)
        .claimAchievement(achievementId, "0x");

      await expect(claimAchievementTx).to.revertedWithCustomError(
        achievement,
        "NotEnoughTokenBalance"
      );
    });

    it("Claim Achievement : Failed : General Achievement Verify Failed", async () => {
      achievementId = 4;

      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "address"],
        [achievementId, hunter1.address]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const operatorSignature = await operatorManager.signMessage(
        messageBinary
      );

      const claimAchievementTx = achievement
        .connect(hunter2)
        .claimAchievement(achievementId, operatorSignature);

      await expect(claimAchievementTx).to.revertedWithCustomError(
        achievement,
        "GeneralAchievementVerifyFailed"
      );
    });
  });
});
