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
});
