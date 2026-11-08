// =============================================================
// MIDDLEWARE ĐĂNG NHẬP
// - requireAuth : request phải gửi header "Authorization: Bearer <token>"
//                 lấy từ POST /api/auth/login. Gắn req.user = { address }.
// - requireAdmin: thêm điều kiện ví đăng nhập là owner của contract.
// =============================================================
const auth = require('../services/authService');
const service = require('../services');
const { httpError } = require('../utils/validate');

function readToken(req) {
  const header = req.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function requireAuth(req, res, next) {
  const session = auth.getSession(readToken(req));
  if (!session) return next(httpError(401, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại bằng ví.'));
  req.user = { address: session.address, token: readToken(req) };
  next();
}

async function requireAdmin(req, res, next) {
  try {
    const owner = await service.getOwner();
    if (owner.toLowerCase() !== req.user.address.toLowerCase()) {
      throw httpError(403, 'Chỉ ví quản trị (ví đã deploy contract) được làm việc này');
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireAdmin, readToken };
