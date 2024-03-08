import { ethers, upgrades } from "hardhat";
import { CollectionId } from "../helpers/constant/common";

const hre = require("hardhat");

async function main() {
  const [admin] = await ethers.getSigners();

  const DungeonGate = await ethers.getContractFactory("SLDungeonGate");
  const dungeunGate = await upgrades.deployProxy(
    DungeonGate,
    [
      "0xe9E4FeD6A1986aA5Fc051dECf86a85cd43586Dc8", // project
      "0x2D249834e1d53bb9a02d4d4121Dff4dD838ceB4d", // season
      "0x39cC739372fB6c6b7CA33A55926523CadA6d9fF4", // random
      "0x9F50d2c6712f1171C211c2896CAA987Ce560d2C5", // shop
      "0x3298456e8E87C8f37BFA5FF9D9e2d098725eBe79", // monster factory
      CollectionId.EssenceStone,
      CollectionId.GateKey,
      CollectionId.Monster,
    ],
    { kind: "uups" }
  );
  await dungeunGate.deployed();
  console.log("DungeonGate : ", dungeunGate.address);

  const SeasonSettlement = await ethers.getContractFactory(
    "SLSeasonSettlement"
  );
  const seasonSettlement = new ethers.Contract(
    "0xD4525f0d60BD860d2E5018DC17e3C28Cef20Ad0f",
    SeasonSettlement.interface,
    admin
  );
  const setDungeonGateContractTx =
    await seasonSettlement.setDungeonGateContract(dungeunGate.address);
  await setDungeonGateContractTx.wait();
  console.log("Success. Season Settlement");

  const ApprovalController = await ethers.getContractFactory(
    "SLApprovalController"
  );
  const approvalController = new ethers.Contract(
    "0x07290589df842E3f8F0B2Cb0523b1977F3F519C9",
    ApprovalController.interface,
    admin
  );
  const addApprovedContractTx = await approvalController.addApprovedContract(
    dungeunGate.address
  );
  await addApprovedContractTx.wait();
  console.log("Success. Approval Controller");

  const EssenceStone = await ethers.getContractFactory("SLEssenceStone");
  const essenceStone = new ethers.Contract(
    "0xcf66B2d16Edd6C6A1C2007648C4AE6A2ec35De27",
    EssenceStone.interface,
    admin
  );
  const addControllerTx1 = await essenceStone.addController(
    dungeunGate.address
  );
  await addControllerTx1.wait();
  console.log("Success. Essence Stone");

  const Monster = await ethers.getContractFactory("SLMonster");
  const monster = new ethers.Contract(
    "0x862c2FCbBB8c9226A0cb4673dEDAcA330270bB39",
    Monster.interface,
    admin
  );
  const addControllerTx2 = await monster.addController(dungeunGate.address);
  await addControllerTx2.wait();
  console.log("Success. Monster");

  const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
  const seasonPack = new ethers.Contract(
    "0xfF8c9c93a7718B0B8E4Eb5F3DED990aA39e53EFb",
    SeasonPack.interface,
    admin
  );
  const addControllerTx3 = await seasonPack.addController(dungeunGate.address);
  await addControllerTx3.wait();
  console.log("Success. Season Pack");

  const setApproveUSDTx = await dungeunGate.setApproveUSDTokenContract();
  await setApproveUSDTx.wait();

  // const V1 = await ethers.getContractFactory("SLEssenceStone");
  // const V2 = await ethers.getContractFactory("SLTestEssenceStone");
  //
  // await upgrades.forceImport("0xcf66B2d16Edd6C6A1C2007648C4AE6A2ec35De27", V1, {
  //   kind: "uups",
  // });
  //
  // const v2 = await upgrades.upgradeProxy(
  //   "0xcf66B2d16Edd6C6A1C2007648C4AE6A2ec35De27",
  //   V2,
  //   {
  //     kind: "uups",
  //   }
  // );
  // await v2.deployed();
  //
  // console.log("Upgrade");
  //
  // const mintTx = await v2.mintOfAirdrop(
  //   ["0xA552b00A6f79e7e40eFf56DC6B8C79bE1a333E60"],
  //   [1],
  //   [10]
  // );
  // await mintTx.wait();

  console.log("Success");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
