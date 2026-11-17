export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';
// Vietnamese: Bích (♠), Chuồn/Tép (♣), Rô (♦), Cơ (♥)

export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
// 11 = J, 12 = Q, 13 = K, 14 = A, 15 = 2

export interface Card {
  id: string; // e.g. "3_spades", "14_hearts"
  rank: Rank;
  suit: Suit;
  suitValue: number; // 0: spades, 1: clubs, 2: diamonds, 3: hearts
  rankValue: number; // 3..15
  name: string; // e.g. "3 Bích", "A Cơ", "2 Chuồn"
  color: 'black' | 'red';
}

export type CombinationType =
  | 'single' // Lá rác (1 lá)
  | 'pair' // Đôi (2 lá cùng số)
  | 'triple' // Sám cô (3 lá cùng số)
  | 'straight' // Sảnh (3..12 lá liên tiếp, không có 2)
  | 'four_of_a_kind' // Tứ quý (4 lá cùng số)
  | 'three_pairs' // Ba đôi thông (3 đôi liên tiếp)
  | 'four_pairs'; // Bốn đôi thông (4 đôi liên tiếp)

export type InstantWinType =
  | 'dragon_straight' // Sảnh rồng (3 đến A hoặc 3 đến 2)
  | 'six_pairs' // Lục phé bôn (6 đôi)
  | 'five_pairs' // Năm đôi thông (5 đôi liên tiếp)
  | 'four_twos' // Tứ quý 2 (4 con heo)
  | 'same_color'; // Đồng hoa (13 lá cùng đỏ hoặc cùng đen)

export interface Combination {
  type: CombinationType;
  cards: Card[];
  highestCard: Card;
  rank?: Rank;
  length: number;
}

export interface PlayValidationResult {
  valid: boolean;
  error?: string;
  combination?: Combination;
  isChop?: boolean;
  choppedType?: string;
  chopBounty?: number; // Multiple of stake or VND
}

export interface PenaltyDetail {
  type: 'heo_den' | 'heo_do' | 'ba_doi_thong' | 'tu_quy' | 'bon_doi_thong' | 'cong';
  cardIds?: string[];
  multiplier: number; // Multiplier of base stake
  description: string;
}

export interface PlayerSettlementBreakdown {
  seatIndex: number;
  userId: string | null;
  displayName: string;
  isBot: boolean;
  finishedPosition: number; // 1, 2, 3, 4
  cardsRemaining: number;
  isCong: boolean;
  basePayout: number; // Positive or negative
  chopBonuses: number;
  chopPenalties: number;
  thoiPenalties: number;
  netChange: number; // Must sum to 0 across all 4 seats
  balanceBefore: number;
  balanceAfter: number;
  penalties: PenaltyDetail[];
}

export interface SettlementResult {
  stake: number;
  players: PlayerSettlementBreakdown[];
  totalChopBounties: number;
  instantWinType?: InstantWinType;
}
