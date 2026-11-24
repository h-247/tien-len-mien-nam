'use client';

import React, { useState, useEffect } from 'react';
import { AuthenticatedUser } from '@/lib/server/auth';
import {
  Trophy,
  Users,
  Wallet,
  BookOpen,
  Shield,
  LogOut,
  Menu,
  X,
  RefreshCw,
  PlusCircle,
  Bot,
  UserPlus,
} from 'lucide-react';

interface AccountOption {
  id: string;
  displayName: string;
  role: string;
  balance: number;
}

interface NavbarProps {
  user: AuthenticatedUser | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh?: () => void;
  onCreateRoomClick?: () => void;
  onPlayWithBots?: () => void;
  onAddAccountClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onRefresh,
  onCreateRoomClick,
  onPlayWithBots,
  onAddAccountClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingUser, setSwitchingUser] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  useEffect(() => {
    fetch('/api/auth/accounts')
      .then((res) => res.json())
      .then((data: any) => {
        if (data.accounts) {
          setAccounts(data.accounts);
        }
      })
      .catch(() => {});
  }, []);

  const formatVND = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  const handleDevSwitch = async (targetId: string, role?: string, displayName?: string) => {
    setSwitchingUser(true);
    try {
      await fetch('/api/dev/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetId, role, displayName }),
      });
      window.location.reload();
    } finally {
      setSwitchingUser(false);
    }
  };

  const handleSignOut = async () => {
    setSwitchingUser(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      window.location.reload();
    } finally {
      setSwitchingUser(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#383838] bg-[#212121]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('lobby')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black font-extrabold shadow-sm">
              TL
            </div>
            <div>
              <span className="block text-sm sm:text-base font-bold text-[#ECECEC] tracking-tight">
                Tiến Lên Miền Nam
              </span>
              <span className="block text-[10px] text-neutral-400 font-medium">
                Đấu Bài & AI Bot
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => onTabChange('lobby')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'lobby'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Phòng chơi</span>
          </button>

          <button
            onClick={() => onTabChange('leaderboard')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Bảng xếp hạng</span>
          </button>

          <button
            onClick={() => onTabChange('wallet')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'wallet'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Lịch sử ví</span>
          </button>

          <button
            onClick={() => onTabChange('rules')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'rules'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Luật chơi</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => onTabChange('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'admin'
                  ? 'bg-red-950/60 text-red-300 font-semibold border border-red-800/50'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Quản trị</span>
            </button>
          )}
        </nav>

        {/* User Balance & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user?.status === 'approved' && user.wallet && (
            <div className="flex items-center gap-1.5 rounded-full bg-[#1A1A1A] border border-[#383838] px-3 py-1.5 text-xs sm:text-sm font-semibold text-emerald-400">
              <span className="text-neutral-500 font-normal hidden sm:inline">Ví:</span>
              <span>{formatVND(user.wallet.balance)}</span>
            </div>
          )}

          {user?.status === 'approved' && user?.role === 'admin' && onPlayWithBots && (
            <button
              onClick={onPlayWithBots}
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-purple-500 transition-colors shadow-sm"
            >
              <Bot className="w-4 h-4" />
              <span>Chơi với Bot</span>
            </button>
          )}

          {user?.status === 'approved' && onCreateRoomClick && (
            <button
              onClick={onCreateRoomClick}
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-black hover:bg-neutral-200 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo phòng</span>
            </button>
          )}

          {/* Dev Switcher & Add Account */}
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Chuyển tài khoản đăng nhập"
              disabled={switchingUser}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__add_new__') {
                  onAddAccountClick?.();
                  return;
                }
                if (val === '__sign_out__') {
                  handleSignOut();
                  return;
                }
                const found = accounts.find((a) => a.id === val);
                if (found) {
                  handleDevSwitch(found.id, found.role, found.displayName);
                } else if (val) {
                  handleDevSwitch(val);
                }
              }}
              value={user?.id || ''}
              className="text-xs bg-[#1A1A1A] text-neutral-300 border border-[#383838] rounded-md px-2 py-1.5 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
            >
              {accounts.length > 0 ? (
                <optgroup label="Tài khoản">
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.role === 'admin' ? '🛡️' : '🎮'} {acc.displayName}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="Tài khoản mặc định">
                  <option value="local_seedy">🛡️ Admin (Seedy)</option>
                  <option value="player1">🎮 Nguyễn Văn A</option>
                  <option value="player2">🎮 Trần Thị B</option>
                  <option value="player3">🎮 Lê Văn C</option>
                  <option value="player4">🎮 Phạm Thị D</option>
                </optgroup>
              )}
              <optgroup label="Thao tác">
                <option value="__add_new__">➕ Đăng ký tài khoản mới (Chờ duyệt)...</option>
                <option value="__sign_out__">🚪 Đăng xuất / Đổi tài khoản...</option>
              </optgroup>
            </select>

            {onAddAccountClick && (
              <button
                onClick={onAddAccountClick}
                title="Đăng ký tài khoản mới có mật khẩu để Quản trị viên duyệt"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 transition-colors text-xs font-semibold"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">+ Đăng ký duyệt</span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              title="Đăng xuất tài khoản"
              className="p-1.5 rounded-md bg-[#1A1A1A] hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border border-[#383838] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile menu toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 focus:outline-none"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#383838] bg-[#262626] px-4 py-3 space-y-2">
          {user?.status === 'approved' && user?.role === 'admin' && onPlayWithBots && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onPlayWithBots();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500 mb-2 transition-colors"
            >
              <Bot className="w-4 h-4" />
              <span>Chơi với Bot</span>
            </button>
          )}

          {user?.status === 'approved' && onCreateRoomClick && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onCreateRoomClick();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-neutral-200 mb-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo phòng mới</span>
            </button>
          )}

          <button
            onClick={() => {
              onTabChange('lobby');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
              activeTab === 'lobby' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Phòng chơi</span>
          </button>

          <button
            onClick={() => {
              onTabChange('leaderboard');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
              activeTab === 'leaderboard' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-300'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Bảng xếp hạng</span>
          </button>

          <button
            onClick={() => {
              onTabChange('wallet');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
              activeTab === 'wallet' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-300'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Lịch sử ví</span>
          </button>

          <button
            onClick={() => {
              onTabChange('rules');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
              activeTab === 'rules' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Luật chơi</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => {
                onTabChange('admin');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-red-400 ${
                activeTab === 'admin' ? 'bg-red-950/60 font-semibold' : ''
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Quản trị hệ thống</span>
            </button>
          )}

          {onAddAccountClick && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onAddAccountClick();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-amber-400 hover:bg-neutral-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Thêm tài khoản mới</span>
            </button>
          )}

          <div className="pt-2 border-t border-neutral-700">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-neutral-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất / Đổi tài khoản</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
