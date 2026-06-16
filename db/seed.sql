-- Тестові дані для PostgreSQL (Render / cloud)

INSERT INTO roles (name) VALUES
('client'),
('admin'),
('cook'),
('courier');

INSERT INTO statuses (name) VALUES
('new'),
('preparing'),
('waiting_for_delivery'),
('delivering'),
('delivered');

INSERT INTO dish_types (name) VALUES
('hot_dish'),
('cold_dish'),
('beverage');

INSERT INTO delivery_types (name) VALUES
('pickup'),
('courier'),
('dine_in');

INSERT INTO restaurant_info (name, legal_name, address, edrpou, tax_number, phone, fiscal_register_number) VALUES
('Restoрант', 'ТОВ «Ресторан Смак»', 'м. Київ, вул. Хрещатик, 1', '12345678', '1234567890', '+380441234567', '4000123456');

INSERT INTO categories (name) VALUES
('Піца'),
('Супи'),
('Напої');

INSERT INTO menus (name) VALUES
('Основне меню'),
('Сезонне меню');

INSERT INTO users (fullname, email, number, password_hash, role_id) VALUES
('Іван Іванов', 'client@test.com', '+380501111111', 'hash_123', 1),
('Петро Петров', 'admin@test.com', '+380502222222', 'hash_123', 2),
('Василь Кухар', 'cook@test.com', '+380503333333', 'hash_123', 3),
('Олексій Швидкий', 'courier@test.com', '+380504444444', 'hash_123', 4);

INSERT INTO dishes (name, description, price, image, category_id, menu_id) VALUES
('Піца Маргарита', 'Класична піца з томатним соусом та моцарелою', 250.00, 'margherita.jpg', 1, 1),
('Борщ Український', 'Традиційний борщ з пампушками', 120.50, 'borscht.jpg', 2, 1),
('Лимонад Цитрус', 'Освіжаючий лимонад з м''ятою та лимоном', 65.00, 'lemonade.jpg', 3, 2);

INSERT INTO orders (user_id, courier_id, status_id, dish_type_id, delivery_type_id) VALUES
(1, NULL, 1, 1, 1),
(1, NULL, 2, 1, 2),
(1, 4, 3, 1, 3),
(1, 4, 4, 1, 1);

INSERT INTO order_dishes (dish_id, quantity, order_id, dish_type_id) VALUES
(1, 2, 1, 1),
(3, 1, 1, 3),
(2, 1, 2, 1),
(1, 1, 3, 1),
(2, 2, 4, 1),
(3, 2, 4, 3);
