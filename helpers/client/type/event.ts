import { BigNumber } from "ethers";
import { RankType } from "../constant/contract";
import { EssenceStoneAriseResult, BrokenStoneSmeltingResult } from "./contract";

/*
 *  ERC1155
 */
export interface ApprovalForAll {
  account: string;
  operator: string;
  approved: boolean;
}

export interface TransferSingle {
  operator: string;
  from: string;
  to: string;
  id: number;
  value: number;
}

export interface TransferBatch {
  operator: string;
  from: string;
  to: string;
  ids: number[];
  values: number[];
}

/*
 *  Season
 */
export interface ERankClaimed {
  seasonId: number;
  hunter: string;
  timestamp: number;
}

export interface HunterRankUp {
  seasonId: number;
  hunter: string;
  rankType: RankType;
  timestamp: number;
}

/*
 *  DungeonGate
 */
export interface GateCreated {
  seasonId: number;
  gateRank: RankType;
  hunter: string;
  gateId: number;
  startBlock: number;
  endBlock: number;
}

export interface GateFeeDistributed {
  seasonId: number;
  gateRank: RankType;
  gateId: number;
  price: BigNumber;
  distributedAccounts: string[];
  distributedAmounts: BigNumber[];
  timestamp: number;
}

export interface GateCleared {
  gateRank: RankType;
  hunter: string;
  gateId: number;
  usedBrokenStone: number;
  gateSignatures: string[];
  stoneIds: number[];
  timestamp: number;
}

/*
 *  System
 */
export interface EssenceStoneUpgraded {
  hunter: string;
  upgradeRank: RankType;
  upgradeAmount: number;
  burnAmount: number;
  timestamp: number;
}

export interface EssenceStoneArose {
  hunter: string;
  monsterRank: RankType;
  ariseAmount: number;
  burnAmount: number;
  ariseResults: EssenceStoneAriseResult[];
  timestamp: number;
}

export interface BrokenStoneSmelted {
  hunter: string;
  smeltingAmount: number;
  burnAmount: number;
  smeltingResults: BrokenStoneSmeltingResult[];
  timestamp: number;
}

export interface MonsterReturned {
  hunter: string;
  monsterRank: RankType;
  isShadow: boolean;
  brokenStone: number;
  monsterIds: number[];
  monsterAmounts: number[];
  timestamp: number;
}
