// =============================================================
// ROUTES HOẠT ĐỘNG GẦN ĐÂY: event StatusChanged, mới nhất trước
// =============================================================
const router = require('express').Router();
const service = require('../services');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// GET /api/events?limit=20
router.get('/', async (req, res, next) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (!(limit > 0)) limit = DEFAULT_LIMIT;
    res.json(await service.getEvents(Math.min(limit, MAX_LIMIT)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
