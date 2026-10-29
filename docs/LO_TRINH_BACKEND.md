# Lộ trình Backend – Chuỗi cung ứng Blockchain

> **Bản sao trong repo** của tài liệu trên Claude, để cả nhóm và AI agent đọc được. Chủ sở hữu: điều phối viên `b4ox`.
> Cập nhật: 2026-10-29. Khi có mâu thuẫn, `AGENTS.md` và các file trong `shared/` được ưu tiên.

## 1. Phạm vi của thành viên B (Backend)

B (GitHub: b4ox, kiêm điều phối viên) sở hữu duy nhất thư mục `backend/` và là người công bố đặc tả API cùng dữ liệu mẫu trong `shared/`. B đọc ABI của Contract nhưng không bao giờ sửa nó.

| Thư mục / file | Quyền của B |
| --- | --- |
| `backend/` (server, routes, services, config, scripts) | Toàn quyền |
| `shared/API_SPEC.md` | Ghi — B là người duy nhất cập nhật |
| `shared/mock/*.json` | Ghi — dữ liệu mẫu đúng định dạng API, Frontend dùng khi chưa có backend thật |
| `shared/contract/*`, `shared/CONTRACT_INTERFACE.md` | Chỉ đọc (của Contract) |
| `contracts/`, `frontend/` | Không đụng |
| File gốc: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.gitignore`, `package.json` | Toàn quyền với vai trò điều phối viên (b4ox là người duy nhất sửa thông tin chung) |

**Công nghệ:** Node.js 18+ (khuyến nghị 20 LTS), Express 4, ethers.js v6, `cors`, `dotenv`, `qrcode`, `nodemon`. JavaScript CommonJS (`require`), không TypeScript, không database. Port **3000**; backend phục vụ luôn thư mục `frontend/` dưới dạng file tĩnh.

## 2. Giao diện với Contract và Frontend

B nằm giữa hai bên: nhận ABI từ Contract và phải chốt **API\_SPEC v1 + mock** trước hết Ngày 2 để Frontend làm độc lập.

**B nhận (chỉ đọc):**

| File | Nội dung | Cách dùng trong backend |
| --- | --- | --- |
| `shared/contract/SupplyChain.abi.json` | ABI (Ngày 2) | `config/blockchain.js` đọc bằng `require('../../shared/contract/SupplyChain.abi.json')` |
| `shared/contract/deployment.json` | `address`, `chainId`, `rpcUrl` (Ngày 4) | Lấy địa chỉ contract; biến `CONTRACT_ADDRESS` trong `.env` (nếu có) được ưu tiên |
| `shared/CONTRACT_INTERFACE.md` | Enum, câu lỗi | Bảng dịch `STATUS`/`ROLE` sang tiếng Việt |

Không copy ABI vào `backend/`: luôn đọc trực tiếp từ `shared/` để khi Contract cập nhật, `git pull` là đủ.

**B công bố:**

| File | Nội dung | Khi nào |
| --- | --- | --- |
| `shared/API_SPEC.md` | Mọi endpoint: method, path, body, response mẫu, mã lỗi | Ngày 2 (v1) |
| `shared/mock/*.json` | Mỗi endpoint GET một file JSON đúng y hệt response thật: `accounts.json`, `participants.json`, `products.json`, `product-1.json`, `events.json`; thêm `tx-success.json`, `error.json` | Ngày 2 |

**Quy ước response đã chốt (Frontend dựa vào đây):**

- Đọc thành công: HTTP 200, trả thẳng dữ liệu (object hoặc mảng), mọi số là `number` (đổi từ BigInt), thời gian là chuỗi ISO 8601.
- Ghi thành công: HTTP 200, `{ "success": true, "txHash": "0x…", "blockNumber": 12 }`.
- Lỗi: HTTP 400 (revert / dữ liệu sai) hoặc 500 (mất kết nối Ganache), `{ "success": false, "message": "Sai vai tro" }`.
- Trường trạng thái luôn có cặp `status` (số 0–5) + `statusText` (tiếng Việt); vai trò có `role` (0–4) + `roleText`.
- Mọi hành động ghi nhận `from` (địa chỉ ví) trong body JSON.

**Thay đổi API sau v1:** chỉ được **thêm** endpoint hoặc thêm trường; muốn đổi/xoá trường phải tăng version trong `API_SPEC.md`, ghi Changelog, cập nhật mock cùng PR, tag Frontend review.

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

Với Backend, M1 là mốc hai chiều: cần ABI của Contract và phải giao API\_SPEC + mock cho Frontend cùng lúc. Ngày 3–4 làm khung server trên mock; từ Ngày 5 (sau M2) nối Ganache thật.

## 4. Checklist công việc

Mỗi giai đoạn kết thúc bằng một PR vào `dev`. Code mẫu (blockchain.js, service, route, middleware lỗi) nằm trong `docs/KE_HOACH_TONG.md`.

**Giai đoạn 0 — Cài đặt (Ngày 1)**

- [ ] `git clone`, `git checkout dev`, `npm install` ở thư mục gốc và trong `backend/`
- [ ] Tạo `backend/.env` từ `backend/.env.example` (`PORT=3000`, `RPC_URL=http://127.0.0.1:7545`)

**Giai đoạn 1 — API\_SPEC v1 + mock (Ngày 1–2) → mốc M1**

- [ ] Hoàn thiện `shared/API_SPEC.md` (11 endpoint trong kế hoạch tổng), mỗi endpoint có ví dụ request/response
- [ ] Viết `shared/mock/*.json` khớp 100% với ví dụ trong spec
- [ ] PR `backend → dev` → Frontend duyệt → merge

**Giai đoạn 2 — Khung server (Ngày 3–4)**

- [ ] `server.js`: `express.json()`, `cors()`, `express.static` trỏ `../frontend`, gắn router `/api`, middleware lỗi
- [ ] `config/blockchain.js` đọc ABI + địa chỉ từ `shared/contract/`
- [ ] Tạm thời các route GET trả file trong `shared/mock/` (bật bằng `MOCK_CHAIN=true` trong `.env`) để kiểm tra đúng định dạng
- [ ] `GET /api/health` trả `{ ok, chainId, blockNumber, contract }` — công cụ kiểm tra kết nối nhanh

**Giai đoạn 3 — Nối Ganache thật (Ngày 5–7)**

- [ ] Sau M2: deploy contract từ nhánh `dev` lên Ganache của mình qua Remix (Account 0, giao dịch đầu tiên → địa chỉ trùng `deployment.json`)
- [ ] `services/supplyChainService.js`: hàm đọc + `sendTx` dùng chung, đổi BigInt → number
- [ ] Hoàn thiện 4 file route: accounts, participants, products, events; endpoint QR
- [ ] `scripts/seed.js` (`npm run seed`): đăng ký 4 thành viên + tạo 3 sản phẩm ở các trạng thái khác nhau
- [ ] Thử mọi endpoint bằng Thunder Client/Postman; lưu collection vào `backend/tests/api.http`
- [ ] Tắt `MOCK_CHAIN`, so response thật với mock: phải cùng cấu trúc

**Giai đoạn 4 — Tích hợp (Ngày 8–9) → mốc M3**

- [ ] `git pull` `dev`, chạy Ganache sạch → deploy → `npm run seed` → mở `http://localhost:3000`
- [ ] Cùng Frontend chạy kịch bản demo; sửa lỗi phía backend

**Giai đoạn 5 — Demo (Ngày 10) → mốc M4**

- [ ] Trình bày luồng request → ethers.js → giao dịch → receipt, chỉ `txHash` trên Ganache

## 5. Quy tắc Git & làm việc với AI agent

Cả 3 lĩnh vực dùng chung một bộ quy tắc; phần riêng của Backend nằm trong `backend/AGENTS.md`.

**Git:**

- Nhánh cố định của b4ox: `backend` — dùng cho cả việc Backend lẫn việc điều phối (sửa `AGENTS.md`, `README.md`…). Không tạo nhánh khác. Mô hình chung: `master` (demo) ← `dev` (ghép code) ← `contract` · `backend` · `frontend`.
- **Đầu phiên:** chọn nhánh `backend` → Fetch origin → Branch → Update from dev (lệnh: `git merge origin/dev`).
- **Cuối phiên:** commit hết → Push origin.
- **Xong một phần:** mở Pull Request `backend` → `dev`, merge bằng *Create a merge commit* (dùng quyền vượt vì không tự duyệt được); nhánh giữ lại dùng tiếp.
- Với vai trò điều phối: duyệt và merge PR của `contract`, `frontend` (luôn *Create a merge commit*); merge `dev` → `master` ở mốc M3, M4.
- Commit theo mẫu `feat(backend): ...`, `fix(backend): ...`, `docs(api): ...`, `chore(rules): ...` (việc điều phối).
- `backend/.env` và `node_modules/` không bao giờ được commit (đã có trong `.gitignore`); chỉ commit `.env.example`. Thêm thư viện npm mới phải ghi lý do trong PR.

**AI agent (Claude Code đọc `CLAUDE.md`, ChatGPT Codex đọc `AGENTS.md`):**

- Luôn mở agent **từ trong thư mục `backend/`** (`cd backend && claude` hoặc `cd backend && codex`).
- Agent chỉ sửa file trong phạm vi ở mục 1; cần sửa ABI hay frontend thì dừng lại và báo.
- Agent phải giữ đúng định dạng response trong `shared/API_SPEC.md`; sửa spec và mock trong cùng một lần thay đổi.
- Không dùng TypeScript, ORM, database, framework khác (NestJS, Fastify…); không lưu private key trong code.

## 6. Định nghĩa hoàn thành & kiểm thử

Phần Backend được coi là xong khi mọi endpoint trong `API_SPEC.md` trả đúng cấu trúc với mock khi chạy trên Ganache thật, và Frontend tắt mock mà không phải sửa code.

| Ca kiểm thử | Kết quả mong đợi |
| --- | --- |
| `GET /api/health` khi Ganache tắt | HTTP 500, `message` báo không kết nối được blockchain |
| `GET /api/accounts` | 10 tài khoản, mỗi tài khoản có `role`, `roleText`, `name` |
| `POST /api/products` với `from` là Vận chuyển | HTTP 400, `message: "Sai vai tro"` |
| `POST /api/products` với `from` là Nhà sản xuất | HTTP 200, có `txHash`, `blockNumber` |
| `GET /api/products/999` | HTTP 400, “San pham khong ton tai” |
| Chạy đủ 6 bước qua API | `GET /api/products/1` có `history` 6 phần tử, `status: 5` |
| `GET /api/products/1/qrcode` | Trả ảnh PNG / data URL mở được trang `trace.html?id=1` |
| `npm run seed` trên Ganache mới | Không lỗi; Dashboard hiển thị 3 sản phẩm |

**Checklist trước khi mở PR:**

- [ ] `npm run dev` khởi động không lỗi
- [ ] Response của endpoint vừa làm khớp mock trong `shared/mock/`
- [ ] Mọi khối code lớn có chú thích `// ===== ... =====`
- [ ] Không có file ngoài phạm vi trong diff, không có `.env`
