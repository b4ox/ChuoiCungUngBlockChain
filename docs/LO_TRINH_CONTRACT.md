# Lộ trình Smart Contract – Chuỗi cung ứng Blockchain

> **Bản sao trong repo** của tài liệu trên Claude, để cả nhóm và AI agent đọc được. Chủ sở hữu: điều phối viên `b4ox`.
> Cập nhật: 2026-10-29. Khi có mâu thuẫn, `AGENTS.md` và các file trong `shared/` được ưu tiên.

## 1. Phạm vi của thành viên A (Contract)

A (GitHub: nhungtrieu2005uh-bot) sở hữu duy nhất thư mục `contracts/` và là người công bố `shared/contract/`; mọi thứ khác chỉ đọc. Hai thành viên kia không bao giờ sửa file của A, và A cũng không sửa file của họ.

| Thư mục / file | Quyền của A |
| --- | --- |
| `contracts/` (SupplyChain.sol, test, ghi chú deploy) | Toàn quyền |
| `shared/contract/SupplyChain.abi.json`, `shared/contract/deployment.json` | Ghi — A là người duy nhất cập nhật |
| `shared/CONTRACT_INTERFACE.md` | Ghi — mô tả hàm, enum, event, thông báo lỗi |
| `shared/API_SPEC.md`, `shared/mock/` | Chỉ đọc (của Backend) |
| `backend/`, `frontend/` | Không đụng |
| File gốc: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.gitignore`, `package.json` | Không sửa — chỉ điều phối viên b4ox (kể cả contracts/AGENTS.md, contracts/CLAUDE.md) |

**Công cụ:** Remix IDE (remix.ethereum.org) + remixd để mở thư mục `contracts/`, Ganache CLI chạy bằng `npm run chain` ở thư mục gốc (port 7545, chainId 1337, bộ tài khoản cố định `-d`).

## 2. Giao diện với Backend và Frontend

A không phụ thuộc ai, nhưng Backend phụ thuộc vào ABI của A. Vì vậy việc đầu tiên (hết Ngày 2) là **chốt interface v1**: đủ chữ ký hàm, enum, event và câu lỗi, dù thân hàm chưa xong.

| A công bố | File | Ai dùng | Khi nào |
| --- | --- | --- | --- |
| ABI | `shared/contract/SupplyChain.abi.json` (copy từ Remix → Compiler → ABI) | Backend | Ngày 2 (v1), cập nhật nếu bump version |
| Địa chỉ deploy | `shared/contract/deployment.json`: `{ "version", "address", "chainId": 1337, "rpcUrl": "http://127.0.0.1:7545", "deployer" }` | Backend | Ngày 4 |
| Đặc tả interface | `shared/CONTRACT_INTERFACE.md`: hàm, tham số, quyền, enum, event, câu lỗi | Backend, Frontend (hiển thị trạng thái) | Ngày 2 |

**Những thứ đã chốt ở v1, không được tự ý đổi:**

- Tên và tham số hàm: `registerParticipant(address,string,uint8)`, `createProduct(string,string,string)`, `pickUpProduct(uint256,string)`, `receiveProduct(uint256,string)`, `markAsSold(uint256,string)`, `getProduct(uint256)`, `getHistory(uint256)`, `getAllParticipants()`, `productCount()`, `participants(address)`, `owner()`.
- Thứ tự enum: `Role` = None(0), Manufacturer(1), Transporter(2), Distributor(3), Retailer(4); `Status` = Manufactured(0) … Sold(5).
- Thứ tự trường trong struct `Product` và `History` (Backend đọc theo tên, nhưng giữ nguyên để an toàn).
- Câu lỗi `require/revert` (Frontend hiển thị nguyên văn qua Backend).

**Khi cần thay đổi interface:** mở PR riêng chỉ sửa `contracts/` + `shared/contract/` + `shared/CONTRACT_INTERFACE.md`, tăng `version` (v1 → v2), ghi mục *Changelog* ở cuối `CONTRACT_INTERFACE.md`, tag Backend review. Thêm hàm mới (không sửa hàm cũ) được coi là thay đổi an toàn.

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

Với Contract, M2 (Ngày 4) là mốc quan trọng thứ hai: Backend cần `deployment.json` để bắt đầu gọi Ganache thật từ Ngày 5.

## 4. Checklist công việc

Mỗi giai đoạn kết thúc bằng một PR vào nhánh `dev`. Code mẫu của contract nằm trong `docs/KE_HOACH_TONG.md`.

**Giai đoạn 0 — Cài đặt (Ngày 1)**

- [ ] `git clone`, `git checkout dev`, `npm install` ở thư mục gốc
- [ ] `npm run chain` (Ganache) và `npm run remixd` chạy được; Remix thấy workspace *localhost*

**Giai đoạn 1 — Chốt interface v1 (Ngày 1–2) → mốc M1**

- [ ] Viết khung `SupplyChain.sol`: đủ enum, struct, event, modifier và chữ ký mọi hàm (thân hàm có thể tạm để trống)
- [ ] Compile với Solidity 0.8.20+, **EVM version = paris**
- [ ] Copy ABI vào `shared/contract/SupplyChain.abi.json`
- [ ] Điền đầy đủ `shared/CONTRACT_INTERFACE.md`
- [ ] PR `contract → dev` → Backend duyệt → merge

**Giai đoạn 2 — Hiện thực logic (Ngày 3–4) → mốc M2**

- [ ] Viết thân các hàm, chú thích tiếng Việt cho từng khối
- [ ] Chạy thử trên *Remix VM* rồi trên Ganache (External Http Provider `http://127.0.0.1:7545`)
- [ ] Deploy bằng Account 0 trên Ganache vừa khởi động; ghi `shared/contract/deployment.json`
- [ ] Kiểm tra ABI không đổi so với v1 (nếu đổi → làm theo quy trình bump version)

**Giai đoạn 3 — Kiểm thử & tài liệu (Ngày 5–7)**

- [ ] `contracts/tests/SupplyChain_test.sol` dùng plugin *Solidity Unit Testing* của Remix, phủ đủ bảng ca kiểm thử ở mục 6
- [ ] `contracts/DEPLOY.md`: các bước deploy có ảnh chụp màn hình
- [ ] Hỗ trợ Backend khi gọi hàm bị revert bất ngờ

**Giai đoạn 4 — Tích hợp (Ngày 8–9) → mốc M3**

- [ ] `git pull` nhánh `dev`, khởi động lại Ganache sạch, deploy lại, cập nhật `deployment.json` nếu địa chỉ khác
- [ ] Chạy cùng cả nhóm kịch bản demo 6 bước qua giao diện, sửa lỗi phía contract

**Giai đoạn 5 — Demo (Ngày 10) → mốc M4**

- [ ] Trình bày phần contract trên Remix: cấu trúc, modifier, event, xem giao dịch trên Ganache

## 5. Quy tắc Git & làm việc với AI agent

Cả 3 lĩnh vực dùng chung một bộ quy tắc; phần riêng của Contract nằm trong `contracts/AGENTS.md`.

**Git:**

- Nhánh cố định của A: `contract`. Mọi việc Contract đều làm trên nhánh này, không tạo nhánh khác. Mô hình chung: `master` (demo) ← `dev` (ghép code) ← `contract` · `backend` · `frontend`.
- **Đầu phiên:** chọn nhánh `contract` → Fetch origin → Branch → Update from dev (lệnh: `git merge origin/dev`).
- **Cuối phiên:** commit hết → Push origin (việc dở dang cũng push).
- **Xong một phần:** mở Pull Request `contract` → `dev`; b4ox duyệt và merge bằng *Create a merge commit*; nhánh `contract` giữ lại dùng tiếp.
- Commit theo mẫu `feat(contract): ...`, `fix(contract): ...`, `docs(contract): ...`; trước khi commit chỉ được thấy file trong `contracts/`, `shared/contract/`, `shared/CONTRACT_INTERFACE.md`.
- Không push thẳng lên `dev`/`master`, không rebase, không force push.

**AI agent (Claude Code đọc `CLAUDE.md`, ChatGPT Codex đọc `AGENTS.md`):**

- Luôn mở agent **từ trong thư mục `contracts/`** (`cd contracts && claude` hoặc `cd contracts && codex`) để agent nạp cả rule gốc lẫn rule riêng của Contract.
- Agent chỉ được sửa file trong phạm vi ở mục 1; nếu thấy cần sửa ngoài phạm vi, agent phải dừng và báo lại.
- Agent không được đổi chữ ký hàm, enum, câu lỗi đã chốt; không thêm thư viện ngoài (OpenZeppelin, Hardhat…); không dùng assembly.
- Bạn vẫn là người đọc lại diff và tự commit.

## 6. Định nghĩa hoàn thành & kiểm thử

Phần Contract được coi là xong khi cả 7 ca dưới đây đạt trên Ganache, ABI trong `shared/` khớp với bản đã deploy, và Backend gọi được toàn bộ luồng mà không cần A sửa gì thêm.

| Ca kiểm thử | Kết quả mong đợi |
| --- | --- |
| Không phải admin gọi `registerParticipant` | Revert “Chi admin duoc phep” |
| Tài khoản chưa đăng ký gọi `createProduct` | Revert “Sai vai tro” |
| `pickUpProduct` khi sản phẩm ở trạng thái 1 | Revert “Chua the van chuyen o trang thai nay” |
| Nhà bán lẻ `receiveProduct` khi hàng còn ở bước 1 | Revert “Sai vai tro hoac sai trang thai” |
| `markAsSold` khi chưa tới cửa hàng | Revert “San pham chua den cua hang” |
| `getProduct(999)` | Revert “San pham khong ton tai” |
| Chạy đủ 6 bước | `getHistory` trả 6 bản ghi đúng thứ tự, `status` = 5 |

**Checklist trước khi mở PR:**

- [ ] Compile không lỗi, không warning với EVM `paris`
- [ ] ABI trong `shared/contract/` được copy từ lần compile cuối cùng
- [ ] Mọi khối code lớn có chú thích `// ===== ... =====`
- [ ] Không có file ngoài phạm vi trong diff
