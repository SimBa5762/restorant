const express = require('express');
const router = express.Router();
const adminService = require('../services/AdminService');
const { isCourier } = require('../middlware/access');

router.get('/courier/active', isCourier, async (req, res) => {
    try {
        const order = await adminService.getCourierActiveOrder(req.session.user.id);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/courier/orders/:id/delivered', isCourier, async (req, res) => {
    try {
        const order = await adminService.markOrderDelivered(
            Number(req.params.id),
            req.session.user.id
        );
        res.json({ message: 'Замовлення доставлено', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
