import { BigNumber } from "ethers";
import { OfferingType, PriceMode, RankType } from "../constant/contract";
import {
  MonsterReward,
  MonsterSet,
  SeasonPackReward,
  UseMonster,
} from "./contract";

/*
 *  Base
 */
export interface Create {
  target: string;
  targetId: number;
  timestamp: number;
}

/*
 *  Project
 */
export interface SetOperator {
  operator: string;
  timestamp: number;
}

/*
 *  MonsterFactory
 */
export interface AddMonster {
  monsterRank: RankType;
  isShadow: boolean;
  monsterId: number;
  timestamp: number;
}

export interface SetMonsterRankType {
  isShadow: boolean;
  monsterId: number;
  monsterRank: RankType;
  timestamp: number;
}

export interface SetAriseMonster {
  nextMonsterRank: RankType;
  beforeMonsterId: number;
  nextMonsterId: number;
  timestamp: number;
}

export interface SetAriseMonsterBatch {
  nextMonsterRank: RankType;
  beforeMonsterIds: number[];
  nextMonsterIds: number[];
  timestamp: number;
}

/*
 *  SeasonQuest
 */
export interface QuestCompleted {
  hunter: string;
  questId: number;
  currentScore: number;
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
  isRankUp: boolean;
  nextHunterRank: RankType;
}

export interface GateCleared {
  gateRank: RankType;
  hunter: string;
  gateId: number;
  seasonId: number;
  usedStone: number;
  gateSignatures: string[];
  monsterReward: MonsterReward;
  seasonPackReward: SeasonPackReward;
  essenceStoneReward: number;
  timestamp: number;
}

/*
 *  System
 */
export interface MonsterUpgraded {
  hunter: string;
  upgradedRank: RankType;
  upgradedAmount: number;
  usedMonster: UseMonster;
  usedStone: number;
  resultMonsterIds: number[];
  timestamp: number;
}

export interface MonsterArose {
  hunter: string;
  nextMonsterRank: RankType;
  monsterId: number;
  requestAmount: number;
  aroseCount: number;
  usedStone: number;
  isSuccess: boolean;
  nextMonsterId: number;
  timestamp: number;
}

export interface MonsterReturned {
  hunter: string;
  monsterRank: RankType;
  isShadow: boolean;
  essenceStone: number;
  monsterIds: number[];
  monsterAmounts: number[];
  timestamp: number;
}

export interface MonsterReturnedBatch {
  hunter: string;
  essenceStone: number;
  returnedMonster: MonsterSet;
  timestamp: number;
}

/*
 *  SeasonSettlement
 */
export interface SetScoreRate {
  quest: number;
  activity: number;
  collecting: number;
  timestamp: number;
}

export interface SeasonRewardClaimed {
  seasonId: number;
  hunter: string;
  mintedSeasonScore: number;
  isSRankRewardTokenMinted: boolean;
  SRankRewardTokenId: number;
  timestamp: number;
}

/*
 *  SJWOffering
 */
export interface OfferingRemoved {
  offeringType: OfferingType;
  offeringId: number;
  timestamp: number;
}

export interface Minted {
  to: string;
  startTokenId: number;
  amount: number;
  timestamp: number;
}

export interface MintedBatch {
  accounts: string[];
  startTokenId: number;
  amounts: number[];
  timestamp: number;
}

export interface OwnershipClaimed {
  ownershipId: number;
  account: string;
  amount: number;
  timestamp: number;
}

export interface OwnershipDistributed {
  ownershipId: number;
  account: string;
  amount: number;
  timestamp: number;
}

export interface SetOwnershipAccount {
  ownershipId: number;
  beforeAccount: string;
  newAccount: string;
  timestamp: number;
}

/*
 *  SJWDistribution
 */
export interface OfferingDistributed {
  offeringType: OfferingType;
  offeringId: number;
  amount: BigNumber;
  distributedAccounts: string[];
  distributedAmounts: BigNumber[];
  timestamp: number;
}

/*
 *  Achievement
 */
export interface AchievementClaimed {
  achievementId: number;
  hunter: string;
  timestamp: number;
}

/*
 *  Shop
 */
export interface KeySold {
  buyer: string;
  to: string;
  keyRank: RankType;
  amount: number;
  price: BigNumber;
  timestamp: number;
}

export interface KeySoldBatch {
  buyer: string;
  to: string;
  keyRanks: RankType[];
  amounts: number[];
  price: BigNumber;
  timestamp: number;
}

export interface SetPriceMode {
  priceMode: PriceMode;
  timestamp: number;
}

export interface SetKeyPrice {
  priceMode: PriceMode;
  prices: number[];
  timestamp: number;
}

export interface SetSellPaused {
  paused: boolean;
  timestamp: number;
}

export interface Withdrawal {
  priceMode: PriceMode;
  to: string;
  amount: BigNumber;
  timestamp: number;
}

/*
 *  GateKey
 */
export interface KeyMinted {
  to: string;
  keyRank: RankType;
  amount: number;
  timestamp: number;
}

export interface KeyMintedBatch {
  to: string;
  keyRanks: RankType[];
  amounts: number[];
  timestamp: number;
}

/*
 *  MintController
 */
export interface ControllerAdded {
  controller: string;
  timestamp: number;
}

export interface ControllerRemoved {
  controller: string;
  timestamp: number;
}
