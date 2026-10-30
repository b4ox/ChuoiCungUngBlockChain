// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "../SupplyChain.sol";
import "./helpers/NonAdminCaller.sol";

contract SupplyChainTest {
    SupplyChain private chain;

    // Kiểm tra luồng nghiệp vụ hoặc chuẩn bị dữ liệu độc lập.
    function beforeAll() public {
        chain = new SupplyChain();

        useRole(SupplyChain.Role.Manufacturer);
        chain.createProduct("Lo ca phe test", "Dak Lak", "Du lieu test");

        useRole(SupplyChain.Role.Transporter);
        chain.pickUpProduct(1, "Lay tai xuong");

        useRole(SupplyChain.Role.Distributor);
        chain.receiveProduct(1, "Nhan tai kho");

        useRole(SupplyChain.Role.Transporter);
        chain.pickUpProduct(1, "Chuyen den cua hang");

        useRole(SupplyChain.Role.Retailer);
        chain.receiveProduct(1, "Cua hang nhan");
        chain.markAsSold(1, "Da ban");

        // Người gọi phải đúng vai vận chuyển để kiểm tra lỗi trạng thái.
        useRole(SupplyChain.Role.Transporter);
    }

    // Kiểm tra luồng nghiệp vụ hoặc chuẩn bị dữ liệu độc lập.
    function cannotPickUpSoldProduct() public {
        bool wasRejected = false;

        try chain.pickUpProduct(1, "Thu lay hang da ban") {
            Assert.ok(false, "Loi: van lay duoc san pham da ban");
        } catch Error(string memory reason) {
            wasRejected = true;

            Assert.equal(
                reason,
                "Chua the van chuyen o trang thai nay",
                "Cau loi khong dung"
            );
        } catch (bytes memory) {
            Assert.ok(false, "That bai nhung khong tra dung dang loi");
        }

        Assert.ok(wasRejected, "Phai bi tu choi bang loi co ly do");

        SupplyChain.Product memory product = chain.getProduct(1);
        SupplyChain.History[] memory history = chain.getHistory(1);

        Assert.equal(
            uint256(product.status),
            uint256(SupplyChain.Status.Sold),
            "Trang thai phai van la Sold"
        );

        Assert.equal(
            history.length,
            uint256(6),
            "Lich su phai van co 6 ban ghi"
        );

        Assert.equal(
            product.currentOwner,
            address(this),
            "Nguoi giu hang khong duoc thay doi"
        );
    }

    // Kiểm tra luồng nghiệp vụ hoặc chuẩn bị dữ liệu độc lập.
function nonAdminCannotRegisterParticipant() public {
    // Contract mới do hàm này tạo, nên owner là contract test hiện tại.
    SupplyChain target = new SupplyChain();

    // Tạo người gọi riêng, không phải owner của target.
    NonAdminCaller caller = new NonAdminCaller();
    bool wasRejected = false;

    try caller.register(target) {
        Assert.ok(false, "Loi: nguoi khong phai admin van dang ky duoc");
    } catch Error(string memory reason) {
        wasRejected = true;
        Assert.equal(
            reason,
            "Chi admin duoc phep",
            "Cau loi khong dung"
        );
    } catch (bytes memory) {
        Assert.ok(false, "Khong nhan duoc loi co ly do");
    }

    Assert.ok(wasRejected, "Phai tu choi nguoi khong phai admin");

    address[] memory accounts = target.getAllParticipants();
    Assert.equal(
        accounts.length,
        uint256(0),
        "Khong duoc them thanh vien khi bi tu choi"
    );
}

    // Kiểm tra luồng nghiệp vụ hoặc chuẩn bị dữ liệu độc lập.


    // Kiểm tra luồng nghiệp vụ hoặc chuẩn bị dữ liệu độc lập.
    function useRole(SupplyChain.Role _role) internal {
        chain.registerParticipant(address(this), "Tai khoan test", _role);
    }

    // Kiểm tra luồng nghiệp vụ hoặc chuẩn bị dữ liệu độc lập.

}
