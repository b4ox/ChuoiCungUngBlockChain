// =============================================================
// ROUTES THÀNH VIÊN: xem danh sách và đăng ký (chỉ admin)
// =============================================================
const router = require('express').Router();
const service = require('../services');

// GET /api/participants
router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getParticipants());
  } catch (err) {
    next(err);
  }
});

// POST /api/participants  body: { from, account, name, role }
router.post('/', async (req, res, next) => {
  try {
    res.json(await service.registerParticipant(req.body.from, req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
