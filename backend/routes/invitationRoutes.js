// =============================================================
// ROUTES LỜI MỜI (v1.2): chỉ đọc. Dữ liệu lời mời vốn công khai trên
// chuỗi nên không cần đăng nhập; frontend truyền địa chỉ ví đang dùng.
// =============================================================
const router = require('express').Router();
const service = require('../services');

// GET /api/invitations?address=0x…&stage=invited|todo|upcoming|done
// -> MyInvitation[]: lời mời gửi tới ví này, kèm giai đoạn và hành động tiếp theo
router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getInvitationsFor(req.query.address, req.query.stage));
  } catch (err) {
    next(err);
  }
});

// GET /api/invitations/to-send?address=0x…
// -> InviteToSend[]: sản phẩm mà ví này đang có quyền mời (hoặc mời lại) doanh nghiệp
router.get('/to-send', async (req, res, next) => {
  try {
    res.json(await service.getInvitesToSend(req.query.address));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
