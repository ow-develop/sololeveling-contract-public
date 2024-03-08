import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  ERROR_STRING_PREFIX,
  PANIC_CODE_PREFIX,
  UNKNOWN_ERROR,
  CUSTOM_ERROR,
} from "./constant/common";
import { defaultAbiCoder } from "ethers/lib/utils";

export default abstract class ContractBase {
  protected contract: Contract;

  constructor(signer: SignerWithAddress, contractAddress: string, abi: any) {
    const contractInterface = new ethers.utils.Interface(abi);

    this.contract = new ethers.Contract(
      contractAddress,
      contractInterface,
      signer
    );
  }

  public async getContractSignerAddress(): Promise<string> {
    return await this.contract.signer.getAddress();
  }

  public setContractSigner(signer: SignerWithAddress) {
    this.contract = this.contract.connect(signer);
  }

  public getContractAddress() {
    return this.contract.address;
  }

  public setContractAddress(contractAddress: string) {
    this.contract = new ethers.Contract(
      contractAddress,
      this.contract.interface,
      this.contract.signer
    );
  }

  protected static getEventArgs(events: any, eventName: string) {
    const event = events.find((v: any) => v.event === eventName);
    return event.args;
  }

  protected static contractErrorHandler(error: any): Error {
    return new Error(ContractBase.getErrorName(error));
  }

  private static getErrorName(error: any): string {
    if (!(error instanceof Error)) {
      return UNKNOWN_ERROR;
    }

    error = error as any;

    if (error.errorName) {
      return error.errorName;
    }

    const errorData =
      error.data ?? error.error?.data ?? error.error?.error?.error?.data;

    if (errorData === undefined) {
      return error.message ? error.message : UNKNOWN_ERROR;
    }

    const returnData =
      typeof errorData === "string" ? errorData : errorData.data;

    if (returnData === undefined || typeof returnData !== "string") {
      return UNKNOWN_ERROR;
    } else if (returnData === "0x") {
      return UNKNOWN_ERROR;
    } else if (returnData.startsWith(ERROR_STRING_PREFIX)) {
      const encodedReason = returnData.slice(ERROR_STRING_PREFIX.length);
      let reason: string;

      try {
        reason = defaultAbiCoder.decode(["string"], `0x${encodedReason}`)[0];
      } catch (err) {
        return UNKNOWN_ERROR;
      }

      return reason;
    } else if (returnData.startsWith(PANIC_CODE_PREFIX)) {
      const encodedReason = returnData.slice(PANIC_CODE_PREFIX.length);
      let code: BigNumber;

      try {
        code = defaultAbiCoder.decode(["uint256"], `0x${encodedReason}`)[0];
      } catch (err) {
        return UNKNOWN_ERROR;
      }

      return ContractBase.panicErrorCodeToReason(code) ?? "unknown panic code";
    }

    const customErrorName = CUSTOM_ERROR[returnData.slice(0, 10)];

    if (customErrorName === undefined) {
      return UNKNOWN_ERROR;
    }

    return customErrorName;
  }

  private static panicErrorCodeToReason(errorCode: BigNumber) {
    switch (errorCode.toNumber()) {
      case 0x1:
        return "Assertion error";
      case 0x11:
        return "Arithmetic operation underflowed or overflowed outside of an unchecked block";
      case 0x12:
        return "Division or modulo division by zero";
      case 0x21:
        return "Tried to convert a value into an enum, but the value was too big or negative";
      case 0x22:
        return "Incorrectly encoded storage byte array";
      case 0x31:
        return ".pop() was called on an empty array";
      case 0x32:
        return "Array accessed at an out-of-bounds or negative index";
      case 0x41:
        return "Too much memory was allocated, or an array was created that is too large";
      case 0x51:
        return "Called a zero-initialized variable of internal function type";
    }
  }
}
