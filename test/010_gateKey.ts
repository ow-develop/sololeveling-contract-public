import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { ethers, expect, upgrades } from "hardhat";

import { getBlockTimestamp } from "../helpers/block-timestamp";
import { PriceMode, RankType } from "../helpers/constant/contract";
import {
  KeyMinted,
  KeyMintedBatch,
  KeySold,
  KeySoldBatch,
  SetKeyPrice,
  SetPriceMode,
  SetSellPaused,
  Withdrawal,
} from "../helpers/type/event";
import { ZERO_ADDRESS } from "../helpers/constant/common";

describe("GateKey", () => {
  let operatorMaster: SignerWithAddress,
    operatorManager: SignerWithAddress,
    notOperator: SignerWithAddress,
    hunter1: SignerWithAddress,
    hunter2: SignerWithAddress;

  let project: Contract,
    operator: Contract,
    shop: Contract,
    gateKey: Contract,
    testUSDC: Contract;

  let KeySoldEvent: KeySold,
    KeySoldBatchEvent: KeySoldBatch,
    KeyMintedEvent: KeyMinted,
    KeyMintedBatchEvent: KeyMintedBatch,
    SetPriceModeEvent: SetPriceMode,
    SetKeyPriceEvent: SetKeyPrice,
    SetSellPausedEvent: SetSellPaused,
    WithdrawalEvent: Withdrawal;

  let keyRank: RankType,
    amount: number,
    price: BigNumber,
    totalMaticPrice: BigNumber,
    totalUSDPrice: BigNumber,
    keyRanks: RankType[],
    amounts: number[];

  const maticPrices = [
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("2"),
    ethers.utils.parseEther("2"),
    ethers.utils.parseEther("2"),
  ];
  const usdPrices = [1000000, 4000000, 12000000, 30000000, 66000000, 140000000];
  const balances = [0, 0, 0, 0, 0, 0];

  before(async () => {
    [operatorMaster, operatorManager, notOperator, hunter1, hunter2] =
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

    // deploy test USDC token
    const TestUSDC = await ethers.getContractFactory("TestUSDC");
    testUSDC = await TestUSDC.deploy(0);
    await testUSDC.deployed();
    console.log(`Test USDC deployed to: ${testUSDC.address}`);

    // deploy shop
    const Shop = await ethers.getContractFactory("SLShop");
    shop = await upgrades.deployProxy(
      Shop,
      [project.address, testUSDC.address, 1, 0],
      { kind: "uups" }
    );
    console.log(`Shop deployed to: ${shop.address}`);

    // deploy gateKey
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

    const setProjectApprovalModeTx = await gateKey.setProjectApprovalMode(
      false
    );
    await setProjectApprovalModeTx.wait();

    const addCollectionTx = await project.addCollection(
      gateKey.address,
      operatorMaster.address
    );
    addCollectionTx.wait(); // collectionId 1
  });

  //////////
  // Shop //
  //////////

  describe("Shop", async () => {
    it("Get Price Mode", async () => {
      const priceMode = await shop.getPriceMode();

      expect(priceMode).to.equal(PriceMode.USD);
    });

    it("Get Key Price Per Rank", async () => {
      const maticPrices = await shop.getKeyPricePerRank(PriceMode.MATIC);
      const usdPrices = await shop.getKeyPricePerRank(PriceMode.USD);

      expect(maticPrices[RankType.E]).to.equal(maticPrices[0]);
      expect(maticPrices[RankType.D]).to.equal(maticPrices[1]);
      expect(maticPrices[RankType.C]).to.equal(maticPrices[2]);
      expect(maticPrices[RankType.B]).to.equal(maticPrices[3]);
      expect(maticPrices[RankType.A]).to.equal(maticPrices[4]);
      expect(maticPrices[RankType.S]).to.equal(maticPrices[5]);

      expect(usdPrices[RankType.E]).to.equal(usdPrices[0]);
      expect(usdPrices[RankType.D]).to.equal(usdPrices[1]);
      expect(usdPrices[RankType.C]).to.equal(usdPrices[2]);
      expect(usdPrices[RankType.B]).to.equal(usdPrices[3]);
      expect(usdPrices[RankType.A]).to.equal(usdPrices[4]);
      expect(usdPrices[RankType.S]).to.equal(usdPrices[5]);
    });

    it("Get Sell Paused", async () => {
      const paused = await shop.getSellPaused();

      expect(paused).to.equal(false);
    });

    it("Get Sell Paused", async () => {
      const paused = await shop.getSellPaused();

      expect(paused).to.equal(false);
    });

    it("Buy Key : Success : E Rank : Amount 1 : PriceMode.USD", async () => {
      keyRank = RankType.E;
      amount = 1;

      price = BigNumber.from(usdPrices[keyRank]).mul(amount);
      totalUSDPrice = price;

      const usdcMintTx = await testUSDC
        .connect(hunter1)
        .mint(hunter1.address, price);
      await usdcMintTx.wait();

      const usdcApproveTx = await testUSDC
        .connect(hunter1)
        .approve(shop.address, price);
      await usdcApproveTx.wait();

      const buyKeyTx = await shop
        .connect(hunter1)
        .buyKey(hunter1.address, keyRank, amount);

      const timestamp = await getBlockTimestamp(buyKeyTx.blockNumber);

      KeySoldEvent = {
        buyer: hunter1.address,
        to: hunter1.address,
        keyRank,
        amount,
        price,
        timestamp,
      };

      await expect(buyKeyTx)
        .to.emit(shop, "KeySold")
        .withArgs(
          KeySoldEvent.buyer,
          KeySoldEvent.to,
          KeySoldEvent.keyRank,
          KeySoldEvent.amount,
          KeySoldEvent.price,
          KeySoldEvent.timestamp
        );

      balances[keyRank] += amount;
      const balance = await gateKey.balanceOf(hunter1.address, keyRank);
      expect(balance).to.equal(balances[keyRank]);

      const usdcBalance = await testUSDC.balanceOf(hunter1.address);
      expect(usdcBalance).to.equal(0);
    });

    it("Buy Key : Success : B Rank : Amount 5 : PriceMode.USD", async () => {
      keyRank = RankType.B;
      amount = 5;

      price = BigNumber.from(usdPrices[keyRank]).mul(amount);
      totalUSDPrice = totalUSDPrice.add(price);

      const usdcMintTx = await testUSDC
        .connect(hunter2)
        .mint(hunter2.address, price);
      await usdcMintTx.wait();

      const usdcApproveTx = await testUSDC
        .connect(hunter2)
        .approve(shop.address, price);
      await usdcApproveTx.wait();

      const buyKeyTx = await shop
        .connect(hunter2)
        .buyKey(hunter1.address, keyRank, amount);

      const timestamp = await getBlockTimestamp(buyKeyTx.blockNumber);

      KeySoldEvent = {
        buyer: hunter2.address,
        to: hunter1.address,
        keyRank,
        amount,
        price,
        timestamp,
      };

      await expect(buyKeyTx)
        .to.emit(shop, "KeySold")
        .withArgs(
          KeySoldEvent.buyer,
          KeySoldEvent.to,
          KeySoldEvent.keyRank,
          KeySoldEvent.amount,
          KeySoldEvent.price,
          KeySoldEvent.timestamp
        );

      balances[keyRank] += amount;
      const balance = await gateKey.balanceOf(hunter1.address, keyRank);
      expect(balance).to.equal(balances[keyRank]);

      const usdcBalance = await testUSDC.balanceOf(hunter1.address);
      expect(usdcBalance).to.equal(0);
    });

    it("Buy Key : Success : E Rank : Amount 1 : PriceMode.MATIC", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.MATIC);
      await setPriceModeTx.wait();

      keyRank = RankType.E;
      amount = 1;

      const latestPrice = await shop.getLatestKeyPrice(keyRank);
      expect(latestPrice.price).to.equal(maticPrices[keyRank]);

      price = latestPrice.price.mul(amount);
      totalMaticPrice = price;

      const buyKeyTx = await shop
        .connect(hunter1)
        .buyKey(hunter1.address, keyRank, amount, {
          value: price,
        });

      const timestamp = await getBlockTimestamp(buyKeyTx.blockNumber);

      KeySoldEvent = {
        buyer: hunter1.address,
        to: hunter1.address,
        keyRank,
        amount,
        price,
        timestamp,
      };

      await expect(buyKeyTx)
        .to.emit(shop, "KeySold")
        .withArgs(
          KeySoldEvent.buyer,
          KeySoldEvent.to,
          KeySoldEvent.keyRank,
          KeySoldEvent.amount,
          KeySoldEvent.price,
          KeySoldEvent.timestamp
        );

      balances[keyRank] += amount;
      const balance = await gateKey.balanceOf(hunter1.address, keyRank);
      expect(balance).to.equal(balances[keyRank]);
    });

    it("Buy Key : Success : B Rank : Amount 5 : PriceMode.MATIC", async () => {
      keyRank = RankType.B;
      amount = 5;

      const latestPrice = await shop.getLatestKeyPrice(keyRank);
      expect(latestPrice.price).to.equal(maticPrices[keyRank]);

      price = latestPrice.price.mul(amount);
      totalMaticPrice = totalMaticPrice.add(price);

      const buyKeyTx = await shop
        .connect(hunter1)
        .buyKey(hunter1.address, keyRank, amount, {
          value: price,
        });

      const timestamp = await getBlockTimestamp(buyKeyTx.blockNumber);

      KeySoldEvent = {
        buyer: hunter1.address,
        to: hunter1.address,
        keyRank: keyRank,
        amount,
        price,
        timestamp,
      };

      await expect(buyKeyTx)
        .to.emit(shop, "KeySold")
        .withArgs(
          KeySoldEvent.buyer,
          KeySoldEvent.to,
          KeySoldEvent.keyRank,
          KeySoldEvent.amount,
          KeySoldEvent.price,
          KeySoldEvent.timestamp
        );

      balances[keyRank] += amount;
      const balance = await gateKey.balanceOf(hunter1.address, keyRank);
      expect(balance).to.equal(balances[keyRank]);
    });

    it("Buy Key : Failed : Invalid Price : PriceMode.USD", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.USD);
      await setPriceModeTx.wait();

      keyRank = RankType.B;
      amount = 5;

      const buyKeyTx = shop
        .connect(hunter1)
        .buyKey(hunter1.address, keyRank, amount, {
          value: 10,
        });

      await expect(buyKeyTx).to.revertedWithCustomError(shop, "InvalidPrice");
    });

    it("Buy Key : Failed : Invalid Price : PriceMode.MATIC", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.MATIC);
      await setPriceModeTx.wait();

      keyRank = RankType.B;
      amount = 5;

      const latestPrice = await shop.getLatestKeyPrice(keyRank);

      price = latestPrice.price.mul(amount + 1);

      const buyKeyTx = shop
        .connect(hunter1)
        .buyKey(hunter1.address, keyRank, amount, {
          value: price,
        });

      await expect(buyKeyTx).to.revertedWithCustomError(shop, "InvalidPrice");
    });

    it("Buy Key : Failed : Sell Paused", async () => {
      const setSellPausedTx = await shop.setSellPaused(true);
      await setSellPausedTx.wait();

      const latestPrice = await shop.getLatestKeyPrice(keyRank);

      price = latestPrice.price.mul(amount);

      const buyKeyTx = shop
        .connect(hunter1)
        .buyKey(hunter1.address, keyRank, amount, {
          value: price,
        });

      await expect(buyKeyTx).to.revertedWithCustomError(shop, "SellPaused");

      const setSellPausedTx2 = await shop.setSellPaused(false);
      await setSellPausedTx2.wait();
    });

    it("Buy Key Batch : Success : PriceMode.USD", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.USD);
      await setPriceModeTx.wait();

      keyRanks = [RankType.E, RankType.D, RankType.C, RankType.B];
      amounts = [1, 1, 2, 2];
      price = BigNumber.from(0);

      for (let i = 0; i < keyRanks.length; i++) {
        const keyPrice = BigNumber.from(usdPrices[keyRanks[i]]).mul(amounts[i]);
        price = price.add(keyPrice);

        balances[keyRanks[i]] += amounts[i];
      }

      const usdcMintTx = await testUSDC
        .connect(hunter2)
        .mint(hunter2.address, price);
      await usdcMintTx.wait();

      const usdcApproveTx = await testUSDC
        .connect(hunter2)
        .approve(shop.address, price);
      await usdcApproveTx.wait();

      totalUSDPrice = totalUSDPrice.add(price);

      const buyKeyBatchTx = await shop
        .connect(hunter2)
        .buyKeyBatch(hunter1.address, keyRanks, amounts);

      const timestamp = await getBlockTimestamp(buyKeyBatchTx.blockNumber);

      KeySoldBatchEvent = {
        buyer: hunter2.address,
        to: hunter1.address,
        keyRanks,
        amounts,
        price,
        timestamp,
      };

      await expect(buyKeyBatchTx)
        .to.emit(shop, "KeySoldBatch")
        .withArgs(
          KeySoldBatchEvent.buyer,
          KeySoldBatchEvent.to,
          KeySoldBatchEvent.keyRanks,
          KeySoldBatchEvent.amounts,
          KeySoldBatchEvent.price,
          KeySoldBatchEvent.timestamp
        );

      for (let i = 0; i < keyRanks.length; i++) {
        const balance = await gateKey.balanceOf(hunter1.address, keyRanks[i]);
        expect(balance).to.equal(balances[keyRanks[i]]);
      }
    });

    it("Buy Key Batch : Success : PriceMode.MATIC", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.MATIC);
      await setPriceModeTx.wait();

      keyRanks = [RankType.E, RankType.D, RankType.C, RankType.B];
      amounts = [1, 1, 2, 2];
      price = BigNumber.from(0);

      for (let i = 0; i < keyRanks.length; i++) {
        const latestPrice = await shop.getLatestKeyPrice(keyRanks[i]);
        expect(latestPrice.price).to.equal(maticPrices[keyRanks[i]]);

        const keyPrice = latestPrice.price.mul(amounts[i]);
        price = price.add(keyPrice);

        balances[keyRanks[i]] += amounts[i];
      }

      totalMaticPrice = totalMaticPrice.add(price);

      const buyKeyBatchTx = await shop
        .connect(hunter2)
        .buyKeyBatch(hunter1.address, keyRanks, amounts, {
          value: price,
        });

      const timestamp = await getBlockTimestamp(buyKeyBatchTx.blockNumber);

      KeySoldBatchEvent = {
        buyer: hunter2.address,
        to: hunter1.address,
        keyRanks,
        amounts,
        price,
        timestamp,
      };

      await expect(buyKeyBatchTx)
        .to.emit(shop, "KeySoldBatch")
        .withArgs(
          KeySoldBatchEvent.buyer,
          KeySoldBatchEvent.to,
          KeySoldBatchEvent.keyRanks,
          KeySoldBatchEvent.amounts,
          KeySoldBatchEvent.price,
          KeySoldBatchEvent.timestamp
        );

      for (let i = 0; i < keyRanks.length; i++) {
        const balance = await gateKey.balanceOf(hunter1.address, keyRanks[i]);
        expect(balance).to.equal(balances[keyRanks[i]]);
      }
    });

    it("Buy Key Batch : Failed : Invalid Price : PriceMode.USD", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.USD);
      await setPriceModeTx.wait();

      keyRanks = [RankType.E, RankType.D, RankType.C, RankType.B];
      amounts = [1, 1, 2, 2];
      price = BigNumber.from(0);

      for (let i = 0; i < keyRanks.length; i++) {
        const keyPrice = BigNumber.from(usdPrices[keyRanks[i]]).mul(amounts[i]);
        price = price.add(keyPrice);
      }

      const buyKeyBatchTx = shop
        .connect(hunter2)
        .buyKeyBatch(hunter1.address, keyRanks, amounts, {
          value: price,
        });

      await expect(buyKeyBatchTx).to.revertedWithCustomError(
        shop,
        "InvalidPrice"
      );
    });

    it("Buy Key Batch : Failed : Insufficient Allowance : PriceMode.USD", async () => {
      keyRanks = [RankType.E, RankType.D, RankType.C, RankType.B];
      amounts = [1, 1, 2, 2];
      price = BigNumber.from(0);

      for (let i = 0; i < keyRanks.length; i++) {
        const keyPrice = BigNumber.from(usdPrices[keyRanks[i]]).mul(amounts[i]);
        price = price.add(keyPrice);
      }

      const buyKeyBatchTx = shop
        .connect(hunter2)
        .buyKeyBatch(hunter1.address, keyRanks, amounts);

      await expect(buyKeyBatchTx).to.revertedWithCustomError(
        shop,
        "InsufficientAllowance"
      );
    });

    it("Buy Key Batch : Failed : ERC20: transfer amount exceeds balance : PriceMode.USD", async () => {
      keyRanks = [RankType.E, RankType.D, RankType.C, RankType.B];
      amounts = [1, 1, 2, 2];
      price = BigNumber.from(0);

      for (let i = 0; i < keyRanks.length; i++) {
        const keyPrice = BigNumber.from(usdPrices[keyRanks[i]]).mul(amounts[i]);
        price = price.add(keyPrice);
      }

      const approveTx = await testUSDC
        .connect(hunter2)
        .approve(shop.address, price);
      await approveTx.wait();

      const buyKeyBatchTx = shop
        .connect(hunter2)
        .buyKeyBatch(hunter1.address, keyRanks, amounts);

      await expect(buyKeyBatchTx).to.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("Buy Key Batch : Failed : Invalid Price : PriceMode.MATIC", async () => {
      const setPriceModeTx = await shop.setPriceMode(PriceMode.MATIC);
      await setPriceModeTx.wait();

      keyRanks = [RankType.E, RankType.D, RankType.C, RankType.B];
      amounts = [1, 1, 2, 2];
      price = BigNumber.from(0);

      for (let i = 0; i < keyRanks.length; i++) {
        const latestPrice = await shop.getLatestKeyPrice(keyRanks[i]);
        expect(latestPrice.price).to.equal(maticPrices[keyRanks[i]]);

        const keyPrice = latestPrice.price.mul(amounts[i]);
        price = price.add(keyPrice);
      }

      const buyKeyBatchTx = shop
        .connect(hunter2)
        .buyKeyBatch(hunter1.address, keyRanks, amounts, {
          value: price.add(100),
        });

      await expect(buyKeyBatchTx).to.revertedWithCustomError(
        shop,
        "InvalidPrice"
      );
    });

    it("Buy Key Batch : Failed : Sell Paused", async () => {
      const setSellPausedTx = await shop.setSellPaused(true);
      await setSellPausedTx.wait();

      const buyKeyBatchTx = shop
        .connect(hunter2)
        .buyKeyBatch(hunter1.address, keyRanks, amounts, {
          value: price,
        });

      await expect(buyKeyBatchTx).to.revertedWithCustomError(
        shop,
        "SellPaused"
      );

      const setSellPausedTx2 = await shop.setSellPaused(false);
      await setSellPausedTx2.wait();
    });

    it("Set Price Mode : Success", async () => {
      const setPriceModeTx = await shop
        .connect(operatorMaster)
        .setPriceMode(PriceMode.USD);

      const timestamp = await getBlockTimestamp(setPriceModeTx.blockNumber);

      SetPriceModeEvent = {
        priceMode: PriceMode.USD,
        timestamp,
      };

      await expect(setPriceModeTx)
        .to.emit(shop, "SetPriceMode")
        .withArgs(SetPriceModeEvent.priceMode, SetPriceModeEvent.timestamp);

      const priceMode = await shop.getPriceMode();
      expect(priceMode).to.equal(PriceMode.USD);
    });

    it("Set Price Mode : Failed : Only Operator", async () => {
      const setPriceModeTx = shop
        .connect(notOperator)
        .setPriceMode(PriceMode.MATIC);

      await expect(setPriceModeTx).to.revertedWithCustomError(
        shop,
        "OnlyOperator"
      );
    });

    it("Set Key Price Per Rank : Success : PriceMode.MATIC", async () => {
      const setKeyPricePerRankTx = await shop
        .connect(operatorMaster)
        .setKeyPricePerRank(PriceMode.MATIC, [1, 1, 1, 1, 1, 1]);

      const timestamp = await getBlockTimestamp(
        setKeyPricePerRankTx.blockNumber
      );

      SetKeyPriceEvent = {
        priceMode: PriceMode.MATIC,
        prices: [1, 1, 1, 1, 1, 1],
        timestamp,
      };

      await expect(setKeyPricePerRankTx)
        .to.emit(shop, "SetKeyPrice")
        .withArgs(
          SetKeyPriceEvent.priceMode,
          SetKeyPriceEvent.prices,
          SetKeyPriceEvent.timestamp
        );

      const prices = await shop.getKeyPricePerRank(PriceMode.MATIC);
      for (let i = 0; i < prices.length; i++) {
        expect(prices[i]).to.equal(1);
      }
    });

    it("Set Key Price Per Rank : Success : PriceMode.USD", async () => {
      const setKeyPricePerRankTx = await shop
        .connect(operatorMaster)
        .setKeyPricePerRank(PriceMode.USD, [1, 1, 1, 1, 1, 1]);

      const timestamp = await getBlockTimestamp(
        setKeyPricePerRankTx.blockNumber
      );

      SetKeyPriceEvent = {
        priceMode: PriceMode.USD,
        prices: [1, 1, 1, 1, 1, 1],
        timestamp,
      };

      await expect(setKeyPricePerRankTx)
        .to.emit(shop, "SetKeyPrice")
        .withArgs(
          SetKeyPriceEvent.priceMode,
          SetKeyPriceEvent.prices,
          SetKeyPriceEvent.timestamp
        );

      const prices = await shop.getKeyPricePerRank(PriceMode.USD);
      for (let i = 0; i < prices.length; i++) {
        expect(prices[i]).to.equal(1);
      }
    });

    it("Set Key Price Per Rank : Failed : Only Operator", async () => {
      const setKeyPricePerRankTx = shop
        .connect(notOperator)
        .setKeyPricePerRank(PriceMode.MATIC, [1, 1, 1, 1, 1, 1]);

      await expect(setKeyPricePerRankTx).revertedWithCustomError(
        shop,
        "OnlyOperator"
      );
    });

    it("Set Sell Paused : Success", async () => {
      const setSellPausedTx = await shop
        .connect(operatorMaster)
        .setSellPaused(true);

      const timestamp = await getBlockTimestamp(setSellPausedTx.blockNumber);

      SetSellPausedEvent = {
        paused: true,
        timestamp,
      };

      await expect(setSellPausedTx)
        .to.emit(shop, "SetSellPaused")
        .withArgs(SetSellPausedEvent.paused, SetSellPausedEvent.timestamp);

      const paused = await shop.getSellPaused();
      expect(paused).to.equal(true);
    });

    it("Set Sell Paused : Failed : Only Operator", async () => {
      const setSellPausedTx = shop.connect(notOperator).setSellPaused(true);

      await expect(setSellPausedTx).revertedWithCustomError(
        shop,
        "OnlyOperator"
      );
    });

    it("Withdraw : Success : PriceMode.MATIC", async () => {
      const beforeBalance = await operatorManager.getBalance();
      const amount = totalMaticPrice.sub(100);

      const withdrawTx = await shop
        .connect(operatorMaster)
        .withdraw(PriceMode.MATIC, operatorManager.address, amount);

      const timestamp = await getBlockTimestamp(withdrawTx.blockNumber);

      WithdrawalEvent = {
        priceMode: PriceMode.MATIC,
        to: operatorManager.address,
        amount,
        timestamp,
      };

      await expect(withdrawTx)
        .to.emit(shop, "Withdrawal")
        .withArgs(
          WithdrawalEvent.priceMode,
          WithdrawalEvent.to,
          WithdrawalEvent.amount,
          WithdrawalEvent.timestamp
        );

      const afterBalance = await operatorManager.getBalance();
      const balance = await shop.getBalance(PriceMode.MATIC);

      expect(afterBalance).to.equal(beforeBalance.add(amount));
      expect(balance).to.equal(100);
    });

    it("Withdraw : Success : PriceMode.USD", async () => {
      const beforeBalance = await testUSDC.balanceOf(operatorManager.address);
      const amount = totalUSDPrice.sub(100);

      const withdrawTx = await shop
        .connect(operatorMaster)
        .withdraw(PriceMode.USD, operatorManager.address, amount);

      const timestamp = await getBlockTimestamp(withdrawTx.blockNumber);

      WithdrawalEvent = {
        priceMode: PriceMode.USD,
        to: operatorManager.address,
        amount,
        timestamp,
      };

      await expect(withdrawTx)
        .to.emit(shop, "Withdrawal")
        .withArgs(
          WithdrawalEvent.priceMode,
          WithdrawalEvent.to,
          WithdrawalEvent.amount,
          WithdrawalEvent.timestamp
        );

      const afterBalance = await testUSDC.balanceOf(operatorManager.address);
      const balance = await shop.getBalance(PriceMode.USD);

      expect(afterBalance).to.equal(beforeBalance.add(amount));
      expect(balance).to.equal(100);
    });

    it("Withdraw : Failed : Only Operator Master", async () => {
      const withdrawTx = shop
        .connect(notOperator)
        .withdraw(PriceMode.MATIC, operatorManager.address, 100);

      await expect(withdrawTx).revertedWithCustomError(
        shop,
        "OnlyOperatorMaster"
      );
    });

    it("Withdraw : Failed : Exceed Balance : PriceMode.MATIC", async () => {
      const withdrawTx = shop
        .connect(operatorMaster)
        .withdraw(PriceMode.MATIC, operatorManager.address, 200);

      await expect(withdrawTx).revertedWithCustomError(shop, "ExceedBalance");
    });

    it("Withdraw : Failed : Exceed Balance : PriceMode.USD", async () => {
      const withdrawTx = shop
        .connect(operatorMaster)
        .withdraw(PriceMode.USD, operatorManager.address, 200);

      await expect(withdrawTx).revertedWithCustomError(shop, "ExceedBalance");
    });

    it("Get Balance", async () => {
      const maticBalance = await shop.getBalance(PriceMode.MATIC);
      const usdBalance = await shop.getBalance(PriceMode.USD);

      expect(maticBalance).to.equal(100);
      expect(usdBalance).to.equal(100);
    });
  });

  /////////////
  // GateKey //
  /////////////

  describe("Mint", async () => {
    it("Mint Key : Success", async () => {
      keyRank = RankType.E;
      amount = 1;

      const mintKeyTx = await gateKey
        .connect(operatorMaster)
        .mintKey(hunter1.address, keyRank, amount);

      const timestamp = await getBlockTimestamp(mintKeyTx.blockNumber);

      KeyMintedEvent = {
        to: hunter1.address,
        keyRank: keyRank,
        amount,
        timestamp,
      };

      await expect(mintKeyTx)
        .to.emit(gateKey, "KeyMinted")
        .withArgs(
          KeyMintedEvent.to,
          KeyMintedEvent.keyRank,
          KeyMintedEvent.amount,
          KeyMintedEvent.timestamp
        );

      balances[keyRank] += amount;
      const balance = await gateKey.balanceOf(hunter1.address, keyRank);
      expect(balance).to.equal(balances[keyRank]);
    });

    it("Mint Key : Failed : Only Operator", async () => {
      const mintKeyTx = gateKey
        .connect(notOperator)
        .mintKey(hunter1.address, keyRank, amount);

      await expect(mintKeyTx).to.revertedWithCustomError(
        gateKey,
        "OnlyOperator"
      );
    });

    it("Mint Key Batch : Success", async () => {
      keyRanks = [RankType.E, RankType.D, RankType.C];
      amounts = [1, 2, 3];

      const mintKeyBatchTx = await gateKey
        .connect(operatorMaster)
        .mintKeyBatch(hunter1.address, keyRanks, amounts);

      const timestamp = await getBlockTimestamp(mintKeyBatchTx.blockNumber);

      KeyMintedBatchEvent = {
        to: hunter1.address,
        keyRanks,
        amounts,
        timestamp,
      };

      await expect(mintKeyBatchTx)
        .to.emit(gateKey, "KeyMintedBatch")
        .withArgs(
          KeyMintedBatchEvent.to,
          KeyMintedBatchEvent.keyRanks,
          KeyMintedBatchEvent.amounts,
          KeyMintedBatchEvent.timestamp
        );

      for (let i = 0; i < keyRanks.length; i++) {
        balances[keyRanks[i]] += amounts[i];
        const balance = await gateKey.balanceOf(hunter1.address, keyRanks[i]);
        expect(balance).to.equal(balances[keyRanks[i]]);
      }
    });

    it("Mint Key Batch : Failed : Only Operator", async () => {
      const mintKeyBatchTx = gateKey
        .connect(notOperator)
        .mintKeyBatch(hunter1.address, keyRanks, amounts);

      await expect(mintKeyBatchTx).to.revertedWithCustomError(
        gateKey,
        "OnlyOperator"
      );
    });

    it("Mint Key By Whitelist : Success", async () => {
      keyRank = RankType.E;
      amount = 1;

      const nonce = Number(await gateKey.getWhitelistNonce(hunter1.address));
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint8", "uint256"],
        [hunter1.address, nonce, keyRank, amount]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const signature = await operatorMaster.signMessage(messageBinary);

      const mintKeyByWhitelistTx = await gateKey
        .connect(hunter1)
        .mintKeyByWhitelist(keyRank, amount, signature);

      const timestamp = await getBlockTimestamp(
        mintKeyByWhitelistTx.blockNumber
      );

      KeyMintedEvent = {
        to: hunter1.address,
        keyRank: keyRank,
        amount,
        timestamp,
      };

      await expect(mintKeyByWhitelistTx)
        .to.emit(gateKey, "KeyMinted")
        .withArgs(
          KeyMintedEvent.to,
          KeyMintedEvent.keyRank,
          KeyMintedEvent.amount,
          KeyMintedEvent.timestamp
        );

      balances[keyRank] += amount;
      const balance = await gateKey.balanceOf(hunter1.address, keyRank);
      expect(balance).to.equal(balances[keyRank]);
    });

    it("Mint Key By Whitelist : Failed : Signature Verify Failed : Invalid Signer", async () => {
      keyRank = RankType.E;
      amount = 1;

      const nonce = Number(await gateKey.getWhitelistNonce(hunter1.address));
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint8", "uint256"],
        [hunter1.address, nonce, keyRank, amount]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const signature = await notOperator.signMessage(messageBinary);

      const mintKeyByWhitelistTx = gateKey
        .connect(hunter1)
        .mintKeyByWhitelist(keyRank, amount, signature);

      await expect(mintKeyByWhitelistTx).to.revertedWithCustomError(
        gateKey,
        "SignatureVerifyFailed"
      );
    });

    it("Mint Key By Whitelist : Failed : Signature Verify Failed : Invalid Nonce", async () => {
      keyRank = RankType.E;
      amount = 1;

      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint8", "uint256"],
        [hunter1.address, 1000, keyRank, amount]
      );
      const messageBinary = ethers.utils.arrayify(messageHash);
      const signature = await operatorMaster.signMessage(messageBinary);

      const mintKeyByWhitelistTx = gateKey
        .connect(hunter1)
        .mintKeyByWhitelist(keyRank, amount, signature);

      await expect(mintKeyByWhitelistTx).to.revertedWithCustomError(
        gateKey,
        "SignatureVerifyFailed"
      );
    });

    it("Mint Key By Whitelist Batch : Success", async () => {
      keyRanks = [RankType.E, RankType.D];
      amounts = [1, 5];
      const signatures = [];

      let nonce = Number(await gateKey.getWhitelistNonce(hunter1.address));
      for (let i = 0; i < keyRanks.length; i++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256", "uint8", "uint256"],
          [hunter1.address, nonce, keyRanks[i], amounts[i]]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const signature = await operatorMaster.signMessage(messageBinary);

        signatures.push(signature);

        nonce += 1;
      }

      const mintKeyByWhitelistBatchTx = await gateKey
        .connect(hunter1)
        .mintKeyByWhitelistBatch(keyRanks, amounts, signatures);

      const timestamp = await getBlockTimestamp(
        mintKeyByWhitelistBatchTx.blockNumber
      );

      KeyMintedBatchEvent = {
        to: hunter1.address,
        keyRanks,
        amounts,
        timestamp,
      };

      await expect(mintKeyByWhitelistBatchTx)
        .to.emit(gateKey, "KeyMintedBatch")
        .withArgs(
          KeyMintedBatchEvent.to,
          KeyMintedBatchEvent.keyRanks,
          KeyMintedBatchEvent.amounts,
          KeyMintedBatchEvent.timestamp
        );

      for (let i = 0; i < keyRanks.length; i++) {
        balances[keyRanks[i]] += amounts[i];
        const balance = await gateKey.balanceOf(hunter1.address, keyRanks[i]);
        expect(balance).to.equal(balances[keyRanks[i]]);
      }
    });

    it("Mint Key By Whitelist Batch : Failed : Signature Verify Failed : Invalid Signer", async () => {
      keyRanks = [RankType.E, RankType.D];
      amounts = [1, 5];
      const signatures = [];

      let nonce = Number(await gateKey.getWhitelistNonce(hunter1.address));
      for (let i = 0; i < keyRanks.length; i++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256", "uint8", "uint256"],
          [hunter1.address, nonce, keyRanks[i], amounts[i]]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const signature = await notOperator.signMessage(messageBinary);

        signatures.push(signature);
        nonce += 1;
      }

      const mintKeyByWhitelistBatchTx = gateKey
        .connect(hunter1)
        .mintKeyByWhitelistBatch(keyRanks, amounts, signatures);

      await expect(mintKeyByWhitelistBatchTx).to.revertedWithCustomError(
        gateKey,
        "SignatureVerifyFailed"
      );
    });

    it("Mint Key By Whitelist Batch : Failed : Signature Verify Failed : Invalid Nonce", async () => {
      keyRanks = [RankType.E, RankType.D];
      amounts = [1, 5];
      const signatures = [];

      for (let i = 0; i < keyRanks.length; i++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256", "uint8", "uint256"],
          [hunter1.address, 100, keyRanks[i], amounts[i]]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const signature = await notOperator.signMessage(messageBinary);

        signatures.push(signature);
      }

      const mintKeyByWhitelistBatchTx = gateKey
        .connect(hunter1)
        .mintKeyByWhitelistBatch(keyRanks, amounts, signatures);

      await expect(mintKeyByWhitelistBatchTx).to.revertedWithCustomError(
        gateKey,
        "SignatureVerifyFailed"
      );
    });

    it("Get Minted Supply", async () => {
      for (let i = 0; i < 6; i++) {
        const mintedSupply = await gateKey.getMintedSupply(i);
        expect(mintedSupply).to.equal(balances[i]);
      }
    });

    it("Get Burned Supply", async () => {
      const burnTx = await gateKey.connect(hunter1).burn(hunter1.address, 0, 3);
      await burnTx.wait();

      const burnedSupply = await gateKey.getBurnedSupply(0);
      expect(burnedSupply).to.equal(3);

      balances[0] -= 3;
    });
  });
});
