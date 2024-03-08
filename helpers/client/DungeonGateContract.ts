import { GateCreated } from "./../type/event";
import { BigNumber, ethers } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RankType } from "./constant/contract";
import { Gate } from "./type/contract";
import ContractBase from "./Contract";

export default class DungeonGateContract extends ContractBase {
  constructor(signer: SignerWithAddress, contractAddress: string) {
    super(signer, contractAddress, require("./abi/DungeonGateABI.json"));
  }

  public async getHunterUsingSlot(hunter: string): Promise<number | Error> {
    try {
      return (await this.contract.getHunterUsingSlot(hunter)).toNumber();
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async getHunterSlot(
    seasonId: number,
    hunter: string
  ): Promise<{ totalSlot: number; usingSlot: number } | Error> {
    try {
      const hunterSlot = await this.contract.getHunterSlot(seasonId, hunter);
      return {
        totalSlot: hunterSlot.totalSlot.toNumber(),
        usingSlot: hunterSlot.usingSlot.toNumber(),
      };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async enterToGate(
    seasonId: number,
    gateRank: RankType,
    matic: string
  ): Promise<
    { txHash: string; blockNumber: number; GateCreated: GateCreated } | Error
  > {
    try {
      const enterToGateTx = await this.contract.enterToGate(
        seasonId,
        gateRank,
        { value: ethers.utils.parseEther(matic) }
      );

      const receipt = await enterToGateTx.wait();
      const eventArgs = ContractBase.getEventArgs(
        receipt.events,
        "GateCreated"
      );

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        GateCreated: {
          seasonId: eventArgs.seasonId.toNumber(),
          gateRank: eventArgs.gateRank,
          hunter: eventArgs.hunter,
          gateId: eventArgs.gateId.toNumber(),
          startBlock: eventArgs.startBlock.toNumber(),
          endBlock: eventArgs.endBlock.toNumber(),
        },
      };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  // public async claimClearGate(
  //   gateId: number,
  //   gateSignatures: string[]
  // ): Promise<
  //   { txHash: string; blockNumber: number; GateCleared: GateCleared } | Error
  // > {
  //   try {
  //     const claimClearGateTx = await this.contract.claimClearGate(
  //       gateId,
  //       gateSignatures
  //     );
  //
  //     const receipt = await claimClearGateTx.wait();
  //     const eventArgs = ContractBase.getEventArgs(
  //       receipt.events,
  //       "GateCleared"
  //     );
  //
  //     return {
  //       txHash: receipt.transactionHash,
  //       blockNumber: receipt.blockNumber,
  //       GateCleared: {
  //         gateRank: eventArgs.gateRank,
  //         hunter: eventArgs.hunter,
  //         gateId: eventArgs.gateId.toNumber(),
  //         usedStone: eventArgs.usedStone.toNumber(),
  //         gateSignatures: eventArgs.gateSignatures,
  //         stoneIds: eventArgs.stoneIds.map((stoneId: BigNumber) =>
  //           stoneId.toNumber()
  //         ),
  //         timestamp: eventArgs.timestamp.toNumber(),
  //       },
  //     };
  //   } catch (error) {
  //     return ContractBase.contractErrorHandler(error);
  //   }
  // }

  public async getGateRemainingBlock(gateId: number): Promise<number | Error> {
    try {
      return (await this.contract.getGateRemainingBlock(gateId)).toNumber();
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async getRequiredBrokenStoneForClear(
    gateId: number
  ): Promise<number | Error> {
    try {
      return (
        await this.contract.getRequiredBrokenStoneForClear(gateId)
      ).toNumber();
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async getGateIdOfHunterSlot(
    hunter: string
  ): Promise<number[] | Error> {
    try {
      const gateIds = await this.contract.getGateIdOfHunterSlot(hunter);

      return gateIds.map((gateId: BigNumber) => gateId.toNumber());
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async getGateOfHunterSlot(
    hunter: string
  ): Promise<{ gates: Gate[]; requiredBrokenStones: number[] } | Error> {
    try {
      const gateOfHunterSlot = await this.contract.getGateOfHunterSlot(hunter);

      const gates = gateOfHunterSlot.gateOfHunterSlot.map((gate: any) => {
        return {
          id: gate.id.toNumber(),
          seasonId: gate.seasonId.toNumber(),
          startBlock: gate.startBlock,
          endBlock: gate.endBlock,
          usedBrokenStone: gate.usedBrokenStone,
          claimed: gate.claimed,
          gateRank: gate.gateRank,
          hunter: gate.hunter,
        };
      });

      const requiredBrokenStones = gateOfHunterSlot.requiredBrokenStones.map(
        (stone: BigNumber) => stone.toNumber()
      );

      return { gates, requiredBrokenStones };
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async isClaimedGate(gateId: number): Promise<boolean[] | Error> {
    try {
      return await this.contract.isClaimedGate(gateId);
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }

  public async isClearGate(gateId: number): Promise<boolean[] | Error> {
    try {
      return await this.contract.isClearGate(gateId);
    } catch (error) {
      return ContractBase.contractErrorHandler(error);
    }
  }
}
