const express = require('express');
const router = express.Router();

// Example authentication route
router.post('/login', (req, res) => {
    res.json({ message: 'Login endpoint working' });
});

module.exports = router;