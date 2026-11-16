// =============================================================
// ROUTES LỜI MỜI VÀ GIAO NHẬN (v1.2, v1.3): chỉ đọc. Dữ liệu vốn công khai
// trên chuỗi nên không cần đăng nhập; frontend truyền địa chỉ ví đang dùng.
// ?fresh=1: frontend gửi ngay sau một giao dịch để không nhận dữ liệu nhớ tạm cũ.
// =============================================================
const router = require('express').Router();
const service = require('../services');

function isFresh(req) {
  return req.query.fresh === '1' || req.query.fresh === 'true';
}

// GET /api/invitations?address=0x…&stage=invited|todo|upcoming|done
// -> MyInvitation[]: nhiệm vụ của ví này (lời mời + giao nhận), kèm giai đoạn và hành động tiếp theo
router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getInvitationsFor(req.query.address, req.query.stage, isFresh(req)));
  } catch (err) {
    next(err);
  }
});

// GET /api/invitations/to-send?address=0x…
// -> InviteToSend[]: lời mời ví này đang quản lý (mời / mời lại / huỷ) khi chặng chưa bắt đầu
router.get('/to-send', async (req, res, next) => {
  try {
    res.json(await service.getInvitesToSend(req.query.address, isFresh(req)));
  } catch (err) {
    next(err);
  }
});

// GET /api/invitations/blocked (v1.3)
// -> BlockedTask[]: nhiệm vụ có bên đã nhận nhưng bị khoá; admin dùng để chuyển nhiệm vụ
router.get('/blocked', async (req, res, next) => {
  try {
    res.json(await service.getBlockedTasks(isFresh(req)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
