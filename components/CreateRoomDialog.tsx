'use client';

import React, { useState } from 'react';
import { X, PlusCircle, Coins, Lock, Globe } from 'lucide-react';

interface CreateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

const STAKE_PRESETS = [1000, 2000, 3000, 5000, 10000];

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [stake, setStake] = useState(1000);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          stake: Number(stake),
          visibility,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Tạo phòng thất bại.');
      onCreated(data.roomId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#262626] border border-[#383838] rounded-2xl shadow-2xl p-5 sm:p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1 rounded-lg"
          aria-label="Đóng hộp thoại"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
          Tạo phòng đấu mới
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Tên phòng chơi <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tiến Lên vui vẻ, Bàn cược 20k..."
              maxLength={40}
              className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>Mức cược ván đấu (VND)</span>
              <span className="text-amber-400 font-bold">
                {stake.toLocaleString('vi-VN')} ₫
              </span>
            </label>

            {/* Presets */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2.5">
              {STAKE_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStake(amt)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    stake === amt
                      ? 'bg-amber-400 text-black border-amber-400'
                      : 'bg-[#1A1A1A] text-neutral-300 border-[#383838] hover:border-neutral-500'
                  }`}
                >
                  {(amt / 1000).toLocaleString('vi-VN')}k
                </button>
              ))}
            </div>

            <input
              type="number"
              min={500}
              max={10000}
              step={500}
              value={stake}
              onChange={(e) => setStake(Math.min(10000, Math.max(500, Number(e.target.value))))}
              className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Chế độ hiển thị phòng
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                  visibility === 'public'
                    ? 'bg-neutral-800 text-white border-white'
                    : 'bg-[#1A1A1A] text-neutral-400 border-[#383838]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Công khai</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                  visibility === 'private'
                    ? 'bg-neutral-800 text-white border-white'
                    : 'bg-[#1A1A1A] text-neutral-400 border-[#383838]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Riêng tư (Mã phòng)</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold text-white border border-[#383838] transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{loading ? 'Đang tạo...' : 'Tạo phòng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
