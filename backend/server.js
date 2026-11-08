// =============================================================
// SERVER EXPRESS
// - /api/...   : REST API cho frontend (xem shared/API_SPEC.md)
// - /          : phục vụ luôn thư mục frontend/ dưới dạng file tĩnh
// =============================================================
const path = require('path');
const express = require('express');
const cors = require('cors');
const { RPC_URL, CONTRACT_ADDRESS, CONTRACT_READY, CHAIN_NAME } = require('./config/blockchain');
const service = require('./services');
const errorHandler = require('./middleware/errorHandler');
const { getPublicUrl } = require('./utils/publicUrl');

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================================
// GẮN CÁC ROUTER DƯỚI /api
// =============================================================
app.get('/api/health', async (req, res, next) => {
  try {
    res.json(await service.getHealth());
  } catch (err) {
    next(err);
  }
});
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/participants', require('./routes/participantRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
// v1.1: đăng nhập bằng ví, hồ sơ doanh nghiệp, doanh nghiệp công khai, cấu hình chuỗi
app.use('/api/config', require('./routes/configRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/businesses', require('./routes/businessRoutes'));

// Đường dẫn /api không tồn tại -> trả JSON thay vì trang HTML mặc định
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Không có endpoint ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend chạy tại http://localhost:${PORT}  (QR dùng ${getPublicUrl()})`);
  if (service.USE_MOCK) {
    console.log('Chế độ MOCK_CHAIN=true: đọc dữ liệu trong shared/mock, không gọi Ganache');
  } else {
    console.log(`Blockchain: ${CHAIN_NAME} (${RPC_URL})  |  Contract: ${CONTRACT_READY ? CONTRACT_ADDRESS : 'CHƯA DEPLOY'}`);
  }
});
