// =============================================================
// XỬ LÝ ĐƠN: chỉ hiển thị nhiệm vụ của ví được mời.
// =============================================================
let currentUser = null;
let myInvitations = [];
let invitationsToSend = [];
let eligibleParticipants = [];
let transactionPending = false;
const CONTRACT_METHODS = { pickup: 'pickUpProduct', receive: 'receiveProduct', sell: 'markAsSold' };
const ACTION_LABELS = { pickup: 'Nhận hàng đi giao', receive: 'Xác nhận đã nhận', sell: 'Đánh dấu đã bán' };

function invitationControls(invitation, index) {
  if (!currentUser.isActive) return '<p class="small text-body-secondary mb-0">Chức năng mở khi vai trò đang hoạt động.</p>';
  if (invitation.stage === 'invited') {
    return `<button type="button" class="btn btn-primary btn-sm" data-invitation="${index}" data-method="accept">Chấp nhận</button>
      <button type="button" class="btn btn-outline-danger btn-sm" data-invitation="${index}" data-method="decline">Từ chối</button>`;
  }
  if (invitation.stage === 'todo' && invitation.canActNow && CONTRACT_METHODS[invitation.action]) {
    return `<form class="task-form" data-invitation="${index}"><label class="form-label small" for="note-${index}">Ghi chú (không bắt buộc)</label>
      <input class="form-control form-control-sm mb-2" id="note-${index}" name="note" maxlength="200">
      <button class="btn btn-primary btn-sm" type="submit">${ACTION_LABELS[invitation.action]}</button></form>`;
  }
  if (invitation.stage === 'upcoming') return `<p class="small text-body-secondary mb-0">${escapeHtml(invitation.waitingFor || 'Chờ hàng đến bước của bạn')}</p>`;
  return '';
}

function invitationCard(invitation, index) {
  return `<div class="col-md-6 col-xl-4"><article class="card h-100"><div class="card-body">
    <div class="d-flex flex-wrap justify-content-between gap-2 mb-2"><h3 class="h6 fw-semibold mb-0">${escapeHtml(invitation.productName)}</h3>${statusBadge(invitation.status, invitation.statusText)}</div>
    <p class="small text-body-secondary mb-2">Mã #${escapeHtml(invitation.productId)} · ${escapeHtml(invitation.taskText)}</p>
    <p class="small mb-3">Mời bởi: ${escapeHtml(invitation.inviterName || shortAddress(invitation.inviter) || 'Chưa rõ')}</p>
    <div class="d-flex flex-wrap gap-2">${invitationControls(invitation, index)}</div></div></article></div>`;
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
// CẦN MỜI: chỉ chọn doanh nghiệp đang hoạt động và đúng vai trò.
// =============================================================
function inviteTaskForm(product, task, productIndex, taskIndex) {
  const options = eligibleParticipants.filter(person => person.isActive && person.role === task.role);
  const optionsHtml = options.map(person => `<option value="${escapeHtml(person.address)}">${escapeHtml(person.name)} · ${escapeHtml(shortAddress(person.address))}</option>`).join('');
  const pending = task.state === 'pending' ? `<p class="small text-body-secondary">Đang chờ ${escapeHtml(task.inviteeName || shortAddress(task.invitee))} trả lời, có thể mời bên khác.</p>` : '';
  return `<form class="invite-form border-top pt-3 mt-3" data-product="${productIndex}" data-task="${taskIndex}">
    <label class="form-label fw-semibold small" for="invite-${productIndex}-${taskIndex}">${escapeHtml(task.taskText)} · ${escapeHtml(task.roleText)}</label>${pending}
    <select class="form-select form-select-sm mb-2" id="invite-${productIndex}-${taskIndex}" name="invitee" required><option value="">Chọn doanh nghiệp</option>${optionsHtml}</select>
    <button class="btn btn-outline-primary btn-sm" type="submit" ${options.length && currentUser.isActive ? '' : 'disabled'}>Mời</button>${options.length ? '' : '<span class="small text-body-secondary ms-2">Chưa có doanh nghiệp phù hợp.</span>'}</form>`;
}

function renderToSend() {
  document.getElementById('toSendList').innerHTML = invitationsToSend.map((product, index) => `<div class="col-md-6"><article class="card h-100"><div class="card-body"><h3 class="h6 fw-semibold">${escapeHtml(product.productName)} <span class="text-body-secondary">#${escapeHtml(product.productId)}</span></h3>${statusBadge(product.status, product.statusText)}${product.tasks.map((task, taskIndex) => inviteTaskForm(product, task, index, taskIndex)).join('')}</div></article></div>`).join('');
  document.getElementById('toSendEmpty').classList.toggle('d-none', invitationsToSend.length > 0);
}

async function loadActions() {
  try {
    const address = encodeURIComponent(currentUser.address);
    const [received, toSend, participants] = await Promise.all([apiGet('/invitations?address=' + address), apiGet('/invitations/to-send?address=' + address), apiGet('/participants')]);
    myInvitations = received.filter(item => sameAddress(item.invitee, currentUser.address));
    invitationsToSend = toSend.map(item => ({ ...item, tasks: item.tasks.filter(task => sameAddress(task.inviter, currentUser.address)) })).filter(item => item.tasks.length);
    eligibleParticipants = participants;
    renderInvitationGroups();
    renderToSend();
    document.getElementById('actionState').classList.add('d-none');
  } catch (error) {
    const state = document.getElementById('actionState');
    state.textContent = 'Không tải được danh sách lời mời. Vui lòng tải lại trang.';
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
    await loadActions();
  } catch (error) { showToast(error.message); }
  finally { transactionPending = false; setButtonBusy(button, false); }
}

function onInvitationClick(event) {
  const button = event.target.closest('button[data-invitation]');
  if (!button || !currentUser.isActive) return;
  const item = myInvitations[Number(button.dataset.invitation)];
  if (!item || item.stage !== 'invited') return;
  const method = button.dataset.method === 'accept' ? 'acceptInvitation' : 'declineInvitation';
  runAction(button, method, [Number(item.productId), Number(item.task)]);
}

function onTaskSubmit(event) {
  const form = event.target;
  if (!form.matches('.task-form')) return;
  event.preventDefault();
  const item = myInvitations[Number(form.dataset.invitation)];
  if (!currentUser.isActive || !item || item.stage !== 'todo' || !item.canActNow || !CONTRACT_METHODS[item.action]) return;
  runAction(form.querySelector('button'), CONTRACT_METHODS[item.action], [Number(item.productId), form.elements.note.value.trim()]);
}

function onInviteSubmit(event) {
  const form = event.target;
  if (!form.matches('.invite-form')) return;
  event.preventDefault();
  const product = invitationsToSend[Number(form.dataset.product)];
  const task = product && product.tasks[Number(form.dataset.task)];
  const invitee = form.elements.invitee.value;
  if (!currentUser.isActive || !task || !eligibleParticipants.some(person => person.isActive && person.role === task.role && sameAddress(person.address, invitee))) return;
  runAction(form.querySelector('button'), 'inviteParticipant', [Number(product.productId), Number(task.task), invitee]);
}

(async function start() {
  currentUser = await initPage({ requireLogin: true });
  if (!currentUser) return;
  document.getElementById('roleInfo').textContent = currentUser.isActive ? 'Vai trò hiện tại: ' + currentUser.roleText + '.' : 'Ví chưa có vai trò đang hoạt động; không thể thực hiện giao dịch.';
  document.getElementById('invitedList').addEventListener('click', onInvitationClick);
  document.getElementById('todoList').addEventListener('submit', onTaskSubmit);
  document.getElementById('toSendList').addEventListener('submit', onInviteSubmit);
  loadActions();
})();
