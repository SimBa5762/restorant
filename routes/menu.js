const express = require('express');
const router = express.Router();
const menuService = require('../services/MenuService');

// GET /api/categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await menuService.getAllCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання категорій' });
    }
});

// GET /api/menus
router.get('/menus', async (req, res) => {
    try {
        const menus = await menuService.getAllMenus();
        res.json(menus);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання списку меню' });
    }
});

// GET /api/menu?menu_id=...
router.get('/menu', async (req, res) => {
    try {
        const menuId = req.query.menu_id ? Number(req.query.menu_id) : null;
        const menu = await menuService.getMenu(menuId);
        res.json(menu);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання меню' });
    }
});

// GET /api/search?value=...&menu_id=...
router.get('/search', async (req, res) => {
    try {
        const searchValue = req.query.value;
        if (!searchValue) {
            return res.status(400).json({ error: 'Пустий запит пошуку' });
        }

        const menuId = req.query.menu_id ? Number(req.query.menu_id) : null;
        const results = await menuService.searchMenu(searchValue, menuId);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Помилка пошуку' });
    }
});



module.exports = router;