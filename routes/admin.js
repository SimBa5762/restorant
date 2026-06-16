const express = require('express');
const router = express.Router();
const adminService = require('../services/AdminService');
const menuService = require('../services/MenuService');
const authService = require('../services/AuthService');
const { deleteDishImage } = require('../services/ImageService');
const upload = require('../config/upload');
const { isAdmin } = require('../middlware/access');

function handleUpload(req, res, next) {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Помилка завантаження файлу' });
        }
        next();
    });
}

const VALID_FILTERS = ['new', 'preparing', 'waiting_for_delivery', 'delivering', 'delivered_today'];

router.get('/admin/orders/poll', isAdmin, async (req, res) => {
    try {
        const lastSeenId = Number(req.query.lastSeenId) || 0;
        const data = await adminService.pollUpdates(lastSeenId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/admin/orders', isAdmin, async (req, res) => {
    try {
        const filter = VALID_FILTERS.includes(req.query.filter) ? req.query.filter : 'new';
        const orders = await adminService.getOrdersByFilter(filter);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/admin/orders/:id', isAdmin, async (req, res) => {
    try {
        const order = await adminService.getOrderDetail(Number(req.params.id));
        res.json(order);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

router.post('/admin/orders/:id/process', isAdmin, async (req, res) => {
    try {
        const order = await adminService.processOrder(Number(req.params.id));
        res.json({ message: 'Замовлення відправлено на кухню', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/admin/orders/:id/assign-courier', isAdmin, async (req, res) => {
    try {
        const { courierId } = req.body;
        if (!courierId) {
            return res.status(400).json({ error: 'Оберіть кур\'єра' });
        }
        const order = await adminService.assignCourier(Number(req.params.id), Number(courierId));
        res.json({ message: 'Кур\'єра призначено', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/admin/couriers', isAdmin, async (req, res) => {
    try {
        const couriers = await adminService.getFreeCouriers();
        res.json(couriers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/admin/dishes', isAdmin, async (req, res) => {
    try {
        const dishes = await menuService.getMenu();
        res.json(dishes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/admin/dishes', isAdmin, handleUpload, async (req, res) => {
    try {
        const { name, description, price, category_id, menu_id } = req.body;

        if (!name || !description || price == null || !category_id || !menu_id) {
            if (req.file) deleteDishImage(`/images/dishes/${req.file.filename}`);
            return res.status(400).json({ error: 'Заповніть усі поля страви' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Завантажте фото страви' });
        }

        const imagePath = `/images/dishes/${req.file.filename}`;
        const dish = await menuService.addDish({
            name,
            description,
            price: Number(price),
            image: imagePath,
            category_id: Number(category_id),
            menu_id: Number(menu_id)
        });
        res.status(201).json(dish);
    } catch (error) {
        if (req.file) deleteDishImage(`/images/dishes/${req.file.filename}`);
        res.status(400).json({ error: error.message });
    }
});

router.put('/admin/dishes/:id', isAdmin, handleUpload, async (req, res) => {
    try {
        const dishId = Number(req.params.id);
        const existing = await menuService.getDishById(dishId);
        if (!existing) {
            if (req.file) deleteDishImage(`/images/dishes/${req.file.filename}`);
            return res.status(404).json({ error: 'Страву не знайдено' });
        }

        const { name, description, price, category_id, menu_id } = req.body;
        if (!name || !description || price == null || !category_id || !menu_id) {
            if (req.file) deleteDishImage(`/images/dishes/${req.file.filename}`);
            return res.status(400).json({ error: 'Заповніть усі поля страви' });
        }

        let imagePath = existing.image;
        if (req.file) {
            imagePath = `/images/dishes/${req.file.filename}`;
            deleteDishImage(existing.image);
        }

        const dish = await menuService.updateDish(dishId, {
            name,
            description,
            price: Number(price),
            image: imagePath,
            category_id: Number(category_id),
            menu_id: Number(menu_id)
        });
        res.json(dish);
    } catch (error) {
        if (req.file) deleteDishImage(`/images/dishes/${req.file.filename}`);
        res.status(400).json({ error: error.message });
    }
});

router.delete('/admin/dishes/:id', isAdmin, async (req, res) => {
    try {
        const dish = await menuService.getDishById(Number(req.params.id));
        if (dish) deleteDishImage(dish.image);
        await menuService.deleteDish(Number(req.params.id));
        res.json({ message: 'Страву видалено' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/admin/staff', isAdmin, async (req, res) => {
    try {
        const staff = await authService.getStaffUsers();
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/admin/staff', isAdmin, async (req, res) => {
    try {
        const { name, email, number, password, role } = req.body;

        if (!name || !email || !number || !password || !role) {
            return res.status(400).json({ error: 'Заповніть усі поля' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль має містити щонайменше 6 символів' });
        }

        const user = await authService.createStaffUser(
            name.trim(),
            email.trim(),
            number.trim(),
            password,
            role
        );
        res.status(201).json({ message: 'Користувача додано', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/admin/staff/:id', isAdmin, async (req, res) => {
    try {
        const { name, email, number, password, role } = req.body;
        const staffId = Number(req.params.id);

        if (!name || !email || !number || !role) {
            return res.status(400).json({ error: 'Заповніть усі обов\'язкові поля' });
        }
        if (password && password.length < 6) {
            return res.status(400).json({ error: 'Пароль має містити щонайменше 6 символів' });
        }

        const user = await authService.updateStaffUser(
            staffId,
            name.trim(),
            email.trim(),
            number.trim(),
            password || null,
            role
        );
        res.json({ message: 'Дані працівника оновлено', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/admin/staff/:id', isAdmin, async (req, res) => {
    try {
        await authService.deleteStaffUser(Number(req.params.id));
        res.json({ message: 'Працівника видалено' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
