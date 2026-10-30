// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../SupplyChain.sol";

// =============================================================
// NGƯỜI GỌI GIẢ LẬP: tách khỏi file test để Remix không chạy như test.
// =============================================================
contract NonAdminCaller {
    // Dùng địa chỉ riêng không phải owner để kiểm tra lỗi phân quyền.
    function register(SupplyChain _target) external {
        _target.registerParticipant(
            address(this),
            "Thanh vien test",
            SupplyChain.Role.Manufacturer
        );
    }
}
