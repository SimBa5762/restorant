const express = require('express');
const router = express.Router();
const authService = require('../services/AuthService');
const { isAuthenticated } = require('../middlware/access');

router.post('/registration', async (req, res) => {
    try {
        const { name, email, number, password } = req.body;
        // Тепер порядок правильний!
        const user = await authService.registerUser(name, email, number, password);
        
        req.session.user = user; 
        res.status(201).json({ message: 'Реєстрація успішна', user });
    } catch (error) {
        // ДОДАНО ЛОГУВАННЯ: Тепер ти бачитимеш причину в терміналі Node.js!
        console.error('[REGISTRATION ERROR]:', error.message); 
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authService.loginUser(email, password);
        
        // Зберігаємо дані юзера в сесію
        req.session.user = user;
        res.status(200).json({ message: 'Вхід успішний', user });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// GET /api/me (Перевірка, чи авторизований юзер)
router.get('/me', (req, res) => {
    if (req.session && req.session.user) {
        // Якщо сесія існує, віддаємо дані користувача
        res.status(200).json(req.session.user);
    } else {
        // Якщо ні — повертаємо помилку доступу (фронтенд відкриє модалку логіну)
        res.status(401).json({ error: 'Не авторизовано' });
    }
});

// POST /api/logout (Корисно мати для виходу з профілю)
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.status(200).json({ message: 'Вихід успішний' });
});

router.delete('/account', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        await authService.deleteUser(userId);

        req.session.destroy((err) => {
            if (err) {
                console.error('[DELETE ACCOUNT ERROR]:', err.message);
                return res.status(500).json({ error: 'Акаунт видалено, але не вдалося завершити сесію' });
            }
            res.status(200).json({ message: 'Акаунт видалено' });
        });
    } catch (error) {
        console.error('[DELETE ACCOUNT ERROR]:', error.message);
        res.status(400).json({ error: error.message || 'Помилка видалення акаунта' });
    }
});

module.exports = router;