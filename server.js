require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('./config/session');

// Імпорт наших роутерів
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const cookRoutes = require('./routes/cook');
const courierRoutes = require('./routes/courier');

const app = express();
const port = 3000;

// Мідлвери
app.use(express.json());
app.use(session); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Налаштування сесій для ендпоінту /api/me


// Підключення маршрутів
// Усі запити, що починаються з /api, будуть перенаправлені у відповідні файли
app.use('/api', authRoutes);
app.use('/api', menuRoutes);
app.use('/api', orderRoutes);
app.use('/api', adminRoutes);
app.use('/api', cookRoutes);
app.use('/api', courierRoutes);

app.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});