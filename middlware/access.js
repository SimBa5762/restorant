const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user;
        next();
    } else {
        res.status(401).json({ message: 'Будь ласка, увійдіть у систему' });
    }
};

const isManager = (req, res, next) => {
    if (req.session.user?.role === 'manager') { 
        req.user = req.session.user;
        next();
    } else {
        res.status(403).json({ message: 'Доступ заборонено' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.session.user?.role === 'admin') {
        req.user = req.session.user; 
        next(); 
    } else {
        res.status(403).json({ message: 'Доступ заборонено. Тільки для адміністратора.' });
    }
};

const isCook = (req, res, next) => {
    if (req.session.user?.role === 'cook') {
        req.user = req.session.user;
        next();
    } else {
        res.status(403).json({ message: 'Доступ заборонено. Тільки для кухаря.' });
    }
};

const isCourier = (req, res, next) => {
    if (req.session.user?.role === 'courier') {
        req.user = req.session.user;
        next();
    } else {
        res.status(403).json({ message: 'Доступ заборонено. Тільки для кур\'єра.' });
    }
};


module.exports = { isAdmin, isManager, isAuthenticated, isCook, isCourier };