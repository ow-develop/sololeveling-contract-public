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
import "solidity-coverage";

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
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 5,
      accounts: [
        process.env.ETHER_PRIVATE_KEY_1 || "",
        process.env.ETHER_PRIVATE_KEY_2 || "",
        process.env.ETHER_PRIVATE_KEY_3 || "",
        process.env.ETHER_PRIVATE_KEY_4 || "",
        process.env.ETHER_PRIVATE_KEY_5 || "",
        process.env.ETHER_PRIVATE_KEY_6 || "",
        process.env.ETHER_PRIVATE_KEY_7 || "",
        process.env.ETHER_PRIVATE_KEY_8 || "",
        process.env.ETHER_PRIVATE_KEY_9 || "",
        process.env.ETHER_PRIVATE_KEY_10 || "",
      ],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 3,
      accounts: [
        process.env.ETHER_PRIVATE_KEY_1 || "",
        process.env.ETHER_PRIVATE_KEY_2 || "",
        process.env.ETHER_PRIVATE_KEY_3 || "",
        process.env.ETHER_PRIVATE_KEY_4 || "",
        process.env.ETHER_PRIVATE_KEY_5 || "",
        process.env.ETHER_PRIVATE_KEY_6 || "",
        process.env.ETHER_PRIVATE_KEY_7 || "",
        process.env.ETHER_PRIVATE_KEY_8 || "",
        process.env.ETHER_PRIVATE_KEY_9 || "",
        process.env.ETHER_PRIVATE_KEY_10 || "",
      ],
    },
    arbitrumGoerli: {
      chainId: 421613,
      url: "https://goerli-rollup.arbitrum.io/rpc",
      accounts: [process.env.ETHER_PRIVATE_KEY_1 || ""],
    },
    arbitrumSepolia: {
      url: `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 421614,
      accounts: [
        process.env.ETHER_PRIVATE_KEY_1 || "",
        process.env.ETHER_PRIVATE_KEY_2 || "",
        process.env.ETHER_PRIVATE_KEY_3 || "",
        process.env.ETHER_PRIVATE_KEY_4 || "",
        process.env.ETHER_PRIVATE_KEY_5 || "",
        process.env.ETHER_PRIVATE_KEY_6 || "",
        process.env.ETHER_PRIVATE_KEY_7 || "",
        process.env.ETHER_PRIVATE_KEY_8 || "",
        process.env.ETHER_PRIVATE_KEY_9 || "",
        process.env.ETHER_PRIVATE_KEY_10 || "",
      ],
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 80001,
      accounts: [
        process.env.ETHER_PRIVATE_KEY_1 || "",
        process.env.ETHER_PRIVATE_KEY_2 || "",
        process.env.ETHER_PRIVATE_KEY_3 || "",
        process.env.ETHER_PRIVATE_KEY_4 || "",
        process.env.ETHER_PRIVATE_KEY_5 || "",
        process.env.ETHER_PRIVATE_KEY_6 || "",
        process.env.ETHER_PRIVATE_KEY_7 || "",
        process.env.ETHER_PRIVATE_KEY_8 || "",
        process.env.ETHER_PRIVATE_KEY_9 || "",
        process.env.ETHER_PRIVATE_KEY_10 || "",
      ],
    },
    baobab: {
      url: "https://api.baobab.klaytn.net:8651",
      chainId: 1001,
      accounts: [
        process.env.KLAY_PRIVATE_KEY_1 || "",
        process.env.KLAY_PRIVATE_KEY_2 || "",
        process.env.KLAY_PRIVATE_KEY_3 || "",
        process.env.KLAY_PRIVATE_KEY_4 || "",
        process.env.KLAY_PRIVATE_KEY_5 || "",
        process.env.KLAY_PRIVATE_KEY_6 || "",
        process.env.KLAY_PRIVATE_KEY_7 || "",
        process.env.KLAY_PRIVATE_KEY_8 || "",
        process.env.KLAY_PRIVATE_KEY_9 || "",
        process.env.KLAY_PRIVATE_KEY_10 || "",
        process.env.KLAY_PRIVATE_KEY_11 || "",
        process.env.KLAY_PRIVATE_KEY_12 || "",
        process.env.KLAY_PRIVATE_KEY_13 || "",
        process.env.KLAY_PRIVATE_KEY_14 || "",
        process.env.KLAY_PRIVATE_KEY_15 || "",
        process.env.KLAY_PRIVATE_KEY_16 || "",
        process.env.KLAY_PRIVATE_KEY_17 || "",
        process.env.KLAY_PRIVATE_KEY_18 || "",
        process.env.KLAY_PRIVATE_KEY_19 || "",
        process.env.KLAY_PRIVATE_KEY_20 || "",
        process.env.KLAY_PRIVATE_KEY_21 || "",
        process.env.KLAY_PRIVATE_KEY_22 || "",
        process.env.KLAY_PRIVATE_KEY_23 || "",
        process.env.KLAY_PRIVATE_KEY_24 || "",
        process.env.KLAY_PRIVATE_KEY_25 || "",
        process.env.KLAY_PRIVATE_KEY_26 || "",
        process.env.KLAY_PRIVATE_KEY_27 || "",
        process.env.KLAY_PRIVATE_KEY_28 || "",
        process.env.KLAY_PRIVATE_KEY_29 || "",
        process.env.KLAY_PRIVATE_KEY_30 || "",
        process.env.KLAY_PRIVATE_KEY_31 || "",
        process.env.KLAY_PRIVATE_KEY_32 || "",
        process.env.KLAY_PRIVATE_KEY_33 || "",
        process.env.KLAY_PRIVATE_KEY_34 || "",
        process.env.KLAY_PRIVATE_KEY_35 || "",
        process.env.KLAY_PRIVATE_KEY_36 || "",
        process.env.KLAY_PRIVATE_KEY_37 || "",
        process.env.KLAY_PRIVATE_KEY_38 || "",
        process.env.KLAY_PRIVATE_KEY_39 || "",
        process.env.KLAY_PRIVATE_KEY_40 || "",
        process.env.KLAY_PRIVATE_KEY_41 || "",
        process.env.KLAY_PRIVATE_KEY_42 || "",
        process.env.KLAY_PRIVATE_KEY_43 || "",
        process.env.KLAY_PRIVATE_KEY_44 || "",
        process.env.KLAY_PRIVATE_KEY_45 || "",
        process.env.KLAY_PRIVATE_KEY_46 || "",
        process.env.KLAY_PRIVATE_KEY_47 || "",
        process.env.KLAY_PRIVATE_KEY_48 || "",
        process.env.KLAY_PRIVATE_KEY_49 || "",
        process.env.KLAY_PRIVATE_KEY_50 || "",
      ],
      gasPrice: 250000000000,
      gas: 30000000,
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
      arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_API_KEY || "",
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
