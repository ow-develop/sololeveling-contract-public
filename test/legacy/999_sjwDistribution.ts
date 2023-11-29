// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { BigNumber, Contract } from "ethers";
// import { ethers, expect, upgrades } from "hardhat";
//
// import {
//   getBlockTimestamp,
//   getCurrentBlockTimestamp,
//   setNextBlockTimestamp,
// } from "./../../helpers/block-timestamp";
// import { OfferingDistributed } from "../../helpers/type/event";
// import { OfferingType } from "../../helpers/constant/contract";
// import { ZERO_ADDRESS } from "../../helpers/constant/common";
//
// describe("SJWDistribution", () => {
//   let operatorMaster: SignerWithAddress,
//     operatorManager: SignerWithAddress,
//     notOperator: SignerWithAddress,
//     creator: SignerWithAddress,
//     distributedAccount1: SignerWithAddress,
//     distributedAccount2: SignerWithAddress,
//     distributedAccount3: SignerWithAddress,
//     distributedAccount4: SignerWithAddress,
//     distributedAccount5: SignerWithAddress,
//     newDistributedAccount: SignerWithAddress,
//     publicAccount: SignerWithAddress,
//     whitelistAccount: SignerWithAddress;
//
//   let project: Contract,
//     operator: Contract,
//     sjwOffering: Contract,
//     sjwDistribution: Contract,
//     shadowMonarch: Contract;
//
//   let SetDistributedAccountsEvent,
//     OfferingDistributedEvent: OfferingDistributed;
//
//   let distributedAccounts: SignerWithAddress[],
//     distributedRates: number[],
//     offeringType: OfferingType,
//     offeringId: number,
//     whitelistSignature: string,
//     amount: BigNumber,
//     distributedAmounts: BigNumber[],
//     accountBalances: BigNumber[];
//
//   before(async () => {
//     [
//       operatorMaster,
//       operatorManager,
//       notOperator,
//       creator,
//       distributedAccount1,
//       distributedAccount2,
//       distributedAccount3,
//       distributedAccount4,
//       distributedAccount5,
//       newDistributedAccount,
//       publicAccount,
//       whitelistAccount,
//     ] = await ethers.getSigners();
//     console.log(
//       "Deploying contracts with the account: " + operatorMaster.address
//     );
//
//     distributedAccounts = [
//       distributedAccount1,
//       distributedAccount2,
//       distributedAccount3,
//       distributedAccount4,
//       distributedAccount5,
//     ];
//
//     distributedRates = [20_00000, 30_00000, 10_00000, 20_00000, 20_00000];
//
//     // deploy operator wallet
//     const RoleWallet = await ethers.getContractFactory("SLRoleWallet");
//     operator = await RoleWallet.deploy(
//       [operatorMaster.address],
//       [operatorManager.address]
//     );
//     await operator.deployed();
//     console.log(`Operator deployed to: ${operator.address}`);
//
//     // deploy project
//     const Project = await ethers.getContractFactory("SLProject");
//     project = await upgrades.deployProxy(Project, [operator.address], {
//       kind: "uups",
//     });
//     await project.deployed();
//     console.log(`Project deployed to: ${project.address}`);
//
//     // deploy sjwOffering
//     const SJWOffering = await ethers.getContractFactory("SLSJWOffering");
//     sjwOffering = await upgrades.deployProxy(
//       SJWOffering,
//       [
//         project.address,
//         project.address,
//         1,
//         [
//           distributedAccount1.address,
//           distributedAccount2.address,
//           distributedAccount3.address,
//           distributedAccount4.address,
//           distributedAccount5.address,
//         ],
//         [400, 400, 400, 400, 400],
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await sjwOffering.deployed();
//     console.log(`SJWOffering deployed to: ${sjwOffering.address}`);
//
//     const SJWDistribution = await ethers.getContractFactory(
//       "SLSJWDistribution"
//     );
//     sjwDistribution = await upgrades.deployProxy(
//       SJWDistribution,
//       [
//         project.address,
//         sjwOffering.address,
//         [
//           distributedAccount1.address,
//           distributedAccount2.address,
//           distributedAccount3.address,
//           distributedAccount4.address,
//           distributedAccount5.address,
//         ],
//         distributedRates,
//       ],
//       {
//         kind: "uups",
//       }
//     );
//     await sjwDistribution.deployed();
//     console.log(`SJWDistribution deployed to: ${sjwDistribution.address}`);
//
//     const setDistributionContractTx = await sjwOffering.setDistributionContract(
//       sjwDistribution.address
//     );
//     await setDistributionContractTx.wait();
//
//     // deploy shadow monarch - collectionId 1
//     const ShadowMonarch = await ethers.getContractFactory("SLShadowMonarch");
//     shadowMonarch = await upgrades.deployProxy(
//       ShadowMonarch,
//       [project.address, ZERO_ADDRESS, [sjwOffering.address], "baseTokenURI"],
//       {
//         kind: "uups",
//       }
//     );
//     await shadowMonarch.deployed();
//     console.log(`ShadowMonarch deployed to: ${shadowMonarch.address}`);
//
//     const addCollectionTx1 = await project.addCollection(
//       shadowMonarch.address,
//       creator.address
//     );
//     await addCollectionTx1.wait();
//   });
//
//   //////////////////
//   // Distribution //
//   //////////////////
//
//   describe("Distribution", async () => {
//     it("Get Offering Distributed Accounts", async () => {
//       const distributed =
//         await sjwDistribution.getOfferingDistributedAccounts();
//
//       for (let i = 0; i < distributed.accounts.length; i++) {
//         expect(distributed.accounts[i]).to.equal(
//           distributedAccounts[i].address
//         );
//         expect(distributed.rates[i]).to.equal(distributedRates[i]);
//       }
//     });
//
//     it("Distribute Offering : Success : Public Offering", async () => {
//       const currentBlockTimestamp = await getCurrentBlockTimestamp();
//
//       const addPublicOfferingTx = await sjwOffering.addPublicOffering(
//         1, // whitelist
//         1, // public
//         1,
//         currentBlockTimestamp + 100,
//         currentBlockTimestamp + 300,
//         currentBlockTimestamp + 300,
//         ethers.utils.parseEther("10")
//       ); // public offeringId 1
//       await addPublicOfferingTx.wait();
//
//       offeringType = OfferingType.Public;
//       offeringId = 1;
//
//       await setNextBlockTimestamp(100);
//
//       const mintOfOfferingTx = await sjwOffering
//         .connect(publicAccount)
//         .mintOfOffering(offeringType, offeringId, "0x", {
//           value: ethers.utils.parseEther("10"),
//         });
//       await mintOfOfferingTx.wait();
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["string", "uint256", "address"],
//         ["Public", offeringId, whitelistAccount.address]
//       ); // offeringType, offeringId, buyer
//       const messageBinary = ethers.utils.arrayify(messageHash);
//
//       whitelistSignature = await operatorManager.signMessage(messageBinary);
//
//       const mintOfOfferingTx2 = await sjwOffering
//         .connect(whitelistAccount)
//         .mintOfOffering(offeringType, offeringId, whitelistSignature, {
//           value: ethers.utils.parseEther("10"),
//         });
//       await mintOfOfferingTx2.wait();
//
//       amount = ethers.utils.parseEther("20");
//
//       const distributableBalance =
//         await sjwOffering.getOfferingDistributableBalance(
//           offeringType,
//           offeringId
//         );
//       expect(distributableBalance).to.equal(amount);
//
//       distributedAmounts = [];
//       accountBalances = [];
//
//       for (let i = 0; i < distributedRates.length; i++) {
//         const distributedAmount = amount
//           .mul(distributedRates[i])
//           .div(100_00000);
//         distributedAmounts.push(distributedAmount);
//
//         accountBalances.push(
//           (await distributedAccounts[i].getBalance()).add(distributedAmount)
//         );
//       }
//
//       const distributeOfferingTx = await sjwOffering.distributeOffering(
//         offeringType,
//         offeringId
//       );
//
//       const timestamp = await getBlockTimestamp(
//         distributeOfferingTx.blockNumber
//       );
//
//       OfferingDistributedEvent = {
//         offeringType,
//         offeringId,
//         amount,
//         distributedAccounts: [
//           distributedAccount1.address,
//           distributedAccount2.address,
//           distributedAccount3.address,
//           distributedAccount4.address,
//           distributedAccount5.address,
//         ],
//         distributedAmounts,
//         timestamp,
//       };
//
//       await expect(distributeOfferingTx)
//         .to.emit(sjwDistribution, "OfferingDistributed")
//         .withArgs(
//           OfferingDistributedEvent.offeringType,
//           OfferingDistributedEvent.offeringId,
//           OfferingDistributedEvent.amount,
//           OfferingDistributedEvent.distributedAccounts,
//           OfferingDistributedEvent.distributedAmounts,
//           OfferingDistributedEvent.timestamp
//         );
//
//       const distributableBalanceAfter =
//         await sjwOffering.getOfferingDistributableBalance(
//           offeringType,
//           offeringId
//         );
//       expect(distributableBalanceAfter).to.equal(0);
//
//       for (let i = 0; i < distributedAccounts.length; i++) {
//         expect(await distributedAccounts[i].getBalance()).to.equal(
//           accountBalances[i]
//         );
//       }
//
//       const distributedAmount =
//         await sjwDistribution.getOfferingDistributedAmount(
//           offeringType,
//           offeringId
//         );
//       expect(distributedAmount).to.equal(amount);
//     });
//
//     it("Distribute Offering : Success : Private Offering", async () => {
//       const currentBlockTimestamp = await getCurrentBlockTimestamp();
//
//       const addPrivateOfferingTx = await sjwOffering.addPrivateOffering(
//         10, // supply
//         10, // accountMaxSupply
//         currentBlockTimestamp + 100, // startTimestamp
//         currentBlockTimestamp + 500, // endTimestamp
//         ethers.utils.parseEther("5") // price
//       ); // private offeringId 1
//       await addPrivateOfferingTx.wait();
//
//       offeringType = OfferingType.Private;
//       offeringId = 1;
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["string", "uint256", "address"],
//         ["Private", offeringId, whitelistAccount.address]
//       ); // offeringType, offeringId, buyer
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       whitelistSignature = await operatorManager.signMessage(messageBinary);
//
//       await setNextBlockTimestamp(100);
//
//       const mintOfOfferingTx = await sjwOffering
//         .connect(whitelistAccount)
//         .mintOfOffering(offeringType, offeringId, whitelistSignature, {
//           value: ethers.utils.parseEther("50"),
//         });
//       await mintOfOfferingTx.wait();
//
//       amount = ethers.utils.parseEther("50");
//
//       const distributableBalance =
//         await sjwOffering.getOfferingDistributableBalance(
//           offeringType,
//           offeringId
//         );
//       expect(distributableBalance).to.equal(amount);
//
//       distributedAmounts = [];
//       accountBalances = [];
//
//       for (let i = 0; i < distributedRates.length; i++) {
//         const distributedAmount = amount
//           .mul(distributedRates[i])
//           .div(100_00000);
//         distributedAmounts.push(distributedAmount);
//
//         accountBalances.push(
//           (await distributedAccounts[i].getBalance()).add(distributedAmount)
//         );
//       }
//
//       const distributeOfferingTx = await sjwOffering.distributeOffering(
//         offeringType,
//         offeringId
//       );
//
//       const timestamp = await getBlockTimestamp(
//         distributeOfferingTx.blockNumber
//       );
//
//       OfferingDistributedEvent = {
//         offeringType,
//         offeringId,
//         amount,
//         distributedAccounts: [
//           distributedAccount1.address,
//           distributedAccount2.address,
//           distributedAccount3.address,
//           distributedAccount4.address,
//           distributedAccount5.address,
//         ],
//         distributedAmounts,
//         timestamp,
//       };
//
//       await expect(distributeOfferingTx)
//         .to.emit(sjwDistribution, "OfferingDistributed")
//         .withArgs(
//           OfferingDistributedEvent.offeringType,
//           OfferingDistributedEvent.offeringId,
//           OfferingDistributedEvent.amount,
//           OfferingDistributedEvent.distributedAccounts,
//           OfferingDistributedEvent.distributedAmounts,
//           OfferingDistributedEvent.timestamp
//         );
//
//       const distributableBalanceAfter =
//         await sjwOffering.getOfferingDistributableBalance(
//           offeringType,
//           offeringId
//         );
//       expect(distributableBalanceAfter).to.equal(0);
//
//       for (let i = 0; i < distributedAccounts.length; i++) {
//         expect(await distributedAccounts[i].getBalance()).to.equal(
//           accountBalances[i]
//         );
//       }
//
//       const distributedAmount =
//         await sjwDistribution.getOfferingDistributedAmount(
//           offeringType,
//           offeringId
//         );
//       expect(distributedAmount).to.equal(amount);
//     });
//
//     it("Distribute Offering : Failed : Only Operator", async () => {
//       const distributeOfferingTx = sjwOffering
//         .connect(notOperator)
//         .distributeOffering(offeringType, offeringId);
//
//       await expect(distributeOfferingTx).to.revertedWithCustomError(
//         sjwOffering,
//         "OnlyOperator"
//       );
//     });
//
//     it("Distribute Offering In Distribution Contract : Failed : Only Offering Contract", async () => {
//       const distributeOfferingTx = sjwDistribution.distributeOffering(
//         offeringType,
//         offeringId
//       );
//
//       await expect(distributeOfferingTx).to.revertedWithCustomError(
//         sjwDistribution,
//         "OnlyOfferingContract"
//       );
//     });
//
//     it("Distribute Offering : Failed : Invalid Offering Id", async () => {
//       const distributeOfferingTx = sjwOffering.distributeOffering(
//         offeringType,
//         100
//       );
//
//       await expect(distributeOfferingTx).to.revertedWithCustomError(
//         sjwOffering,
//         "InvalidOfferingId"
//       );
//     });
//
//     it("Distribute Offering : Failed : Not Exist Distributable Balance", async () => {
//       const distributeOfferingTx = sjwOffering.distributeOffering(
//         offeringType,
//         offeringId
//       );
//
//       await expect(distributeOfferingTx).to.revertedWithCustomError(
//         sjwOffering,
//         "NotExistDistributableBalance"
//       );
//     });
//
//     it("Set Offering Distributed Accounts : Success", async () => {
//       distributedAccounts = [
//         distributedAccount1,
//         distributedAccount2,
//         distributedAccount3,
//         distributedAccount4,
//         newDistributedAccount,
//       ];
//
//       distributedRates = [20_00000, 15_00000, 10_00000, 35_00000, 20_00000];
//
//       const setOfferingDistributedAccountsTx =
//         await sjwDistribution.setOfferingDistributedAccounts(
//           [
//             distributedAccount1.address,
//             distributedAccount2.address,
//             distributedAccount3.address,
//             distributedAccount4.address,
//             newDistributedAccount.address,
//           ],
//           distributedRates
//         );
//
//       const timestamp = await getBlockTimestamp(
//         setOfferingDistributedAccountsTx.blockNumber
//       );
//
//       SetDistributedAccountsEvent = {
//         distributedAccounts: [
//           distributedAccount1.address,
//           distributedAccount2.address,
//           distributedAccount3.address,
//           distributedAccount4.address,
//           newDistributedAccount.address,
//         ],
//         distributedRates,
//         timestamp,
//       };
//
//       await expect(setOfferingDistributedAccountsTx)
//         .to.emit(sjwDistribution, "SetDistributedAccounts")
//         .withArgs(
//           SetDistributedAccountsEvent.distributedAccounts,
//           SetDistributedAccountsEvent.distributedRates,
//           SetDistributedAccountsEvent.timestamp
//         );
//
//       const distributed =
//         await sjwDistribution.getOfferingDistributedAccounts();
//
//       for (let i = 0; i < distributed.accounts.length; i++) {
//         expect(distributed.accounts[i]).to.equal(
//           distributedAccounts[i].address
//         );
//         expect(distributed.rates[i]).to.equal(distributedRates[i]);
//       }
//     });
//
//     it("Distribute Offering : Failed : Only Operator Master", async () => {
//       const setOfferingDistributedAccountsTx = sjwDistribution
//         .connect(operatorManager)
//         .setOfferingDistributedAccounts(
//           [
//             distributedAccount1.address,
//             distributedAccount2.address,
//             distributedAccount3.address,
//             distributedAccount4.address,
//             newDistributedAccount.address,
//           ],
//           distributedRates
//         );
//
//       await expect(setOfferingDistributedAccountsTx).to.revertedWithCustomError(
//         sjwDistribution,
//         "OnlyOperatorMaster"
//       );
//     });
//
//     it("Distribute Offering : Failed : Invalid Argument", async () => {
//       const setOfferingDistributedAccountsTx =
//         sjwDistribution.setOfferingDistributedAccounts(
//           [
//             distributedAccount1.address,
//             distributedAccount2.address,
//             distributedAccount3.address,
//             distributedAccount4.address,
//           ],
//           distributedRates
//         );
//
//       await expect(setOfferingDistributedAccountsTx).to.revertedWithCustomError(
//         sjwDistribution,
//         "InvalidArgument"
//       );
//     });
//
//     it("Distribute Offering : Failed : Invalid Account", async () => {
//       const setOfferingDistributedAccountsTx =
//         sjwDistribution.setOfferingDistributedAccounts(
//           [
//             distributedAccount1.address,
//             distributedAccount2.address,
//             distributedAccount3.address,
//             distributedAccount4.address,
//             ZERO_ADDRESS,
//           ],
//           distributedRates
//         );
//
//       await expect(setOfferingDistributedAccountsTx).to.revertedWithCustomError(
//         sjwDistribution,
//         "InvalidAccount"
//       );
//     });
//
//     it("Distribute Offering : Failed : Invalid Rate", async () => {
//       const setOfferingDistributedAccountsTx =
//         sjwDistribution.setOfferingDistributedAccounts(
//           [
//             distributedAccount1.address,
//             distributedAccount2.address,
//             distributedAccount3.address,
//             distributedAccount4.address,
//             newDistributedAccount.address,
//           ],
//           [10_00000, 30_00000, 20_00000, 20_00000, 30_00000]
//         );
//
//       await expect(setOfferingDistributedAccountsTx).to.revertedWithCustomError(
//         sjwDistribution,
//         "InvalidRate"
//       );
//     });
//
//     it("Distribute Offering : Success : Private Offering", async () => {
//       const currentBlockTimestamp = await getCurrentBlockTimestamp();
//
//       const addPrivateOfferingTx = await sjwOffering.addPrivateOffering(
//         10, // supply
//         10, // accountMaxSupply
//         currentBlockTimestamp + 100, // startTimestamp
//         currentBlockTimestamp + 500, // endTimestamp
//         ethers.utils.parseEther("3") // price
//       ); // private offeringId 2
//       await addPrivateOfferingTx.wait();
//
//       offeringType = OfferingType.Private;
//       offeringId = 2;
//
//       const messageHash = ethers.utils.solidityKeccak256(
//         ["string", "uint256", "address"],
//         ["Private", offeringId, whitelistAccount.address]
//       ); // offeringType, offeringId, buyer
//       const messageBinary = ethers.utils.arrayify(messageHash);
//       whitelistSignature = await operatorManager.signMessage(messageBinary);
//
//       await setNextBlockTimestamp(100);
//
//       const mintOfOfferingTx = await sjwOffering
//         .connect(whitelistAccount)
//         .mintOfOffering(offeringType, offeringId, whitelistSignature, {
//           value: ethers.utils.parseEther("30"),
//         });
//       await mintOfOfferingTx.wait();
//
//       amount = ethers.utils.parseEther("30");
//
//       const distributableBalance =
//         await sjwOffering.getOfferingDistributableBalance(
//           offeringType,
//           offeringId
//         );
//       expect(distributableBalance).to.equal(amount);
//
//       distributedAmounts = [];
//       accountBalances = [];
//
//       for (let i = 0; i < distributedRates.length; i++) {
//         const distributedAmount = amount
//           .mul(distributedRates[i])
//           .div(100_00000);
//         distributedAmounts.push(distributedAmount);
//
//         accountBalances.push(
//           (await distributedAccounts[i].getBalance()).add(distributedAmount)
//         );
//       }
//
//       const distributeOfferingTx = await sjwOffering.distributeOffering(
//         offeringType,
//         offeringId
//       );
//
//       const timestamp = await getBlockTimestamp(
//         distributeOfferingTx.blockNumber
//       );
//
//       OfferingDistributedEvent = {
//         offeringType,
//         offeringId,
//         amount,
//         distributedAccounts: [
//           distributedAccount1.address,
//           distributedAccount2.address,
//           distributedAccount3.address,
//           distributedAccount4.address,
//           newDistributedAccount.address,
//         ],
//         distributedAmounts,
//         timestamp,
//       };
//
//       await expect(distributeOfferingTx)
//         .to.emit(sjwDistribution, "OfferingDistributed")
//         .withArgs(
//           OfferingDistributedEvent.offeringType,
//           OfferingDistributedEvent.offeringId,
//           OfferingDistributedEvent.amount,
//           OfferingDistributedEvent.distributedAccounts,
//           OfferingDistributedEvent.distributedAmounts,
//           OfferingDistributedEvent.timestamp
//         );
//
//       const distributableBalanceAfter =
//         await sjwOffering.getOfferingDistributableBalance(
//           offeringType,
//           offeringId
//         );
//       expect(distributableBalanceAfter).to.equal(0);
//
//       for (let i = 0; i < distributedAccounts.length; i++) {
//         expect(await distributedAccounts[i].getBalance()).to.equal(
//           accountBalances[i]
//         );
//       }
//
//       const distributedAmount =
//         await sjwDistribution.getOfferingDistributedAmount(
//           offeringType,
//           offeringId
//         );
//       expect(distributedAmount).to.equal(amount);
//     });
//   });
//
//   //////////
//   // Base //
//   //////////
//
//   describe("Base", async () => {
//     it("Set Offering Contract : Success", async () => {
//       const setOfferingContractTx = await sjwDistribution.setOfferingContract(
//         project.address
//       );
//       await setOfferingContractTx.wait();
//
//       const offeringContract = await sjwDistribution.getOfferingContract();
//       expect(offeringContract).to.equal(project.address);
//     });
//
//     it("Set Offering Contract : Failed : Only Operator", async () => {
//       const setOfferingContractTx = sjwDistribution
//         .connect(notOperator)
//         .setOfferingContract(project.address);
//
//       await expect(setOfferingContractTx).to.revertedWithCustomError(
//         sjwDistribution,
//         "OnlyOperator"
//       );
//     });
//   });
// });
