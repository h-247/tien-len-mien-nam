import { Card, Rank, Suit } from './types';

const SUIT_ORDER: Record<Suit, { value: number; name: string; color: 'black' | 'red'; symbol: string }> = {
  spades: { value: 0, name: 'Bích', color: 'black', symbol: '♠' },
  clubs: { value: 1, name: 'Chuồn', color: 'black', symbol: '♣' },
  diamonds: { value: 2, name: 'Rô', color: 'red', symbol: '♦' },
  hearts: { value: 3, name: 'Cơ', color: 'red', symbol: '♥' },
};

const RANK_NAMES: Record<Rank, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
};

const ALL_RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const ALL_SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];

export function createCard(rank: Rank, suit: Suit): Card {
  const suitInfo = SUIT_ORDER[suit];
  const rankName = RANK_NAMES[rank];
  return {
    id: `${rank}_${suit}`,
    rank,
    suit,
    suitValue: suitInfo.value,
    rankValue: rank,
    name: `${rankName} ${suitInfo.symbol}`,
    color: suitInfo.color,
  };
}

// Full 52 card deck cache
export const FULL_DECK: Card[] = ALL_RANKS.flatMap((rank) =>
  ALL_SUITS.map((suit) => createCard(rank, suit))
);

export const CARD_MAP: Map<string, Card> = new Map(
  FULL_DECK.map((card) => [card.id, card])
);

export function getCard(id: string): Card {
  const card = CARD_MAP.get(id);
  if (!card) {
    throw new Error(`Quân bài không hợp lệ: ${id}`);
  }
  return card;
}

export function getCards(ids: string[]): Card[] {
  return ids.map(getCard);
}

// Compare two cards according to Tiến Lên Miền Nam:
// Rank 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2
// Suit: Bích (♠) < Chuồn (♣) < Rô (♦) < Cơ (♥)
export function compareCards(a: Card, b: Card): number {
  if (a.rankValue !== b.rankValue) {
    return a.rankValue - b.rankValue;
  }
  return a.suitValue - b.suitValue;
}

export function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

export function sortCardsBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.suitValue !== b.suitValue) {
      return a.suitValue - b.suitValue;
    }
    return a.rankValue - b.rankValue;
  });
}

// Shuffles deck using Web Crypto API or Fisher-Yates with optional seed
export function shuffleDeck(seed?: number): Card[] {
  const deck = [...FULL_DECK];

  if (typeof seed === 'number') {
    // Deterministic pseudo-random number generator for seeded tests
    let s = seed;
    const nextRandom = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  } else {
    // Cryptographically secure shuffle
    const array = new Uint32Array(deck.length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = array[i] % (i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    } else {
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
  }

  return deck;
}
