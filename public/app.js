let currentUser = null;
let menuItems = [];
let menusList = [];
let currentMenuIndex = 0;
let activeMenuId = null;
let activeCategoryId = null;

const CART_KEY = 'restaurant_cart';

document.addEventListener('DOMContentLoaded', init);

async function init() {
    currentUser = await fetchCurrentUser();
    if (redirectStaffIfNeeded(currentUser)) return;

    updateCartBadge();

    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('sortSelect').addEventListener('change', applySortAndRender);
    document.getElementById('profileBtn').addEventListener('click', handleProfileClick);
    document.getElementById('cartBtn').addEventListener('click', handleCartClick);

    document.getElementById('closeSidebar').addEventListener('click', closeProfileSidebar);
    document.getElementById('closeCartSidebar').addEventListener('click', closeCartSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeAllSidebars);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('deleteAccountBtn').addEventListener('click', openDeleteAccountModal);
    document.getElementById('deleteAccountModalClose').addEventListener('click', closeDeleteAccountModal);
    document.getElementById('cancelDeleteAccountBtn').addEventListener('click', closeDeleteAccountModal);
    document.getElementById('confirmDeleteAccountBtn').addEventListener('click', deleteAccount);
    document.getElementById('deleteAccountModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteAccountModal') closeDeleteAccountModal();
    });

    document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
    document.getElementById('authModal').addEventListener('click', (e) => {
        if (e.target.id === 'authModal') closeAuthModal();
    });

    document.getElementById('dishModalClose').addEventListener('click', closeDishModal);
    document.getElementById('dishModal').addEventListener('click', (e) => {
        if (e.target.id === 'dishModal') closeDishModal();
    });

    document.getElementById('menuPrevBtn').addEventListener('click', () => switchMenu(-1));
    document.getElementById('menuNextBtn').addEventListener('click', () => switchMenu(1));

    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);
    document.getElementById('orderHistoryBtn').addEventListener('click', openOrderHistory);
    document.getElementById('ordersModalClose').addEventListener('click', closeOrdersModal);
    document.getElementById('ordersModal').addEventListener('click', (e) => {
        if (e.target.id === 'ordersModal') closeOrdersModal();
    });
    document.getElementById('receiptModalClose').addEventListener('click', closeReceiptModal);
    document.getElementById('receiptOkBtn').addEventListener('click', closeReceiptModal);
    document.getElementById('receiptModal').addEventListener('click', (e) => {
        if (e.target.id === 'receiptModal') closeReceiptModal();
    });

    await loadMenusList();
    await loadCategories();
    await loadMenu(false);
}

function getMenuQueryParam() {
    return activeMenuId ? `?menu_id=${activeMenuId}` : '';
}

async function loadMenusList() {
    try {
        const response = await fetch('/api/menus');
        if (!response.ok) throw new Error();
        menusList = await response.json();

        if (menusList.length) {
            currentMenuIndex = 0;
            activeMenuId = menusList[0].id;
        }

        updateMenuSliderUI();
    } catch {
        menusList = [];
        document.getElementById('menuSliderTitle').textContent = 'Меню';
        document.getElementById('menuSliderCounter').textContent = 'Не вдалося завантажити список меню';
        document.getElementById('menuPrevBtn').disabled = true;
        document.getElementById('menuNextBtn').disabled = true;
    }
}

function updateMenuSliderUI() {
    const titleEl = document.getElementById('menuSliderTitle');
    const counterEl = document.getElementById('menuSliderCounter');
    const prevBtn = document.getElementById('menuPrevBtn');
    const nextBtn = document.getElementById('menuNextBtn');

    if (!menusList.length) {
        titleEl.textContent = 'Меню';
        counterEl.textContent = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const current = menusList[currentMenuIndex];
    titleEl.textContent = current.name;
    counterEl.textContent = `${currentMenuIndex + 1} / ${menusList.length}`;
    prevBtn.disabled = currentMenuIndex === 0;
    nextBtn.disabled = currentMenuIndex === menusList.length - 1;
}

async function switchMenu(direction) {
    const newIndex = currentMenuIndex + direction;
    if (newIndex < 0 || newIndex >= menusList.length) return;

    currentMenuIndex = newIndex;
    activeMenuId = menusList[currentMenuIndex].id;

    resetFilters();
    activeCategoryId = null;
    setActiveCategoryCard(document.querySelector('.category-card'));

    updateMenuSliderUI();
    await loadMenu(true);
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('sortSelect').value = '';
}

async function loadMenu(showLoading = true) {
    const grid = document.getElementById('menuGrid');
    if (showLoading) {
        grid.innerHTML = '<p class="menu-loading">Завантаження меню...</p>';
    }
    try {
        const response = await fetch(`/api/menu${getMenuQueryParam()}`);
        if (!response.ok) throw new Error('Помилка завантаження');
        menuItems = await response.json();
        applySortAndRender();
    } catch {
        grid.innerHTML = '<p class="menu-empty">Не вдалося завантажити меню</p>';
    }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) return;
        const categories = await response.json();
        renderCategories(categories);
    } catch {
        /* категорії необов'язкові */
    }
}

function setActiveCategoryCard(activeCard) {
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
    if (activeCard) activeCard.classList.add('active');
}

async function selectCategory(categoryId, cardElement) {
    resetFilters();
    activeCategoryId = categoryId;
    setActiveCategoryCard(cardElement);
    await loadMenu(true);
}

function renderCategories(categories) {
    const block = document.getElementById('categoriesBlock');
    block.innerHTML = '';

    const allBtn = document.createElement('div');
    allBtn.className = 'category-card active';
    allBtn.innerHTML = '<h2>Усі</h2>';
    allBtn.addEventListener('click', () => selectCategory(null, allBtn));
    block.appendChild(allBtn);

    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `<h2>${escapeHtml(cat.name)}</h2>`;
        card.addEventListener('click', () => selectCategory(cat.id, card));
        block.appendChild(card);
    });
}

async function handleSearch() {
    const value = document.getElementById('searchInput').value.trim();
    const grid = document.getElementById('menuGrid');

    if (!value) {
        activeCategoryId = null;
        setActiveCategoryCard(document.querySelector('.category-card'));
        await loadMenu(true);
        return;
    }

    grid.innerHTML = '<p class="menu-loading">Пошук...</p>';

    try {
        const menuParam = activeMenuId ? `&menu_id=${activeMenuId}` : '';
        const response = await fetch(`/api/search?value=${encodeURIComponent(value)}${menuParam}`);
        if (!response.ok) throw new Error();
        menuItems = await response.json();
        applySortAndRender();
    } catch {
        grid.innerHTML = '<p class="menu-empty">Помилка пошуку</p>';
    }
}

function applySortAndRender() {
    let items = [...menuItems];

    if (activeCategoryId !== null) {
        items = items.filter(d => Number(d.category_id) === Number(activeCategoryId));
    }

    const sort = document.getElementById('sortSelect').value;
    switch (sort) {
        case '':
            break;
        case 'name-asc':
            items.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
            break;
        case 'name-desc':
            items.sort((a, b) => b.name.localeCompare(a.name, 'uk'));
            break;
        case 'price-asc':
            items.sort((a, b) => Number(a.price) - Number(b.price));
            break;
        case 'price-desc':
            items.sort((a, b) => Number(b.price) - Number(a.price));
            break;
    }

    renderMenu(items);
}

function renderMenu(items) {
    const grid = document.getElementById('menuGrid');

    if (!items.length) {
        grid.innerHTML = '<p class="menu-empty">Страв не знайдено</p>';
        return;
    }

    grid.innerHTML = '';
    items.forEach(dish => {
        const card = document.createElement('article');
        card.className = 'dish-card';
        card.innerHTML = `
            <img class="dish-card__image" src="${escapeHtml(getDishImageUrl(dish.image))}" alt="${escapeHtml(dish.name)}">
            <div class="dish-card__info">
                <h3 class="dish-card__name">${escapeHtml(dish.name)}</h3>
                <p class="dish-card__desc">${escapeHtml(dish.description)}</p>
            </div>
            <p class="dish-card__price">${formatPrice(dish.price)} грн</p>
        `;
        card.addEventListener('click', () => openDishModal(dish));
        grid.appendChild(card);
    });
}

function openDishModal(dish) {
    const body = document.getElementById('dishModalBody');
    body.innerHTML = `
        <img class="dish-modal__image" src="${escapeHtml(getDishImageUrl(dish.image))}" alt="${escapeHtml(dish.name)}">
        <h2 class="dish-modal__name">${escapeHtml(dish.name)}</h2>
        <p class="dish-modal__desc">${escapeHtml(dish.description)}</p>
        <p class="dish-modal__price">Ціна: <span>${formatPrice(dish.price)} грн</span></p>
        <button class="btn-gold" id="addToCartBtn">Додати в кошик</button>
    `;

    document.getElementById('addToCartBtn').addEventListener('click', () => {
        addToCart(dish);
        closeDishModal();
    });

    document.getElementById('dishModal').classList.add('open');
}

function closeDishModal() {
    document.getElementById('dishModal').classList.remove('open');
}

function handleProfileClick() {
    if (isLoggedIn(currentUser)) {
        fillProfileSidebar();
        openProfileSidebar();
    } else {
        openAuthModal('login');
    }
}

function handleCartClick() {
    if (isLoggedIn(currentUser)) {
        renderCartSidebar();
        openCartSidebar();
    } else {
        openAuthModal('login');
    }
}

function fillProfileSidebar() {
    document.getElementById('profileName').textContent = currentUser.name || '—';
    document.getElementById('profileEmail').textContent = currentUser.email || '—';
    document.getElementById('profileNumber').textContent = currentUser.number || '—';

    let role = currentUser.role || '—';
    if (role === 'Guest' || role === 'guest') role = 'Клієнт';
    document.getElementById('profileRole').textContent = role;
}

function openProfileSidebar() {
    document.getElementById('profileSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
}

function closeProfileSidebar() {
    document.getElementById('profileSidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function openCartSidebar() {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
}

function closeCartSidebar() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function closeAllSidebars() {
    closeProfileSidebar();
    closeCartSidebar();
}

function openAuthModal(type) {
    const modal = document.getElementById('authModal');
    const header = document.getElementById('authModalHeader');
    const main = document.getElementById('authModalMain');
    const errorEl = document.getElementById('authFormError');
    errorEl.textContent = '';

    if (type === 'login') {
        header.textContent = 'Вхід';
        main.innerHTML = `
            <input type="email" id="loginEmail" placeholder="Email">
            <input type="password" id="loginPassword" placeholder="Пароль">
            <div class="btns-block">
                <button class="btn-gold" id="loginSubmitBtn">Увійти</button>
                <button class="btn-outline" id="switchToRegBtn">Реєстрація</button>
            </div>
        `;
        document.getElementById('loginSubmitBtn').addEventListener('click', login);
        document.getElementById('switchToRegBtn').addEventListener('click', () => openAuthModal('registration'));
    } else {
        header.textContent = 'Реєстрація';
        main.innerHTML = `
            <input type="text" id="regName" placeholder="Ім'я">
            <input type="email" id="regEmail" placeholder="Email">
            <input type="tel" id="regNumber" placeholder="Номер телефону">
            <input type="password" id="regPassword" placeholder="Пароль (мін. 6 символів)">
            <div class="btns-block">
                <button class="btn-gold" id="regSubmitBtn">Зареєструватись</button>
                <button class="btn-outline" id="switchToLoginBtn">Увійти</button>
            </div>
        `;
        document.getElementById('regSubmitBtn').addEventListener('click', registration);
        document.getElementById('switchToLoginBtn').addEventListener('click', () => openAuthModal('login'));
    }

    modal.classList.add('open');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('open');
}

function showAuthError(message) {
    document.getElementById('authFormError').textContent = message;
}

function clearInputErrors() {
    document.querySelectorAll('#authModalMain input').forEach(i => i.classList.remove('input-error'));
}

async function login() {
    clearInputErrors();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !validateEmail(email)) {
        document.getElementById('loginEmail').classList.add('input-error');
        showAuthError('Введіть коректний email');
        return;
    }
    if (!validatePassword(password)) {
        document.getElementById('loginPassword').classList.add('input-error');
        showAuthError('Пароль має містити щонайменше 6 символів');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            currentUser = (await response.json()).user;
            closeAuthModal();
            redirectStaffIfNeeded(currentUser);
            return;
        }

        const data = await response.json();
        showAuthError(data.error || 'Невірний email або пароль');
    } catch {
        showAuthError('Помилка мережі');
    }
}

async function registration() {
    clearInputErrors();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const number = document.getElementById('regNumber').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!validateName(name)) {
        document.getElementById('regName').classList.add('input-error');
        showAuthError('Ім\'я має містити щонайменше 2 символи');
        return;
    }
    if (!validateEmail(email)) {
        document.getElementById('regEmail').classList.add('input-error');
        showAuthError('Введіть коректний email');
        return;
    }
    if (!validatePhone(number)) {
        document.getElementById('regNumber').classList.add('input-error');
        showAuthError('Введіть коректний номер телефону');
        return;
    }
    if (!validatePassword(password)) {
        document.getElementById('regPassword').classList.add('input-error');
        showAuthError('Пароль має містити щонайменше 6 символів');
        return;
    }

    try {
        const response = await fetch('/api/registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, number, password })
        });

        if (response.ok) {
            currentUser = (await response.json()).user;
            closeAuthModal();
            redirectStaffIfNeeded(currentUser);
            return;
        }

        const data = await response.json();
        showAuthError(data.error || 'Помилка реєстрації');
    } catch {
        showAuthError('Помилка мережі');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        closeAllSidebars();
    } catch {
        console.error('Помилка при виході');
    }
}

function openDeleteAccountModal() {
    document.getElementById('deleteAccountError').textContent = '';
    document.getElementById('deleteAccountModal').classList.add('open');
}

function closeDeleteAccountModal() {
    document.getElementById('deleteAccountModal').classList.remove('open');
    document.getElementById('deleteAccountError').textContent = '';
}

async function deleteAccount() {
    const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
    const errorEl = document.getElementById('deleteAccountError');

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Видалення...';
    errorEl.textContent = '';

    try {
        const response = await fetch('/api/account', { method: 'DELETE' });

        if (!response.ok) {
            const data = await response.json();
            errorEl.textContent = data.error || 'Помилка видалення акаунта';
            return;
        }

        currentUser = null;
        saveCart([]);
        closeDeleteAccountModal();
        closeAllSidebars();
    } catch {
        errorEl.textContent = 'Помилка мережі';
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Видалити';
    }
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(dish) {
    const cart = getCart();
    const existing = cart.find(item => item.id === dish.id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: dish.id,
            name: dish.name,
            price: dish.price,
            quantity: 1
        });
    }

    saveCart(cart);
}

function removeFromCart(dishId) {
    const cart = getCart().filter(item => item.id !== dishId);
    saveCart(cart);
    renderCartSidebar();
}

function updateCartBadge() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cartBadge');
    badge.textContent = total;
    badge.classList.toggle('visible', total > 0);
}

function renderCartSidebar() {
    const cart = getCart();
    const content = document.getElementById('cartContent');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const deliveryBlock = document.getElementById('deliveryTypeBlock');
    const paymentBlock = document.getElementById('paymentTypeBlock');

    if (!cart.length) {
        content.innerHTML = '<p class="cart-empty">Кошик порожній</p>';
        totalEl.textContent = '0';
        checkoutBtn.hidden = true;
        deliveryBlock.hidden = true;
        paymentBlock.hidden = true;
        return;
    }

    checkoutBtn.hidden = false;
    deliveryBlock.hidden = false;
    paymentBlock.hidden = false;

    let total = 0;
    content.innerHTML = '';

    cart.forEach(item => {
        total += Number(item.price) * item.quantity;
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div>
                <p class="cart-item__name">${escapeHtml(item.name)}</p>
                <p class="cart-item__meta">${item.quantity} × ${formatPrice(item.price)} грн</p>
            </div>
            <div style="display:flex;align-items:center">
                <span class="cart-item__price">${formatPrice(Number(item.price) * item.quantity)} грн</span>
                <button class="cart-item__remove" data-id="${item.id}" aria-label="Видалити">✕</button>
            </div>
        `;
        row.querySelector('.cart-item__remove').addEventListener('click', () => removeFromCart(item.id));
        content.appendChild(row);
    });

    totalEl.textContent = formatPrice(total);
}

function getSelectedDeliveryType() {
    const selected = document.querySelector('input[name="deliveryType"]:checked');
    return selected ? selected.value : 'pickup';
}

function getSelectedPaymentType() {
    const selected = document.querySelector('input[name="paymentType"]:checked');
    return selected ? selected.value : 'card';
}

async function handleCheckout() {
    const cart = getCart();
    if (!cart.length) return;

    if (!isLoggedIn(currentUser)) {
        closeCartSidebar();
        openAuthModal('login');
        return;
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Оформлення...';

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deliveryType: getSelectedDeliveryType(),
                paymentMethod: getSelectedPaymentType(),
                items: cart.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }))
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                closeCartSidebar();
                openAuthModal('login');
                return;
            }
            alert(data.error || 'Помилка оформлення замовлення');
            return;
        }

        saveCart([]);
        closeCartSidebar();
        renderCartSidebar();
        openReceiptModal(data.receipt);
    } catch {
        alert('Помилка мережі');
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Оформити';
    }
}

async function openOrderHistory() {
    if (!isLoggedIn(currentUser)) {
        openAuthModal('login');
        return;
    }

    closeProfileSidebar();
    const body = document.getElementById('ordersBody');
    body.innerHTML = '<p class="orders-loading">Завантаження...</p>';
    document.getElementById('ordersModal').classList.add('open');

    try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error();

        const orders = await response.json();
        renderOrderHistory(orders);
    } catch {
        body.innerHTML = '<p class="orders-empty">Не вдалося завантажити історію замовлень</p>';
    }
}

function renderOrderHistory(orders) {
    const body = document.getElementById('ordersBody');

    if (!orders.length) {
        body.innerHTML = '<p class="orders-empty">У вас ще немає замовлень</p>';
        return;
    }

    body.innerHTML = '';
    orders.forEach(order => {
        const date = new Date(order.createdAt);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'order-card';
        card.innerHTML = `
            <div class="order-card__top">
                <span class="order-card__number">№ ${escapeHtml(order.orderNumber)}</span>
                <span class="order-card__date">${date.toLocaleString('uk-UA')}</span>
            </div>
            <div class="order-card__meta">
                <span>${escapeHtml(order.deliveryLabel)}</span>
                <span>${order.itemsCount} поз.</span>
            </div>
            <div class="order-card__total">${formatPrice(order.total)} грн</div>
        `;
        card.addEventListener('click', () => viewOrderReceipt(order.orderId));
        body.appendChild(card);
    });
}

async function viewOrderReceipt(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) throw new Error();
        const receipt = await response.json();
        closeOrdersModal();
        openReceiptModal(receipt);
    } catch {
        alert('Не вдалося завантажити чек');
    }
}

function closeOrdersModal() {
    document.getElementById('ordersModal').classList.remove('open');
}

function openReceiptModal(receipt) {
    const body = document.getElementById('receiptBody');
    const date = new Date(receipt.createdAt);
    const dateStr = date.toLocaleString('uk-UA');

    const itemsHtml = receipt.items.map(item => `
        <div class="receipt-item">
            <span class="receipt-item__name">${escapeHtml(item.name)}</span>
            <span class="receipt-item__qty">${item.quantity} × ${formatPrice(item.price)} грн</span>
            <span class="receipt-item__sum">${formatPrice(item.lineTotal)} грн</span>
        </div>
    `).join('');

    body.innerHTML = `
        <div class="receipt-header">
            <p class="receipt-label">Розрахунковий чек</p>
            <p class="receipt-restaurant">${escapeHtml(receipt.restaurant?.legalName || receipt.restaurant?.name || 'Restoрант')}</p>
            <p class="receipt-number">№ ${escapeHtml(receipt.orderNumber)}</p>
            ${receipt.fiscalReceiptNumber ? `<p class="receipt-fiscal">Фіскальний № ${escapeHtml(receipt.fiscalReceiptNumber)}</p>` : ''}
        </div>

        <div class="receipt-section">
            <p class="receipt-section__title">Продавець</p>
            <p>${escapeHtml(receipt.restaurant?.name || 'Restoрант')}</p>
            <p>${escapeHtml(receipt.restaurant?.address || '')}</p>
            <p>ЄДРПОУ: ${escapeHtml(receipt.restaurant?.edrpou || '—')}</p>
            ${receipt.restaurant?.taxNumber ? `<p>ІПН: ${escapeHtml(receipt.restaurant.taxNumber)}</p>` : ''}
            ${receipt.restaurant?.phone ? `<p>Тел.: ${escapeHtml(receipt.restaurant.phone)}</p>` : ''}
            ${receipt.restaurant?.fiscalRegisterNumber ? `<p>РРО: ${escapeHtml(receipt.restaurant.fiscalRegisterNumber)}</p>` : ''}
        </div>

        <div class="receipt-section">
            <p class="receipt-section__title">Покупець</p>
            <p>${escapeHtml(receipt.customer.name)}</p>
            <p>${escapeHtml(receipt.customer.email)}</p>
            <p>${escapeHtml(receipt.customer.number)}</p>
        </div>

        <div class="receipt-section">
            <p class="receipt-section__title">Замовлення</p>
            <p>Тип доставки: ${escapeHtml(receipt.deliveryLabel || receipt.deliveryType)}</p>
            ${itemsHtml}
        </div>

        <div class="receipt-section">
            <p class="receipt-section__title">Персонал</p>
            <p>Касир: ${escapeHtml(receipt.cashierName || '—')}</p>
            <p>Кухар: ${escapeHtml(receipt.cookName || '—')}</p>
        </div>

        <div class="receipt-total">
            <span>Разом до сплати</span>
            <span>${formatPrice(receipt.total)} грн</span>
        </div>

        <p class="receipt-payment">Форма оплати: ${escapeHtml(receipt.paymentLabel || receipt.paymentMethod || 'картка')}</p>
        <p class="receipt-date">${dateStr}</p>
        <p class="receipt-legal">Чек сформовано відповідно до Закону України «Про застосування реєстраторів розрахункових операцій»</p>
    `;

    document.getElementById('receiptOkBtn').hidden = false;
    document.getElementById('receiptModal').classList.add('open');
}

function closeReceiptModal() {
    document.getElementById('receiptOkBtn').hidden = true;
    document.getElementById('receiptModal').classList.remove('open');
}

function formatPrice(price) {
    return Number(price).toFixed(0);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
