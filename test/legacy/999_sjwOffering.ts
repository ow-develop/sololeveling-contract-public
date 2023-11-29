import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import {
  getBlockTimestamp,
  getCurrentBlockTimestamp,
  setNextBlockTimestamp,
} from "./../../helpers/block-timestamp";
import {
  Create,
  Minted,
  MintedBatch,
  OfferingRemoved,
  OwnershipClaimed,
  OwnershipDistributed,
  SetOwnershipAccount,
} from "../../helpers/type/event";
import { OfferingType } from "../../helpers/constant/contract";
import { ZERO_ADDRESS } from "../../helpers/constant/common";

describe("SJWOffering", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    creator: SignerWithAddress,
    ownershipAccount1: SignerWithAddress,
    ownershipAccount2: SignerWithAddress,
    ownershipAccount3: SignerWithAddress,
    ownershipAccount4: SignerWithAddress,
    ownershipAccount5: SignerWithAddress,
    newOwnershipAccount: SignerWithAddress,
    notOwnershipAccount: SignerWithAddress,
    airdropAccount1: SignerWithAddress,
    airdropAccount2: SignerWithAddress,
    publicAccount1: SignerWithAddress,
    publicAccount2: SignerWithAddress,
    whitelistAccount1: SignerWithAddress,
    whitelistAccount2: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    sjwOffering: Contract,
    shadowMonarch: Contract;

  let CreateEvent: Create,
    OfferingRemovedEvent: OfferingRemoved,
    MintedEvent: Minted,
    MintedBatchEvent: MintedBatch,
    OwnershipClaimedEvent: OwnershipClaimed,
    OwnershipDistributedEvent: OwnershipDistributed,
    SetOwnershipAccountEvent: SetOwnershipAccount;

  let ownershipStartTimestamp: number,
    ownershipAccounts: SignerWithAddress[],
    accountIndex: number,
    ownershipAccount: SignerWithAddress,
    latestOfferingEndTimestamp: number,
    whitelistSignature: string;

  const supplies = [500, 200, 300, 300, 700];

  const convertDayToSecond = (days: number) => {
    return days * 86400;
  };

  before(async () => {
    [
      operatorMaster,
      operatorManager,
      notOperator,
      creator,
      ownershipAccount1,
      ownershipAccount2,
      ownershipAccount3,
      ownershipAccount4,
      ownershipAccount5,
      newOwnershipAccount,
      notOwnershipAccount,
      airdropAccount1,
      airdropAccount2,
      publicAccount1,
      publicAccount2,
      whitelistAccount1,
      whitelistAccount2,
    ] = await ethers.getSigners();
    console.log(
      "Deploying contracts with the account: " + operatorMaster.address
    );

    ownershipAccounts = [
      ownershipAccount1,
      ownershipAccount2,
      ownershipAccount3,
      ownershipAccount4,
      ownershipAccount5,
    ];

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

    // deploy sjwOffering
    const SJWOffering = await ethers.getContractFactory("SLSJWOffering");
    sjwOffering = await upgrades.deployProxy(
      SJWOffering,
      [
        project.address,
        project.address,
        1,
        [
          ownershipAccount1.address,
          ownershipAccount2.address,
          ownershipAccount3.address,
          ownershipAccount4.address,
          ownershipAccount5.address,
        ],
        supplies,
      ],
      {
        kind: "uups",
      }
    );
    const receipt = await sjwOffering.deployed();
    console.log(`SJWOffering deployed to: ${sjwOffering.address}`);

    ownershipStartTimestamp =
      (await getBlockTimestamp(receipt.blockNumber)) + convertDayToSecond(365);

    // deploy shadow monarch - collectionId 1
    const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
    shadowMonarch = await upgrades.deployProxy(
      ShadowMonarch,
      [project.address, ZERO_ADDRESS, [sjwOffering.address], "baseTokenURI"],
      {
        kind: "uups",
      }
    );
    await shadowMonarch.deployed();
    console.log(`ShadowMonarch deployed to: ${shadowMonarch.address}`);

    const addCollectionTx1 = await project.addCollection(
      shadowMonarch.address,
      creator.address
    );
    await addCollectionTx1.wait();
  });

  ///////////////
  // Ownership //
  ///////////////

  describe("Ownership", async () => {
    it("Ownership Account Init : Failed : Invalid Argument", async () => {
      const SJWOffering = await ethers.getContractFactory("SLSJWOffering");
      const deployTx = upgrades.deployProxy(
        SJWOffering,
        [
          project.address,
          project.address,
          1,
          [
            ownershipAccount1.address,
            ownershipAccount2.address,
            ownershipAccount3.address,
            ownershipAccount4.address,
            ownershipAccount5.address,
          ],
          [500, 200, 400, 500],
        ],
        {
          kind: "uups",
        }
      );

      await expect(deployTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidArgument"
      );
    });

    it("Ownership Account Init : Failed : Invalid Supply", async () => {
      const SJWOffering = await ethers.getContractFactory("SLSJWOffering");
      const deployTx = upgrades.deployProxy(
        SJWOffering,
        [
          project.address,
          project.address,
          1,
          [
            ownershipAccount1.address,
            ownershipAccount2.address,
            ownershipAccount3.address,
            ownershipAccount4.address,
            ownershipAccount5.address,
          ],
          [500, 200, 400, 500, 1000],
        ],
        {
          kind: "uups",
        }
      );

      await expect(deployTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidSupply"
      );
    });

    it("Get Ownership Start Timestamp", async () => {
      expect(await sjwOffering.getOwnershipStartTimestamp()).to.equal(
        ownershipStartTimestamp
      );
    });

    it("Get Ownership Accounts", async () => {
      const accounts = [
        ownershipAccount1.address,
        ownershipAccount2.address,
        ownershipAccount3.address,
        ownershipAccount4.address,
        ownershipAccount5.address,
      ];
      const ownershipAccounts = await sjwOffering.getOwnershipAccounts();

      for (let i = 0; i < ownershipAccounts.length; i++) {
        expect(ownershipAccounts[i]).to.equal(accounts[i]);
      }
    });

    it("Get Ownerships", async () => {
      const ownerships = await sjwOffering.getOwnerships();

      for (let i = 0; i < ownerships.length; i++) {
        expect(ownerships[i].supply).to.equal(supplies[i]);
      }
    });

    it("Get Mintable Supply", async () => {
      const accounts = [
        ownershipAccount1.address,
        ownershipAccount2.address,
        ownershipAccount3.address,
        ownershipAccount4.address,
        ownershipAccount5.address,
      ];

      for (let i = 0; i < accounts.length; i++) {
        expect(
          await sjwOffering.getMintableSupplyByAccount(accounts[i])
        ).to.equal(0);
      }
    });

    it("Get Mintable Supply : Failed : Only Ownership Account", async () => {
      const supply = sjwOffering.getMintableSupplyByAccount(
        notOwnershipAccount.address
      );

      await expect(supply).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOwnershipAccount"
      );
    });

    it("Claim Ownership : Failed : Not Exist Mintable Supply", async () => {
      const claimOwnershipTx = sjwOffering
        .connect(ownershipAccount1)
        .claimOwnership();

      await expect(claimOwnershipTx).to.revertedWithCustomError(
        sjwOffering,
        "NotExistMintableSupply"
      );
    });

    it("Distribute Ownership : Failed : Not Exist Mintable Supply", async () => {
      const distributeOwnershipTx = sjwOffering.distributeOwnership(1);

      await expect(distributeOwnershipTx).to.revertedWithCustomError(
        sjwOffering,
        "NotExistMintableSupply"
      );
    });

    it("Claim Ownership : Success : Account 1 : 180 days * 1", async () => {
      await setNextBlockTimestamp(convertDayToSecond(365));

      await setNextBlockTimestamp(convertDayToSecond(180));

      accountIndex = 0;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(amount);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(amount);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(amount);
    });

    it("Claim Ownership : Success : Account 2 : 180 days * 1", async () => {
      accountIndex = 1;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(amount);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(amount);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(amount);
    });

    it("Claim Ownership : Success : Account 3 : 180 days * 1", async () => {
      accountIndex = 2;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(amount);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(amount);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(amount);
    });

    it("Claim Ownership : Success : Account 4 : 180 days * 1", async () => {
      accountIndex = 3;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(amount);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(amount);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(amount);
    });

    it("Claim Ownership : Success : Account 5 : 180 days * 1 : Exceed Max Amount Per Mint", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      let amount = supplyPerLockUpTime * 1;

      if (amount > 150) {
        amount = 150;
      }

      expect(mintableSupply).to.equal(supplyPerLockUpTime);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(amount);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(amount);
    });

    it("Claim Ownership : Success : Account 5 : 180 days * 1 : Second", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const amount = supplyPerLockUpTime * 1 - 150;

      expect(mintableSupply).to.equal(supplyPerLockUpTime * 1);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(mintableSupply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(mintableSupply);
    });

    it("Claim Ownership : Success : Account 1 : 180 days * 2", async () => {
      await setNextBlockTimestamp(convertDayToSecond(180));

      accountIndex = 0;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 2;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 2 : 180 days * 2", async () => {
      accountIndex = 1;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 2;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 3 : 180 days * 2", async () => {
      accountIndex = 2;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 2;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 4 : 180 days * 2", async () => {
      accountIndex = 3;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 2;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 5 : 180 days * 2 : Exceed Max Amount Per Mint", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 2;
      let amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      if (amount > 150) {
        amount = 150;
      }

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply - (supplyPerLockUpTime * 1 - amount));

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply - (supplyPerLockUpTime * 1 - amount));
    });

    it("Claim Ownership : Success : Account 5 : 180 days * 2 : Second", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 2;
      const amount = supplyPerLockUpTime * 1 - 150;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 1 : 180 days * 3", async () => {
      await setNextBlockTimestamp(convertDayToSecond(180));

      accountIndex = 0;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 3;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 2 : 180 days * 3", async () => {
      accountIndex = 1;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 3;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 3 : 180 days * 3", async () => {
      accountIndex = 2;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 3;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 4 : 180 days * 3", async () => {
      accountIndex = 3;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 3;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 5 : 180 days * 3 : Exceed Max Amount Per Mint", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 3;
      let amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      if (amount > 150) {
        amount = 150;
      }

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply - (supplyPerLockUpTime * 1 - amount));

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply - (supplyPerLockUpTime * 1 - amount));
    });

    it("Claim Ownership : Success : Account 5 : 180 days * 3 : Second", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 3;
      const amount = supplyPerLockUpTime * 1 - 150;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 1 : 180 days * 4", async () => {
      await setNextBlockTimestamp(convertDayToSecond(180));

      accountIndex = 0;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 2 : 180 days * 4", async () => {
      accountIndex = 1;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 3 : 180 days * 4", async () => {
      accountIndex = 2;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Claim Ownership : Success : Account 4 : 180 days * 4", async () => {
      accountIndex = 3;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 4;
      const amount = supplyPerLockUpTime * 1;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const claimOwnershipTx = await sjwOffering
        .connect(ownershipAccount)
        .claimOwnership();

      const timestamp = await getBlockTimestamp(claimOwnershipTx.blockNumber);

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipClaimedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(claimOwnershipTx)
        .to.emit(sjwOffering, "OwnershipClaimed")
        .withArgs(
          OwnershipClaimedEvent.ownershipId,
          OwnershipClaimedEvent.account,
          OwnershipClaimedEvent.amount,
          OwnershipClaimedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supply);
    });

    it("Set Ownership Account : Success", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const ownershipId = await sjwOffering.getOwnershipIdByAccount(
        ownershipAccount.address
      );

      const setOwnershipAccountTx = await sjwOffering.setOwnershipAccount(
        ownershipId,
        newOwnershipAccount.address
      );

      const timestamp = await getBlockTimestamp(
        setOwnershipAccountTx.blockNumber
      );

      SetOwnershipAccountEvent = {
        ownershipId,
        beforeAccount: ownershipAccount.address,
        newAccount: newOwnershipAccount.address,
        timestamp,
      };

      await expect(setOwnershipAccountTx)
        .to.emit(sjwOffering, "SetOwnershipAccount")
        .withArgs(
          SetOwnershipAccountEvent.ownershipId,
          SetOwnershipAccountEvent.beforeAccount,
          SetOwnershipAccountEvent.newAccount,
          SetOwnershipAccountEvent.timestamp
        );

      ownershipAccounts = [
        ownershipAccount1,
        ownershipAccount2,
        ownershipAccount3,
        ownershipAccount4,
        newOwnershipAccount,
      ];
    });

    it("Set Ownership Account : Failed : Only Operator Master", async () => {
      const setOwnershipAccountTx = sjwOffering
        .connect(operatorManager)
        .setOwnershipAccount(1, notOwnershipAccount.address);

      await expect(setOwnershipAccountTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperatorMaster"
      );
    });

    it("Set Ownership Account : Failed : Already Ownership Account", async () => {
      const setOwnershipAccountTx = sjwOffering.setOwnershipAccount(
        1,
        newOwnershipAccount.address
      );

      await expect(setOwnershipAccountTx).to.revertedWithCustomError(
        sjwOffering,
        "AlreadyOwnershipAccount"
      );
    });

    it("Set Ownership Account : Failed : Invalid Ownership Id", async () => {
      const setOwnershipAccountTx = sjwOffering.setOwnershipAccount(
        100,
        notOwnershipAccount.address
      );

      await expect(setOwnershipAccountTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOwnershipId"
      );
    });

    it("Distribute Ownership : Success : Account 5 : 180 days * 4 : Exceed Max Amount Per Mint", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 4;
      let amount = supplyPerLockUpTime * 1;

      if (amount > 150) {
        amount = 150;
      }

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const distributeOwnershipTx = await sjwOffering.distributeOwnership(
        accountIndex + 1
      );

      const timestamp = await getBlockTimestamp(
        distributeOwnershipTx.blockNumber
      );

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipDistributedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(distributeOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(distributeOwnershipTx)
        .to.emit(sjwOffering, "OwnershipDistributed")
        .withArgs(
          OwnershipDistributedEvent.ownershipId,
          OwnershipDistributedEvent.account,
          OwnershipDistributedEvent.amount,
          OwnershipDistributedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply - (supplyPerLockUpTime * 1 - amount));

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(amount);
    });

    it("Distribute Ownership : Success : Account 5 : 180 days * 4 : Second", async () => {
      accountIndex = 4;
      ownershipAccount = ownershipAccounts[accountIndex];

      const mintableSupply = await sjwOffering.getMintableSupplyByAccount(
        ownershipAccount.address
      );
      const supplyPerLockUpTime = supplies[accountIndex] / 4;
      const supply = supplyPerLockUpTime * 4;
      const amount = supplyPerLockUpTime * 1 - 150;

      expect(mintableSupply).to.equal(supply);

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const distributeOwnershipTx = await sjwOffering.distributeOwnership(
        accountIndex + 1
      );

      const timestamp = await getBlockTimestamp(
        distributeOwnershipTx.blockNumber
      );

      MintedEvent = {
        to: ownershipAccount.address,
        startTokenId: startTokenId,
        amount,
        timestamp,
      };

      OwnershipDistributedEvent = {
        ownershipId: accountIndex + 1,
        account: ownershipAccount.address,
        amount,
        timestamp,
      };

      await expect(distributeOwnershipTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      await expect(distributeOwnershipTx)
        .to.emit(sjwOffering, "OwnershipDistributed")
        .withArgs(
          OwnershipDistributedEvent.ownershipId,
          OwnershipDistributedEvent.account,
          OwnershipDistributedEvent.amount,
          OwnershipDistributedEvent.timestamp
        );

      const minted = await sjwOffering.getOwnershipMintedByAccount(
        ownershipAccount.address
      );
      expect(minted).to.equal(supply);

      const balance = await shadowMonarch.balanceOf(ownershipAccount.address);
      expect(balance).to.equal(supplyPerLockUpTime * 1);
    });

    it("Distribute Ownership : Failed : Only Operator", async () => {
      const distributeOwnershipTx = sjwOffering
        .connect(notOperator)
        .distributeOwnership(1);

      await expect(distributeOwnershipTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Claim Ownership : Failed : Only Ownership Account", async () => {
      const claimOwnershipTx = sjwOffering
        .connect(notOwnershipAccount)
        .claimOwnership();

      await expect(claimOwnershipTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOwnershipAccount"
      );
    });

    it("Claim Ownership : Failed : Already Minted", async () => {
      const claimOwnershipTx = sjwOffering
        .connect(ownershipAccount1)
        .claimOwnership();

      await expect(claimOwnershipTx).to.revertedWithCustomError(
        sjwOffering,
        "AlreadyMinted"
      );
    });
  });

  //////////////
  // Offering //
  //////////////

  describe("Offering", async () => {
    it("Add Public Offering : Success", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();
      latestOfferingEndTimestamp = currentBlockTimestamp + 200;

      const addPublicOfferingTx = await sjwOffering.addPublicOffering(
        100,
        100,
        10,
        currentBlockTimestamp + 100,
        currentBlockTimestamp + 200,
        currentBlockTimestamp + 200,
        ethers.utils.parseEther("1")
      ); // public offeringId 1

      const timestamp = await getBlockTimestamp(
        addPublicOfferingTx.blockNumber
      );

      CreateEvent = {
        target: "PublicOffering",
        targetId: 1,
        timestamp,
      };

      await expect(addPublicOfferingTx)
        .to.emit(sjwOffering, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );

      const isExist = await sjwOffering.isExistOfferingById(
        OfferingType.Public,
        1
      );
      expect(isExist).to.equal(true);

      const offering = await sjwOffering.getPublicOfferingById(1);
      expect(offering.startTimestamp).to.equal(currentBlockTimestamp + 100);
      expect(offering.mintedByPublic).to.equal(0);

      const reservedSupply = await sjwOffering.getOfferingReservedSupply();
      expect(reservedSupply).to.equal(200);
    });

    it("Add Public Offering : Failed : Only Operator", async () => {
      const addPublicOfferingTx = sjwOffering
        .connect(notOperator)
        .addPublicOffering(
          100,
          100,
          10,
          latestOfferingEndTimestamp + 100,
          latestOfferingEndTimestamp + 200,
          latestOfferingEndTimestamp + 200,
          ethers.utils.parseEther("1")
        );

      await expect(addPublicOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Add Public Offering : Failed : Exceed Supply", async () => {
      const ownershipMinted = await sjwOffering.getOwnershipMinted();
      const mintedSupply = await shadowMonarch.getMintedSupply();
      const publicMintedSupply = mintedSupply - ownershipMinted;

      const addPublicOfferingTx = sjwOffering.addPublicOffering(
        publicMintedSupply + 10000,
        100,
        10,
        latestOfferingEndTimestamp + 100,
        latestOfferingEndTimestamp + 200,
        latestOfferingEndTimestamp + 200,
        ethers.utils.parseEther("1")
      );

      await expect(addPublicOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Add Public Offering : Failed : Invalid Timestamp : End Timestamp <= Start Timestamp", async () => {
      const addPublicOfferingTx = sjwOffering.addPublicOffering(
        100,
        100,
        10,
        latestOfferingEndTimestamp + 100,
        latestOfferingEndTimestamp + 100,
        latestOfferingEndTimestamp + 100,
        ethers.utils.parseEther("1")
      );

      await expect(addPublicOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Add Public Offering : Failed : Invalid Timestamp : End Timestamp < Whitelist Expiration Timestamp", async () => {
      const addPublicOfferingTx = sjwOffering.addPublicOffering(
        100,
        100,
        10,
        latestOfferingEndTimestamp + 100,
        latestOfferingEndTimestamp + 160,
        latestOfferingEndTimestamp + 150,
        ethers.utils.parseEther("1")
      );

      await expect(addPublicOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Add Public Offering : Failed : Invalid Timestamp : Start Timestamp <= Current Timestamp", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPublicOfferingTx = sjwOffering.addPublicOffering(
        100,
        100,
        10,
        currentBlockTimestamp,
        currentBlockTimestamp + 150,
        currentBlockTimestamp + 150,
        ethers.utils.parseEther("1")
      );

      await expect(addPublicOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Add Public Offering : Failed : Invalid Timestamp : Before End Timestamp >= Start Timestamp", async () => {
      const addPublicOfferingTx = sjwOffering.addPublicOffering(
        100,
        100,
        10,
        latestOfferingEndTimestamp,
        latestOfferingEndTimestamp + 150,
        latestOfferingEndTimestamp + 150,
        ethers.utils.parseEther("1")
      );

      await expect(addPublicOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Set Public Offering Supply : Success", async () => {
      const beforeReservedSupply =
        await sjwOffering.getOfferingReservedSupply();
      expect(beforeReservedSupply).to.equal(200);

      const setPublicOfferingSupply = await sjwOffering.setPublicOfferingSupply(
        1,
        200,
        100,
        10
      );
      await setPublicOfferingSupply.wait();

      const offering = await sjwOffering.getPublicOfferingById(1);
      expect(offering.supplyToWhitelist).to.equal(200);
      expect(offering.supplyToPublic).to.equal(100);
      expect(offering.accountMaxSupply).to.equal(10);

      const afterReservedSupply = await sjwOffering.getOfferingReservedSupply();
      expect(afterReservedSupply).to.equal(300);
    });

    it("Set Public Offering Supply : Failed : Only Operator", async () => {
      const setPublicOfferingSupplyTx = sjwOffering
        .connect(notOperator)
        .setPublicOfferingSupply(1, 200, 100, 10);

      await expect(setPublicOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Public Offering Supply : Failed : Invalid Offering Id", async () => {
      const setPublicOfferingSupplyTx = sjwOffering.setPublicOfferingSupply(
        100,
        200,
        100,
        10
      );

      await expect(setPublicOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOfferingId"
      );
    });

    it("Set Public Offering Supply : Failed : Exceed Supply", async () => {
      const setPublicOfferingSupplyTx = sjwOffering.setPublicOfferingSupply(
        1,
        10000,
        100,
        10
      );

      await expect(setPublicOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Set Public Offering Timestamp : Success", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPublicOfferingTimestamp =
        await sjwOffering.setPublicOfferingTimestamp(
          1,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 150,
          currentBlockTimestamp + 200
        );
      await setPublicOfferingTimestamp.wait();

      const offering = await sjwOffering.getPublicOfferingById(1);
      expect(offering.startTimestamp).to.equal(currentBlockTimestamp + 100);
      expect(offering.whitelistExpirationTimestamp).to.equal(
        currentBlockTimestamp + 150
      );
      expect(offering.endTimestamp).to.equal(currentBlockTimestamp + 200);

      latestOfferingEndTimestamp = currentBlockTimestamp + 200;
    });

    it("Set Public Offering Timestamp : Failed : Only Operator", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPublicOfferingTimestampTx = sjwOffering
        .connect(notOperator)
        .setPublicOfferingTimestamp(
          1,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 150,
          currentBlockTimestamp + 200
        );

      await expect(setPublicOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Public Offering Timestamp : Failed : Invalid Offering Id", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPublicOfferingTimestampTx =
        sjwOffering.setPublicOfferingTimestamp(
          100,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 150,
          currentBlockTimestamp + 200
        );

      await expect(setPublicOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOfferingId"
      );
    });

    it("Set Public Offering Timestamp : Failed : Invalid Timestamp : End Timestamp <= Start Timestamp", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPublicOfferingTimestampTx =
        sjwOffering.setPublicOfferingTimestamp(
          1,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 100
        );

      await expect(setPublicOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Set Public Offering Timestamp : Failed : Invalid Timestamp : End Timestamp < Whitelist Expiration Timestamp", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPublicOfferingTimestampTx =
        sjwOffering.setPublicOfferingTimestamp(
          1,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 200,
          currentBlockTimestamp + 150
        );

      await expect(setPublicOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Set Public Offering Timestamp : Failed : Invalid Timestamp : Start Timestamp <= Current Timestamp", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPublicOfferingTimestampTx =
        sjwOffering.setPublicOfferingTimestamp(
          1,
          currentBlockTimestamp,
          currentBlockTimestamp + 200,
          currentBlockTimestamp + 200
        );

      await expect(setPublicOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Add Private Offering : Success", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();
      latestOfferingEndTimestamp = currentBlockTimestamp + 200;

      const addPrivateOfferingTx = await sjwOffering.addPrivateOffering(
        100, // supply
        10, // accountMaxSupply
        currentBlockTimestamp + 100, // startTimestamp
        currentBlockTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 1

      const timestamp = await getBlockTimestamp(
        addPrivateOfferingTx.blockNumber
      );

      CreateEvent = {
        target: "PrivateOffering",
        targetId: 1,
        timestamp,
      };

      await expect(addPrivateOfferingTx)
        .to.emit(sjwOffering, "Create")
        .withArgs(
          CreateEvent.target,
          CreateEvent.targetId,
          CreateEvent.timestamp
        );

      const isExist = await sjwOffering.isExistOfferingById(
        OfferingType.Private,
        1
      );
      expect(isExist).to.equal(true);

      const offering = await sjwOffering.getPrivateOfferingById(1);
      expect(offering.startTimestamp).to.equal(currentBlockTimestamp + 100);
      expect(offering.minted).to.equal(0);

      const reservedSupply = await sjwOffering.getOfferingReservedSupply();
      expect(reservedSupply).to.equal(400);
    });

    it("Add Private Offering : Failed : Only Operator", async () => {
      const addPrivateOfferingTx = sjwOffering
        .connect(notOperator)
        .addPrivateOffering(
          100, // supply
          10, // accountMaxSupply
          latestOfferingEndTimestamp + 100, // startTimestamp
          latestOfferingEndTimestamp + 200, // endTimestamp
          ethers.utils.parseEther("1") // price
        ); // private offeringId 1

      await expect(addPrivateOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Add Private Offering : Failed : Exceed Supply", async () => {
      const addPrivateOfferingTx = sjwOffering.addPrivateOffering(
        10000, // supply
        10, // accountMaxSupply
        latestOfferingEndTimestamp + 100, // startTimestamp
        latestOfferingEndTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 1

      await expect(addPrivateOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Add Private Offering : Failed : Invalid Supply", async () => {
      const addPrivateOfferingTx = sjwOffering.addPrivateOffering(
        100, // supply
        9, // accountMaxSupply
        latestOfferingEndTimestamp + 100, // startTimestamp
        latestOfferingEndTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 1

      await expect(addPrivateOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidSupply"
      );
    });

    it("Add Private Offering : Failed : Invalid Supply 2", async () => {
      const addPrivateOfferingTx = sjwOffering.addPrivateOffering(
        0, // supply
        10, // accountMaxSupply
        latestOfferingEndTimestamp + 100, // startTimestamp
        latestOfferingEndTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 1

      await expect(addPrivateOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidSupply"
      );
    });

    it("Add Private Offering : Failed : Invalid Timestamp : End Timestamp <= Start Timestamp", async () => {
      const addPrivateOfferingTx = sjwOffering.addPrivateOffering(
        100, // supply
        10, // accountMaxSupply
        latestOfferingEndTimestamp + 200, // startTimestamp
        latestOfferingEndTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 1

      await expect(addPrivateOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Add Private Offering : Failed : Invalid Timestamp : Start Timestamp <= Current Timestamp", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPrivateOfferingTx = sjwOffering.addPrivateOffering(
        100, // supply
        10, // accountMaxSupply
        currentBlockTimestamp, // startTimestamp
        currentBlockTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 1

      await expect(addPrivateOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Set Private Offering Supply : Success", async () => {
      const beforeReservedSupply =
        await sjwOffering.getOfferingReservedSupply();
      expect(beforeReservedSupply).to.equal(400);

      const setPrivateOfferingSupply =
        await sjwOffering.setPrivateOfferingSupply(1, 200, 10);
      await setPrivateOfferingSupply.wait();

      const offering = await sjwOffering.getPrivateOfferingById(1);
      expect(offering.supply).to.equal(200);
      expect(offering.accountMaxSupply).to.equal(10);

      const afterReservedSupply = await sjwOffering.getOfferingReservedSupply();
      expect(afterReservedSupply).to.equal(500);
    });

    it("Set Private Offering Supply : Failed : Only Operator", async () => {
      const setPrivateOfferingSupplyTx = sjwOffering
        .connect(notOperator)
        .setPrivateOfferingSupply(1, 200, 10);

      await expect(setPrivateOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Private Offering Supply : Failed : Invalid Offering Id", async () => {
      const setPrivateOfferingSupplyTx = sjwOffering.setPrivateOfferingSupply(
        100,
        200,
        10
      );

      await expect(setPrivateOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOfferingId"
      );
    });

    it("Set Private Offering Supply : Failed : Exceed Supply", async () => {
      const setPrivateOfferingSupplyTx = sjwOffering.setPrivateOfferingSupply(
        1,
        10000,
        10
      );

      await expect(setPrivateOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Set Private Offering Supply : Failed : Invalid Supply", async () => {
      const setPrivateOfferingSupplyTx = sjwOffering.setPrivateOfferingSupply(
        1,
        100,
        9
      );

      await expect(setPrivateOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidSupply"
      );
    });

    it("Set Private Offering Supply : Failed : Invalid Supply 2", async () => {
      const setPrivateOfferingSupplyTx = sjwOffering.setPrivateOfferingSupply(
        1,
        0,
        1
      );

      await expect(setPrivateOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidSupply"
      );
    });

    it("Set Private Offering Timestamp : Success", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPrivateOfferingTimestamp =
        await sjwOffering.setPrivateOfferingTimestamp(
          1,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 200
        );
      await setPrivateOfferingTimestamp.wait();

      const offering = await sjwOffering.getPrivateOfferingById(1);
      expect(offering.startTimestamp).to.equal(currentBlockTimestamp + 100);
      expect(offering.endTimestamp).to.equal(currentBlockTimestamp + 200);
    });

    it("Set Private Offering Timestamp : Failed : Only Operator", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPrivateOfferingTimestampTx = sjwOffering
        .connect(notOperator)
        .setPrivateOfferingTimestamp(
          1,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 200
        );

      await expect(setPrivateOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Private Offering Timestamp : Failed : Invalid Offering Id", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPrivateOfferingTimestampTx =
        sjwOffering.setPrivateOfferingTimestamp(
          100,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 200
        );

      await expect(setPrivateOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOfferingId"
      );
    });

    it("Set Private Offering Timestamp : Failed : Invalid Timestamp : End Timestamp <= Start Timestamp", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPrivateOfferingTimestampTx =
        sjwOffering.setPrivateOfferingTimestamp(
          1,
          currentBlockTimestamp + 100,
          currentBlockTimestamp + 100
        );

      await expect(setPrivateOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Set Private Offering Timestamp : Failed : Invalid Timestamp : Start Timestamp <= Current Timestamp", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const setPrivateOfferingTimestampTx =
        sjwOffering.setPrivateOfferingTimestamp(
          1,
          currentBlockTimestamp,
          currentBlockTimestamp + 100
        );

      await expect(setPrivateOfferingTimestampTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Remove Offering : Success : Public", async () => {
      const removeOfferingTx = await sjwOffering.removeOffering(
        OfferingType.Public,
        1
      );

      const timestamp = await getBlockTimestamp(removeOfferingTx.blockNumber);

      OfferingRemovedEvent = {
        offeringType: OfferingType.Public,
        offeringId: 1,
        timestamp,
      };

      await expect(removeOfferingTx)
        .to.emit(sjwOffering, "OfferingRemoved")
        .withArgs(
          OfferingRemovedEvent.offeringType,
          OfferingRemovedEvent.offeringId,
          OfferingRemovedEvent.timestamp
        );

      const isExist = await sjwOffering.isExistOfferingById(
        OfferingType.Public,
        1
      );
      expect(isExist).to.equal(false);

      const reservedSupply = await sjwOffering.getOfferingReservedSupply();
      expect(reservedSupply).to.equal(200);
    });

    it("Remove Offering : Success : Private", async () => {
      const removeOfferingTx = await sjwOffering.removeOffering(
        OfferingType.Private,
        1
      );

      const timestamp = await getBlockTimestamp(removeOfferingTx.blockNumber);

      OfferingRemovedEvent = {
        offeringType: OfferingType.Private,
        offeringId: 1,
        timestamp,
      };

      await expect(removeOfferingTx)
        .to.emit(sjwOffering, "OfferingRemoved")
        .withArgs(
          OfferingRemovedEvent.offeringType,
          OfferingRemovedEvent.offeringId,
          OfferingRemovedEvent.timestamp
        );

      const isExist = await sjwOffering.isExistOfferingById(
        OfferingType.Private,
        1
      );
      expect(isExist).to.equal(false);

      const reservedSupply = await sjwOffering.getOfferingReservedSupply();
      expect(reservedSupply).to.equal(0);
    });

    it("Remove Offering : Failed : Only Operator", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPrivateOfferingTx = await sjwOffering.addPrivateOffering(
        100, // supply
        10, // accountMaxSupply
        currentBlockTimestamp + 100, // startTimestamp
        currentBlockTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 2
      await addPrivateOfferingTx.wait();

      const removeOfferingTx = sjwOffering
        .connect(notOperator)
        .removeOffering(OfferingType.Private, 2);

      await expect(removeOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Remove Offering : Failed : Invalid Offering Id", async () => {
      const removeOfferingTx = sjwOffering.removeOffering(
        OfferingType.Private,
        100
      );

      await expect(removeOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOfferingId"
      );
    });

    it("Remove Offering : Failed : Already Start Offering", async () => {
      await setNextBlockTimestamp(100);

      const removeOfferingTx = sjwOffering.removeOffering(
        OfferingType.Private,
        2
      );

      await expect(removeOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "AlreadyStartOffering"
      );
    });

    it("Set Offering Price : Success : Public", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPublicOfferingTx = await sjwOffering.addPublicOffering(
        100,
        100,
        10,
        currentBlockTimestamp + 100,
        currentBlockTimestamp + 200,
        currentBlockTimestamp + 200,
        ethers.utils.parseEther("1")
      ); // public offeringId 2
      await addPublicOfferingTx.wait();

      const setOfferingPriceTx = await sjwOffering.setOfferingPrice(
        OfferingType.Public,
        2,
        ethers.utils.parseEther("2")
      );
      await setOfferingPriceTx.wait();

      const offering = await sjwOffering.getPublicOfferingById(2);
      expect(offering.price).to.equal(ethers.utils.parseEther("2"));
    });

    it("Set Offering Price : Success : Private", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPrivateOfferingTx = await sjwOffering.addPrivateOffering(
        100, // supply
        10, // accountMaxSupply
        currentBlockTimestamp + 100, // startTimestamp
        currentBlockTimestamp + 200, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 3
      await addPrivateOfferingTx.wait();

      const setOfferingPriceTx = await sjwOffering.setOfferingPrice(
        OfferingType.Private,
        3,
        ethers.utils.parseEther("2")
      );
      await setOfferingPriceTx.wait();

      const offering = await sjwOffering.getPrivateOfferingById(3);
      expect(offering.price).to.equal(ethers.utils.parseEther("2"));
    });

    it("Set Offering Price : Failed : Only Operator", async () => {
      const setOfferingPriceTx = sjwOffering
        .connect(notOperator)
        .setOfferingPrice(OfferingType.Public, 2, ethers.utils.parseEther("1"));

      await expect(setOfferingPriceTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Offering Price : Failed : Invalid Offering Id", async () => {
      const setOfferingPriceTx = sjwOffering.setOfferingPrice(
        OfferingType.Public,
        100,
        ethers.utils.parseEther("1")
      );

      await expect(setOfferingPriceTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOfferingId"
      );
    });

    it("Set Offering Price : Failed : Already Start Offering", async () => {
      await setNextBlockTimestamp(100);

      const setOfferingPriceTx = sjwOffering.setOfferingPrice(
        OfferingType.Public,
        2,
        ethers.utils.parseEther("1")
      );

      await expect(setOfferingPriceTx).to.revertedWithCustomError(
        sjwOffering,
        "AlreadyStartOffering"
      );
    });
  });

  /////////////
  // Minting //
  /////////////

  describe("Minting", async () => {
    it("Mint Of Airdrop : Success : Account 1", async () => {
      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const mintOfAirdropTx = await sjwOffering.mintOfAirdrop(
        airdropAccount1.address,
        10
      );
      const timestamp = await getBlockTimestamp(mintOfAirdropTx.blockNumber);

      MintedEvent = {
        to: airdropAccount1.address,
        startTokenId: startTokenId,
        amount: 10,
        timestamp,
      };

      await expect(mintOfAirdropTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      const balance = await shadowMonarch.balanceOf(airdropAccount1.address);
      expect(balance).to.equal(10);
    });

    it("Mint Of Airdrop : Failed : Only Operator", async () => {
      const mintOfAirdropTx = sjwOffering
        .connect(notOperator)
        .mintOfAirdrop(airdropAccount1.address, 10);

      await expect(mintOfAirdropTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Mint Of Airdrop : Failed : Invalid Argument", async () => {
      const mintOfAirdropTx = sjwOffering.mintOfAirdrop(
        airdropAccount1.address,
        0
      );

      await expect(mintOfAirdropTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidArgument"
      );
    });

    it("Mint Of Airdrop : Failed : Exceed Supply", async () => {
      const mintOfAirdropTx = sjwOffering.mintOfAirdrop(
        airdropAccount1.address,
        8000
      );

      await expect(mintOfAirdropTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Mint Of Airdrop : Failed : Exceed Max Amount Per Mint", async () => {
      const mintOfAirdropTx = sjwOffering.mintOfAirdrop(
        airdropAccount1.address,
        5001
      );

      await expect(mintOfAirdropTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedMaxAmountPerMint"
      );
    });

    it("Mint Of Airdrop Batch : Success", async () => {
      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const mintOfAirdropBatchTx = await sjwOffering.mintOfAirdropBatch(
        [airdropAccount1.address, airdropAccount2.address],
        [10, 10]
      );
      const timestamp = await getBlockTimestamp(
        mintOfAirdropBatchTx.blockNumber
      );

      MintedBatchEvent = {
        accounts: [airdropAccount1.address, airdropAccount2.address],
        startTokenId: startTokenId,
        amounts: [10, 10],
        timestamp,
      };

      await expect(mintOfAirdropBatchTx)
        .to.emit(sjwOffering, "MintedBatch")
        .withArgs(
          MintedBatchEvent.accounts,
          MintedBatchEvent.startTokenId,
          MintedBatchEvent.amounts,
          MintedBatchEvent.timestamp
        );

      const balance = await shadowMonarch.balanceOf(airdropAccount1.address);
      expect(balance).to.equal(20);

      const balance2 = await shadowMonarch.balanceOf(airdropAccount2.address);
      expect(balance2).to.equal(10);
    });

    it("Mint Of Airdrop Batch : Failed : Only Operator", async () => {
      const mintOfAirdropBatchTx = sjwOffering
        .connect(notOperator)
        .mintOfAirdropBatch(
          [airdropAccount1.address, airdropAccount2.address],
          [10, 10]
        );

      await expect(mintOfAirdropBatchTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Mint Of Airdrop Batch : Failed : Invalid Argument : Invalid Length", async () => {
      const mintOfAirdropBatchTx = sjwOffering.mintOfAirdropBatch(
        [airdropAccount1.address, airdropAccount2.address],
        [10]
      );

      await expect(mintOfAirdropBatchTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidArgument"
      );
    });

    it("Mint Of Airdrop Batch : Failed : Invalid Argument : Invalid Amount", async () => {
      const mintOfAirdropBatchTx = sjwOffering.mintOfAirdropBatch(
        [airdropAccount1.address, airdropAccount2.address],
        [10, 0]
      );

      await expect(mintOfAirdropBatchTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidArgument"
      );
    });

    it("Mint Of Airdrop Batch : Failed : Exceed Supply", async () => {
      const mintOfAirdropBatchTx = sjwOffering.mintOfAirdropBatch(
        [airdropAccount1.address, airdropAccount2.address],
        [10, 8000]
      );

      await expect(mintOfAirdropBatchTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Mint Of Airdrop Batch : Failed : Exceed Max Amount Per Mint", async () => {
      const mintOfAirdropBatchTx = sjwOffering.mintOfAirdropBatch(
        [airdropAccount1.address, airdropAccount2.address],
        [10, 5001]
      );

      await expect(mintOfAirdropBatchTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedMaxAmountPerMint"
      );
    });

    it("Mint Of Offering : Success : Public : Not Whitelist", async () => {
      await setNextBlockTimestamp(500);

      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPublicOfferingTx = await sjwOffering.addPublicOffering(
        20, // whitelist
        10, // public
        30,
        currentBlockTimestamp + 100,
        currentBlockTimestamp + 200,
        currentBlockTimestamp + 300,
        ethers.utils.parseEther("1")
      ); // public offeringId 3
      await addPublicOfferingTx.wait();

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      await setNextBlockTimestamp(100);

      const mintOfOfferingTx = await sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("10"),
        });

      const timestamp = await getBlockTimestamp(mintOfOfferingTx.blockNumber);

      MintedEvent = {
        to: publicAccount1.address,
        startTokenId,
        amount: 10,
        timestamp,
      };

      await expect(mintOfOfferingTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      const balance = await shadowMonarch.balanceOf(publicAccount1.address);
      expect(balance).to.equal(10);

      const minted = await sjwOffering.getPublicOfferingMinted(3);
      expect(minted.mintedByWhitelist).to.equal(0);
      expect(minted.mintedByPublic).to.equal(10);
    });

    it("Mint Of Offering : Success : Public : Whitelist", async () => {
      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Public", 3, whitelistAccount1.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      const mintOfOfferingTx = await sjwOffering
        .connect(whitelistAccount1)
        .mintOfOffering(OfferingType.Public, 3, whitelistSignature, {
          value: ethers.utils.parseEther("10"),
        });

      const timestamp = await getBlockTimestamp(mintOfOfferingTx.blockNumber);

      MintedEvent = {
        to: whitelistAccount1.address,
        startTokenId,
        amount: 10,
        timestamp,
      };

      await expect(mintOfOfferingTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      const balance = await shadowMonarch.balanceOf(whitelistAccount1.address);
      expect(balance).to.equal(10);

      const minted = await sjwOffering.getPublicOfferingMinted(3);
      expect(minted.mintedByWhitelist).to.equal(10);
      expect(minted.mintedByPublic).to.equal(10);
    });

    it("Mint Of Offering : Failed : Public : Exceed Supply : Whitelist", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount1)
        .mintOfOffering(OfferingType.Public, 3, whitelistSignature, {
          value: ethers.utils.parseEther("15"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Mint Of Offering : Failed : Public : Exceed Supply : Public : Not Ended Whitelist Time", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("10"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Mint Of Offering : Success : Public : Not Whitelist : Ended Whitelist Time", async () => {
      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      await setNextBlockTimestamp(100);

      const mintOfOfferingTx = await sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("10"),
        });

      const timestamp = await getBlockTimestamp(mintOfOfferingTx.blockNumber);

      MintedEvent = {
        to: publicAccount1.address,
        startTokenId,
        amount: 10,
        timestamp,
      };

      await expect(mintOfOfferingTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      const balance = await shadowMonarch.balanceOf(publicAccount1.address);
      expect(balance).to.equal(20);

      const minted = await sjwOffering.getPublicOfferingMinted(3);
      expect(minted.mintedByWhitelist).to.equal(10);
      expect(minted.mintedByPublic).to.equal(20);
    });

    it("Mint Of Offering : Failed : Public : Exceed Supply : Public : Ended Whitelist Time", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(publicAccount2)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("20"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Mint Of Offering : Failed : Public : Invalid Offering Id", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 100, "0x", {
          value: ethers.utils.parseEther("10"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidOfferingId"
      );
    });

    it("Mint Of Offering : Failed : Public : Invalid Price", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("1.5"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidPrice"
      );
    });

    it("Mint Of Offering : Failed : Public : Invalid Price : Amount 0", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("0"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidPrice"
      );
    });

    it("Mint Of Offering : Failed : Public : Exceed Max Amount Per Mint", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("5001"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedMaxAmountPerMint"
      );
    });

    it("Mint Of Offering : Failed : Public : Invalid Timestamp", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(publicAccount1)
        .mintOfOffering(OfferingType.Public, 2, "0x", {
          value: ethers.utils.parseEther("2"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Mint Of Offering : Failed : Public : Exceed Account Max Supply", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount1)
        .mintOfOffering(OfferingType.Public, 3, "0x", {
          value: ethers.utils.parseEther("25"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedAccountMaxSupply"
      );
    });

    it("Mint Of Offering : Failed : Public : Whitelist Signature Verify Failed", async () => {
      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Public", 5, whitelistAccount1.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount1)
        .mintOfOffering(OfferingType.Public, 3, whitelistSignature, {
          value: ethers.utils.parseEther("10"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "WhitelistSignatureVerifyFailed"
      );
    });

    it("Set Public Offering Supply : Failed : Invalid Supply", async () => {
      const setPublicOfferingSupplyTx = sjwOffering.setPublicOfferingSupply(
        3,
        5,
        5,
        1
      );

      await expect(setPublicOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidSupply"
      );
    });

    it("Mint Of Offering : Success : Private", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPrivateOfferingTx = await sjwOffering.addPrivateOffering(
        20, // supply
        10, // accountMaxSupply
        currentBlockTimestamp + 100, // startTimestamp
        currentBlockTimestamp + 500, // endTimestamp
        ethers.utils.parseEther("1") // price
      ); // private offeringId 4
      await addPrivateOfferingTx.wait();

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Private", 4, whitelistAccount2.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      await setNextBlockTimestamp(100);

      const mintOfOfferingTx = await sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 4, whitelistSignature, {
          value: ethers.utils.parseEther("5"),
        });

      const timestamp = await getBlockTimestamp(mintOfOfferingTx.blockNumber);

      MintedEvent = {
        to: whitelistAccount2.address,
        startTokenId,
        amount: 5,
        timestamp,
      };

      await expect(mintOfOfferingTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      const balance = await shadowMonarch.balanceOf(whitelistAccount2.address);
      expect(balance).to.equal(5);

      const minted = await sjwOffering.getPrivateOfferingMinted(4);
      expect(minted).to.equal(5);

      const tokenIds = await shadowMonarch.getTokenOfOwner(
        whitelistAccount2.address
      );
      for (let i = 0; i < tokenIds.length; i++) {
        expect(tokenIds[i]).to.equal(startTokenId + i);
      }
    });

    it("Mint Of Offering : Success : Private : Price 0", async () => {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const addPrivateOfferingTx = await sjwOffering.addPrivateOffering(
        10, // supply
        10, // accountMaxSupply
        currentBlockTimestamp + 100, // startTimestamp
        currentBlockTimestamp + 500, // endTimestamp
        0 // price
      ); // private offeringId 5
      await addPrivateOfferingTx.wait();

      const startTokenId =
        (await shadowMonarch.getMintedSupply()).toNumber() + 1;

      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Private", 5, whitelistAccount2.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      await setNextBlockTimestamp(100);

      const mintOfOfferingTx = await sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 5, whitelistSignature, {
          value: 0,
        });

      const timestamp = await getBlockTimestamp(mintOfOfferingTx.blockNumber);

      MintedEvent = {
        to: whitelistAccount2.address,
        startTokenId,
        amount: 10,
        timestamp,
      };

      await expect(mintOfOfferingTx)
        .to.emit(sjwOffering, "Minted")
        .withArgs(
          MintedEvent.to,
          MintedEvent.startTokenId,
          MintedEvent.amount,
          MintedEvent.timestamp
        );

      const balance = await shadowMonarch.balanceOf(whitelistAccount2.address);
      expect(balance).to.equal(15);

      const minted = await sjwOffering.getPrivateOfferingMinted(5);
      expect(minted).to.equal(10);
    });

    it("Mint Of Offering : Failed : Private : Invalid Timestamp", async () => {
      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Private", 4, whitelistAccount2.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 3, whitelistSignature, {
          value: ethers.utils.parseEther("10"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidTimestamp"
      );
    });

    it("Mint Of Offering : Failed : Private : Invalid Price", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 4, whitelistSignature, {
          value: ethers.utils.parseEther("1.5"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidPrice"
      );
    });

    it("Mint Of Offering : Failed : Private : Invalid Price : Amount 0", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 4, whitelistSignature, {
          value: ethers.utils.parseEther("0"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidPrice"
      );
    });

    it("Mint Of Offering : Failed : Private : Invalid Price : Offering Price 0", async () => {
      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Private", 5, whitelistAccount1.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 5, whitelistSignature, {
          value: ethers.utils.parseEther("1"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidPrice"
      );
    });

    it("Mint Of Offering : Failed : Private : Exceed Max Amount Per Mint", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 4, whitelistSignature, {
          value: ethers.utils.parseEther("5001"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedMaxAmountPerMint"
      );
    });

    it("Mint Of Offering : Failed : Private : Exceed Account Max Supply", async () => {
      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 4, whitelistSignature, {
          value: ethers.utils.parseEther("20"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedAccountMaxSupply"
      );
    });

    it("Mint Of Offering : Failed : Private : Whitelist Signature Verify Failed", async () => {
      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Private", 4, whitelistAccount1.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 4, whitelistSignature, {
          value: ethers.utils.parseEther("5"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "WhitelistSignatureVerifyFailed"
      );
    });

    it("Mint Of Offering : Failed : Private : Exceed Supply", async () => {
      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Private", 5, whitelistAccount1.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount1)
        .mintOfOffering(OfferingType.Private, 5, whitelistSignature, {
          value: 0,
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Set Private Offering Supply : Failed : Invalid Supply", async () => {
      const setPrivateOfferingSupplyTx = sjwOffering.setPrivateOfferingSupply(
        5,
        9,
        1
      );

      await expect(setPrivateOfferingSupplyTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidSupply"
      );
    });

    it("Mint Of Offering : Failed : Private : Exceed Supply : Exceed Public Supply", async () => {
      for (let i = 1; i <= 52; i++) {
        const mintTx = await sjwOffering.mintOfAirdrop(
          publicAccount1.address,
          150
        );
        await mintTx.wait();
      }

      const mintTx = await sjwOffering.mintOfAirdrop(
        publicAccount1.address,
        125
      );
      await mintTx.wait();

      const minted = await shadowMonarch.getMintedSupply();
      expect(minted).to.equal(10000);

      const messageHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address"],
        ["Private", 4, whitelistAccount2.address]
      ); // offeringType, offeringId, buyer
      const messageBinary = ethers.utils.arrayify(messageHash);

      whitelistSignature = await operatorManager.signMessage(messageBinary);

      const mintOfOfferingTx = sjwOffering
        .connect(whitelistAccount2)
        .mintOfOffering(OfferingType.Private, 4, whitelistSignature, {
          value: ethers.utils.parseEther("1"),
        });

      await expect(mintOfOfferingTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Mint Of Airdrop : Failed : Exceed Supply", async () => {
      const mintOfAirdropTx = sjwOffering.mintOfAirdrop(
        publicAccount1.address,
        1
      );

      await expect(mintOfAirdropTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });

    it("Mint Of Airdrop Batch : Failed : Exceed Supply", async () => {
      const mintOfAirdropBatchTx = sjwOffering.mintOfAirdropBatch(
        [publicAccount1.address],
        [1]
      );

      await expect(mintOfAirdropBatchTx).to.revertedWithCustomError(
        sjwOffering,
        "ExceedSupply"
      );
    });
  });

  //////////
  // Base //
  //////////

  describe("Base", async () => {
    it("Set Distribution Contract : Success", async () => {
      const setDistributionContractTx =
        await sjwOffering.setDistributionContract(project.address);
      await setDistributionContractTx.wait();

      const offeringContract = await sjwOffering.getDistributionContract();
      expect(offeringContract).to.equal(project.address);
    });

    it("Set Distribution Contract : Failed : Only Operator", async () => {
      const setDistributionContractTx = sjwOffering
        .connect(notOperator)
        .setDistributionContract(project.address);

      await expect(setDistributionContractTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Shadow Monarch Collection Id : Success", async () => {
      const ShadowMonarch = await ethers.getContractFactory(
        "SLTestShadowMonarch"
      );
      shadowMonarch = await upgrades.deployProxy(
        ShadowMonarch,
        [project.address, ZERO_ADDRESS, [sjwOffering.address], "baseTokenURI"],
        {
          kind: "uups",
        }
      );
      await shadowMonarch.deployed();

      const addCollectionTx2 = await project.addCollection(
        shadowMonarch.address,
        creator.address
      );
      await addCollectionTx2.wait(); // collectionId 2

      const setShadowMonarchCollectionIdTx =
        await sjwOffering.setShadowMonarchCollectionId(2);
      await setShadowMonarchCollectionIdTx.wait();

      const seasonScoreCollectionId =
        await sjwOffering.getShadowMonarchCollectionId();
      expect(seasonScoreCollectionId).to.equal(2);
    });

    it("Set Shadow Monarch Collection Id : Failed : Only Operator", async () => {
      const setShadowMonarchCollectionIdTx = sjwOffering
        .connect(notOperator)
        .setShadowMonarchCollectionId(1);

      await expect(setShadowMonarchCollectionIdTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Shadow Monarch Collection Id : Failed : Invalid Collection Id : Not Exist", async () => {
      const setShadowMonarchCollectionIdTx =
        sjwOffering.setShadowMonarchCollectionId(100);

      await expect(setShadowMonarchCollectionIdTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidCollectionId"
      );
    });

    it("Set Shadow Monarch Collection Id : Failed : Invalid Collection Id : Not Active", async () => {
      const setCollectionActiveTx = await project.setCollectionActive(2, false);
      await setCollectionActiveTx.wait();

      const setShadowMonarchCollectionIdTx =
        sjwOffering.setShadowMonarchCollectionId(2);

      await expect(setShadowMonarchCollectionIdTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidCollectionId"
      );
    });

    it("Set Shadow Monarch Collection Id : Failed : Invalid Collection Id : Not ERC721", async () => {
      const TestMonster = await ethers.getContractFactory("SLTestMonster");
      const normalMonster = await upgrades.deployProxy(
        TestMonster,
        [
          project.address,
          project.address,
          ZERO_ADDRESS,
          [project.address],
          "baseTokenURI",
        ],
        {
          kind: "uups",
        }
      );
      await normalMonster.deployed();

      const addCollectionTx3 = await project
        .connect(operatorManager)
        .addCollection(normalMonster.address, creator.address);
      await addCollectionTx3.wait(); // collectionId 3

      const setShadowMonarchCollectionIdTx =
        sjwOffering.setShadowMonarchCollectionId(3);

      await expect(setShadowMonarchCollectionIdTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidCollectionId"
      );
    });

    it("Set Max Amount Per Mint : Success", async () => {
      const setMaxAmountPerMintTx = await sjwOffering.setMaxAmountPerMint(6000);
      await setMaxAmountPerMintTx.wait();

      const maxAmountPerMint = await sjwOffering.getMaxAmountPerMint();
      expect(maxAmountPerMint).to.equal(6000);
    });

    it("Set Max Amount Per Mint : Failed : Only Operator", async () => {
      const setMaxAmountPerMintTx = sjwOffering
        .connect(notOperator)
        .setMaxAmountPerMint(1);

      await expect(setMaxAmountPerMintTx).to.revertedWithCustomError(
        sjwOffering,
        "OnlyOperator"
      );
    });

    it("Set Max Amount Per Mint : Failed : Invalid Argument", async () => {
      const setMaxAmountPerMintTx = sjwOffering.setMaxAmountPerMint(0);

      await expect(setMaxAmountPerMintTx).to.revertedWithCustomError(
        sjwOffering,
        "InvalidArgument"
      );
    });
  });
});
