'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame, TrendingUp, Award, Coins } from 'lucide-react';

interface LeaderboardItem {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  balance: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
}

export const LeaderboardView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'balance' | 'wins' | 'winRate'>('profit');
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/leaderboard?timeframe=${timeframe}&sortBy=${sortBy}`);
        const data = (await res.json()) as any;
        setItems(data.leaderboard || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe, sortBy]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#262626] border border-[#383838] p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Bảng xếp hạng Thần Bài
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Vinh danh những cao thủ Tiến Lên Miền Nam có thành tích xuất sắc nhất (Giờ Việt Nam UTC+7).
          </p>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex bg-[#1A1A1A] p-1 rounded-xl border border-[#383838]">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'month', label: 'Tháng này' },
            { id: 'all', label: 'Tất cả' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                timeframe === t.id
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Criteria Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-400 font-medium">Sắp xếp theo:</span>
        {[
          { id: 'profit', label: 'Lợi nhuận ròng' },
          { id: 'balance', label: 'Số dư hiện tại' },
          { id: 'wins', label: 'Số ván thắng' },
          { id: 'winRate', label: 'Tỷ lệ thắng %' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSortBy(s.id as any)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              sortBy === s.id
                ? 'bg-white text-black border-white'
                : 'bg-[#262626] text-neutral-300 border-[#383838] hover:border-neutral-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium (if >= 3 players) */}
      {items.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4">
          {/* Rank 2 */}
          <div className="flex flex-col items-center justify-end p-3 sm:p-4 rounded-2xl bg-[#262626] border border-[#383838] text-center order-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-300/10 border border-slate-300/30 text-slate-300 flex items-center justify-center font-bold text-sm mb-2">
              🥈
            </div>
            <span className="text-xs sm:text-sm font-bold text-white truncate max-w-full">
              {items[1].displayName}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold mt-1">
              +{items[1].netProfit.toLocaleString('vi-VN')} ₫
            </span>
            <span className="text-[10px] text-neutral-400">
              {items[1].matchesWon} thắng ({items[1].winRate}%)
            </span>
          </div>

          {/* Rank 1 (Tallest) */}
          <div className="flex flex-col items-center justify-end p-4 sm:p-5 rounded-2xl bg-linear-to-b from-yellow-950/20 to-[#262626] border border-yellow-500/40 text-center order-2 -translate-y-2 shadow-lg">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-400 flex items-center justify-center font-bold text-base mb-2">
              🥇
            </div>
            <span className="text-sm sm:text-base font-extrabold text-white truncate max-w-full">
              {items[0].displayName}
            </span>
            <span className="text-xs sm:text-sm font-mono text-amber-400 font-extrabold mt-1">
              +{items[0].netProfit.toLocaleString('vi-VN')} ₫
            </span>
            <span className="text-[11px] text-neutral-300 font-medium">
              {items[0].matchesWon} thắng ({items[0].winRate}%)
            </span>
          </div>

          {/* Rank 3 */}
          <div className="flex flex-col items-center justify-end p-3 sm:p-4 rounded-2xl bg-[#262626] border border-[#383838] text-center order-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-700/10 border border-amber-700/30 text-amber-600 flex items-center justify-center font-bold text-sm mb-2">
              🥉
            </div>
            <span className="text-xs sm:text-sm font-bold text-white truncate max-w-full">
              {items[2].displayName}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold mt-1">
              +{items[2].netProfit.toLocaleString('vi-VN')} ₫
            </span>
            <span className="text-[10px] text-neutral-400">
              {items[2].matchesWon} thắng ({items[2].winRate}%)
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#262626] border border-[#383838] rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#1A1A1A] text-neutral-400 border-b border-[#383838]">
              <tr>
                <th className="py-3 px-3 sm:px-4"># Hạng</th>
                <th className="py-3 px-3 sm:px-4">Người chơi</th>
                <th className="py-3 px-3 sm:px-4 text-right">Số dư</th>
                <th className="py-3 px-3 sm:px-4 text-right">Lợi nhuận ròng</th>
                <th className="py-3 px-3 sm:px-4 text-right">Số ván</th>
                <th className="py-3 px-3 sm:px-4 text-right">Tỷ lệ thắng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#383838]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Đang tải bảng xếp hạng...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Chưa có người chơi nào hoàn thành ván đấu trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                items.map((player) => (
                  <tr
                    key={player.userId}
                    className="hover:bg-neutral-800/40 transition-colors text-neutral-300"
                  >
                    <td className="py-3 px-3 sm:px-4 font-bold text-white">
                      {player.rank === 1 ? '🥇 1' : player.rank === 2 ? '🥈 2' : player.rank === 3 ? '🥉 3' : player.rank}
                    </td>

                    <td className="py-3 px-3 sm:px-4 font-bold text-white">
                      {player.displayName}
                    </td>

                    <td className="py-3 px-3 sm:px-4 text-right font-mono text-neutral-200">
                      {player.balance.toLocaleString('vi-VN')} ₫
                    </td>

                    <td
                      className={`py-3 px-3 sm:px-4 text-right font-mono font-bold ${
                        player.netProfit > 0
                          ? 'text-emerald-400'
                          : player.netProfit < 0
                          ? 'text-red-400'
                          : 'text-neutral-400'
                      }`}
                    >
                      {player.netProfit > 0 ? '+' : ''}
                      {player.netProfit.toLocaleString('vi-VN')} ₫
                    </td>

                    <td className="py-3 px-3 sm:px-4 text-right text-neutral-400">
                      {player.matchesPlayed} ván ({player.matchesWon} thắng)
                    </td>

                    <td className="py-3 px-3 sm:px-4 text-right font-bold text-neutral-200">
                      {player.winRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
