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
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [signingInId, setSigningInId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'player' | 'admin' | 'pending'>('all');
  const [search, setSearch] = useState('');

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/accounts');
      const data = (await res.json()) as any;
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const handleSignInAs = async (acc: AccountItem) => {
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
    <div className="min-h-screen bg-[#212121] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#262626] border border-[#383838] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        {/* Brand */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white text-black font-black flex items-center justify-center text-3xl shadow-xl mx-auto mb-3">
            TL
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tiến Lên Miền Nam Online
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Chọn tài khoản để đăng nhập hoặc thêm tài khoản mới để bắt đầu
          </p>
        </div>

        {/* Filter Pills & Seed Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
              }`}
            >
              Tất cả ({accounts.length})
            </button>
            <button
              onClick={() => setFilter('player')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                filter === 'player'
                  ? 'bg-white text-black'
                  : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
              }`}
            >
              🎮 Người chơi
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                filter === 'admin'
                  ? 'bg-red-950/80 text-red-300 border border-red-800'
                  : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
              }`}
            >
              🛡️ Admin
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                filter === 'pending'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  : 'bg-[#1A1A1A] text-neutral-400 hover:text-white border border-[#383838]'
              }`}
            >
              ⏳ Chờ duyệt
            </button>
          </div>

          <button
            onClick={handleSeedAccounts}
            disabled={seeding}
            title="Nạp lại danh sách tài khoản mẫu"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold border border-[#383838] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Đang nạp...' : 'Nạp mẫu (Seed)'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hiển thị, ID hoặc email..."
            className="w-full bg-[#1A1A1A] border border-[#383838] rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Account List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 px-1 mb-1">
            <span>Danh sách hiển thị ({filteredAccounts.length})</span>
            <button
              onClick={() => setAddModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Thêm tài khoản mới</span>
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
            {loading ? (
              <div className="py-12 text-center text-xs text-neutral-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-500" />
                Đang tải danh sách tài khoản...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 bg-[#1A1A1A] rounded-2xl border border-dashed border-[#383838]">
                Không tìm thấy tài khoản phù hợp.
                <div className="mt-2">
                  <button
                    onClick={handleSeedAccounts}
                    className="text-xs text-emerald-400 hover:underline font-bold"
                  >
                    Bấm vào đây để nạp tài khoản mẫu (Seed)
                  </button>
                </div>
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
                    onClick={() => handleSignInAs(acc)}
                    disabled={isSigningIn}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1A1A1A] hover:bg-neutral-800 border border-[#383838] hover:border-neutral-500 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
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
                          <Shield className="w-5 h-5 text-red-400" />
                        ) : isPending ? (
                          <Clock className="w-5 h-5 text-amber-400" />
                        ) : isSuspended ? (
                          <AlertTriangle className="w-5 h-5 text-neutral-500" />
                        ) : (
                          acc.displayName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">
                            {acc.displayName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isAdmin
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {isAdmin ? 'Admin' : 'Player'}
                          </span>
                          {isPending && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              Chờ duyệt
                            </span>
                          )}
                          {isSuspended && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-500 border border-neutral-700">
                              Tạm khóa
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-emerald-400 font-semibold">
                            {acc.balance.toLocaleString('vi-VN')} ₫
                          </span>
                          <span>•</span>
                          <span className="truncate">{acc.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pl-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-white group-hover:bg-neutral-200 text-black font-bold text-xs shadow-sm flex items-center gap-1">
                        <span>{isSigningIn ? '...' : 'Vào'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2 border-t border-[#383838]">
          <button
            onClick={() => setAddModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm border border-[#383838] transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Thêm tài khoản người chơi mới</span>
          </button>

          <a
            href="/signin-with-chatgpt?return_to=/"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1A1A1A] hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-medium border border-[#383838] transition-colors"
          >
            <span>Hoặc đăng nhập trực tiếp qua ChatGPT OAuth</span>
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
