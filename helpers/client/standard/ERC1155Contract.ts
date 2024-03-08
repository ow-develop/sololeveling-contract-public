import { ApprovalForAll, TransferBatch, TransferSingle } from "./../type/event";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import ContractBase from "../Contract";

export default class ERC1155Contract extends ContractBase {
  constructor(signer: SignerWithAddress, contractAddress: string) {
    super(signer, contractAddress, require("../abi/ERC1155ABI.json"));
  }

  public async totalSupply(tokenId: number): Promise<number | Error> {
    try {
      return (await this.contract.totalSupply(tokenId)).toNumber();
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async uri(tokenId: number): Promise<string | Error> {
    try {
      return await this.contract.uri(tokenId);
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async balanceOf(
    account: string,
    tokenId: number
  ): Promise<number | Error> {
    try {
      return (await this.contract.balanceOf(account, tokenId)).toNumber();
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async balanceOfBatch(
    accounts: string[],
    tokenIds: number[]
  ): Promise<number[] | Error> {
    try {
      const balances = await this.contract.balanceOfBatch(accounts, tokenIds);

      return balances.map((balance: BigNumber) => balance.toNumber());
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async exists(tokenId: number): Promise<boolean | Error> {
    try {
      return await this.contract.exists(tokenId);
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async isApprovedForAll(
    account: string,
    operator: string
  ): Promise<boolean | Error> {
    try {
      return await this.contract.isApprovedForAll(account, operator);
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async setApprovalForAll(
    operator: string,
    approved: boolean
  ): Promise<
    | { txHash: string; blockNumber: number; ApprovalForAll: ApprovalForAll }
    | Error
  > {
    try {
      const setApprovalForAllTx = await this.contract.setApprovalForAll(
        operator,
        approved
      );

      const receipt = await setApprovalForAllTx.wait();
      const eventArgs = ContractBase.getEventArgs(
        receipt.events,
        "ApprovalForAll"
      );

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        ApprovalForAll: {
          account: eventArgs.account,
          operator: eventArgs.operator,
          approved: eventArgs.approved,
        },
      };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async safeTransferFrom(
    from: string,
    to: string,
    tokenId: number,
    amount: number
  ): Promise<
    | { txHash: string; blockNumber: number; TransferSingle: TransferSingle }
    | Error
  > {
    try {
      const safeTransferFromTx = await this.contract.safeTransferFrom(
        from,
        to,
        tokenId,
        amount,
        "0x"
      );

      const receipt = await safeTransferFromTx.wait();
      const eventArgs = ContractBase.getEventArgs(
        receipt.events,
        "TransferSingle"
      );

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        TransferSingle: {
          operator: eventArgs.operator,
          from: eventArgs.from,
          to: eventArgs.to,
          id: eventArgs.id.toNumber(),
          value: eventArgs.value.toNumber(),
        },
      };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async safeBatchTransferFrom(
    from: string,
    to: string,
    tokenIds: number[],
    amounts: number[]
  ): Promise<
    | { txHash: string; blockNumber: number; TransferBatch: TransferBatch }
    | Error
  > {
    try {
      const safeBatchTransferFromTx = await this.contract.safeBatchTransferFrom(
        from,
        to,
        tokenIds,
        amounts,
        "0x"
      );

      const receipt = await safeBatchTransferFromTx.wait();
      const eventArgs = ContractBase.getEventArgs(
        receipt.events,
        "TransferBatch"
      );

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        TransferBatch: {
          operator: eventArgs.operator,
          from: eventArgs.from,
          to: eventArgs.to,
          ids: eventArgs.ids.map((id: BigNumber) => id.toNumber()),
          values: eventArgs.values.map((value: BigNumber) => value.toNumber()),
        },
      };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async burn(
    account: string,
    tokenId: number,
    amount: number
  ): Promise<
    | { txHash: string; blockNumber: number; TransferSingle: TransferSingle }
    | Error
  > {
    try {
      const burnTx = await this.contract.burn(account, tokenId, amount);

      const receipt = await burnTx.wait();
      const eventArgs = ContractBase.getEventArgs(
        receipt.events,
        "TransferSingle"
      );

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        TransferSingle: {
          operator: eventArgs.operator,
          from: eventArgs.from,
          to: eventArgs.to,
          id: eventArgs.id.toNumber(),
          value: eventArgs.value.toNumber(),
        },
      };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async burnBatch(
    account: string,
    tokenIds: number[],
    amounts: number[]
  ): Promise<
    | { txHash: string; blockNumber: number; TransferBatch: TransferBatch }
    | Error
  > {
    try {
      const burnBatchTx = await this.contract.burnBatch(
        account,
        tokenIds,
        amounts,
        "0x"
      );

      const receipt = await burnBatchTx.wait();
      const eventArgs = ContractBase.getEventArgs(
        receipt.events,
        "TransferBatch"
      );

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        TransferBatch: {
          operator: eventArgs.operator,
          from: eventArgs.from,
          to: eventArgs.to,
          ids: eventArgs.ids.map((id: BigNumber) => id.toNumber()),
          values: eventArgs.values.map((value: BigNumber) => value.toNumber()),
        },
      };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }
}
