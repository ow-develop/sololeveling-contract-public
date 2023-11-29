import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import { getBlockTimestamp } from "../helpers/block-timestamp";
import { TokenType } from "../helpers/constant/contract";
import { Create, SetOperator } from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";

describe("Project", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    creator: SignerWithAddress,
    newOperatorMaster: SignerWithAddress,
    newOperatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    newCreator: SignerWithAddress;

  let project: Contract, operator: Contract, newOperator: Contract;

  let CreateEvent: Create, SetOperatorEvent: SetOperator;

  before(async () => {
    [
      operatorMaster,
      operatorManager,
      notOperator,
      creator,
      newOperatorMaster,
      newOperatorManager,
      newCreator,
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
  });

  //////////
  // Role //
  //////////

  describe("Role", async () => {
    it("Is Operator Master", async () => {
      const isOperatorMaster = await project.isOperatorMaster(
        operatorMaster.address
      );
      const isOperatorMaster2 = await project.isOperatorMaster(
        operatorManager.address
      );

      expect(isOperatorMaster).to.equal(true);
      expect(isOperatorMaster2).to.equal(false);
    });

    it("Is Operator", async () => {
      const isOperator = await project.isOperator(operatorMaster.address);
      const isOperator2 = await project.isOperator(operatorManager.address);
      const isOperator3 = await project.isOperator(notOperator.address);

      expect(isOperator).to.equal(true);
      expect(isOperator2).to.equal(true);
      expect(isOperator3).to.equal(false);
    });

    it("Set Operator : Success", async () => {
      const RoleWallet = await ethers.getContractFactory("SLRoleWallet");
      newOperator = await RoleWallet.deploy(
        [newOperatorMaster.address],
        [newOperatorManager.address]
      );
      await newOperator.deployed();

      const setOperatorTx = await project
        .connect(operatorMaster)
        .setOperator(newOperator.address);
      const timestamp = await getBlockTimestamp(setOperatorTx.blockNumber);

      SetOperatorEvent = {
        operator: newOperator.address,
        timestamp: timestamp,
      };

      await expect(setOperatorTx)
        .to.emit(project, "SetOperator")
        .withArgs(SetOperatorEvent.operator, SetOperatorEvent.timestamp);

      const isOperatorMaster = await project.isOperatorMaster(
        newOperatorMaster.address
      );
      const isOperatorMaster2 = await project.isOperatorMaster(
        operatorMaster.address
      );

      expect(isOperatorMaster).to.equal(true);
      expect(isOperatorMaster2).to.equal(false);

      const setOperatorTx2 = await project
        .connect(newOperatorMaster)
        .setOperator(operator.address);
      await setOperatorTx2.wait();
    });

    it("Set Operator : Failed : Invalid Operator", async () => {
      const setOperatorTx = project
        .connect(operatorMaster)
        .setOperator(operatorMaster.address);

      await expect(setOperatorTx).to.revertedWithCustomError(
        project,
        "InvalidOperator"
      );
    });

    it("Set Operator : Failed : Only Operator Master", async () => {
      const setOperatorTx = project
        .connect(operatorManager)
        .setOperator(newOperator.address);

      await expect(setOperatorTx).to.revertedWithCustomError(
        project,
        "OnlyOperatorMaster"
      );
    });
  });

  //////////////
  // Universe //
  //////////////

  describe("Universe", async () => {
    it("Add Universe : Success", async () => {
      const addUniverseTx = await project
        .connect(operatorManager)
        .addUniverse();
      const timestamp = await getBlockTimestamp(addUniverseTx.blockNumber);

      CreateEvent = {
        target: "Universe",
        targetId: 1,
        timestamp: timestamp,
      };

      await expect(addUniverseTx)
        .to.emit(project, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );
    });

    it("Add Universe : Failed : Only Operator", async () => {
      const addUniverseTx = project.connect(notOperator).addUniverse();

      await expect(addUniverseTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Set Universe Active : Success", async () => {
      const setUniverseActiveTx = await project
        .connect(operatorManager)
        .setUniverseActive("1", false);
      await setUniverseActiveTx.wait();

      const isActiveUniverse = await project.isActiveUniverse("1");
      expect(isActiveUniverse).to.equal(false);

      const setUniverseActiveTx2 = await project
        .connect(operatorManager)
        .setUniverseActive("1", true);
      await setUniverseActiveTx2.wait();
    });

    it("Set Universe Active : Failed : Only Operator", async () => {
      const setUniverseActiveTx = project
        .connect(notOperator)
        .setUniverseActive("1", false);

      await expect(setUniverseActiveTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Set Universe Active : Failed : Invalid Universe Id", async () => {
      const setUniverseActiveTx = project
        .connect(operatorManager)
        .setUniverseActive("100", false);

      await expect(setUniverseActiveTx).to.revertedWithCustomError(
        project,
        "InvalidUniverseId"
      );
    });

    it("Is Exist Universe By Id", async () => {
      const isExistUniverse = await project.isExistUniverseById("1");
      expect(isExistUniverse).to.equal(true);

      const isExistUniverse2 = await project.isExistUniverseById("2");
      expect(isExistUniverse2).to.equal(false);
    });
  });

  ////////////////
  // Collection //
  ////////////////

  describe("Collection", async () => {
    it("Add Collection : Success : ERC721", async () => {
      const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
      const shadowMonarch = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await shadowMonarch.deployed();

      const addCollectionTx = await project
        .connect(operatorManager)
        .addCollection(shadowMonarch.address, creator.address);
      const timestamp = await getBlockTimestamp(addCollectionTx.blockNumber);

      CreateEvent = {
        target: "Collection",
        targetId: 1,
        timestamp: timestamp,
      };

      await expect(addCollectionTx)
        .to.emit(project, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );

      const collection = await project.getCollectionById("1");
      expect(collection.tokenContract).to.equal(shadowMonarch.address);
      expect(collection.creator).to.equal(creator.address);
      expect(collection.tokenType).to.equal(TokenType.ERC721);
    });

    it("Add Collection : Success : ERC1155", async () => {
      const EssenceStone = await ethers.getContractFactory("SLEssenceStone");
      const essenceStone = await upgrades.deployProxy(
        EssenceStone,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await essenceStone.deployed();

      const addCollectionTx = await project
        .connect(operatorManager)
        .addCollection(essenceStone.address, creator.address);
      const timestamp = await getBlockTimestamp(addCollectionTx.blockNumber);

      CreateEvent = {
        target: "Collection",
        targetId: 2,
        timestamp: timestamp,
      };

      await expect(addCollectionTx)
        .to.emit(project, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );

      const collection = await project.getCollectionById("2");
      expect(collection.tokenContract).to.equal(essenceStone.address);
      expect(collection.creator).to.equal(creator.address);
      expect(collection.tokenType).to.equal(TokenType.ERC1155);
    });

    it("Add Collection : Failed : Only Operator", async () => {
      const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
      const shadowMonarch2 = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await shadowMonarch2.deployed();

      const addCollectionTx = project
        .connect(notOperator)
        .addCollection(shadowMonarch2.address, creator.address);

      await expect(addCollectionTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Add Collection : Failed : Already Exist Token Contract", async () => {
      const tokenContract = await project.getTokenContractByCollectionId("1");
      const addCollectionTx = project
        .connect(operatorManager)
        .addCollection(tokenContract, creator.address);

      await expect(addCollectionTx).to.revertedWithCustomError(
        project,
        "AlreadyExistTokenContract"
      );
    });

    it("Add Collection : Failed : Invalid Token Contract", async () => {
      const addCollectionTx = project
        .connect(operatorManager)
        .addCollection(project.address, creator.address);

      await expect(addCollectionTx).to.revertedWithCustomError(
        project,
        "InvalidTokenContract"
      );
    });

    it("Set Collection Token Contract : Success : ERC721", async () => {
      const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
      const shadowMonarch = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await shadowMonarch.deployed();

      const setCollectionTokenContractTx = await project
        .connect(operatorManager)
        .setCollectionTokenContract("1", shadowMonarch.address);
      await setCollectionTokenContractTx.wait();

      const collection = await project.getCollectionById("1");
      expect(collection.tokenContract).to.equal(shadowMonarch.address);
      expect(collection.tokenType).to.equal(TokenType.ERC721);
    });

    it("Set Collection Token Contract : Success : ERC1155", async () => {
      const EssenceStone = await ethers.getContractFactory("SLEssenceStone");
      const essenceStone = await upgrades.deployProxy(
        EssenceStone,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await essenceStone.deployed();

      const setCollectionTokenContractTx = await project
        .connect(operatorManager)
        .setCollectionTokenContract("1", essenceStone.address);
      await setCollectionTokenContractTx.wait();

      const collection = await project.getCollectionById("1");
      expect(collection.tokenContract).to.equal(essenceStone.address);
      expect(collection.tokenType).to.equal(TokenType.ERC1155);
    });

    it("Set Collection Token Contract : Failed : Only Operator", async () => {
      const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
      const shadowMonarch2 = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await shadowMonarch2.deployed();

      const setCollectionTokenContractTx = project
        .connect(notOperator)
        .setCollectionTokenContract("1", shadowMonarch2.address);

      await expect(setCollectionTokenContractTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Set Collection Token Contract : Failed : Invalid Collection Id", async () => {
      const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
      const shadowMonarch2 = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [project.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await shadowMonarch2.deployed();

      const setCollectionTokenContractTx = project
        .connect(operatorManager)
        .setCollectionTokenContract("100", shadowMonarch2.address);

      await expect(setCollectionTokenContractTx).to.revertedWithCustomError(
        project,
        "InvalidCollectionId"
      );
    });

    it("Set Collection Token Contract : Failed : Already Exist Token Contract", async () => {
      const tokenContract = await project.getTokenContractByCollectionId("2");

      const setCollectionTokenContractTx = project
        .connect(operatorManager)
        .setCollectionTokenContract("1", tokenContract);

      await expect(setCollectionTokenContractTx).to.revertedWithCustomError(
        project,
        "AlreadyExistTokenContract"
      );
    });

    it("Set Collection Token Contract : Failed : Invalid Token Contract", async () => {
      const setCollectionTokenContractTx = project
        .connect(operatorManager)
        .setCollectionTokenContract("1", project.address);

      await expect(setCollectionTokenContractTx).to.revertedWithCustomError(
        project,
        "InvalidTokenContract"
      );
    });

    it("Set Collection Creator : Success", async () => {
      const setCollectionCreatorTx = await project
        .connect(operatorManager)
        .setCollectionCreator("1", newCreator.address);
      await setCollectionCreatorTx.wait();

      const collection = await project.getCollectionById("1");
      expect(collection.creator).to.equal(newCreator.address);

      const setCollectionCreatorTx2 = await project
        .connect(operatorManager)
        .setCollectionCreator("1", creator.address);
      await setCollectionCreatorTx2.wait();
    });

    it("Set Collection Creator : Failed : Only Operator", async () => {
      const setCollectionCreatorTx = project
        .connect(notOperator)
        .setCollectionCreator("1", newCreator.address);

      await expect(setCollectionCreatorTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Set Collection Creator : Failed : Invalid Collection Id", async () => {
      const setCollectionCreatorTx = project
        .connect(operatorManager)
        .setCollectionCreator("100", newCreator.address);

      await expect(setCollectionCreatorTx).to.revertedWithCustomError(
        project,
        "InvalidCollectionId"
      );
    });

    it("Set Collection Active : Success", async () => {
      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive("1", false);
      await setCollectionActiveTx.wait();

      const isActiveCollection = await project.isActiveCollection("1");
      expect(isActiveCollection).to.equal(false);

      const setCollectionActiveTx2 = await project
        .connect(operatorManager)
        .setCollectionActive("1", true);
      await setCollectionActiveTx2.wait();
    });

    it("Set Collection Active : Failed : Only Operator", async () => {
      const setCollectionActiveTx = project
        .connect(notOperator)
        .setCollectionActive("1", false);

      await expect(setCollectionActiveTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Set Collection Active : Failed : Invalid Collection Id", async () => {
      const setCollectionActiveTx = project
        .connect(operatorManager)
        .setCollectionActive("100", false);

      await expect(setCollectionActiveTx).to.revertedWithCustomError(
        project,
        "InvalidCollectionId"
      );
    });

    it("Add Collection Of Universe : Success", async () => {
      const addCollectionOfUniverseTx = await project
        .connect(operatorManager)
        .addCollectionOfUniverse("1", "1");
      await addCollectionOfUniverseTx.wait();

      const isContainCollectionOfUniverse =
        await project.isContainCollectionOfUniverse("1", "1");
      expect(isContainCollectionOfUniverse).to.equal(true);
    });

    it("Add Collection Of Universe : Failed : Only Operator", async () => {
      const addCollectionOfUniverseTx = project
        .connect(notOperator)
        .addCollectionOfUniverse("1", "2");

      await expect(addCollectionOfUniverseTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Add Collection Of Universe : Failed : Invalid Universe Id", async () => {
      const addCollectionOfUniverseTx = project
        .connect(operatorManager)
        .addCollectionOfUniverse("100", "2");

      await expect(addCollectionOfUniverseTx).to.revertedWithCustomError(
        project,
        "InvalidUniverseId"
      );
    });

    it("Add Collection Of Universe : Failed : Invalid Collection Id", async () => {
      const addCollectionOfUniverseTx = project
        .connect(operatorManager)
        .addCollectionOfUniverse("1", "100");

      await expect(addCollectionOfUniverseTx).to.revertedWithCustomError(
        project,
        "InvalidCollectionId"
      );
    });

    it("Remove Collection Of Universe : Success", async () => {
      const removeCollectionOfUniverseTx = await project
        .connect(operatorManager)
        .removeCollectionOfUniverse("1", "1");
      await removeCollectionOfUniverseTx.wait();

      const isContainCollectionOfUniverse =
        await project.isContainCollectionOfUniverse("1", "1");
      expect(isContainCollectionOfUniverse).to.equal(false);
    });

    it("Remove Collection Of Universe : Failed : Only Operator", async () => {
      const addCollectionOfUniverseTx = await project
        .connect(operatorManager)
        .addCollectionOfUniverse("1", "1");
      await addCollectionOfUniverseTx.wait();

      const removeCollectionOfUniverseTx = project
        .connect(notOperator)
        .removeCollectionOfUniverse("1", "1");

      await expect(removeCollectionOfUniverseTx).to.revertedWithCustomError(
        project,
        "OnlyOperator"
      );
    });

    it("Remove Collection Of Universe : Failed : Invalid Universe Id", async () => {
      const removeCollectionOfUniverseTx = project
        .connect(operatorManager)
        .removeCollectionOfUniverse("100", "1");

      await expect(removeCollectionOfUniverseTx).to.revertedWithCustomError(
        project,
        "InvalidUniverseId"
      );
    });

    it("Remove Collection Of Universe : Failed : Invalid Collection Id", async () => {
      const removeCollectionOfUniverseTx = project
        .connect(operatorManager)
        .removeCollectionOfUniverse("1", "100");

      await expect(removeCollectionOfUniverseTx).to.revertedWithCustomError(
        project,
        "InvalidCollectionId"
      );
    });

    it("Get Collection Id Of Universe", async () => {
      const collections = await project.getCollectionIdOfUniverse("1", true);

      const setCollectionActiveTx = await project
        .connect(operatorManager)
        .setCollectionActive("1", false);
      await setCollectionActiveTx.wait();

      const collections2 = await project.getCollectionIdOfUniverse("1", true);

      expect(collections[0]).to.equal("1");
      expect(collections2.length).to.equal(0);
    });
  });
});
