process.env.ADMIN_JWT_SECRET = 'test-admin-secret';

const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { resolveSocketIdentity, isObjectId } = require('./socketAuth');

const ADMIN_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f191e810c19729de860ea';
const GHOST_ID = '507f191e810c19729de860eb';

const docs = {
    [ADMIN_ID]: { role: 'Admin' },
    [USER_ID]: { role: 'User' }
};

let lookups = 0;
User.findById = (id) => {
    lookups += 1;
    return { select: () => ({ lean: async () => docs[String(id)] || null }) };
};

const reset = () => { lookups = 0; };

test('the old attack no longer works: a made-up admin room name gets nothing', async () => {
    reset();
    const identity = await resolveSocketIdentity({ userId: 'admin-dashboard' });
    assert.deepStrictEqual(identity, { userId: null, isAdmin: false });
    assert.strictEqual(lookups, 0, 'a non-id string must not even hit the database');
});

test('junk identities are rejected', async () => {
    for (const userId of ['', null, undefined, 'guest', 'admin:dashboard', '../../etc/passwd', 'x'.repeat(24)]) {
        const identity = await resolveSocketIdentity({ userId });
        assert.deepStrictEqual(identity, { userId: null, isAdmin: false }, `accepted: ${userId}`);
    }
});

test('an id that does not exist in the database gets no room', async () => {
    const identity = await resolveSocketIdentity({ userId: GHOST_ID });
    assert.deepStrictEqual(identity, { userId: null, isAdmin: false });
});

test('a real user joins only its own room', async () => {
    const identity = await resolveSocketIdentity({ userId: USER_ID });
    assert.deepStrictEqual(identity, { userId: USER_ID, isAdmin: false });
});

test('a real admin id is recognised through the role lookup', async () => {
    const identity = await resolveSocketIdentity({ userId: ADMIN_ID });
    assert.deepStrictEqual(identity, { userId: ADMIN_ID, isAdmin: true });
});

test('a signed admin token is accepted without a database round trip', async () => {
    reset();
    const token = jwt.sign({ sub: ADMIN_ID, role: 'admin', isAdmin: true }, process.env.ADMIN_JWT_SECRET, { expiresIn: '1h' });
    const identity = await resolveSocketIdentity({ userId: ADMIN_ID, adminToken: token });
    assert.deepStrictEqual(identity, { userId: ADMIN_ID, isAdmin: true });
    assert.strictEqual(lookups, 0);
});

test('a token signed with the wrong secret is ignored', async () => {
    const forged = jwt.sign({ sub: GHOST_ID, role: 'admin', isAdmin: true }, 'not-the-secret');
    const identity = await resolveSocketIdentity({ userId: GHOST_ID, adminToken: forged });
    assert.deepStrictEqual(identity, { userId: null, isAdmin: false });
});

test('an expired admin token does not grant the admin room', async () => {
    const expired = jwt.sign({ sub: USER_ID, role: 'admin', isAdmin: true }, process.env.ADMIN_JWT_SECRET, { expiresIn: -10 });
    const identity = await resolveSocketIdentity({ userId: USER_ID, adminToken: expired });
    assert.deepStrictEqual(identity, { userId: USER_ID, isAdmin: false });
});

test('a valid token for a non-admin role does not grant the admin room', async () => {
    const token = jwt.sign({ sub: USER_ID, role: 'user' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '1h' });
    const identity = await resolveSocketIdentity({ userId: USER_ID, adminToken: token });
    assert.deepStrictEqual(identity, { userId: USER_ID, isAdmin: false });
});

test('role lookups are cached, so extra sockets do not hammer the database', async () => {
    const FRESH_ID = '507f191e810c19729de860ff';
    docs[FRESH_ID] = { role: 'User' };
    reset();
    await resolveSocketIdentity({ userId: FRESH_ID });
    await resolveSocketIdentity({ userId: FRESH_ID });
    await resolveSocketIdentity({ userId: FRESH_ID });
    assert.strictEqual(lookups, 1);
});

test('isObjectId only accepts 24-char hex', () => {
    assert.strictEqual(isObjectId(USER_ID), true);
    assert.strictEqual(isObjectId('admin-dashboard'), false);
    assert.strictEqual(isObjectId('507f191e810c19729de860e'), false);
});
