'use client';

import React, { useState } from 'react';
import { X, UserPlus, Shield, Coins, Sparkles, KeyRound, Clock, Check } from 'lucide-react';

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
  const [tab, setTab] = useState<'signup' | 'quick'>('signup');

  // Sign up with password state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  // Quick dev account state
  const [quickRole, setQuickRole] = useState<'player' | 'admin'>('player');
  const [quickBalance, setQuickBalance] = useState<number>(1000000);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Đăng ký không thành công.');

      setSuccessMsg('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => {
        onSuccess(data.user?.id);
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
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
          role: quickRole,
          balance: Number(quickBalance),
          status: 'approved',
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Thêm tài khoản thất bại.');

      onSuccess(data.user?.id);
      onClose();
      window.location.reload();
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

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Đăng ký & Thêm tài khoản</h2>
            <p className="text-xs text-neutral-400">Đăng ký tài khoản mới để Quản trị viên phê duyệt</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 bg-[#1A1A1A] p-1 rounded-xl border border-[#383838] mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'signup'
                ? 'bg-amber-400 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đăng ký có mật khẩu</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('quick');
              setError(null);
            }}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'quick'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span>Tạo nhanh (Test)</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 mb-3 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 mb-3 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-xs text-emerald-300 flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'signup' ? (
          <form onSubmit={handleSignUpSubmit} className="space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-300 flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span>Tài khoản đăng ký sẽ ở trạng thái <strong>Chờ duyệt</strong>. Quản trị viên sẽ phê duyệt trước khi tham gia thi đấu.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tên đăng nhập <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: minh_tuan88"
                minLength={3}
                maxLength={30}
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Mật khẩu đăng nhập <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                minLength={6}
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tên hiển thị trong game <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Minh Tuấn (Hải Phòng)"
                minLength={2}
                maxLength={30}
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Email liên hệ (tùy chọn)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: tuan@example.com"
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Lời giới thiệu gửi Quản trị viên (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Giới thiệu bản thân, cam kết tuân thủ luật chơi..."
                maxLength={250}
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-[#383838] transition-colors"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={loading || !username.trim() || !displayName.trim() || !password}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{loading ? 'Đang gửi...' : 'Gửi đăng ký duyệt'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleQuickSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tên hiển thị <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Tuấn Poker..."
                minLength={2}
                maxLength={30}
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Vai trò
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickRole('player')}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-colors ${
                    quickRole === 'player'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#1A1A1A] text-neutral-400 border-[#383838]'
                  }`}
                >
                  🎮 Người chơi
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRole('admin')}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-colors ${
                    quickRole === 'admin'
                      ? 'bg-red-950/60 text-red-300 border-red-800'
                      : 'bg-[#1A1A1A] text-neutral-400 border-[#383838]'
                  }`}
                >
                  🛡️ Quản trị viên
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                <span>Số dư ban đầu</span>
                <span className="text-amber-400 font-bold">{quickBalance.toLocaleString('vi-VN')} ₫</span>
              </label>
              <input
                type="number"
                min={0}
                step={100000}
                value={quickBalance}
                onChange={(e) => setQuickBalance(Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-[#383838] transition-colors"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={loading || !displayName.trim()}
                className="flex-1 py-2 px-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{loading ? 'Đang tạo...' : 'Tạo ngay'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
