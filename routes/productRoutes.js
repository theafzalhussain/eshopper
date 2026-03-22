const express = require('express');
const router = express.Router();


const productController = require('../controllers/productController');

// Product CRUD routes
router.get('/list', productController.getAllProducts);
router.post('/add', productController.addProduct);
router.put('/update/:id', productController.updateProduct);
router.delete('/delete/:id', productController.deleteProduct);

module.exports = router;
