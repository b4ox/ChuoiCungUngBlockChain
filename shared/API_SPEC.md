# API_SPEC.md — Backend REST API v1.3

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
| 6 | GET | `/products/:id` | — | `{ product: Product, history: History[], invitations: Invitation[], handovers: Handover[] }` (v1.2 thêm `invitations`, v1.3 thêm `handovers`) | `product-1.json` |
| 7 | POST | `/products` | `{ from, name, origin, description, transporter?, distributor? }` (v1.2: có ví mời thì gọi `createProductWithInvites`) | TxResult + `productId` | `tx-success.json` |
| 8 | POST | `/products/:id/pickup` | `{ from, note }` (v1.3: vận chuyển xác nhận **đã nhận** hàng) | TxResult | `tx-success.json` |
| 9 | POST | `/products/:id/receive` | `{ from, note }` (v1.3: NPP / bán lẻ xác nhận **đã nhận** hàng) | TxResult | `tx-success.json` |
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
| 27 | GET | `/invitations` | query `?address=0x…` (bắt buộc), `&stage=invited\|todo\|upcoming\|done`, `&fresh=1` (tuỳ chọn) | `MyInvitation[]` (id sản phẩm tăng dần; trong một sản phẩm: việc của NSX trước, rồi theo task) | `invitations.json` (của ví Giao Hàng Nhanh) |
| 28 | GET | `/invitations/to-send` | query `?address=0x…`, `&fresh=1` | `InviteToSend[]` | `invitations-to-send.json` (của ví NPP Miền Bắc) |
| 29 | POST | `/products/:id/invite` | `{ from, task, invitee }` | TxResult | `tx-success.json` |
| 30 | POST | `/products/:id/accept` | `{ from, task }` | TxResult | `tx-success.json` |
| 31 | POST | `/products/:id/decline` | `{ from, task }` (v1.3: cũng là rút lui sau khi đã nhận) | TxResult | `tx-success.json` |
| 32 | GET | `/invitations/blocked` | query `&fresh=1` (tuỳ chọn) | `BlockedTask[]` | `invitations-blocked.json` |
| 33 | POST | `/products/:id/send` | `{ from, note }` — bên gửi xác nhận **đã giao** | TxResult | `tx-success.json` |
| 34 | POST | `/products/:id/cancel` | `{ from, task }` — người mời huỷ lời mời | TxResult | `tx-success.json` |
| 35 | POST | `/products/:id/reassign` | `{ from, task, invitee, note }` — admin chuyển nhiệm vụ | TxResult | `tx-success.json` |

Endpoint 29–31, 33–35 giống 4, 7–10: backend tự ký, **chỉ chạy với Ganache local**. Trên Sepolia frontend ký các hàm contract
tương ứng (`inviteParticipant`, `acceptInvitation`, `declineInvitation`, `confirmSent`, `cancelInvitation`, `reassignTask`) bằng MetaMask.
`fresh=1`: backend nhớ tạm dữ liệu lời mời 10 giây; frontend thêm `fresh=1` ngay sau một giao dịch để đọc lại từ chuỗi.

### Luồng v1.1 (Sepolia + MetaMask)

1. Đăng nhập: `GET /auth/nonce` → MetaMask `personal_sign(message)` → `POST /auth/login` → lưu `token`.
2. Doanh nghiệp gửi hồ sơ: `POST /applications` (miễn phí, chưa ghi gì lên chuỗi). Sửa khi chờ duyệt: `PUT /applications/me`.
3. Quản trị viên duyệt: ký `registerParticipant(address, company, role)` trong MetaMask → chờ xác nhận →
   `POST /applications/:id/approve { txHash }`. Backend đọc lại chuỗi, chỉ duyệt khi ví đã có đúng vai trò.
4. Từ đây doanh nghiệp ký `createProduct`, `pickUpProduct`… trong MetaMask. Chưa duyệt thì contract tự từ chối (`Sai vai tro`).
5. Thu hồi: quản trị viên ký `deactivateParticipant(address)`; `Business.isActive` thành `false`.

### Luồng v1.2 — Lời mời tham gia quy trình

Mỗi sản phẩm có 4 nhiệm vụ (`task`, khớp enum `Task` của contract). Chỉ doanh nghiệp **đã chấp nhận** lời mời
mới làm được bước tương ứng (contract từ chối `Ban chua nhan loi moi cho nhiem vu nay`).
**Quy tắc theo chặng:** một chặng vận chuyển chỉ bắt đầu khi CẢ bên chở và bên nhận đã chấp nhận
(chặng 1 = task 0 + 1, chặng 2 = task 2 + 3); thiếu bên nhận thì contract từ chối `Ben nhan chua chap nhan loi moi`.

| task | taskText | Vai trò được mời | Ai mời | Làm khi `status` = |
| --- | --- | --- | --- | --- |
| 0 | Vận chuyển đến nhà phân phối | 2 Vận chuyển | Nhà sản xuất của sản phẩm | 0 (`pickup`) |
| 1 | Phân phối | 3 Nhà phân phối | Nhà sản xuất của sản phẩm | 1 (`receive`) |
| 2 | Vận chuyển đến cửa hàng | 2 Vận chuyển | NPP đã chấp nhận task 1 | 2 (`pickup`) |
| 3 | Bán lẻ | 4 Nhà bán lẻ | NPP đã chấp nhận task 1 | 3 (`receive`), 4 (`sell`) |

1. Nhà sản xuất ký `createProductWithInvites(name, origin, description, transporter, distributor)` (hoặc `createProduct`
   rồi `inviteParticipant`). Mời được / mời lại khi lời mời chưa được chấp nhận và `status <= task`.
2. Doanh nghiệp xem `GET /invitations?address=<ví>&stage=invited` → ký `acceptInvitation(id, task)` hoặc `declineInvitation(id, task)`.
3. Mục "Xử lý đơn" chỉ dùng `GET /invitations?address=<ví>`: nhóm theo `stage`; nút thao tác lấy từ `action`.
   Doanh nghiệp không được mời không thấy sản phẩm ở đây (vẫn tra cứu công khai được).
4. Người có quyền mời (NSX, NPP) xem việc cần mời ở `GET /invitations/to-send?address=<ví>` → ký `inviteParticipant(id, task, invitee)`.
5. Contract chưa nâng cấp (ABI chưa có `getInvitations`) → backend trả `invitations: []` và danh sách rỗng, không báo lỗi.

### Luồng v1.3 — Giao nhận hai đầu, thay đổi lời mời

Giả định: các doanh nghiệp đã ký hợp đồng ngoài đời; hệ thống ghi bằng chứng thực hiện (xem `docs/QUY_TRINH_GIAO_NHAN.md`).

| Bước | Trạng thái | Bên gửi xác nhận "đã giao" (`action: send`) | Bên nhận xác nhận "đã nhận" |
| --- | --- | --- | --- |
| 0 | 0 → 1 | Nhà sản xuất | Vận chuyển chặng 1 (`pickup`) |
| 1 | 1 → 2 | Vận chuyển chặng 1 | Nhà phân phối (`receive`) |
| 2 | 2 → 3 | Nhà phân phối | Vận chuyển chặng 2 (`pickup`) |
| 3 | 3 → 4 | Vận chuyển chặng 2 | Nhà bán lẻ (`receive`) |

1. Hai bên xác nhận theo thứ tự nào cũng được; đủ hai đầu thì trạng thái đổi. Mục "Xử lý đơn" vẫn chỉ cần endpoint 27:
   `action` cho biết nút cần hiện (`send`, `pickup`, `receive`, `sell`), `waitingFor` cho biết đang chờ ai.
2. Nhà sản xuất có thêm một dòng `task: null` cho mỗi sản phẩm của mình (bên gửi ở bước 0).
3. Khi chặng chưa bắt đầu: người được mời rút lui bằng `declineInvitation` (`canWithdraw`), người mời huỷ bằng
   `cancelInvitation` (`InviteToSend.tasks[].canCancel`) hoặc mời lại (`canInvite`). Chặng đã bắt đầu thì các nút này biến mất.
4. Bên đã nhận lời bị khoá: người mời mời lại được (`canInvite = true` vì `valid = false`) khi chặng chưa bắt đầu;
   nếu chặng đã bắt đầu hoặc hàng đang trong tay bên đó, quản trị viên xem endpoint 32 rồi ký `reassignTask`.

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

Kiểu dữ liệu v1.2:

```text
Invitation    { task, taskText, role, roleText, invitee, inviteeName, inviter, inviterName, state, stateText }
              luôn đủ 4 phần tử (task 0..3); invitee = "" khi chưa mời
              state: "none" (Chưa mời) | "pending" (Chờ chấp nhận) | "accepted" (Đã chấp nhận)
              inviter = ví có quyền mời task đó; task 2, 3 = "" khi chưa có NPP chấp nhận task 1
MyInvitation  { productId, productName, status, statusText } + Invitation
              + { stage, stageText, canActNow, action }
              + { waitingFor }
              stage: "invited" (Lời mời mới) | "todo" (Cần xử lý) | "upcoming" (Sắp tới) | "done" (Đã xong)
              upcoming = chưa tới bước, HOẶC là task vận chuyển (0, 2) đã tới bước nhưng bên nhận của chặng
              (task 1, 3) chưa chấp nhận. waitingFor = lý do khi upcoming, ngược lại "":
              "Chờ hàng đến bước của bạn" | "Chờ nhà phân phối chấp nhận lời mời" | "Chờ nhà bán lẻ chấp nhận lời mời"
              canActNow = (stage === "todo"); action: "pickup" | "receive" | "sell" khi todo, ngược lại null
              Lời mời đang chờ mà sản phẩm đã qua bước đó thì không trả về.
InviteToSend  { productId, productName, status, statusText, tasks: Invitation[] }
              tasks = nhiệm vụ ví này được mời / mời lại: inviter là ví này, state khác "accepted", status <= task
```
Mock: `product-invitations.json` chứa 4 lời mời của từng sản phẩm mẫu (khoá = id); backend `MOCK_CHAIN=true`
tính endpoint 27, 28 từ file này. `invitations.json`, `invitations-to-send.json` là ví dụ response cho frontend chạy Live Server.

Kiểu dữ liệu v1.3 (bổ sung, không đổi trường cũ):

```text
Invitation    + { valid, inviterValid }
              valid = người được mời đang hoạt động và đúng vai; inviterValid = người có quyền mời còn hợp lệ
MyInvitation  + { canWithdraw }
              task = null, state = "owner" (stateText "Nhà sản xuất"): dòng việc của nhà sản xuất (giao hàng ở bước 0)
              action thêm "send" (bên gửi xác nhận đã giao); pickup / receive = bên nhận xác nhận đã nhận
              upcoming = chưa tới bước, chặng chưa đủ hai bên, hoặc mình đã xác nhận và đang chờ bên kia.
              waitingFor: "Chờ hàng đến bước của bạn" | "Chờ đủ vận chuyển và nhà phân phối chấp nhận lời mời"
                        | "Chờ đủ vận chuyển và nhà bán lẻ chấp nhận lời mời" | "Chờ bên nhận xác nhận đã nhận hàng"
                        | "Chờ bên gửi xác nhận đã giao hàng" | "Bên nhận không còn hoạt động, chờ quản trị viên xử lý"
              canWithdraw = đã nhận lời và chặng chưa bắt đầu (được rút lui)
InviteToSend  tasks = MỌI task ví này quản lý khi chặng chưa bắt đầu (kể cả đã có người nhận),
              mỗi task + { canInvite, canCancel }: canInvite = chưa có người nhận còn hợp lệ; canCancel = ô không trống
Handover      { step, fromStatus, toStatus, toStatusText, sender, senderName, sentAt, sentNote,
                receiver, receiverName, receivedAt, receivedNote, state, stateText }
              luôn 4 phần tử (step 0..3; [] nếu contract chưa hỗ trợ); sentAt/receivedAt = "" khi chưa xác nhận
              state: "none" (Chưa tới) | "waiting" (Chưa bên nào xác nhận) | "sent" (Bên gửi đã xác nhận)
                   | "received" (Bên nhận đã xác nhận) | "done" (Đã giao nhận)
              Bước đang diễn ra điền sẵn sender = người giữ hàng, receiver = người đã nhận task của bước.
BlockedTask   { productId, productName, status, statusText, currentOwner } + Invitation
              task đã có người nhận nhưng người đó không còn hợp lệ, task chưa xong (status < task + 2)
```
Mock v1.3: `product-handovers.json` (4 bước giao nhận từng sản phẩm, khoá = id), `invitations-blocked.json`;
`product-1.json` có thêm `handovers`.

## Changelog
- v1.0.0 — bản đầu tiên.
- v1.1.0 — THÊM endpoint 13–26 (cấu hình chuỗi, đăng nhập bằng ví, hồ sơ doanh nghiệp, doanh nghiệp công khai)
  và mock tương ứng. Endpoint ghi của v1 giữ nguyên nhưng chỉ dùng với Ganache local.
- v1.2.0 — THÊM lời mời tham gia quy trình: endpoint 27–31, trường `invitations` trong `GET /products/:id`,
  trường tuỳ chọn `transporter`, `distributor` cho `POST /products`, kiểu `Invitation`, `MyInvitation`, `InviteToSend`
  và mock `product-invitations.json`, `invitations.json`, `invitations-to-send.json`. Không đổi/xoá gì của v1.1.
  Quy tắc theo chặng: vận chuyển chỉ "Cần xử lý" khi bên nhận của chặng đã chấp nhận (`MyInvitation.waitingFor`).
  Cần contract có `getInvitations` (xem `docs/DE_XUAT_CONTRACT_LOI_MOI.md`).
- v1.3.0 — Giao nhận hai đầu và thay đổi lời mời: endpoint 32–35, trường `handovers` trong `GET /products/:id`,
  `Invitation.valid/inviterValid`, `MyInvitation.canWithdraw` + `action: "send"` + dòng `task: null` của nhà sản xuất,
  `InviteToSend.tasks[].canInvite/canCancel` (tasks gồm cả task đã có người nhận), kiểu `Handover`, `BlockedTask`,
  query `fresh=1`, mock `product-handovers.json`, `invitations-blocked.json`. **Đổi hành vi:** endpoint 8, 9 chỉ là xác nhận
  của bên nhận (cần bên gửi xác nhận bằng endpoint 33). Cần contract v1.3.
