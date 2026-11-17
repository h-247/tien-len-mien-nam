'use client';

import React, { useState } from 'react';
import { X, UserPlus, Shield, Coins, Sparkles } from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userId?: string) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'player' | 'admin'>('player');
  const [balance, setBalance] = useState<number>(1000000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          role,
          balance: Number(balance),
          status: 'approved',
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Thêm tài khoản thất bại.');

      onSuccess(data.user?.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#262626] border border-[#383838] rounded-2xl shadow-2xl p-5 sm:p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1 rounded-lg"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Thêm tài khoản đăng nhập</h2>
            <p className="text-xs text-neutral-400">Tạo tài khoản mới và đăng nhập tức thì</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Tên hiển thị <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="VD: Tuấn Poker, Thần Bài Nam Định..."
              minLength={2}
              maxLength={30}
              className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Email (tùy chọn)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: user@test.com"
              className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Vai trò tài khoản
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('player')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                  role === 'player'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1A1A1A] text-neutral-400 border-[#383838]'
                }`}
              >
                🎮 Người chơi
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                  role === 'admin'
                    ? 'bg-red-950/60 text-red-300 border-red-800'
                    : 'bg-[#1A1A1A] text-neutral-400 border-[#383838]'
                }`}
              >
                🛡️ Quản trị viên
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>Số dư mô phỏng ban đầu (VND)</span>
              <span className="text-amber-400 font-bold">{balance.toLocaleString('vi-VN')} ₫</span>
            </label>
            <input
              type="number"
              min={0}
              step={100000}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3.5 py-2 text-sm text-white font-mono"
            />
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
              disabled={loading || !displayName.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Đang tạo...' : 'Tạo & Đăng nhập'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
