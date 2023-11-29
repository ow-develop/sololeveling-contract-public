/** @format */

import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-truffle5";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "london",
        },
      },
    ],
  },
  networks: {
    hardhat: {
      accounts: { count: 1000 },
    },
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 250000000000,
    enabled: !!process.env.REPORT_GAS,
    showTimeSpent: true,
    showMethodSig: true,
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
