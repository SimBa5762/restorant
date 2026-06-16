const db = require('./dbService');

const DELIVERY_LABELS = {
    pickup: 'Самовивіз',
    courier: 'Кур\'єром',
    dine_in: 'В ресторані'
};

const PAYMENT_LABELS = {
    card: 'Безготівковий розрахунок',
    cash: 'Готівка'
};

const STATUS_LABELS = {
    new: 'Нове',
    preparing: 'Готується',
    waiting_for_delivery: 'Очікує доставки',
    delivering: 'Доставляється',
    delivered: 'Доставлено'
};

class AdminService {

    mapOrderRow(row) {
        const items = row.items
            ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items)
            : [];

        return {
            id: row.id,
            orderNumber: row.receipt_number || String(row.id).padStart(6, '0'),
            status: row.status_name,
            statusLabel: STATUS_LABELS[row.status_name] || row.status_name,
            createdAt: row.created_at,
            customerName: row.customer_name || row.fullname,
            customerPhone: row.customer_phone || row.number,
            customerEmail: row.customer_email || row.email,
            deliveryType: row.delivery_type,
            deliveryLabel: DELIVERY_LABELS[row.delivery_type] || row.delivery_type,
            paymentMethod: row.payment_method,
            paymentLabel: PAYMENT_LABELS[row.payment_method] || row.payment_method,
            total: row.total != null ? Number(row.total) : null,
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: Number(item.price),
                lineTotal: Number(item.lineTotal)
            })),
            courierId: row.courier_id,
            courierName: row.courier_name || null
        };
    }

    baseOrderQuery() {
        return `
            SELECT
                o.id,
                o.created_at,
                o.courier_id,
                s.name AS status_name,
                u.fullname,
                u.number,
                u.email,
                r.receipt_number,
                r.customer_name,
                r.customer_phone,
                r.customer_email,
                r.delivery_type,
                r.payment_method,
                r.total,
                r.items,
                c.fullname AS courier_name
            FROM orders o
            JOIN statuses s ON o.status_id = s.id
            JOIN users u ON o.user_id = u.id
            LEFT JOIN receipts r ON r.order_id = o.id
            LEFT JOIN users c ON o.courier_id = c.id
        `;
    }

    async getStatusId(name) {
        const result = await db.query(
            `SELECT id FROM statuses WHERE name = $1 LIMIT 1`,
            [name]
        );
        return result.rows[0]?.id;
    }

    async getOrdersByFilter(filter) {
        let where = '';
        const params = [];

        switch (filter) {
            case 'new':
                where = `WHERE s.name = 'new'`;
                break;
            case 'preparing':
                where = `WHERE s.name = 'preparing'`;
                break;
            case 'waiting_for_delivery':
                where = `WHERE s.name = 'waiting_for_delivery'`;
                break;
            case 'delivering':
                where = `WHERE s.name = 'delivering'`;
                break;
            case 'delivered_today':
                where = `WHERE s.name = 'delivered' AND COALESCE(o.delivered_at, o.created_at)::date = CURRENT_DATE`;
                break;
            default:
                where = `WHERE s.name = 'new'`;
        }

        const result = await db.query(`
            ${this.baseOrderQuery()}
            ${where}
            ORDER BY o.created_at DESC
        `, params);

        return result.rows.map(row => this.mapOrderRow(row));
    }

    async getOrderDetail(orderId) {
        const result = await db.query(`
            ${this.baseOrderQuery()}
            WHERE o.id = $1
        `, [orderId]);

        const row = result.rows[0];
        if (!row) throw new Error('Замовлення не знайдено');
        return this.mapOrderRow(row);
    }

    async pollUpdates(lastSeenId = 0) {
        const countsResult = await db.query(`
            SELECT s.name, COUNT(*)::int AS count
            FROM orders o
            JOIN statuses s ON o.status_id = s.id
            GROUP BY s.name
        `);

        const counts = {
            new: 0,
            preparing: 0,
            waiting_for_delivery: 0,
            delivering: 0,
            delivered_today: 0
        };

        countsResult.rows.forEach(row => {
            if (Object.prototype.hasOwnProperty.call(counts, row.name)) {
                counts[row.name] = row.count;
            }
        });

        const deliveredToday = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM orders o
            JOIN statuses s ON o.status_id = s.id
            WHERE s.name = 'delivered'
              AND COALESCE(o.delivered_at, o.created_at)::date = CURRENT_DATE
        `);
        counts.delivered_today = deliveredToday.rows[0]?.count || 0;

        const latestResult = await db.query(`
            SELECT COALESCE(MAX(id), 0)::int AS latest_id FROM orders
        `);
        const latestId = latestResult.rows[0]?.latest_id || 0;

        const newOrdersResult = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM orders o
            JOIN statuses s ON o.status_id = s.id
            WHERE s.name = 'new' AND o.id > $1
        `, [lastSeenId]);

        return {
            latestId,
            hasNew: (newOrdersResult.rows[0]?.count || 0) > 0,
            newCount: newOrdersResult.rows[0]?.count || 0,
            counts,
            waitingBadge: counts.waiting_for_delivery
        };
    }

    async processOrder(orderId) {
        const preparingId = await this.getStatusId('preparing');
        const result = await db.query(`
            UPDATE orders o
            SET status_id = $1
            FROM statuses s
            WHERE o.id = $2 AND o.status_id = s.id AND s.name = 'new'
            RETURNING o.id
        `, [preparingId, orderId]);

        if (!result.rows[0]) {
            throw new Error('Замовлення не знайдено або вже оброблено');
        }

        return this.getOrderDetail(orderId);
    }

    async markOrderReady(orderId) {
        const statusId = await this.getStatusId('waiting_for_delivery');
        const result = await db.query(`
            UPDATE orders o
            SET status_id = $1
            FROM statuses s
            WHERE o.id = $2 AND o.status_id = s.id AND s.name = 'preparing'
            RETURNING o.id
        `, [statusId, orderId]);

        if (!result.rows[0]) {
            throw new Error('Замовлення не знайдено або не готується');
        }

        return this.getOrderDetail(orderId);
    }

    async getFreeCouriers() {
        const result = await db.query(`
            SELECT u.id, u.fullname, u.number
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name = 'courier'
            AND u.id NOT IN (
                SELECT o.courier_id
                FROM orders o
                JOIN statuses s ON o.status_id = s.id
                WHERE s.name = 'delivering' AND o.courier_id IS NOT NULL
            )
            ORDER BY u.fullname
        `);
        return result.rows;
    }

    async assignCourier(orderId, courierId) {
        const deliveringId = await this.getStatusId('delivering');
        if (!deliveringId) {
            throw new Error('Статус delivering не налаштовано в БД');
        }

        const courierCheck = await db.query(`
            SELECT u.id FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1 AND r.name = 'courier'
        `, [courierId]);

        if (!courierCheck.rows[0]) {
            throw new Error('Кур\'єра не знайдено');
        }

        const result = await db.query(`
            UPDATE orders o
            SET courier_id = $1, status_id = $2
            FROM statuses s
            WHERE o.id = $3 AND o.status_id = s.id AND s.name = 'waiting_for_delivery'
            RETURNING o.id
        `, [courierId, deliveringId, orderId]);

        if (!result.rows[0]) {
            throw new Error('Замовлення не знайдено або не очікує доставки');
        }

        return this.getOrderDetail(orderId);
    }

    async getCourierActiveOrder(courierId) {
        const result = await db.query(`
            ${this.baseOrderQuery()}
            WHERE o.courier_id = $1 AND s.name = 'delivering'
            ORDER BY o.created_at ASC
            LIMIT 1
        `, [courierId]);

        return result.rows[0] ? this.mapOrderRow(result.rows[0]) : null;
    }

    async markOrderDelivered(orderId, courierId) {
        const deliveredId = await this.getStatusId('delivered');
        const result = await db.query(`
            UPDATE orders o
            SET status_id = $1, delivered_at = CURRENT_TIMESTAMP
            FROM statuses s
            WHERE o.id = $2 AND o.courier_id = $3 AND o.status_id = s.id AND s.name = 'delivering'
            RETURNING o.id
        `, [deliveredId, orderId, courierId]);

        if (!result.rows[0]) {
            throw new Error('Замовлення не знайдено або не доставляється вами');
        }

        return this.getOrderDetail(orderId);
    }
}

module.exports = new AdminService();
