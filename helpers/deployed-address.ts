import BN from "bn.js";
import hre from "hardhat";
import { toChecksumAddress } from "ethereumjs-util";

import { ContractType } from "./constant/common";

const EIP1967_HASH =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

export const updateDeployed = (
  deployed: any,
  contractType: ContractType,
  network: string,
  address: string,
  implementation: string
) => {
  if (deployed[contractType] === undefined) {
    deployed[contractType] = {};
  }

  const obj = { address, implementation };
  deployed[contractType][network] = obj;

  return deployed;
};

export const getImplementationAddress = async (proxyAddress: string) => {
  const storage = await hre.ethers.provider.getStorageAt(
    proxyAddress,
    EIP1967_HASH
  );

  if (isEmptySlot(storage)) {
    throw new Error("is empty slot");
  }

  return parseAddress(storage);
};

const parseAddress = (storage: string): string => {
  const buf = Buffer.from(storage.replace(/^0x/, ""), "hex");
  if (!buf.slice(0, 12).equals(Buffer.alloc(12, 0))) {
    throw new Error(`Value in storage is not an address (${storage})`);
  }
  const address = "0x" + buf.toString("hex", 12, 32); // grab the last 20 bytes
  return toChecksumAddress(address);
};

const isEmptySlot = (storage: string): boolean => {
  storage = storage.replace(/^0x/, "");
  return new BN(storage, "hex").isZero();
};
