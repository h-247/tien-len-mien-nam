'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ClientRoomState, PublicSeatState } from '@/lib/server/game-service';
import { PlayingCard } from './PlayingCard';
import { sortCardsByRank, sortCardsBySuit, getCard, getCards } from '@/lib/tienlen/cards';
import { identifyCombination, compareCombinations, getComboNameVi } from '@/lib/tienlen/combinations';
import { generateLegalMoves } from '@/lib/tienlen/ai';
import {
  Coins,
  ArrowRight,
  ShieldAlert,
  Info,
  RotateCcw,
  Sparkles,
  Bot,
  Trophy,
  Check,
  AlertTriangle,
  Play,
  Share2,
} from 'lucide-react';

interface GameTableViewProps {
  state: ClientRoomState;
  onAction: (actionData: any) => Promise<void>;
  onLeaveRoom: () => void;
}

export const GameTableView: React.FC<GameTableViewProps> = ({
  state,
  onAction,
  onLeaveRoom,
}) => {
  const { room, round, seats, mySeatIndex, myCards } = state;
  const isHost = mySeatIndex !== null && seats[mySeatIndex]?.isHost;
  const isMyTurn = round?.status === 'playing' && round.currentTurnSeat === mySeatIndex;

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rank' | 'suit'>('rank');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  // Auto-clear invalid selection on turn changes
  useEffect(() => {
    setSelectedCardIds([]);
    setActionError(null);
  }, [round?.currentTurnSeat, round?.lastPlayCards]);

  // Sort current player's cards
  const sortedMyCards = useMemo(() => {
    const cards = getCards(myCards);
    return sortBy === 'rank' ? sortCardsByRank(cards) : sortCardsBySuit(cards);
  }, [myCards, sortBy]);

  // Determine current trick combination
  const currentTrickCombo = useMemo(() => {
    if (!round?.lastPlayCards || round.lastPlayCards.length === 0) return null;
    return identifyCombination(getCards(round.lastPlayCards));
  }, [round?.lastPlayCards]);

  // Check if selected cards are a valid legal play
  const selectionValidation = useMemo(() => {
    if (selectedCardIds.length === 0) return { valid: false };

    const selectedCards = getCards(selectedCardIds);
    const combo = identifyCombination(selectedCards);
    if (!combo) {
      return { valid: false, error: 'Tổ hợp bài không hợp lệ.' };
    }

    // Check first trick 3 of spades constraint
    if (round?.roundNumber === 1 && !round.lastPlayCards && round.firstPlayerSeat === mySeatIndex) {
      if (!selectedCardIds.includes('3_spades')) {
        return { valid: false, error: 'Nước đi đầu tiên phải có 3 Bích.' };
      }
    }

    if (!currentTrickCombo) {
      return { valid: true, combo };
    }

    const cmp = compareCombinations(combo, currentTrickCombo);
    if (!cmp.valid) {
      return { valid: false, error: cmp.error || 'Bài không lớn hơn bài trên bàn.' };
    }

    return { valid: true, combo, isChop: cmp.isChop };
  }, [selectedCardIds, currentTrickCombo, round, mySeatIndex]);

  // Card click handler
  const handleToggleCard = (cardId: string) => {
    setActionError(null);
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Play move handler
  const handlePlay = async () => {
    if (!round || !isMyTurn || !selectionValidation.valid) return;

    try {
      setLoading(true);
      setActionError(null);
      await onAction({
        action: 'play',
        cardIds: selectedCardIds,
        version: round.version,
      });
      setSelectedCardIds([]);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pass turn handler
  const handlePass = async () => {
    if (!round || !isMyTurn || !round.lastPlayCards) return;

    try {
      setLoading(true);
      setActionError(null);
      await onAction({
        action: 'pass',
        version: round.version,
      });
      setSelectedCardIds([]);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto Hint: finds the lowest valid combo to beat the trick
  const handleHint = () => {
    if (!isMyTurn || !round) return;

    const myHandCards = getCards(myCards);
    const mustInclude =
      round.roundNumber === 1 && !round.lastPlayCards && round.firstPlayerSeat === mySeatIndex
        ? '3_spades'
        : undefined;

    const legalMoves = generateLegalMoves(myHandCards, currentTrickCombo, mustInclude);
    if (legalMoves.length === 0) {
      setActionError('Bạn không có bài để đè. Hãy bấm Bỏ lượt.');
      return;
    }

    // Pick the move with the lowest highestCard
    const sortedMoves = [...legalMoves].sort((a, b) => {
      const comboA = identifyCombination(a)!;
      const comboB = identifyCombination(b)!;
      return comboA.highestCard.rankValue - comboB.highestCard.rankValue;
    });

    const bestMove = sortedMoves[0];
    setSelectedCardIds(bestMove.map((c) => c.id));
    setActionError(null);
  };

  // Relative seat mapping for 4-player table:
  // Bottom: Current player (seat 0 in view)
  // Left: Next seat clockwise ((mySeatIndex + 1) % 4)
  // Top: Opposite seat ((mySeatIndex + 2) % 4)
  // Right: Previous seat clockwise ((mySeatIndex + 3) % 4)
  const myIndex = mySeatIndex !== null ? mySeatIndex : 0;
  const leftSeatIndex = (myIndex + 1) % 4;
  const topSeatIndex = (myIndex + 2) % 4;
  const rightSeatIndex = (myIndex + 3) % 4;

  const leftSeat = seats[leftSeatIndex];
  const topSeat = seats[topSeatIndex];
  const rightSeat = seats[rightSeatIndex];
  const mySeat = seats[myIndex];

  // Helper to render an opponent's card count & status badge
  const renderOpponentSeat = (
    seat: PublicSeatState | null,
    positionLabel: string,
    seatIdx: number
  ) => {
    if (!seat) return null;
    const isTheirTurn = round?.status === 'playing' && round.currentTurnSeat === seatIdx;
    const isPassed = round?.trickPasses.includes(seatIdx);
    const isFinished = seat.finishedPosition !== null;

    return (
      <div
        className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-[#262626]/90 border transition-all duration-200 shadow-sm ${
          isTheirTurn
            ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-yellow-500/20'
            : isPassed
            ? 'border-neutral-800 opacity-60'
            : 'border-[#383838]'
        }`}
      >
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
            seat.isBot
              ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
              : 'bg-neutral-800 text-white border border-neutral-700'
          }`}
        >
          {seat.isBot ? <Bot className="w-4 h-4" /> : seat.displayName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[90px] sm:max-w-[120px]">
              {seat.displayName}
            </span>
            {seat.isHost && (
              <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-bold">
                Host
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            {isFinished ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                <Trophy className="w-3 h-3" />
                Về {seat.finishedPosition === 1 ? 'Nhất' : seat.finishedPosition === 2 ? 'Nhì' : seat.finishedPosition === 3 ? 'Ba' : 'Bét'}
              </span>
            ) : isPassed ? (
              <span className="text-neutral-500 font-medium">Đã bỏ lượt</span>
            ) : (
              <span className="text-neutral-300 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                {seat.cardCount} lá
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto select-none">
      {/* Top Bar: Room Info & Controls */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#262626] border border-[#383838] rounded-xl text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white truncate">{room.name}</span>
          <span className="text-neutral-400 font-mono">#{room.code}</span>
          <span className="text-amber-400 font-bold hidden sm:inline">
            Cược: {room.stake.toLocaleString('vi-VN')} ₫
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRoomInfo(!showRoomInfo)}
            className="p-1 text-neutral-400 hover:text-white rounded"
            title="Thông tin phòng"
            aria-label="Thông tin phòng"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={onLeaveRoom}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Main Table Felt */}
      <div className="relative flex-1 bg-linear-to-b from-[#1b1b1b] via-[#212121] to-[#1b1b1b] border border-[#383838] rounded-2xl flex flex-col justify-between p-2 sm:p-4 overflow-hidden shadow-inner">
        {/* Top: Opponent 2 */}
        <div className="flex justify-center z-10">
          {renderOpponentSeat(topSeat, 'Đối diện', topSeatIndex)}
        </div>

        {/* Middle Row: Left Opponent - Center Table - Right Opponent */}
        <div className="flex items-center justify-between gap-2 my-auto z-10">
          {/* Left Opponent */}
          <div className="w-32 sm:w-40 shrink-0">
            {renderOpponentSeat(leftSeat, 'Bên trái', leftSeatIndex)}
          </div>

          {/* Center Table Area */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
            {/* Round Status / Turn indicator */}
            {round?.status === 'playing' && (
              <div className="mb-2">
                {isMyTurn ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-black font-extrabold text-xs shadow-md animate-bounce">
                    <Sparkles className="w-3.5 h-3.5" />
                    Đến lượt bạn đánh bài!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium text-xs border border-neutral-700">
                    Lượt của: {seats[round.currentTurnSeat]?.displayName || 'Người chơi'}
                  </span>
                )}
              </div>
            )}

            {/* Trick Cards Display */}
            <div className="min-h-[85px] sm:min-h-[110px] flex flex-col items-center justify-center">
              {round?.lastPlayCards && round.lastPlayCards.length > 0 ? (
                <div>
                  <div className="flex items-center justify-center -space-x-4 sm:-space-x-6 mb-1.5">
                    {round.lastPlayCards.map((cardId, idx) => (
                      <PlayingCard
                        key={cardId}
                        cardId={cardId}
                        size="md"
                        className="shadow-xl"
                      />
                    ))}
                  </div>

                  <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700">
                    {currentTrickCombo ? getComboNameVi(currentTrickCombo.type) : 'Tổ hợp'} (
                    {seats[round.lastPlaySeat!]?.displayName || 'Ai đó'})
                  </span>
                </div>
              ) : (
                <div className="text-center py-3 text-neutral-500 text-xs">
                  {round?.status === 'playing' ? (
                    <span>Vòng mới — Người có lượt được tự do dẫn bài</span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Error notice if invalid move */}
            {actionError && (
              <div className="mt-2 text-xs text-red-400 bg-red-950/60 border border-red-900 px-3 py-1 rounded-lg">
                {actionError}
              </div>
            )}
          </div>

          {/* Right Opponent */}
          <div className="w-32 sm:w-40 shrink-0 flex justify-end">
            {renderOpponentSeat(rightSeat, 'Bên phải', rightSeatIndex)}
          </div>
        </div>

        {/* Bottom Area: Current Player's Hand & Controls */}
        <div className="z-20 flex flex-col items-center w-full pt-2">
          {/* Action Control Buttons */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2 w-full max-w-md">
            <button
              onClick={handlePlay}
              disabled={!isMyTurn || !selectionValidation.valid || loading}
              className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs sm:text-sm shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <span>Đánh bài</span>
              {selectionValidation.combo && (
                <span className="text-[10px] font-bold text-neutral-600 hidden sm:inline">
                  ({getComboNameVi(selectionValidation.combo.type)})
                </span>
              )}
            </button>

            <button
              onClick={handlePass}
              disabled={!isMyTurn || !round?.lastPlayCards || loading}
              className="py-2 sm:py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs sm:text-sm border border-neutral-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Bỏ lượt
            </button>

            <button
              onClick={handleHint}
              disabled={!isMyTurn || loading}
              className="py-2 sm:py-2.5 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-yellow-400 font-semibold text-xs border border-neutral-700 transition-all disabled:opacity-30"
              title="Gợi ý nước đi"
            >
              Gợi ý
            </button>

            <button
              onClick={() => setSortBy(sortBy === 'rank' ? 'suit' : 'rank')}
              className="py-2 sm:py-2.5 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs border border-neutral-700 transition-all"
              title="Sắp xếp bài"
            >
              Xếp {sortBy === 'rank' ? 'Số' : 'Chất'}
            </button>
          </div>

          {/* Current Player Cards Fan */}
          <div className="w-full flex items-center justify-center overflow-x-auto pb-1 pt-4 no-scrollbar">
            <div className="flex items-center justify-center -space-x-6 sm:-space-x-8 px-4 min-w-max">
              {sortedMyCards.map((card) => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div key={card.id} className="transition-transform duration-150">
                    <PlayingCard
                      card={card}
                      selected={isSelected}
                      onClick={() => handleToggleCard(card.id)}
                      size="md"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* End of Round Settlement Modal */}
      {round?.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#262626] border border-[#383838] rounded-2xl shadow-2xl p-5 sm:p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 mx-auto flex items-center justify-center mb-3">
              <Trophy className="w-7 h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1">
              {round.instantWinType ? 'TỚI TRẮNG!' : 'Kết thúc ván đấu!'}
            </h2>
            <p className="text-xs text-neutral-400 mb-4">
              Mức cược: {round.stake.toLocaleString('vi-VN')} ₫
            </p>

            {/* Results Table */}
            <div className="bg-[#1A1A1A] border border-[#383838] rounded-xl overflow-hidden mb-5">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-800 text-neutral-400 border-b border-neutral-700">
                  <tr>
                    <th className="py-2 px-3">Hạng</th>
                    <th className="py-2 px-3">Người chơi</th>
                    <th className="py-2 px-3 text-right">Bài còn lại</th>
                    <th className="py-2 px-3 text-right">Số dư</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {round.rankPositions.map((seatIdx, idx) => {
                    const seat = seats[seatIdx];
                    const pos = idx + 1;
                    const posName = pos === 1 ? '🥇 Nhất' : pos === 2 ? '🥈 Nhì' : pos === 3 ? '🥉 Ba' : '💩 Bét';
                    return (
                      <tr key={seatIdx} className="text-neutral-300">
                        <td className="py-2.5 px-3 font-bold">{posName}</td>
                        <td className="py-2.5 px-3 font-semibold text-white truncate max-w-[120px]">
                          {seat?.displayName || `Ghế ${seatIdx + 1}`}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-400">
                          {seat?.cardCount === 0 ? 'Hết bài' : `${seat?.cardCount} lá`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {(seat?.balance || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={onLeaveRoom}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-neutral-700"
              >
                Rời phòng
              </button>

              {isHost && (
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await onAction({ action: 'start' });
                    } catch (e: any) {
                      setActionError(e.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Ván tiếp theo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
