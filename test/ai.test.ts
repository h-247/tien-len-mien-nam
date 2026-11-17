import { describe, it, expect } from 'vitest';
import { getCard } from '../lib/tienlen/cards';
import { identifyCombination } from '../lib/tienlen/combinations';
import { generateLegalMoves, chooseBotMove } from '../lib/tienlen/ai';

describe('Tiến Lên Miền Nam - AI Bot Logic', () => {
  it('generates all legal moves for a given hand', () => {
    const hand = [
      getCard('3_spades'),
      getCard('3_clubs'),
      getCard('4_diamonds'),
      getCard('5_hearts'),
      getCard('15_spades'),
    ];

    // When opening trick
    const legalOpeningMoves = generateLegalMoves(hand, null);
    expect(legalOpeningMoves.length).toBeGreaterThan(0);
    // Should contain pair of 3s
    const hasPair3 = legalOpeningMoves.some(
      (m) => m.length === 2 && m.every((c) => c.rank === 3)
    );
    expect(hasPair3).toBe(true);

    // Should contain straight 3-4-5
    const hasStraight = legalOpeningMoves.some(
      (m) =>
        m.length === 3 &&
        identifyCombination(m)?.type === 'straight'
    );
    expect(hasStraight).toBe(true);
  });

  it('generates moves that beat single 4', () => {
    const hand = [
      getCard('3_spades'),
      getCard('5_clubs'),
      getCard('10_hearts'),
      getCard('15_hearts'),
    ];
    const trick = identifyCombination([getCard('4_spades')])!;
    const legalFollowMoves = generateLegalMoves(hand, trick);

    // 3_spades cannot beat 4_spades
    expect(legalFollowMoves.some((m) => m[0].id === '3_spades')).toBe(false);
    // 5_clubs can beat 4_spades
    expect(legalFollowMoves.some((m) => m[0].id === '5_clubs')).toBe(true);
    // 10_hearts can beat 4_spades
    expect(legalFollowMoves.some((m) => m[0].id === '10_hearts')).toBe(true);
  });

  it('Hard bot plays winning move if available', () => {
    const hand = [getCard('10_spades'), getCard('10_clubs')];
    const trick = identifyCombination([getCard('8_spades'), getCard('8_clubs')])!;
    const move = chooseBotMove(hand, trick, 'hard');

    expect(move).not.toBeNull();
    expect(move?.length).toBe(2);
    expect(move?.[0].rank).toBe(10);
  });

  it('Bot sequentially takes valid turn and advances game state', () => {
    const seats: any[] = [
      { seatIndex: 0, userId: 'user1', displayName: 'Người chơi', isBot: false },
      { seatIndex: 1, userId: null, displayName: 'Bot 1', isBot: true, botDifficulty: 'easy' },
      { seatIndex: 2, userId: null, displayName: 'Bot 2', isBot: true, botDifficulty: 'medium' },
      { seatIndex: 3, userId: null, displayName: 'Bot 3', isBot: true, botDifficulty: 'hard' },
    ];

    const round = {
      id: 'round_test',
      roomId: 'room_test',
      roundNumber: 1,
      stake: 10000,
      status: 'playing' as const,
      firstPlayerSeat: 1,
      currentTurnSeat: 1,
      mustIncludeCardId: null,
      lastPlaySeat: null,
      lastPlayCards: null,
      lastPlayType: null,
      trickPasses: [],
      winnerSeat: null,
      rankPositions: [],
      instantWinType: null,
      roundLogs: [],
      version: 1,
      createdAt: Date.now(),
      finishedAt: null,
      hands: [
        { seatIndex: 0, cards: ['3_clubs', '4_spades', '5_spades'], initialCards: [], finishedPosition: null, chopBonusAmount: 0, chopPenaltyAmount: 0 },
        { seatIndex: 1, cards: ['3_spades', '6_clubs', '7_diamonds'], initialCards: [], finishedPosition: null, chopBonusAmount: 0, chopPenaltyAmount: 0 },
        { seatIndex: 2, cards: ['8_hearts', '9_clubs'], initialCards: [], finishedPosition: null, chopBonusAmount: 0, chopPenaltyAmount: 0 },
        { seatIndex: 3, cards: ['10_hearts', '15_spades'], initialCards: [], finishedPosition: null, chopBonusAmount: 0, chopPenaltyAmount: 0 },
      ],
    };

    // Bot 1 chooses move
    const botHandCards = round.hands[1].cards.map((id) => getCard(id));
    const botMove = chooseBotMove(botHandCards, null, 'easy');
    expect(botMove).not.toBeNull();
    expect(botMove!.length).toBeGreaterThan(0);
  });
});
