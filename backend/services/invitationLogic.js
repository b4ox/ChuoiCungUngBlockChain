// =============================================================
// LOGIC LỜI MỜI (v1.2): chỉ tính toán, không gọi contract, nên dùng
// chung cho supplyChainService (dữ liệu thật) và mockService (dữ liệu mẫu).
//
// Quy trình đã chốt (mỗi sản phẩm có 4 nhiệm vụ, khớp enum Task của contract):
//   0 Vận chuyển đến NPP, 1 Phân phối      -> nhà sản xuất của sản phẩm mời
//   2 Vận chuyển đến cửa hàng, 3 Bán lẻ    -> nhà phân phối ĐÃ CHẤP NHẬN nhiệm vụ 1 mời
// Nhiệm vụ t được làm khi sản phẩm ở trạng thái t (riêng bán lẻ: 3 nhận hàng, 4 bán),
// nên chỉ được mời / chấp nhận khi trạng thái sản phẩm <= t.
// Quy tắc theo chặng: một chặng chỉ bắt đầu khi CẢ bên chở và bên nhận đã chấp nhận
//   chặng 1 = nhiệm vụ 0 + 1, chặng 2 = nhiệm vụ 2 + 3 (hàng không lên xe khi chưa có nơi nhận).
// =============================================================
const { ROLE_TEXT, nameOf } = require('./format');

const TASK_TEXT = ['Vận chuyển đến nhà phân phối', 'Phân phối', 'Vận chuyển đến cửa hàng', 'Bán lẻ'];
const TASK_ROLE = [2, 3, 2, 4]; // vai trò được mời cho từng nhiệm vụ
const STATE_TEXT = { none: 'Chưa mời', pending: 'Chờ chấp nhận', accepted: 'Đã chấp nhận' };
const STAGE_TEXT = { invited: 'Lời mời mới', todo: 'Cần xử lý', upcoming: 'Sắp tới', done: 'Đã xong' };
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function sameAddress(a, b) {
  return a !== '' && b !== '' && a.toLowerCase() === b.toLowerCase();
}

// =============================================================
// ĐỊNH DẠNG 4 LỜI MỜI CỦA MỘT SẢN PHẨM
// raw: kết quả getInvitations(id) của contract, mỗi phần tử { invitee, accepted }
// inviter = người có quyền mời nhiệm vụ đó (tính theo quy trình ở trên)
// =============================================================
function formatInvitations(raw, manufacturer, names) {
  const items = [];
  for (let task = 0; task < 4; task++) {
    const invitee = raw[task].invitee === ZERO_ADDRESS ? '' : raw[task].invitee;
    let state = 'none';
    if (invitee !== '') state = raw[task].accepted ? 'accepted' : 'pending';
    items.push({
      task, taskText: TASK_TEXT[task], role: TASK_ROLE[task], roleText: ROLE_TEXT[TASK_ROLE[task]],
      invitee, inviteeName: invitee ? nameOf(names, invitee) : '',
      inviter: '', inviterName: '', state, stateText: STATE_TEXT[state],
    });
  }
  // Nhiệm vụ 2, 3 do nhà phân phối đã chấp nhận nhiệm vụ 1 mời; chưa có thì để trống
  const distributor = items[1].state === 'accepted' ? items[1].invitee : '';
  const inviters = [manufacturer, manufacturer, distributor, distributor];
  for (const item of items) {
    item.inviter = inviters[item.task];
    item.inviterName = item.inviter ? nameOf(names, item.inviter) : '';
  }
  return items;
}

// =============================================================
// GIAI ĐOẠN của một lời mời đối với người được mời
//   invited  : chưa trả lời            -> tab "Lời mời"
//   todo     : đã nhận, tới lượt mình  -> "Cần xử lý" (canActNow = true)
//   upcoming : đã nhận, chưa tới lượt, hoặc bên nhận của chặng chưa
//              chấp nhận -> "Sắp tới" (lý do ở waitingFor)
//   done     : bước của mình đã qua
// =============================================================
const RECEIVER_WAIT_TEXT = { 0: 'Chờ nhà phân phối chấp nhận lời mời', 2: 'Chờ nhà bán lẻ chấp nhận lời mời' };
const ARRIVAL_WAIT_TEXT = 'Chờ hàng đến bước của bạn';

// Nhiệm vụ vận chuyển (0, 2) chỉ làm được khi bên nhận (1, 3) đã chấp nhận
function receiverReady(task, invitations) {
  if (task !== 0 && task !== 2) return true;
  return invitations[task + 1].state === 'accepted';
}

function stageOf(inv, status, invitations) {
  if (inv.state === 'pending') return 'invited';
  if (status < inv.task) return 'upcoming';
  if (status === inv.task || (inv.task === 3 && status === 4)) {
    return receiverReady(inv.task, invitations) ? 'todo' : 'upcoming';
  }
  return 'done';
}

// Lý do đang chờ (chỉ có khi stage = upcoming)
function waitingForOf(stage, inv, status) {
  if (stage !== 'upcoming') return '';
  return status === inv.task ? RECEIVER_WAIT_TEXT[inv.task] : ARRIVAL_WAIT_TEXT;
}

// Hành động (khớp route pickup / receive / sell) khi tới lượt
function actionOf(task, status) {
  if (task === 0 || task === 2) return 'pickup';
  if (task === 3 && status === 4) return 'sell';
  return 'receive';
}

// Một dòng trong danh sách lời mời của một ví; null nếu lời mời đã quá hạn
function toMyInvitation(product, inv, invitations) {
  if (inv.state === 'pending' && product.status > inv.task) return null;
  const stage = stageOf(inv, product.status, invitations);
  return {
    productId: product.id, productName: product.name, status: product.status, statusText: product.statusText,
    ...inv,
    stage, stageText: STAGE_TEXT[stage], waitingFor: waitingForOf(stage, inv, product.status),
    canActNow: stage === 'todo',
    action: stage === 'todo' ? actionOf(inv.task, product.status) : null,
  };
}

// =============================================================
// DANH SÁCH DÙNG CHO API
// entries: [{ product: Product đã định dạng, invitations: 4 lời mời đã định dạng }]
// =============================================================

// Mọi lời mời gửi tới "address" (lọc thêm theo stage nếu có)
function invitationsFor(entries, address, stage) {
  const result = [];
  for (const entry of entries) {
    for (const inv of entry.invitations) {
      if (!sameAddress(inv.invitee, address)) continue;
      const item = toMyInvitation(entry.product, inv, entry.invitations);
      if (item && (!stage || item.stage === stage)) result.push(item);
    }
  }
  return result;
}

// Nhiệm vụ "address" đang có quyền mời (hoặc mời lại) mà chưa có ai chấp nhận
function invitesToSend(entries, address) {
  const result = [];
  for (const { product, invitations } of entries) {
    const tasks = invitations.filter((inv) =>
      sameAddress(inv.inviter, address) && inv.state !== 'accepted' && product.status <= inv.task);
    if (tasks.length > 0) {
      result.push({ productId: product.id, productName: product.name,
        status: product.status, statusText: product.statusText, tasks });
    }
  }
  return result;
}

module.exports = {
  TASK_TEXT, TASK_ROLE, STAGE_TEXT,
  formatInvitations, invitationsFor, invitesToSend,
};
