# API_SPEC.md — Backend REST API v1

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
- Mọi request ghi (POST) gửi `from` = địa chỉ ví đang đóng vai.
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

## Changelog
- v1.0.0 — bản đầu tiên.
