const express = require('express');
const router = express.Router();
const client = require('prom-client');

// Collect default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ timeout: 5000 });

const register = client.register;

router.get('/', async (req, res) => {
    try {
        res.setHeader('Content-Type', register.contentType);
        res.send(await register.metrics());
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = { router, client };
