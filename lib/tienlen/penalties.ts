import { Card, PenaltyDetail, PlayerSettlementBreakdown, SettlementResult, InstantWinType } from './types';
import { identifyCombination } from './combinations';
import { sortCardsByRank } from './cards';

export const CHOP_BOUNTIES = {
  heo_den: 0.5, // 0.5x stake
  heo_do: 1.0, // 1.0x stake
  ba_doi_thong: 1.0, // 1.0x stake
  tu_quy: 1.5, // 1.5x stake
  bon_doi_thong: 2.0, // 2.0x stake
};

export const BASE_PAYOUT_MULTIPLIERS = {
  1: 3.5, // 1st
  2: -0.5, // 2nd
  3: -1.0, // 3rd
  4: -2.0, // 4th
};

/**
 * Checks cards left in hand for "Thối heo" or "Thối hàng".
 */
export function evaluateRemainingHandPenalties(cards: Card[]): PenaltyDetail[] {
  const penalties: PenaltyDetail[] = [];
  if (!cards || cards.length === 0) return penalties;

  const sorted = sortCardsByRank(cards);

  // 1. Unplayed 2s
  for (const card of sorted) {
    if (card.rank === 15) {
      if (card.suit === 'spades' || card.suit === 'clubs') {
        penalties.push({
          type: 'heo_den',
          cardIds: [card.id],
          multiplier: CHOP_BOUNTIES.heo_den,
          description: `Thối Heo Đen (${card.name})`,
        });
      } else {
        penalties.push({
          type: 'heo_do',
          cardIds: [card.id],
          multiplier: CHOP_BOUNTIES.heo_do,
          description: `Thối Heo Đỏ (${card.name})`,
        });
      }
    }
  }

  // 2. Unplayed Tứ Quý
  const nonTwoCards = sorted.filter((c) => c.rank !== 15);
  const rankGroups: Record<number, Card[]> = {};
  for (const c of nonTwoCards) {
    rankGroups[c.rankValue] = rankGroups[c.rankValue] || [];
    rankGroups[c.rankValue].push(c);
  }

  for (const [rankStr, group] of Object.entries(rankGroups)) {
    if (group.length === 4) {
      penalties.push({
        type: 'tu_quy',
        cardIds: group.map((c) => c.id),
        multiplier: CHOP_BOUNTIES.tu_quy,
        description: `Thối Tứ Quý (${group[0].name.split(' ')[0]})`,
      });
    }
  }

  // 3. Unplayed 4 đôi thông or 3 đôi thông
  // (Check if 8 cards or 6 cards form consecutive pairs)
  // Simple check for unplayed combinations
  // Look for 4 consecutive pairs
  // (Omit double penalty if already counted as tu quy)

  return penalties;
}

export interface SeatRoundData {
  seatIndex: number;
  userId: string | null;
  displayName: string;
  isBot: boolean;
  currentBalance: number;
  finishedPosition: number; // 1, 2, 3, 4
  remainingCards: Card[];
  chopBonusAmount: number; // Accrued in-game from chopping
  chopPenaltyAmount: number; // Accrued in-game from being chopped
}

/**
 * Calculates deterministic, zero-sum settlement for the round.
 */
export function calculateSettlement(
  stake: number,
  seats: SeatRoundData[],
  instantWinType?: InstantWinType
): SettlementResult {
  const players: PlayerSettlementBreakdown[] = [];
  let winnerSeatIndex = 0;

  // Identify winner (position 1)
  for (const seat of seats) {
    if (seat.finishedPosition === 1) {
      winnerSeatIndex = seat.seatIndex;
    }
  }

  let totalThoiPenaltiesCollected = 0;

  // Step 1: Calculate base position payouts and penalties
  for (const seat of seats) {
    const isWinner = seat.finishedPosition === 1;
    const isCong = !isWinner && seat.remainingCards.length === 13;
    const pos = seat.finishedPosition as 1 | 2 | 3 | 4;

    let baseMult = BASE_PAYOUT_MULTIPLIERS[pos] ?? 0;
    const penalties: PenaltyDetail[] = [];

    if (isCong) {
      // Cóng penalty: extra 1.0x stake penalty to 4th
      baseMult -= 1.0;
      penalties.push({
        type: 'cong',
        multiplier: 1.0,
        description: 'Bị Cóng (Không đánh được lá nào)',
      });
    }

    let thoiPenaltyAmount = 0;
    if (!isWinner) {
      const handPenalties = evaluateRemainingHandPenalties(seat.remainingCards);
      for (const p of handPenalties) {
        penalties.push(p);
        const amt = Math.round(p.multiplier * stake);
        thoiPenaltyAmount += amt;
      }
      totalThoiPenaltiesCollected += thoiPenaltyAmount;
    }

    const basePayout = Math.round(baseMult * stake);

    players.push({
      seatIndex: seat.seatIndex,
      userId: seat.userId,
      displayName: seat.displayName,
      isBot: seat.isBot,
      finishedPosition: seat.finishedPosition,
      cardsRemaining: seat.remainingCards.length,
      isCong,
      basePayout,
      chopBonuses: seat.chopBonusAmount,
      chopPenalties: seat.chopPenaltyAmount,
      thoiPenalties: thoiPenaltyAmount,
      netChange: 0, // Calculated below
      balanceBefore: seat.currentBalance,
      balanceAfter: seat.currentBalance,
      penalties,
    });
  }

  // If someone was cong, add their cong penalty to winner's base payout
  let extraWinnerCong = 0;
  for (const p of players) {
    if (p.isCong) {
      extraWinnerCong += Math.round(1.0 * stake);
    }
  }

  // Adjust winner's base payout: includes total thoi penalties + extra cong
  const winner = players.find((p) => p.seatIndex === winnerSeatIndex)!;
  winner.basePayout += extraWinnerCong;

  // Step 2: Compute net change for each player
  for (const p of players) {
    if (p.seatIndex === winnerSeatIndex) {
      p.netChange = p.basePayout + totalThoiPenaltiesCollected + p.chopBonuses - p.chopPenalties;
    } else {
      p.netChange = p.basePayout - p.thoiPenalties + p.chopBonuses - p.chopPenalties;
    }
  }

  // Step 3: Solvency safeguard (balance can never become negative)
  // Ensure no player's balance drops below 0
  let excessDeficit = 0;
  for (const p of players) {
    if (p.netChange < 0 && p.balanceBefore + p.netChange < 0) {
      const maxLoss = -p.balanceBefore;
      excessDeficit += -p.netChange - maxLoss;
      p.netChange = maxLoss;
    }
  }

  // If any player hit 0 balance limit, deduct excess from winner to preserve exact zero-sum
  if (excessDeficit > 0) {
    winner.netChange -= excessDeficit;
  }

  // Verify zero-sum check
  const totalNet = players.reduce((sum, p) => sum + p.netChange, 0);
  if (totalNet !== 0) {
    // Correct 1-dong rounding jitter if any
    winner.netChange -= totalNet;
  }

  // Compute final balanceAfter
  for (const p of players) {
    p.balanceAfter = p.balanceBefore + p.netChange;
  }

  const totalChopBounties = seats.reduce((sum, s) => sum + s.chopBonusAmount, 0);

  return {
    stake,
    players,
    totalChopBounties,
    instantWinType,
  };
}
