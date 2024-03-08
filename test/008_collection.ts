import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import {
  getBlockTimestamp,
  getCurrentBlockNumber,
  setNextBlockNumber,
} from "./../helpers/block-timestamp";
import { ControllerAdded, ControllerRemoved } from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";

const getSBTId = (address: string) => {
  const encodedParams = ethers.utils.solidityPack(
    ["address", "string"],
    [address, "Invite"]
  );
  const hash = ethers.utils.keccak256(encodedParams);
  const hashNum = ethers.BigNumber.from(hash);
  const maxUint64 = ethers.BigNumber.from("4294967295");
  return hashNum.mod(maxUint64);
};

describe("Collection", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    hunter1: SignerWithAddress,
    hunter2: SignerWithAddress,
    inviter1: SignerWithAddress,
    inviter2: SignerWithAddress,
    inviter3: SignerWithAddress,
    invitee1: SignerWithAddress,
    invitee2: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    monsterFactory: Contract,
    season: Contract,
    shadowMonarch: Contract,
    essenceStone: Contract,
    monster: Contract,
    shadowArmy: Contract,
    legendaryScene: Contract,
    seasonScore: Contract,
    achievement: Contract,
    hunterRank: Contract,
    hunterItem: Contract,
    top100: Contract,
    seasonPack: Contract,
    inviteSBT: Contract;

  let ControllerAddedEvent: ControllerAdded,
    ControllerRemovedEvent: ControllerRemoved;

  before(async () => {
    [
      operatorMaster,
      operatorManager,
      notOperator,
      hunter1,
      hunter2,
      inviter1,
      inviter2,
      inviter3,
      invitee1,
      invitee2,
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
    season = await upgrades.deployProxy(SLSeason, [project.address], {
      kind: "uups",
    });
    await season.deployed();
    console.log(`Season deployed to: ${season.address}`);

    // deploy shadowMonarch
    const ShadowMonarch = await ethers.getContractFactory(
      "SLTestShadowMonarch"
    );
    shadowMonarch = await upgrades.deployProxy(
      ShadowMonarch,
      [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
      {
        kind: "uups",
      }
    );
    await shadowMonarch.deployed();
    console.log(`ShadowMonarch deployed to: ${shadowMonarch.address}`);

    // deploy essenceStone
    const EssenceStone = await ethers.getContractFactory("SLTestEssenceStone");
    essenceStone = await upgrades.deployProxy(
      EssenceStone,
      [
        project.address,
        ZERO_ADDRESS,
        [project.address, project.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await essenceStone.deployed();
    console.log(`EssenceStone deployed to: ${essenceStone.address}`);

    // deploy monster
    const Monster = await ethers.getContractFactory("SLTestMonster");
    monster = await upgrades.deployProxy(
      Monster,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [project.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await monster.deployed();
    console.log(`Monster deployed to: ${monster.address}`);

    // deploy shadowArmy
    const ShadowArmy = await ethers.getContractFactory("SLTestShadowArmy");
    shadowArmy = await upgrades.deployProxy(
      ShadowArmy,
      [
        project.address,
        monsterFactory.address,
        ZERO_ADDRESS,
        [project.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await shadowArmy.deployed();
    console.log(`ShadowArmy deployed to: ${shadowArmy.address}`);

    // deploy legendaryScene
    const LegendaryScene = await ethers.getContractFactory("SLLegendaryScene");
    legendaryScene = await upgrades.deployProxy(
      LegendaryScene,
      [
        project.address,
        season.address,
        ZERO_ADDRESS,
        [operatorMaster.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await legendaryScene.deployed();
    console.log(`LegendaryScene deployed to: ${legendaryScene.address}`);

    // deploy achievement
    const Achievement = await ethers.getContractFactory("SLTestAchievement");
    achievement = await upgrades.deployProxy(
      Achievement,
      [project.address, "baseTokenURI"],
      {
        kind: "uups",
      }
    );
    await achievement.deployed();
    console.log(`Achievement deployed to: ${achievement.address}`);

    // deploy seasonScore
    const SeasonScore = await ethers.getContractFactory("SLSeasonScore");
    seasonScore = await upgrades.deployProxy(
      SeasonScore,
      [
        project.address,
        season.address,
        [operatorMaster.address],
        "baseTokenURI",
      ],
      {
        kind: "uups",
      }
    );
    await seasonScore.deployed();
    console.log(`SeasonScore deployed to: ${seasonScore.address}`);

    // deploy hunterRank
    const HunterRank = await ethers.getContractFactory("SLTestHunterRank");
    hunterRank = await HunterRank.deploy(
      project.address,
      [project.address],
      "baseTokenURI"
    );
    await hunterRank.deployed();
    console.log(`HunterRank deployed to: ${hunterRank.address}`);

    // deploy hunterItem
    const HunterItem = await ethers.getContractFactory("SLTestHunterItem");
    hunterItem = await upgrades.deployProxy(
      HunterItem,
      [project.address, [project.address], "baseTokenURI"],
      {
        kind: "uups",
      }
    );
    await hunterItem.deployed();
    console.log(`HunterItem deployed to: ${hunterItem.address}`);

    // deploy top100
    const Top100 = await ethers.getContractFactory("SLTop100");
    top100 = await upgrades.deployProxy(
      Top100,
      [project.address, "baseTokenURI"],
      { kind: "uups" }
    );
    await top100.deployed();
    console.log(`Top100 deployed to: ${top100.address}`);

    // deploy seasonPack
    const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
    seasonPack = await SeasonPack.deploy(
      project.address,
      ZERO_ADDRESS,
      [project.address],
      "baseTokenURI"
    );
    await seasonPack.deployed();
    console.log(`SeasonPack deployed to ${seasonPack.address}`);

    const InviteSBT = await ethers.getContractFactory("SLInviteSBT");
    inviteSBT = await upgrades.deployProxy(
      InviteSBT,
      [project.address, [operatorMaster.address], "baseTokenURI"],
      {
        kind: "uups",
      }
    );
  });

  ////////////
  // ERC721 //
  ////////////

  describe("ERC721", async () => {
    it("Shadow Monarch : Set Token Collecting Score : Success", async () => {
      const setTokenCollectingScoreTx =
        await shadowMonarch.setTokenCollectingScore(1, 50);

      await setTokenCollectingScoreTx.wait();

      expect(await shadowMonarch.getTokenCollectingScore(1)).to.equal(50);
    });

    it("Shadow Monarch : Set Token Collecting Score : Failed : Only Operator", async () => {
      const setTokenCollectingScoreTx = shadowMonarch
        .connect(notOperator)
        .setTokenCollectingScore(1, 50);

      expect(setTokenCollectingScoreTx).revertedWithCustomError(
        shadowMonarch,
        "OnlyOperator"
      );
    });

    it("Shadow Monarch : Set Default Collecting Score : Success", async () => {
      const setDefaultCollectingScoreTx =
        await shadowMonarch.setDefaultCollectingScore(200);

      await setDefaultCollectingScoreTx.wait();

      expect(await shadowMonarch.getDefaultCollectingScore()).to.equal(200);
    });

    it("Shadow Monarch : Set Default Collecting Score : Failed : Only Operator", async () => {
      const setDefaultCollectingScoreTx = shadowMonarch
        .connect(notOperator)
        .setDefaultCollectingScore(200);

      expect(setDefaultCollectingScoreTx).revertedWithCustomError(
        shadowMonarch,
        "OnlyOperator"
      );
    });

    it("Shadow Monarch : Get Collecting Score At Block", async () => {
      const currentBlockNumber = await getCurrentBlockNumber();
      const beforeScore = await shadowMonarch.getCollectingScoreAtBlock(
        hunter1.address,
        currentBlockNumber - 1
      );

      const mintTx = await shadowMonarch.mintOfTest(hunter1.address, 2);
      await mintTx.wait();

      await setNextBlockNumber(5);

      const afterScore = await shadowMonarch.getCollectingScoreAtBlock(
        hunter1.address,
        mintTx.blockNumber
      );

      expect(beforeScore).to.equal(0);
      expect(afterScore).to.equal(250);
    });

    it("Shadow Monarch : Get Latest Collecting Score", async () => {
      const beforeScore = await shadowMonarch.getLatestCollectingScore(
        hunter1.address
      );

      const mintTx = await shadowMonarch.mintOfTest(hunter1.address, 1);
      await mintTx.wait();

      const afterScore = await shadowMonarch.getLatestCollectingScore(
        hunter1.address
      );

      expect(beforeScore).to.equal(250);
      expect(afterScore).to.equal(450);
    });

    it("Top100 : Mint Top 100 : Failed : Duplicate Account", async () => {
      const accounts = [];

      for (let i = 0; i < 100; i++) {
        accounts.push(hunter1.address);
      }

      const mintTop100Tx = top100.mintTop100(accounts);

      expect(mintTop100Tx).revertedWithCustomError(top100, "DuplicateAccount");
    });

    it("Top100 : Mint Top 100 : Success", async () => {
      const signers = (await ethers.getSigners()).slice(0, 100);
      const accounts = [];

      for (let i = 0; i < 100; i++) {
        accounts.push(signers[i].address);
      }

      const mintTop100Tx = await top100.mintTop100(accounts);
      await mintTop100Tx.wait();

      const timestamp = await getBlockTimestamp(mintTop100Tx.blockNumber);

      expect(await top100.getMintedSupply()).to.equal(100);
      expect(await top100.balanceOf(hunter1.address)).to.equal(1);
      expect(mintTop100Tx)
        .to.emit(top100, "Top100Minted")
        .withArgs(accounts, timestamp);
    });

    it("Top100 : Mint Top 100 : Failed : Only Operator", async () => {
      const signers = (await ethers.getSigners()).slice(0, 100);
      const accounts = [];

      for (let i = 0; i < 100; i++) {
        accounts.push(signers[i].address);
      }

      const mintTop100Tx = top100.connect(notOperator).mintTop100(accounts);

      expect(mintTop100Tx).revertedWithCustomError(top100, "OnlyOperator");
    });

    it("Top100 : Mint Top 100 : Failed : Invalid Argument", async () => {
      const signers = (await ethers.getSigners()).slice(0, 100);
      const accounts = [];

      for (let i = 0; i < 50; i++) {
        accounts.push(signers[i].address);
      }

      const mintTop100Tx = top100.mintTop100(accounts);

      expect(mintTop100Tx).revertedWithCustomError(top100, "InvalidArgument");
    });

    it("Top100 : Mint Top 100 : Failed : Already Minted", async () => {
      const signers = (await ethers.getSigners()).slice(0, 100);
      const accounts = [];

      for (let i = 0; i < 100; i++) {
        accounts.push(signers[i].address);
      }

      const mintTop100Tx = top100.mintTop100(accounts);

      expect(mintTop100Tx).revertedWithCustomError(top100, "AlreadyMinted");
    });

    it("ERC721 : Token URI", async () => {
      expect(await shadowMonarch.tokenURI(1)).to.equal("baseTokenURI1");
      expect(await top100.tokenURI(1)).to.equal("baseTokenURI1");
    });

    it("ERC721 : Token URI : Failed : Not Exist Token", async () => {
      expect(shadowMonarch.tokenURI(1000)).revertedWith(
        "ERC721: invalid token ID"
      );
      expect(top100.tokenURI(1000)).revertedWith("ERC721: invalid token ID");
    });

    it("Shadow Monarch : TransferFrom : Success", async () => {
      const transferTx = await shadowMonarch
        .connect(hunter1)
        .transferFrom(hunter1.address, hunter2.address, 1);
      await transferTx.wait();

      const hunter1Score = await shadowMonarch.getLatestCollectingScore(
        hunter1.address
      );
      const hunter2Score = await shadowMonarch.getLatestCollectingScore(
        hunter2.address
      );

      const hunter1Tokens = await shadowMonarch.getTokenOfOwner(
        hunter1.address
      );
      const hunter2Tokens = await shadowMonarch.getTokenOfOwner(
        hunter2.address
      );

      expect(hunter1Score).to.equal(400);
      expect(hunter2Score).to.equal(50);
      expect(hunter1Tokens[0]).to.equal(3);
      expect(hunter1Tokens[1]).to.equal(2);
      expect(hunter2Tokens[0]).to.equal(1);
    });

    it("Top100 : TransferFrom : Failed : SBT", async () => {
      const transferTx = top100
        .connect(hunter1)
        .transferFrom(hunter1.address, hunter2.address, 1);

      expect(transferTx).revertedWithCustomError(
        top100,
        "FunctionNotSupported"
      );
    });

    it("Top100 : Approve : Failed : SBT", async () => {
      const approveTx = top100.connect(hunter1).approve(hunter2.address, 1);

      expect(approveTx).revertedWithCustomError(top100, "FunctionNotSupported");
    });

    it("Top100 : Set Approval For All : Failed : SBT", async () => {
      const setApprovalForAllTx = top100
        .connect(hunter1)
        .setApprovalForAll(hunter2.address, true);

      expect(setApprovalForAllTx).revertedWithCustomError(
        top100,
        "FunctionNotSupported"
      );
    });

    it("Top100 : Safe Transfer From : Failed : SBT", async () => {
      const safeTransferFromTx = top100
        .connect(hunter1)
        ["safeTransferFrom(address,address,uint256)"](
          hunter1.address,
          hunter2.address,
          1
        );

      expect(safeTransferFromTx).revertedWithCustomError(
        top100,
        "FunctionNotSupported"
      );
    });

    it("Top100 : Safe Transfer From With Data : Failed : SBT", async () => {
      const safeTransferFromTx = top100
        .connect(hunter1)
        ["safeTransferFrom(address,address,uint256,bytes)"](
          hunter1.address,
          hunter2.address,
          1,
          ""
        );

      expect(safeTransferFromTx).revertedWithCustomError(
        top100,
        "FunctionNotSupported"
      );
    });

    it("Shadow Monarch : Brun : Success", async () => {
      const burnTx = await shadowMonarch.connect(hunter1).burn(2);
      await burnTx.wait();

      const hunter1Score = await shadowMonarch.getLatestCollectingScore(
        hunter1.address
      );

      const tokens = await shadowMonarch.getTokenOfOwner(hunter1.address);

      expect(hunter1Score).to.equal(200);
      expect(await shadowMonarch.getMintedSupply()).to.equal(3);
      expect(await shadowMonarch.getBurnedSupply()).to.equal(1);
      expect(tokens[0]).to.equal(3);
    });

    it("Top100 : Brun : Success", async () => {
      const burnTx = await top100.burn(1);
      await burnTx.wait();

      expect(await top100.getMintedSupply()).to.equal(100);
      expect(await top100.getBurnedSupply()).to.equal(1);
    });
  });

  /////////////
  // ERC1155 //
  /////////////

  describe("ERC1155", async () => {
    it("Hunter Rank : Set MintEnabled : Success", async () => {
      const setMintEnabledTx = await hunterRank.setMintEnabled(false);
      await setMintEnabledTx.wait();

      expect(await hunterRank.getMintEnabled()).to.equal(false);

      const mintTx = hunterRank.mintOfTest(hunter1.address, 1, 1);
      expect(mintTx).revertedWithCustomError(hunterRank, "DoesNotEnabled");

      const setMintEnabledTx2 = await hunterRank.setMintEnabled(true);
      await setMintEnabledTx2.wait();
    });

    it("Hunter Rank : Set MintEnabled : Failed : Only Operator", async () => {
      const setMintEnabledTx = hunterRank
        .connect(notOperator)
        .setMintEnabled(false);

      expect(setMintEnabledTx).revertedWithCustomError(
        hunterRank,
        "OnlyOperator"
      );
    });

    it("Hunter Item : Set MintEnabled : Success", async () => {
      const setMintEnabledTx = await hunterItem.setMintEnabled(false);
      await setMintEnabledTx.wait();

      expect(await hunterItem.getMintEnabled()).to.equal(false);

      const mintTx = hunterItem.mintOfTest(hunter1.address, 1, 1);
      expect(mintTx).revertedWithCustomError(hunterItem, "DoesNotEnabled");

      const setMintEnabledTx2 = await hunterItem.setMintEnabled(true);
      await setMintEnabledTx2.wait();
    });

    it("Hunter Item : Set MintEnabled : Failed : Only Operator", async () => {
      const setMintEnabledTx = hunterItem
        .connect(notOperator)
        .setMintEnabled(false);

      expect(setMintEnabledTx).revertedWithCustomError(
        hunterItem,
        "OnlyOperator"
      );
    });

    it("Hunter Item : Open Token : Success", async () => {
      expect(await hunterItem.exists(1)).to.equal(false);

      const openTokenTx = await hunterItem.openToken(1);
      await openTokenTx.wait();

      expect(openTokenTx).emit(hunterItem, "TokenOpened");
      expect(await hunterItem.exists(1)).to.equal(true);
    });

    it("Season Pack : Open Token : Success", async () => {
      expect(await seasonPack.exists(1)).to.equal(false);

      const openTokenTx = await seasonPack.openToken(1);
      await openTokenTx.wait();

      expect(openTokenTx).emit(seasonPack, "TokenOpened");
      expect(await seasonPack.exists(1)).to.equal(true);
    });

    it("Hunter Item : Open Token : Failed : Only Operator", async () => {
      const openTokenTx = hunterItem.connect(notOperator).openToken(1);

      expect(openTokenTx).revertedWithCustomError(hunterItem, "OnlyOperator");
    });

    it("Season Pack : Open Token : Failed : Only Operator", async () => {
      const openTokenTx = seasonPack.connect(notOperator).openToken(1);

      expect(openTokenTx).revertedWithCustomError(seasonPack, "OnlyOperator");
    });

    it("Season Pack : Open Token : Failed : Invalid Token Id", async () => {
      const openTokenTx = seasonPack.openToken(0);

      expect(openTokenTx).revertedWithCustomError(seasonPack, "InvalidTokenId");
    });

    it("Hunter Item : Close Token : Success", async () => {
      expect(await hunterItem.exists(1)).to.equal(true);

      const closeTokenTx = await hunterItem.closeToken(1);
      await closeTokenTx.wait();

      expect(closeTokenTx).emit(hunterItem, "TokenClosed");
      expect(await hunterItem.exists(1)).to.equal(false);

      const openTokenTx = await hunterItem.openToken(1);
      await openTokenTx.wait();
    });

    it("Season Pack : Close Token : Success", async () => {
      expect(await seasonPack.exists(1)).to.equal(true);

      const closeTokenTx = await seasonPack.closeToken(1);
      await closeTokenTx.wait();

      expect(closeTokenTx).emit(seasonPack, "TokenClosed");
      expect(await seasonPack.exists(1)).to.equal(false);

      const openTokenTx = await seasonPack.openToken(1);
      await openTokenTx.wait();
    });

    it("Hunter Item : Close Token : Failed : Only Operator", async () => {
      const closeTokenTx = hunterItem.connect(notOperator).closeToken(1);

      expect(closeTokenTx).revertedWithCustomError(hunterItem, "OnlyOperator");
    });

    it("Season Pack : Close Token : Failed : Only Operator", async () => {
      const closeTokenTx = seasonPack.connect(notOperator).closeToken(1);

      expect(closeTokenTx).revertedWithCustomError(seasonPack, "OnlyOperator");
    });

    it("Season Pack : Close Token : Failed : Invalid Token Id", async () => {
      const closeTokenTx = seasonPack.closeToken(0);

      expect(closeTokenTx).revertedWithCustomError(
        seasonPack,
        "InvalidTokenId"
      );
    });

    it("Hunter Item : Close Token : Failed : Already Minted", async () => {
      const mintTx = await hunterItem.mintOfTest(hunter1.address, 1, 1);
      await mintTx.wait();

      const closeTokenTx = hunterItem.connect(notOperator).closeToken(1);

      expect(closeTokenTx).revertedWithCustomError(hunterItem, "AlreadyMinted");
    });

    it("Season Pack : Close Token : Failed : Already Minted", async () => {
      const addControllerTx = await seasonPack.addController(
        operatorMaster.address
      );
      await addControllerTx.wait();

      const mintTx = await seasonPack
        .connect(operatorMaster)
        .mint(hunter1.address, 1, 1);
      await mintTx.wait();

      const closeTokenTx = seasonPack.connect(notOperator).closeToken(1);

      expect(closeTokenTx).revertedWithCustomError(seasonPack, "AlreadyMinted");
    });

    it("Season Pack : Add Controller : Success", async () => {
      const addControllerTx = await seasonPack.addController(
        operatorManager.address
      );

      const timestamp = await getBlockTimestamp(addControllerTx.blockNumber);

      ControllerAddedEvent = {
        controller: operatorManager.address,
        timestamp,
      };

      await expect(addControllerTx)
        .to.emit(seasonPack, "ControllerAdded")
        .withArgs(
          ControllerAddedEvent.controller,
          ControllerAddedEvent.timestamp
        );

      const mintTx = await seasonPack
        .connect(operatorManager)
        .mint(hunter1.address, 1, 1);
      await mintTx.wait();
    });

    it("Season Pack : Add Controller : Failed : Only Operator", async () => {
      const addControllerTx = seasonPack
        .connect(notOperator)
        .addController(operatorManager.address);

      expect(addControllerTx).revertedWithCustomError(
        seasonPack,
        "OnlyOperator"
      );
    });

    it("Season Pack : Remove Controller : Success", async () => {
      const removeControllerTx = await seasonPack.removeController(
        operatorManager.address
      );

      const timestamp = await getBlockTimestamp(removeControllerTx.blockNumber);

      ControllerRemovedEvent = {
        controller: operatorManager.address,
        timestamp,
      };

      await expect(removeControllerTx)
        .to.emit(seasonPack, "ControllerRemoved")
        .withArgs(
          ControllerRemovedEvent.controller,
          ControllerRemovedEvent.timestamp
        );

      const mintTx = seasonPack
        .connect(operatorManager)
        .mint(hunter1.address, 1, 1);

      expect(mintTx).revertedWithCustomError(seasonPack, "OnlyController");
    });

    it("Season Pack : Remove Controller : Failed : Only Operator", async () => {
      const removeControllerTx = seasonPack
        .connect(notOperator)
        .removeController(operatorManager.address);

      expect(removeControllerTx).revertedWithCustomError(
        seasonPack,
        "OnlyOperator"
      );
    });

    it("ERC1155 : URI", async () => {
      expect(await essenceStone.uri(1)).to.equal("baseTokenURI1");
      expect(monster.uri(1)).revertedWithCustomError(
        monster,
        "DoesNotExistTokenId"
      );
      expect(shadowArmy.uri(1)).revertedWithCustomError(
        shadowArmy,
        "DoesNotExistTokenId"
      );
      expect(legendaryScene.uri(1)).revertedWithCustomError(
        legendaryScene,
        "DoesNotExistTokenId"
      );
      expect(seasonScore.uri(1)).revertedWithCustomError(
        seasonScore,
        "DoesNotExistTokenId"
      );
      expect(achievement.uri(1)).revertedWithCustomError(
        achievement,
        "DoesNotExistTokenId"
      );
      expect(await hunterRank.uri(1)).to.equal("baseTokenURI1");
      expect(await hunterItem.uri(1)).to.equal("baseTokenURI1");
      expect(await seasonPack.uri(1)).to.equal("baseTokenURI1");
    });

    it("Season Score : Set Approval For All : Failed : SBT", async () => {
      const setApprovalForAllTx = seasonScore.setApprovalForAll(
        hunter2.address,
        true
      );

      expect(setApprovalForAllTx).revertedWithCustomError(
        seasonScore,
        "FunctionNotSupported"
      );
    });

    it("Achievement : Set Approval For All : Failed : SBT", async () => {
      const setApprovalForAllTx = achievement.setApprovalForAll(
        hunter2.address,
        true
      );

      expect(setApprovalForAllTx).revertedWithCustomError(
        achievement,
        "FunctionNotSupported"
      );
    });

    it("Hunter Rank : Set Approval For All : Failed : SBT", async () => {
      const setApprovalForAllTx = hunterRank.setApprovalForAll(
        hunter2.address,
        true
      );

      expect(setApprovalForAllTx).revertedWithCustomError(
        hunterRank,
        "FunctionNotSupported"
      );
    });

    it("Season Score : Safe Transfer From : Failed : SBT", async () => {
      const safeTransferFromTx = seasonScore.safeTransferFrom(
        hunter1.address,
        hunter2.address,
        1,
        1,
        ""
      );

      expect(safeTransferFromTx).revertedWithCustomError(
        seasonScore,
        "FunctionNotSupported"
      );
    });

    it("Achievement : Safe Transfer From : Failed : SBT", async () => {
      const safeTransferFromTx = achievement.safeTransferFrom(
        hunter1.address,
        hunter2.address,
        1,
        1,
        ""
      );

      expect(safeTransferFromTx).revertedWithCustomError(
        achievement,
        "FunctionNotSupported"
      );
    });

    it("Hunter Rank : Safe Transfer From : Failed : SBT", async () => {
      const safeTransferFromTx = hunterRank.safeTransferFrom(
        hunter1.address,
        hunter2.address,
        1,
        1,
        ""
      );

      expect(safeTransferFromTx).revertedWithCustomError(
        hunterRank,
        "FunctionNotSupported"
      );
    });

    it("Season Score : Safe Batch Transfer From: Failed : SBT", async () => {
      const safeBatchTransferFromTx = seasonScore.safeBatchTransferFrom(
        hunter1.address,
        hunter2.address,
        [1],
        [1],
        ""
      );

      expect(safeBatchTransferFromTx).revertedWithCustomError(
        seasonScore,
        "FunctionNotSupported"
      );
    });

    it("Achievement : Safe Batch Transfer From: Failed : SBT", async () => {
      const safeBatchTransferFromTx = achievement.safeBatchTransferFrom(
        hunter1.address,
        hunter2.address,
        [1],
        [1],
        ""
      );

      expect(safeBatchTransferFromTx).revertedWithCustomError(
        achievement,
        "FunctionNotSupported"
      );
    });

    it("Hunter Rank : Safe Batch Transfer From: Failed : SBT", async () => {
      const safeBatchTransferFromTx = hunterRank.safeBatchTransferFrom(
        hunter1.address,
        hunter2.address,
        [1],
        [1],
        ""
      );

      expect(safeBatchTransferFromTx).revertedWithCustomError(
        hunterRank,
        "FunctionNotSupported"
      );
    });

    it("Mint Of Airdrop * 500", async () => {
      const accounts = [];
      const tokenIds = [];
      const amounts = [];

      for (let i = 0; i < 500; i++) {
        const wallet = ethers.Wallet.createRandom();
        accounts.push(wallet.address);
        tokenIds.push(1);
        amounts.push(1);
      }

      const mintTx = await essenceStone.mintOfAirdrop(
        accounts,
        tokenIds,
        amounts
      );
      await mintTx.wait();
    });
  });

  ////////////////
  // Invite SBT //
  ////////////////

  describe("InviteSBT", async () => {
    it("Get SBT Id", async () => {
      const sbtId = await inviteSBT.getSBTId(inviter1.address);
      const tokenId = getSBTId(inviter1.address);

      expect(sbtId).to.equal(tokenId);
    });

    it("Mint SBT : Success", async () => {
      const sbtId = getSBTId(inviter1.address);

      const mintTx = await inviteSBT
        .connect(invitee1)
        .mintSBT(inviter1.address);
      await mintTx.wait();

      const balance = await inviteSBT.balanceOf(invitee1.address, sbtId);
      expect(balance).to.equal(1);
    });

    it("Mint SBT : Failed : Already Minted", async () => {
      const mintTx = inviteSBT.connect(invitee1).mintSBT(inviter1.address);

      expect(mintTx).revertedWithCustomError(inviteSBT, "AlreadyMinted");
    });

    it("Mint SBT By Operator : Success", async () => {
      const sbtId = getSBTId(inviter1.address);

      const mintTx = await inviteSBT.mintSBTByOperator(
        inviter1.address,
        invitee2.address
      );
      await mintTx.wait();

      const balance = await inviteSBT.balanceOf(invitee2.address, sbtId);
      expect(balance).to.equal(1);
    });

    it("Mint SBT By Operator : Failed : Only Controller", async () => {
      const mintTx = inviteSBT
        .connect(notOperator)
        .mintSBTByOperator(inviter2.address, invitee2.address);

      expect(mintTx).revertedWithCustomError(inviteSBT, "OnlyController");
    });

    it("Mint SBT By Operator : Failed : Already Minted", async () => {
      const mintTx = inviteSBT.mintSBTByOperator(
        inviter1.address,
        invitee2.address
      );

      expect(mintTx).revertedWithCustomError(inviteSBT, "AlreadyMinted");
    });

    it("Mint SBT By Operator Batch : Success", async () => {
      const sbtId = getSBTId(inviter2.address);

      const mintTx = await inviteSBT.mintSBTByOperatorBatch(
        [inviter2.address, inviter2.address],
        [invitee1.address, invitee2.address]
      );
      await mintTx.wait();

      const balance1 = await inviteSBT.balanceOf(invitee1.address, sbtId);
      const balance2 = await inviteSBT.balanceOf(invitee2.address, sbtId);
      expect(balance1).to.equal(1);
      expect(balance2).to.equal(1);
    });

    it("Mint SBT By Operator Batch : Failed : Only Controller", async () => {
      const mintTx = inviteSBT
        .connect(notOperator)
        .mintSBTByOperatorBatch(
          [inviter2.address, inviter2.address],
          [invitee1.address, invitee2.address]
        );

      expect(mintTx).revertedWithCustomError(inviteSBT, "OnlyController");
    });

    it("Mint SBT By Operator Batch : Failed : Invalid Argument", async () => {
      const mintTx = inviteSBT.mintSBTByOperatorBatch(
        [inviter2.address],
        [invitee1.address, invitee2.address]
      );

      expect(mintTx).revertedWithCustomError(inviteSBT, "InvalidArgument");
    });

    it("Burn SBT : Success", async () => {
      const sbtId = getSBTId(inviter1.address);

      const isInviterBefore = await inviteSBT.isInviter(
        inviter1.address,
        invitee1.address
      );
      expect(isInviterBefore).to.equal(true);

      const burnTx = await inviteSBT
        .connect(invitee1)
        .burn(invitee1.address, sbtId, 1);
      await burnTx.wait();

      const isInviterAfter = await inviteSBT.isInviter(
        inviter1.address,
        invitee1.address
      );
      expect(isInviterAfter).to.equal(false);

      const burnSupply = await inviteSBT.getBurnedSupply(sbtId);
      expect(burnSupply).to.equal(1);

      const inviteeLength = await inviteSBT.getInviteeLength(inviter1.address);
      expect(inviteeLength).to.equal(1);
    });

    // max 340
    it("Mint SBT By Operator Batch : Success * 340", async () => {
      const sbtId = getSBTId(inviter3.address);

      const count = 340;
      const inviters = [];
      const invitees = [];

      for (let i = 0; i < count; i++) {
        inviters.push(inviter3.address);

        const randomPrivateKey = ethers.utils.randomBytes(32);
        const wallet = new ethers.Wallet(randomPrivateKey);

        invitees.push(wallet.address);
      }

      const mintTx = await inviteSBT.mintSBTByOperatorBatch(inviters, invitees);
      await mintTx.wait();

      const inviteeList = await inviteSBT.getInviteeList(inviter3.address);

      for (let i = 0; i < count; i++) {
        const balance = await inviteSBT.balanceOf(invitees[i], sbtId);
        expect(balance).to.equal(1);
        expect(inviteeList[i]).to.equal(invitees[i]);
      }

      const inviteeLength = await inviteSBT.getInviteeLength(inviter3.address);
      expect(inviteeLength).to.equal(count);
    });
  });
});
