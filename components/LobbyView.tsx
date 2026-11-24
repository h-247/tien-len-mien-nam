'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  PlusCircle,
  KeyRound,
  RefreshCw,
  Search,
  Sparkles,
  Lock,
  Globe,
  Coins,
  Bot,
} from 'lucide-react';

interface RoomSummary {
  id: string;
  code: string;
  name: string;
  hostDisplayName: string;
  stake: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished' | 'closed';
  visibility: 'public' | 'private';
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}

interface LobbyViewProps {
  onJoinRoom: (roomId: string) => void;
  onCreateRoomClick: () => void;
  onPlayWithBotsClick?: () => void;
  isAdmin?: boolean;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onJoinRoom,
  onCreateRoomClick,
  onPlayWithBotsClick,
  isAdmin,
}) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [playingBot, setPlayingBot] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePlayWithBots = async () => {
    try {
      setPlayingBot(true);
      setError(null);
      const res = await fetch('/api/rooms/quick-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stake: 0, difficulty: 'mixed' }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Không thể tạo phòng với Bot.');
      onJoinRoom(data.roomId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPlayingBot(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms');
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Không tải được danh sách phòng.');
      setRooms(data.rooms || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    try {
      setJoiningCode(true);
      setError(null);
      const res = await fetch('/api/rooms/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCodeInput.trim().toUpperCase() }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Không thể tham gia phòng.');
      onJoinRoom(data.roomId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoiningCode(false);
    }
  };

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.hostDisplayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#262626] border border-[#383838] p-4 sm:p-5 rounded-2xl shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Sảnh phòng đấu bài
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Chọn phòng chơi công khai, ghép bàn với bạn bè hoặc tự tạo phòng mới cùng Bot.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRooms}
            className="p-2.5 rounded-xl bg-[#1A1A1A] border border-[#383838] text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Làm mới"
            aria-label="Làm mới danh sách phòng"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={onPlayWithBotsClick || handlePlayWithBots}
              disabled={playingBot}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2.5 text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              <span>{playingBot ? 'Đang vào...' : 'Chơi với Bot'}</span>
            </button>
          )}

          <button
            onClick={onCreateRoomClick}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo phòng</span>
          </button>
        </div>
      </div>

      {/* Join by Code bar & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên phòng, chủ phòng hoặc mã phòng..."
            className="w-full bg-[#262626] border border-[#383838] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Join by Code Form */}
        <form onSubmit={handleJoinByCode} className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="Nhập mã phòng (6 ký tự)"
              maxLength={8}
              className="w-full uppercase bg-[#262626] border border-[#383838] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-neutral-500 font-mono tracking-wider focus:outline-none focus:border-white transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={joiningCode || !roomCodeInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold text-white border border-[#383838] transition-colors disabled:opacity-50"
          >
            {joiningCode ? '...' : 'Vào'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-xs sm:text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#262626] border border-[#383838] space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Chưa có phòng chơi nào</h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto">
            {isAdmin
              ? 'Hiện tại không có phòng đang chờ. Hãy tạo một phòng mới và mời bạn bè hoặc ghép với Bot!'
              : 'Hiện tại không có phòng đang chờ. Hãy tạo một phòng mới và mời bạn bè tham gia!'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {isAdmin && (
              <button
                onClick={onPlayWithBotsClick || handlePlayWithBots}
                disabled={playingBot}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                <span>{playingBot ? 'Đang vào...' : 'Chơi với Bot'}</span>
              </button>
            )}
            <button
              onClick={onCreateRoomClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo phòng đầu tiên</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRooms.map((room) => {
            const isFull = room.playerCount >= room.maxPlayers;
            const isPlaying = room.status === 'playing';

            return (
              <div
                key={room.id}
                className="group relative flex flex-col justify-between bg-[#262626] hover:bg-[#2b2b2b] border border-[#383838] hover:border-neutral-500 p-4 rounded-2xl transition-all duration-200 shadow-sm"
              >
                <div>
                  {/* Header: Title and Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-base truncate flex items-center gap-1.5">
                      {room.visibility === 'private' ? (
                        <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      )}
                      <span className="truncate">{room.name}</span>
                    </h3>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isPlaying
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : isFull
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isPlaying ? 'Đang chơi' : isFull ? 'Đủ người' : 'Đang chờ'}
                    </span>
                  </div>

                  {/* Room Info */}
                  <div className="space-y-1.5 text-xs text-neutral-400 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Chủ phòng:</span>
                      <span className="font-medium text-neutral-200 truncate max-w-[150px]">
                        {room.hostDisplayName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Mã phòng:</span>
                      <span className="font-mono font-bold text-neutral-300 tracking-wider">
                        {room.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Mức cược:</span>
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {room.stake.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Player count and Action */}
                <div className="pt-3 border-t border-[#383838] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {room.playerCount}/{room.maxPlayers} người
                    </span>
                  </div>

                  <button
                    onClick={() => onJoinRoom(room.id)}
                    disabled={isFull && !isPlaying}
                    className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-white text-neutral-200 hover:text-black font-semibold text-xs border border-neutral-700 hover:border-white transition-all shadow-sm disabled:opacity-40"
                  >
                    Vào phòng
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
