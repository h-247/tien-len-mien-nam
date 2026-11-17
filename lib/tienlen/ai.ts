import { Card, Combination, Rank } from './types';
import { identifyCombination, compareCombinations } from './combinations';
import { sortCardsByRank, compareCards } from './cards';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Finds all valid playable combinations from a hand that can beat the current trick.
 * If currentTrick is null, finds all valid opening combinations.
 */
export function generateLegalMoves(
  hand: Card[],
  currentTrick: Combination | null,
  mustIncludeCardId?: string // e.g. for first play must include 3_spades
): Card[][] {
  const sorted = sortCardsByRank(hand);
  const legalMoves: Card[][] = [];

  // Helper to test if a candidate combo is valid and legal
  const testAndAdd = (cards: Card[]) => {
    if (mustIncludeCardId && !cards.some((c) => c.id === mustIncludeCardId)) {
      return;
    }
    const combo = identifyCombination(cards);
    if (!combo) return;

    if (!currentTrick) {
      legalMoves.push(cards);
    } else {
      const cmp = compareCombinations(combo, currentTrick);
      if (cmp.valid) {
        legalMoves.push(cards);
      }
    }
  };

  // 1. Single cards
  for (const c of sorted) {
    testAndAdd([c]);
  }

  // 2. Pairs
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[i].rank === sorted[j].rank) {
        testAndAdd([sorted[i], sorted[j]]);
      }
    }
  }

  // 3. Triples
  for (let i = 0; i < sorted.length - 2; i++) {
    for (let j = i + 1; j < sorted.length - 1; j++) {
      for (let k = j + 1; k < sorted.length; k++) {
        if (sorted[i].rank === sorted[j].rank && sorted[j].rank === sorted[k].rank) {
          testAndAdd([sorted[i], sorted[j], sorted[k]]);
        }
      }
    }
  }

  // 4. Four of a kind (Tứ quý)
  for (let i = 0; i < sorted.length - 3; i++) {
    const group = sorted.filter((c) => c.rank === sorted[i].rank);
    if (group.length === 4) {
      testAndAdd(group);
      i += 3;
    }
  }

  // 5. Straights (Length 3 to 12)
  // Group cards by rank (only 1 card per rank to form candidate straights)
  const rankMap = new Map<number, Card[]>();
  for (const c of sorted) {
    if (c.rank !== 15) {
      // 2 is not in straights
      const list = rankMap.get(c.rankValue) || [];
      list.push(c);
      rankMap.set(c.rankValue, list);
    }
  }

  const distinctRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
  for (let start = 0; start < distinctRanks.length; start++) {
    for (let len = 3; len <= distinctRanks.length - start; len++) {
      let isConsec = true;
      for (let k = 1; k < len; k++) {
        if (distinctRanks[start + k] !== distinctRanks[start + k - 1] + 1) {
          isConsec = false;
          break;
        }
      }
      if (isConsec) {
        // Collect combinations of cards for this straight
        // Pick lowest suit for testing
        const straightCards = [];
        for (let k = 0; k < len; k++) {
          const r = distinctRanks[start + k];
          straightCards.push(rankMap.get(r)![0]);
        }
        testAndAdd(straightCards);

        // Also test highest suit for this straight
        const highStraightCards = [];
        for (let k = 0; k < len; k++) {
          const r = distinctRanks[start + k];
          const cardsForRank = rankMap.get(r)!;
          highStraightCards.push(cardsForRank[cardsForRank.length - 1]);
        }
        testAndAdd(highStraightCards);
      }
    }
  }

  // 6. Three consecutive pairs (Ba đôi thông)
  // Extract pairs
  const pairs: Card[][] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rank === sorted[i + 1].rank && sorted[i].rank !== 15) {
      pairs.push([sorted[i], sorted[i + 1]]);
      i++;
    }
  }

  if (pairs.length >= 3) {
    for (let i = 0; i <= pairs.length - 3; i++) {
      if (
        pairs[i + 1][0].rankValue === pairs[i][0].rankValue + 1 &&
        pairs[i + 2][0].rankValue === pairs[i + 1][0].rankValue + 1
      ) {
        testAndAdd([...pairs[i], ...pairs[i + 1], ...pairs[i + 2]]);
      }
    }
  }

  // 7. Four consecutive pairs (Bốn đôi thông)
  if (pairs.length >= 4) {
    for (let i = 0; i <= pairs.length - 4; i++) {
      if (
        pairs[i + 1][0].rankValue === pairs[i][0].rankValue + 1 &&
        pairs[i + 2][0].rankValue === pairs[i + 1][0].rankValue + 1 &&
        pairs[i + 3][0].rankValue === pairs[i + 2][0].rankValue + 1
      ) {
        testAndAdd([...pairs[i], ...pairs[i + 1], ...pairs[i + 2], ...pairs[i + 3]]);
      }
    }
  }

  return legalMoves;
}

/**
 * Chooses the best move for a bot based on difficulty.
 * Returns Card[] to play, or null to PASS.
 */
export function chooseBotMove(
  hand: Card[],
  currentTrick: Combination | null,
  difficulty: BotDifficulty = 'medium',
  mustIncludeCardId?: string,
  minOpponentCardCount = 13
): Card[] | null {
  const legalMoves = generateLegalMoves(hand, currentTrick, mustIncludeCardId);

  // If no legal moves, must pass
  if (legalMoves.length === 0) {
    return null;
  }

  // Leading the trick (currentTrick is null)
  if (!currentTrick) {
    return chooseOpeningMove(hand, legalMoves, difficulty);
  }

  // Following an existing trick
  switch (difficulty) {
    case 'easy': {
      // 30% chance of passing if not forced
      if (Math.random() < 0.3) {
        return null;
      }
      // Pick random legal move
      const idx = Math.floor(Math.random() * legalMoves.length);
      return legalMoves[idx];
    }

    case 'medium': {
      // Sort legal moves by lowest highestCard
      const sortedMoves = [...legalMoves].sort((a, b) => {
        const comboA = identifyCombination(a)!;
        const comboB = identifyCombination(b)!;
        return compareCards(comboA.highestCard, comboB.highestCard);
      });

      // Medium bot avoids playing a 2 early unless necessary or winning
      if (hand.length > 4) {
        const nonTwoMoves = sortedMoves.filter((m) => !m.some((c) => c.rank === 15));
        if (nonTwoMoves.length > 0) {
          return nonTwoMoves[0];
        }
        // If only 2s are available, 50% chance of passing to save 2
        if (Math.random() < 0.5) {
          return null;
        }
      }

      return sortedMoves[0];
    }

    case 'hard': {
      // Hard bot: analyzes game state
      const sortedMoves = [...legalMoves].sort((a, b) => {
        const comboA = identifyCombination(a)!;
        const comboB = identifyCombination(b)!;
        return compareCards(comboA.highestCard, comboB.highestCard);
      });

      // If an opponent has very few cards (e.g. <= 2), block them aggressively with high cards!
      if (minOpponentCardCount <= 2) {
        return sortedMoves[sortedMoves.length - 1]; // Play highest to retain lead
      }

      // If we can finish the game in 1 move, play it!
      const winningMove = sortedMoves.find((m) => m.length === hand.length);
      if (winningMove) {
        return winningMove;
      }

      // If chop opportunity
      const chopMove = sortedMoves.find((m) => {
        const combo = identifyCombination(m)!;
        return (
          combo.type === 'three_pairs' ||
          combo.type === 'four_of_a_kind' ||
          combo.type === 'four_pairs'
        );
      });
      if (chopMove && currentTrick.highestCard.rank === 15) {
        return chopMove; // Chop the heo!
      }

      // Otherwise play the most efficient lowest winning move without wasting 2s
      if (hand.length > 3) {
        const nonTwoMoves = sortedMoves.filter((m) => !m.some((c) => c.rank === 15));
        if (nonTwoMoves.length > 0) {
          return nonTwoMoves[0];
        }
      }

      return sortedMoves[0];
    }
  }
}

function chooseOpeningMove(
  hand: Card[],
  legalMoves: Card[][],
  difficulty: BotDifficulty
): Card[] {
  // If we can finish immediately
  const finishMove = legalMoves.find((m) => m.length === hand.length);
  if (finishMove) return finishMove;

  // Easy bot: picks random move
  if (difficulty === 'easy') {
    const idx = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[idx];
  }

  // Medium / Hard bot:
  // Prefer leading with straights or pairs first to shed cards, then small singles
  const straights = legalMoves.filter((m) => identifyCombination(m)?.type === 'straight');
  if (straights.length > 0) {
    // Pick longest or lowest straight
    straights.sort((a, b) => b.length - a.length);
    return straights[0];
  }

  const pairs = legalMoves.filter((m) => identifyCombination(m)?.type === 'pair');
  if (pairs.length > 0) {
    // Pick lowest pair
    pairs.sort((a, b) => {
      const ca = identifyCombination(a)!;
      const cb = identifyCombination(b)!;
      return compareCards(ca.highestCard, cb.highestCard);
    });
    return pairs[0];
  }

  // Singles: pick lowest single
  const singles = legalMoves.filter((m) => m.length === 1);
  if (singles.length > 0) {
    singles.sort((a, b) => compareCards(a[0], b[0]));
    return singles[0];
  }

  return legalMoves[0];
}
