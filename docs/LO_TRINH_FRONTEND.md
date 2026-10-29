# Lộ trình Frontend – Chuỗi cung ứng Blockchain

> **Bản sao trong repo** của tài liệu trên Claude, để cả nhóm và AI agent đọc được. Chủ sở hữu: điều phối viên `b4ox`.
> Cập nhật: 2026-10-29. Khi có mâu thuẫn, `AGENTS.md` và các file trong `shared/` được ưu tiên.

## 1. Phạm vi của thành viên C (Frontend)

C (GitHub: vothinhungoc7980-coder) sở hữu duy nhất thư mục `frontend/`. Frontend chỉ nói chuyện với Backend qua HTTP, không gọi blockchain trực tiếp, nên C không cần biết ABI.

| Thư mục / file | Quyền của C |
| --- | --- |
| `frontend/` (HTML, CSS, JS, ảnh) | Toàn quyền |
| `shared/API_SPEC.md`, `shared/mock/*.json` | Chỉ đọc (của Backend) |
| `shared/CONTRACT_INTERFACE.md` | Chỉ đọc — để hiểu 6 trạng thái và câu lỗi |
| `contracts/`, `backend/` | Không đụng |
| File gốc: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.gitignore`, `package.json` | Không sửa — chỉ điều phối viên b4ox (kể cả frontend/AGENTS.md, frontend/CLAUDE.md) |

**Công nghệ:** HTML5, CSS, JavaScript thuần (ES2020, không module bundler), Bootstrap 5.3 + Bootstrap Icons qua CDN. Không React/Vue, không npm build. Khi phát triển độc lập dùng VS Code Live Server (port 5500); khi tích hợp, backend phục vụ frontend tại `http://localhost:3000`.

## 2. Giao diện với Backend

C làm việc hoàn toàn trên `shared/API_SPEC.md` và `shared/mock/` từ Ngày 3, không cần Backend hay Ganache chạy. Chuyển sang dữ liệu thật chỉ bằng một cờ cấu hình.

**Cấu hình** — `frontend/js/config.js`:

```javascript
// =============================================================
// CẤU HÌNH FRONTEND
// USE_MOCK = true : đọc dữ liệu mẫu trong shared/mock (không cần backend)
// USE_MOCK = false: gọi backend thật
// API_BASE tự chọn: mở qua backend (:3000) thì dùng '/api',
//          mở qua Live Server (:5500) thì gọi sang localhost:3000
// =============================================================
const CONFIG = {
  USE_MOCK: true,
  API_BASE: location.port === '3000' ? '/api' : 'http://localhost:3000/api',
  MOCK_BASE: '../shared/mock',
};
```

**Bảng ánh xạ khi `USE_MOCK = true`** (nằm trong `api.js`, mọi trang chỉ gọi `apiGet`/`apiPost` nên không trang nào biết mình đang dùng mock):

| Gọi | File mock |
| --- | --- |
| `GET /accounts` | `accounts.json` |
| `GET /participants` | `participants.json` |
| `GET /products` | `products.json` |
| `GET /products/:id` | `product-1.json` (mọi id) |
| `GET /events` | `events.json` |
| `GET /products/:id/qrcode` | Ảnh QR mẫu trong `frontend/img/qr-sample.png` |
| Mọi `POST` | `tx-success.json` sau 800 ms (giả lập thời gian đào khối) |

Để thử giao diện báo lỗi, đặt `CONFIG.MOCK_FAIL = true` → mọi `POST` trả `error.json`.

**Những gì C được giả định là cố định (theo API\_SPEC v1):** tên trường JSON, cặp `status`/`statusText` và `role`/`roleText`, định dạng lỗi `{ success: false, message }`, mọi POST gửi `from`. Nếu thiếu một trường cần hiển thị → mở issue cho Backend, không tự sửa `shared/`.

## 3. Mốc chung cả nhóm

Cả nhóm chỉ phải chờ nhau đúng một lần ở M1 (hết Ngày 2). Sau đó mỗi người làm độc lập đến Ngày 7, rồi ghép lại ở Ngày 8–9.

```text
Ngày:          N1   N2 | N3   N4 | N5   N6   N7 | N8   N9 | N10
                       M1        M2                      M3    M4
Contract (A)   [Interface v1][Logic + deploy][Unit test, DEPLOY.md][Tích hợp][Demo]
Backend  (B)   [API spec+mock][Khung server ][Routes nối Ganache  ][Tích hợp][Demo]
Frontend (C)   [Layout,navbar][   5 trang chạy với dữ liệu mock   ][Bật API ][Demo]
```

| Mốc | Thời điểm | Điều kiện đạt |
| --- | --- | --- |
| M1 | Hết Ngày 2 | Interface v1 chốt: ABI + `CONTRACT_INTERFACE.md` (Contract), `API_SPEC.md` + `shared/mock/` (Backend) đã merge vào `dev` |
| M2 | Hết Ngày 4 | Contract deploy lên Ganache, `shared/contract/deployment.json` có địa chỉ |
| M3 | Hết Ngày 9 | Cả 3 phần ghép trên `dev`, chạy trọn kịch bản demo 6 bước |
| M4 | Ngày 10 | Merge `dev` → `master`, tổng duyệt demo |

Phụ thuộc: ABI của Contract → Backend; API_SPEC + mock của Backend → Frontend. Sau M1 không ai phải chờ ai.

Với Frontend, Ngày 1–2 không cần chờ ai (chỉ làm layout); từ Ngày 3 đến Ngày 7 toàn bộ dữ liệu lấy từ mock. Frontend là làn duy nhất không phụ thuộc M2.

## 4. Checklist công việc

Mỗi giai đoạn kết thúc bằng một PR vào `dev`. Mô tả 5 trang và code mẫu `api.js` nằm trong `docs/KE_HOACH_TONG.md`.

**Giai đoạn 0 — Cài đặt (Ngày 1)**

- [ ] `git clone`, `git checkout dev`; cài extension Live Server cho VS Code
- [ ] Mở **thư mục gốc** bằng VS Code, chạy Live Server → `http://127.0.0.1:5500/frontend/index.html` (để đường dẫn `../shared/mock` hoạt động)

**Giai đoạn 1 — Khung giao diện (Ngày 1–2) → mốc M1**

- [ ] `css/style.css`: biến màu, badge trạng thái, timeline
- [ ] `js/common.js`: render navbar dùng chung, dropdown “Đang đóng vai” (lưu `localStorage`), `showToast()`, `shortAddress()`, `statusBadge()`
- [ ] 5 file HTML rỗng có navbar, điều hướng qua lại được
- [ ] Duyệt PR API\_SPEC của Backend: đủ trường để hiển thị chưa?

**Giai đoạn 2 — 5 trang chạy với mock (Ngày 3–7)**

- [ ] `js/config.js` + `js/api.js` có chế độ mock (bảng ánh xạ ở mục 2)
- [ ] `admin.html` + `admin.js`: form đăng ký thành viên, bảng thành viên
- [ ] `products.html` + `products.js`: form tạo sản phẩm (chỉ hiện với Nhà sản xuất), bảng + lọc trạng thái
- [ ] `actions.html` + `actions.js`: danh sách việc cần xử lý theo vai, nút hành động + spinner
- [ ] `trace.html` + `trace.js`: ô nhập mã, thanh tiến trình 6 bước, timeline, ảnh QR; đọc `?id=` trên URL
- [ ] `index.html` + `dashboard.js`: 4 thẻ thống kê, bảng hoạt động gần đây
- [ ] Kiểm tra giao diện điện thoại (DevTools → 375 px) cho trang Tra cứu
- [ ] Thử `MOCK_FAIL = true`: mọi nút hiện toast lỗi, không treo spinner

**Giai đoạn 3 — Tích hợp (Ngày 8–9) → mốc M3**

- [ ] `git pull` `dev`; chạy Ganache, deploy, `npm run seed`, `npm run dev` trong `backend/` (làm theo README)
- [ ] Đặt `USE_MOCK = false`, mở `http://localhost:3000`, chạy kịch bản demo; ghi lại chỗ nào dữ liệu thật khác mock và báo Backend
- [ ] Commit `USE_MOCK = false` làm mặc định trên `dev`

**Giai đoạn 4 — Demo (Ngày 10) → mốc M4**

- [ ] Điều khiển giao diện trong buổi demo; chuẩn bị điện thoại quét QR

## 5. Quy tắc Git & làm việc với AI agent

Cả 3 lĩnh vực dùng chung một bộ quy tắc; phần riêng của Frontend nằm trong `frontend/AGENTS.md`.

**Git:**

- Nhánh cố định của C: `frontend`. Mọi việc Frontend đều làm trên nhánh này, không tạo nhánh khác. Mô hình chung: `master` (demo) ← `dev` (ghép code) ← `contract` · `backend` · `frontend`.
- **Đầu phiên:** chọn nhánh `frontend` → Fetch origin → Branch → Update from dev (lệnh: `git merge origin/dev`).
- **Cuối phiên:** commit hết → Push origin (việc dở dang cũng push).
- **Xong một phần** (ví dụ xong 1–2 trang): mở Pull Request `frontend` → `dev`; b4ox duyệt và merge bằng *Create a merge commit*; nhánh giữ lại dùng tiếp.
- Commit theo mẫu `feat(frontend): ...`, `fix(frontend): ...`, `style(frontend): ...`; trước khi commit chỉ được thấy file trong `frontend/`.
- Không push thẳng lên `dev`/`master`, không rebase, không force push.

**AI agent (Claude Code đọc `CLAUDE.md`, ChatGPT Codex đọc `AGENTS.md`):**

- Luôn mở agent **từ trong thư mục `frontend/`** (`cd frontend && claude` hoặc `cd frontend && codex`).
- Agent chỉ sửa file trong `frontend/`; cần thêm trường dữ liệu thì dừng lại và báo để bạn mở issue cho Backend.
- Agent gọi dữ liệu chỉ qua `apiGet`/`apiPost`; không dùng `fetch` trực tiếp trong trang, không import ethers.js/web3.
- Không dùng framework (React, Vue…), không thêm bước build; thư viện ngoài chỉ qua CDN và phải ghi lý do trong PR.

## 6. Định nghĩa hoàn thành & kiểm thử

Phần Frontend được coi là xong khi 5 trang hoạt động giống hệt nhau ở cả hai chế độ mock và thật, chỉ khác giá trị `USE_MOCK`.

| Ca kiểm thử | Kết quả mong đợi |
| --- | --- |
| Đổi vai ở dropdown rồi tải lại trang | Vẫn giữ vai đã chọn |
| Đang là Vận chuyển, mở trang Sản phẩm | Form tạo sản phẩm bị ẩn |
| Bấm hành động sai vai (dữ liệu thật) | Toast đỏ hiển thị nguyên văn lỗi, ví dụ “Sai vai tro” |
| Bấm hành động đúng | Nút khóa + spinner, sau đó toast xanh có số block, bảng tự tải lại |
| Backend tắt khi `USE_MOCK = false` | Toast báo không kết nối được máy chủ, trang không trắng |
| Mở `trace.html?id=1` | Hiển thị ngay sản phẩm 1 không cần bấm tìm |
| Tra cứu mã không tồn tại | Thông báo “Không tìm thấy sản phẩm” |
| Màn hình 375 px | Trang Tra cứu không tràn ngang |

**Checklist trước khi mở PR:**

- [ ] Console trình duyệt không có lỗi đỏ
- [ ] Trang mới dùng `common.js` cho navbar, toast; không copy code lặp lại
- [ ] Mọi khối code lớn có chú thích `// ===== ... =====`
- [ ] Không có file ngoài `frontend/` trong diff
