const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Routes...
router.post('/signup', authController.signup);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/check-username', authController.checkUsername);
router.post('/login', authController.login);

module.exports = router;