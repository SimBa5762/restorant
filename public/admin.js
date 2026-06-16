let currentUser = null;
let activeFilter = 'new';
let pollTimer = null;
let prevCountsJson = '';
let categories = [];
let menus = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
    currentUser = await requireStaff(['admin']);
    if (!currentUser) return;

    fillProfile();
    bindEvents();
    await loadReferenceData();
    await loadOrders();
    startPolling();
}

function bindEvents() {
    document.getElementById('profileBtn').addEventListener('click', openProfile);
    document.getElementById('closeProfileSidebar').addEventListener('click', closeProfile);
    document.getElementById('sidebarOverlay').addEventListener('click', closeAllPanels);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('goHomeBtn').addEventListener('click', () => { window.location.href = '/'; });

    document.getElementById('adminPanelBtn').addEventListener('click', openDishPanel);
    document.getElementById('closeDishPanel').addEventListener('click', closeDishPanel);
    document.getElementById('adminTabMenu').addEventListener('click', () => switchAdminPanel('menu'));
    document.getElementById('adminTabStaff').addEventListener('click', () => switchAdminPanel('staff'));
    document.getElementById('addDishBtn').addEventListener('click', () => openDishForm());
    document.getElementById('addStaffBtn').addEventListener('click', () => openStaffForm());
    document.getElementById('staffFormClose').addEventListener('click', closeStaffForm);
    document.getElementById('staffForm').addEventListener('submit', saveStaff);
    document.getElementById('staffFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'staffFormModal') closeStaffForm();
    });
    document.getElementById('dishFormClose').addEventListener('click', closeDishForm);
    document.getElementById('dishForm').addEventListener('submit', saveDish);
    document.getElementById('dishImagePickBtn').addEventListener('click', () => {
        document.getElementById('dishImageFile').click();
    });
    document.getElementById('dishImageFile').addEventListener('change', handleDishImagePick);
    document.getElementById('dishFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'dishFormModal') closeDishForm();
    });

    document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
    document.getElementById('orderModal').addEventListener('click', (e) => {
        if (e.target.id === 'orderModal') closeOrderModal();
    });

    document.querySelectorAll('.staff-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.filter));
    });
}

async function requireStaff(roles) {
    try {
        const response = await fetch('/api/me');
        if (!response.ok) {
            window.location.href = '/';
            return null;
        }
        const user = await response.json();
        if (!roles.includes(user.role)) {
            window.location.href = '/';
            return null;
        }
        return user;
    } catch {
        window.location.href = '/';
        return null;
    }
}

function fillProfile() {
    document.getElementById('profileName').textContent = currentUser.name || '—';
    document.getElementById('profileEmail').textContent = currentUser.email || '—';
}

function openProfile() {
    document.getElementById('profileSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
}

function closeProfile() {
    document.getElementById('profileSidebar').classList.remove('active');
    if (!document.getElementById('dishPanel').classList.contains('active')) {
        document.getElementById('sidebarOverlay').classList.remove('active');
    }
}

function openDishPanel() {
    closeProfile();
    document.getElementById('dishPanel').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
    switchAdminPanel('menu');
}

function switchAdminPanel(section) {
    const isMenu = section === 'menu';
    document.getElementById('adminTabMenu').classList.toggle('active', isMenu);
    document.getElementById('adminTabStaff').classList.toggle('active', !isMenu);

    const menuSection = document.getElementById('adminMenuSection');
    const staffSection = document.getElementById('adminStaffSection');
    menuSection.hidden = !isMenu;
    staffSection.hidden = isMenu;

    if (isMenu) {
        loadDishAdminList();
    } else {
        loadStaffAdminList();
    }
}

function closeDishPanel() {
    document.getElementById('dishPanel').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function closeAllPanels() {
    closeProfile();
    closeDishPanel();
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
}

function switchTab(filter) {
    activeFilter = filter;
    document.querySelectorAll('.staff-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    loadOrders();
}

async function loadReferenceData() {
    const [catRes, menuRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menus')
    ]);
    categories = catRes.ok ? await catRes.json() : [];
    menus = menuRes.ok ? await menuRes.json() : [];

    const catSelect = document.getElementById('dishCategory');
    const menuSelect = document.getElementById('dishMenu');
    catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    menuSelect.innerHTML = menus.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

async function loadOrders() {
    const content = document.getElementById('staffContent');
    content.innerHTML = '<p class="staff-loading">Завантаження...</p>';

    try {
        const response = await fetch(`/api/admin/orders?filter=${activeFilter}`);
        if (!response.ok) throw new Error();
        const orders = await response.json();
        renderOrderCards(orders);
    } catch {
        content.innerHTML = '<p class="staff-empty">Не вдалося завантажити замовлення</p>';
    }
}

function renderOrderCards(orders) {
    const content = document.getElementById('staffContent');

    if (!orders.length) {
        content.innerHTML = '<p class="staff-empty">Замовлень у цьому списку немає</p>';
        return;
    }

    content.innerHTML = '';
    orders.forEach(order => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'order-staff-card';
        card.innerHTML = `
            <div class="order-staff-card__top">
                <span class="order-staff-card__num">№ ${escapeHtml(order.orderNumber)}</span>
                <span class="order-staff-card__status">${escapeHtml(order.statusLabel)}</span>
            </div>
            <p class="order-staff-card__customer">${escapeHtml(order.customerName)}</p>
            <p class="order-staff-card__meta">${escapeHtml(order.deliveryLabel)} · ${order.items.length} поз.</p>
            <p class="order-staff-card__total">${formatPrice(order.total)} грн</p>
        `;
        card.addEventListener('click', () => openOrderDetail(order.id));
        content.appendChild(card);
    });
}

async function openOrderDetail(orderId) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`);
        if (!response.ok) throw new Error();
        const order = await response.json();
        renderOrderModal(order);
    } catch {
        alert('Не вдалося завантажити замовлення');
    }
}

function renderOrderModal(order) {
    document.getElementById('orderModalTitle').textContent = `Замовлення № ${order.orderNumber}`;
    const itemsHtml = order.items.map(item =>
        `<li>${escapeHtml(item.name)} — ${item.quantity} × ${formatPrice(item.price)} грн</li>`
    ).join('');

    let actionsHtml = '';
    if (order.status === 'new') {
        actionsHtml = `<button class="btn-gold" id="processOrderBtn" type="button">Обробити — на кухню</button>`;
    } else if (order.status === 'waiting_for_delivery') {
        actionsHtml = `
            <div class="courier-assign">
                <label for="courierSelect">Призначити кур'єра</label>
                <select id="courierSelect"><option value="">Завантаження...</option></select>
                <button class="btn-gold" id="assignCourierBtn" type="button">Відправити кур'єру</button>
            </div>`;
    }

    document.getElementById('orderModalBody').innerHTML = `
        <div class="order-detail">
            <div class="order-detail__section">
                <p class="order-detail__label">Клієнт</p>
                <p>${escapeHtml(order.customerName)}</p>
                <p>${escapeHtml(order.customerPhone)}</p>
                <a class="btn-outline order-call-btn" href="tel:${escapeHtml(order.customerPhone)}">📞 Зателефонувати</a>
            </div>
            <div class="order-detail__section">
                <p class="order-detail__label">Замовлення</p>
                <ul class="order-detail__items">${itemsHtml}</ul>
                <p>Отримання: ${escapeHtml(order.deliveryLabel)}</p>
                <p>Оплата: ${escapeHtml(order.paymentLabel)}</p>
                <p class="order-detail__total">Разом: ${formatPrice(order.total)} грн</p>
            </div>
            ${order.courierName ? `<p>Кур'єр: ${escapeHtml(order.courierName)}</p>` : ''}
            <div class="order-detail__actions">${actionsHtml}</div>
        </div>
    `;

    if (order.status === 'new') {
        document.getElementById('processOrderBtn').addEventListener('click', () => processOrder(order.id));
    }
    if (order.status === 'waiting_for_delivery') {
        loadCouriersForAssign(order.id);
    }

    document.getElementById('orderModal').classList.add('open');
}

async function loadCouriersForAssign(orderId) {
    const select = document.getElementById('courierSelect');
    try {
        const response = await fetch('/api/admin/couriers');
        const couriers = response.ok ? await response.json() : [];
        if (!couriers.length) {
            select.innerHTML = '<option value="">Немає вільних кур\'єрів</option>';
        } else {
            select.innerHTML = '<option value="">Оберіть кур\'єра</option>' +
                couriers.map(c => `<option value="${c.id}">${escapeHtml(c.fullname)} (${escapeHtml(c.number)})</option>`).join('');
        }
        document.getElementById('assignCourierBtn').addEventListener('click', () => assignCourier(orderId));
    } catch {
        select.innerHTML = '<option value="">Помилка завантаження</option>';
    }
}

async function processOrder(orderId) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/process`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        closeOrderModal();
        await loadOrders();
        await pollNow();
    } catch (e) {
        alert(e.message || 'Помилка');
    }
}

async function assignCourier(orderId) {
    const courierId = document.getElementById('courierSelect').value;
    if (!courierId) {
        alert('Оберіть кур\'єра');
        return;
    }
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/assign-courier`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courierId: Number(courierId) })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        closeOrderModal();
        await loadOrders();
        await pollNow();
    } catch (e) {
        alert(e.message || 'Помилка');
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
}

async function loadDishAdminList() {
    const list = document.getElementById('dishAdminList');
    list.innerHTML = '<p class="staff-loading">Завантаження...</p>';
    try {
        const response = await fetch('/api/admin/dishes');
        const dishes = response.ok ? await response.json() : [];
        if (!dishes.length) {
            list.innerHTML = '<p class="staff-empty">Страв немає</p>';
            return;
        }
        list.innerHTML = '';
        dishes.forEach(dish => {
            const row = document.createElement('div');
            row.className = 'dish-admin-item';
            row.innerHTML = `
                <div>
                    <p class="dish-admin-item__name">${escapeHtml(dish.name)}</p>
                    <p class="dish-admin-item__price">${formatPrice(dish.price)} грн</p>
                </div>
                <div class="dish-admin-item__actions">
                    <button type="button" class="btn-outline btn-sm" data-edit="${dish.id}">Ред.</button>
                    <button type="button" class="btn-danger btn-sm" data-del="${dish.id}">✕</button>
                </div>
            `;
            row.querySelector('[data-edit]').addEventListener('click', () => openDishForm(dish));
            row.querySelector('[data-del]').addEventListener('click', () => deleteDish(dish.id));
            list.appendChild(row);
        });
    } catch {
        list.innerHTML = '<p class="staff-empty">Помилка завантаження</p>';
    }
}

function openDishForm(dish = null) {
    document.getElementById('dishFormError').textContent = '';
    document.getElementById('dishFormTitle').textContent = dish ? 'Редагувати страву' : 'Нова страва';
    document.getElementById('dishFormId').value = dish ? dish.id : '';
    document.getElementById('dishName').value = dish ? dish.name : '';
    document.getElementById('dishDesc').value = dish ? dish.description : '';
    document.getElementById('dishPrice').value = dish ? dish.price : '';
    document.getElementById('dishExistingImage').value = dish ? dish.image : '';
    document.getElementById('dishImageFile').value = '';
    if (dish) {
        document.getElementById('dishCategory').value = dish.category_id;
        document.getElementById('dishMenu').value = dish.menu_id;
        setDishImagePreview(getDishImageUrl(dish.image));
    } else {
        resetDishImagePreview();
    }
    document.getElementById('dishFormModal').classList.add('open');
}

function resetDishImagePreview() {
    const preview = document.getElementById('dishImagePreview');
    preview.innerHTML = '<p class="dish-image-preview__placeholder">Попередній перегляд</p>';
}

function setDishImagePreview(src) {
    const preview = document.getElementById('dishImagePreview');
    if (!src) {
        resetDishImagePreview();
        return;
    }
    preview.innerHTML = `<img src="${escapeHtml(src)}" alt="Попередній перегляд">`;
}

function handleDishImagePick() {
    const fileInput = document.getElementById('dishImageFile');
    const file = fileInput.files[0];
    if (!file) {
        resetDishImagePreview();
        return;
    }
    if (!file.type.startsWith('image/')) {
        fileInput.value = '';
        document.getElementById('dishFormError').textContent = 'Оберіть файл зображення';
        return;
    }
    document.getElementById('dishFormError').textContent = '';
    setDishImagePreview(URL.createObjectURL(file));
}

function closeDishForm() {
    const fileInput = document.getElementById('dishImageFile');
    if (fileInput.files[0]) {
        const img = document.querySelector('#dishImagePreview img');
        if (img && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    }
    document.getElementById('dishFormModal').classList.remove('open');
}

async function saveDish(e) {
    e.preventDefault();
    const id = document.getElementById('dishFormId').value;
    const fileInput = document.getElementById('dishImageFile');
    const errorEl = document.getElementById('dishFormError');

    if (!id && !fileInput.files[0]) {
        errorEl.textContent = 'Завантажте фото страви';
        return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('dishName').value.trim());
    formData.append('description', document.getElementById('dishDesc').value.trim());
    formData.append('price', document.getElementById('dishPrice').value);
    formData.append('category_id', document.getElementById('dishCategory').value);
    formData.append('menu_id', document.getElementById('dishMenu').value);
    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
    }

    try {
        const response = await fetch(id ? `/api/admin/dishes/${id}` : '/api/admin/dishes', {
            method: id ? 'PUT' : 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        closeDishForm();
        loadDishAdminList();
    } catch (err) {
        errorEl.textContent = err.message || 'Помилка збереження';
    }
}

async function deleteDish(id) {
    if (!confirm('Видалити цю страву?')) return;
    try {
        const response = await fetch(`/api/admin/dishes/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error();
        loadDishAdminList();
    } catch {
        alert('Не вдалося видалити');
    }
}

const STAFF_ROLE_LABELS = {
    cook: 'Кухар',
    courier: 'Кур\'єр'
};

async function loadStaffAdminList() {
    const list = document.getElementById('staffAdminList');
    list.innerHTML = '<p class="staff-loading">Завантаження...</p>';

    try {
        const response = await fetch('/api/admin/staff');
        if (!response.ok) throw new Error();
        const staff = await response.json();

        if (!staff.length) {
            list.innerHTML = '<p class="staff-empty">Працівників ще немає</p>';
            return;
        }

        list.innerHTML = '';
        staff.forEach(user => {
            const row = document.createElement('div');
            row.className = 'staff-admin-item';
            row.innerHTML = `
                <div>
                    <p class="staff-admin-item__name">${escapeHtml(user.name)}</p>
                    <p class="staff-admin-item__role">${escapeHtml(STAFF_ROLE_LABELS[user.role] || user.role)}</p>
                    <p class="staff-admin-item__meta">${escapeHtml(user.email)} · ${escapeHtml(user.number)}</p>
                </div>
                <div class="staff-admin-item__actions">
                    <button type="button" class="btn-outline btn-sm" data-edit="${user.id}">Ред.</button>
                    <button type="button" class="btn-danger btn-sm" data-del="${user.id}">✕</button>
                </div>
            `;
            row.querySelector('[data-edit]').addEventListener('click', () => openStaffForm(user));
            row.querySelector('[data-del]').addEventListener('click', () => deleteStaff(user.id));
            list.appendChild(row);
        });
    } catch {
        list.innerHTML = '<p class="staff-empty">Помилка завантаження</p>';
    }
}

function openStaffForm(user = null) {
    document.getElementById('staffFormError').textContent = '';
    document.getElementById('staffForm').reset();
    document.getElementById('staffFormId').value = user ? user.id : '';

    const titleEl = document.getElementById('staffFormTitle');
    const passwordEl = document.getElementById('staffPassword');
    const submitBtn = document.getElementById('staffSubmitBtn');

    if (user) {
        titleEl.textContent = 'Редагувати працівника';
        document.getElementById('staffName').value = user.name;
        document.getElementById('staffEmail').value = user.email;
        document.getElementById('staffNumber').value = user.number;
        document.getElementById('staffRole').value = user.role;
        passwordEl.placeholder = 'Новий пароль (необов\'язково)';
        passwordEl.required = false;
        submitBtn.textContent = 'Зберегти';
    } else {
        titleEl.textContent = 'Новий працівник';
        passwordEl.placeholder = 'Пароль (мін. 6 символів)';
        passwordEl.required = true;
        submitBtn.textContent = 'Додати';
    }

    document.getElementById('staffFormModal').classList.add('open');
}

function closeStaffForm() {
    document.getElementById('staffFormModal').classList.remove('open');
}

async function saveStaff(e) {
    e.preventDefault();
    const errorEl = document.getElementById('staffFormError');
    const id = document.getElementById('staffFormId').value;

    const name = document.getElementById('staffName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const number = document.getElementById('staffNumber').value.trim();
    const password = document.getElementById('staffPassword').value;
    const role = document.getElementById('staffRole').value;

    if (!validateName(name)) {
        errorEl.textContent = 'Ім\'я має містити щонайменше 2 символи';
        return;
    }
    if (!validateEmail(email)) {
        errorEl.textContent = 'Введіть коректний email';
        return;
    }
    if (!validatePhone(number)) {
        errorEl.textContent = 'Введіть коректний номер телефону';
        return;
    }
    if (!id && !validatePassword(password)) {
        errorEl.textContent = 'Пароль має містити щонайменше 6 символів';
        return;
    }
    if (id && password && !validatePassword(password)) {
        errorEl.textContent = 'Новий пароль має містити щонайменше 6 символів';
        return;
    }
    if (!role) {
        errorEl.textContent = 'Оберіть роль';
        return;
    }

    const body = { name, email, number, role };
    if (password) body.password = password;

    try {
        const response = await fetch(id ? `/api/admin/staff/${id}` : '/api/admin/staff', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        closeStaffForm();
        loadStaffAdminList();
    } catch (err) {
        errorEl.textContent = err.message || 'Помилка збереження';
    }
}

async function deleteStaff(id) {
    if (!confirm('Видалити цього працівника?')) return;
    try {
        const response = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        loadStaffAdminList();
    } catch (err) {
        alert(err.message || 'Не вдалося видалити');
    }
}

function startPolling() {
    pollNow();
    pollTimer = setInterval(pollNow, 5000);
}

async function pollNow() {
    try {
        const response = await fetch('/api/admin/orders/poll');
        if (!response.ok) return;
        const data = await response.json();

        updateBadge('badgeNew', data.counts.new);
        updateBadge('badgePreparing', data.counts.preparing);
        updateBadge('badgeWaiting', data.counts.waiting_for_delivery);
        updateBadge('badgeDelivering', data.counts.delivering);
        updateBadge('badgeDeliveredToday', data.counts.delivered_today);

        const countsJson = JSON.stringify(data.counts);
        if (countsJson !== prevCountsJson) {
            prevCountsJson = countsJson;
            loadOrders();
        }
    } catch { /* ignore */ }
}

function updateBadge(id, count) {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = count;
    badge.hidden = count <= 0;
}

function formatPrice(price) {
    return Number(price).toFixed(0);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
    if (pollTimer) clearInterval(pollTimer);
});
