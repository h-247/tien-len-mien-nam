'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  Play,
  User,
  Coins,
  Check,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  Clock,
  AlertTriangle,
  Lock,
  KeyRound,
  Mail,
  UserCheck,
} from 'lucide-react';
import { AddAccountModal } from './AddAccountModal';

interface AccountItem {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  balance: number;
}

interface SignInViewProps {
  onSignedIn: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({ onSignedIn }) => {
  // Mode: 'signup' | 'signin' | 'quick'
  const [authMode, setAuthMode] = useState<'signup' | 'signin' | 'quick'>('signup');

  // Quick account switcher state
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [signingInId, setSigningInId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'player' | 'admin' | 'pending'>('all');
  const [search, setSearch] = useState('');

  // Sign up form state
  const [suUsername, setSuUsername] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirmPassword, setSuConfirmPassword] = useState('');
  const [suDisplayName, setSuDisplayName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suBio, setSuBio] = useState('');
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState<string | null>(null);
  const [suSuccess, setSuSuccess] = useState<string | null>(null);

  // Sign in form state
  const [siIdentifier, setSiIdentifier] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await fetch('/api/auth/accounts');
      const data = (await res.json()) as any;
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSeedAccounts = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      if (res.ok) {
        await fetchAccounts();
      }
    } catch (e) {
      console.error('Seed error:', e);
    } finally {
      setSeeding(false);
    }
  };

  const handleQuickSignIn = async (acc: AccountItem) => {
    try {
      setSigningInId(acc.id);
      const res = await fetch('/api/dev/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: acc.id,
          role: acc.role,
          displayName: acc.displayName,
        }),
      });
      if (res.ok) {
        onSignedIn();
        window.location.reload();
      }
    } finally {
      setSigningInId(null);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError(null);
    setSuSuccess(null);

    if (suPassword !== suConfirmPassword) {
      setSuError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (suPassword.length < 6) {
      setSuError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      setSuLoading(true);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: suUsername.trim(),
          password: suPassword,
          displayName: suDisplayName.trim(),
          email: suEmail.trim() || undefined,
          bio: suBio.trim() || undefined,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(data.error || 'Đăng ký không thành công.');
      }

      setSuSuccess(data.message || 'Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => {
        onSignedIn();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setSuError(err.message);
    } finally {
      setSuLoading(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiError(null);

    try {
      setSiLoading(true);
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: siIdentifier.trim(),
          password: siPassword,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập không thành công.');
      }

      onSignedIn();
      window.location.reload();
    } catch (err: any) {
      setSiError(err.message);
    } finally {
      setSiLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (filter === 'player' && acc.role !== 'player') return false;
    if (filter === 'admin' && acc.role !== 'admin') return false;
    if (filter === 'pending' && acc.status !== 'pending') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        acc.displayName.toLowerCase().includes(q) ||
        acc.id.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#212121] flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-xl bg-[#262626] border border-[#383838] rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5">
        {/* Brand */}
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white text-black font-black flex items-center justify-center text-2xl sm:text-3xl shadow-xl mx-auto mb-2.5 sm:mb-3">
            TL
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Tiến Lên Miền Nam Online
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
            Hệ thống đấu bài trực tuyến chuẩn miền Nam. Đăng ký tài khoản để Quản trị viên duyệt tham gia.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#1A1A1A] p-1 rounded-2xl border border-[#383838]">
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signup'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng ký duyệt</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('signin')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signin'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('quick')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'quick'
                ? 'bg-neutral-800 text-white shadow-md border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-red-400" />
            <span>Tài khoản mẫu</span>
          </button>
        </div>

        {/* TAB 1: SIGN UP WITH PASSWORD (FOR ADMIN APPROVAL) */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-300">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold">Quy trình duyệt hồ sơ:</span> Sau khi gửi đăng ký, tài khoản sẽ ở trạng thái <strong className="underline">Chờ duyệt</strong>. Quản trị viên sẽ kiểm tra và kích hoạt để bạn vào phòng đấu cùng bạn bè hoặc luyện tập với AI Bot.
              </div>
            </div>

            {suError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-900 text-xs text-red-300">
                {suError}
              </div>
            )}

            {suSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-900 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{suSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tên đăng nhập <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={suUsername}
                  onChange={(e) => setSuUsername(e.target.value)}
                  placeholder="VD: vuanam99"
                  minLength={3}
                  maxLength={30}
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
                  value={suDisplayName}
                  onChange={(e) => setSuDisplayName(e.target.value)}
                  placeholder="VD: Hoàng Nam (Thần Bài)"
                  minLength={2}
                  maxLength={30}
                  className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Mật khẩu <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  minLength={6}
                  className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Xác nhận mật khẩu <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={suConfirmPassword}
                  onChange={(e) => setSuConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  minLength={6}
                  className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Email liên hệ (tùy chọn)
              </label>
              <input
                type="email"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                placeholder="VD: user@example.com"
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Lời giới thiệu gửi Quản trị viên (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={suBio}
                onChange={(e) => setSuBio(e.target.value)}
                placeholder="VD: Người chơi đam mê Tiến Lên Miền Nam, cam kết tuân thủ quy chế phòng chơi..."
                maxLength={250}
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={suLoading}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{suLoading ? 'Đang gửi hồ sơ...' : 'Đăng ký tài khoản (Gửi Quản trị viên duyệt)'}</span>
            </button>
          </form>
        )}

        {/* TAB 2: SIGN IN WITH USERNAME & PASSWORD */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="space-y-3.5">
            {siError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-900 text-xs text-red-300">
                {siError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tên đăng nhập hoặc Email
              </label>
              <input
                type="text"
                required
                value={siIdentifier}
                onChange={(e) => setSiIdentifier(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email..."
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={siPassword}
                onChange={(e) => setSiPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={siLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{siLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: QUICK TEST ACCOUNTS */}
        {authMode === 'quick' && (
          <div className="space-y-3">
            {/* Filter Pills & Seed Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    filter === 'all'
                      ? 'bg-white text-black'
                      : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
                  }`}
                >
                  Tất cả ({accounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('player')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    filter === 'player'
                      ? 'bg-white text-black'
                      : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
                  }`}
                >
                  🎮 Người chơi
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('admin')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    filter === 'admin'
                      ? 'bg-red-950/80 text-red-300 border border-red-800'
                      : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
                  }`}
                >
                  🛡️ Admin
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    filter === 'pending'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
                  }`}
                >
                  ⏳ Chờ duyệt
                </button>
              </div>

              <button
                type="button"
                onClick={handleSeedAccounts}
                disabled={seeding}
                title="Nạp lại danh sách tài khoản mẫu"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1A1A] hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold border border-[#383838] transition-colors"
              >
                <RefreshCw className={`w-3 h-3 text-emerald-400 ${seeding ? 'animate-spin' : ''}`} />
                <span>{seeding ? 'Đang nạp...' : 'Nạp mẫu (Seed)'}</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hiển thị, ID hoặc email..."
                className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Account List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
              {loadingAccounts ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-neutral-500" />
                  Đang tải danh sách tài khoản...
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400 bg-[#1A1A1A] rounded-xl border border-dashed border-[#383838]">
                  Không tìm thấy tài khoản phù hợp.
                </div>
              ) : (
                filteredAccounts.map((acc) => {
                  const isAdmin = acc.role === 'admin';
                  const isPending = acc.status === 'pending';
                  const isSuspended = acc.status === 'suspended';
                  const isSigningIn = signingInId === acc.id;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleQuickSignIn(acc)}
                      disabled={isSigningIn}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#1A1A1A] hover:bg-neutral-800 border border-[#383838] hover:border-neutral-500 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                            isAdmin
                              ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                              : isPending
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                              : isSuspended
                              ? 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                              : 'bg-neutral-800 text-white border border-neutral-700'
                          }`}
                        >
                          {isAdmin ? (
                            <Shield className="w-4 h-4 text-red-400" />
                          ) : isPending ? (
                            <Clock className="w-4 h-4 text-amber-400" />
                          ) : isSuspended ? (
                            <AlertTriangle className="w-4 h-4 text-neutral-500" />
                          ) : (
                            acc.displayName.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-white truncate">
                              {acc.displayName}
                            </span>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                                isAdmin
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {isAdmin ? 'Admin' : 'Player'}
                            </span>
                            {isPending && (
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                Chờ duyệt
                              </span>
                            )}
                            {isSuspended && (
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-500 border border-neutral-700">
                                Tạm khóa
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-emerald-400 font-semibold">
                              {acc.balance.toLocaleString('vi-VN')} ₫
                            </span>
                            <span>•</span>
                            <span className="truncate">{acc.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pl-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-white group-hover:bg-neutral-200 text-black font-bold text-[11px] shadow-sm flex items-center gap-1">
                          <span>{isSigningIn ? '...' : 'Vào'}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-[#383838] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Thêm nhanh tài khoản test</span>
            </button>
          </div>
        )}

        {/* Footer info / ChatGPT OAuth */}
        <div className="pt-2 border-t border-[#383838] text-center">
          <a
            href="/signin-with-chatgpt?return_to=/"
            className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors underline"
          >
            Đăng nhập qua ChatGPT OAuth
          </a>
        </div>
      </div>

      <AddAccountModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          fetchAccounts();
          onSignedIn();
          window.location.reload();
        }}
      />
    </div>
  );
};
