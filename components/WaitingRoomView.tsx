'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '@/lib/server/game-service';
import {
  Users,
  Coins,
  Copy,
  Check,
  Bot,
  Play,
  LogOut,
  UserX,
  Plus,
  ShieldCheck,
  AlertCircle,
  Share2,
} from 'lucide-react';

interface WaitingRoomViewProps {
  state: ClientRoomState;
  onAction: (actionData: any) => Promise<void>;
  onLeaveRoom: () => void;
  isAdmin?: boolean;
}

const STAKE_PRESETS = [1000, 2000, 3000, 5000, 10000];

export const WaitingRoomView: React.FC<WaitingRoomViewProps> = ({
  state,
  onAction,
  onLeaveRoom,
  isAdmin,
}) => {
  const { room, seats, mySeatIndex } = state;
  const isHost = mySeatIndex !== null && seats[mySeatIndex]?.isHost;
  const mySeat = mySeatIndex !== null ? seats[mySeatIndex] : null;

  const [copiedCode, setCopiedCode] = useState(false);
  const [editingStake, setEditingStake] = useState(false);
  const [newStake, setNewStake] = useState(room.stake);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const occupiedSeatsCount = seats.filter((s) => s !== null).length;
  const isSimulated = room.isSimulated || (seats.filter((s) => s && !s.isBot).length <= 1 && seats.some((s) => s && s.isBot));
  const hasEnoughPlayers = isSimulated ? occupiedSeatsCount >= 2 : occupiedSeatsCount === 4;
  const allSeatsFull = occupiedSeatsCount === 4;
  const allHumansAccepted = seats.every(
    (s) => s === null || s.isBot || s.stakeAccepted
  );
  const canStartMatch = isHost && hasEnoughPlayers && (isSimulated || allHumansAccepted);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleUpdateStake = async (stakeAmt: number) => {
    try {
      setLoading(true);
      setError(null);
      await onAction({ action: 'updateStake', stake: stakeAmt });
      setEditingStake(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptStake = async () => {
    try {
      setLoading(true);
      setError(null);
      await onAction({ action: 'acceptStake' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = async (seatIndex: number, difficulty: 'easy' | 'medium' | 'hard') => {
    try {
      setLoading(true);
      setError(null);
      await onAction({
        action: 'configureBot',
        seatIndex,
        botAction: 'add',
        difficulty,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBot = async (seatIndex: number) => {
    try {
      setLoading(true);
      setError(null);
      await onAction({
        action: 'configureBot',
        seatIndex,
        botAction: 'remove',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKickSeat = async (seatIndex: number) => {
    try {
      setLoading(true);
      setError(null);
      await onAction({ action: 'kick', seatIndex });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    try {
      setLoading(true);
      setError(null);
      await onAction({ action: 'start' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#262626] border border-[#383838] p-4 sm:p-5 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {room.name}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
              Đang chờ
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isSimulated ? (
              <span className="text-purple-300 font-medium">
                🤖 Phòng đấu luyện cùng Bot — Không cược tiền (thuần rèn luyện kỹ năng).
              </span>
            ) : (
              'Đủ 4 người chơi và thống nhất mức cược để chủ phòng bắt đầu ván đấu.'
            )}
          </p>
        </div>

        {/* Room Code & Copy */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#383838] px-3.5 py-2 rounded-xl">
            <span className="text-xs text-neutral-400 font-medium">Mã phòng:</span>
            <span className="font-mono text-base font-extrabold text-white tracking-widest">
              {room.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 text-neutral-400 hover:text-white rounded"
              title="Sao chép mã phòng"
              aria-label="Sao chép mã phòng"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-red-950/60 text-xs text-neutral-300 hover:text-red-300 border border-[#383838] hover:border-red-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Rời phòng</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-xs sm:text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stake Agreement Banner / Bot Practice Banner */}
      {isSimulated ? (
        <div className="bg-[#262626] border border-purple-800/40 p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/50 flex items-center justify-center text-purple-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                <span>Chế độ luyện tập cùng Bot</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                Không cược tiền • Thuần rèn luyện kỹ năng
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Ván đấu hoàn toàn không tính tiền và không ảnh hưởng đến số dư ví hay Bảng xếp hạng.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#262626] border border-[#383838] p-4 sm:p-5 rounded-2xl shadow-md">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Thỏa thuận mức cược phòng</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                {room.stake.toLocaleString('vi-VN')} ₫
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Yêu cầu số dư tối thiểu để vào cược: {room.stake.toLocaleString('vi-VN')} ₫
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isHost && (
                <button
                  onClick={() => setEditingStake(!editingStake)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-[#383838]"
                >
                  {editingStake ? 'Đóng chỉnh cược' : 'Đổi mức cược'}
                </button>
              )}

              {!isHost && mySeat && !mySeat.stakeAccepted && (
                <button
                  onClick={handleAcceptStake}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-md transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Đồng ý mức cược {room.stake.toLocaleString('vi-VN')} ₫</span>
                </button>
              )}

              {!isHost && mySeat && mySeat.stakeAccepted && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Đã chấp nhận mức cược</span>
                </div>
              )}
            </div>
          </div>

          {/* Stake Adjustment Panel for Host */}
          {isHost && editingStake && (
            <div className="mt-4 pt-4 border-t border-[#383838] space-y-3">
              <span className="text-xs text-neutral-300 font-medium block">
                Chọn mức cược mới (Người chơi khác sẽ cần chấp nhận lại):
              </span>
              <div className="flex flex-wrap gap-2">
                {STAKE_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleUpdateStake(amt)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      room.stake === amt
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-[#1A1A1A] text-neutral-300 border-[#383838] hover:border-white'
                    }`}
                  >
                    {amt.toLocaleString('vi-VN')} ₫
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4 Seats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {[0, 1, 2, 3].map((seatIndex) => {
          const seat = seats[seatIndex];
          const isMySeat = seatIndex === mySeatIndex;

          if (!seat) {
            // Empty seat
            return (
              <div
                key={seatIndex}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-[#383838] bg-[#262626]/40 min-h-[160px] text-center"
              >
                <div className="w-10 h-10 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-500 mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-neutral-400 mb-3">
                  Ghế #{seatIndex + 1} còn trống
                </span>

                {isHost && isAdmin && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <button
                      onClick={() => handleAddBot(seatIndex, 'easy')}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-300 border border-[#383838]"
                    >
                      + Bot Dễ
                    </button>
                    <button
                      onClick={() => handleAddBot(seatIndex, 'medium')}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-300 border border-[#383838]"
                    >
                      + Bot Vừa
                    </button>
                    <button
                      onClick={() => handleAddBot(seatIndex, 'hard')}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-300 border border-[#383838]"
                    >
                      + Bot Khó
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // Occupied seat (Human or Bot)
          return (
            <div
              key={seatIndex}
              className={`relative p-4 sm:p-5 rounded-2xl border bg-[#262626] flex flex-col justify-between shadow-sm min-h-[160px] ${
                isMySeat ? 'border-white/40 ring-1 ring-white/20' : 'border-[#383838]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                        seat.isBot
                          ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                          : 'bg-neutral-800 text-white border border-neutral-700'
                      }`}
                    >
                      {seat.isBot ? <Bot className="w-5 h-5" /> : seat.displayName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm sm:text-base text-white">
                          {seat.displayName}
                        </span>
                        {isMySeat && (
                          <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
                            Bạn
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-neutral-400 block">
                        {seat.isBot ? (
                          <span className="capitalize text-purple-400">
                            Bot ({seat.botDifficulty === 'easy' ? 'Dễ' : seat.botDifficulty === 'medium' ? 'Vừa' : 'Khó'})
                          </span>
                        ) : isSimulated ? (
                          <span className="text-neutral-400">Đấu tập</span>
                        ) : (
                          `Số dư: ${seat.balance.toLocaleString('vi-VN')} ₫`
                        )}
                      </span>
                    </div>
                  </div>

                  {seat.isHost ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-black">
                      Chủ phòng
                    </span>
                  ) : isHost ? (
                    <button
                      onClick={() => (seat.isBot ? handleRemoveBot(seatIndex) : handleKickSeat(seatIndex))}
                      disabled={loading}
                      className="p-1 text-neutral-500 hover:text-red-400 rounded"
                      title={seat.isBot ? 'Xóa Bot' : 'Kick người chơi'}
                      aria-label={seat.isBot ? 'Xóa Bot' : 'Kick người chơi'}
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Status footer for this seat */}
              <div className="pt-3 border-t border-[#383838] flex items-center justify-between text-xs">
                <span className="text-neutral-400">{isSimulated ? 'Trạng thái:' : 'Trạng thái cược:'}</span>
                {isSimulated ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    Sẵn sàng
                  </span>
                ) : seat.stakeAccepted ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    Đã đồng ý
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">Chưa đồng ý</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Match Action Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#262626] border border-[#383838] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-neutral-400 text-center sm:text-left">
          {!hasEnoughPlayers && (
            <p className="text-amber-400 font-medium">
              ⚠️ Cần ít nhất 2 người chơi (hoặc thêm Bot) để bắt đầu ván.
            </p>
          )}
          {hasEnoughPlayers && !isSimulated && !allHumansAccepted && (
            <p className="text-amber-400 font-medium">
              ⚠️ Đang chờ tất cả người chơi thực đồng ý với mức cược {room.stake.toLocaleString('vi-VN')} ₫.
            </p>
          )}
          {canStartMatch && (
            <p className="text-emerald-400 font-medium">
              ✅ Phòng đã sẵn sàng! Chủ phòng có thể bắt đầu ván bài.
            </p>
          )}
        </div>

        {isHost ? (
          <button
            onClick={handleStartMatch}
            disabled={!canStartMatch || loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>{loading ? 'Đang khởi tạo...' : 'Bắt đầu ván đấu'}</span>
          </button>
        ) : (
          <div className="text-xs font-semibold text-neutral-400">
            Chờ chủ phòng bấm bắt đầu ván đấu...
          </div>
        )}
      </div>
    </div>
  );
};
