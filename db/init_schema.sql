/*postgres*/

-- 1. Створюємо таблиці-довідники (без зовнішніх ключів)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS dish_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurant_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    edrpou VARCHAR(20) NOT NULL,
    tax_number VARCHAR(20),
    phone VARCHAR(50),
    fiscal_register_number VARCHAR(50)
);

-- 2. Створюємо таблиці, які посилаються на довідники
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    number VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS dishes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL, -- Краще використовувати NUMERIC для грошей замість INTEGER
    image TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE RESTRICT
);

-- 3. Створюємо замовлення
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    courier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status_id INTEGER NOT NULL REFERENCES statuses(id) ON DELETE RESTRICT,
    dish_type_id INTEGER NOT NULL REFERENCES dish_types(id) ON DELETE RESTRICT,
    delivery_type_id INTEGER NOT NULL REFERENCES delivery_types(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    receipt_number VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    restaurant_name VARCHAR(255) NOT NULL,
    restaurant_legal_name VARCHAR(255) NOT NULL,
    restaurant_address TEXT NOT NULL,
    restaurant_edrpou VARCHAR(20) NOT NULL,
    restaurant_tax_number VARCHAR(20),
    restaurant_phone VARCHAR(50),
    fiscal_register_number VARCHAR(50),
    delivery_type VARCHAR(50) NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    cashier_name VARCHAR(255),
    cook_name VARCHAR(255),
    fiscal_receipt_number VARCHAR(50)
);

-- 4. Зв'язуємо замовлення зі стравами (один чек — багато страв)
CREATE TABLE IF NOT EXISTS order_dishes (
    id SERIAL PRIMARY KEY,
    dish_id INTEGER NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_type_id INTEGER NOT NULL REFERENCES dish_types(id) ON DELETE RESTRICT
);