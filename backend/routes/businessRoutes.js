// =============================================================
// ROUTES DOANH NGHIỆP CÔNG KHAI (không cần đăng nhập)
// =============================================================
const router = require('express').Router();
const businesses = require('../services/businessService');

// GET /api/businesses
router.get('/', async (req, res, next) => {
  try {
    res.json(await businesses.listBusinesses());
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:address
router.get('/:address', async (req, res, next) => {
  try {
    res.json(await businesses.getBusiness(req.params.address));
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/refresh: frontend gọi sau mỗi giao dịch để bỏ dữ liệu nhớ tạm
router.post('/refresh', (req, res) => {
  businesses.clearCache();
  res.json({ success: true });
});

module.exports = router;
