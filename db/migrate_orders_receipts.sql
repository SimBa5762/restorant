-- Міграція для існуючої БД: тип доставки та чеки

CREATE TABLE IF NOT EXISTS delivery_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO delivery_types (name)
SELECT v FROM (VALUES ('pickup'), ('courier'), ('dine_in')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM delivery_types LIMIT 1);

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

INSERT INTO restaurant_info (name, legal_name, address, edrpou, tax_number, phone, fiscal_register_number)
SELECT 'Restoрант', 'ТОВ «Ресторан Смак»', 'м. Київ, вул. Хрещатик, 1', '12345678', '1234567890', '+380441234567', '4000123456'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_info LIMIT 1);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type_id INTEGER REFERENCES delivery_types(id);

UPDATE orders SET delivery_type_id = (SELECT id FROM delivery_types WHERE name = 'pickup' LIMIT 1)
WHERE delivery_type_id IS NULL;

ALTER TABLE orders ALTER COLUMN delivery_type_id SET NOT NULL;

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
