'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock, ShieldAlert, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  createdAt: number;
}

export const WalletView: React.FC = () => {
  const [data, setData] = useState<{
    balance: number;
    totalWon: number;
    totalLost: number;
    matchesPlayed: number;
    matchesWon: number;
    transactions: Transaction[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/wallet/transactions');
        const d = (await res.json()) as any;
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wallet Summary Card */}
      <div className="bg-[#262626] border border-[#383838] p-5 sm:p-6 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Ví tiền cược mô phỏng (VND)</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-1 font-mono">
              {(data?.balance || 0).toLocaleString('vi-VN')} ₫
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Số dư mô phỏng sử dụng để tham gia các phòng cược Tiến Lên Miền Nam.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            <div className="bg-[#1A1A1A] border border-[#383838] p-3 rounded-xl">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Tổng thắng
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono block mt-0.5">
                +{(data?.totalWon || 0).toLocaleString('vi-VN')} ₫
              </span>
            </div>

            <div className="bg-[#1A1A1A] border border-[#383838] p-3 rounded-xl">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-red-400" />
                Tổng thua
              </span>
              <span className="text-sm font-bold text-red-400 font-mono block mt-0.5">
                -{(data?.totalLost || 0).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Ledger */}
      <div className="bg-[#262626] border border-[#383838] rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 border-b border-[#383838] flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span>Sổ cái giao dịch bất biến</span>
          </h2>
          <span className="text-xs text-neutral-400">
            {data?.transactions?.length || 0} giao dịch gần nhất
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#1A1A1A] text-neutral-400 border-b border-[#383838]">
              <tr>
                <th className="py-2.5 px-3 sm:px-4">Thời gian</th>
                <th className="py-2.5 px-3 sm:px-4">Loại giao dịch</th>
                <th className="py-2.5 px-3 sm:px-4">Mô tả chi tiết</th>
                <th className="py-2.5 px-3 sm:px-4 text-right">Biến động</th>
                <th className="py-2.5 px-3 sm:px-4 text-right">Số dư sau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#383838]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    Đang tải lịch sử giao dịch...
                  </td>
                </tr>
              ) : !data?.transactions || data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    Chưa có giao dịch nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  const dateStr = new Date(tx.createdAt).toLocaleString('vi-VN');

                  let typeLabel = 'Giao dịch';
                  if (tx.type === 'STARTING_GRANT') typeLabel = '🎁 Khởi nghiệp';
                  else if (tx.type === 'MATCH_SETTLEMENT') typeLabel = '🃏 Kết toán ván';
                  else if (tx.type === 'CHOP_BONUS') typeLabel = '💥 Thưởng chặt';
                  else if (tx.type === 'CHOP_PENALTY') typeLabel = '⚠️ Phạt bị chặt';
                  else if (tx.type === 'ADMIN_ADJUSTMENT') typeLabel = '🛡️ Quản trị chỉnh';

                  return (
                    <tr key={tx.id} className="hover:bg-neutral-800/40 text-neutral-300">
                      <td className="py-2.5 px-3 sm:px-4 text-neutral-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-2.5 px-3 sm:px-4 font-semibold text-white whitespace-nowrap">
                        {typeLabel}
                      </td>

                      <td className="py-2.5 px-3 sm:px-4 max-w-xs truncate">
                        {tx.description}
                      </td>

                      <td
                        className={`py-2.5 px-3 sm:px-4 text-right font-mono font-bold whitespace-nowrap ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {tx.amount.toLocaleString('vi-VN')} ₫
                      </td>

                      <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-neutral-200 whitespace-nowrap">
                        {tx.balanceAfter.toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
