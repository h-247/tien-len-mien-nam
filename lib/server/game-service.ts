import { getAppDb } from './db';
import { rooms, roomSeats, gameRounds, gameHands, profiles, wallets, users } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  initializeRound,
  executePlay,
  executePass,
  RoundState,
  SeatInfo,
  PlayerHandState,
} from '../tienlen/engine';
import { chooseBotMove } from '../tienlen/ai';
import { getCards } from '../tienlen/cards';
import { identifyCombination } from '../tienlen/combinations';
import { calculateSettlement, SeatRoundData } from '../tienlen/penalties';
import { recordRoundSettlement } from './ledger';
import { BotDifficulty } from '../tienlen/ai';

export interface PublicSeatState {
  seatIndex: number;
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  isBot: boolean;
  botDifficulty: 'easy' | 'medium' | 'hard' | null;
  isHost: boolean;
  stakeAccepted: boolean;
  isReady: boolean;
  cardCount: number;
  cards?: string[]; // Only provided for the requesting player!
  finishedPosition: number | null;
  balance: number;
}

export interface ClientRoomState {
  room: {
    id: string;
    code: string;
    name: string;
    hostUserId: string;
    stake: number;
    status: 'waiting' | 'ready' | 'playing' | 'finished' | 'closed';
    visibility: 'public' | 'private';
    currentRoundId: string | null;
    isSimulated?: boolean;
  };
  mySeatIndex: number | null;
  seats: (PublicSeatState | null)[];
  round: {
    id: string;
    roundNumber: number;
    stake: number;
    status: 'playing' | 'finished';
    currentTurnSeat: number;
    firstPlayerSeat: number;
    lastPlaySeat: number | null;
    lastPlayCards: string[] | null;
    lastPlayType: string | null;
    trickPasses: number[];
    winnerSeat: number | null;
    rankPositions: number[];
    instantWinType: string | null;
    roundLogs: string[];
    version: number;
  } | null;
  myCards: string[];
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createRoom(params: {
  hostUserId: string;
  name: string;
  stake?: number;
  visibility?: 'public' | 'private';
}) {
  const db = await getAppDb();
  const now = Date.now();
  const roomId = `room_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const code = generateRoomCode();
  const stake = params.stake || 10000;
  const visibility = params.visibility || 'public';

  await db.insert(rooms).values({
    id: roomId,
    code,
    name: params.name,
    hostUserId: params.hostUserId,
    stake,
    status: 'waiting',
    visibility,
    createdAt: now,
    updatedAt: now,
  });

  // Assign host to seat 0
  const seatId = `seat_${roomId}_0`;
  await db.insert(roomSeats).values({
    id: seatId,
    roomId,
    seatIndex: 0,
    userId: params.hostUserId,
    isBot: false,
    isHost: true,
    stakeAccepted: true,
    isReady: true,
    joinedAt: now,
  });

  return { roomId, code };
}

export async function createQuickBotRoom(params: {
  hostUserId: string;
  stake?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  botCount?: number;
}) {
  const botCount = params.botCount && params.botCount >= 1 && params.botCount <= 3 ? params.botCount : 3;
  const { roomId } = await createRoom({
    hostUserId: params.hostUserId,
    name: `Đấu luyện cùng ${botCount} Bot AI (Mô phỏng)`,
    stake: params.stake || 10000,
    visibility: 'private',
  });

  const diff = params.difficulty || 'mixed';
  const botConfigs = [
    {
      seatIndex: 1,
      diff: diff === 'mixed' ? 'easy' : diff,
      name: diff === 'mixed' ? 'Bot Tập Sự' : `Bot ${diff}`,
    },
    {
      seatIndex: 2,
      diff: diff === 'mixed' ? 'medium' : diff,
      name: diff === 'mixed' ? 'Bot Cao Thủ' : `Bot ${diff}`,
    },
    {
      seatIndex: 3,
      diff: diff === 'mixed' ? 'hard' : diff,
      name: diff === 'mixed' ? 'Bot Thần Bài' : `Bot ${diff}`,
    },
  ];

  for (let i = 0; i < botCount; i++) {
    const b = botConfigs[i];
    await configureBotSeat({
      roomId,
      hostUserId: params.hostUserId,
      seatIndex: b.seatIndex,
      action: 'add',
      difficulty: b.diff as any,
      botName: b.name,
    });
  }

  // Start the match immediately
  await startRoomMatch({
    roomId,
    hostUserId: params.hostUserId,
  });

  return { roomId };
}

export async function joinRoom(params: {
  roomId?: string;
  code?: string;
  userId: string;
}) {
  const db = await getAppDb();
  const now = Date.now();

  let room;
  if (params.code) {
    room = await db.query.rooms.findFirst({
      where: eq(rooms.code, params.code.trim().toUpperCase()),
    });
  } else if (params.roomId) {
    room = await db.query.rooms.findFirst({
      where: eq(rooms.id, params.roomId),
    });
  }

  if (!room) {
    throw new Error('Không tìm thấy phòng chơi.');
  }

  if (room.status !== 'waiting' && room.status !== 'ready') {
    throw new Error('Phòng đang chơi hoặc đã đóng.');
  }

  // Check if player is already seated
  const existingSeats = await db.query.roomSeats.findMany({
    where: eq(roomSeats.roomId, room.id),
  });

  const alreadySeated = existingSeats.find((s) => s.userId === params.userId);
  if (alreadySeated) {
    return { roomId: room.id, seatIndex: alreadySeated.seatIndex };
  }

  // Find an empty seat index (0..3)
  const occupiedIndices = new Set(existingSeats.map((s) => s.seatIndex));
  let targetSeatIndex = -1;
  for (let i = 0; i < 4; i++) {
    if (!occupiedIndices.has(i)) {
      targetSeatIndex = i;
      break;
    }
  }

  if (targetSeatIndex === -1) {
    throw new Error('Phòng đã đủ 4 người chơi.');
  }

  const seatId = `seat_${room.id}_${targetSeatIndex}`;
  await db.insert(roomSeats).values({
    id: seatId,
    roomId: room.id,
    seatIndex: targetSeatIndex,
    userId: params.userId,
    isBot: false,
    isHost: false,
    stakeAccepted: false,
    isReady: false,
    joinedAt: now,
  });

  return { roomId: room.id, seatIndex: targetSeatIndex };
}

export async function leaveRoom(params: { roomId: string; userId: string }) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room) throw new Error('Không tìm thấy phòng.');

  const seats = await db.query.roomSeats.findMany({
    where: eq(roomSeats.roomId, room.id),
  });
  const mySeat = seats.find((s) => s.userId === params.userId);
  if (!mySeat) return;

  if (room.status === 'playing') {
    throw new Error('Không thể rời phòng khi ván đấu đang diễn ra.');
  }

  // Remove seat
  await db.delete(roomSeats).where(eq(roomSeats.id, mySeat.id));

  // If host leaves
  if (mySeat.isHost) {
    const remainingHumans = seats.filter((s) => s.userId && s.userId !== params.userId && !s.isBot);
    if (remainingHumans.length > 0) {
      // Transfer host to next human
      await db
        .update(roomSeats)
        .set({ isHost: true })
        .where(eq(roomSeats.id, remainingHumans[0].id));
      await db
        .update(rooms)
        .set({ hostUserId: remainingHumans[0].userId! })
        .where(eq(rooms.id, room.id));
    } else {
      // Close room
      await db.update(rooms).set({ status: 'closed' }).where(eq(rooms.id, room.id));
    }
  }
}

export async function updateRoomStake(params: {
  roomId: string;
  hostUserId: string;
  stake: number;
}) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room) throw new Error('Không tìm thấy phòng.');
  if (room.hostUserId !== params.hostUserId) {
    throw new Error('Chỉ chủ phòng mới có quyền thay đổi mức cược.');
  }
  if (room.status !== 'waiting' && room.status !== 'ready') {
    throw new Error('Không thể thay đổi mức cược khi đang chơi.');
  }

  // Update room stake
  await db
    .update(rooms)
    .set({ stake: params.stake, updatedAt: Date.now() })
    .where(eq(rooms.id, room.id));

  // Invalidate previous acceptances for all non-host human seats
  await db
    .update(roomSeats)
    .set({ stakeAccepted: false, isReady: false })
    .where(eq(roomSeats.roomId, room.id));

  // Host automatically accepts their own proposed stake
  await db
    .update(roomSeats)
    .set({ stakeAccepted: true, isReady: true })
    .where(and(eq(roomSeats.roomId, room.id), eq(roomSeats.userId, params.hostUserId)));
}

export async function acceptStake(params: { roomId: string; userId: string }) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room) throw new Error('Không tìm thấy phòng.');

  // Check balance >= 5x stake
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, params.userId),
  });
  const requiredBalance = room.stake * 5;
  if (!wallet || wallet.balance < requiredBalance) {
    throw new Error(
      `Số dư của bạn (${(wallet?.balance || 0).toLocaleString('vi-VN')} ₫) không đủ mức tối thiểu để chấp nhận mức cược này (Yêu cầu ít nhất: ${requiredBalance.toLocaleString('vi-VN')} ₫).`
    );
  }

  await db
    .update(roomSeats)
    .set({ stakeAccepted: true, isReady: true })
    .where(and(eq(roomSeats.roomId, room.id), eq(roomSeats.userId, params.userId)));
}

export async function configureBotSeat(params: {
  roomId: string;
  hostUserId: string;
  seatIndex: number;
  action: 'add' | 'remove';
  difficulty?: 'easy' | 'medium' | 'hard';
  botName?: string;
}) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room || room.hostUserId !== params.hostUserId) {
    throw new Error('Chỉ chủ phòng mới có quyền thêm/bớt Bot.');
  }
  if (room.status !== 'waiting' && room.status !== 'ready') {
    throw new Error('Không thể thay đổi Bot khi ván đấu đang diễn ra.');
  }

  const existingSeat = await db.query.roomSeats.findFirst({
    where: and(eq(roomSeats.roomId, room.id), eq(roomSeats.seatIndex, params.seatIndex)),
  });

  if (params.action === 'remove') {
    if (existingSeat && existingSeat.isBot) {
      await db.delete(roomSeats).where(eq(roomSeats.id, existingSeat.id));
    }
  } else {
    // Add bot
    if (existingSeat && !existingSeat.isBot) {
      throw new Error('Vị trí này đang có người chơi thực.');
    }

    const defaultNames: Record<string, string> = {
      easy: 'Bot Tập Sự',
      medium: 'Bot Cao Thủ',
      hard: 'Bot Thần Bài',
    };

    const diff = params.difficulty || 'medium';
    const name = params.botName || defaultNames[diff] || 'Bot Tiến Lên';
    const now = Date.now();
    const seatId = `seat_${room.id}_${params.seatIndex}`;

    if (existingSeat) {
      await db
        .update(roomSeats)
        .set({
          isBot: true,
          botDifficulty: diff,
          botName: name,
          stakeAccepted: true,
          isReady: true,
        })
        .where(eq(roomSeats.id, existingSeat.id));
    } else {
      await db.insert(roomSeats).values({
        id: seatId,
        roomId: room.id,
        seatIndex: params.seatIndex,
        userId: null,
        isBot: true,
        botDifficulty: diff,
        botName: name,
        isHost: false,
        stakeAccepted: true,
        isReady: true,
        joinedAt: now,
      });
    }
  }
}

export async function kickSeat(params: {
  roomId: string;
  hostUserId: string;
  seatIndex: number;
}) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room || room.hostUserId !== params.hostUserId) {
    throw new Error('Chỉ chủ phòng mới có quyền kick người chơi.');
  }
  if (room.status !== 'waiting' && room.status !== 'ready') {
    throw new Error('Không thể kick khi đang chơi.');
  }

  const seat = await db.query.roomSeats.findFirst({
    where: and(eq(roomSeats.roomId, room.id), eq(roomSeats.seatIndex, params.seatIndex)),
  });
  if (seat && !seat.isHost) {
    await db.delete(roomSeats).where(eq(roomSeats.id, seat.id));
  }
}

export async function startRoomMatch(params: {
  roomId: string;
  hostUserId: string;
}) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room) throw new Error('Không tìm thấy phòng.');
  if (room.hostUserId !== params.hostUserId) {
    throw new Error('Chỉ chủ phòng mới có quyền bắt đầu ván đấu.');
  }
  if (room.status === 'playing') {
    throw new Error('Ván đấu đang diễn ra.');
  }

  const seats = await db.query.roomSeats.findMany({
    where: eq(roomSeats.roomId, room.id),
  });

  const isBotRoom = seats.filter((s) => !s.isBot).length <= 1 && seats.some((s) => s.isBot);

  if (isBotRoom) {
    if (seats.length < 2 || seats.length > 4) {
      throw new Error('Cần từ 2 đến 4 người chơi (hoặc Bot) để bắt đầu.');
    }
  } else {
    if (seats.length !== 4) {
      throw new Error('Cần đúng 4 người chơi (hoặc thêm Bot) để bắt đầu.');
    }
  }

  // Verify all human players accepted stake and have sufficient balance (PvP only)
  if (!isBotRoom) {
    for (const s of seats) {
      if (!s.isBot && s.userId) {
        if (!s.stakeAccepted) {
          throw new Error('Tất cả người chơi phải chấp nhận mức cược trước khi bắt đầu.');
        }
        const wallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, s.userId),
        });
        const required = room.stake * 5;
        if (!wallet || wallet.balance < required) {
          throw new Error(`Người chơi tại vị trí ${s.seatIndex + 1} không đủ số dư tối thiểu (${required.toLocaleString('vi-VN')} ₫).`);
        }
      }
    }
  }

  // Load seat display names
  const seatInfos: SeatInfo[] = [];
  const sortedSeats = [...seats].sort((a, b) => a.seatIndex - b.seatIndex);
  for (const s of sortedSeats) {
    let displayName = s.botName || `Bot ${s.seatIndex + 1}`;
    if (!s.isBot && s.userId) {
      const p = await db.query.profiles.findFirst({
        where: eq(profiles.userId, s.userId),
      });
      displayName = p?.displayName || `Người chơi ${s.seatIndex + 1}`;
    }
    seatInfos.push({
      seatIndex: s.seatIndex,
      userId: s.userId,
      displayName,
      isBot: s.isBot,
      botDifficulty: s.botDifficulty as BotDifficulty | undefined,
    });
  }

  // Find previous round winner if any
  let lastWinnerSeat: number | undefined;
  if (room.currentRoundId) {
    const prevRound = await db.query.gameRounds.findFirst({
      where: eq(gameRounds.id, room.currentRoundId),
    });
    if (prevRound && prevRound.winnerSeat !== null) {
      lastWinnerSeat = prevRound.winnerSeat;
    }
  }

  // Count past rounds in this room
  const pastRounds = await db.query.gameRounds.findMany({
    where: eq(gameRounds.roomId, room.id),
  });
  const roundNumber = pastRounds.length + 1;
  const roundId = `round_${room.id}_${roundNumber}`;

  // Initialize round state
  const roundState = initializeRound(
    roundId,
    room.id,
    roundNumber,
    room.stake,
    seatInfos,
    lastWinnerSeat
  );

  // Save game_rounds
  await db.insert(gameRounds).values({
    id: roundState.id,
    roomId: roundState.roomId,
    roundNumber: roundState.roundNumber,
    stake: roundState.stake,
    status: roundState.status,
    firstPlayerSeat: roundState.firstPlayerSeat,
    currentTurnSeat: roundState.currentTurnSeat,
    lastPlaySeat: roundState.lastPlaySeat ?? null,
    lastPlayCards: roundState.lastPlayCards ? JSON.stringify(roundState.lastPlayCards) : null,
    lastPlayType: roundState.lastPlayType ?? null,
    trickPasses: JSON.stringify(roundState.trickPasses),
    winnerSeat: roundState.winnerSeat ?? null,
    rankPositions: JSON.stringify(roundState.rankPositions),
    instantWinType: roundState.instantWinType ?? null,
    roundLogs: JSON.stringify(roundState.roundLogs),
    version: 1,
    createdAt: roundState.createdAt,
    finishedAt: roundState.finishedAt ?? null,
  });

  // Save game_hands
  for (const hand of roundState.hands) {
    await db.insert(gameHands).values({
      id: `hand_${roundId}_${hand.seatIndex}`,
      roundId,
      seatIndex: hand.seatIndex,
      cards: JSON.stringify(hand.cards),
      initialCards: JSON.stringify(hand.initialCards),
      finishedPosition: hand.finishedPosition ?? null,
      createdAt: roundState.createdAt,
      updatedAt: roundState.createdAt,
    });
  }

  // Update room status
  await db
    .update(rooms)
    .set({
      status: roundState.status === 'finished' ? 'finished' : 'playing',
      currentRoundId: roundId,
      updatedAt: Date.now(),
    })
    .where(eq(rooms.id, room.id));

  // If instant win occurred during deal, finalize settlement immediately
  if ((roundState.status as string) === 'finished') {
    await finalizeRoundSettlement(roundState, seatInfos);
  }

  return { roundId };
}

export async function submitPlayAction(params: {
  roomId: string;
  userId: string;
  cardIds: string[];
  version: number;
}) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room || !room.currentRoundId) {
    throw new Error('Không tìm thấy ván đấu.');
  }

  const { roundState, seatInfos } = await loadRoundState(room.currentRoundId);

  if (roundState.version !== params.version) {
    throw new Error('Trạng thái bàn chơi đã thay đổi. Vui lòng thử lại.');
  }

  const mySeat = seatInfos.find((s) => s.userId === params.userId);
  if (!mySeat) {
    throw new Error('Bạn không có ghế trong phòng chơi này.');
  }

  const playRes = executePlay(roundState, mySeat.seatIndex, params.cardIds, seatInfos);
  if (!playRes.success) {
    throw new Error(playRes.error || 'Nước đi không hợp lệ.');
  }

  if ((roundState.status as string) === 'finished') {
    await finalizeRoundSettlement(roundState, seatInfos);
  }

  // Persist updated round state
  await saveRoundState(roundState);
}

export async function submitPassAction(params: {
  roomId: string;
  userId: string;
  version: number;
}) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room || !room.currentRoundId) {
    throw new Error('Không tìm thấy ván đấu.');
  }

  const { roundState, seatInfos } = await loadRoundState(room.currentRoundId);

  if (roundState.version !== params.version) {
    throw new Error('Trạng thái bàn chơi đã thay đổi. Vui lòng thử lại.');
  }

  const mySeat = seatInfos.find((s) => s.userId === params.userId);
  if (!mySeat) {
    throw new Error('Bạn không có ghế trong phòng chơi này.');
  }

  const passRes = executePass(roundState, mySeat.seatIndex, seatInfos);
  if (!passRes.success) {
    throw new Error(passRes.error || 'Không thể bỏ lượt.');
  }

  if ((roundState.status as string) === 'finished') {
    await finalizeRoundSettlement(roundState, seatInfos);
  }

  // Persist updated round state
  await saveRoundState(roundState);
}

/**
 * Executes a single turn for the bot at the current turn seat.
 */
export async function executeSingleBotStep(params: { roomId: string }) {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, params.roomId),
  });
  if (!room || !room.currentRoundId) {
    return null;
  }

  const { roundState, seatInfos } = await loadRoundState(room.currentRoundId);
  if (roundState.status !== 'playing') {
    return roundState;
  }

  const currentSeat = seatInfos[roundState.currentTurnSeat];
  if (!currentSeat || !currentSeat.isBot) {
    return roundState;
  }

  const botHandCards = getCards(roundState.hands[roundState.currentTurnSeat].cards);
  const currentTrick =
    roundState.lastPlayCards && roundState.lastPlayCards.length > 0
      ? identifyCombination(getCards(roundState.lastPlayCards))
      : null;

  const minOpponentCardCount = Math.min(
    ...roundState.hands
      .filter((h) => h.seatIndex !== roundState.currentTurnSeat && h.finishedPosition === null)
      .map((h) => h.cards.length)
  );

  const botMove = chooseBotMove(
    botHandCards,
    currentTrick,
    currentSeat.botDifficulty || 'medium',
    roundState.mustIncludeCardId || undefined,
    minOpponentCardCount
  );

  if (botMove && botMove.length > 0) {
    const playRes = executePlay(
      roundState,
      roundState.currentTurnSeat,
      botMove.map((c) => c.id),
      seatInfos
    );
    if (!playRes.success) {
      if (currentTrick) {
        executePass(roundState, roundState.currentTurnSeat, seatInfos);
      } else {
        const fallbackCardId = roundState.mustIncludeCardId || roundState.hands[roundState.currentTurnSeat].cards[0];
        executePlay(roundState, roundState.currentTurnSeat, [fallbackCardId], seatInfos);
      }
    }
  } else {
    executePass(roundState, roundState.currentTurnSeat, seatInfos);
  }

  if ((roundState.status as string) === 'finished') {
    await finalizeRoundSettlement(roundState, seatInfos);
  }

  await saveRoundState(roundState);
  return roundState;
}

async function finalizeRoundSettlement(state: RoundState, seats: SeatInfo[]) {
  const db = await getAppDb();
  const seatRoundData: SeatRoundData[] = [];
  const isBotRoom = seats.filter((s) => !s.isBot).length <= 1 && seats.some((s) => s.isBot);

  for (const hand of state.hands) {
    const seatInfo = seats.find((st) => st.seatIndex === hand.seatIndex) || {
      seatIndex: hand.seatIndex,
      userId: null,
      displayName: `Ghế ${hand.seatIndex + 1}`,
      isBot: true,
    };
    let balance = isBotRoom ? 5000000 : 1000000;
    if (!isBotRoom && seatInfo.userId) {
      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, seatInfo.userId),
      });
      balance = wallet?.balance || 1000000;
    }

    seatRoundData.push({
      seatIndex: hand.seatIndex,
      userId: seatInfo.userId,
      displayName: seatInfo.displayName,
      isBot: seatInfo.isBot,
      currentBalance: balance,
      finishedPosition: hand.finishedPosition || state.hands.length,
      remainingCards: getCards(hand.cards),
      chopBonusAmount: hand.chopBonusAmount,
      chopPenaltyAmount: hand.chopPenaltyAmount,
    });
  }

  const settlement = calculateSettlement(state.stake, seatRoundData, state.instantWinType || undefined);

  // Record settlement into database & wallet transactions (isSimulated = isBotRoom)
  await recordRoundSettlement(state.id, state.roomId, settlement, isBotRoom);

  // Update room status to finished
  await db
    .update(rooms)
    .set({ status: 'finished', updatedAt: Date.now() })
    .where(eq(rooms.id, state.roomId));
}

async function loadRoundState(roundId: string): Promise<{ roundState: RoundState; seatInfos: SeatInfo[] }> {
  const db = await getAppDb();
  const round = await db.query.gameRounds.findFirst({
    where: eq(gameRounds.id, roundId),
  });
  if (!round) throw new Error('Không tìm thấy ván đấu.');

  const dbSeats = await db.query.roomSeats.findMany({
    where: eq(roomSeats.roomId, round.roomId),
  });

  const hands = await db.query.gameHands.findMany({
    where: eq(gameHands.roundId, round.id),
  });

  const seatIndices = Array.from(
    new Set([...dbSeats.map((s) => s.seatIndex), ...hands.map((h) => h.seatIndex)])
  ).sort((a, b) => a - b);

  const seatInfos: SeatInfo[] = [];
  for (const i of seatIndices) {
    const s = dbSeats.find((seat) => seat.seatIndex === i);
    let displayName = s?.botName || `Ghế ${i + 1}`;
    if (s && !s.isBot && s.userId) {
      const p = await db.query.profiles.findFirst({
        where: eq(profiles.userId, s.userId),
      });
      displayName = p?.displayName || `Người chơi ${i + 1}`;
    }
    seatInfos.push({
      seatIndex: i,
      userId: s?.userId || null,
      displayName,
      isBot: s?.isBot || false,
      botDifficulty: s?.botDifficulty as BotDifficulty | undefined,
    });
  }

  const playerHands: PlayerHandState[] = [];
  for (const i of seatIndices) {
    const h = hands.find((hand) => hand.seatIndex === i);
    if (!h) continue;
    playerHands.push({
      seatIndex: i,
      cards: JSON.parse(h.cards),
      initialCards: JSON.parse(h.initialCards),
      finishedPosition: h.finishedPosition ?? null,
      chopBonusAmount: 0,
      chopPenaltyAmount: 0,
    });
  }

  const roundState: RoundState = {
    id: round.id,
    roomId: round.roomId,
    roundNumber: round.roundNumber,
    stake: round.stake,
    status: round.status as 'playing' | 'finished',
    currentTurnSeat: round.currentTurnSeat,
    firstPlayerSeat: round.firstPlayerSeat,
    mustIncludeCardId:
      round.roundNumber === 1 && !round.lastPlayCards && playerHands.every((h) => h.cards.length === 13)
        ? '3_spades'
        : null,
    lastPlaySeat: round.lastPlaySeat,
    lastPlayCards: round.lastPlayCards ? JSON.parse(round.lastPlayCards) : null,
    lastPlayType: round.lastPlayType as any,
    trickPasses: JSON.parse(round.trickPasses || '[]'),
    winnerSeat: round.winnerSeat,
    rankPositions: JSON.parse(round.rankPositions || '[]'),
    instantWinType: round.instantWinType as any,
    roundLogs: JSON.parse(round.roundLogs || '[]'),
    version: round.version,
    createdAt: round.createdAt,
    finishedAt: round.finishedAt,
    hands: playerHands,
  };

  return { roundState, seatInfos };
}

async function saveRoundState(state: RoundState) {
  const db = await getAppDb();
  await db
    .update(gameRounds)
    .set({
      status: state.status,
      currentTurnSeat: state.currentTurnSeat,
      lastPlaySeat: state.lastPlaySeat ?? null,
      lastPlayCards: state.lastPlayCards ? JSON.stringify(state.lastPlayCards) : null,
      lastPlayType: state.lastPlayType ?? null,
      trickPasses: JSON.stringify(state.trickPasses),
      winnerSeat: state.winnerSeat ?? null,
      rankPositions: JSON.stringify(state.rankPositions),
      roundLogs: JSON.stringify(state.roundLogs),
      version: state.version,
      finishedAt: state.finishedAt ?? null,
    })
    .where(eq(gameRounds.id, state.id));

  for (const hand of state.hands) {
    await db
      .update(gameHands)
      .set({
        cards: JSON.stringify(hand.cards),
        finishedPosition: hand.finishedPosition ?? null,
        updatedAt: Date.now(),
      })
      .where(and(eq(gameHands.roundId, state.id), eq(gameHands.seatIndex, hand.seatIndex)));
  }
}

export async function getClientRoomState(roomId: string, currentUserId: string): Promise<ClientRoomState> {
  const db = await getAppDb();
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  if (!room) throw new Error('Không tìm thấy phòng chơi.');

  const dbSeats = await db.query.roomSeats.findMany({
    where: eq(roomSeats.roomId, roomId),
  });

  const isBotRoom = dbSeats.filter((s) => !s.isBot).length <= 1 && dbSeats.some((s) => s.isBot);

  let mySeatIndex: number | null = null;
  const publicSeats: (PublicSeatState | null)[] = [null, null, null, null];

  // Load round if any
  let roundData = null;
  let myCards: string[] = [];

  if (room.currentRoundId) {
    const round = await db.query.gameRounds.findFirst({
      where: eq(gameRounds.id, room.currentRoundId),
    });
    if (round) {
      roundData = {
        id: round.id,
        roundNumber: round.roundNumber,
        stake: round.stake,
        status: round.status as 'playing' | 'finished',
        currentTurnSeat: round.currentTurnSeat,
        firstPlayerSeat: round.firstPlayerSeat,
        lastPlaySeat: round.lastPlaySeat,
        lastPlayCards: round.lastPlayCards ? JSON.parse(round.lastPlayCards) : null,
        lastPlayType: round.lastPlayType,
        trickPasses: JSON.parse(round.trickPasses || '[]'),
        winnerSeat: round.winnerSeat,
        rankPositions: JSON.parse(round.rankPositions || '[]'),
        instantWinType: round.instantWinType,
        roundLogs: JSON.parse(round.roundLogs || '[]'),
        version: round.version,
      };

      const hands = await db.query.gameHands.findMany({
        where: eq(gameHands.roundId, round.id),
      });

      for (let i = 0; i < 4; i++) {
        const s = dbSeats.find((seat) => seat.seatIndex === i);
        if (s) {
          if (s.userId === currentUserId) {
            mySeatIndex = i;
          }

          let displayName = s.botName || `Bot ${i + 1}`;
          let avatarUrl = null;
          let balance = isBotRoom ? 5000000 : 1000000;

          if (!s.isBot && s.userId && !isBotRoom) {
            const p = await db.query.profiles.findFirst({
              where: eq(profiles.userId, s.userId),
            });
            if (p) {
              displayName = p.displayName;
              avatarUrl = p.avatarUrl;
            }
            const w = await db.query.wallets.findFirst({
              where: eq(wallets.userId, s.userId),
            });
            if (w) balance = w.balance;
          } else if (!s.isBot && s.userId && isBotRoom) {
            const p = await db.query.profiles.findFirst({
              where: eq(profiles.userId, s.userId),
            });
            if (p) {
              displayName = p.displayName;
              avatarUrl = p.avatarUrl;
            }
          }

          const h = hands.find((hand) => hand.seatIndex === i);
          const handCardIds: string[] = h ? JSON.parse(h.cards) : [];

          if (s.userId === currentUserId) {
            myCards = handCardIds;
          }

          publicSeats[i] = {
            seatIndex: i,
            userId: s.userId,
            displayName,
            avatarUrl,
            isBot: s.isBot,
            botDifficulty: s.botDifficulty as any,
            isHost: s.isHost,
            stakeAccepted: s.stakeAccepted,
            isReady: s.isReady,
            cardCount: handCardIds.length,
            // SECURITY: ONLY include cards array for current user! Opponents are strictly hidden!
            cards: s.userId === currentUserId ? handCardIds : undefined,
            finishedPosition: h?.finishedPosition || null,
            balance,
          };
        }
      }
    }
  } else {
    // Waiting room (no round started yet)
    for (let i = 0; i < 4; i++) {
      const s = dbSeats.find((seat) => seat.seatIndex === i);
      if (s) {
        if (s.userId === currentUserId) {
          mySeatIndex = i;
        }

        let displayName = s.botName || `Bot ${i + 1}`;
        let avatarUrl = null;
        let balance = isBotRoom ? 5000000 : 1000000;

        if (!s.isBot && s.userId && !isBotRoom) {
          const p = await db.query.profiles.findFirst({
            where: eq(profiles.userId, s.userId),
          });
          if (p) {
            displayName = p.displayName;
            avatarUrl = p.avatarUrl;
          }
          const w = await db.query.wallets.findFirst({
            where: eq(wallets.userId, s.userId),
          });
          if (w) balance = w.balance;
        } else if (!s.isBot && s.userId && isBotRoom) {
          const p = await db.query.profiles.findFirst({
            where: eq(profiles.userId, s.userId),
          });
          if (p) {
            displayName = p.displayName;
            avatarUrl = p.avatarUrl;
          }
        }

        publicSeats[i] = {
          seatIndex: i,
          userId: s.userId,
          displayName,
          avatarUrl,
          isBot: s.isBot,
          botDifficulty: s.botDifficulty as any,
          isHost: s.isHost,
          stakeAccepted: s.stakeAccepted,
          isReady: s.isReady,
          cardCount: 0,
          finishedPosition: null,
          balance,
        };
      }
    }
  }

  return {
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      hostUserId: room.hostUserId,
      stake: room.stake,
      status: room.status as any,
      visibility: room.visibility as any,
      currentRoundId: room.currentRoundId,
      isSimulated: isBotRoom,
    },
    mySeatIndex,
    seats: publicSeats,
    round: roundData,
    myCards,
  };
}
