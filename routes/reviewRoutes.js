const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// POST /api/review
router.post('/', async (req, res) => {
  try {
    const review = new Review(req.body);
    await review.save();
    res.status(201).json({ message: 'Review saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save review' });
  }
});

module.exports = router;
