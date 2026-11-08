// =============================================================
// ROUTES ĐĂNG NHẬP BẰNG VÍ (xem services/authService.js)
// =============================================================
const router = require('express').Router();
const auth = require('../services/authService');
const service = require('../services');
const applications = require('../services/applicationService');
const { requireAuth } = require('../middleware/auth');

// Địa chỉ website đang mở, ghi vào thông điệp để người dùng biết mình đăng nhập trang nào
function originOf(req) {
  return req.get('origin') || `${req.protocol}://${req.get('host')}`;
}

// GET /api/auth/nonce?address=0x… -> { address, nonce, message }
router.get('/nonce', (req, res, next) => {
  try {
    res.json(auth.createNonce(req.query.address, originOf(req)));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  body: { address, signature } -> { token, address, expiresAt }
router.post('/login', (req, res, next) => {
  try {
    res.json(auth.login(req.body.address, req.body.signature));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout (cần token)
router.post('/logout', requireAuth, (req, res) => {
  res.json(auth.logout(req.user.token));
});

// GET /api/auth/me (cần token) -> ví đang đăng nhập, vai trò trên chuỗi, hồ sơ mới nhất
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const address = req.user.address;
    const [owner, member] = await Promise.all([service.getOwner(), service.getParticipant(address)]);
    res.json({
      address,
      isAdmin: owner.toLowerCase() === address.toLowerCase(),
      member,
      application: applications.getMine(address),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
