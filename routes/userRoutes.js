const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTPRecord = require('../models/OTPRecord');
const { enrichUsersWithOrderStats } = require('../utils/userOrderStats');

const findUserByAnyId = async (userId) => {
  const cleanId = String(userId || '').trim();
  if (!cleanId) return null;

  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    const byObjectId = await User.findById(cleanId).lean();
    if (byObjectId) return byObjectId;
  }

  return User.findOne({ $or: [{ userid: cleanId }, { id: cleanId }] }).lean();
};

const normalizeEmail = (value = '') => String(value || '').toLowerCase().trim();
const normalizeUsername = (value = '') => String(value || '').toLowerCase().trim();

// POST signup with OTP verification
router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || '');
    const otp = String(req.body?.otp || '').replace(/\D/g, '').trim();

    if (!name || !email || !username || !password || !otp) {
      return res.status(400).json({ message: 'Name, email, username, password and OTP are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or username already exists.' });
    }

    const otpRecord = await OTPRecord.findOne({ email }).sort({ createdAt: -1 });
    if (!otpRecord || String(otpRecord.otp || '').trim() !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

    const user = new User({
      name,
      email,
      username,
      password: hashedPassword,
      otp: undefined,
      otpExpires: undefined
    });

    await user.save();
    await OTPRecord.deleteMany({ email }).catch(() => null);

    if (typeof req.app?.get === 'function') {
      const io = req.app.get('io');
      if (io) io.emit('dashboardUpdate');
    }

    const { password: _password, otp: _otp, otpExpires: _otpExpires, ...safeUser } = user.toJSON();
    return res.status(201).json(safeUser);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Email or username already exists.' });
    }
    return res.status(500).json({ message: err?.message || 'Failed to create account.' });
  }
});

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    const enrichedUsers = await enrichUsersWithOrderStats(users);
    res.json(enrichedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await findUserByAnyId(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user by ID
router.delete('/:id', async (req, res) => {
  try {
    let user = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findByIdAndDelete(req.params.id);
    }
    if (!user) {
      user = await User.findOneAndDelete({ $or: [{ userid: req.params.id }, { id: req.params.id }] });
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Emit dashboard update event after user deletion
    if (typeof req.app.get === 'function') {
      const io = req.app.get('io');
      if (io) io.emit('dashboardUpdate');
    }
    res.json({ message: 'User deleted', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
