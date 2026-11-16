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

// POST /api/products  body: { from, name, origin, description, transporter?, distributor? }
// v1.2: có transporter/distributor thì contract tạo kèm lời mời nhiệm vụ 0 và 1
router.post('/', async (req, res, next) => {
  try {
    res.json(await service.createProduct(req.body.from, req.body));
  } catch (err) {
    next(err);
  }
});

// =============================================================
// HÀNH ĐỘNG GIAO NHẬN / BÁN: body { from, note } (chỉ Ganache local)
// =============================================================
// v1.3: send = bên gửi xác nhận đã giao; pickup / receive = bên nhận xác nhận đã nhận
const ACTIONS = { pickup: 'pickUp', receive: 'receive', sell: 'sell', send: 'send' };

router.post('/:id/:action(pickup|receive|sell|send)', async (req, res, next) => {
  try {
    const method = ACTIONS[req.params.action];
    res.json(await service[method](req.body.from, req.params.id, req.body.note));
  } catch (err) {
    next(err);
  }
});

// =============================================================
// v1.2 LỜI MỜI (chỉ Ganache local, giống pickup/receive/sell):
//   invite  body { from, task, invitee }
//   accept  body { from, task }
//   decline body { from, task }   (v1.3: cũng dùng để rút lui sau khi đã nhận)
//   cancel  body { from, task }   (v1.3: người mời huỷ)
//   reassign body { from, task, invitee, note } (v1.3: admin chuyển nhiệm vụ)
// Trên Sepolia doanh nghiệp tự ký các hàm này trong MetaMask.
// =============================================================
router.post('/:id/:action(invite|accept|decline|cancel|reassign)', async (req, res, next) => {
  try {
    res.json(await service[req.params.action](req.body.from, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
