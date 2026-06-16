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

class OrderService {

    async createOrder(userId, cartItems, deliveryType = 'pickup', paymentMethod = 'card') {
        if (!cartItems?.length) {
            throw new Error('Кошик порожній');
        }

        if (!DELIVERY_LABELS[deliveryType]) {
            throw new Error('Невідомий тип доставки');
        }

        if (!PAYMENT_LABELS[paymentMethod]) {
            throw new Error('Невідомий тип оплати');
        }

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const userResult = await client.query(
                `SELECT id, fullname, email, number FROM users WHERE id = $1`,
                [userId]
            );
            const user = userResult.rows[0];
            if (!user) {
                throw new Error('Користувача не знайдено');
            }

            const deliveryResult = await client.query(
                `SELECT id FROM delivery_types WHERE name = $1 LIMIT 1`,
                [deliveryType]
            );
            const deliveryTypeId = deliveryResult.rows[0]?.id;
            if (!deliveryTypeId) {
                throw new Error('Тип доставки не налаштовано в БД');
            }

            const statusResult = await client.query(
                `SELECT id FROM statuses WHERE name = 'new' LIMIT 1`
            );
            const statusId = statusResult.rows[0]?.id || 1;

            const dishTypeResult = await client.query(
                `SELECT id FROM dish_types ORDER BY id LIMIT 1`
            );
            const defaultDishTypeId = dishTypeResult.rows[0]?.id;
            if (!defaultDishTypeId) {
                throw new Error('Типи страв не налаштовано в БД');
            }

            const orderResult = await client.query(`
                INSERT INTO orders (user_id, courier_id, status_id, delivery_type_id, dish_type_id)
                VALUES ($1, NULL, $2, $3, $4)
                RETURNING id, created_at
            `, [userId, statusId, deliveryTypeId, defaultDishTypeId]);

            const orderId = orderResult.rows[0].id;
            const orderCreatedAt = orderResult.rows[0].created_at;
            const receiptItems = [];

            for (const item of cartItems) {
                const dishResult = await client.query(
                    `SELECT id, name, price FROM dishes WHERE id = $1`,
                    [item.id]
                );
                const dish = dishResult.rows[0];
                if (!dish) {
                    throw new Error(`Страву з id ${item.id} не знайдено`);
                }

                await client.query(`
                    INSERT INTO order_dishes (dish_id, quantity, order_id, dish_type_id)
                    VALUES ($1, $2, $3, $4)
                `, [item.id, item.quantity, orderId, defaultDishTypeId]);

                const price = Number(dish.price);
                const quantity = Number(item.quantity);
                receiptItems.push({
                    name: dish.name,
                    quantity,
                    price,
                    lineTotal: price * quantity
                });
            }

            const subtotal = receiptItems.reduce((sum, item) => sum + item.lineTotal, 0);
            const total = subtotal;

            const restaurantResult = await client.query(
                `SELECT * FROM restaurant_info ORDER BY id LIMIT 1`
            );
            const restaurant = restaurantResult.rows[0] || {
                name: 'Restoрант',
                legal_name: 'ТОВ «Ресторан Смак»',
                address: 'м. Київ, вул. Хрещатик, 1',
                edrpou: '12345678',
                tax_number: '1234567890',
                phone: '+380441234567',
                fiscal_register_number: '4000123456'
            };

            const cookResult = await client.query(`
                SELECT u.fullname
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE r.name = 'cook'
                ORDER BY u.id
                LIMIT 1
            `);
            const cookName = cookResult.rows[0]?.fullname || 'Кухар ресторану';

            const adminResult = await client.query(`
                SELECT u.fullname
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE r.name = 'admin'
                ORDER BY u.id
                LIMIT 1
            `);
            const cashierName = adminResult.rows[0]?.fullname || 'Адміністратор';

            const receiptNumber = String(orderId).padStart(6, '0');
            const fiscalReceiptNumber = `${restaurant.fiscal_register_number || '4000123456'}-${receiptNumber}`;

            await client.query(`
                INSERT INTO receipts (
                    order_id, receipt_number, created_at,
                    customer_name, customer_email, customer_phone,
                    restaurant_name, restaurant_legal_name, restaurant_address,
                    restaurant_edrpou, restaurant_tax_number, restaurant_phone,
                    fiscal_register_number, delivery_type, items,
                    subtotal, total, payment_method,
                    cashier_name, cook_name, fiscal_receipt_number
                ) VALUES (
                    $1, $2, $3,
                    $4, $5, $6,
                    $7, $8, $9,
                    $10, $11, $12,
                    $13, $14, $15,
                    $16, $17, $18,
                    $19, $20, $21
                )
            `, [
                orderId,
                receiptNumber,
                orderCreatedAt,
                user.fullname,
                user.email,
                user.number,
                restaurant.name,
                restaurant.legal_name,
                restaurant.address,
                restaurant.edrpou,
                restaurant.tax_number,
                restaurant.phone,
                restaurant.fiscal_register_number,
                deliveryType,
                JSON.stringify(receiptItems),
                subtotal,
                total,
                paymentMethod,
                cashierName,
                cookName,
                fiscalReceiptNumber
            ]);

            await client.query('COMMIT');
            return this.getOrderReceipt(orderId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    mapReceiptRow(row) {
        const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;

        return {
            orderId: row.order_id,
            orderNumber: row.receipt_number,
            fiscalReceiptNumber: row.fiscal_receipt_number,
            createdAt: row.created_at,
            customer: {
                name: row.customer_name,
                email: row.customer_email,
                number: row.customer_phone
            },
            restaurant: {
                name: row.restaurant_name,
                legalName: row.restaurant_legal_name,
                address: row.restaurant_address,
                edrpou: row.restaurant_edrpou,
                taxNumber: row.restaurant_tax_number,
                phone: row.restaurant_phone,
                fiscalRegisterNumber: row.fiscal_register_number
            },
            deliveryType: row.delivery_type,
            deliveryLabel: DELIVERY_LABELS[row.delivery_type] || row.delivery_type,
            paymentMethod: row.payment_method,
            paymentLabel: PAYMENT_LABELS[row.payment_method] || row.payment_method,
            cashierName: row.cashier_name,
            cookName: row.cook_name,
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: Number(item.price),
                lineTotal: Number(item.lineTotal)
            })),
            subtotal: Number(row.subtotal),
            total: Number(row.total)
        };
    }

    async getOrderReceipt(orderId) {
        const result = await db.query(`
            SELECT * FROM receipts WHERE order_id = $1
        `, [orderId]);

        const row = result.rows[0];
        if (!row) {
            throw new Error('Чек не знайдено');
        }

        return this.mapReceiptRow(row);
    }

    async getOrdersByUserId(userId) {
        const result = await db.query(`
            SELECT
                r.order_id,
                r.receipt_number,
                r.created_at,
                r.delivery_type,
                r.total,
                r.items
            FROM receipts r
            JOIN orders o ON o.id = r.order_id
            WHERE o.user_id = $1
            ORDER BY r.created_at DESC
        `, [userId]);

        return result.rows.map(row => {
            const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
            return {
                orderId: row.order_id,
                orderNumber: row.receipt_number,
                createdAt: row.created_at,
                deliveryType: row.delivery_type,
                deliveryLabel: DELIVERY_LABELS[row.delivery_type] || row.delivery_type,
                total: Number(row.total),
                itemsCount: items.reduce((sum, item) => sum + item.quantity, 0)
            };
        });
    }

    async getOrderById(id) {
        const result = await db.query(`SELECT * FROM orders WHERE id = $1`, [id]);
        return result.rows[0];
    }
}

module.exports = new OrderService();
