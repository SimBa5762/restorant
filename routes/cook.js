const express = require('express');
const router = express.Router();
const adminService = require('../services/AdminService');
const { isCook } = require('../middlware/access');

router.get('/cook/orders', isCook, async (req, res) => {
    try {
        const orders = await adminService.getOrdersByFilter('preparing');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/cook/orders/:id/ready', isCook, async (req, res) => {
    try {
        const order = await adminService.markOrderReady(Number(req.params.id));
        res.json({ message: 'Замовлення готове', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
