// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChain
 * @notice Truy xuất nguồn gốc sản phẩm qua các bên trong chuỗi cung ứng.
 */
contract SupplyChain {
    // ===== 1. KIỂU DỮ LIỆU =====
    // Vai trò của thành viên. None = chưa đăng ký.
    enum Role { None, Manufacturer, Transporter, Distributor, Retailer }

    // Thứ tự nhiệm vụ khớp với trạng thái mà nhiệm vụ cần xử lý.
    enum Task { TransportToDistributor, Distribute, TransportToRetailer, Retail }

    struct Invitation {
        address invitee;
        bool accepted;
    }

    // Các trạng thái sản phẩm, chỉ đi một chiều từ 0 -> 5.
    enum Status {
        Manufactured,           // 0: vừa sản xuất
        InTransitToDistributor, // 1: đang chở tới nhà phân phối
        AtDistributor,          // 2: đã ở nhà phân phối
        InTransitToRetailer,    // 3: đang chở tới cửa hàng
        AtRetailer,             // 4: đã ở cửa hàng
        Sold                    // 5: đã bán
    }

    struct Participant {
        string name;
        Role role;
        bool isActive;
    }

    struct Product {
        uint256 id;
        string name;
        string origin;        // nơi sản xuất
        string description;
        address manufacturer;
        address currentOwner; // ai đang giữ hàng
        Status status;
        uint256 createdAt;
    }

    // Mỗi bước trong hành trình của sản phẩm
    struct History {
        Status status;
        address actor;
        uint256 timestamp;
        string note;
    }

    // ===== 2. BIẾN TRẠNG THÁI =====
    address public owner;                               // admin = người deploy
    uint256 public productCount;                        // cũng là id của sản phẩm mới nhất
    mapping(address => Participant) public participants;
    address[] public participantList;                   // để liệt kê thành viên
    mapping(uint256 => Product) public products;
    mapping(uint256 => History[]) private histories;
    mapping(uint256 => Invitation[4]) private invitations;

    // ===== 3. EVENTS =====
    event ParticipantRegistered(address indexed account, string name, Role role);
    event ProductCreated(uint256 indexed id, string name, address indexed manufacturer);
    event StatusChanged(uint256 indexed id, Status status, address indexed actor, string note);
    event ParticipantDeactivated(address indexed account);
    event InvitationSent(uint256 indexed id, Task task, address indexed invitee, address indexed inviter);
    event InvitationAccepted(uint256 indexed id, Task task, address indexed invitee);
    event InvitationDeclined(uint256 indexed id, Task task, address indexed invitee);

    // ===== 4. MODIFIERS: kiểm tra điều kiện trước khi chạy hàm =====
    modifier onlyOwner() {
        require(msg.sender == owner, "Chi admin duoc phep");
        _;
    }

    modifier onlyRole(Role _role) {
        Participant memory p = participants[msg.sender];
        require(p.isActive && p.role == _role, "Sai vai tro");
        _;
    }

    modifier productExists(uint256 _id) {
        require(_id > 0 && _id <= productCount, "San pham khong ton tai");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ===== 5. QUẢN LÝ THÀNH VIÊN (chỉ admin) =====
    function registerParticipant(address _account, string memory _name, Role _role)
        external onlyOwner
    {
        require(_role != Role.None, "Vai tro khong hop le");
        // Chỉ thêm vào danh sách nếu là thành viên mới (tránh trùng)
        if (participants[_account].role == Role.None) {
            participantList.push(_account);
        }
        participants[_account] = Participant(_name, _role, true);
        emit ParticipantRegistered(_account, _name, _role);
    }

    // Admin thu hồi vai trò của một ví (ví dụ doanh nghiệp vi phạm).
    // Ví bị khoá không gọi được hàm nghiệp vụ nữa, lịch sử cũ giữ nguyên.
    // Muốn mở lại: admin gọi registerParticipant cho ví đó lần nữa.
    function deactivateParticipant(address _account) external onlyOwner {
        require(participants[_account].role != Role.None, "Chua duoc dang ky");
        require(participants[_account].isActive, "Thanh vien da bi khoa");
        participants[_account].isActive = false;
        emit ParticipantDeactivated(_account);
    }

    // ===== 6. NGHIỆP VỤ CHUỖI CUNG ỨNG =====
    // Bước 0: nhà sản xuất tạo sản phẩm
    function createProduct(string memory _name, string memory _origin, string memory _description)
        external onlyRole(Role.Manufacturer)
    {
        _createProduct(_name, _origin, _description);
    }

    // Nhà sản xuất tạo sản phẩm và có thể mời hai đối tác trong cùng giao dịch.
    function createProductWithInvites(
        string memory _name, string memory _origin, string memory _description,
        address _transporter, address _distributor
    ) external onlyRole(Role.Manufacturer) {
        uint256 id = _createProduct(_name, _origin, _description);
        if (_transporter != address(0)) _invite(id, Task.TransportToDistributor, _transporter);
        if (_distributor != address(0)) _invite(id, Task.Distribute, _distributor);
    }

    // Nhà sản xuất hoặc NPP phụ trách mời đối tác cho nhiệm vụ chưa được nhận.
    function inviteParticipant(uint256 _id, Task _task, address _invitee) external productExists(_id) {
        _invite(_id, _task, _invitee);
    }

    // Chỉ ví được mời, còn hoạt động và đúng vai trò mới được chấp nhận.
    function acceptInvitation(uint256 _id, Task _task) external productExists(_id) {
        Invitation storage invitation = invitations[_id][uint256(_task)];
        require(invitation.invitee == msg.sender, "Ban khong duoc moi");
        require(uint8(products[_id].status) <= uint8(_task), "Nhiem vu da qua");
        require(!invitation.accepted, "Da chap nhan roi");
        Participant storage participant = participants[msg.sender];
        require(participant.isActive, "Chua duoc dang ky");
        require(participant.role == _taskRole(_task), "Doanh nghiep khong dung vai tro");
        invitation.accepted = true;
        emit InvitationAccepted(_id, _task, msg.sender);
    }

    // Từ chối lời mời đang chờ để người phụ trách có thể chọn đối tác khác.
    function declineInvitation(uint256 _id, Task _task) external productExists(_id) {
        Invitation storage invitation = invitations[_id][uint256(_task)];
        require(invitation.invitee == msg.sender, "Ban khong duoc moi");
        require(!invitation.accepted, "Da chap nhan roi");
        delete invitations[_id][uint256(_task)];
        emit InvitationDeclined(_id, _task, msg.sender);
    }

    // Bước 1 và 3: đơn vị vận chuyển nhận hàng đi giao
    function pickUpProduct(uint256 _id, string memory _note)
        external onlyRole(Role.Transporter) productExists(_id)
    {
        Product storage p = products[_id];
        if (p.status == Status.Manufactured) {
            _requireAccepted(_id, Task.TransportToDistributor);
            _requireReceiverReady(_id, Task.Distribute);
            p.status = Status.InTransitToDistributor;
        } else if (p.status == Status.AtDistributor) {
            _requireAccepted(_id, Task.TransportToRetailer);
            _requireReceiverReady(_id, Task.Retail);
            p.status = Status.InTransitToRetailer;
        } else {
            revert("Chua the van chuyen o trang thai nay");
        }
        p.currentOwner = msg.sender;
        _addHistory(_id, p.status, _note);
    }

    // Bước 2 và 4: nhà phân phối / nhà bán lẻ xác nhận đã nhận hàng
    function receiveProduct(uint256 _id, string memory _note)
        external productExists(_id)
    {
        Participant memory me = participants[msg.sender];
        require(me.isActive, "Chua duoc dang ky");
        Product storage p = products[_id];

        if (me.role == Role.Distributor && p.status == Status.InTransitToDistributor) {
            _requireAccepted(_id, Task.Distribute);
            p.status = Status.AtDistributor;
        } else if (me.role == Role.Retailer && p.status == Status.InTransitToRetailer) {
            _requireAccepted(_id, Task.Retail);
            p.status = Status.AtRetailer;
        } else {
            revert("Sai vai tro hoac sai trang thai");
        }
        p.currentOwner = msg.sender;
        _addHistory(_id, p.status, _note);
    }

    // Bước 5: nhà bán lẻ bán cho người tiêu dùng
    function markAsSold(uint256 _id, string memory _note)
        external onlyRole(Role.Retailer) productExists(_id)
    {
        Product storage p = products[_id];
        require(p.status == Status.AtRetailer, "San pham chua den cua hang");
        require(p.currentOwner == msg.sender, "Ban khong giu san pham nay");
        p.status = Status.Sold;
        _addHistory(_id, Status.Sold, _note);
    }

    // ===== 7. HÀM ĐỌC (view, không tốn gas) =====
    // Trả bốn ô lời mời theo thứ tự enum Task, kể cả các ô trống.
    function getInvitations(uint256 _id) external view productExists(_id) returns (Invitation[4] memory) {
        return invitations[_id];
    }

    function getProduct(uint256 _id) external view productExists(_id) returns (Product memory) {
        return products[_id];
    }

    function getHistory(uint256 _id) external view productExists(_id) returns (History[] memory) {
        return histories[_id];
    }

    function getAllParticipants() external view returns (address[] memory) {
        return participantList;
    }

    // ===== 8. HÀM NỘI BỘ =====
    function _createProduct(string memory _name, string memory _origin, string memory _description)
        internal returns (uint256 id)
    {
        id = ++productCount;
        products[id] = Product(
            id, _name, _origin, _description,
            msg.sender, msg.sender, Status.Manufactured, block.timestamp
        );
        _addHistory(id, Status.Manufactured, "San pham duoc tao");
        emit ProductCreated(id, _name, msg.sender);
    }

    function _taskRole(Task _task) internal pure returns (Role) {
        if (_task == Task.Distribute) return Role.Distributor;
        if (_task == Task.Retail) return Role.Retailer;
        return Role.Transporter;
    }

    // Chặng sau thuộc NPP đã nhận nhiệm vụ phân phối của chính sản phẩm này.
    function _canInvite(uint256 _id, Task _task) internal view returns (bool) {
        Participant storage participant = participants[msg.sender];
        if (_task == Task.TransportToDistributor || _task == Task.Distribute) {
            return participant.isActive && participant.role == Role.Manufacturer && products[_id].manufacturer == msg.sender;
        }
        Invitation storage distributor = invitations[_id][uint256(Task.Distribute)];
        return participant.isActive && participant.role == Role.Distributor
            && distributor.accepted && distributor.invitee == msg.sender;
    }

    function _invite(uint256 _id, Task _task, address _invitee) internal {
        require(_canInvite(_id, _task), "Ban khong co quyen moi nhiem vu nay");
        require(uint8(products[_id].status) <= uint8(_task), "Nhiem vu da qua");
        Invitation storage invitation = invitations[_id][uint256(_task)];
        require(!invitation.accepted, "Nhiem vu da co nguoi nhan");
        Participant storage participant = participants[_invitee];
        require(_invitee != address(0) && participant.isActive && participant.role == _taskRole(_task),
            "Doanh nghiep khong dung vai tro");
        invitation.invitee = _invitee;
        emit InvitationSent(_id, _task, _invitee, msg.sender);
    }

    function _requireAccepted(uint256 _id, Task _task) internal view {
        Invitation storage invitation = invitations[_id][uint256(_task)];
        require(invitation.invitee == msg.sender && invitation.accepted, "Ban chua nhan loi moi cho nhiem vu nay");
    }

    // Bên nhận phải còn khả năng xác nhận khi hàng bắt đầu được giao.
    function _requireReceiverReady(uint256 _id, Task _task) internal view {
        Invitation storage invitation = invitations[_id][uint256(_task)];
        Participant storage receiver = participants[invitation.invitee];
        require(invitation.accepted && receiver.isActive && receiver.role == _taskRole(_task),
            "Ben nhan chua chap nhan loi moi");
    }

    // Ghi một bước vào lịch sử và phát event để bên ngoài theo dõi
    function _addHistory(uint256 _id, Status _status, string memory _note) internal {
        histories[_id].push(History(_status, msg.sender, block.timestamp, _note));
        emit StatusChanged(_id, _status, msg.sender, _note);
    }
}
