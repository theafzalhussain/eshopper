const express = require('express');
const router = express.Router();


const productController = require('../controllers/productController');
const { upload } = require('../middleware/upload');
const { cacheMiddleware } = require('../utils/cache');


// Product CRUD routes
router.get('/', cacheMiddleware(600), productController.getAllProducts); // Canonical product list
router.get('/list', cacheMiddleware(600), productController.getAllProducts); // Backward-compatible alias
router.get('/search', cacheMiddleware(120), productController.searchProducts); // Faceted search/pagination
router.get('/chatbot-metadata', cacheMiddleware(3600), productController.getChatbotMetadata); // Cache metadata for 1 hour
router.post('/add', upload, productController.addProduct);
router.put('/update/:id', upload, productController.updateProduct);
router.delete('/delete/:id', productController.deleteProduct);

module.exports = router;
