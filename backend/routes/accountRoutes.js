// =============================================================
// ROUTES TÀI KHOẢN: 10 tài khoản Ganache kèm vai trò (cho dropdown "Đang đóng vai")
// =============================================================
const router = require('express').Router();
const service = require('../services');

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getAccounts());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
