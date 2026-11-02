// =============================================================
// ROUTES SẢN PHẨM: mỗi route chỉ lấy dữ liệu từ request,
// gọi service và trả JSON. Lỗi được xử lý tập trung ở errorHandler.
// =============================================================
const router = require('express').Router();
const QRCode = require('qrcode');
const service = require('../services');
const { httpError } = require('../utils/validate');
const { getPublicUrl } = require('../utils/publicUrl');

// GET /api/products?status=0..5
router.get('/', async (req, res, next) => {
  try {
    let status;
    if (req.query.status !== undefined && req.query.status !== '') {
      status = Number(req.query.status);
      if (!Number.isInteger(status) || status < 0 || status > 5) {
        throw httpError(400, 'Trạng thái lọc phải từ 0 đến 5');
      }
    }
    res.json(await service.getProducts(status));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id -> { product, history }
router.get('/:id', async (req, res, next) => {
  try {
    res.json(await service.getProductDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/qrcode -> ảnh PNG trỏ tới trang tra cứu
router.get('/:id/qrcode', async (req, res, next) => {
  try {
    const { product } = await service.getProductDetail(req.params.id); // báo lỗi nếu không tồn tại
    const url = `${getPublicUrl()}/trace.html?id=${product.id}`;
    const png = await QRCode.toBuffer(url, { width: 300, margin: 2 });
    res.type('png').send(png);
  } catch (err) {
    next(err);
  }
});

// POST /api/products  body: { from, name, origin, description }
router.post('/', async (req, res, next) => {
  try {
    res.json(await service.createProduct(req.body.from, req.body));
  } catch (err) {
    next(err);
  }
});

// =============================================================
// 3 HÀNH ĐỘNG CHUYỂN TRẠNG THÁI: body { from, note }
// =============================================================
const ACTIONS = { pickup: 'pickUp', receive: 'receive', sell: 'sell' };

router.post('/:id/:action(pickup|receive|sell)', async (req, res, next) => {
  try {
    const method = ACTIONS[req.params.action];
    res.json(await service[method](req.body.from, req.params.id, req.body.note));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
