const db = require('./dbService');
const bcrypt = require('bcrypt');

class AuthService {
    async registerUser(name, email, number, password) {
        const existingUser = await db.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        if (existingUser.rows[0]) {
            throw new Error('Користувач з таким email вже існує');
        }

        const existingNumber = await db.query(
            `SELECT id FROM users WHERE number = $1`,
            [number]
        );
        if (existingNumber.rows[0]) {
            throw new Error('Користувач з таким номером вже існує');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const roleResult = await db.query(
            `SELECT id FROM roles WHERE name = 'client' LIMIT 1`
        );
        const clientRoleId = roleResult.rows[0]?.id || 1;

        const result = await db.query(
            `INSERT INTO users (fullname, email, number, password_hash, role_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [name, email, number, passwordHash, clientRoleId]
        );

        return { id: result.rows[0].id, name, email, number, role: 'client' };
    }

    async createStaffUser(name, email, number, password, role) {
        const allowedRoles = ['cook', 'courier'];
        if (!allowedRoles.includes(role)) {
            throw new Error('Дозволені лише ролі кухар або кур\'єр');
        }

        const existingUser = await db.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        if (existingUser.rows[0]) {
            throw new Error('Користувач з таким email вже існує');
        }

        const existingNumber = await db.query(
            `SELECT id FROM users WHERE number = $1`,
            [number]
        );
        if (existingNumber.rows[0]) {
            throw new Error('Користувач з таким номером вже існує');
        }

        const roleResult = await db.query(
            `SELECT id FROM roles WHERE name = $1 LIMIT 1`,
            [role]
        );
        const roleId = roleResult.rows[0]?.id;
        if (!roleId) {
            throw new Error('Роль не знайдено в БД');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (fullname, email, number, password_hash, role_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [name, email, number, passwordHash, roleId]
        );

        return { id: result.rows[0].id, name, email, number, role };
    }

    async getStaffUsers() {
        const result = await db.query(`
            SELECT u.id, u.fullname AS name, u.email, u.number, r.name AS role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name IN ('cook', 'courier')
            ORDER BY r.name, u.fullname
        `);
        return result.rows;
    }

    async getStaffUserById(id) {
        const result = await db.query(`
            SELECT u.id, u.fullname AS name, u.email, u.number, r.name AS role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1 AND r.name IN ('cook', 'courier')
        `, [id]);
        return result.rows[0];
    }

    async updateStaffUser(id, name, email, number, password, role) {
        const allowedRoles = ['cook', 'courier'];
        if (!allowedRoles.includes(role)) {
            throw new Error('Дозволені лише ролі кухар або кур\'єр');
        }

        const existing = await this.getStaffUserById(id);
        if (!existing) {
            throw new Error('Працівника не знайдено');
        }

        const emailCheck = await db.query(
            `SELECT id FROM users WHERE email = $1 AND id != $2`,
            [email, id]
        );
        if (emailCheck.rows[0]) {
            throw new Error('Користувач з таким email вже існує');
        }

        const numberCheck = await db.query(
            `SELECT id FROM users WHERE number = $1 AND id != $2`,
            [number, id]
        );
        if (numberCheck.rows[0]) {
            throw new Error('Користувач з таким номером вже існує');
        }

        const roleResult = await db.query(
            `SELECT id FROM roles WHERE name = $1 LIMIT 1`,
            [role]
        );
        const roleId = roleResult.rows[0]?.id;
        if (!roleId) {
            throw new Error('Роль не знайдено в БД');
        }

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            await db.query(
                `UPDATE users
                 SET fullname = $1, email = $2, number = $3, password_hash = $4, role_id = $5
                 WHERE id = $6`,
                [name, email, number, passwordHash, roleId, id]
            );
        } else {
            await db.query(
                `UPDATE users
                 SET fullname = $1, email = $2, number = $3, role_id = $4
                 WHERE id = $5`,
                [name, email, number, roleId, id]
            );
        }

        return this.getStaffUserById(id);
    }

    async deleteStaffUser(id) {
        const existing = await this.getStaffUserById(id);
        if (!existing) {
            throw new Error('Працівника не знайдено');
        }
        await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    }

    async loginUser(email, password) {
        const result = await db.query(`
            SELECT u.*, r.name AS role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.email = $1
        `, [email]);
        const user = result.rows[0];

        if (!user) throw new Error('Невірний email або пароль');

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) throw new Error('Невірний email або пароль');

        return {
            id: user.id,
            name: user.fullname,
            number: user.number,
            email: user.email,
            role: user.role_name
        };
    }

    async updateUser(id, name, email, number) {
        await db.query(
            `UPDATE users SET fullname = $1, email = $2, number = $3 WHERE id = $4`,
            [name, email, number, id]
        );
        return this.getUserById(id);
    }

    async deleteUser(id) {
        await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    }

    async getUserById(id) {
        const result = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
        return result.rows[0];
    }

    async getUserByEmail(email) {
        const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        return result.rows[0];
    }

    async getUserByNumber(number) {
        const result = await db.query(`SELECT * FROM users WHERE number = $1`, [number]);
        return result.rows[0];
    }
}

module.exports = new AuthService();
