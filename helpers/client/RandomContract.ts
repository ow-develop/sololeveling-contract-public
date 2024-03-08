import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import ContractBase from "./Contract";

export default class RandomContract extends ContractBase {
  constructor(signer: SignerWithAddress, contractAddress: string) {
    super(signer, contractAddress, require("./abi/RandomABI.json"));
  }

  public async getRandomSigner(): Promise<string | Error> {
    try {
      return await this.contract.getRandomSigner();
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async getNonce(hunter: string): Promise<number | Error> {
    try {
      return (await this.contract.getNonce(hunter)).toNumber();
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }
}
