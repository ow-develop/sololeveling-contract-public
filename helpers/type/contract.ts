import { RankType } from "../constant/contract";

/*
 *  SeasonQuest
 */
export interface QuestInput {
  seasonId: number;
  rewardScore: number;
  completableCount: number;
  requiredQuestId: number;
  rankType: RankType;
  hunterItemIds: number[];
}

export interface MonsterSet {
  normalMonsterIds: number[];
  normalMonsterAmounts: number[];
  shadowMonsterIds: number[];
  shadowMonsterAmounts: number[];
}
export interface Trait {
  traitTypeId: number;
  traitValueId: number;
}

export interface MonsterTrait {
  requiredNormalMonster: number;
  requiredShadowMonster: number;
  traits: Trait[];
}

/*
 *  DungeonGate
 */
export interface MonsterReward {
  monsterIds: number[];
  monsterAmounts: number[];
}

export interface SeasonPackReward {
  seasonPackIds: number[];
  seasonPackAmounts: number[];
}

/*
 *  System
 */
export interface UseMonster {
  monsterIds: number[];
  monsterAmounts: number[];
}

/*
 *  SeasonSettlement
 */
export interface SeasonScore {
  questScore: number;
  convertedQuestScore: number;
  activityScore: number;
  convertedActivityScore: number;
  collectingScore: number;
  convertedCollectingScore: number;
  seasonScore: number;
}

/*
 *  Achievement
 */
export interface Collection {
  collectionId: number;
  tokenIds: number[];
  amounts: number[];
}

export interface CollectionSet {
  collections: Collection[];
}
