require('dotenv').config();
const { Pool } = require('pg');

// Pool автоматически управляет соединениями с удаленным сервером
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Проверка подключения
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Ошибка подключения к облачной БД:', err.stack);
  } else {
    console.log('Успешно подключено к облачному PostgreSQL! Время сервера:', res.rows[0].now);
  }
});

module.exports = pool;
