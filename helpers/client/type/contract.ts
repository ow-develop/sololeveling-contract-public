import { RankType } from "../constant/contract";

/*
 *  DungeonGate
 */
export interface Gate {
  id: number;
  seasonId: number;
  startBlock: number;
  endBlock: number;
  usedBrokenStone: number;
  claimed: boolean;
  gateRank: RankType;
  hunter: string;
}

/*
 *  System
 */
export interface EssenceStoneAriseResult {
  shadowSignature: string;
  monsterSignature: string;
  isShadow: boolean;
  monsterId: number;
}

export interface BrokenStoneSmeltingResult {
  stoneSignature: string;
  stoneRank: number;
}

export interface ShadowMonsterSignature {
  shadowSignature: string;
  monsterSignature: string;
}
