// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChain
 * @notice Truy xuất nguồn gốc sản phẩm qua các bên trong chuỗi cung ứng.
 * Giả định: các doanh nghiệp đã ký hợp đồng ngoài đời; trên chuỗi chỉ ghi
 * bằng chứng thực hiện (lời mời, xác nhận giao nhận hai đầu, lịch sử).
 */
contract SupplyChain {
    // ===== 1. KIỂU DỮ LIỆU =====
    // Vai trò của thành viên. None = chưa đăng ký.
    enum Role { None, Manufacturer, Transporter, Distributor, Retailer }

    // Thứ tự nhiệm vụ khớp với trạng thái mà nhiệm vụ cần xử lý.
    // Chặng 1 = task 0 + 1 (NSX mời), chặng 2 = task 2 + 3 (NPP mời).
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

    // v1.3: một lần giao nhận. Bước s (0..3) đưa sản phẩm từ trạng thái s sang s+1
    // khi CẢ bên gửi (người đang giữ hàng) và bên nhận (người nhận task s) đã xác nhận.
    struct Handover {
        address sender;
        uint256 sentAt;       // 0 = bên gửi chưa xác nhận
        string sentNote;
        address receiver;
        uint256 receivedAt;   // 0 = bên nhận chưa xác nhận
        string receivedNote;
    }

    // ===== 2. BIẾN TRẠNG THÁI =====
    address public owner;                               // admin = người deploy
    uint256 public productCount;                        // cũng là id của sản phẩm mới nhất
    mapping(address => Participant) public participants;
    address[] public participantList;                   // để liệt kê thành viên
    mapping(uint256 => Product) public products;
    mapping(uint256 => History[]) private histories;
    mapping(uint256 => Invitation[4]) private invitations;
    mapping(uint256 => Handover[4]) private handovers;  // v1.3

    // ===== 3. EVENTS =====
    event ParticipantRegistered(address indexed account, string name, Role role);
    event ProductCreated(uint256 indexed id, string name, address indexed manufacturer);
    event StatusChanged(uint256 indexed id, Status status, address indexed actor, string note);
    event ParticipantDeactivated(address indexed account);
    event InvitationSent(uint256 indexed id, Task task, address indexed invitee, address indexed inviter);
    event InvitationAccepted(uint256 indexed id, Task task, address indexed invitee);
    event InvitationDeclined(uint256 indexed id, Task task, address indexed invitee);
    // v1.3
    event InvitationCancelled(uint256 indexed id, Task task, address indexed invitee, address indexed by);
    event TaskReassigned(uint256 indexed id, Task task, address indexed oldInvitee, address indexed newInvitee);
    event HandoverConfirmed(uint256 indexed id, Status status, address indexed actor, bool isSender, string note);

    // ===== 4. MODIFIERS: kiểm tra điều kiện trước khi chạy hàm =====
    // Modifier gọi hàm nội bộ để mã kiểm tra không bị chép lại ở mọi hàm (giữ contract < 24KB)
    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier onlyRole(Role _role) {
        _onlyRole(_role);
        _;
    }

    modifier productExists(uint256 _id) {
        _productExists(_id);
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ===== 5. QUẢN LÝ THÀNH VIÊN (chỉ admin) =====
    // Đăng ký ví mới, hoặc mở khoá lại ví cũ. v1.3: không cho đổi sang vai trò khác,
    // vì lời mời và hàng đang giữ gắn với vai trò cũ.
    function registerParticipant(address _account, string memory _name, Role _role)
        external onlyOwner
    {
        require(_role != Role.None, "Vai tro khong hop le");
        Role current = participants[_account].role;
        require(current == Role.None || current == _role, "Khong the doi vai tro");
        // Chỉ thêm vào danh sách nếu là thành viên mới (tránh trùng)
        if (current == Role.None) {
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

    // v1.3 (R5): admin chuyển nhiệm vụ của bên không còn hợp lệ (bị khoá) sang doanh nghiệp
    // khác, theo kết quả xử lý ngoài đời. Ghi luôn là đã chấp nhận vì hai bên đã ký hợp đồng.
    // Bước giao nhận đang dở phải xác nhận lại; ai đang giữ hàng là bên cũ thì chuyển sang bên mới.
    function reassignTask(uint256 _id, Task _task, address _newInvitee, string memory _note)
        external onlyOwner productExists(_id)
    {
        Product storage p = products[_id];
        uint256 t = uint256(_task);
        require(uint256(p.status) < t + 2, "Nhiem vu da xong");
        require(!_taskReady(_id, _task), "Doanh nghiep hien tai van hop le");
        require(_isValid(_newInvitee, _taskRole(_task)), "Doanh nghiep khong dung vai tro");

        Invitation storage invitation = invitations[_id][t];
        address oldInvitee = invitation.invitee;
        invitation.invitee = _newInvitee;
        invitation.accepted = true;

        uint256 step = uint256(p.status);
        if (step < 4 && (step == t || step == t + 1)) delete handovers[_id][step];
        if (oldInvitee != address(0) && p.currentOwner == oldInvitee) p.currentOwner = _newInvitee;
        if (_task == Task.Distribute) _clearSecondLeg(_id);

        emit TaskReassigned(_id, _task, oldInvitee, _newInvitee);
        _addHistory(_id, p.status, _note);
    }

    // ===== 6. NGHIỆP VỤ CHUỖI CUNG ỨNG =====
    // Bước 0: nhà sản xuất tạo sản phẩm
    function createProduct(string memory _name, string memory _origin, string memory _description)
        external onlyRole(Role.Manufacturer)
    {
        _createProduct(_name, _origin, _description);
    }

    // Nhà sản xuất tạo sản phẩm và có thể mời hai đối tác chặng 1 trong cùng giao dịch.
    function createProductWithInvites(
        string memory _name, string memory _origin, string memory _description,
        address _transporter, address _distributor
    ) external onlyRole(Role.Manufacturer) {
        uint256 id = _createProduct(_name, _origin, _description);
        if (_transporter != address(0)) _invite(id, Task.TransportToDistributor, _transporter);
        if (_distributor != address(0)) _invite(id, Task.Distribute, _distributor);
    }

    // NSX (task 0, 1) hoặc NPP đã nhận task 1 (task 2, 3) mời đối tác khi chặng chưa bắt đầu.
    // Mời lại được nếu lời mời đang chờ, hoặc người đã nhận không còn hợp lệ (R1).
    function inviteParticipant(uint256 _id, Task _task, address _invitee) external productExists(_id) {
        _invite(_id, _task, _invitee);
    }

    // Ví được mời, còn hoạt động và đúng vai trò chấp nhận khi chặng chưa bắt đầu.
    function acceptInvitation(uint256 _id, Task _task) external productExists(_id) {
        Invitation storage invitation = _myInvitation(_id, _task);
        require(!invitation.accepted, "Da chap nhan roi");
        Participant storage participant = participants[msg.sender];
        require(participant.isActive, "Chua duoc dang ky");
        require(participant.role == _taskRole(_task), "Doanh nghiep khong dung vai tro");
        invitation.accepted = true;
        emit InvitationAccepted(_id, _task, msg.sender);
    }

    // Ví được mời từ chối lời mời đang chờ, hoặc rút lui sau khi đã nhận (R2),
    // miễn là chặng chưa bắt đầu. NPP rút lui thì lời mời chặng 2 bị xoá theo (R4).
    function declineInvitation(uint256 _id, Task _task) external productExists(_id) {
        _myInvitation(_id, _task);
        delete invitations[_id][uint256(_task)];
        emit InvitationDeclined(_id, _task, msg.sender);
        if (_task == Task.Distribute) _clearSecondLeg(_id);
    }

    // Người mời huỷ lời mời (kể cả đã được chấp nhận) khi chặng chưa bắt đầu (R3, R4).
    function cancelInvitation(uint256 _id, Task _task) external productExists(_id) {
        require(_canInvite(_id, _task), "Ban khong co quyen moi nhiem vu nay");
        _requireLegOpen(_id, _task);
        address invitee = invitations[_id][uint256(_task)].invitee;
        require(invitee != address(0), "Nhiem vu chua co loi moi");
        delete invitations[_id][uint256(_task)];
        emit InvitationCancelled(_id, _task, invitee, msg.sender);
        if (_task == Task.Distribute) _clearSecondLeg(_id);
    }

    // v1.3 – Bên gửi (người đang giữ hàng) xác nhận ĐÃ GIAO cho bên nhận của bước hiện tại:
    // NSX (0), vận chuyển chặng 1 (1), NPP (2), vận chuyển chặng 2 (3).
    // Trạng thái chỉ đổi khi bên nhận cũng đã xác nhận.
    function confirmSent(uint256 _id, string memory _note) external productExists(_id) {
        Product storage p = products[_id];
        require(uint256(p.status) < 4, "Khong co buoc giao nhan");
        require(p.currentOwner == msg.sender, "Ban khong giu san pham nay");
        require(participants[msg.sender].isActive, "Chua duoc dang ky");
        uint256 step = uint256(p.status);
        _requireLegReady(_id, step);
        Handover storage h = handovers[_id][step];
        require(h.sentAt == 0, "Da xac nhan gui roi");
        h.sender = msg.sender;
        h.sentAt = block.timestamp;
        h.sentNote = _note;
        emit HandoverConfirmed(_id, p.status, msg.sender, true, _note);
        _tryComplete(_id, step);
    }

    // Bước 0 và 2: vận chuyển xác nhận ĐÃ NHẬN hàng (từ NSX / từ NPP).
    // Đủ hai đầu thì 0 -> 1 hoặc 2 -> 3.
    function pickUpProduct(uint256 _id, string memory _note)
        external onlyRole(Role.Transporter) productExists(_id)
    {
        Status status = products[_id].status;
        require(status == Status.Manufactured || status == Status.AtDistributor,
            "Chua the van chuyen o trang thai nay");
        _confirmReceived(_id, _note);
    }

    // Bước 1 và 3: NPP / nhà bán lẻ xác nhận ĐÃ NHẬN hàng từ vận chuyển.
    // Đủ hai đầu thì 1 -> 2 hoặc 3 -> 4.
    function receiveProduct(uint256 _id, string memory _note)
        external productExists(_id)
    {
        Participant memory me = participants[msg.sender];
        require(me.isActive, "Chua duoc dang ky");
        Status status = products[_id].status;
        bool distributorStep = me.role == Role.Distributor && status == Status.InTransitToDistributor;
        bool retailerStep = me.role == Role.Retailer && status == Status.InTransitToRetailer;
        require(distributorStep || retailerStep, "Sai vai tro hoac sai trang thai");
        _confirmReceived(_id, _note);
    }

    // Bước 5: nhà bán lẻ bán cho người tiêu dùng (4 -> 5)
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

    // v1.3: bốn bước giao nhận (bước s = từ trạng thái s sang s+1), kể cả bước chưa có xác nhận.
    function getHandovers(uint256 _id) external view productExists(_id) returns (Handover[4] memory) {
        return handovers[_id];
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
    function _onlyOwner() internal view {
        require(msg.sender == owner, "Chi admin duoc phep");
    }

    function _onlyRole(Role _role) internal view {
        Participant storage p = participants[msg.sender];
        require(p.isActive && p.role == _role, "Sai vai tro");
    }

    function _productExists(uint256 _id) internal view {
        require(_id > 0 && _id <= productCount, "San pham khong ton tai");
    }

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

    // Chặng của nhiệm vụ chưa bắt đầu thì mới được mời / nhận / từ chối / huỷ
    function _requireLegOpen(uint256 _id, Task _task) internal view {
        require(!_legStarted(_id, _task), "Nhiem vu da qua");
    }

    // Lời mời của chính người gọi, ở chặng chưa bắt đầu
    function _myInvitation(uint256 _id, Task _task) internal view returns (Invitation storage invitation) {
        invitation = invitations[_id][uint256(_task)];
        require(invitation.invitee == msg.sender, "Ban khong duoc moi");
        _requireLegOpen(_id, _task);
    }

    // Ví còn hoạt động và đúng vai trò
    function _isValid(address _account, Role _role) internal view returns (bool) {
        Participant storage participant = participants[_account];
        return _account != address(0) && participant.isActive && participant.role == _role;
    }

    // Nhiệm vụ đã có người nhận và người đó vẫn hợp lệ
    function _taskReady(uint256 _id, Task _task) internal view returns (bool) {
        Invitation storage invitation = invitations[_id][uint256(_task)];
        return invitation.accepted && _isValid(invitation.invitee, _taskRole(_task));
    }

    // Chặng của nhiệm vụ đã bắt đầu: trạng thái đã qua bước mở chặng (0 hoặc 2),
    // hoặc đã có một bên xác nhận ở bước mở chặng. Từ đó lời mời của chặng bị khoá.
    function _legStarted(uint256 _id, Task _task) internal view returns (bool) {
        uint256 startStep = uint256(_task) < 2 ? 0 : 2;
        if (uint256(products[_id].status) > startStep) return true;
        Handover storage h = handovers[_id][startStep];
        return h.sentAt != 0 || h.receivedAt != 0;
    }

    // Task 0, 1: nhà sản xuất của sản phẩm. Task 2, 3: NPP đã nhận task 1. Người mời phải còn hợp lệ.
    function _canInvite(uint256 _id, Task _task) internal view returns (bool) {
        if (_task == Task.TransportToDistributor || _task == Task.Distribute) {
            return products[_id].manufacturer == msg.sender && _isValid(msg.sender, Role.Manufacturer);
        }
        Invitation storage distributor = invitations[_id][uint256(Task.Distribute)];
        return distributor.accepted && distributor.invitee == msg.sender && _isValid(msg.sender, Role.Distributor);
    }

    function _invite(uint256 _id, Task _task, address _invitee) internal {
        require(_canInvite(_id, _task), "Ban khong co quyen moi nhiem vu nay");
        _requireLegOpen(_id, _task);
        Invitation storage invitation = invitations[_id][uint256(_task)];
        require(!invitation.accepted || !_isValid(invitation.invitee, _taskRole(_task)),
            "Nhiem vu da co nguoi nhan");
        require(_isValid(_invitee, _taskRole(_task)), "Doanh nghiep khong dung vai tro");
        invitation.invitee = _invitee;
        invitation.accepted = false;
        // Đổi NPP thì lời mời chặng 2 do NPP cũ gửi không còn giá trị (R4)
        if (_task == Task.Distribute) _clearSecondLeg(_id);
        emit InvitationSent(_id, _task, _invitee, msg.sender);
    }

    // Xoá lời mời task 2, 3 (nếu có) khi NPP của sản phẩm thay đổi
    function _clearSecondLeg(uint256 _id) internal {
        for (uint256 t = 2; t < 4; t++) {
            address invitee = invitations[_id][t].invitee;
            if (invitee != address(0)) {
                delete invitations[_id][t];
                emit InvitationCancelled(_id, Task(t), invitee, msg.sender);
            }
        }
    }

    function _requireAccepted(uint256 _id, Task _task) internal view {
        Invitation storage invitation = invitations[_id][uint256(_task)];
        require(invitation.invitee == msg.sender && invitation.accepted, "Ban chua nhan loi moi cho nhiem vu nay");
    }

    // Bên nhận của bước phải hợp lệ; ở bước mở chặng (0, 2) cả hai bên của chặng phải hợp lệ.
    function _requireLegReady(uint256 _id, uint256 _step) internal view {
        bool ready = _taskReady(_id, Task(_step));
        if (_step == 0 || _step == 2) ready = ready && _taskReady(_id, Task(_step + 1));
        require(ready, "Ben nhan chua chap nhan loi moi");
    }

    // Bên nhận xác nhận; dùng chung cho pickUpProduct và receiveProduct
    function _confirmReceived(uint256 _id, string memory _note) internal {
        Product storage p = products[_id];
        uint256 step = uint256(p.status);
        _requireAccepted(_id, Task(step));
        _requireLegReady(_id, step);
        Handover storage h = handovers[_id][step];
        require(h.receivedAt == 0, "Da xac nhan nhan roi");
        h.receiver = msg.sender;
        h.receivedAt = block.timestamp;
        h.receivedNote = _note;
        emit HandoverConfirmed(_id, p.status, msg.sender, false, _note);
        _tryComplete(_id, step);
    }

    // Đủ hai đầu thì chuyển trạng thái. Lịch sử ghi bên nhận (người giữ hàng mới) như v1.2.
    function _tryComplete(uint256 _id, uint256 _step) internal {
        Handover storage h = handovers[_id][_step];
        if (h.sentAt == 0 || h.receivedAt == 0) return;
        Product storage p = products[_id];
        p.status = Status(_step + 1);
        p.currentOwner = h.receiver;
        histories[_id].push(History(p.status, h.receiver, block.timestamp, h.receivedNote));
        emit StatusChanged(_id, p.status, h.receiver, h.receivedNote);
    }

    // Ghi một bước vào lịch sử và phát event để bên ngoài theo dõi
    function _addHistory(uint256 _id, Status _status, string memory _note) internal {
        histories[_id].push(History(_status, msg.sender, block.timestamp, _note));
        emit StatusChanged(_id, _status, msg.sender, _note);
    }
}
