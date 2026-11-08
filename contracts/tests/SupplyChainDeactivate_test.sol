// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";
import "./helpers/NonAdminCaller.sol";

// =============================================================
// THU HỒI VAI TRÒ (deactivateParticipant): mỗi ca tự tạo contract mới
// để không phụ thuộc dữ liệu demo hoặc thứ tự chạy.
// =============================================================
contract SupplyChainDeactivateTest {
    // Thu hồi xong thì isActive = false, tên và vai trò vẫn giữ để tra cứu lịch sử.
    function deactivateKeepsNameAndRole() public {
        SupplyChain target = new SupplyChain();
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        target.deactivateParticipant(address(this));
        (string memory name, SupplyChain.Role role, bool isActive) = target.participants(address(this));
        Assert.equal(name, "Nha san xuat", "Ten bi mat");
        Assert.equal(uint256(role), uint256(SupplyChain.Role.Manufacturer), "Vai tro bi mat");
        Assert.ok(!isActive, "Phai bi khoa");
    }

    // Ví bị khoá không gọi được hàm nghiệp vụ nữa.
    function deactivatedCannotCreateProduct() public {
        SupplyChain target = new SupplyChain();
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        target.deactivateParticipant(address(this));
        bool rejected = false;
        try target.createProduct("Test", "Dak Lak", "Test") {
            Assert.ok(false, "Khong duoc tao san pham");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, "Sai vai tro", "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
    }

    // Admin gọi lại registerParticipant thì ví hoạt động trở lại, không bị thêm trùng vào danh sách.
    function registerAgainReactivates() public {
        SupplyChain target = new SupplyChain();
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        target.deactivateParticipant(address(this));
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        target.createProduct("Test", "Dak Lak", "Test");
        Assert.equal(target.productCount(), uint256(1), "Phai tao duoc san pham");
        Assert.equal(target.getAllParticipants().length, uint256(1), "Khong duoc them trung");
    }

    // Không thu hồi được ví chưa đăng ký hoặc đã bị khoá.
    function cannotDeactivateTwiceOrUnknown() public {
        SupplyChain target = new SupplyChain();
        expectRevert(target, address(0x1234), "Chua duoc dang ky");
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        target.deactivateParticipant(address(this));
        expectRevert(target, address(this), "Thanh vien da bi khoa");
    }

    // Người không phải admin không được thu hồi.
    function nonAdminCannotDeactivate() public {
        SupplyChain target = new SupplyChain();
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        NonAdminCaller caller = new NonAdminCaller();
        bool rejected = false;
        try caller.deactivate(target, address(this)) {
            Assert.ok(false, "Khong duoc thu hoi");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, "Chi admin duoc phep", "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
    }

    // Hàm hỗ trợ: gọi deactivateParticipant và kiểm tra đúng câu lỗi.
    function expectRevert(SupplyChain _target, address _account, string memory _reason) internal {
        bool rejected = false;
        try _target.deactivateParticipant(_account) {
            Assert.ok(false, "Phai bi tu choi");
        } catch Error(string memory reason) {
            rejected = true;
            Assert.equal(reason, _reason, "Sai cau loi");
        } catch (bytes memory) {
            Assert.ok(false, "Khong doc duoc ly do revert");
        }
        Assert.ok(rejected, "Phai bi tu choi");
    }
}
