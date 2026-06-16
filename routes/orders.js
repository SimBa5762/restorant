const express = require('express');
const router = express.Router();
const orderService = require('../services/OrderService');
const { isAuthenticated } = require('../middlware/access');

const VALID_DELIVERY_TYPES = ['pickup', 'courier', 'dine_in'];
const VALID_PAYMENT_METHODS = ['card', 'cash'];

router.post('/orders', isAuthenticated, async (req, res) => {
    try {
        const { items, deliveryType, paymentMethod } = req.body;

        if (!Array.isArray(items) || !items.length) {
            return res.status(400).json({ error: 'Кошик порожній' });
        }

        const cartItems = items.map(item => ({
            id: Number(item.id),
            quantity: Number(item.quantity)
        }));

        if (cartItems.some(item => !item.id || !item.quantity || item.quantity < 1)) {
            return res.status(400).json({ error: 'Некоректні дані замовлення' });
        }

        const type = deliveryType || 'pickup';
        if (!VALID_DELIVERY_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Невідомий тип доставки' });
        }

        const payment = paymentMethod || 'card';
        if (!VALID_PAYMENT_METHODS.includes(payment)) {
            return res.status(400).json({ error: 'Невідомий тип оплати' });
        }

        const receipt = await orderService.createOrder(req.session.user.id, cartItems, type, payment);
        res.status(201).json({ message: 'Замовлення оформлено', receipt });
    } catch (error) {
        console.error('[ORDER ERROR]:', error.message);
        res.status(400).json({ error: error.message || 'Помилка оформлення замовлення' });
    }
});

router.get('/orders', isAuthenticated, async (req, res) => {
    try {
        const orders = await orderService.getOrdersByUserId(req.session.user.id);
        res.json(orders);
    } catch (error) {
        console.error('[ORDER ERROR]:', error.message);
        res.status(500).json({ error: 'Помилка завантаження історії замовлень' });
    }
});

router.get('/orders/:id', isAuthenticated, async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const order = await orderService.getOrderById(orderId);

        if (!order || order.user_id !== req.session.user.id) {
            return res.status(404).json({ error: 'Замовлення не знайдено' });
        }

        const receipt = await orderService.getOrderReceipt(orderId);
        res.json(receipt);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

module.exports = router;
