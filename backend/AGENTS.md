# AGENTS.md — Vùng BACKEND (chủ sở hữu: thành viên B – `b4ox`)

Quy tắc chung ở `../AGENTS.md` vẫn áp dụng. File này bổ sung cho vùng Backend.
Lộ trình, checklist và ca kiểm thử: `../docs/LO_TRINH_BACKEND.md`. Code mẫu: `../docs/KE_HOACH_TONG.md`, mục 5.

## Được sửa
(Trừ `AGENTS.md` và `CLAUDE.md` trong thư mục này — đó là thông tin chung, chỉ điều phối viên `b4ox` sửa.)
- `backend/**`
- `shared/API_SPEC.md`, `shared/mock/**`

Chỉ đọc: `shared/contract/**`, `shared/CONTRACT_INTERFACE.md`, `contracts/**`, `frontend/**`.
Không copy ABI vào `backend/` — luôn `require('../../shared/contract/SupplyChain.abi.json')` từ `backend/config/`.

## Công nghệ cố định
Node.js 20, Express 4, ethers.js **v6**, `cors`, `dotenv`, `qrcode`, `nodemon`. CommonJS (`require`).
KHÔNG dùng: TypeScript, database/ORM, NestJS/Fastify, web3.js, ethers v5.
Dữ liệu ngoài chuỗi (hồ sơ doanh nghiệp) lưu file JSON trong `backend/data/` qua `utils/jsonStore.js` (thư mục không commit).

## Cấu trúc
```
backend/
├── config/blockchain.js        # provider, readContract, getContract(from), mạng (Sepolia/Ganache)
├── services/supplyChainService.js  # mọi lời gọi contract + format dữ liệu
├── services/authService.js     # nonce, kiểm tra chữ ký ví, phiên (token)
├── services/applicationService.js  # hồ sơ doanh nghiệp (file JSON)
├── services/businessService.js # doanh nghiệp công khai = chuỗi + hồ sơ đã duyệt
├── routes/{account,participant,product,event,config,auth,application,business}Routes.js
├── middleware/{errorHandler,auth}.js
├── utils/{validate,jsonStore,publicUrl}.js
├── scripts/seed.js             # npm run seed
├── tests/api.http              # request mẫu cho Thunder Client / REST Client
├── server.js
└── .env.example
```
Route chỉ: đọc request → gọi service → trả JSON. Không gọi contract trực tiếp trong route.

## Quy tắc quan trọng
- Backend KHÔNG ký giao dịch trên Sepolia và không giữ private key: người dùng ký bằng MetaMask ở frontend.
  `getContract(from)` (tài khoản Ganache đã unlock) chỉ còn cho `npm run seed` và các API ghi cũ của v1 khi chạy thử local.
- Route cần đăng nhập dùng `requireAuth`; route của quản trị viên thêm `requireAdmin` (so với `owner()` của contract).
- Không bao giờ trả `rep`, `email`, `phone` ở API công khai (`/businesses`).
- Đọc event trên Sepolia phải quét theo đoạn (`LOG_CHUNK_SIZE`) từ `deployBlock`, không hỏi một lần từ khối 0.
- Luôn đổi `BigInt` → `Number` và timestamp → chuỗi ISO trước khi trả JSON.
- Response phải đúng `shared/API_SPEC.md`: đọc → trả thẳng dữ liệu; ghi → `{ success, txHash, blockNumber }`;
  lỗi → HTTP 400/500 `{ success: false, message }` (message = `err.reason || err.shortMessage || err.message`).
- Mọi thay đổi `API_SPEC.md` phải đi kèm cập nhật `shared/mock/` trong cùng thay đổi, và chỉ được THÊM sau M1.
- `MOCK_CHAIN=true` trong `.env` → các route GET trả file trong `shared/mock/` (dùng khi chưa có contract).
- `server.js` phục vụ `frontend/` bằng `express.static(path.join(__dirname, '../frontend'))` — không sửa file trong `frontend/`.

## Kiểm tra
- `npm run dev` khởi động không lỗi; `GET /api/health` trả `ok: true` khi đã có contract trên mạng đang cấu hình.
- Response thật khớp cấu trúc mock tương ứng.
- Bảng ca kiểm thử trong `docs/LO_TRINH_BACKEND.md`, mục 6.
