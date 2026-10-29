# AGENTS.md — Vùng CONTRACT (chủ sở hữu: thành viên A)

Quy tắc chung ở `../AGENTS.md` vẫn áp dụng. File này bổ sung cho vùng Contract.

## Được sửa
- `contracts/**`
- `shared/contract/SupplyChain.abi.json`, `shared/contract/deployment.json`
- `shared/CONTRACT_INTERFACE.md`

Mọi file khác: chỉ đọc. Cần đổi API backend hay giao diện → viết "Đề xuất thay đổi", không tự sửa.

## Quy tắc Solidity
- Một contract duy nhất `SupplyChain.sol`, `pragma solidity ^0.8.20;`, `// SPDX-License-Identifier: MIT`.
- Chỉ dùng: `enum`, `struct`, `mapping`, mảng, `modifier`, `event`, `require/revert`.
- KHÔNG dùng: thư viện ngoài (OpenZeppelin...), kế thừa, `assembly`, proxy/upgradeable, `delegatecall`, Hardhat/Foundry.
- Không đặt tên hàm `receive`/`fallback` (trùng hàm đặc biệt) — dùng `receiveProduct`.
- Chuỗi trong `require/revert` viết KHÔNG DẤU (ASCII), giữ nguyên văn vì frontend hiển thị lại.
- Chia contract thành các khối có tiêu đề đánh số: `// ===== 1. KIỂU DỮ LIỆU =====`, `2. BIẾN TRẠNG THÁI`, `3. EVENTS`,
  `4. MODIFIERS`, `5. QUẢN LÝ THÀNH VIÊN`, `6. NGHIỆP VỤ`, `7. HÀM ĐỌC`, `8. HÀM NỘI BỘ`.
- Mỗi hàm public có chú thích 1–2 dòng: ai được gọi, chuyển trạng thái từ đâu sang đâu.

## Interface v1 (đóng băng sau M1) — xem `shared/CONTRACT_INTERFACE.md`
Không đổi chữ ký hàm, thứ tự enum, thứ tự trường struct, tên event, câu lỗi.
Được thêm hàm mới. Đổi phá vỡ → tăng `version` trong `deployment.json` + Changelog + báo Backend.

## Mỗi khi sửa contract
1. Compile trên Remix: Solidity 0.8.20+, Advanced → **EVM version = paris** (Ganache không hỗ trợ PUSH0).
2. Copy ABI mới vào `shared/contract/SupplyChain.abi.json` (định dạng JSON mảng, thụt lề 2 dấu cách).
3. Nếu deploy lại: Ganache vừa khởi động (`npm run chain`), Account 0, giao dịch đầu tiên → ghi địa chỉ vào `shared/contract/deployment.json`.

## Kiểm tra
- Unit test: `contracts/tests/SupplyChain_test.sol` chạy bằng plugin *Solidity Unit Testing* của Remix.
- Bảng ca kiểm thử bắt buộc nằm trong tài liệu "Lộ trình Smart Contract", mục 6.
