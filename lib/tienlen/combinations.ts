import { Card, Combination, CombinationType, InstantWinType, PlayValidationResult, Rank } from './types';
import { compareCards, sortCardsByRank } from './cards';

/**
 * Identifies if a given array of cards forms a valid Tiến Lên Miền Nam combination.
 * Returns Combination metadata or null if invalid.
 */
export function identifyCombination(cards: Card[]): Combination | null {
  if (!cards || cards.length === 0) return null;

  const sorted = sortCardsByRank(cards);
  const n = sorted.length;
  const highestCard = sorted[n - 1];

  // 1. Single (Lá rác)
  if (n === 1) {
    return {
      type: 'single',
      cards: sorted,
      highestCard: sorted[0],
      rank: sorted[0].rank,
      length: 1,
    };
  }

  // 2. Pair (Đôi)
  if (n === 2) {
    if (sorted[0].rank === sorted[1].rank) {
      return {
        type: 'pair',
        cards: sorted,
        highestCard,
        rank: sorted[0].rank,
        length: 2,
      };
    }
    return null;
  }

  // 3. Triple / Three of a kind (Sám cô)
  if (n === 3) {
    if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
      return {
        type: 'triple',
        cards: sorted,
        highestCard,
        rank: sorted[0].rank,
        length: 3,
      };
    }
  }

  // 4. Four of a kind (Tứ quý)
  if (n === 4) {
    if (
      sorted[0].rank === sorted[1].rank &&
      sorted[1].rank === sorted[2].rank &&
      sorted[2].rank === sorted[3].rank
    ) {
      return {
        type: 'four_of_a_kind',
        cards: sorted,
        highestCard,
        rank: sorted[0].rank,
        length: 4,
      };
    }
  }

  // 5. Three consecutive pairs (Ba đôi thông - 6 cards)
  if (n === 6) {
    const isThreePairs = checkConsecutivePairs(sorted, 3);
    if (isThreePairs) {
      return {
        type: 'three_pairs',
        cards: sorted,
        highestCard,
        length: 6,
      };
    }
  }

  // 6. Four consecutive pairs (Bốn đôi thông - 8 cards)
  if (n === 8) {
    const isFourPairs = checkConsecutivePairs(sorted, 4);
    if (isFourPairs) {
      return {
        type: 'four_pairs',
        cards: sorted,
        highestCard,
        length: 8,
      };
    }
  }

  // 7. Straight (Sảnh - 3 to 12 cards, rank 2 is NEVER in a straight)
  if (n >= 3 && n <= 12) {
    const isStraight = checkStraight(sorted);
    if (isStraight) {
      return {
        type: 'straight',
        cards: sorted,
        highestCard,
        length: n,
      };
    }
  }

  return null;
}

/**
 * Checks if cards form a valid straight.
 * In Tiến Lên Miền Nam:
 * - Cards must have strictly consecutive ranks.
 * - Rank 2 (15) cannot be part of any straight!
 */
export function checkStraight(sortedCards: Card[]): boolean {
  if (sortedCards.length < 3 || sortedCards.length > 12) return false;

  for (let i = 0; i < sortedCards.length; i++) {
    // 2 (rank 15) is never allowed in a straight
    if (sortedCards[i].rank === 15) return false;

    if (i > 0) {
      if (sortedCards[i].rankValue !== sortedCards[i - 1].rankValue + 1) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks if cards form k consecutive pairs (e.g. 3 pairs = 6 cards, 4 pairs = 8 cards)
 * In Tiến Lên Miền Nam: Rank 2 (15) cannot be in consecutive pairs!
 */
export function checkConsecutivePairs(sortedCards: Card[], numPairs: number): boolean {
  if (sortedCards.length !== numPairs * 2) return false;

  for (let p = 0; p < numPairs; p++) {
    const c1 = sortedCards[p * 2];
    const c2 = sortedCards[p * 2 + 1];

    // Must be a pair of same rank
    if (c1.rank !== c2.rank) return false;
    // Rank 2 is not allowed in đôi thông
    if (c1.rank === 15) return false;

    // Pairs must be strictly consecutive
    if (p > 0) {
      const prevC = sortedCards[(p - 1) * 2];
      if (c1.rankValue !== prevC.rankValue + 1) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Compares played combination against current trick combination.
 * Standard rules:
 * - Same type & same length: beat by highestCard.
 * Special chopping rules (Chặt):
 * - Single 2 (Heo): chopped by 3 pairs, four of a kind, or 4 pairs.
 * - Pair of 2 (Đôi heo): chopped by 4 pairs.
 * - 3 pairs: chopped by higher 3 pairs, four of a kind, or 4 pairs.
 * - Four of a kind: chopped by higher four of a kind, or 4 pairs.
 * - 4 pairs: chopped by higher 4 pairs.
 */
export function compareCombinations(
  newCombo: Combination,
  prevCombo: Combination
): PlayValidationResult {
  // Case A: Same combination type and length
  if (newCombo.type === prevCombo.type && newCombo.length === prevCombo.length) {
    if (compareCards(newCombo.highestCard, prevCombo.highestCard) > 0) {
      // If beating an existing hàng with higher hàng, it's a chop/đè
      const isChop =
        prevCombo.type === 'four_of_a_kind' ||
        prevCombo.type === 'three_pairs' ||
        prevCombo.type === 'four_pairs';

      return {
        valid: true,
        combination: newCombo,
        isChop,
        choppedType: isChop ? prevCombo.type : undefined,
      };
    } else {
      return {
        valid: false,
        error: 'Tổ hợp đánh ra không lớn hơn tổ hợp trên bàn.',
      };
    }
  }

  // Case B: Special chopping (Chặt heo / Chặt hàng)

  // 1. Chặt Heo đơn (Single 2)
  if (prevCombo.type === 'single' && prevCombo.highestCard.rank === 15) {
    if (
      newCombo.type === 'three_pairs' ||
      newCombo.type === 'four_of_a_kind' ||
      newCombo.type === 'four_pairs'
    ) {
      return {
        valid: true,
        combination: newCombo,
        isChop: true,
        choppedType: 'single_2',
      };
    }
  }

  // 2. Chặt Đôi Heo (Pair of 2s)
  if (prevCombo.type === 'pair' && prevCombo.highestCard.rank === 15) {
    if (newCombo.type === 'four_pairs') {
      return {
        valid: true,
        combination: newCombo,
        isChop: true,
        choppedType: 'pair_2',
      };
    }
  }

  // 3. Chặt Ba Đôi Thông (Three consecutive pairs)
  if (prevCombo.type === 'three_pairs') {
    if (newCombo.type === 'four_of_a_kind' || newCombo.type === 'four_pairs') {
      return {
        valid: true,
        combination: newCombo,
        isChop: true,
        choppedType: 'three_pairs',
      };
    }
  }

  // 4. Chặt Tứ Quý (Four of a kind)
  if (prevCombo.type === 'four_of_a_kind') {
    if (newCombo.type === 'four_pairs') {
      return {
        valid: true,
        combination: newCombo,
        isChop: true,
        choppedType: 'four_of_a_kind',
      };
    }
  }

  return {
    valid: false,
    error: `Không thể đánh ${getComboNameVi(newCombo.type)} để đè ${getComboNameVi(prevCombo.type)}.`,
  };
}

export function getComboNameVi(type: CombinationType): string {
  switch (type) {
    case 'single':
      return 'Lá rác';
    case 'pair':
      return 'Đôi';
    case 'triple':
      return 'Sám cô';
    case 'straight':
      return 'Sảnh';
    case 'four_of_a_kind':
      return 'Tứ quý';
    case 'three_pairs':
      return 'Ba đôi thông';
    case 'four_pairs':
      return 'Bốn đôi thông';
    default:
      return 'Tổ hợp';
  }
}

/**
 * Checks for instant win (Tới trắng) when cards are initially dealt (13 cards).
 */
export function checkInstantWin(cards: Card[]): InstantWinType | null {
  if (cards.length !== 13) return null;

  const sorted = sortCardsByRank(cards);

  // 1. Tứ quý 2 (Four 2s)
  const twos = sorted.filter((c) => c.rank === 15);
  if (twos.length === 4) {
    return 'four_twos';
  }

  // 2. Sảnh rồng (Dragon straight: 3 to A is 12 consecutive, or 3 to 2 is 13 cards)
  const uniqueRanks = Array.from(new Set(sorted.map((c) => c.rankValue))).sort((a, b) => a - b);
  if (uniqueRanks.length === 12 && uniqueRanks[0] === 3 && uniqueRanks[11] === 14) {
    return 'dragon_straight';
  }
  if (uniqueRanks.length === 13 && uniqueRanks[0] === 3 && uniqueRanks[12] === 15) {
    return 'dragon_straight';
  }

  // 3. Năm đôi thông (5 consecutive pairs)
  // Check any 5 consecutive pairs
  if (hasConsecutivePairs(sorted, 5)) {
    return 'five_pairs';
  }

  // 4. Lục phé bôn (6 pairs)
  // Count pairs: group by rank
  const rankCounts: Record<number, number> = {};
  for (const c of sorted) {
    rankCounts[c.rankValue] = (rankCounts[c.rankValue] || 0) + 1;
  }
  let totalPairs = 0;
  for (const count of Object.values(rankCounts)) {
    totalPairs += Math.floor(count / 2);
  }
  if (totalPairs >= 6) {
    return 'six_pairs';
  }

  // 5. Đồng hoa (13 cards all red or all black)
  const redCount = sorted.filter((c) => c.color === 'red').length;
  if (redCount === 13 || redCount === 0) {
    return 'same_color';
  }

  return null;
}

function hasConsecutivePairs(sortedCards: Card[], numPairs: number): boolean {
  // Extract all pairs
  const pairsByRank: Map<number, Card[]> = new Map();
  for (let i = 0; i < sortedCards.length - 1; i++) {
    if (sortedCards[i].rank === sortedCards[i + 1].rank && sortedCards[i].rank !== 15) {
      if (!pairsByRank.has(sortedCards[i].rankValue)) {
        pairsByRank.set(sortedCards[i].rankValue, [sortedCards[i], sortedCards[i + 1]]);
        i++; // skip pair
      }
    }
  }

  const sortedPairRanks = Array.from(pairsByRank.keys()).sort((a, b) => a - b);
  if (sortedPairRanks.length < numPairs) return false;

  let consecutiveCount = 1;
  for (let i = 1; i < sortedPairRanks.length; i++) {
    if (sortedPairRanks[i] === sortedPairRanks[i - 1] + 1) {
      consecutiveCount++;
      if (consecutiveCount >= numPairs) return true;
    } else {
      consecutiveCount = 1;
    }
  }

  return false;
}
