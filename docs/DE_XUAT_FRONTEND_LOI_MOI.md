# Đề xuất thay đổi — Frontend v1.2: Lời mời tham gia quy trình

| Mục | Nội dung |
| --- | --- |
| Gửi | Thành viên C (`vothinhungoc7980-coder`), vùng Frontend |
| Từ | Điều phối viên `b4ox` (Backend) |
| File cần đổi | `frontend/js/api.js`, `frontend/js/products.js`, `frontend/js/actions.js`, `frontend/actions.html`, `frontend/js/trace.js`, `frontend/trace.html` |
| Phụ thuộc | Backend API v1.2 **đã xong** (xem `shared/API_SPEC.md`: endpoint 27–31, kiểu `Invitation`, `MyInvitation`, `InviteToSend`). Contract v1.2 do A làm (`docs/DE_XUAT_CONTRACT_LOI_MOI.md`). ABI mới tự có qua `GET /config` sau khi A cập nhật. |

## 1. Bối cảnh và quy tắc đã chốt

Hiện nay mọi doanh nghiệp cùng vai trò đều thấy và thao tác được mọi sản phẩm. Từ v1.2, mỗi sản phẩm có 4 nhiệm vụ.
Doanh nghiệp phải **được mời và chấp nhận** thì mới làm được bước tương ứng.

| task | Nhiệm vụ | Vai trò được mời | Ai mời |
| --- | --- | --- | --- |
| 0 | Vận chuyển đến nhà phân phối | Vận chuyển | Nhà sản xuất |
| 1 | Phân phối | Nhà phân phối | Nhà sản xuất |
| 2 | Vận chuyển đến cửa hàng | Vận chuyển | Nhà phân phối đã nhận task 1 |
| 3 | Bán lẻ | Nhà bán lẻ | Nhà phân phối đã nhận task 1 |

**Quy tắc theo chặng (đã chốt):** một chặng vận chuyển chỉ bắt đầu khi cả bên chở và bên nhận đã chấp nhận.
Chặng 1 gồm task 0 và 1, chặng 2 gồm task 2 và 3. Backend đã tính sẵn điều này trong `stage` và `waitingFor`.

**Quy tắc hiển thị:**
- Doanh nghiệp **không được mời** thì **không thấy** sản phẩm trong mục "Xử lý đơn".
- Họ vẫn xem được sản phẩm ở trang Sản phẩm và trang Tra cứu công khai.
- Việc ẩn chỉ để giao diện gọn. Chốt chặn thật nằm ở contract.

## 2. Trang "Xử lý đơn" (`actions.html`, `actions.js`)

Bỏ hàm `actionFor` (hiện đang lọc theo vai trò). Thay bằng **một lần gọi** `GET /invitations?address=<ví đang đăng nhập>`.
Backend đã tính sẵn `stage`, `canActNow` và `action`, frontend không cần tự suy luận theo trạng thái.

| Nhóm (tab hoặc khối) | Lọc | Nút | Hàm contract (ký MetaMask) |
| --- | --- | --- | --- |
| **Lời mời** | `stage === 'invited'` | Chấp nhận / Từ chối | `acceptInvitation(productId, task)` / `declineInvitation(productId, task)` |
| **Cần xử lý** | `stage === 'todo'` | Theo `action`: `pickup` / `receive` / `sell` | Dùng lại `CONTRACT_METHODS[action]` hiện có, args `(productId, note)` |
| **Sắp tới** | `stage === 'upcoming'` | Không có nút. Hiển thị lý do `waitingFor`, vd. "Chờ hàng đến bước của bạn", "Chờ nhà bán lẻ chấp nhận lời mời" | — |
| **Đã xong** (tuỳ chọn, thu gọn) | `stage === 'done'` | — | — |

Mỗi thẻ nên hiển thị:
- `productName`, `#productId` và `statusText` (badge).
- `taskText`.
- "Mời bởi: `inviterName`".

Thêm khối **"Cần mời"** cho Nhà sản xuất và Nhà phân phối, dữ liệu từ `GET /invitations/to-send?address=<ví>`:
- Mỗi phần tử `InviteToSend` gồm `productId`, `productName` và `tasks[]`. Mỗi task có `task`, `taskText`, `role`, `roleText`, `state`, `inviteeName`.
- Với mỗi task, hiện một ô chọn doanh nghiệp, lấy từ `GET /participants` và lọc `role === task.role && isActive`.
- Nếu `state === 'pending'`, ghi "Đang chờ **inviteeName** trả lời, có thể mời bên khác".
- Nút **Mời** gọi `inviteParticipant(productId, task, invitee)`.

Sau mỗi giao dịch thành công, gọi lại hai API trên để làm mới các nhóm.

## 3. Tạo sản phẩm (`products.js`, form tạo sản phẩm)

- Thêm 2 ô chọn tuỳ chọn:
  - **Đơn vị vận chuyển**: lọc `role === 2 && isActive`.
  - **Nhà phân phối**: lọc `role === 3 && isActive`.
- Có chọn ít nhất một ô thì gọi `createProductWithInvites(name, origin, description, transporter, distributor)`.
  Ô bỏ trống truyền `ethers.ZeroAddress`. Không chọn ô nào thì vẫn gọi `createProduct` như cũ.
- `productIdFromReceipt` vẫn dùng được, vì event `ProductCreated` không đổi.

## 4. Trang Tra cứu (`trace.js`, `trace.html`)

`GET /products/:id` có thêm trường `invitations`, luôn đủ 4 phần tử (rỗng nếu contract chưa nâng cấp).

Thêm khối **"Các bên tham gia"**:
- Mỗi dòng gồm `taskText`, `inviteeName` (hoặc "Chưa mời") và `stateText`.
- Khi `invitations.length === 0` thì ẩn khối.

## 5. Chế độ mock (Live Server)

Thêm vào `MOCK_FILES` trong `api.js`:

```js
'/invitations': 'invitations.json',               // ví dụ của ví Giao Hàng Nhanh: có đủ done / todo / invited
'/invitations/to-send': 'invitations-to-send.json', // ví dụ của ví NPP Miền Bắc
```

`product-1.json` đã có sẵn `invitations`. Khi chạy backend với `MOCK_CHAIN=true`, kết quả được tính theo đúng `address` truyền vào.

## 6. Câu lỗi contract cần hiển thị nguyên văn

`Ban chua nhan loi moi cho nhiem vu nay`, `Ban khong co quyen moi nhiem vu nay`, `Nhiem vu da qua`,
`Nhiem vu da co nguoi nhan`, `Doanh nghiep khong dung vai tro`, `Ban khong duoc moi`, `Da chap nhan roi`,
`Ben nhan chua chap nhan loi moi`.

## 7. Ca kiểm thử gợi ý

1. Đăng nhập bằng ví vận chuyển **không được mời**: "Xử lý đơn" trống, nhưng sản phẩm vẫn tra cứu được.
2. NSX tạo sản phẩm, chọn GHN và NPP Miền Bắc. GHN thấy sản phẩm ở **Lời mời**, bấm Chấp nhận thì sản phẩm chuyển sang **Cần xử lý** với nút "Nhận hàng đi giao".
3. NPP chấp nhận task 1 khi hàng còn ở xưởng: sản phẩm nằm ở **Sắp tới**, và khối **Cần mời** hiện task 2, 3.
4. Nhà bán lẻ từ chối: lời mời biến mất. NPP thấy task 3 ở **Cần mời** với trạng thái "Chưa mời".
5. Contract chưa nâng cấp: mọi khối lời mời trống, trang không báo lỗi.
6. GHN đã chấp nhận task 0 nhưng NPP chưa chấp nhận task 1: sản phẩm nằm ở **Sắp tới** với lý do
   "Chờ nhà phân phối chấp nhận lời mời". Khi NPP chấp nhận, sản phẩm chuyển sang **Cần xử lý**.
