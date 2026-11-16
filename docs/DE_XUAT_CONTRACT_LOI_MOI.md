> **Trạng thái:** đã triển khai ở v1.2. Từ v1.3 (giao nhận hai đầu, R1–R6) xem `docs/QUY_TRINH_GIAO_NHAN.md` —
> một số quy tắc dưới đây đã thay đổi (vd. `Nhiem vu da qua` nay áp dụng khi *chặng đã bắt đầu*).

# Đề xuất thay đổi — Contract v1.2: Lời mời tham gia quy trình

| Mục | Nội dung |
| --- | --- |
| Gửi | Thành viên A (`nhungtrieu2005uh-bot`) — vùng Contract |
| Từ | Điều phối viên `b4ox` (Backend) |
| File cần đổi | `contracts/SupplyChain.sol`, `contracts/tests/*`, `shared/contract/SupplyChain.abi.json`, `shared/contract/deployment.json`, `shared/CONTRACT_INTERFACE.md` |
| Backend | Đã làm xong phần đọc lời mời (API v1.2, xem `shared/API_SPEC.md`). Backend tự nhận ra ABI mới, chưa có thì trả rỗng |

## 1. Vấn đề

Hiện nay `pickUpProduct` và `receiveProduct` chỉ kiểm tra **vai trò** và **trạng thái**, không kiểm tra **ai** được giao.
Bất kỳ ví Vận chuyển nào cũng nhận được mọi sản phẩm ở trạng thái 0 hoặc 2. Bất kỳ Nhà phân phối hay Nhà bán lẻ nào
cũng "xác nhận đã nhận" được mọi sản phẩm đang trên đường. Ai bấm trước thì người đó lấy hàng.

## 2. Quy trình đã chốt

Mỗi sản phẩm có 4 nhiệm vụ. Doanh nghiệp phải **được mời và chấp nhận** thì mới làm được bước của mình.

| Task | Tên | Vai trò được mời | Ai được mời | Bước được mở khoá |
| --- | --- | --- | --- | --- |
| 0 | TransportToDistributor | Transporter | Nhà sản xuất của sản phẩm | `pickUpProduct` khi `Manufactured` |
| 1 | Distribute | Distributor | Nhà sản xuất của sản phẩm | `receiveProduct` khi `InTransitToDistributor` |
| 2 | TransportToRetailer | Transporter | NPP **đã chấp nhận** task 1 | `pickUpProduct` khi `AtDistributor` |
| 3 | Retail | Retailer | NPP **đã chấp nhận** task 1 | `receiveProduct` khi `InTransitToRetailer` (sau đó `markAsSold` như cũ) |

Quy tắc chung:

- Mời và mời lại được khi lời mời **chưa được chấp nhận** và `uint8(status) <= uint8(task)`, tức là bước đó chưa qua.
- Người được mời phải là thành viên **đang hoạt động** và **đúng vai trò** của nhiệm vụ.
- Từ chối thì ô nhiệm vụ trống lại để người mời chọn doanh nghiệp khác.
- Đã chấp nhận thì không huỷ được. Đây là giới hạn của v1.2, xem mục 6.
- **Quy tắc theo chặng (đã chốt):** một chặng vận chuyển chỉ bắt đầu khi **cả bên chở và bên nhận** đã chấp nhận.
  - Chặng 1 (`pickUpProduct` khi `Manufactured`) cần task 0 **và** task 1 đã chấp nhận.
  - Chặng 2 (`pickUpProduct` khi `AtDistributor`) cần task 2 **và** task 3 đã chấp nhận.
  - Mục đích: hàng không bao giờ lên xe khi chưa có nơi nhận xác nhận. Không bắt buộc cả 4 bên đồng ý từ đầu,
    vì NPP thường chọn cửa hàng sau.

## 3. Interface đề xuất (chỉ THÊM mới, không đổi struct, enum hay hàm cũ)

Backend đã code theo đúng các tên và thứ tự dưới đây. Nếu đổi, vui lòng báo `b4ox`.

```solidity
enum Task { TransportToDistributor, Distribute, TransportToRetailer, Retail }

struct Invitation {
    address invitee;  // 0x0 = chưa mời
    bool accepted;
}

function inviteParticipant(uint256 _id, Task _task, address _invitee) external;
function acceptInvitation(uint256 _id, Task _task) external;
function declineInvitation(uint256 _id, Task _task) external;
function createProductWithInvites(string memory _name, string memory _origin, string memory _description,
                                  address _transporter, address _distributor) external; // 0x0 = mời sau
function getInvitations(uint256 _id) external view returns (Invitation[4] memory);

event InvitationSent(uint256 indexed id, Task task, address indexed invitee, address indexed inviter);
event InvitationAccepted(uint256 indexed id, Task task, address indexed invitee);
event InvitationDeclined(uint256 indexed id, Task task, address indexed invitee);
```

Câu lỗi mới (không dấu). Frontend hiển thị nguyên văn các câu này:

| Câu lỗi | Khi nào |
| --- | --- |
| `Ban khong co quyen moi nhiem vu nay` | Người mời không phải NSX (task 0, 1) hoặc không phải NPP đã nhận task 1 (task 2, 3) |
| `Nhiem vu da qua` | Mời hoặc chấp nhận khi sản phẩm đã qua bước đó |
| `Nhiem vu da co nguoi nhan` | Mời lại khi đã có người chấp nhận |
| `Doanh nghiep khong dung vai tro` | Ví được mời không hoạt động hoặc sai vai trò |
| `Ban khong duoc moi` | Chấp nhận hoặc từ chối lời mời không phải của mình |
| `Da chap nhan roi` | Chấp nhận hoặc từ chối lời mời đã chấp nhận |
| `Ban chua nhan loi moi cho nhiem vu nay` | `pickUpProduct` / `receiveProduct` khi chưa chấp nhận đúng nhiệm vụ |
| `Ben nhan chua chap nhan loi moi` | `pickUpProduct` khi bên nhận của chặng (task 1 hoặc 3) chưa chấp nhận |

## 4. Code tham khảo

A tự quyết cách viết cuối cùng. Đoạn dưới đây chỉ để thống nhất hành vi.

```solidity
// ===== LỜI MỜI (v1.2) =====
mapping(uint256 => Invitation[4]) private invitations; // productId => 4 nhiệm vụ

// Vai trò được mời cho từng nhiệm vụ
function _taskRole(Task _task) internal pure returns (Role) {
    if (_task == Task.Distribute) return Role.Distributor;
    if (_task == Task.Retail) return Role.Retailer;
    return Role.Transporter;
}

// Task 0, 1: nhà sản xuất mời. Task 2, 3: NPP đã chấp nhận task 1 mời.
function _canInvite(uint256 _id, Task _task, address _who) internal view returns (bool) {
    if (_task == Task.TransportToDistributor || _task == Task.Distribute) {
        return products[_id].manufacturer == _who;
    }
    Invitation memory d = invitations[_id][uint256(Task.Distribute)];
    return d.accepted && d.invitee == _who;
}

function _invite(uint256 _id, Task _task, address _invitee) internal {
    require(_canInvite(_id, _task, msg.sender), "Ban khong co quyen moi nhiem vu nay");
    require(uint8(products[_id].status) <= uint8(_task), "Nhiem vu da qua");
    Invitation storage inv = invitations[_id][uint256(_task)];
    require(!inv.accepted, "Nhiem vu da co nguoi nhan");
    Participant memory p = participants[_invitee];
    require(p.isActive && p.role == _taskRole(_task), "Doanh nghiep khong dung vai tro");
    inv.invitee = _invitee;
    emit InvitationSent(_id, _task, _invitee, msg.sender);
}

function _requireAccepted(uint256 _id, Task _task) internal view {
    Invitation memory inv = invitations[_id][uint256(_task)];
    require(inv.invitee == msg.sender && inv.accepted, "Ban chua nhan loi moi cho nhiem vu nay");
}

// Quy tắc theo chặng: bên nhận của chặng (task 1 hoặc 3) phải đã chấp nhận
function _requireReceiverReady(uint256 _id, Task _receiverTask) internal view {
    require(invitations[_id][uint256(_receiverTask)].accepted, "Ben nhan chua chap nhan loi moi");
}

function inviteParticipant(uint256 _id, Task _task, address _invitee) external productExists(_id) {
    _invite(_id, _task, _invitee);
}

function acceptInvitation(uint256 _id, Task _task) external productExists(_id) {
    Invitation storage inv = invitations[_id][uint256(_task)];
    require(inv.invitee == msg.sender, "Ban khong duoc moi");
    require(!inv.accepted, "Da chap nhan roi");
    require(participants[msg.sender].isActive, "Chua duoc dang ky");
    require(uint8(products[_id].status) <= uint8(_task), "Nhiem vu da qua");
    inv.accepted = true;
    emit InvitationAccepted(_id, _task, msg.sender);
}

function declineInvitation(uint256 _id, Task _task) external productExists(_id) {
    Invitation storage inv = invitations[_id][uint256(_task)];
    require(inv.invitee == msg.sender, "Ban khong duoc moi");
    require(!inv.accepted, "Da chap nhan roi");
    delete invitations[_id][uint256(_task)]; // trống lại để mời bên khác
    emit InvitationDeclined(_id, _task, msg.sender);
}

function getInvitations(uint256 _id) external view productExists(_id) returns (Invitation[4] memory) {
    return invitations[_id];
}
```

Sửa các hàm cũ. Tên và tham số giữ nguyên:

```solidity
// createProduct: tách thân hàm ra _createProduct(...) returns (uint256 id) để dùng lại
function createProductWithInvites(string memory _name, string memory _origin, string memory _description,
    address _transporter, address _distributor) external onlyRole(Role.Manufacturer)
{
    uint256 id = _createProduct(_name, _origin, _description);
    if (_transporter != address(0)) _invite(id, Task.TransportToDistributor, _transporter);
    if (_distributor != address(0)) _invite(id, Task.Distribute, _distributor);
}

// pickUpProduct
if (p.status == Status.Manufactured) {
    _requireAccepted(_id, Task.TransportToDistributor);
    _requireReceiverReady(_id, Task.Distribute);   // chặng 1: NPP đã chấp nhận
    p.status = Status.InTransitToDistributor;
} else if (p.status == Status.AtDistributor) {
    _requireAccepted(_id, Task.TransportToRetailer);
    _requireReceiverReady(_id, Task.Retail);       // chặng 2: nhà bán lẻ đã chấp nhận
    p.status = Status.InTransitToRetailer;
} ...

// receiveProduct
if (me.role == Role.Distributor && p.status == Status.InTransitToDistributor) {
    _requireAccepted(_id, Task.Distribute);
    ...
} else if (me.role == Role.Retailer && p.status == Status.InTransitToRetailer) {
    _requireAccepted(_id, Task.Retail);
    ...
}
// markAsSold giữ nguyên (đã kiểm tra currentOwner)
```

## 5. Test cần thêm (`contracts/tests/`)

1. NSX mời task 0, 1 thành công. Ví khác (kể cả NSX khác) mời thì nhận lỗi `Ban khong co quyen moi nhiem vu nay`.
2. Mời ví sai vai trò (vd. mời Retailer cho task 0) hoặc ví đã bị khoá thì nhận lỗi `Doanh nghiep khong dung vai tro`.
3. Vận chuyển **chưa chấp nhận** mà gọi `pickUpProduct` thì nhận lỗi `Ban chua nhan loi moi cho nhiem vu nay`.
4. Vận chuyển **khác** (cùng vai trò, không được mời) gọi `pickUpProduct` thì nhận cùng lỗi trên. Đây là ca chính của vấn đề.
5. NPP khác gọi `receiveProduct` thì nhận lỗi `Ban chua nhan loi moi cho nhiem vu nay`.
6. NPP chưa chấp nhận task 1 mà mời task 2 thì nhận lỗi `Ban khong co quyen moi nhiem vu nay`. Sau khi chấp nhận thì mời được.
7. Từ chối thì `getInvitations` trả về ô trống, và NSX mời được bên khác.
8. Mời lại task đã chấp nhận thì nhận lỗi `Nhiem vu da co nguoi nhan`.
9. Mời hoặc chấp nhận task 0 sau khi sản phẩm đã sang trạng thái 1 thì nhận lỗi `Nhiem vu da qua`.
10. Luồng đủ 6 bước với 4 lời mời đã chấp nhận vẫn chạy như trước.
11. `createProductWithInvites` với `0x0` thì không tạo lời mời. Với địa chỉ hợp lệ thì gửi đúng 2 lời mời.
12. Vận chuyển đã chấp nhận task 0 nhưng NPP chưa chấp nhận task 1 (hoặc chưa được mời), gọi `pickUpProduct` thì nhận lỗi `Ben nhan chua chap nhan loi moi`.
13. Tương tự ở chặng 2: task 2 đã chấp nhận, task 3 chưa, thì nhận cùng lỗi trên. Khi nhà bán lẻ chấp nhận thì `pickUpProduct` chạy được.

## 6. Việc sau khi sửa và các câu hỏi để ngỏ

- Sửa luôn lỗi ở dòng 1 của `SupplyChain.sol`: đang là `w// SPDX-License-Identifier: MIT`, có một chữ `w` thừa nên không compile được.
- Xuất lại ABI vào `shared/contract/SupplyChain.abi.json`, deploy lại lên Sepolia, cập nhật `address` và `deployBlock` trong `deployment.json`.
- Ghi Changelog **v1.2.0** trong `CONTRACT_INTERFACE.md`. Thay đổi này không phá tương thích ABI, nhưng **đổi hành vi**:
  contract mới bắt buộc phải có lời mời đã chấp nhận thì mới `pickUp`/`receive` được.
- Câu hỏi để ngỏ (v1.2 tạm chưa làm):
  - Có cho người mời **huỷ** một lời mời đã được chấp nhận không, ví dụ khi đối tác bỏ ngang?
  - Có cho NSX mời luôn task 2, 3 khi NPP chưa chọn không?
  - Nếu đã kiểm tra bên nhận ở `pickUpProduct`, có cần kiểm tra lại ở `acceptInvitation` hay không? Đề xuất: không cần.
