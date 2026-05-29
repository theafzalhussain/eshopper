const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
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
