// =============================================================
// ROUTES HỒ SƠ DOANH NGHIỆP
// - Doanh nghiệp (đã đăng nhập bằng ví): gửi, xem, sửa hồ sơ của chính ví mình.
// - Quản trị viên: xem danh sách, duyệt (sau khi ký registerParticipant), từ chối.
// =============================================================
const router = require('express').Router();
const applications = require('../services/applicationService');
const businesses = require('../services/businessService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Gói một hàm service thành route: lỗi chuyển về errorHandler
function handle(fn) {
  return async (req, res, next) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      next(err);
    }
  };
}

// GET /api/applications/me -> hồ sơ mới nhất của ví đang đăng nhập (hoặc null)
router.get('/me', requireAuth, handle((req) => applications.getMine(req.user.address)));

// POST /api/applications  body: { company, taxCode, hq, website, intro, rep, email, phone, role }
router.post('/', requireAuth, handle((req) => applications.submit(req.user.address, req.body)));

// PUT /api/applications/me  body: các trường muốn sửa
router.put('/me', requireAuth, handle((req) => applications.updateMine(req.user.address, req.body)));

// GET /api/applications?status=pending|approved|rejected (admin)
router.get('/', requireAuth, requireAdmin, handle((req) => applications.list(req.query.status)));

// POST /api/applications/:id/approve  body: { txHash } (admin, sau khi giao dịch đã xác nhận)
router.post('/:id/approve', requireAuth, requireAdmin, handle(async (req) => {
  const app = await applications.approve(req.params.id, req.body.txHash);
  businesses.clearCache();
  return app;
}));

// POST /api/applications/:id/reject  body: { reason } (admin)
router.post('/:id/reject', requireAuth, requireAdmin, handle((req) => applications.reject(req.params.id, req.body.reason)));

module.exports = router;
