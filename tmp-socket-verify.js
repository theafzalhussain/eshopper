/* TEMP — verifies the deployed socket auth: faking an identity must grant nothing. */
const { io } = require('socket.io-client');

const ENDPOINT = process.env.SOCKET_ENDPOINT || 'https://eshopper-qtgl.onrender.com';

const probe = (label, auth) => new Promise((resolve) => {
    const socket = io(ENDPOINT, { auth, transports: ['websocket', 'polling'], timeout: 20000, reconnection: false });
    const done = (msg) => { try { socket.close(); } catch (_) {} resolve(`${label.padEnd(34)} ${msg}`); };
    socket.on('connected', (p) => done(`rooms=${JSON.stringify(p.rooms ?? p.room)}  admin=${p.admin}`));
    socket.on('connect_error', (e) => done(`connect_error → ${e.message}`));
    setTimeout(() => done('TIMEOUT'), 25000);
});

(async () => {
    console.log(`endpoint: ${ENDPOINT}\n`);
    console.log(await probe("fake 'admin-dashboard'", { userId: 'admin-dashboard' }));
    console.log(await probe('random 24-hex id', { userId: '507f1f77bcf86cd799439011' }));
    console.log(await probe('junk id', { userId: '../../etc/passwd' }));
    console.log(await probe('guest (no auth)', {}));
    console.log(await probe('forged admin JWT', {
        userId: '507f1f77bcf86cd799439011',
        adminToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJyb2xlIjoiYWRtaW4iLCJpc0FkbWluIjp0cnVlfQ.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }));
    process.exit(0);
})();
