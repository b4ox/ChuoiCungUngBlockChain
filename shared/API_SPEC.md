# API_SPEC.md — Backend REST API v1.1

> Chủ sở hữu: **Backend (B)**. Trạng thái: **bản nháp v1** — B xác nhận và đóng băng tại mốc M1 (hết Ngày 2).
> Frontend code theo file này và dùng `shared/mock/` khi chưa có backend. Mọi ví dụ response dưới đây = nội dung file mock tương ứng.
> Sau M1 chỉ được THÊM endpoint/trường; đổi/xoá phải tăng version, ghi Changelog, cập nhật mock trong cùng PR.

Base URL: `http://localhost:3000/api` (khi frontend được backend phục vụ: `/api`). CORS mở cho mọi origin.

## Quy ước chung

- Body và response là JSON (UTF-8). Riêng `/products/:id/qrcode` trả ảnh PNG.
- Mọi số là `number` (không phải chuỗi/BigInt). Thời gian là chuỗi ISO 8601 UTC.
- Trạng thái luôn có cặp `status` (0–5) + `statusText`; vai trò luôn có `role` (0–4) + `roleText` (xem CONTRACT_INTERFACE.md).
- `statusText`: `Đã sản xuất`, `Đang tới nhà phân phối`, `Ở nhà phân phối`, `Đang tới cửa hàng`, `Ở cửa hàng`, `Đã bán`.
- `roleText`: `Chưa đăng ký`, `Nhà sản xuất`, `Vận chuyển`, `Nhà phân phối`, `Nhà bán lẻ`.
- Request ghi của v1 (endpoint 4, 7–10) gửi `from` = địa chỉ ví đang đóng vai. **Chỉ chạy với Ganache local**
  (backend ký bằng tài khoản mở khoá sẵn). Trên Sepolia frontend ký giao dịch bằng MetaMask, không gọi các endpoint này.
- v1.1: endpoint có dấu 🔒 cần header `Authorization: Bearer <token>` lấy từ `POST /auth/login`. Thiếu/hết hạn → `401`.
  Dấu 👑 = thêm điều kiện ví là owner của contract, sai → `403`.
- Ghi thành công → `200 { "success": true, "txHash": "0x…", "blockNumber": 12 }` (mock: `tx-success.json`).
- Lỗi → `400` (revert, thiếu dữ liệu) hoặc `500` (không kết nối được Ganache): `{ "success": false, "message": "Sai vai tro" }` (mock: `error.json`).

## Endpoint

| # | Method | Path | Body | Response 200 | Mock |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/health` | — | `{ ok, chainId, blockNumber, contract }` | — |
| 2 | GET | `/accounts` | — | `Account[]` (10 tài khoản Ganache) | `accounts.json` |
| 3 | GET | `/participants` | — | `Participant[]` (đã đăng ký) | `participants.json` |
| 4 | POST | `/participants` | `{ from, account, name, role }` | TxResult | `tx-success.json` |
| 5 | GET | `/products` | query tuỳ chọn `?status=0..5` | `Product[]` (id tăng dần) | `products.json` |
| 6 | GET | `/products/:id` | — | `{ product: Product, history: History[] }` | `product-1.json` |
| 7 | POST | `/products` | `{ from, name, origin, description }` | TxResult + `productId` | `tx-success.json` |
| 8 | POST | `/products/:id/pickup` | `{ from, note }` | TxResult | `tx-success.json` |
| 9 | POST | `/products/:id/receive` | `{ from, note }` | TxResult | `tx-success.json` |
| 10 | POST | `/products/:id/sell` | `{ from, note }` | TxResult | `tx-success.json` |
| 11 | GET | `/products/:id/qrcode` | — | ảnh PNG, QR chứa `http://<host>:3000/trace.html?id=<id>` | `frontend/img/qr-sample.png` |
| 12 | GET | `/events` | query `?limit=20` | `Event[]` mới nhất trước | `events.json` |
| 13 | GET | `/config` | — | `ChainConfig` | `config.json` |
| 14 | GET | `/auth/nonce` | query `?address=0x…` | `{ address, nonce, message }` | `auth-nonce.json` |
| 15 | POST | `/auth/login` | `{ address, signature }` (chữ ký `personal_sign` của `message`) | `{ token, address, expiresAt }` | `auth-login.json` |
| 16 | POST | `/auth/logout` 🔒 | — | `{ success: true }` | — |
| 17 | GET | `/auth/me` 🔒 | — | `Me` | `auth-me.json` |
| 18 | GET | `/applications/me` 🔒 | — | `Application` hoặc `null` | `application.json` |
| 19 | POST | `/applications` 🔒 | `ApplicationInput` | `Application` (status `pending`) | `application.json` |
| 20 | PUT | `/applications/me` 🔒 | các trường của `ApplicationInput` | `Application` | `application.json` |
| 21 | GET | `/applications` 🔒👑 | query `?status=pending\|approved\|rejected` | `Application[]` mới nhất trước | `applications.json` |
| 22 | POST | `/applications/:id/approve` 🔒👑 | `{ txHash }` | `Application` (status `approved`) | `application.json` |
| 23 | POST | `/applications/:id/reject` 🔒👑 | `{ reason }` | `Application` (status `rejected`) | `application.json` |
| 24 | GET | `/businesses` | — | `Business[]` (không có `activity`) | `businesses.json` |
| 25 | GET | `/businesses/:address` | — | `BusinessDetail` | `business-detail.json` |
| 26 | POST | `/businesses/refresh` | — | `{ success: true }` (xoá dữ liệu nhớ tạm 10 giây) | — |

### Luồng v1.1 (Sepolia + MetaMask)

1. Đăng nhập: `GET /auth/nonce` → MetaMask `personal_sign(message)` → `POST /auth/login` → lưu `token`.
2. Doanh nghiệp gửi hồ sơ: `POST /applications` (miễn phí, chưa ghi gì lên chuỗi). Sửa khi chờ duyệt: `PUT /applications/me`.
3. Quản trị viên duyệt: ký `registerParticipant(address, company, role)` trong MetaMask → chờ xác nhận →
   `POST /applications/:id/approve { txHash }`. Backend đọc lại chuỗi, chỉ duyệt khi ví đã có đúng vai trò.
4. Từ đây doanh nghiệp ký `createProduct`, `pickUpProduct`… trong MetaMask. Chưa duyệt thì contract tự từ chối (`Sai vai tro`).
5. Thu hồi: quản trị viên ký `deactivateParticipant(address)`; `Business.isActive` thành `false`.

## Kiểu dữ liệu

```text
Account     { index, address, name, role, roleText, isAdmin }
            name = "" và role = 0 nếu chưa đăng ký; Account 0 có isAdmin = true
Participant { address, name, role, roleText, isActive }
Product     { id, name, origin, description, manufacturer, manufacturerName,
              currentOwner, currentOwnerName, status, statusText, createdAt }
History     { status, statusText, actor, actorName, time, note }
Event       { productId, status, statusText, actor, actorName, note, blockNumber, txHash, time }
TxResult    { success: true, txHash, blockNumber }   (POST /products thêm productId)
```
`...Name` = tên thành viên đã đăng ký của địa chỉ đó, `""` nếu chưa đăng ký.

Kiểu dữ liệu v1.1:

```text
ChainConfig      { chainId, chainIdHex, chainName, rpcUrl, currencySymbol, explorerUrl, contract, abi }
                 rpcUrl = "" với Sepolia (MetaMask có sẵn); contract = "" khi chưa deploy
Me               { address, isAdmin, member: Participant | null, application: Application | null }
ApplicationInput { company, taxCode, hq, website, intro, rep, email, phone, role }
                 taxCode: 10 số (chi nhánh thêm -XXX); phone: 10 số bắt đầu bằng 0; website: "" hoặc http(s)://…; role 1–4
Application      { id, address, company, taxCode, hq, website, intro, rep, email, phone, role, roleText,
                   status, statusText, reason, txHash, submittedAt, updatedAt, decidedAt }
                 status: "pending" (Chờ duyệt) | "approved" (Đã duyệt) | "rejected" (Bị từ chối)
                 Sau khi duyệt chỉ sửa được: hq, website, intro, rep, email, phone
Business         { address, name, role, roleText, isActive, taxCode, hq, website, intro, approvedAt, txHash,
                   stats: { steps, productsCreated, lastActivity } }
                 name/role/isActive đọc từ chuỗi; phần còn lại từ hồ sơ đã duyệt (KHÔNG có rep/email/phone)
BusinessDetail   Business + activity: [{ productId, productName, status, statusText, time, note }] (20 mới nhất)
                          + products: [{ id, name, status, statusText }] (sản phẩm ví này đã tạo)
```
Hồ sơ lưu ở `backend/data/applications.json` (không commit). Nonce và phiên lưu trong bộ nhớ: khởi động lại backend thì ký lại.

## Changelog
- v1.0.0 — bản đầu tiên.
- v1.1.0 — THÊM endpoint 13–26 (cấu hình chuỗi, đăng nhập bằng ví, hồ sơ doanh nghiệp, doanh nghiệp công khai)
  và mock tương ứng. Endpoint ghi của v1 giữ nguyên nhưng chỉ dùng với Ganache local.
