# shared/ — Giao diện chung giữa 3 vùng

Đây là "hợp đồng" giữa Contract, Backend và Frontend. Mỗi file có đúng MỘT chủ sở hữu được sửa.

| File | Chủ sở hữu | Người dùng | Trạng thái |
| --- | --- | --- | --- |
| `CONTRACT_INTERFACE.md` | Contract (A) | Backend, Frontend | v1 – bản nháp, A xác nhận tại M1 |
| `contract/SupplyChain.abi.json` | Contract (A) | Backend | A thêm tại M1 (copy từ Remix) |
| `contract/deployment.json` | Contract (A) | Backend | A cập nhật tại M2 |
| `API_SPEC.md` | Backend (B) | Frontend | v1 – bản nháp, B xác nhận tại M1 |
| `mock/*.json` | Backend (B) | Frontend (và Backend khi `MOCK_CHAIN=true`) | v1 – bản nháp |

Sau M1: chỉ được THÊM. Đổi/xoá → tăng version + Changelog + bên phụ thuộc duyệt PR.
