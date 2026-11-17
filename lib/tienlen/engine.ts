import { Card, Combination, CombinationType, InstantWinType, Rank } from './types';
import { getCard, getCards, shuffleDeck, sortCardsByRank } from './cards';
import { identifyCombination, compareCombinations, checkInstantWin, getComboNameVi } from './combinations';
import { CHOP_BOUNTIES } from './penalties';

export interface SeatInfo {
  seatIndex: number;
  userId: string | null;
  displayName: string;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface PlayerHandState {
  seatIndex: number;
  cards: string[]; // card IDs
  initialCards: string[];
  finishedPosition: number | null; // 1, 2, 3, 4 or null if still playing
  chopBonusAmount: number;
  chopPenaltyAmount: number;
}

export interface RoundState {
  id: string;
  roomId: string;
  roundNumber: number;
  stake: number;
  status: 'playing' | 'finished';
  currentTurnSeat: number;
  firstPlayerSeat: number;
  mustIncludeCardId: string | null; // e.g. "3_spades" on first trick
  lastPlaySeat: number | null;
  lastPlayCards: string[] | null;
  lastPlayType: CombinationType | null;
  trickPasses: number[]; // seat indices who passed in current trick
  winnerSeat: number | null;
  rankPositions: number[]; // seat indices in finish order [1st, 2nd, 3rd, 4th]
  instantWinType: InstantWinType | null;
  hands: PlayerHandState[];
  roundLogs: string[];
  version: number;
  createdAt: number;
  finishedAt: number | null;
}

/**
 * Initializes a new round of Tiến Lên Miền Nam.
 */
export function initializeRound(
  roundId: string,
  roomId: string,
  roundNumber: number,
  stake: number,
  seats: SeatInfo[],
  lastWinnerSeat?: number,
  seed?: number
): RoundState {
  const deck = shuffleDeck(seed);

  // Deal 13 cards to 4 seats
  const hands: PlayerHandState[] = [];
  for (let s = 0; s < 4; s++) {
    const dealtCards = deck.slice(s * 13, (s + 1) * 13);
    const sorted = sortCardsByRank(dealtCards);
    const cardIds = sorted.map((c) => c.id);
    hands.push({
      seatIndex: s,
      cards: cardIds,
      initialCards: [...cardIds],
      finishedPosition: null,
      chopBonusAmount: 0,
      chopPenaltyAmount: 0,
    });
  }

  // Check for instant win (Tới trắng)
  let instantWinSeat: number | null = null;
  let instantWinType: InstantWinType | null = null;
  for (let s = 0; s < 4; s++) {
    const win = checkInstantWin(getCards(hands[s].cards));
    if (win) {
      instantWinSeat = s;
      instantWinType = win;
      break;
    }
  }

  const roundLogs: string[] = [];
  roundLogs.push(`Bắt đầu ván #${roundNumber}. Mức cược: ${stake.toLocaleString('vi-VN')} ₫.`);

  if (instantWinType && instantWinSeat !== null) {
    const seatName = seats[instantWinSeat].displayName;
    roundLogs.push(`🎉 ${seatName} TỚI TRẮNG (${getInstantWinNameVi(instantWinType)})!`);

    hands[instantWinSeat].finishedPosition = 1;
    const remainingSeats = [0, 1, 2, 3].filter((s) => s !== instantWinSeat);
    hands[remainingSeats[0]].finishedPosition = 2;
    hands[remainingSeats[1]].finishedPosition = 3;
    hands[remainingSeats[2]].finishedPosition = 4;

    return {
      id: roundId,
      roomId,
      roundNumber,
      stake,
      status: 'finished',
      currentTurnSeat: instantWinSeat,
      firstPlayerSeat: instantWinSeat,
      mustIncludeCardId: null,
      lastPlaySeat: null,
      lastPlayCards: null,
      lastPlayType: null,
      trickPasses: [],
      winnerSeat: instantWinSeat,
      rankPositions: [instantWinSeat, ...remainingSeats],
      instantWinType,
      hands,
      roundLogs,
      version: 1,
      createdAt: Date.now(),
      finishedAt: Date.now(),
    };
  }

  // Determine starting player
  let firstSeat = 0;
  let mustInclude: string | null = null;

  if (roundNumber === 1 || lastWinnerSeat === undefined || lastWinnerSeat === null) {
    // Find seat holding 3 of spades
    for (let s = 0; s < 4; s++) {
      if (hands[s].cards.includes('3_spades')) {
        firstSeat = s;
        mustInclude = '3_spades';
        break;
      }
    }
    roundLogs.push(`${seats[firstSeat].displayName} giữ 3 Bích và đánh trước.`);
  } else {
    firstSeat = lastWinnerSeat;
    roundLogs.push(`${seats[firstSeat].displayName} thắng ván trước và đánh trước.`);
  }

  return {
    id: roundId,
    roomId,
    roundNumber,
    stake,
    status: 'playing',
    currentTurnSeat: firstSeat,
    firstPlayerSeat: firstSeat,
    mustIncludeCardId: mustInclude,
    lastPlaySeat: null,
    lastPlayCards: null,
    lastPlayType: null,
    trickPasses: [],
    winnerSeat: null,
    rankPositions: [],
    instantWinType: null,
    hands,
    roundLogs,
    version: 1,
    createdAt: Date.now(),
    finishedAt: null,
  };
}

export function getInstantWinNameVi(type: InstantWinType): string {
  switch (type) {
    case 'dragon_straight':
      return 'Sảnh rồng';
    case 'four_twos':
      return 'Tứ quý 2';
    case 'five_pairs':
      return 'Năm đôi thông';
    case 'six_pairs':
      return 'Lục phé bôn';
    case 'same_color':
      return 'Đồng hoa';
    default:
      return 'Tới trắng';
  }
}

/**
 * Executes a card play action for the current turn seat.
 */
export function executePlay(
  state: RoundState,
  seatIndex: number,
  cardIds: string[],
  seats: SeatInfo[]
): { success: boolean; error?: string } {
  if (state.status !== 'playing') {
    return { success: false, error: 'Ván đấu đã kết thúc.' };
  }

  if (seatIndex !== state.currentTurnSeat) {
    return { success: false, error: 'Chưa tới lượt của bạn.' };
  }

  const hand = state.hands[seatIndex];
  if (!hand || hand.finishedPosition !== null) {
    return { success: false, error: 'Người chơi đã hết bài.' };
  }

  // Validate cards are in player's hand
  for (const id of cardIds) {
    if (!hand.cards.includes(id)) {
      return { success: false, error: `Bạn không có quân bài: ${id}` };
    }
  }

  // Validate 3 of spades rule on first play
  if (state.mustIncludeCardId && !cardIds.includes(state.mustIncludeCardId)) {
    return { success: false, error: 'Nước đi đầu tiên phải chứa 3 Bích.' };
  }

  const playedCards = getCards(cardIds);
  const playedCombo = identifyCombination(playedCards);
  if (!playedCombo) {
    return { success: false, error: 'Tổ hợp các lá bài không hợp lệ.' };
  }

  // If there's an existing trick play, compare
  let isChop = false;
  let chopBounty = 0;
  let choppedSeat = state.lastPlaySeat;

  if (state.lastPlayCards && state.lastPlayCards.length > 0) {
    const prevCards = getCards(state.lastPlayCards);
    const prevCombo = identifyCombination(prevCards)!;
    const cmp = compareCombinations(playedCombo, prevCombo);
    if (!cmp.valid) {
      return { success: false, error: cmp.error || 'Nước đi không hợp lệ.' };
    }

    if (cmp.isChop && choppedSeat !== null) {
      isChop = true;
      // Calculate chop bounty
      if (cmp.choppedType === 'single_2') {
        const isRed = prevCombo.highestCard.suit === 'hearts' || prevCombo.highestCard.suit === 'diamonds';
        chopBounty = Math.round((isRed ? CHOP_BOUNTIES.heo_do : CHOP_BOUNTIES.heo_den) * state.stake);
      } else if (cmp.choppedType === 'pair_2') {
        chopBounty = Math.round(2 * CHOP_BOUNTIES.heo_do * state.stake);
      } else if (cmp.choppedType === 'three_pairs') {
        chopBounty = Math.round(CHOP_BOUNTIES.ba_doi_thong * state.stake);
      } else if (cmp.choppedType === 'four_of_a_kind') {
        chopBounty = Math.round(CHOP_BOUNTIES.tu_quy * state.stake);
      }

      hand.chopBonusAmount += chopBounty;
      state.hands[choppedSeat].chopPenaltyAmount += chopBounty;
    }
  }

  // Remove cards from hand
  hand.cards = hand.cards.filter((id) => !cardIds.includes(id));
  state.mustIncludeCardId = null;

  // Log play
  const playerDisplayName = seats[seatIndex].displayName;
  const cardsNameStr = playedCards.map((c) => c.name).join(', ');
  if (isChop && choppedSeat !== null) {
    const choppedName = seats[choppedSeat].displayName;
    state.roundLogs.push(
      `💥 ${playerDisplayName} CHẶT ${choppedName} bằng [${cardsNameStr}] (+${chopBounty.toLocaleString('vi-VN')} ₫)!`
    );
  } else {
    state.roundLogs.push(
      `${playerDisplayName} đánh ${getComboNameVi(playedCombo.type)}: [${cardsNameStr}].`
    );
  }

  // Update trick state
  state.lastPlaySeat = seatIndex;
  state.lastPlayCards = cardIds;
  state.lastPlayType = playedCombo.type;

  // Check if player has finished their hand
  if (hand.cards.length === 0) {
    const pos = state.rankPositions.length + 1;
    hand.finishedPosition = pos;
    state.rankPositions.push(seatIndex);

    if (pos === 1) {
      state.winnerSeat = seatIndex;
      state.roundLogs.push(`🏆 ${playerDisplayName} về NHẤT!`);
    } else if (pos === 2) {
      state.roundLogs.push(`🥈 ${playerDisplayName} về NHÌ!`);
    } else if (pos === 3) {
      state.roundLogs.push(`🥉 ${playerDisplayName} về BA!`);
    }
  }

  // Check if round is finished (3 players finished, or only 1 remaining)
  const remainingActivePlayers = state.hands.filter((h) => h.finishedPosition === null);
  if (remainingActivePlayers.length <= 1) {
    if (remainingActivePlayers.length === 1) {
      const lastSeat = remainingActivePlayers[0].seatIndex;
      remainingActivePlayers[0].finishedPosition = 4;
      state.rankPositions.push(lastSeat);
      state.roundLogs.push(`💩 ${seats[lastSeat].displayName} về BÉT!`);
    }
    state.status = 'finished';
    state.finishedAt = Date.now();
    state.roundLogs.push('Ván đấu kết thúc.');
    state.version++;
    return { success: true };
  }

  // Advance turn to next active player
  advanceTurnAfterPlay(state);
  state.version++;
  return { success: true };
}

/**
 * Executes a PASS action for the current turn seat.
 */
export function executePass(
  state: RoundState,
  seatIndex: number,
  seats: SeatInfo[]
): { success: boolean; error?: string } {
  if (state.status !== 'playing') {
    return { success: false, error: 'Ván đấu đã kết thúc.' };
  }

  if (seatIndex !== state.currentTurnSeat) {
    return { success: false, error: 'Chưa tới lượt của bạn.' };
  }

  if (!state.lastPlayCards || state.lastPlayCards.length === 0) {
    return { success: false, error: 'Bạn đang dẫn lượt, không được bỏ lượt.' };
  }

  // Mark player as passed in current trick
  if (!state.trickPasses.includes(seatIndex)) {
    state.trickPasses.push(seatIndex);
  }

  const playerDisplayName = seats[seatIndex].displayName;
  state.roundLogs.push(`${playerDisplayName} bỏ lượt.`);

  // Check if trick is finished
  // A trick finishes if all active players (not finished) have passed except lastPlaySeat,
  // or if lastPlaySeat has finished and all other active players have passed
  const activeUnfinishedSeats = [0, 1, 2, 3].filter(
    (s) => state.hands[s].finishedPosition === null
  );

  const nonPassedSeats = activeUnfinishedSeats.filter(
    (s) => !state.trickPasses.includes(s) && s !== state.lastPlaySeat
  );

  // If lastPlaySeat has finished, and everyone else passed
  const lastPlaySeatFinished = state.hands[state.lastPlaySeat!].finishedPosition !== null;

  if (nonPassedSeats.length === 0) {
    // Trick is over!
    state.roundLogs.push('Hết vòng đánh bài.');
    state.trickPasses = [];
    state.lastPlayCards = null;
    state.lastPlayType = null;

    if (!lastPlaySeatFinished) {
      // Trick winner leads the new trick
      state.currentTurnSeat = state.lastPlaySeat!;
      state.roundLogs.push(`${seats[state.currentTurnSeat].displayName} bắt đầu vòng mới.`);
    } else {
      // Last player finished, pass lead to next active player clockwise
      state.currentTurnSeat = getNextActiveSeatClockwise(state, state.lastPlaySeat!);
      state.roundLogs.push(`${seats[state.currentTurnSeat].displayName} được nhường lượt mở vòng mới.`);
    }
    state.lastPlaySeat = null;
  } else {
    // Move to next eligible active player clockwise
    advanceTurn(state);
  }

  state.version++;
  return { success: true };
}

function advanceTurnAfterPlay(state: RoundState) {
  // Move clockwise to next active player who hasn't passed in this trick and hasn't finished
  let next = (state.currentTurnSeat + 1) % 4;
  let count = 0;
  while (count < 4) {
    const hand = state.hands[next];
    if (hand.finishedPosition === null && !state.trickPasses.includes(next)) {
      state.currentTurnSeat = next;
      return;
    }
    next = (next + 1) % 4;
    count++;
  }

  // If nobody else can play, reset trick
  state.trickPasses = [];
  state.lastPlayCards = null;
  state.lastPlayType = null;
  if (state.hands[state.lastPlaySeat!].finishedPosition === null) {
    state.currentTurnSeat = state.lastPlaySeat!;
  } else {
    state.currentTurnSeat = getNextActiveSeatClockwise(state, state.lastPlaySeat!);
  }
  state.lastPlaySeat = null;
}

function advanceTurn(state: RoundState) {
  let next = (state.currentTurnSeat + 1) % 4;
  let count = 0;
  while (count < 4) {
    const hand = state.hands[next];
    if (hand.finishedPosition === null && !state.trickPasses.includes(next)) {
      state.currentTurnSeat = next;
      return;
    }
    next = (next + 1) % 4;
    count++;
  }
}

function getNextActiveSeatClockwise(state: RoundState, fromSeat: number): number {
  let next = (fromSeat + 1) % 4;
  for (let i = 0; i < 4; i++) {
    if (state.hands[next].finishedPosition === null) {
      return next;
    }
    next = (next + 1) % 4;
  }
  return fromSeat;
}
