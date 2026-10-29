# AGENTS.md — Vùng FRONTEND (chủ sở hữu: thành viên C – `vothinhungoc7980-coder`)

Quy tắc chung ở `../AGENTS.md` vẫn áp dụng. File này bổ sung cho vùng Frontend.
Lộ trình, checklist và ca kiểm thử: `../docs/LO_TRINH_FRONTEND.md`. Mô tả 5 trang và code mẫu: `../docs/KE_HOACH_TONG.md`, mục 6.

## Được sửa
(Trừ `AGENTS.md` và `CLAUDE.md` trong thư mục này — đó là thông tin chung, chỉ điều phối viên `b4ox` sửa.)
- `frontend/**` — và chỉ thế thôi.

Chỉ đọc: `shared/API_SPEC.md`, `shared/mock/**`, `shared/CONTRACT_INTERFACE.md`. Không đụng `backend/`, `contracts/`.
Thiếu dữ liệu cần hiển thị → viết "Đề xuất thay đổi" cho Backend, không tự sửa `shared/`.

## Công nghệ cố định
HTML5 + CSS + JavaScript thuần (script thường, không ES module bundler), Bootstrap 5.3 + Bootstrap Icons qua CDN.
KHÔNG dùng: React/Vue/Angular, npm build, TypeScript, jQuery, ethers.js/web3.js (frontend không gọi blockchain).

## Cấu trúc
```
frontend/
├── index.html  admin.html  products.html  actions.html  trace.html
├── css/style.css
├── img/qr-sample.png            # ảnh QR dùng khi chạy mock
└── js/
    ├── config.js                # CONFIG.USE_MOCK, API_BASE, MOCK_BASE, MOCK_FAIL
    ├── api.js                   # apiGet / apiPost (+ ánh xạ mock)
    ├── common.js                # navbar, chọn vai, showToast, shortAddress, statusBadge
    └── dashboard.js admin.js products.js actions.js trace.js
```
Thứ tự nạp script trong mỗi trang: `config.js` → `api.js` → `common.js` → script của trang.

## Quy tắc quan trọng
- Mọi dữ liệu lấy qua `apiGet(url)` / `apiPost(url, body)` trong `api.js`. Trang KHÔNG gọi `fetch` trực tiếp.
- `apiPost` tự gắn `from` = tài khoản đang đóng vai (lưu trong `localStorage` key `currentAccount`).
- Khi `CONFIG.USE_MOCK = true`: GET đọc `../shared/mock/<file>.json` theo bảng ánh xạ; POST trả `tx-success.json`
  sau 800 ms (hoặc `error.json` nếu `MOCK_FAIL = true`); ảnh QR dùng `img/qr-sample.png`.
- Hiển thị trạng thái/vai trò bằng `statusText`/`roleText` từ API, màu badge theo `status` (0–5).
- Khi chờ giao dịch: khoá nút + spinner; luôn mở lại nút trong `finally`.
- Mỗi trang có 1 file JS riêng; hàm dùng chung đặt trong `common.js`.

## Kiểm tra
- Chạy bằng Live Server mở từ THƯ MỤC GỐC: `http://127.0.0.1:5500/frontend/index.html` (mock).
- Console không lỗi đỏ; thử cả `MOCK_FAIL = true`.
- Bảng ca kiểm thử trong `docs/LO_TRINH_FRONTEND.md`, mục 6.
