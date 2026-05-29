const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { enrichUsersWithOrderStats } = require('../utils/userOrderStats');

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

// DELETE user by ID
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
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
