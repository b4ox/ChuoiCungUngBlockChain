// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";
import "./helpers/JourneyFixture.sol";

// Các ca độc lập để không phụ thuộc dữ liệu demo hoặc thứ tự chạy.
contract SupplyChainPermissionsTest is JourneyFixture {
    // Có vai vận chuyển vẫn chưa đủ nếu nhà sản xuất chưa giao nhiệm vụ.
    function transporterCannotPickUpWithoutInvitation() public {
        (SupplyChain target, Team memory team) = newChain();
        try team.transporter1.pickUp(target, 1) {
            Assert.ok(false, "Khong duoc lay hang khi chua duoc moi");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Ban chua nhan loi moi cho nhiem vu nay", "Sai cau loi");
        }
        Assert.equal(target.getHistory(1).length, uint256(1), "Lich su phai giu nguyen");
    }

    // Lỗi ban đầu của dự án: vận chuyển KHÁC (cùng vai, không được mời) không lấy được hàng.
    function otherTransporterCannotPickUp() public {
        (SupplyChain target,) = newProduct(false);
        Actor other = newActor(target, "Van chuyen khac", SupplyChain.Role.Transporter);
        try other.pickUp(target, 1) {
            Assert.ok(false, "Van chuyen khac khong duoc lay hang");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Ban chua nhan loi moi cho nhiem vu nay", "Sai cau loi");
        }
    }

    // NPP khác (không được mời) không xác nhận nhận hàng được.
    function otherDistributorCannotReceive() public {
        (SupplyChain target,) = newProduct(true);
        Actor other = newActor(target, "Kho khac", SupplyChain.Role.Distributor);
        try other.receiveIt(target, 1) {
            Assert.ok(false, "NPP khac khong duoc nhan hang");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Ban chua nhan loi moi cho nhiem vu nay", "Sai cau loi");
        }
    }

    // Quy tắc chặng: bên chở đã nhận lời nhưng NPP chưa nhận thì chưa giao được.
    function legNeedsBothPartners() public {
        (SupplyChain target, Team memory team) = newChain();
        target.inviteParticipant(1, SupplyChain.Task.TransportToDistributor, address(team.transporter1));
        target.inviteParticipant(1, SupplyChain.Task.Distribute, address(team.distributor));
        team.transporter1.accept(target, 1, SupplyChain.Task.TransportToDistributor);
        try target.confirmSent(1, "Gui som") {
            Assert.ok(false, "Chua du hai ben thi khong gui duoc");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Ben nhan chua chap nhan loi moi", "Sai cau loi");
        }
        try team.transporter1.pickUp(target, 1) {
            Assert.ok(false, "Chua du hai ben thi khong nhan duoc");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Ben nhan chua chap nhan loi moi", "Sai cau loi");
        }
    }

    // Chỉ NPP đã nhận task 1 mới mời được chặng 2.
    function onlyAcceptedDistributorInvitesSecondLeg() public {
        (SupplyChain target, Team memory team) = newChain();
        target.inviteParticipant(1, SupplyChain.Task.Distribute, address(team.distributor));
        try team.distributor.invite(target, 1, SupplyChain.Task.Retail, address(team.retailer)) {
            Assert.ok(false, "NPP chua nhan loi thi chua moi duoc");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Ban khong co quyen moi nhiem vu nay", "Sai cau loi");
        }
        team.distributor.accept(target, 1, SupplyChain.Task.Distribute);
        team.distributor.invite(target, 1, SupplyChain.Task.Retail, address(team.retailer));
        Assert.equal(target.getInvitations(1)[3].invitee, address(team.retailer), "NPP da nhan loi thi moi duoc");
    }

    // Không lấy hàng lần hai khi đang trên đường.
    function cannotPickUpInTransitProduct() public {
        (SupplyChain target,) = newProduct(true);
        Actor other = newActor(target, "Van chuyen khac", SupplyChain.Role.Transporter);
        try other.pickUp(target, 1) {
            Assert.ok(false, "Khong duoc lay hang hai lan");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Chua the van chuyen o trang thai nay", "Sai cau loi");
        }
        assertUnchanged(target, SupplyChain.Status.InTransitToDistributor, 2);
    }

    // Nhà bán lẻ không nhận hàng sai bước.
    function retailerCannotReceiveTooEarly() public {
        (SupplyChain target, Team memory team) = newProduct(true);
        try team.retailer.receiveIt(target, 1) {
            Assert.ok(false, "Khong duoc nhan sai buoc");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Sai vai tro hoac sai trang thai", "Sai cau loi");
        }
        assertUnchanged(target, SupplyChain.Status.InTransitToDistributor, 2);
    }

    // Người chưa đăng ký không tạo được sản phẩm.
    function unregisteredCannotCreateProduct() public {
        SupplyChain target = new SupplyChain();
        try target.createProduct("Test", "Dak Lak", "Test") {
            Assert.ok(false, "Khong duoc tao san pham");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Sai vai tro", "Sai cau loi");
        }
        Assert.equal(target.productCount(), uint256(0), "Khong duoc tang so san pham");
    }

    function assertUnchanged(SupplyChain _target, SupplyChain.Status _status, uint256 _length) internal {
        SupplyChain.Product memory product = _target.getProduct(1);
        SupplyChain.History[] memory records = _target.getHistory(1);
        Assert.equal(uint256(product.status), uint256(_status), "Trang thai bi thay doi");
        Assert.equal(product.currentOwner, records[records.length - 1].actor, "Nguoi giu bi thay doi");
        Assert.equal(records.length, _length, "Lich su bi thay doi");
    }
}
