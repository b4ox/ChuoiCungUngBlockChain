// =============================================================
// VIỆC CỦA TỪNG VÍ (v1.3): từ dữ liệu đã định dạng, tính
//   - invitationsFor : nhiệm vụ của một ví (lời mời + giao nhận) -> mục "Xử lý đơn"
//   - invitesToSend  : lời mời ví này được quản lý (mời / mời lại / huỷ) -> "Cần mời"
//   - blockedTasks   : nhiệm vụ có bên đã nhận nhưng bị khoá -> admin chuyển nhiệm vụ
// entries: [{ product, invitations (4), handovers (4) }] — xem invitationLogic.js
// =============================================================
const logic = require('./invitationLogic');
const { ROLE_TEXT } = require('./format');

const MANUFACTURER_TASK_TEXT = 'Giao hàng cho vận chuyển chặng 1';

function waiting(text) {
  return { stage: 'upcoming', waitingFor: text, action: null };
}

// Bên gửi (asSender) hoặc bên nhận xác nhận ở bước step
function confirmStage(entry, step, asSender) {
  if (!logic.legReady(entry.invitations, step)) return waiting(logic.legWaitText(step));
  const h = entry.handovers[step];
  if (asSender && h.sentAt !== '') return waiting(logic.WAIT_TEXT.receiver);
  if (!asSender && h.receivedAt !== '') return waiting(logic.WAIT_TEXT.sender);
  let action = 'receive';
  if (asSender) action = 'send';
  else if (step === 0 || step === 2) action = 'pickup';
  return { stage: 'todo', waitingFor: '', action };
}

// Ví nhận task (task = -1: nhà sản xuất) làm bên nhận ở bước task,
// làm bên gửi ở bước task + 1; riêng bán lẻ ở trạng thái 4 thì bán.
function partyStage(entry, task, address) {
  const { product } = entry;
  const status = product.status;
  if (task === 3 && status === 4) {
    if (logic.sameAddress(product.currentOwner, address)) return { stage: 'todo', waitingFor: '', action: 'sell' };
    return { stage: 'done', waitingFor: '', action: null };
  }
  if (status === task) return confirmStage(entry, task, false);
  if (status === task + 1 && task < 3) return confirmStage(entry, task + 1, true);
  if (status < task) return waiting(logic.WAIT_TEXT.arrival);
  return { stage: 'done', waitingFor: '', action: null };
}

function withStage(entry, inv, stageInfo, canWithdraw) {
  const { product } = entry;
  return {
    productId: product.id, productName: product.name, status: product.status, statusText: product.statusText,
    ...inv,
    stage: stageInfo.stage, stageText: logic.STAGE_TEXT[stageInfo.stage], waitingFor: stageInfo.waitingFor,
    canActNow: stageInfo.stage === 'todo', action: stageInfo.action, canWithdraw,
  };
}

// Một lời mời gửi tới ví; null nếu lời mời đang chờ mà chặng đã bắt đầu (không còn dùng được)
function toMyInvitation(entry, inv, address) {
  const started = logic.legStarted(inv.task, entry);
  if (inv.state === 'pending') {
    return started ? null : withStage(entry, inv, { stage: 'invited', waitingFor: '', action: null }, false);
  }
  return withStage(entry, inv, partyStage(entry, inv.task, address), !started);
}

// Nhà sản xuất không có lời mời, nhưng là bên gửi ở bước 0
function manufacturerItem(entry) {
  const { product } = entry;
  const inv = {
    task: null, taskText: MANUFACTURER_TASK_TEXT, role: 1, roleText: ROLE_TEXT[1],
    invitee: product.manufacturer, inviteeName: product.manufacturerName, valid: true,
    inviter: '', inviterName: '', inviterValid: false, state: 'owner', stateText: logic.STATE_TEXT.owner,
  };
  return withStage(entry, inv, partyStage(entry, -1, product.manufacturer), false);
}

// GET /invitations?address=&stage=
function invitationsFor(entries, address, stage) {
  const result = [];
  for (const entry of entries) {
    if (entry.invitations.length === 0) continue; // contract chưa có lời mời
    const items = [];
    if (logic.sameAddress(entry.product.manufacturer, address)) items.push(manufacturerItem(entry));
    for (const inv of entry.invitations) {
      if (logic.sameAddress(inv.invitee, address)) items.push(toMyInvitation(entry, inv, address));
    }
    for (const item of items) {
      if (item && (!stage || item.stage === stage)) result.push(item);
    }
  }
  return result;
}

// GET /invitations/to-send?address=: mọi task ví này đang quản lý khi chặng chưa bắt đầu
function invitesToSend(entries, address) {
  const result = [];
  for (const entry of entries) {
    const tasks = entry.invitations
      .filter((inv) => logic.sameAddress(inv.inviter, address) && inv.inviterValid && !logic.legStarted(inv.task, entry))
      .map((inv) => ({ ...inv, canInvite: inv.state !== 'accepted' || !inv.valid, canCancel: inv.invitee !== '' }));
    if (tasks.length > 0) {
      const { product } = entry;
      result.push({ productId: product.id, productName: product.name, status: product.status,
        statusText: product.statusText, tasks });
    }
  }
  return result;
}

// GET /invitations/blocked: task đã có người nhận nhưng người đó bị khoá / sai vai, task chưa xong
function blockedTasks(entries) {
  const result = [];
  for (const { product, invitations } of entries) {
    for (const inv of invitations) {
      if (inv.state === 'accepted' && !inv.valid && product.status < inv.task + 2) {
        result.push({ productId: product.id, productName: product.name, status: product.status,
          statusText: product.statusText, currentOwner: product.currentOwner, ...inv });
      }
    }
  }
  return result;
}

module.exports = { invitationsFor, invitesToSend, blockedTasks };
