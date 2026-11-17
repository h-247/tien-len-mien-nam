'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Play, User, Coins, Check, ArrowRight, Sparkles } from 'lucide-react';
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
  const [signingInId, setSigningInId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#212121] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#262626] border border-[#383838] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
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

        {/* Account Selector List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 px-1 mb-1">
            <span>Danh sách tài khoản ({accounts.length})</span>
            <button
              onClick={() => setAddModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Thêm tài khoản</span>
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 no-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                Đang tải danh sách tài khoản...
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                Chưa có tài khoản. Hãy bấm thêm tài khoản mới.
              </div>
            ) : (
              accounts.map((acc) => {
                const isAdmin = acc.role === 'admin';
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
                            : 'bg-neutral-800 text-white border border-neutral-700'
                        }`}
                      >
                        {isAdmin ? <Shield className="w-5 h-5 text-red-400" /> : acc.displayName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {acc.displayName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isAdmin ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {isAdmin ? 'Admin' : 'Player'}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-semibold">
                            {acc.balance.toLocaleString('vi-VN')} ₫
                          </span>
                          <span>•</span>
                          <span className="truncate">{acc.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pl-2">
                      <span className="px-3 py-1.5 rounded-xl bg-white group-hover:bg-neutral-200 text-black font-bold text-xs shadow-sm flex items-center gap-1 shrink-0">
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
