'use client';

import React from 'react';
import { BookOpen, ShieldCheck, Flame, AlertTriangle, Trophy, Coins } from 'lucide-react';

export const RulesView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-sm text-neutral-300 leading-relaxed">
      <div className="bg-[#262626] border border-[#383838] p-5 sm:p-6 rounded-2xl shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-yellow-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Luật chơi Tiến Lên Miền Nam chuẩn
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-neutral-400">
          Tài liệu quy định chi tiết luật so bài, chặt hàng, tới trắng và hệ thống tính điểm cược mô phỏng VND.
        </p>
      </div>

      {/* 1. Bộ bài & Độ lớn */}
      <div className="bg-[#262626] border border-[#383838] p-5 rounded-2xl space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>1. Bộ bài và Thứ bậc quân bài</span>
        </h2>
        <p>
          Sử dụng bộ bài Tây chuẩn 52 lá không dùng Joker. Mỗi ván đấu có đúng 4 vị trí ghế (người chơi thực hoặc Bot AI), mỗi vị trí được chia 13 lá.
        </p>
        <div className="bg-[#1A1A1A] border border-[#383838] p-3 rounded-xl space-y-2 text-xs font-mono">
          <div>
            <strong className="text-neutral-400">Thứ tự số (Tăng dần):</strong>{' '}
            <span className="text-amber-400 font-bold">3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; 2</span>
          </div>
          <div>
            <strong className="text-neutral-400">Thứ tự chất (Tăng dần):</strong>{' '}
            <span className="text-white">Bích (♠)</span> &lt;{' '}
            <span className="text-white">Chuồn (♣)</span> &lt;{' '}
            <span className="text-red-400 font-bold">Rô (♦)</span> &lt;{' '}
            <span className="text-red-400 font-bold">Cơ (♥)</span>
          </div>
          <div className="text-neutral-400">
            * Quân bài nhỏ nhất là <strong>3 Bích (3♠)</strong>. Quân bài lớn nhất là <strong>2 Cơ (2♥)</strong>.
          </div>
        </div>
      </div>

      {/* 2. Các tổ hợp hợp lệ */}
      <div className="bg-[#262626] border border-[#383838] p-5 rounded-2xl space-y-3">
        <h2 className="text-base font-bold text-white">2. Các tổ hợp bài hợp lệ</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>
            <strong>Lá rác (Đơn):</strong> 1 quân bài đơn lẻ.
          </li>
          <li>
            <strong>Đôi:</strong> 2 quân bài cùng số (so sánh theo chất của lá bài cao hơn).
          </li>
          <li>
            <strong>Sám cô (Ba lá):</strong> 3 quân bài cùng số.
          </li>
          <li>
            <strong>Sảnh:</strong> 3 hoặc nhiều lá bài liên tiếp về số. <em>Lưu ý: Quân 2 không bao giờ được nằm trong Sảnh. Sảnh cao nhất kết thúc ở A (10-J-Q-K-A).</em>
          </li>
          <li>
            <strong>Tứ quý:</strong> 4 quân bài cùng số.
          </li>
          <li>
            <strong>Ba đôi thông:</strong> 3 đôi liên tiếp nhau về số (VD: 44-55-66). Không chứa 2.
          </li>
          <li>
            <strong>Bốn đôi thông:</strong> 4 đôi liên tiếp nhau về số (VD: 77-88-99-1010). Không chứa 2.
          </li>
        </ul>
      </div>

      {/* 3. Luật chặt Heo & Chặt Hàng */}
      <div className="bg-[#262626] border border-[#383838] p-5 rounded-2xl space-y-3">
        <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>3. Quy tắc Chặt Heo & Chặt Hàng</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#383838]">
            <strong className="text-white block mb-1">Chặt 1 con Heo (2 đơn):</strong>
            <ul className="list-disc pl-4 space-y-1 text-neutral-400">
              <li>Ba đôi thông (trong vòng)</li>
              <li>Tứ quý</li>
              <li>Bốn đôi thông (chặt không cần vòng)</li>
            </ul>
          </div>

          <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#383838]">
            <strong className="text-white block mb-1">Chặt Đôi Heo (2 con 2):</strong>
            <ul className="list-disc pl-4 space-y-1 text-neutral-400">
              <li>Bốn đôi thông (chặt không cần vòng)</li>
            </ul>
          </div>

          <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#383838]">
            <strong className="text-white block mb-1">Chặt Ba đôi thông:</strong>
            <ul className="list-disc pl-4 space-y-1 text-neutral-400">
              <li>Ba đôi thông lớn hơn</li>
              <li>Tứ quý</li>
              <li>Bốn đôi thông</li>
            </ul>
          </div>

          <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#383838]">
            <strong className="text-white block mb-1">Chặt Tứ quý:</strong>
            <ul className="list-disc pl-4 space-y-1 text-neutral-400">
              <li>Tứ quý lớn hơn</li>
              <li>Bốn đôi thông</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Luật Tới Trắng */}
      <div className="bg-[#262626] border border-[#383838] p-5 rounded-2xl space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span>4. Luật Tới Trắng (Thắng ngay khi chia bài)</span>
        </h2>
        <p className="text-xs sm:text-sm">
          Nếu người chơi sở hữu một trong các bộ bài sau ngay sau khi chia bài, người đó sẽ thắng Nhất ngay lập tức:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li><strong>Sảnh rồng:</strong> Sảnh từ 3 đến A (12 lá) hoặc từ 3 đến 2 (13 lá).</li>
          <li><strong>Tứ quý 2:</strong> Sở hữu trọn bộ 4 con Heo.</li>
          <li><strong>Năm đôi thông:</strong> 5 đôi liên tiếp nhau.</li>
          <li><strong>Lục phé bôn:</strong> Sở hữu 6 đôi bất kỳ trong 13 lá.</li>
          <li><strong>Đồng hoa:</strong> 13 lá bài cùng màu đỏ hoặc cùng màu đen.</li>
        </ul>
      </div>

      {/* 5. Cóng & Thối Heo & Tính Điểm Cược */}
      <div className="bg-[#262626] border border-[#383838] p-5 rounded-2xl space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-400" />
          <span>5. Kết toán cược và Xử phạt (Mô hình Zero-Sum)</span>
        </h2>
        <p className="text-xs sm:text-sm">
          Hệ thống không thu bất kỳ khoản phí nào (0% platform fee). Mọi dòng tiền chuyển đổi giữa người chơi đảm bảo tổng cân bằng tuyệt đối bằng 0 (Zero-Sum):
        </p>
        <div className="bg-[#1A1A1A] border border-[#383838] p-3 rounded-xl text-xs space-y-1.5">
          <div>🥇 <strong>Về Nhất:</strong> Nhận +3.5x mức cược + toàn bộ tiền phạt thối heo/hàng/cóng từ các người chơi khác.</div>
          <div>🥈 <strong>Về Nhì:</strong> Trừ -0.5x mức cược.</div>
          <div>🥉 <strong>Về Ba:</strong> Trừ -1.0x mức cược.</div>
          <div>💩 <strong>Về Bét:</strong> Trừ -2.0x mức cược.</div>
          <div>⚠️ <strong>Cóng (Cháy bài):</strong> Người chơi không đánh ra được lá bài nào trong cả ván đấu bị phạt thêm 1.0x mức cược và tính thua Bét.</div>
          <div>🐖 <strong>Thối Heo Đen (2♠, 2♣):</strong> Phạt 0.5x cược trả cho người về Nhất.</div>
          <div>🔴 <strong>Thối Heo Đỏ (2♦, 2♥):</strong> Phạt 1.0x cược trả cho người về Nhất.</div>
          <div>📦 <strong>Thối Tứ Quý:</strong> Phạt 1.5x cược trả cho người về Nhất.</div>
        </div>
      </div>
    </div>
  );
};
