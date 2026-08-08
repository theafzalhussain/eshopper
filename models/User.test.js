const test = require('node:test');
const assert = require('node:assert');
const User = require('./User');

/* These run offline: validateSync() applies schema rules without a database. */

const HASH = '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890';
const errorsOf = (doc) => {
    const e = new User(doc).validateSync();
    return e ? Object.keys(e.errors) : [];
};

test('Google sign-up validates without a password (this was the 500 on /api/auth-sync)', () => {
    assert.deepStrictEqual(errorsOf({
        uid: 'firebase-uid-1',
        name: 'Fresh User',
        email: 'fresh.user@example.com',
        provider: 'google',
        username: 'fresh.user',
        role: 'User',
        lastLogin: new Date()
    }), []);
});

test('phone sign-up validates too', () => {
    assert.deepStrictEqual(errorsOf({
        uid: 'firebase-uid-2',
        email: 'phone.user@example.com',
        phone: '+919999999999',
        provider: 'phone',
        password: HASH,
        role: 'User'
    }), []);
});

test('email + password sign-up still requires a password', () => {
    assert.deepStrictEqual(errorsOf({
        email: 'local@example.com',
        username: 'local',
        name: 'Local'
    }), ['password']);

    assert.deepStrictEqual(errorsOf({
        email: 'local@example.com',
        username: 'local',
        name: 'Local',
        password: HASH
    }), []);
});

test('email is still mandatory for everyone', () => {
    assert.ok(errorsOf({ uid: 'firebase-uid-3', provider: 'google' }).includes('email'));
});

test('Firebase fields are part of the schema, so they are actually saved', () => {
    for (const field of ['uid', 'provider', 'role', 'lastLogin']) {
        assert.ok(User.schema.paths[field], `${field} missing from schema — Mongoose would drop it on save`);
    }
});

test('role defaults to User for new accounts', () => {
    const doc = new User({ uid: 'firebase-uid-4', email: 'x@example.com', provider: 'google' }).toObject();
    assert.strictEqual(doc.role, 'User');
    assert.strictEqual(doc.provider, 'google');
    assert.strictEqual(doc.uid, 'firebase-uid-4');
});
