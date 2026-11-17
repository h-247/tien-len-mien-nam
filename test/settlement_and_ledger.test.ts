import { describe, it, expect } from 'vitest';
import { calculateSettlement, SeatRoundData } from '../lib/tienlen/penalties';
import { getCard } from '../lib/tienlen/cards';

describe('Settlement & Ledger Financial Correctness', () => {
  it('guarantees zero-sum balance change even with complex chops and penalties', () => {
    const stake = 50000;
    const seats: SeatRoundData[] = [
      {
        seatIndex: 0,
        userId: 'p1',
        displayName: 'Người chơi 1',
        isBot: false,
        currentBalance: 1500000,
        finishedPosition: 1, // Winner
        remainingCards: [],
        chopBonusAmount: 100000, // Chopped 2 red 2s (+100k)
        chopPenaltyAmount: 0,
      },
      {
        seatIndex: 1,
        userId: 'p2',
        displayName: 'Người chơi 2',
        isBot: false,
        currentBalance: 900000,
        finishedPosition: 2,
        remainingCards: [getCard('15_hearts')], // Thối 2 Cơ (1.0x stake = 50k)
        chopBonusAmount: 0,
        chopPenaltyAmount: 50000,
      },
      {
        seatIndex: 2,
        userId: 'p3',
        displayName: 'Người chơi 3',
        isBot: false,
        currentBalance: 700000,
        finishedPosition: 3,
        remainingCards: [getCard('15_spades'), getCard('15_clubs')], // Thối 2 heo đen (2 * 0.5x = 50k)
        chopBonusAmount: 0,
        chopPenaltyAmount: 50000,
      },
      {
        seatIndex: 3,
        userId: 'p4',
        displayName: 'Người chơi 4',
        isBot: false,
        currentBalance: 800000,
        finishedPosition: 4,
        remainingCards: [
          // Thối tứ quý 8 (1.5x stake = 75k)
          getCard('8_spades'),
          getCard('8_clubs'),
          getCard('8_diamonds'),
          getCard('8_hearts'),
        ],
        chopBonusAmount: 0,
        chopPenaltyAmount: 0,
      },
    ];

    const result = calculateSettlement(stake, seats);

    // Sum of netChanges across all 4 players must be EXACTLY 0 (Zero-Sum)
    const netSum = result.players.reduce((sum, p) => sum + p.netChange, 0);
    expect(netSum).toBe(0);

    // Winner gets positive payout
    const winner = result.players.find((p) => p.finishedPosition === 1)!;
    expect(winner.netChange).toBeGreaterThan(0);

    // Other players lose or pay penalties
    const p4 = result.players.find((p) => p.seatIndex === 3)!;
    expect(p4.netChange).toBeLessThan(0);
  });

  it('safeguards against negative balance (Solvency Cap) while preserving Zero-Sum', () => {
    const stake = 100000;
    // Player 4 only has 20.000 VND balance left
    const seats: SeatRoundData[] = [
      {
        seatIndex: 0,
        userId: 'p1',
        displayName: 'Winner',
        isBot: false,
        currentBalance: 1000000,
        finishedPosition: 1,
        remainingCards: [],
        chopBonusAmount: 0,
        chopPenaltyAmount: 0,
      },
      {
        seatIndex: 1,
        userId: 'p2',
        displayName: 'Second',
        isBot: false,
        currentBalance: 1000000,
        finishedPosition: 2,
        remainingCards: [],
        chopBonusAmount: 0,
        chopPenaltyAmount: 0,
      },
      {
        seatIndex: 2,
        userId: 'p3',
        displayName: 'Third',
        isBot: false,
        currentBalance: 1000000,
        finishedPosition: 3,
        remainingCards: [],
        chopBonusAmount: 0,
        chopPenaltyAmount: 0,
      },
      {
        seatIndex: 3,
        userId: 'p4',
        displayName: 'Near Zero Player',
        isBot: false,
        currentBalance: 20000, // Only 20k! Base 4th penalty is 200k
        finishedPosition: 4,
        remainingCards: [],
        chopBonusAmount: 0,
        chopPenaltyAmount: 0,
      },
    ];

    const result = calculateSettlement(stake, seats);

    // Player 4 balance after must NOT be negative
    const p4 = result.players.find((p) => p.seatIndex === 3)!;
    expect(p4.balanceAfter).toBeGreaterThanOrEqual(0);
    expect(p4.netChange).toBe(-20000); // Capped at available balance

    // Zero-sum must still hold exactly
    const netSum = result.players.reduce((sum, p) => sum + p.netChange, 0);
    expect(netSum).toBe(0);
  });
});
