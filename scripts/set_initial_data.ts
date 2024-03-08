import { ethers, upgrades } from "hardhat";
import { RankType } from "../helpers/constant/contract";

const hre = require("hardhat");

async function main() {
  const [admin] = await ethers.getSigners();

  const projectAddress = "0x05D5ADAAA9229bfaDD2861EaA494a10452337eD2";
  const Project = await ethers.getContractFactory("SLProject");
  const project = new ethers.Contract(projectAddress, Project.interface, admin);

  // /* Faucet Setting */
  const Faucet = await ethers.getContractFactory("MaticFaucetV2");
  const faucet = await Faucet.deploy();
  await faucet.deployed();
  console.log("Faucet Address : ", faucet.address);
  const depositTx = await faucet.deposit({
    value: ethers.utils.parseEther("1"),
  });
  await depositTx.wait();
  console.log("Faucet Deposit Success");

  /* Season Setting */
  const seasonAddress = "0x7f3b5867d0985BD62ED5a96163802fcdd6eDF350";
  const approvalControllerAddress =
    "0x45a3484ea3DA494Ff7B7f5c0E3473500f47f8276";
  const dungeonGateAddress = "0x2C55347465D00912c16F1E3D6a83Be96381963c3";
  const startBlock = "5284050";
  const endBlock = "5290000";

  const HunterRank = await ethers.getContractFactory("SLTestHunterRank");
  const hunterRank = await HunterRank.deploy(
    projectAddress,
    [dungeonGateAddress],
    "baseTokenURI"
  );
  await hunterRank.deployed();
  console.log("hunterRank Address : ", hunterRank.address);
  // collectionId 8
  const addCollection = await project.addCollection(
    hunterRank.address,
    admin.address
  );
  await addCollection.wait();

  const SeasonPack = await ethers.getContractFactory("SLSeasonPack");
  const seasonPack = await SeasonPack.deploy(
    projectAddress,
    approvalControllerAddress,
    [dungeonGateAddress],
    "baseTokenURI"
  );
  await seasonPack.deployed();
  console.log("SeasonPack Address : ", seasonPack.address);
  // collectionId 9
  const addCollection2 = await project.addCollection(
    seasonPack.address,
    admin.address
  );
  await addCollection2.wait();

  for (let i = 1; i <= 50; i++) {
    const openTokenTx = await seasonPack.openToken(i);
    await openTokenTx.wait();

    console.log(`Season Pack Open Token ${i}`);
  }

  const Season = await ethers.getContractFactory("SLSeason");
  const season = new ethers.Contract(seasonAddress, Season.interface, admin);
  const addSeason = await season.addSeason(8, 9, startBlock, endBlock, [3, 4]);
  await addSeason.wait();
  console.log('Success. Add Season');

  /* Invite SBT Setting */
  const InviteSBT = await ethers.getContractFactory("SLInviteSBT");
  const inviteSBT = await upgrades.deployProxy(
    InviteSBT,
    [project.address, [admin.address], "metadataUrl"],
    { kind: "uups" }
  );
  await inviteSBT.deployed();
  console.log("Invite SBT Address : ", inviteSBT.address);
  // collectionId 10
  const addCollection3 = await project.addCollection(
    inviteSBT.address,
    admin.address
  );
  await addCollection3.wait();

  /* Monster Setting */
  const monsterFactoryAddress = "0x85513bf140baA793C7Fc0Fc137FeA4291785b285";
  const MonsterFactory = await ethers.getContractFactory("SLMonsterFactory");
  const monsterFactory = new ethers.Contract(
    monsterFactoryAddress,
    MonsterFactory.interface,
    admin
  );

  // 컨트랙트 상에 몬스터는 추가되는 순서대로 id가 매겨짐
  const monsterIdToRanks = [
    RankType.E,
    RankType.E,
    RankType.E,
    RankType.D,
    RankType.D,
    RankType.D,
    RankType.C,
    RankType.C,
    RankType.C,
    RankType.C,
    RankType.C,
    RankType.C,
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.A,
    RankType.A,
    RankType.A,
    RankType.A,
    RankType.A,
    RankType.A,
    RankType.S,
    RankType.S,
    RankType.S,
    RankType.S,
    RankType.S,
    RankType.E,
    RankType.E,
    RankType.D,
    RankType.D,
    RankType.D,
  ];

  const shadowIdToRanks = [
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.B,
    RankType.A,
    RankType.A,
    RankType.A,
    RankType.A,
    RankType.A,
    RankType.S,
    RankType.S,
    RankType.S,
    RankType.S,
    RankType.S,
  ];

  for (let i = 0; i < monsterIdToRanks.length; i++) {
    const addMonsterTx = await monsterFactory.addMonster(
      monsterIdToRanks[i],
      false
    );
    await addMonsterTx.wait();

    console.log("Success. Add Monster : ", i + 1);
  }

  for (let i = 0; i < shadowIdToRanks.length; i++) {
    const addMonsterTx = await monsterFactory.addMonster(
      shadowIdToRanks[i],
      true
    );
    await addMonsterTx.wait();

    console.log("Success. Add Monster : ", i + 1);
  }

  /* Arise Monster Setting */
  const setBRankAriseMonsterTx = await monsterFactory.setAriseMonsterBatch(
    RankType.B,
    [26, 27, 28, 29, 30],
    [1, 2, 3, 4, 5]
  );
  await setBRankAriseMonsterTx.wait();
  const setARankAriseMonsterTx = await monsterFactory.setAriseMonsterBatch(
    RankType.A,
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10]
  );
  await setARankAriseMonsterTx.wait();
  const setSRankAriseMonsterTx = await monsterFactory.setAriseMonsterBatch(
    RankType.S,
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15]
  );
  await setSRankAriseMonsterTx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
