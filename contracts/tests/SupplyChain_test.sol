// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";
import "./helpers/JourneyFixture.sol";
import "./helpers/NonAdminCaller.sol";

contract SupplyChainTest is JourneyFixture {
    SupplyChain private chain;
    Team private team;

    // Một sản phẩm đi hết hành trình (Sold) để kiểm tra lỗi sau khi bán.
    function beforeAll() public {
        Team memory created;
        (chain, created) = newProduct(true);
        finishJourney(chain, created);
        team = created;
    }

    // Sản phẩm đã bán thì vận chuyển không nhận hàng được nữa, dữ liệu giữ nguyên.
    function cannotPickUpSoldProduct() public {
        bool wasRejected = false;
        try team.transporter1.pickUp(chain, 1) {
            Assert.ok(false, "Loi: van lay duoc san pham da ban");
        } catch Error(string memory reason) {
            wasRejected = true;
            Assert.equal(reason, "Chua the van chuyen o trang thai nay", "Cau loi khong dung");
        }
        Assert.ok(wasRejected, "Phai bi tu choi bang loi co ly do");

        SupplyChain.Product memory product = chain.getProduct(1);
        Assert.equal(uint256(product.status), uint256(SupplyChain.Status.Sold), "Trang thai phai van la Sold");
        Assert.equal(chain.getHistory(1).length, uint256(6), "Lich su phai van co 6 ban ghi");
        Assert.equal(product.currentOwner, address(team.retailer), "Nguoi giu hang khong duoc thay doi");
    }

    // Người không phải admin không đăng ký được thành viên.
    function nonAdminCannotRegisterParticipant() public {
        SupplyChain target = new SupplyChain();
        NonAdminCaller caller = new NonAdminCaller();
        bool wasRejected = false;
        try caller.register(target) {
            Assert.ok(false, "Loi: nguoi khong phai admin van dang ky duoc");
        } catch Error(string memory reason) {
            wasRejected = true;
            Assert.equal(reason, "Chi admin duoc phep", "Cau loi khong dung");
        }
        Assert.ok(wasRejected, "Phai tu choi nguoi khong phai admin");
        Assert.equal(target.getAllParticipants().length, uint256(0), "Khong duoc them thanh vien khi bi tu choi");
    }

    // v1.3 (R6): không đổi được vai trò của ví đã đăng ký; mở khoá lại đúng vai trò cũ thì được.
    function cannotChangeRole() public {
        SupplyChain target = new SupplyChain();
        target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Manufacturer);
        try target.registerParticipant(address(this), "Nha san xuat", SupplyChain.Role.Retailer) {
            Assert.ok(false, "Khong duoc doi vai tro");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Khong the doi vai tro", "Sai cau loi");
        }
        target.registerParticipant(address(this), "Ten moi", SupplyChain.Role.Manufacturer);
        (string memory name, SupplyChain.Role role,) = target.participants(address(this));
        Assert.equal(name, "Ten moi", "Phai doi duoc ten");
        Assert.equal(uint256(role), uint256(SupplyChain.Role.Manufacturer), "Vai tro phai giu nguyen");
    }
}
