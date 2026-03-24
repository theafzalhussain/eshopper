const bcrypt = require('bcryptjs');
const { admin, firebaseAdminReady } = require('../config/firebase');
const Sentry = require('@sentry/node');
const { sendTransactionalEmail } = require('../src/utils/email');
const sendEmail = sendTransactionalEmail;
const mongoose = require('mongoose');
const OTPRecord = require('../models/OTPRecord');
const User = require('../models/User');

// FIREBASE AUTH SYNC
exports.authSync = async (req, res) => {
    // ...existing code from /api/auth-sync...
};

// SEND OTP
exports.sendOtp = async (req, res) => {
    // ...existing code from /api/send-otp...
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    // ...existing code from /api/reset-password...
};

// CHECK USERNAME
exports.checkUsername = async (req, res) => {
    // ...existing code from /api/check-username...
};

// LOGIN
exports.login = async (req, res) => {
    // ...existing code from /login...
};

// USER SIGNUP (with OTP)
exports.signup = async (req, res) => {
    // ...existing code from /user POST handler...
    // Emit dashboard update event after user signup
    if (typeof req.app.get === 'function') {
        const io = req.app.get('io');
        if (io) io.emit('dashboardUpdate');
    }
};
