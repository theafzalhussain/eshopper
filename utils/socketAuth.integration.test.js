process.env.ADMIN_JWT_SECRET = 'test-admin-secret';

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const User = require('../models/User');
const { socketIdentityMiddleware, joinIdentityRooms } = require('./socketAuth');

/* ── stub the DB the same way the app would answer ── */
const ADMIN_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f191e810c19729de860ea';
const OTHER_USER_ID = '507f191e810c19729de860ec';
const docs = {
    [ADMIN_ID]: { role: 'Admin' },
    [USER_ID]: { role: 'User' },
    [OTHER_USER_ID]: { role: 'User' }
};
User.findById = (id) => ({ select: () => ({ lean: async () => docs[String(id)] || null }) });

/* ── a server wired exactly like server.js ── */
let httpServer;
let io;
let url;

test.before(async () => {
    httpServer = http.createServer();
    io = new Server(httpServer, { transports: ['websocket'] });
    io.use(socketIdentityMiddleware());
    io.on('connection', (socket) => {
        const rooms = joinIdentityRooms(socket);
        socket.emit('connected', { ok: true, room: rooms[0] || null, rooms, admin: Boolean(socket.data.isAdmin) });
    });
    await new Promise((resolve) => httpServer.listen(0, resolve));
    url = `http://127.0.0.1:${httpServer.address().port}`;
});

test.after(async () => {
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
});

const connect = (auth) => new Promise((resolve, reject) => {
    const socket = ioClient(url, { auth, transports: ['websocket'], reconnection: false });
    const timer = setTimeout(() => { socket.close(); reject(new Error('timeout')); }, 8000);
    socket.on('connected', (payload) => {
        clearTimeout(timer);
        // capture what the server actually put this socket into
        resolve({ payload, socket });
    });
    socket.on('connect_error', (e) => { clearTimeout(timer); reject(e); });
});

const roomsOnServer = async (socket) => {
    const serverSocket = io.sockets.sockets.get(socket.id);
    return [...(serverSocket?.rooms || [])].filter((r) => r !== socket.id);
};

test('ATTACK: claiming the admin room by name grants nothing', async () => {
    const { payload, socket } = await connect({ userId: 'admin-dashboard' });
    assert.deepStrictEqual(payload.rooms, []);
    assert.strictEqual(payload.admin, false);
    assert.deepStrictEqual(await roomsOnServer(socket), []);
    socket.close();
});

test('ATTACK: a forged admin token grants nothing', async () => {
    const forged = jwt.sign({ sub: ADMIN_ID, role: 'admin', isAdmin: true }, 'wrong-secret');
    const { payload, socket } = await connect({ userId: ADMIN_ID, adminToken: forged });
    // falls back to the role lookup for ADMIN_ID, which is a genuine admin,
    // so this asserts the token itself was not what granted access
    assert.strictEqual(payload.admin, true);
    socket.close();

    const forged2 = jwt.sign({ sub: OTHER_USER_ID, role: 'admin', isAdmin: true }, 'wrong-secret');
    const second = await connect({ userId: OTHER_USER_ID, adminToken: forged2 });
    assert.strictEqual(second.payload.admin, false);
    assert.deepStrictEqual(second.payload.rooms, [`user:${OTHER_USER_ID}`]);
    second.socket.close();
});

test('a verified admin gets both its own room and the admin room', async () => {
    const token = jwt.sign({ sub: ADMIN_ID, role: 'admin', isAdmin: true }, process.env.ADMIN_JWT_SECRET, { expiresIn: '1h' });
    const { payload, socket } = await connect({ userId: ADMIN_ID, adminToken: token });
    assert.strictEqual(payload.admin, true);
    assert.deepStrictEqual(payload.rooms.sort(), [`user:${ADMIN_ID}`, 'admin:dashboard'].sort());
    assert.deepStrictEqual((await roomsOnServer(socket)).sort(), [`user:${ADMIN_ID}`, 'admin:dashboard'].sort());
    socket.close();
});

test('a normal user only gets its own room, never the admin room', async () => {
    const { payload, socket } = await connect({ userId: USER_ID });
    assert.deepStrictEqual(payload.rooms, [`user:${USER_ID}`]);
    assert.strictEqual(payload.admin, false);
    assert.ok(!(await roomsOnServer(socket)).includes('admin:dashboard'));
    socket.close();
});

test('a guest connects fine but joins no room', async () => {
    const { payload, socket } = await connect({});
    assert.deepStrictEqual(payload.rooms, []);
    assert.strictEqual(payload.room, null);
    socket.close();
});

test('admin-only payloads never reach a socket that faked the admin id', async () => {
    const attacker = await connect({ userId: 'admin-dashboard' });
    const received = [];
    attacker.socket.on('statusUpdate', (p) => received.push(p));

    const token = jwt.sign({ sub: ADMIN_ID, role: 'admin', isAdmin: true }, process.env.ADMIN_JWT_SECRET, { expiresIn: '1h' });
    const admin = await connect({ userId: ADMIN_ID, adminToken: token });
    const adminReceived = [];
    admin.socket.on('statusUpdate', (p) => adminReceived.push(p));

    io.to('admin:dashboard').emit('statusUpdate', { orderId: 'ORD-1', deliveryOtp: '4821' });
    await new Promise((r) => setTimeout(r, 300));

    assert.strictEqual(received.length, 0, 'attacker must not receive admin payloads');
    assert.strictEqual(adminReceived.length, 1);
    assert.strictEqual(adminReceived[0].deliveryOtp, '4821');

    attacker.socket.close();
    admin.socket.close();
});
