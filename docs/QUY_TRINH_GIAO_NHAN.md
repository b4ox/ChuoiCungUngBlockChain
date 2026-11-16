# Quy trình lời mời và giao nhận hai đầu (v1.3)

> Tài liệu chung, do điều phối viên `b4ox` quản lý. Đặc tả kỹ thuật nằm ở `shared/CONTRACT_INTERFACE.md`
> (mục "Giao nhận hai đầu v1.3") và `shared/API_SPEC.md` (mục "Luồng v1.3").

## 1. Giả định của dự án

- Các doanh nghiệp **đã ký hợp đồng ngoài đời** trước khi lên website.
- Website **không thay hợp đồng**. Trên chuỗi chỉ ghi **bằng chứng thực hiện**: ai được giao việc gì, ai đã nhận lời,
  ai đã giao và nhận hàng vào lúc nào. Giao diện và báo cáo không dùng cách nói "ký hợp đồng trên blockchain".
- Mỗi sản phẩm là **một lô hàng hoặc đơn hàng** theo hợp đồng. Lô nào cũng cần được mời và xác nhận riêng.
- Giá, điều khoản và nội dung hợp đồng **không ghi lên chuỗi**, vì dữ liệu trên chuỗi là công khai.
- Tranh chấp và việc huỷ hợp đồng được giải quyết ngoài đời. Website chỉ ghi lại kết quả: người mời huỷ lời mời,
  hoặc quản trị viên chuyển nhiệm vụ cho bên khác.
- Nhà sản xuất là bên thuê vận chuyển chặng 1, nhà phân phối thuê vận chuyển chặng 2. Đây là giả định cố định của hệ thống.

## 2. Nhiệm vụ và người mời

| Chặng | Task | Nhiệm vụ | Vai trò được mời | Ai mời |
| --- | --- | --- | --- | --- |
| 1 | 0 | Vận chuyển đến nhà phân phối | Vận chuyển | Nhà sản xuất của sản phẩm |
| 1 | 1 | Phân phối | Nhà phân phối | Nhà sản xuất của sản phẩm |
| 2 | 2 | Vận chuyển đến cửa hàng | Vận chuyển | Nhà phân phối **đã nhận** task 1 |
| 2 | 3 | Bán lẻ | Nhà bán lẻ | Nhà phân phối **đã nhận** task 1 |

- Một doanh nghiệp có thể nhận nhiều lời mời cùng lúc, ở nhiều sản phẩm khác nhau.
- Nhà phân phối mời được chặng 2 ngay sau khi nhận lời task 1, không cần chờ hàng về kho.
- **Một chặng chỉ bắt đầu khi cả hai doanh nghiệp của chặng đã nhận lời** và đều còn hoạt động.

## 3. Giao nhận hai đầu

| Bước | Trạng thái | Bên gửi bấm "Xác nhận đã giao" | Bên nhận bấm "Xác nhận đã nhận" |
| --- | --- | --- | --- |
| 0 | Đã sản xuất → Đang tới NPP | Nhà sản xuất | Vận chuyển chặng 1 |
| 1 | Đang tới NPP → Ở NPP | Vận chuyển chặng 1 | Nhà phân phối |
| 2 | Ở NPP → Đang tới cửa hàng | Nhà phân phối | Vận chuyển chặng 2 |
| 3 | Đang tới cửa hàng → Ở cửa hàng | Vận chuyển chặng 2 | Nhà bán lẻ |
| — | Ở cửa hàng → Đã bán | Nhà bán lẻ bấm "Đánh dấu đã bán" (một bên) | — |

- Hai bên bấm theo thứ tự nào cũng được. **Đủ hai bên thì trạng thái mới đổi.** Mỗi bên chỉ xác nhận một lần.
- Lịch sử sản phẩm vẫn có 6 dòng như trước, người thực hiện mỗi bước là bên nhận.
  Thời điểm và ghi chú của cả hai bên hiện ở khối **"Giao nhận hai đầu"** trên trang Tra cứu.

## 4. Thay đổi lời mời

"Chặng đã bắt đầu" nghĩa là đã qua bước mở chặng, hoặc đã có một bên bấm xác nhận ở bước mở chặng (bước 0 hoặc 2).

| # | Quy tắc | Khi nào được làm |
| --- | --- | --- |
| R1 | Người mời mời bên khác thay cho lời mời đang chờ, hoặc thay bên đã nhận lời nhưng **bị khoá hoặc sai vai trò** | Chặng chưa bắt đầu |
| R2 | Bên được mời **từ chối** lời mời, hoặc **rút lui** sau khi đã nhận lời | Chặng chưa bắt đầu |
| R3 | Người mời **huỷ** lời mời, kể cả lời mời đã được nhận | Chặng chưa bắt đầu |
| R4 | Nhà phân phối thay đổi (vì bất kỳ lý do nào) thì lời mời chặng 2 **tự xoá**. Nhà phân phối mới mời lại | Tự động |
| R5 | **Quản trị viên chuyển nhiệm vụ** của bên bị khoá sang doanh nghiệp khác. Bên mới được ghi là đã nhận lời, theo hợp đồng ngoài đời. Nếu bên cũ đang giữ hàng thì hàng chuyển sang bên mới. Bước giao nhận đang làm dở phải xác nhận lại. Thao tác được ghi vào lịch sử | Bất kỳ lúc nào trước khi nhiệm vụ xong, và chỉ khi bên cũ không còn hợp lệ |
| R6 | Không đổi được vai trò của ví đã đăng ký. Quản trị viên chỉ mở khoá lại đúng vai trò cũ | Luôn luôn |

Khi chặng đã bắt đầu, mọi lời mời của chặng bị khoá. Lúc đó chỉ quản trị viên can thiệp được (R5).

**Giới hạn đã biết:** nhà sản xuất bị khoá khi sản phẩm còn ở xưởng thì không ai giao hàng thay được.
Quản trị viên cần mở khoá lại ví đó.

## 5. Ai thấy gì trên trang "Xử lý đơn"

| Nhóm | Nội dung |
| --- | --- |
| Lời mời | Lời mời chưa trả lời, có nút Chấp nhận / Từ chối |
| Cần xử lý | Đến lượt mình xác nhận, hoặc bán hàng. Có nút Rút lui nếu chặng chưa bắt đầu |
| Sắp tới | Chưa đến lượt, kèm lý do: chờ hàng đến, chờ đủ hai bên của chặng nhận lời, hoặc chờ bên kia xác nhận |
| Cần mời | Lời mời mình quản lý khi chặng chưa bắt đầu: mời, mời lại, huỷ |
| Đã xong | Nhiệm vụ đã hoàn tất |

Doanh nghiệp không được mời sẽ **không thấy** sản phẩm trong mục này, nhưng vẫn tra cứu công khai được.
Việc ẩn chỉ để giao diện gọn hơn. Chốt chặn thật sự nằm ở contract.

Trang **Quản trị → Chuyển nhiệm vụ** liệt kê các nhiệm vụ có bên đã nhận lời nhưng đã bị khoá (R5).

## 6. Dữ liệu demo (`npm run seed`, Ganache)

| Sản phẩm | Tình huống |
| --- | --- |
| #1 Trà xanh | Đi hết 6 bước, đủ cả 4 lời mời |
| #2 Cà phê | Đang ở nhà phân phối. Nhà phân phối chưa mời chặng 2, nên sản phẩm nằm ở mục "Cần mời" |
| #3 Gạo ST25 | Vận chuyển và nhà phân phối mới được mời, chưa trả lời |
| #4 Mật ong | Vận chuyển đã xác nhận giao, nhà phân phối cần bấm "Xác nhận đã nhận" |

## 7. Kiểm thử đã chạy (v1.3)

- Contract: 26 test Remix (`contracts/tests/`) và 53 ca kịch bản trên Ganache.
- Backend: 25 ca gọi API thật trên Ganache, bao gồm `fresh=1` sau giao dịch ký trực tiếp và R5, R6.
- Frontend: 13 ca chạy giao diện thật (đăng nhập bằng ví, nhận lời, giao nhận hai đầu, mời, huỷ, admin chuyển nhiệm vụ).

Khi deploy lên Sepolia, bật **Enable optimization (200 runs)** trong Remix. Contract v1.3 khi tắt optimizer
có kích thước khoảng 24,2KB, sát giới hạn 24KB của mạng.
