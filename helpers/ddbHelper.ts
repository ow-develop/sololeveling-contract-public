import * as fs from "fs";
import { Interface } from "ethers/lib/utils";
import { ethers } from "ethers";
import { ContractType, ContractPath } from "./constant/common";

export const getErrorData = (contractInterfaces: Interface[]) => {
  const errorData = {} as any;

  for (let i = 0; i < contractInterfaces.length; i++) {
    for (const [signature, value] of Object.entries(
      contractInterfaces[i].errors
    )) {
      const id = ethers.utils.id(signature).slice(0, 10);
      if (!errorData[id]) {
        errorData[id] = value.name;
      }
    }
  }

  return errorData;
};

export const getContractABI = (contractType: ContractType): Array<any> => {
  return JSON.parse(fs.readFileSync(ContractPath[contractType], "utf8")).abi;
};

export const getContractByteCode = (contractType: ContractType): string => {
  return JSON.parse(fs.readFileSync(ContractPath[contractType], "utf8"))
    .bytecode;
};

export const getDate = (): string => {
  const date = new Date();

  const result =
    leadingZeros(date.getFullYear(), 4) +
    "-" +
    leadingZeros(date.getMonth() + 1, 2) +
    "-" +
    leadingZeros(date.getDate(), 2);

  return result;
};

export const delay = (time: number): Promise<any> => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const leadingZeros = (target: number, digits: number): string => {
  let zero = "";
  const targetString = target.toString();

  if (targetString.length < digits) {
    for (let i = 0; i < digits - targetString.length; i++) zero += "0";
  }

  return zero + targetString;
};
