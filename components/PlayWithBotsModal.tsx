'use client';

import React, { useState } from 'react';
import { Bot, X, Sparkles, Play, ShieldAlert } from 'lucide-react';

interface PlayWithBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlay: (params: {
    botCount: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  }) => Promise<void>;
}

export const PlayWithBotsModal: React.FC<PlayWithBotsModalProps> = ({
  isOpen,
  onClose,
  onPlay,
}) => {
  const [botCount, setBotCount] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onPlay({ botCount, difficulty });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo phòng đấu với Bot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#262626] border border-[#383838] rounded-2xl shadow-2xl p-6 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/50 flex items-center justify-center text-purple-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Chơi với Bot AI</h2>
            <p className="text-xs text-neutral-400">Tùy chọn số lượng Bot và mức độ thử thách</p>
          </div>
        </div>

        {/* Training mode notice */}
        <div className="mt-3 mb-4 p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <span>
            <b>Chế độ luyện tập:</b> Không cược tiền, chơi thuần giải trí và rèn luyện kỹ năng với các cấp độ AI.
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bot number selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Số lượng Bot tham gia:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 1, label: '1 Bot', sub: 'Bàn 2 người' },
                { count: 2, label: '2 Bot', sub: 'Bàn 3 người' },
                { count: 3, label: '3 Bot', sub: 'Bàn 4 người' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.count}
                  onClick={() => setBotCount(opt.count)}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                    botCount === opt.count
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                      : 'bg-neutral-800/80 border-[#383838] text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  <div className="font-bold text-sm">{opt.label}</div>
                  <div className="text-[10px] text-neutral-300/80">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Độ khó Bot:
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'mixed', label: 'Hỗn hợp' },
                { id: 'easy', label: 'Dễ' },
                { id: 'medium', label: 'Vừa' },
                { id: 'hard', label: 'Khó' },
              ].map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => setDifficulty(d.id as any)}
                  className={`py-1.5 px-2 rounded-lg border font-semibold transition-all ${
                    difficulty === d.id
                      ? 'bg-white text-black border-white'
                      : 'bg-neutral-800 border-[#383838] text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{loading ? 'Đang vào bàn...' : 'Vào bàn chơi ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
