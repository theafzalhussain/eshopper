#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eshopper';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to', MONGO_URI);
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({}).select('_id email name totalOrders membershipType').lean();
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- ${u._id} • ${u.email || u.name || 'n/a'} → totalOrders=${u.totalOrders || 0}, membershipType=${u.membershipType || 'Silver'}`);
    });
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
