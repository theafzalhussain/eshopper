/**
 * SERVER.JS INTEGRATION GUIDE
 * 
 * Copy and paste these sections into your server.js file to enable:
 * ✅ Auto-refund scheduler
 * ✅ Cron jobs
 * ✅ Real-time socket updates
 */

// ════════════════════════════════════════════════════════════════════════════
// STEP 1: ADD THESE IMPORTS AT THE TOP OF server.js
// ════════════════════════════════════════════════════════════════════════════

const { initializeCronJobs, stopCronJobs } = require('./utils/cronJobs');

// ════════════════════════════════════════════════════════════════════════════
// STEP 2: INITIALIZE CRON JOBS AFTER SERVER START
// ════════════════════════════════════════════════════════════════════════════

// Find this section in your server.js where you start listening:
// const PORT = process.env.PORT || 5000;
// 
// Replace with or add:

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Socket.IO setup (if not already done)
const io = require('socket.io')(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible to routes
app.set('io', io);

// Socket connection handler
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    // Add other socket event handlers here
});

// Initialize cron jobs AFTER database connection
mongoose.connection.once('open', () => {
    console.log('✅ Database connected');
    initializeCronJobs(io);
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// ════════════════════════════════════════════════════════════════════════════
// STEP 3: ADD GRACEFUL SHUTDOWN HANDLER
// ════════════════════════════════════════════════════════════════════════════

// Add this at the end of your server.js file:

process.on('SIGINT', () => {
    console.log('\n⛔ Shutting down server...');
    
    // Stop cron jobs
    stopCronJobs();
    
    // Close database connections
    mongoose.connection.close();
    
    // Close server
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n⛔ SIGTERM signal received');
    
    stopCronJobs();
    mongoose.connection.close();
    
    server.close(() => {
        console.log('✅ Server terminated gracefully');
        process.exit(0);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// STEP 4: OPTIONAL - ADD MANUAL TRIGGER ENDPOINT FOR TESTING
// ════════════════════════════════════════════════════════════════════════════

// Add this route anywhere in your routes setup:

app.post('/api/admin/test/trigger-refunds', async (req, res) => {
    try {
        // Security check
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { processAutoRefunds } = require('./utils/autoRefundScheduler');
        const io = req.app.get('io');
        
        const result = await processAutoRefunds(io);

        return res.json({
            success: true,
            message: 'Auto-refund triggered manually',
            result
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════
// STEP 5: CHECK .env FILE HAS THESE VARIABLES
// ════════════════════════════════════════════════════════════════════════════

/*
# Add to .env file:

# Razorpay Configuration
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Admin Secret
ADMIN_SECRET=your_admin_secret_key

# Email Configuration  
SUPPORT_EMAIL=support@eshopperr.me
SUPPORT_PHONE=919999999999

# Brand URL
BRAND_SITE_URL=https://eshopperr.me
*/

// ════════════════════════════════════════════════════════════════════════════
// STEP 6: INSTALL REQUIRED PACKAGE
// ════════════════════════════════════════════════════════════════════════════

/*
Run in terminal:
npm install node-cron
*/

// ════════════════════════════════════════════════════════════════════════════
// VERIFICATION - STARTUP LOGS
// ════════════════════════════════════════════════════════════════════════════

/*
After setup, you should see these logs on server startup:

✅ Database connected
🕐 Initializing cron jobs...
✅ Auto-refund scheduler initialized (runs every 5 minutes)
✅ Daily refund report initialized (runs at 2 AM)
✅ Pending refunds monitor initialized (runs every hour)
✨ All cron jobs initialized successfully!
🚀 Server running on port 5000

This confirms everything is working!
*/

// ════════════════════════════════════════════════════════════════════════════
// COMPLETE EXAMPLE server.js STRUCTURE
// ════════════════════════════════════════════════════════════════════════════

/*
// server.js

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

// ✅ Import cron jobs
const { initializeCronJobs, stopCronJobs } = require('./utils/cronJobs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Routes
app.use(require('./routes/orderRoutes'));
app.use(require('./routes/productRoutes'));
// ... other routes

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible to routes
app.set('io', io);

// Socket connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
});

// Initialize cron jobs after DB connection
mongoose.connection.once('open', () => {
    console.log('✅ Database connected');
    initializeCronJobs(io); // ✅ Initialize cron jobs
});

// Server startup
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⛔ Shutting down...');
    stopCronJobs(); // ✅ Stop cron jobs
    mongoose.connection.close();
    server.close(() => process.exit(0));
});

module.exports = server;
*/
