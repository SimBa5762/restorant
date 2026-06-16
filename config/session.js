const session = require('express-session');

module.exports = session({
    secret: 'super-secret-coffee-key', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
});