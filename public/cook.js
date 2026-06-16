let pollTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireCook();
    if (!user) return;

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    });

    await loadOrders();
    pollTimer = setInterval(loadOrders, 5000);
});

async function requireCook() {
    try {
        const response = await fetch('/api/me');
        if (!response.ok) { window.location.href = '/'; return null; }
        const user = await response.json();
        if (user.role !== 'cook') { window.location.href = '/'; return null; }
        return user;
    } catch {
        window.location.href = '/';
        return null;
    }
}

async function loadOrders() {
    const content = document.getElementById('cookContent');
    try {
        const response = await fetch('/api/cook/orders');
        if (!response.ok) throw new Error();
        const orders = await response.json();

        if (!orders.length) {
            content.innerHTML = '<p class="staff-empty">Немає замовлень на кухні</p>';
            return;
        }

        content.innerHTML = '';
        orders.forEach(order => {
            const card = document.createElement('article');
            card.className = 'order-staff-card order-staff-card--static';
            const itemsHtml = order.items.map(i =>
                `<li>${escapeHtml(i.name)} × ${i.quantity}</li>`
            ).join('');

            card.innerHTML = `
                <div class="order-staff-card__top">
                    <span class="order-staff-card__num">№ ${escapeHtml(order.orderNumber)}</span>
                    <span class="order-staff-card__status">${escapeHtml(order.deliveryLabel)}</span>
                </div>
                <p class="order-staff-card__customer">${escapeHtml(order.customerName)}</p>
                <ul class="order-detail__items">${itemsHtml}</ul>
                <button class="btn-gold" type="button">Приготовлено</button>
            `;

            card.querySelector('button').addEventListener('click', () => markReady(order.id));
            content.appendChild(card);
        });
    } catch {
        content.innerHTML = '<p class="staff-empty">Помилка завантаження</p>';
    }
}

async function markReady(orderId) {
    try {
        const response = await fetch(`/api/cook/orders/${orderId}/ready`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        await loadOrders();
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
