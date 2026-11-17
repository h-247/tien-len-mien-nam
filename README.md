# Tiến Lên Miền Nam - Multiplayer Web & AI Bot

Ứng dụng chơi bài **Tiến Lên Miền Nam** trực tuyến, thời gian thực, hỗ trợ đấu nhiều người chơi (Multiplayer), tạo phòng riêng, thỏa thuận mức cược tiền ảo mô phỏng (VND), quy trình Quản trị viên duyệt người chơi, hệ thống Bot AI 3 cấp độ, sổ cái giao dịch bất biến và bảng xếp hạng cao thủ.

Giao diện hoàn toàn bằng **tiếng Việt**, thiết kế **Dark Mode** tối giản, tối ưu hóa cho màn hình điện thoại di động thông minh (320px – 430px) và máy tính.

---

## 1. Công nghệ & Kiến trúc (Tech Stack)

Dự án được xây dựng dựa trên starter chính thức của **ChatGPT Sites (Vinext)**:

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons + shadcn/ui.
- **Backend:** TypeScript API Route Handlers chạy trên Cloudflare Workers Runtime trong cùng ứng dụng Vinext.
- **Cơ sở dữ liệu:** Cloudflare D1 (SQLite-compatible) kết hợp Drizzle ORM.
- **Ràng buộc lưu trữ:** Được khai báo trong `.openai/hosting.json`.
- **Xác thực dữ liệu:** Zod cho việc kiểm tra tính hợp lệ dữ liệu ở server.
- **Xác thực người dùng:** Tích hợp xác thực ChatGPT (`oai-authenticated-user-*`) và mô phỏng tài khoản phát triển cục bộ.
- **Kiểm thử:** Vitest cho toàn bộ logic luật bài và tài chính; Playwright cho quy trình trình duyệt.
- **Kinh tế tiền ảo:** Tiền ảo mô phỏng (VND), không hỗ trợ nạp/rút tiền thật, đảm bảo nguyên lý cân bằng tổng bằng 0 (**Zero-Sum**).

---

## 2. Các vai trò trong ứng dụng (Roles)

Hệ thống hỗ trợ 2 vai trò toàn cục:

### 2.1. Quản trị viên (Administrator)
- Quản lý và xét duyệt hồ sơ đăng ký của người chơi mới (Duyệt / Từ chối kèm lý do).
- Tạm khóa (Suspend) hoặc Mở khóa (Reactivate) tài khoản người chơi.
- Giám sát toàn bộ phòng chơi đang hoạt động, đang chờ và lịch sử ván đấu.
- Tra cứu lịch sử kết toán ván bài và sổ cái giao dịch tài chính.
- Điều chỉnh số dư tiền ảo của người chơi kèm lý do bắt buộc và ghi nhận nhật ký kiểm toán (Audit Log).
- Quản lý cài đặt hệ thống.

### 2.2. Người chơi (Player)
Vòng đời tài khoản: `NEW → PENDING → APPROVED / REJECTED / SUSPENDED`
- **Mới (NEW):** Đăng nhập qua ChatGPT, điền hồ sơ (Tên hiển thị, avatar, giới thiệu) để gửi xét duyệt.
- **Chờ duyệt (PENDING):** Hồ sơ chờ Quản trị viên phê duyệt.
- **Đã duyệt (APPROVED):** Nhận vốn khởi nghiệp **1.000.000 ₫** mô phỏng, toàn quyền tạo phòng, vào phòng, thỏa thuận cược, chơi với người và AI Bot.
- **Từ chối (REJECTED):** Có thể cập nhật thông tin để gửi lại.
- **Tạm khóa (SUSPENDED):** Không thể tham gia trò chơi.

### 2.3. Chủ phòng / Nhà cái (Room Host / Banker)
Chủ phòng là một **Người chơi** sở hữu phòng:
- Thiết lập hoặc cập nhật mức cược phòng.
- Thêm hoặc xóa Bot AI với độ khó tùy chỉnh (Dễ, Vừa, Khó).
- Kick người chơi khỏi phòng trước khi ván bắt đầu.
- Bắt đầu ván đấu khi phòng đủ 4 ghế và mọi người chơi thực đã chấp thuận mức cược.

---

## 3. Luật chơi Tiến Lên Miền Nam chuẩn

### 3.1. Thứ bậc quân bài
- **Thứ tự số:** `3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2`
  - Quân bài nhỏ nhất: **3**
  - Quân bài lớn nhất: **2 (Heo)**
- **Thứ tự chất:** `Bích (♠) < Chuồn (♣) < Rô (♦) < Cơ (♥)`
  - Lá bài nhỏ nhất cả bộ: **3 Bích (3♠)**
  - Lá bài lớn nhất cả bộ: **2 Cơ (2♥)**

### 3.2. Các tổ hợp hợp lệ
- **Lá rác (Đơn):** 1 lá lẻ.
- **Đôi:** 2 lá cùng số (so chất lá lớn hơn).
- **Sám cô (Ba lá):** 3 lá cùng số.
- **Sảnh:** 3 đến 12 lá liên tiếp. **Lưu ý: Quân 2 không nằm trong bất kỳ sảnh nào.** Sảnh cao nhất tới A (10-J-Q-K-A).
- **Tứ quý:** 4 lá cùng số.
- **Ba đôi thông:** 3 đôi liên tiếp nhau về số (không chứa 2).
- **Bốn đôi thông:** 4 đôi liên tiếp nhau về số (không chứa 2).

### 3.3. Quy tắc Chặt Heo & Chặt Hàng
- **Chặt 1 Heo (2 đơn):**
  - Ba đôi thông (trong vòng)
  - Tứ quý
  - Bốn đôi thông (chặt không cần vòng / nhảy lượt)
- **Chặt Đôi Heo (2 con 2):**
  - Bốn đôi thông
- **Chặt Ba đôi thông:**
  - Ba đôi thông lớn hơn
  - Tứ quý
  - Bốn đôi thông
- **Chặt Tứ quý:**
  - Tứ quý lớn hơn
  - Bốn đôi thông
- **Chặt Bốn đôi thông:**
  - Bốn đôi thông lớn hơn (chặt không cần vòng)

### 3.4. Luật Tới Trắng
Thắng ngay sau khi chia bài:
1. **Tứ quý 2** (4 con Heo).
2. **Sảnh rồng** (Sảnh từ 3 đến A hoặc 3 đến 2).
3. **Năm đôi thông** (5 đôi liên tiếp).
4. **Lục phé bôn** (Sở hữu 6 đôi bất kỳ).
5. **Đồng hoa** (13 lá cùng màu đỏ hoặc cùng màu đen).

### 3.5. Luật Cóng & Thối Heo/Hàng
- **Cóng (Cháy bài):** Người chơi không ra được lá nào trong suốt ván bài bị phạt thêm `1.0x mức cược` và xếp hạng Bét.
- **Thối Heo Đen (2♠, 2♣):** Phạt `0.5x mức cược` chuyển cho người về Nhất.
- **Thối Heo Đỏ (2♦, 2♥):** Phạt `1.0x mức cược` chuyển cho người về Nhất.
- **Thối Tứ quý / 3 đôi thông / 4 đôi thông:** Phạt `1.0x - 2.0x mức cược` chuyển cho người về Nhất.

### 3.6. Mô hình kết toán Zero-Sum
Phí nền tảng là **0%**. Toàn bộ số tiền biến động giữa 4 người chơi luôn có tổng bằng đúng 0:
- **Về Nhất:** Nhận `+3.5x cược` + toàn bộ tiền phạt thối heo/hàng/cóng từ các đối thủ.
- **Về Nhì:** Trừ `-0.5x cược` (- tiền phạt thối nếu có).
- **Về Ba:** Trừ `-1.0x cược` (- tiền phạt thối nếu có).
- **Về Bét:** Trừ `-2.0x cược` (- tiền phạt thối nếu có).
- **Bảo toàn số dư (Solvency Cap):** Số dư người chơi không bao giờ âm. Nếu số dư còn lại không đủ trả phạt tối đa, người chơi chỉ trả tới 0 ₫ và tiền thưởng của người thắng được điều chỉnh tương ứng để giữ cân bằng tổng bằng 0.

---

## 4. Hướng dẫn chạy cục bộ trên Windows (Local Development)

### 4.1. Yêu cầu môi trường
- **Hệ điều hành:** Windows 10/11
- **Node.js:** Phiên bản `>= 22.13.0` (Khuyến nghị Node.js v24 LTS)
- **npm:** Phiên bản đi kèm Node.js
- **Git**

### 4.2. Cài đặt các gói phụ thuộc
Mở PowerShell tại thư mục dự án:
```powershell
npm install
```

### 4.3. Khởi tạo cơ sở dữ liệu & Migrations
Tạo các tệp SQL migration từ schema Drizzle:
```powershell
npm run db:generate
```
Migration SQL sẽ được lưu trữ tại thư mục `./drizzle/`.

### 4.4. Chạy kiểm thử tự động (Unit & Integration Tests)
Chạy toàn bộ 21 kiểm thử luật bài Tiến Lên Miền Nam, bot AI và kết toán tài chính:
```powershell
npm test
```

Kiểm tra tính đúng đắn kiểu dữ liệu TypeScript:
```powershell
npm run typecheck
```

### 4.5. Khởi động môi trường phát triển (Development Server)
Khởi động máy chủ Vinext với mô phỏng Cloudflare D1 và xác thực ChatGPT:
```powershell
npm run dev
```
Truy cập trình duyệt tại: [http://localhost:3000](http://localhost:3000)

### 4.6. Chuyển đổi tài khoản thử nghiệm nhanh (Dev User Switcher)
Khi chạy ở chế độ cục bộ, thanh điều hướng trên cùng (Navbar) cung cấp menu thả xuống để chuyển đổi giữa các tài khoản thử nghiệm:
- **Admin (Seedy):** Quyền Quản trị viên, truy cập menu Quản trị để duyệt người chơi, xem sổ cái, điều chỉnh số dư.
- **Người chơi 1 (A):** Tài khoản người chơi đã duyệt, số dư 1.000.000 ₫.
- **Người chơi 2 (B):** Tài khoản người chơi 2.
- **Người chơi 3 (C):** Tài khoản người chơi 3.
- **Người chơi 4 (D):** Tài khoản người chơi 4.

Điều này cho phép kiểm thử trọn vẹn kịch bản 4 người chơi cùng đấu bài, hoặc 1 người đấu với 3 Bot AI trên cùng máy.

### 4.7. Đóng gói cho môi trường Production (Build)
Đóng gói toàn bộ ứng dụng sang Worker & Client bundle cho ChatGPT Sites:
```powershell
npm run build
```
Lệnh này sẽ tự động:
1. Biên dịch RSC, SSR, Client chunks.
2. Sao chép `.openai/hosting.json` và toàn bộ migrations `./drizzle/` sang `dist/.openai/`.

### 4.8. Chạy thử nghiệm Production cục bộ
```powershell
npm start
```

---

## 5. Triển khai lên ChatGPT Sites (Deployment)

1. Đảm bảo cấu hình D1 database binding trong `.openai/hosting.json`:
   ```json
   {
     "d1": "DB",
     "r2": null
   }
   ```
2. Thực hiện commit source code lên Git:
   ```powershell
   git add .
   git commit -m "feat: complete production-ready Tien Len Mien Nam game"
   ```
3. Triển khai qua ChatGPT Sites hosting workflow hoặc Sites publishing action.
4. Cơ sở dữ liệu Cloudflare D1 trên ChatGPT Sites sẽ tự động áp dụng các migration trong `dist/.openai/drizzle/` khi khởi động.

---

## 6. Bảo mật & Tính toàn vẹn (Security)

- **Bảo mật bài tẩy (Hidden Hands):** Server là bên nắm giữ toàn bộ trạng thái bài. API chỉ trả về danh sách quân bài của người chơi yêu cầu. Đối thủ chỉ nhìn thấy số lượng lá (`cardCount`), không thể soi bài đối phương qua Network/DevTools.
- **Thẩm quyền máy chủ (Server Authoritative):** Mọi nước đi (đánh bài, bỏ lượt, chặt heo, kết toán) đều được server thẩm định qua `lib/tienlen/engine.ts`.
- **Kiểm soát phiên bản chống xung đột (Optimistic Concurrency Control):** Mọi thao tác gửi lên kèm theo số phiên bản `version`. Nước đi gửi trễ hoặc gửi trùng lặp sẽ bị từ chối với lỗi 409 Conflict.
- **Không có giao dịch tiền thật:** Không tích hợp bất kỳ cổng thanh toán, nạp rút hay đổi thưởng tiền mặt nào, đảm bảo tuân thủ nghiêm ngặt quy định nền tảng.
