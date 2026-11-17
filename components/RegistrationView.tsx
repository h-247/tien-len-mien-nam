'use client';

import React, { useState } from 'react';
import { AuthenticatedUser } from '@/lib/server/auth';
import { ShieldAlert, Clock, CheckCircle2, XCircle, ArrowRight, UserPlus, Sparkles } from 'lucide-react';

interface RegistrationViewProps {
  user: AuthenticatedUser | null;
  onSuccess: () => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({ user, onSuccess }) => {
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatarUrl || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, avatarUrl, bio }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(data.error || 'Đăng ký thất bại.');
      }
      setSubmitted(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // State 1: PENDING
  if (user?.status === 'pending' || submitted) {
    return (
      <div className="mx-auto max-w-lg mt-8 sm:mt-16 p-6 sm:p-8 bg-[#262626] border border-[#383838] rounded-2xl shadow-xl text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Hồ sơ đang chờ xét duyệt
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed mb-6">
          Đơn đăng ký tham gia Tiến Lên Miền Nam của bạn đã được tiếp nhận và đang chờ Quản trị viên duyệt.
          Sau khi duyệt, bạn sẽ nhận được <strong>1.000.000 ₫</strong> tiền cược mô phỏng để tham gia mọi phòng đấu.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#383838] text-xs font-semibold text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Trạng thái: Chờ Quản trị viên duyệt</span>
        </div>
        <div className="mt-8 pt-6 border-t border-neutral-700/60">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold text-white border border-neutral-600 transition-colors"
          >
            Làm mới trạng thái
          </button>
        </div>
      </div>
    );
  }

  // State 2: REJECTED
  if (user?.status === 'rejected') {
    return (
      <div className="mx-auto max-w-lg mt-8 sm:mt-16 p-6 sm:p-8 bg-[#262626] border border-red-900/40 rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Đơn đăng ký bị từ chối
          </h2>
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 p-3 rounded-lg mb-4">
            {user.rejectionReason || 'Hồ sơ chưa đạt tiêu chuẩn tham gia phòng chơi.'}
          </p>
          <p className="text-xs text-neutral-400">
            Bạn có thể cập nhật lại thông tin và gửi lại yêu cầu đăng ký dưới đây.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Tên hiển thị <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#383838] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
              placeholder="VD: Cao Thủ 88"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Giới thiệu ngắn
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full bg-[#1A1A1A] border border-[#383838] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors"
              placeholder="Vài câu giới thiệu về bạn..."
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi lại đơn đăng ký'}
          </button>
        </form>
      </div>
    );
  }

  // State 3: SUSPENDED
  if (user?.status === 'suspended') {
    return (
      <div className="mx-auto max-w-lg mt-8 sm:mt-16 p-6 sm:p-8 bg-[#262626] border border-red-900/40 rounded-2xl shadow-xl text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Tài khoản đã bị tạm khóa
        </h2>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          Tài khoản của bạn đã bị Quản trị viên đình chỉ hoạt động. Lý do: <br />
          <span className="inline-block mt-2 font-medium text-red-400 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded">
            {user.rejectionReason || 'Vi phạm nội quy hoặc phát hiện bất thường.'}
          </span>
        </p>
        <p className="text-xs text-neutral-500">
          Vui lòng liên hệ Quản trị viên để được hỗ trợ mở khóa tài khoản.
        </p>
      </div>
    );
  }

  // State 4: NEW (Registration Form)
  return (
    <div className="mx-auto max-w-lg mt-6 sm:mt-12 p-6 sm:p-8 bg-[#262626] border border-[#383838] rounded-2xl shadow-2xl">
      <div className="text-center mb-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center font-extrabold text-2xl shadow-md mb-4">
          TL
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Đăng ký tham gia Tiến Lên Miền Nam
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 leading-relaxed">
          Trở thành người chơi chính thức. Nhận ngay <strong>1.000.000 ₫</strong> tiền ảo mô phỏng sau khi được Quản trị viên phê duyệt.
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-[#383838] rounded-xl p-4 mb-6 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-300 leading-relaxed">
          <strong className="text-white block mb-0.5">Tiền ảo mô phỏng (VND):</strong>
          Trò chơi sử dụng đơn vị Việt Nam Đồng mô phỏng để tính điểm giải trí lành mạnh. Tuyệt đối không quy đổi ra tiền thật hay nạp/rút tiền.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
            Tên hiển thị trong bàn chơi <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#383838] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            placeholder="VD: Tuấn Poker, Thần Bài Nam Định"
            minLength={2}
            maxLength={30}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
            Ảnh đại diện (URL tuỳ chọn)
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#383838] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
            Lời giới thiệu ngắn (tuỳ chọn)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="w-full bg-[#1A1A1A] border border-[#383838] rounded-lg px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            placeholder="VD: Thích chặt heo đỏ, giao lưu vui vẻ không quạo..."
            maxLength={200}
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-900/50">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !displayName.trim()}
          className="w-full mt-3 py-3 px-4 rounded-lg bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <span>Đang gửi hồ sơ...</span>
          ) : (
            <>
              <span>Gửi đơn đăng ký</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
