// =============================================================
// XỬ LÝ ĐƠN: chỉ hiển thị nhiệm vụ của ví đang đăng nhập (đã được mời,
// hoặc là nhà sản xuất của sản phẩm). Backend tính sẵn stage / action /
// waitingFor (GET /invitations), trang này chỉ chia nhóm và gọi contract.
// v1.3: mỗi bước giao nhận cần bên gửi "Xác nhận đã giao" và bên nhận
// "Xác nhận đã nhận"; được rút lui / huỷ lời mời khi chặng chưa bắt đầu.
// =============================================================
let currentUser = null;
let myInvitations = [];
let invitationsToSend = [];
let eligibleParticipants = [];
let transactionPending = false;
const confirmClicks = {}; // khoá nút -> true khi đã bấm lần 1 (rút lui / huỷ cần bấm 2 lần)
const CONTRACT_METHODS = { send: 'confirmSent', pickup: 'pickUpProduct', receive: 'receiveProduct', sell: 'markAsSold' };
const ACTION_LABELS = {
  send: 'Xác nhận đã giao hàng', pickup: 'Xác nhận đã nhận hàng',
  receive: 'Xác nhận đã nhận hàng', sell: 'Đánh dấu đã bán',
};

// Nút cần bấm 2 lần (thay cho hộp confirm của trình duyệt)
function confirmButton(key, label, attrs) {
  const text = confirmClicks[key] ? 'Bấm lần nữa để ' + label.toLowerCase() : label;
  return `<button type="button" class="btn btn-outline-danger btn-sm" data-confirm="${key}" ${attrs}>${text}</button>`;
}

function invitationControls(invitation, index) {
  if (!currentUser.isActive) return '<p class="small text-body-secondary mb-0">Chức năng mở khi vai trò đang hoạt động.</p>';
  if (invitation.stage === 'invited') {
    return `<button type="button" class="btn btn-primary btn-sm" data-invitation="${index}" data-method="accept">Chấp nhận</button>
      <button type="button" class="btn btn-outline-danger btn-sm" data-invitation="${index}" data-method="decline">Từ chối</button>`;
  }
  const withdraw = invitation.canWithdraw
    ? confirmButton('withdraw-' + index, 'Rút lui', `data-invitation="${index}" data-method="withdraw"`) : '';
  if (invitation.stage === 'todo' && invitation.canActNow && CONTRACT_METHODS[invitation.action]) {
    return `<form class="task-form w-100" data-invitation="${index}"><label class="form-label small" for="note-${index}">Ghi chú (không bắt buộc)</label>
      <input class="form-control form-control-sm mb-2" id="note-${index}" name="note" maxlength="200">
      <div class="d-flex flex-wrap gap-2"><button class="btn btn-primary btn-sm" type="submit">${ACTION_LABELS[invitation.action]}</button>${withdraw}</div></form>`;
  }
  if (invitation.stage === 'upcoming') {
    return `<p class="small text-body-secondary mb-0 w-100"><i class="bi bi-hourglass-split me-1"></i>${escapeHtml(invitation.waitingFor || 'Chờ hàng đến bước của bạn')}</p>${withdraw}`;
  }
  return '';
}

function invitationCard(invitation, index) {
  const by = invitation.inviter
    ? `<p class="small mb-3">Mời bởi: ${escapeHtml(invitation.inviterName || shortAddress(invitation.inviter))}</p>` : '<div class="mb-3"></div>';
  return `<div class="col-md-6 col-xl-4"><article class="card h-100"><div class="card-body">
    <div class="d-flex flex-wrap justify-content-between gap-2 mb-2"><h3 class="h6 fw-semibold mb-0">${escapeHtml(invitation.productName)}</h3>${statusBadge(invitation.status, invitation.statusText)}</div>
    <p class="small text-body-secondary mb-2">Mã #${escapeHtml(invitation.productId)} · ${escapeHtml(invitation.taskText)} · <a href="trace.html?id=${escapeHtml(invitation.productId)}">Xem hành trình</a></p>
    ${by}<div class="d-flex flex-wrap gap-2">${invitationControls(invitation, index)}</div></div></article></div>`;
}

function renderInvitationGroups() {
  ['invited', 'todo', 'upcoming', 'done'].forEach(stage => {
    const items = myInvitations.map((item, index) => ({ item, index })).filter(entry => entry.item.stage === stage);
    document.getElementById(stage + 'List').innerHTML = items.map(entry => invitationCard(entry.item, entry.index)).join('');
    document.getElementById(stage + 'Count').textContent = items.length;
    document.getElementById(stage + 'Empty').classList.toggle('d-none', items.length > 0);
  });
}

// =============================================================
// CẦN MỜI: mời / mời lại / huỷ khi chặng chưa bắt đầu.
// Chỉ gợi ý doanh nghiệp đang hoạt động và đúng vai trò.
// =============================================================
function inviteeLine(task) {
  if (task.state === 'none') return '';
  const name = escapeHtml(task.inviteeName || shortAddress(task.invitee));
  if (task.state === 'pending') return `<p class="small text-body-secondary mb-2">Đang chờ ${name} trả lời, có thể mời bên khác.</p>`;
  if (!task.valid) return `<p class="small text-danger mb-2">${name} đã nhận lời nhưng không còn hoạt động, hãy mời bên khác.</p>`;
  return `<p class="small mb-2"><i class="bi bi-check2-circle text-success me-1"></i>${name} đã nhận lời.</p>`;
}

function inviteSelect(task, productIndex, taskIndex) {
  const options = eligibleParticipants.filter(person => person.isActive && person.role === task.role);
  const optionsHtml = options.map(person => `<option value="${escapeHtml(person.address)}">${escapeHtml(person.name)} · ${escapeHtml(shortAddress(person.address))}</option>`).join('');
  return `<select class="form-select form-select-sm mb-2" id="invite-${productIndex}-${taskIndex}" name="invitee" required><option value="">Chọn doanh nghiệp</option>${optionsHtml}</select>
    <button class="btn btn-outline-primary btn-sm" type="submit" ${options.length ? '' : 'disabled'}>Mời</button>${options.length ? '' : '<span class="small text-body-secondary ms-2">Chưa có doanh nghiệp phù hợp.</span>'}`;
}

function inviteTaskForm(task, productIndex, taskIndex) {
  const key = `cancel-${productIndex}-${taskIndex}`;
  const cancel = task.canCancel && currentUser.isActive
    ? confirmButton(key, 'Huỷ lời mời', `data-product="${productIndex}" data-task="${taskIndex}" data-method="cancel"`) : '';
  const select = task.canInvite && currentUser.isActive ? inviteSelect(task, productIndex, taskIndex) : '';
  return `<form class="invite-form border-top pt-3 mt-3" data-product="${productIndex}" data-task="${taskIndex}">
    <label class="form-label fw-semibold small" for="invite-${productIndex}-${taskIndex}">${escapeHtml(task.taskText)} · ${escapeHtml(task.roleText)}</label>
    ${inviteeLine(task)}${select}<div class="mt-2">${cancel}</div></form>`;
}

function renderToSend() {
  document.getElementById('toSendList').innerHTML = invitationsToSend.map((product, index) => `<div class="col-md-6"><article class="card h-100"><div class="card-body"><h3 class="h6 fw-semibold">${escapeHtml(product.productName)} <span class="text-body-secondary">#${escapeHtml(product.productId)}</span></h3>${statusBadge(product.status, product.statusText)}${product.tasks.map((task, taskIndex) => inviteTaskForm(task, index, taskIndex)).join('')}</div></article></div>`).join('');
  document.getElementById('toSendEmpty').classList.toggle('d-none', invitationsToSend.length > 0);
}

function renderAll() {
  renderInvitationGroups();
  renderToSend();
}

// fresh = true: vừa ký giao dịch, đọc lại từ chuỗi (bỏ qua nhớ tạm 10 giây của backend)
async function loadActions(fresh) {
  try {
    const query = '?address=' + encodeURIComponent(currentUser.address) + (fresh ? '&fresh=1' : '');
    const [received, toSend, participants] = await Promise.all([apiGet('/invitations' + query), apiGet('/invitations/to-send' + query), apiGet('/participants')]);
    myInvitations = received.filter(item => sameAddress(item.invitee, currentUser.address));
    invitationsToSend = toSend.map(item => ({ ...item, tasks: item.tasks.filter(task => sameAddress(task.inviter, currentUser.address)) })).filter(item => item.tasks.length);
    eligibleParticipants = participants;
    renderAll();
    document.getElementById('actionState').classList.add('d-none');
  } catch (error) {
    const state = document.getElementById('actionState');
    state.textContent = 'Không tải được danh sách nhiệm vụ. Vui lòng tải lại trang.';
    state.classList.remove('d-none');
    showToast(error.message);
  }
}

// =============================================================
// GIAO DỊCH: ký bằng ví và làm mới danh sách khi đã vào khối.
// =============================================================
async function runAction(button, method, args) {
  if (transactionPending) return;
  transactionPending = true;
  setButtonBusy(button, true, 'Xác nhận trong MetaMask...');
  try {
    const result = await sendContractTx(method, args, () => setButtonBusy(button, true, 'Đang chờ vào khối...'));
    showToast(transactionMessage(result), 'success');
    await refreshPublicData();
    await loadActions(true);
  } catch (error) { showToast(error.message); }
  finally { transactionPending = false; setButtonBusy(button, false); }
}

// Lần bấm đầu của nút cần xác nhận: chỉ đổi chữ trên nút
function needsSecondClick(button) {
  const key = button.dataset.confirm;
  if (!key || confirmClicks[key]) {
    if (key) delete confirmClicks[key];
    return false;
  }
  confirmClicks[key] = true;
  renderAll();
  return true;
}

function onInvitationClick(event) {
  const button = event.target.closest('button[data-invitation]');
  if (!button || !currentUser.isActive || needsSecondClick(button)) return;
  const item = myInvitations[Number(button.dataset.invitation)];
  if (!item || item.task === null) return;
  const method = button.dataset.method;
  if (method === 'accept' && item.stage === 'invited') runAction(button, 'acceptInvitation', [Number(item.productId), Number(item.task)]);
  if (method === 'decline' && item.stage === 'invited') runAction(button, 'declineInvitation', [Number(item.productId), Number(item.task)]);
  if (method === 'withdraw' && item.canWithdraw) runAction(button, 'declineInvitation', [Number(item.productId), Number(item.task)]);
}

function onTaskSubmit(event) {
  const form = event.target;
  if (!form.matches('.task-form')) return;
  event.preventDefault();
  const item = myInvitations[Number(form.dataset.invitation)];
  if (!currentUser.isActive || !item || item.stage !== 'todo' || !item.canActNow || !CONTRACT_METHODS[item.action]) return;
  runAction(form.querySelector('button[type="submit"]'), CONTRACT_METHODS[item.action], [Number(item.productId), form.elements.note.value.trim()]);
}

function onInviteSubmit(event) {
  const form = event.target;
  if (!form.matches('.invite-form')) return;
  event.preventDefault();
  const product = invitationsToSend[Number(form.dataset.product)];
  const task = product && product.tasks[Number(form.dataset.task)];
  const invitee = form.elements.invitee ? form.elements.invitee.value : '';
  if (!currentUser.isActive || !task || !task.canInvite || !eligibleParticipants.some(person => person.isActive && person.role === task.role && sameAddress(person.address, invitee))) return;
  runAction(form.querySelector('button[type="submit"]'), 'inviteParticipant', [Number(product.productId), Number(task.task), invitee]);
}

function onCancelClick(event) {
  const button = event.target.closest('button[data-method="cancel"]');
  if (!button || !currentUser.isActive || needsSecondClick(button)) return;
  const product = invitationsToSend[Number(button.dataset.product)];
  const task = product && product.tasks[Number(button.dataset.task)];
  if (!task || !task.canCancel) return;
  runAction(button, 'cancelInvitation', [Number(product.productId), Number(task.task)]);
}

(async function start() {
  currentUser = await initPage({ requireLogin: true });
  if (!currentUser) return;
  document.getElementById('roleInfo').textContent = currentUser.isActive ? 'Vai trò hiện tại: ' + currentUser.roleText + '.' : 'Ví chưa có vai trò đang hoạt động; không thể thực hiện giao dịch.';
  ['invitedList', 'todoList', 'upcomingList'].forEach(id => document.getElementById(id).addEventListener('click', onInvitationClick));
  document.getElementById('todoList').addEventListener('submit', onTaskSubmit);
  document.getElementById('toSendList').addEventListener('submit', onInviteSubmit);
  document.getElementById('toSendList').addEventListener('click', onCancelClick);
  loadActions(false);
})();
