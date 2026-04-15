const express = require('express');
const router = express.Router();


const productController = require('../controllers/productController');
const { upload } = require('../middleware/upload');


// Product CRUD routes
router.get('/list', productController.getAllProducts);
router.post('/add', upload, productController.addProduct);
router.put('/update/:id', upload, productController.updateProduct);
router.delete('/delete/:id', productController.deleteProduct);

module.exports = router;
