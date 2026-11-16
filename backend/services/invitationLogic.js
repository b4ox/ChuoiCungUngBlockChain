// =============================================================
// LOGIC LỜI MỜI VÀ GIAO NHẬN (v1.3): chỉ tính toán, không gọi contract, nên
// dùng chung cho supplyChainService (dữ liệu thật) và mockService (dữ liệu mẫu).
// Mọi quy tắc ở đây phải khớp contract (shared/CONTRACT_INTERFACE.md, mục v1.3).
//
// Quy trình: mỗi sản phẩm có 4 nhiệm vụ (task) chia 2 chặng
//   chặng 1: task 0 Vận chuyển đến NPP, task 1 Phân phối    -> nhà sản xuất mời
//   chặng 2: task 2 Vận chuyển đến cửa hàng, task 3 Bán lẻ  -> NPP đã nhận task 1 mời
// Giao nhận hai đầu: bước s (0..3) đưa trạng thái s -> s+1 khi CẢ bên gửi (người
// đang giữ hàng) và bên nhận (người nhận task s) đã xác nhận.
// Bước mở chặng (0, 2) cần cả hai task của chặng đã nhận lời và còn hợp lệ.
// Chặng đã bắt đầu (đã qua bước mở chặng hoặc đã có một bên xác nhận ở bước đó)
// thì lời mời của chặng bị khoá; chỉ admin chuyển nhiệm vụ được.
// File này định dạng dữ liệu + quy tắc chặng; "việc của từng ví" ở invitationTasks.js.
// =============================================================
const { ROLE_TEXT, STATUS_TEXT, nameOf, toIso } = require('./format');

const TASK_TEXT = ['Vận chuyển đến nhà phân phối', 'Phân phối', 'Vận chuyển đến cửa hàng', 'Bán lẻ'];
const TASK_ROLE = [2, 3, 2, 4]; // vai trò được mời cho từng nhiệm vụ
const STATE_TEXT = { none: 'Chưa mời', pending: 'Chờ chấp nhận', accepted: 'Đã chấp nhận', owner: 'Nhà sản xuất' };
const STAGE_TEXT = { invited: 'Lời mời mới', todo: 'Cần xử lý', upcoming: 'Sắp tới', done: 'Đã xong' };
const HANDOVER_TEXT = {
  none: 'Chưa tới', waiting: 'Chưa bên nào xác nhận', sent: 'Bên gửi đã xác nhận',
  received: 'Bên nhận đã xác nhận', done: 'Đã giao nhận',
};
const WAIT_TEXT = {
  arrival: 'Chờ hàng đến bước của bạn',
  leg1: 'Chờ đủ vận chuyển và nhà phân phối chấp nhận lời mời',
  leg2: 'Chờ đủ vận chuyển và nhà bán lẻ chấp nhận lời mời',
  invalid: 'Bên nhận không còn hoạt động, chờ quản trị viên xử lý',
  receiver: 'Chờ bên nhận xác nhận đã nhận hàng',
  sender: 'Chờ bên gửi xác nhận đã giao hàng',
};
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function sameAddress(a, b) {
  return Boolean(a) && Boolean(b) && a.toLowerCase() === b.toLowerCase();
}

// members: { địa chỉ viết thường: { name, role, isActive } }
function isValid(members, address, role) {
  const member = address ? members[address.toLowerCase()] : null;
  return Boolean(member) && member.isActive && member.role === role;
}

function namesOf(members) {
  const names = {};
  for (const key of Object.keys(members)) names[key] = members[key].name;
  return names;
}

// =============================================================
// ĐỊNH DẠNG 4 LỜI MỜI CỦA MỘT SẢN PHẨM
// raw: getInvitations(id), mỗi phần tử { invitee, accepted }
// valid = người được mời còn hoạt động, đúng vai; inviter = ví có quyền mời task đó
// =============================================================
function formatInvitations(raw, manufacturer, members) {
  const names = namesOf(members);
  const items = [];
  for (let task = 0; task < 4; task++) {
    const invitee = raw[task].invitee === ZERO_ADDRESS ? '' : raw[task].invitee;
    let state = 'none';
    if (invitee !== '') state = raw[task].accepted ? 'accepted' : 'pending';
    items.push({
      task, taskText: TASK_TEXT[task], role: TASK_ROLE[task], roleText: ROLE_TEXT[TASK_ROLE[task]],
      invitee, inviteeName: invitee ? nameOf(names, invitee) : '',
      valid: isValid(members, invitee, TASK_ROLE[task]),
      inviter: '', inviterName: '', inviterValid: false, state, stateText: STATE_TEXT[state],
    });
  }
  fillInviters(items, manufacturer, members, names);
  return items;
}

// Task 0, 1: nhà sản xuất. Task 2, 3: NPP đã nhận task 1 (chưa có thì để trống)
function fillInviters(items, manufacturer, members, names) {
  const distributor = items[1].state === 'accepted' ? items[1].invitee : '';
  const inviters = [manufacturer, manufacturer, distributor, distributor];
  const inviterRoles = [1, 1, 3, 3];
  for (const item of items) {
    item.inviter = inviters[item.task];
    item.inviterName = item.inviter ? nameOf(names, item.inviter) : '';
    item.inviterValid = isValid(members, item.inviter, inviterRoles[item.task]);
  }
}

// =============================================================
// ĐỊNH DẠNG 4 BƯỚC GIAO NHẬN (getHandovers). Bước đang diễn ra điền sẵn
// bên gửi (người giữ hàng) và bên nhận (người đã nhận task) dự kiến.
// =============================================================
function formatHandovers(raw, product, invitations, members) {
  const names = namesOf(members);
  const items = [];
  for (let step = 0; step < 4; step++) {
    const r = raw[step];
    const current = step === product.status;
    const expectedReceiver = invitations.length && invitations[step].state === 'accepted' ? invitations[step].invitee : '';
    const sender = r.sender !== ZERO_ADDRESS ? r.sender : (current ? product.currentOwner : '');
    const receiver = r.receiver !== ZERO_ADDRESS ? r.receiver : (current ? expectedReceiver : '');
    const state = handoverState(step, product.status, r);
    items.push({
      step, fromStatus: step, toStatus: step + 1, toStatusText: STATUS_TEXT[step + 1],
      sender, senderName: sender ? nameOf(names, sender) : '',
      sentAt: Number(r.sentAt) ? toIso(r.sentAt) : '', sentNote: r.sentNote,
      receiver, receiverName: receiver ? nameOf(names, receiver) : '',
      receivedAt: Number(r.receivedAt) ? toIso(r.receivedAt) : '', receivedNote: r.receivedNote,
      state, stateText: HANDOVER_TEXT[state],
    });
  }
  return items;
}

function handoverState(step, status, r) {
  if (step < status) return 'done';
  if (step > status) return 'none';
  if (Number(r.sentAt)) return 'sent';
  if (Number(r.receivedAt)) return 'received';
  return 'waiting';
}

// =============================================================
// QUY TẮC CHẶNG (khớp _taskReady, _legStarted, _requireLegReady của contract)
// =============================================================
function taskReady(invitations, task) {
  return invitations[task].state === 'accepted' && invitations[task].valid;
}

function legReady(invitations, step) {
  const ready = taskReady(invitations, step);
  if (step === 0 || step === 2) return ready && taskReady(invitations, step + 1);
  return ready;
}

function legWaitText(step) {
  if (step === 0) return WAIT_TEXT.leg1;
  if (step === 2) return WAIT_TEXT.leg2;
  return WAIT_TEXT.invalid;
}

function legStarted(task, entry) {
  const startStep = task < 2 ? 0 : 2;
  const status = entry.product.status;
  if (status > startStep) return true;
  if (status < startStep || entry.handovers.length === 0) return false;
  const h = entry.handovers[startStep];
  return h.sentAt !== '' || h.receivedAt !== '';
}

module.exports = {
  TASK_TEXT, TASK_ROLE, STATE_TEXT, STAGE_TEXT, WAIT_TEXT, ZERO_ADDRESS,
  sameAddress, formatInvitations, formatHandovers, taskReady, legReady, legWaitText, legStarted,
};
