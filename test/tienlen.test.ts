import { describe, it, expect } from 'vitest';
import {
  getCard,
  compareCards,
  sortCardsByRank,
  shuffleDeck,
} from '../lib/tienlen/cards';
import {
  identifyCombination,
  compareCombinations,
  checkStraight,
  checkConsecutivePairs,
  checkInstantWin,
} from '../lib/tienlen/combinations';
import {
  initializeRound,
  executePlay,
  executePass,
  SeatInfo,
} from '../lib/tienlen/engine';
import {
  calculateSettlement,
  SeatRoundData,
} from '../lib/tienlen/penalties';

describe('Tiến Lên Miền Nam - Card Rankings & Suits', () => {
  it('ranks 3 lower than 4 and 2 highest', () => {
    const card3S = getCard('3_spades');
    const card3H = getCard('3_hearts');
    const card4S = getCard('4_spades');
    const card2S = getCard('15_spades');
    const card2H = getCard('15_hearts');

    expect(compareCards(card3S, card4S)).toBeLessThan(0);
    expect(compareCards(card3S, card3H)).toBeLessThan(0); // Spades < Hearts
    expect(compareCards(card4S, card2S)).toBeLessThan(0); // 4 < 2
    expect(compareCards(card2S, card2H)).toBeLessThan(0); // 2 Spades < 2 Hearts
  });

  it('correctly ranks the standard suit hierarchy: Bích < Chuồn < Rô < Cơ', () => {
    const s = getCard('10_spades');
    const c = getCard('10_clubs');
    const d = getCard('10_diamonds');
    const h = getCard('10_hearts');

    expect(compareCards(s, c)).toBeLessThan(0);
    expect(compareCards(c, d)).toBeLessThan(0);
    expect(compareCards(d, h)).toBeLessThan(0);
  });
});

describe('Tiến Lên Miền Nam - Combination Identification', () => {
  it('identifies singles, pairs, and triples', () => {
    const single = identifyCombination([getCard('5_spades')]);
    expect(single?.type).toBe('single');

    const pair = identifyCombination([getCard('7_spades'), getCard('7_diamonds')]);
    expect(pair?.type).toBe('pair');

    const triple = identifyCombination([
      getCard('9_spades'),
      getCard('9_clubs'),
      getCard('9_hearts'),
    ]);
    expect(triple?.type).toBe('triple');
  });

  it('identifies valid straights and rejects straights containing 2', () => {
    const validStraight = identifyCombination([
      getCard('3_spades'),
      getCard('4_diamonds'),
      getCard('5_hearts'),
    ]);
    expect(validStraight?.type).toBe('straight');

    const aceStraight = identifyCombination([
      getCard('10_spades'),
      getCard('11_clubs'),
      getCard('12_diamonds'),
      getCard('13_hearts'),
      getCard('14_spades'),
    ]);
    expect(aceStraight?.type).toBe('straight');

    // Straight with 2 is STRICTLY INVALID in Tiến Lên Miền Nam
    const invalidTwoStraight = identifyCombination([
      getCard('13_hearts'),
      getCard('14_spades'),
      getCard('15_spades'),
    ]);
    expect(invalidTwoStraight).toBeNull();
  });

  it('identifies four of a kind (tứ quý)', () => {
    const tuQuy = identifyCombination([
      getCard('8_spades'),
      getCard('8_clubs'),
      getCard('8_diamonds'),
      getCard('8_hearts'),
    ]);
    expect(tuQuy?.type).toBe('four_of_a_kind');
  });

  it('identifies 3 consecutive pairs (ba đôi thông)', () => {
    const threePairs = identifyCombination([
      getCard('4_spades'),
      getCard('4_diamonds'),
      getCard('5_clubs'),
      getCard('5_hearts'),
      getCard('6_spades'),
      getCard('6_hearts'),
    ]);
    expect(threePairs?.type).toBe('three_pairs');
  });

  it('identifies 4 consecutive pairs (bốn đôi thông)', () => {
    const fourPairs = identifyCombination([
      getCard('7_spades'),
      getCard('7_clubs'),
      getCard('8_diamonds'),
      getCard('8_hearts'),
      getCard('9_spades'),
      getCard('9_hearts'),
      getCard('10_clubs'),
      getCard('10_diamonds'),
    ]);
    expect(fourPairs?.type).toBe('four_pairs');
  });
});

describe('Tiến Lên Miền Nam - Chopping Rules (Chặt Heo & Chặt Hàng)', () => {
  it('allows Ba Đôi Thông to chop a single 2', () => {
    const single2 = identifyCombination([getCard('15_spades')])!;
    const threePairs = identifyCombination([
      getCard('4_spades'),
      getCard('4_clubs'),
      getCard('5_spades'),
      getCard('5_clubs'),
      getCard('6_spades'),
      getCard('6_clubs'),
    ])!;

    const result = compareCombinations(threePairs, single2);
    expect(result.valid).toBe(true);
    expect(result.isChop).toBe(true);
  });

  it('allows Tứ Quý to chop a single 2 and smaller Tứ Quý', () => {
    const single2 = identifyCombination([getCard('15_hearts')])!;
    const tuQuy8 = identifyCombination([
      getCard('8_spades'),
      getCard('8_clubs'),
      getCard('8_diamonds'),
      getCard('8_hearts'),
    ])!;
    const tuQuy9 = identifyCombination([
      getCard('9_spades'),
      getCard('9_clubs'),
      getCard('9_diamonds'),
      getCard('9_hearts'),
    ])!;

    expect(compareCombinations(tuQuy8, single2).valid).toBe(true);
    expect(compareCombinations(tuQuy9, tuQuy8).valid).toBe(true);
    expect(compareCombinations(tuQuy8, tuQuy9).valid).toBe(false);
  });

  it('allows Bốn Đôi Thông to chop pair of 2s and Tứ Quý', () => {
    const pairOf2s = identifyCombination([getCard('15_spades'), getCard('15_hearts')])!;
    const fourPairs = identifyCombination([
      getCard('3_spades'),
      getCard('3_clubs'),
      getCard('4_spades'),
      getCard('4_clubs'),
      getCard('5_spades'),
      getCard('5_clubs'),
      getCard('6_spades'),
      getCard('6_clubs'),
    ])!;
    const tuQuyK = identifyCombination([
      getCard('13_spades'),
      getCard('13_clubs'),
      getCard('13_diamonds'),
      getCard('13_hearts'),
    ])!;

    expect(compareCombinations(fourPairs, pairOf2s).valid).toBe(true);
    expect(compareCombinations(fourPairs, tuQuyK).valid).toBe(true);
  });
});

describe('Tiến Lên Miền Nam - Tới Trắng (Instant Win)', () => {
  it('detects Tứ Quý 2 as instant win', () => {
    // 4 twos + 9 random other cards
    const cards = [
      getCard('15_spades'),
      getCard('15_clubs'),
      getCard('15_diamonds'),
      getCard('15_hearts'),
      getCard('3_spades'),
      getCard('4_spades'),
      getCard('5_spades'),
      getCard('6_spades'),
      getCard('7_spades'),
      getCard('8_spades'),
      getCard('9_spades'),
      getCard('10_spades'),
      getCard('11_spades'),
    ];
    expect(checkInstantWin(cards)).toBe('four_twos');
  });

  it('detects 6 pairs (lục phé bôn) as instant win', () => {
    const cards = [
      getCard('3_spades'),
      getCard('3_clubs'),
      getCard('5_spades'),
      getCard('5_clubs'),
      getCard('7_spades'),
      getCard('7_clubs'),
      getCard('9_spades'),
      getCard('9_clubs'),
      getCard('11_spades'),
      getCard('11_clubs'),
      getCard('13_spades'),
      getCard('13_clubs'),
      getCard('10_hearts'),
    ];
    expect(checkInstantWin(cards)).toBe('six_pairs');
  });

  it('detects 5 consecutive pairs (5 đôi thông) as instant win', () => {
    const cards = [
      getCard('3_spades'),
      getCard('3_clubs'),
      getCard('4_spades'),
      getCard('4_clubs'),
      getCard('5_spades'),
      getCard('5_clubs'),
      getCard('6_spades'),
      getCard('6_clubs'),
      getCard('7_spades'),
      getCard('7_clubs'),
      getCard('10_spades'),
      getCard('12_clubs'),
      getCard('14_hearts'),
    ];
    expect(checkInstantWin(cards)).toBe('five_pairs');
  });
});

describe('Tiến Lên Miền Nam - Engine Game Flow', () => {
  const seats: SeatInfo[] = [
    { seatIndex: 0, userId: 'u1', displayName: 'Người chơi 1', isBot: false },
    { seatIndex: 1, userId: null, displayName: 'Bot Alpha', isBot: true, botDifficulty: 'medium' },
    { seatIndex: 2, userId: null, displayName: 'Bot Beta', isBot: true, botDifficulty: 'medium' },
    { seatIndex: 3, userId: null, displayName: 'Bot Gamma', isBot: true, botDifficulty: 'medium' },
  ];

  it('enforces 3 of spades on the opening play of round 1', () => {
    const round = initializeRound('r1', 'room1', 1, 10000, seats, undefined, 42);
    const firstSeat = round.firstPlayerSeat;

    expect(round.hands[firstSeat].cards).toContain('3_spades');
    expect(round.currentTurnSeat).toBe(firstSeat);

    // Try playing a card that is NOT 3 of spades
    const otherCard = round.hands[firstSeat].cards.find((c) => c !== '3_spades')!;
    const failPlay = executePlay(round, firstSeat, [otherCard], seats);
    expect(failPlay.success).toBe(false);
    expect(failPlay.error).toContain('3 Bích');

    // Playing 3 of spades succeeds
    const okPlay = executePlay(round, firstSeat, ['3_spades'], seats);
    expect(okPlay.success).toBe(true);
    expect(round.lastPlayCards).toEqual(['3_spades']);
  });

  it('handles passes and advances tricks correctly', () => {
    const round = initializeRound('r2', 'room1', 2, 10000, seats, 0, 100);
    // Give Seat 0 a clean pair to lead
    round.hands[0].cards = ['4_spades', '4_clubs', '7_hearts'];
    round.hands[1].cards = ['5_spades', '5_clubs'];
    round.hands[2].cards = ['6_spades', '6_clubs'];
    round.hands[3].cards = ['8_spades', '8_clubs'];
    round.currentTurnSeat = 0;
    round.mustIncludeCardId = null;

    // Seat 0 plays pair 4
    executePlay(round, 0, ['4_spades', '4_clubs'], seats);
    expect(round.currentTurnSeat).toBe(1);

    // Seat 1 passes
    executePass(round, 1, seats);
    expect(round.currentTurnSeat).toBe(2);

    // Seat 2 passes
    executePass(round, 2, seats);
    expect(round.currentTurnSeat).toBe(3);

    // Seat 3 passes -> Trick ends, Seat 0 gets to lead new trick
    executePass(round, 3, seats);
    expect(round.lastPlayCards).toBeNull();
    expect(round.currentTurnSeat).toBe(0);
  });
});

describe('Tiến Lên Miền Nam - Zero-Sum Settlement Invariant', () => {
  it('guarantees that total net balance changes sum to exactly 0 (Zero-Sum)', () => {
    const stake = 20000;
    const testSeats: SeatRoundData[] = [
      {
        seatIndex: 0,
        userId: 'u1',
        displayName: 'A',
        isBot: false,
        currentBalance: 1000000,
        finishedPosition: 1, // Winner
        remainingCards: [],
        chopBonusAmount: 20000,
        chopPenaltyAmount: 0,
      },
      {
        seatIndex: 1,
        userId: 'u2',
        displayName: 'B',
        isBot: false,
        currentBalance: 800000,
        finishedPosition: 2,
        remainingCards: [getCard('10_spades'), getCard('15_spades')], // Thối 1 heo đen
        chopBonusAmount: 0,
        chopPenaltyAmount: 20000,
      },
      {
        seatIndex: 2,
        userId: 'u3',
        displayName: 'C',
        isBot: false,
        currentBalance: 500000,
        finishedPosition: 3,
        remainingCards: [getCard('7_spades'), getCard('15_hearts')], // Thối 1 heo đỏ
        chopBonusAmount: 0,
        chopPenaltyAmount: 0,
      },
      {
        seatIndex: 3,
        userId: 'u4',
        displayName: 'D',
        isBot: false,
        currentBalance: 900000,
        finishedPosition: 4,
        remainingCards: [getCard('3_spades')],
        chopBonusAmount: 0,
        chopPenaltyAmount: 0,
      },
    ];

    const settlement = calculateSettlement(stake, testSeats);
    const sumNet = settlement.players.reduce((sum, p) => sum + p.netChange, 0);

    expect(sumNet).toBe(0);
    expect(settlement.players[0].netChange).toBeGreaterThan(0); // Winner gained
    expect(settlement.players[3].netChange).toBeLessThan(0); // 4th lost
  });
});
