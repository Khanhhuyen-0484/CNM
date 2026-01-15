const express = require('express');
const router = express.Router();
const db = require('../db/mysql');

/* READ */
router.get('/', async(req, res) => {
    const [rows] = await db.query('SELECT * FROM products');
    res.render('products', { products: rows });
});

/* CREATE */
router.post('/add', async(req, res) => {
    const { name, price, quantity } = req.body;
    await db.query(
        'INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)', [name, price, quantity]
    );
    res.redirect('/');
});

/* UPDATE - FORM */
router.get('/edit/:id', async(req, res) => {
    const [rows] = await db.query(
        'SELECT * FROM products WHERE id = ?', [req.params.id]
    );
    res.render('edit-product', { product: rows[0] });
});

/* UPDATE - SUBMIT */
router.post('/edit/:id', async(req, res) => {
    const { name, price, quantity } = req.body;
    await db.query(
        'UPDATE products SET name=?, price=?, quantity=? WHERE id=?', [name, price, quantity, req.params.id]
    );
    res.redirect('/');
});

/* DELETE */
router.get('/delete/:id', async(req, res) => {
    await db.query(
        'DELETE FROM products WHERE id = ?', [req.params.id]
    );
    res.redirect('/');
});

module.exports = router;