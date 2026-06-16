const db = require('./dbService');

class MenuService {

    async getAllMenus() {
        const result = await db.query(`SELECT id, name FROM menus ORDER BY id`);
        return result.rows;
    }

    async getMenuById(id) {
        const result = await db.query(`SELECT * FROM menus WHERE id = $1`, [id]);
        return result.rows[0];
    }

    async addDish(dish) {
        const { name, description, price, image, category_id, menu_id } = dish;
        const result = await db.query(`
            INSERT INTO dishes (name, description, price, image, category_id, menu_id)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [name, description, price, image, category_id, menu_id]);
        return result.rows[0];
    }

    async updateDish(id, dish) {
        const { name, description, price, image, category_id, menu_id } = dish;
        const result = await db.query(`
            UPDATE dishes
            SET name = $1, description = $2, price = $3, image = $4, category_id = $5, menu_id = $6
            WHERE id = $7
            RETURNING *
        `, [name, description, price, image, category_id, menu_id, id]);
        return result.rows[0];
    }

    async deleteDish(id) {
        await db.query(`DELETE FROM dishes WHERE id = $1`, [id]);
    }

    async getDishById(id) {
        const result = await db.query(`SELECT * FROM dishes WHERE id = $1`, [id]);
        return result.rows[0];
    }

    async getAllCategories() {
        const result = await db.query(`SELECT id, name FROM categories`);
        return result.rows;
    }

    async getMenu(menuId = null) {
        if (menuId) {
            const result = await db.query(`
                SELECT id, name, description, price, image, category_id, menu_id
                FROM dishes
                WHERE menu_id = $1
            `, [menuId]);
            return result.rows;
        }

        const result = await db.query(`
            SELECT id, name, description, price, image, category_id, menu_id
            FROM dishes
        `);
        return result.rows;
    }

    async searchMenu(keyword, menuId = null) {
        const searchTerm = `%${keyword}%`;

        if (menuId) {
            const result = await db.query(`
                SELECT id, name, description, price, image, category_id, menu_id
                FROM dishes
                WHERE (name ILIKE $1 OR description ILIKE $2) AND menu_id = $3
            `, [searchTerm, searchTerm, menuId]);
            return result.rows;
        }

        const result = await db.query(`
            SELECT id, name, description, price, image, category_id, menu_id
            FROM dishes
            WHERE name ILIKE $1 OR description ILIKE $2
        `, [searchTerm, searchTerm]);
        return result.rows;
    }
}

module.exports = new MenuService();
