let pollTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireCourier();
    if (!user) return;

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    });

    await loadActiveOrder();
    pollTimer = setInterval(loadActiveOrder, 5000);
});

async function requireCourier() {
    try {
        const response = await fetch('/api/me');
        if (!response.ok) { window.location.href = '/'; return null; }
        const user = await response.json();
        if (user.role !== 'courier') { window.location.href = '/'; return null; }
        return user;
    } catch {
        window.location.href = '/';
        return null;
    }
}

async function loadActiveOrder() {
    const content = document.getElementById('courierContent');
    try {
        const response = await fetch('/api/courier/active');
        if (!response.ok) throw new Error();
        const order = await response.json();

        if (!order) {
            content.innerHTML = '<p class="staff-empty">Немає активного завдання. Очікуйте призначення від адміністратора.</p>';
            return;
        }

        const itemsHtml = order.items.map(i =>
            `<li>${escapeHtml(i.name)} × ${i.quantity}</li>`
        ).join('');

        content.innerHTML = `
            <article class="order-staff-card order-staff-card--static courier-task">
                <div class="order-staff-card__top">
                    <span class="order-staff-card__num">№ ${escapeHtml(order.orderNumber)}</span>
                    <span class="order-staff-card__status">Доставляється</span>
                </div>
                <div class="order-detail__section">
                    <p class="order-detail__label">Клієнт</p>
                    <p>${escapeHtml(order.customerName)}</p>
                    <a class="btn-outline order-call-btn" href="tel:${escapeHtml(order.customerPhone)}">📞 ${escapeHtml(order.customerPhone)}</a>
                </div>
                <div class="order-detail__section">
                    <p class="order-detail__label">Замовлення</p>
                    <ul class="order-detail__items">${itemsHtml}</ul>
                    <p>Отримання: ${escapeHtml(order.deliveryLabel)}</p>
                    <p>Оплата: ${escapeHtml(order.paymentLabel)}</p>
                    <p class="order-detail__total">Разом: ${Number(order.total).toFixed(0)} грн</p>
                </div>
                <button class="btn-gold" id="deliveredBtn" type="button">Замовлення доставлено</button>
            </article>
        `;

        document.getElementById('deliveredBtn').addEventListener('click', () => markDelivered(order.id));
    } catch {
        content.innerHTML = '<p class="staff-empty">Помилка завантаження</p>';
    }
}

async function markDelivered(orderId) {
    try {
        const response = await fetch(`/api/courier/orders/${orderId}/delivered`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        await loadActiveOrder();
    } catch (e) {
        alert(e.message || 'Помилка');
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
    if (pollTimer) clearInterval(pollTimer);
});
