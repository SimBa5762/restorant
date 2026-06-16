/**
 * Перевірка сесії. Для захищених сторінок — редірект на головну.
 * Використання: await requireAuth() на сторінках, де потрібна авторизація.
 */
async function requireAuth() {
    try {
        const response = await fetch('/api/me');
        if (!response.ok) {
            window.location.href = '/';
            return null;
        }
        return await response.json();
    } catch {
        window.location.href = '/';
        return null;
    }
}

async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            return await response.json();
        }
    } catch {
        /* гість */
    }
    return null;
}

function isLoggedIn(user) {
    return user && user.id;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(number) {
    return /^[\d+\-()\s]{10,15}$/.test(number.trim());
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateName(name) {
    return name.trim().length >= 2;
}

const STAFF_HOME_PAGES = {
    admin: '/admin.html',
    cook: '/cook.html',
    courier: '/courier.html'
};

function redirectStaffIfNeeded(user) {
    const page = STAFF_HOME_PAGES[user?.role];
    if (page) {
        window.location.href = page;
        return true;
    }
    return false;
}

function getDishImageUrl(image) {
    if (!image) return '';
    if (image.startsWith('/') || image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    return `/images/dishes/${image}`;
}
