import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

describe("Random", () => {
  let randomSigner: SignerWithAddress,
    hunter1: SignerWithAddress,
    hunter2: SignerWithAddress,
    hunter3: SignerWithAddress,
    hunter4: SignerWithAddress;

  before(async () => {
    [randomSigner, hunter1, hunter2, hunter3, hunter4] =
      await ethers.getSigners();
    console.log(
      "Deploying contracts with the account: " + randomSigner.address
    );
  });

  interface Result {
    numbers: number[];
    percentage10: number;
    percentage20: number;
    percentage30: number;
    percentage40: number;
    percentage50: number;
    percentage60: number;
    percentage70: number;
    percentage80: number;
    percentage90: number;
    percentage100: number;
  }

  describe("Random", async () => {
    it("Hunter 1 Generate Random Number * 100000", async () => {
      let hunterNonce = 0;

      const result: Result = {
        numbers: [],
        percentage10: 0,
        percentage20: 0,
        percentage30: 0,
        percentage40: 0,
        percentage50: 0,
        percentage60: 0,
        percentage70: 0,
        percentage80: 0,
        percentage90: 0,
        percentage100: 0,
      };

      for (let i = 0; i < 100000; i++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [hunter1.address, hunterNonce]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const signatrue = await randomSigner.signMessage(messageBinary);

        const randomNumber = ethers.BigNumber.from(
          ethers.utils.solidityKeccak256(["bytes"], [signatrue])
        );
        const modNumber = randomNumber.mod(100_00000).toNumber() + 1;

        result.numbers.push(modNumber);

        if (modNumber <= 10_00000) result.percentage10 += 1;
        if (modNumber <= 20_00000) result.percentage20 += 1;
        if (modNumber <= 30_00000) result.percentage30 += 1;
        if (modNumber <= 40_00000) result.percentage40 += 1;
        if (modNumber <= 50_00000) result.percentage50 += 1;
        if (modNumber <= 60_00000) result.percentage60 += 1;
        if (modNumber <= 70_00000) result.percentage70 += 1;
        if (modNumber <= 80_00000) result.percentage80 += 1;
        if (modNumber <= 90_00000) result.percentage90 += 1;
        if (modNumber <= 100_00000) result.percentage100 += 1;

        hunterNonce += 1;
      }

      console.log(`
      <= 10% count : ${result.percentage10}, percentage : ${
        (result.percentage10 / 100000) * 100
      }%
      <= 20% count : ${result.percentage20}, percentage : ${
        (result.percentage20 / 100000) * 100
      }%
      <= 30% count : ${result.percentage30}, percentage : ${
        (result.percentage30 / 100000) * 100
      }%
      <= 40% count : ${result.percentage40}, percentage : ${
        (result.percentage40 / 100000) * 100
      }%
      <= 50% count : ${result.percentage50}, percentage : ${
        (result.percentage50 / 100000) * 100
      }%
      <= 60% count : ${result.percentage60}, percentage : ${
        (result.percentage60 / 100000) * 100
      }%
      <= 70% count : ${result.percentage70}, percentage : ${
        (result.percentage70 / 100000) * 100
      }%
      <= 80% count : ${result.percentage80}, percentage : ${
        (result.percentage80 / 100000) * 100
      }%
      <= 90% count : ${result.percentage90}, percentage : ${
        (result.percentage90 / 100000) * 100
      }%
      <= 100% count : ${result.percentage100}, percentage : ${
        (result.percentage100 / 100000) * 100
      }%
      `);
    });

    it("Hunter 2 Generate Random Number * 100000", async () => {
      let hunterNonce = 0;

      const result: Result = {
        numbers: [],
        percentage10: 0,
        percentage20: 0,
        percentage30: 0,
        percentage40: 0,
        percentage50: 0,
        percentage60: 0,
        percentage70: 0,
        percentage80: 0,
        percentage90: 0,
        percentage100: 0,
      };

      for (let i = 0; i < 100000; i++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [hunter2.address, hunterNonce]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const signatrue = await randomSigner.signMessage(messageBinary);

        const randomNumber = ethers.BigNumber.from(
          ethers.utils.solidityKeccak256(["bytes"], [signatrue])
        );
        const modNumber = randomNumber.mod(100_00000).toNumber() + 1;

        result.numbers.push(modNumber);

        if (modNumber <= 10_00000) result.percentage10 += 1;
        if (modNumber <= 20_00000) result.percentage20 += 1;
        if (modNumber <= 30_00000) result.percentage30 += 1;
        if (modNumber <= 40_00000) result.percentage40 += 1;
        if (modNumber <= 50_00000) result.percentage50 += 1;
        if (modNumber <= 60_00000) result.percentage60 += 1;
        if (modNumber <= 70_00000) result.percentage70 += 1;
        if (modNumber <= 80_00000) result.percentage80 += 1;
        if (modNumber <= 90_00000) result.percentage90 += 1;
        if (modNumber <= 100_00000) result.percentage100 += 1;

        hunterNonce += 1;
      }

      console.log(`
      <= 10% count : ${result.percentage10}, percentage : ${
        (result.percentage10 / 100000) * 100
      }%
      <= 20% count : ${result.percentage20}, percentage : ${
        (result.percentage20 / 100000) * 100
      }%
      <= 30% count : ${result.percentage30}, percentage : ${
        (result.percentage30 / 100000) * 100
      }%
      <= 40% count : ${result.percentage40}, percentage : ${
        (result.percentage40 / 100000) * 100
      }%
      <= 50% count : ${result.percentage50}, percentage : ${
        (result.percentage50 / 100000) * 100
      }%
      <= 60% count : ${result.percentage60}, percentage : ${
        (result.percentage60 / 100000) * 100
      }%
      <= 70% count : ${result.percentage70}, percentage : ${
        (result.percentage70 / 100000) * 100
      }%
      <= 80% count : ${result.percentage80}, percentage : ${
        (result.percentage80 / 100000) * 100
      }%
      <= 90% count : ${result.percentage90}, percentage : ${
        (result.percentage90 / 100000) * 100
      }%
      <= 100% count : ${result.percentage100}, percentage : ${
        (result.percentage100 / 100000) * 100
      }%
      `);
    });

    it("Hunter 3 Generate Random Number * 100000", async () => {
      let hunterNonce = 0;

      const result: Result = {
        numbers: [],
        percentage10: 0,
        percentage20: 0,
        percentage30: 0,
        percentage40: 0,
        percentage50: 0,
        percentage60: 0,
        percentage70: 0,
        percentage80: 0,
        percentage90: 0,
        percentage100: 0,
      };

      for (let i = 0; i < 100000; i++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [hunter3.address, hunterNonce]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const signatrue = await randomSigner.signMessage(messageBinary);

        const randomNumber = ethers.BigNumber.from(
          ethers.utils.solidityKeccak256(["bytes"], [signatrue])
        );
        const modNumber = randomNumber.mod(100_00000).toNumber() + 1;

        result.numbers.push(modNumber);

        if (modNumber <= 10_00000) result.percentage10 += 1;
        if (modNumber <= 20_00000) result.percentage20 += 1;
        if (modNumber <= 30_00000) result.percentage30 += 1;
        if (modNumber <= 40_00000) result.percentage40 += 1;
        if (modNumber <= 50_00000) result.percentage50 += 1;
        if (modNumber <= 60_00000) result.percentage60 += 1;
        if (modNumber <= 70_00000) result.percentage70 += 1;
        if (modNumber <= 80_00000) result.percentage80 += 1;
        if (modNumber <= 90_00000) result.percentage90 += 1;
        if (modNumber <= 100_00000) result.percentage100 += 1;

        hunterNonce += 1;
      }

      console.log(`
      <= 10% count : ${result.percentage10}, percentage : ${
        (result.percentage10 / 100000) * 100
      }%
      <= 20% count : ${result.percentage20}, percentage : ${
        (result.percentage20 / 100000) * 100
      }%
      <= 30% count : ${result.percentage30}, percentage : ${
        (result.percentage30 / 100000) * 100
      }%
      <= 40% count : ${result.percentage40}, percentage : ${
        (result.percentage40 / 100000) * 100
      }%
      <= 50% count : ${result.percentage50}, percentage : ${
        (result.percentage50 / 100000) * 100
      }%
      <= 60% count : ${result.percentage60}, percentage : ${
        (result.percentage60 / 100000) * 100
      }%
      <= 70% count : ${result.percentage70}, percentage : ${
        (result.percentage70 / 100000) * 100
      }%
      <= 80% count : ${result.percentage80}, percentage : ${
        (result.percentage80 / 100000) * 100
      }%
      <= 90% count : ${result.percentage90}, percentage : ${
        (result.percentage90 / 100000) * 100
      }%
      <= 100% count : ${result.percentage100}, percentage : ${
        (result.percentage100 / 100000) * 100
      }%
      `);
    });

    it("Hunter 4 Generate Random Number * 100000", async () => {
      let hunterNonce = 0;

      const result: Result = {
        numbers: [],
        percentage10: 0,
        percentage20: 0,
        percentage30: 0,
        percentage40: 0,
        percentage50: 0,
        percentage60: 0,
        percentage70: 0,
        percentage80: 0,
        percentage90: 0,
        percentage100: 0,
      };

      for (let i = 0; i < 100000; i++) {
        const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [hunter4.address, hunterNonce]
        );
        const messageBinary = ethers.utils.arrayify(messageHash);
        const signatrue = await randomSigner.signMessage(messageBinary);

        const randomNumber = ethers.BigNumber.from(
          ethers.utils.solidityKeccak256(["bytes"], [signatrue])
        );
        const modNumber = randomNumber.mod(100_00000).toNumber() + 1;

        result.numbers.push(modNumber);

        if (modNumber <= 10_00000) result.percentage10 += 1;
        if (modNumber <= 20_00000) result.percentage20 += 1;
        if (modNumber <= 30_00000) result.percentage30 += 1;
        if (modNumber <= 40_00000) result.percentage40 += 1;
        if (modNumber <= 50_00000) result.percentage50 += 1;
        if (modNumber <= 60_00000) result.percentage60 += 1;
        if (modNumber <= 70_00000) result.percentage70 += 1;
        if (modNumber <= 80_00000) result.percentage80 += 1;
        if (modNumber <= 90_00000) result.percentage90 += 1;
        if (modNumber <= 100_00000) result.percentage100 += 1;

        hunterNonce += 1;
      }

      console.log(`
        <= 10% count : ${result.percentage10}, percentage : ${
        (result.percentage10 / 100000) * 100
      }%
        <= 20% count : ${result.percentage20}, percentage : ${
        (result.percentage20 / 100000) * 100
      }%
        <= 30% count : ${result.percentage30}, percentage : ${
        (result.percentage30 / 100000) * 100
      }%
        <= 40% count : ${result.percentage40}, percentage : ${
        (result.percentage40 / 100000) * 100
      }%
        <= 50% count : ${result.percentage50}, percentage : ${
        (result.percentage50 / 100000) * 100
      }%
        <= 60% count : ${result.percentage60}, percentage : ${
        (result.percentage60 / 100000) * 100
      }%
        <= 70% count : ${result.percentage70}, percentage : ${
        (result.percentage70 / 100000) * 100
      }%
        <= 80% count : ${result.percentage80}, percentage : ${
        (result.percentage80 / 100000) * 100
      }%
        <= 90% count : ${result.percentage90}, percentage : ${
        (result.percentage90 / 100000) * 100
      }%
        <= 100% count : ${result.percentage100}, percentage : ${
        (result.percentage100 / 100000) * 100
      }%
        `);
    });
  });
});
