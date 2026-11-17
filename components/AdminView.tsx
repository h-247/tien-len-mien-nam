'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  History,
  Settings,
  AlertTriangle,
  Lock,
  Unlock,
  Edit,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'players' | 'rooms' | 'matches' | 'audit' | 'settings'>('registrations');
  const [stats, setStats] = useState<any>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Balance adjustment modal state
  const [adjustModalUser, setAdjustModalUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100000);
  const [adjustReason, setAdjustReason] = useState<string>('');

  const handleSeedAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      const data = (await res.json()) as any;
      if (res.ok) {
        setMessage({ type: 'success', text: `Nạp thành công ${data.total || 13} tài khoản mẫu vào hệ thống!` });
        await loadData();
      } else {
        throw new Error(data.error || 'Nạp tài khoản thất bại.');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'registrations') {
        const [overviewRes, regRes] = await Promise.all([
          fetch('/api/admin/overview'),
          fetch('/api/admin/registrations'),
        ]);
        if (overviewRes.ok) setStats((await overviewRes.json()) as any);
        if (regRes.ok) {
          const data = (await regRes.json()) as any;
          setPendingRegistrations(data.registrations || []);
        }
      }

      if (activeTab === 'players') {
        const res = await fetch('/api/admin/players');
        if (res.ok) {
          const data = (await res.json()) as any;
          setPlayers(data.players || []);
        }
      }

      if (activeTab === 'rooms') {
        const res = await fetch('/api/admin/rooms');
        if (res.ok) {
          const data = (await res.json()) as any;
          setRooms(data.rooms || []);
        }
      }

      if (activeTab === 'matches') {
        const res = await fetch('/api/admin/matches');
        if (res.ok) {
          const data = (await res.json()) as any;
          setMatches(data.matches || []);
        }
      }

      if (activeTab === 'audit') {
        const res = await fetch('/api/admin/audit-logs');
        if (res.ok) {
          const data = (await res.json()) as any;
          setAuditLogs(data.logs || []);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleRegistrationAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      let rejectionReason = '';
      if (action === 'reject') {
        const reason = window.prompt('Nhập lý do từ chối đăng ký:');
        if (reason === null) return;
        rejectionReason = reason;
      }

      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, rejectionReason }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Thất bại');
      setMessage({ type: 'success', text: data.message });
      loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handlePlayerStatus = async (userId: string, action: 'suspend' | 'reactivate') => {
    try {
      let reason = '';
      if (action === 'suspend') {
        const r = window.prompt('Nhập lý do khóa tài khoản:');
        if (r === null) return;
        reason = r;
      }

      const res = await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, reason }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Thất bại');
      setMessage({ type: 'success', text: data.message });
      loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalUser || !adjustReason.trim()) return;

    try {
      const res = await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjustBalance',
          userId: adjustModalUser.id,
          amount: Number(adjustAmount),
          reason: adjustReason.trim(),
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Thất bại');
      setMessage({ type: 'success', text: data.message });
      setAdjustModalUser(null);
      setAdjustReason('');
      loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Admin Header */}
      <div className="bg-[#262626] border border-red-900/40 p-5 sm:p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Trung tâm Quản trị Hệ thống
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Duyệt người chơi, kiểm soát số dư ảo, giám sát phòng đấu và nhật ký kiểm toán bất biến.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedAccounts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-xs font-semibold text-emerald-300 border border-emerald-800/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Nạp tài khoản mẫu (Seed)</span>
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-neutral-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border-red-800 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex overflow-x-auto gap-1 bg-[#1A1A1A] p-1 rounded-xl border border-[#383838] no-scrollbar">
        {[
          { id: 'registrations', label: `Duyệt người chơi (${pendingRegistrations.length})` },
          { id: 'players', label: 'Quản lý người chơi' },
          { id: 'rooms', label: 'Giám sát phòng' },
          { id: 'matches', label: 'Lịch sử ván đấu' },
          { id: 'audit', label: 'Nhật ký kiểm toán' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PENDING REGISTRATIONS */}
      {activeTab === 'registrations' && (
        <div className="bg-[#262626] border border-[#383838] rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-[#383838] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Danh sách hồ sơ chờ Quản trị viên duyệt ({pendingRegistrations.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1A1A1A] text-neutral-400 border-b border-[#383838]">
                <tr>
                  <th className="py-2.5 px-3">Tên hiển thị</th>
                  <th className="py-2.5 px-3">Email đăng ký</th>
                  <th className="py-2.5 px-3">Giới thiệu</th>
                  <th className="py-2.5 px-3">Thời gian gửi</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#383838]">
                {pendingRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400">
                      Không có hồ sơ nào đang chờ duyệt.
                    </td>
                  </tr>
                ) : (
                  pendingRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-neutral-800/40 text-neutral-300">
                      <td className="py-3 px-3 font-bold text-white">
                        {reg.displayName}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-400">
                        {reg.email}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-neutral-400">
                        {reg.bio || '—'}
                      </td>
                      <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                        {new Date(reg.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleRegistrationAction(reg.id, 'approve')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleRegistrationAction(reg.id, 'reject')}
                          className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 font-semibold text-xs border border-red-800"
                        >
                          Từ chối
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PLAYERS MANAGEMENT */}
      {activeTab === 'players' && (
        <div className="bg-[#262626] border border-[#383838] rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-[#383838]">
            <h2 className="text-sm font-bold text-white">
              Tất cả tài khoản người chơi ({players.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1A1A1A] text-neutral-400 border-b border-[#383838]">
                <tr>
                  <th className="py-2.5 px-3">Tên & Email</th>
                  <th className="py-2.5 px-3">Vai trò</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Số dư ảo</th>
                  <th className="py-2.5 px-3 text-right">Thành tích</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#383838]">
                {players.map((p) => {
                  const isSuspended = p.status === 'suspended';
                  const isApproved = p.status === 'approved';

                  return (
                    <tr key={p.id} className="hover:bg-neutral-800/40 text-neutral-300">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{p.displayName}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{p.email}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.role === 'admin' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {p.role === 'admin' ? 'Quản trị viên' : 'Người chơi'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300'
                            : p.status === 'pending'
                            ? 'bg-amber-950 text-amber-300'
                            : p.status === 'suspended'
                            ? 'bg-red-950 text-red-300'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {p.status === 'approved' ? 'Đã duyệt' : p.status === 'pending' ? 'Chờ duyệt' : p.status === 'suspended' ? 'Tạm khóa' : p.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {p.balance.toLocaleString('vi-VN')} ₫
                      </td>

                      <td className="py-3 px-3 text-right text-neutral-400">
                        {p.matchesPlayed} ván ({p.matchesWon} thắng)
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => setAdjustModalUser(p)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700"
                        >
                          Chỉnh số dư
                        </button>

                        {isSuspended ? (
                          <button
                            onClick={() => handlePlayerStatus(p.id, 'reactivate')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs border border-emerald-800"
                          >
                            Mở khóa
                          </button>
                        ) : isApproved && p.role !== 'admin' ? (
                          <button
                            onClick={() => handlePlayerStatus(p.id, 'suspend')}
                            className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 text-xs border border-red-900"
                          >
                            Khóa
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROOMS MONITORING */}
      {activeTab === 'rooms' && (
        <div className="bg-[#262626] border border-[#383838] rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-[#383838]">
            <h2 className="text-sm font-bold text-white">
              Tất cả phòng chơi ({rooms.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1A1A1A] text-neutral-400 border-b border-[#383838]">
                <tr>
                  <th className="py-2.5 px-3">Mã phòng</th>
                  <th className="py-2.5 px-3">Tên phòng</th>
                  <th className="py-2.5 px-3">Chủ phòng</th>
                  <th className="py-2.5 px-3 text-right">Mức cược</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Số người</th>
                  <th className="py-2.5 px-3">Thời gian tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#383838]">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-800/40 text-neutral-300">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {r.code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      {r.name}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400">
                      {r.hostDisplayName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                      {r.stake.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'playing' ? 'bg-blue-950 text-blue-300' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {r.status === 'playing' ? 'Đang đấu' : r.status === 'waiting' ? 'Chờ' : r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {r.seatCount}/4
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MATCHES & SETTLEMENTS */}
      {activeTab === 'matches' && (
        <div className="bg-[#262626] border border-[#383838] rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-[#383838]">
            <h2 className="text-sm font-bold text-white">
              Lịch sử kết toán các ván đấu ({matches.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1A1A1A] text-neutral-400 border-b border-[#383838]">
                <tr>
                  <th className="py-2.5 px-3">Ván ID</th>
                  <th className="py-2.5 px-3">Phòng</th>
                  <th className="py-2.5 px-3 text-right">Mức cược</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3">Kết quả</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#383838]">
                {matches.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-800/40 text-neutral-300">
                    <td className="py-2.5 px-3 font-mono text-white">
                      #{m.id.split('_').pop()}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300">
                      {m.roomName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                      {m.stake.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">
                        {m.status === 'finished' ? 'Hoàn thành' : 'Đang chơi'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400">
                      {m.instantWinType ? (
                        <span className="text-yellow-400 font-bold">Tới trắng</span>
                      ) : m.rankPositions?.length > 0 ? (
                        <span>Ghế #{m.rankPositions[0] + 1} về Nhất</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-[#262626] border border-[#383838] rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-[#383838]">
            <h2 className="text-sm font-bold text-white">
              Nhật ký kiểm toán Quản trị viên ({auditLogs.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1A1A1A] text-neutral-400 border-b border-[#383838]">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Quản trị viên</th>
                  <th className="py-2.5 px-3">Hành động</th>
                  <th className="py-2.5 px-3">Đối tượng</th>
                  <th className="py-2.5 px-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#383838]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/40 text-neutral-300">
                    <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-white">
                      {log.adminEmail}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400 font-mono">
                      {log.targetType}:{log.targetId}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST PLAYER BALANCE */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#262626] border border-[#383838] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Điều chỉnh số dư: {adjustModalUser.displayName}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Số dư hiện tại: <strong className="text-emerald-400">{adjustModalUser.balance.toLocaleString('vi-VN')} ₫</strong>
            </p>

            <form onSubmit={handleAdjustBalanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Số tiền thay đổi (VND, số âm để trừ)
                </label>
                <input
                  type="number"
                  required
                  step={1000}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-[#1A1A1A] border border-[#383838] rounded-lg px-3 py-2 text-sm text-white font-mono"
                  placeholder="+100000 hoặc -50000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Lý do điều chỉnh (Bắt buộc ghi nhận sổ cái & kiểm toán) <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="VD: Đền bù lỗi mạng ván 12, quà tặng sự kiện..."
                  className="w-full bg-[#1A1A1A] border border-[#383838] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalUser(null)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!adjustReason.trim() || adjustAmount === 0}
                  className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 disabled:opacity-50"
                >
                  Xác nhận điều chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
