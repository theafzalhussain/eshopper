const test = require('node:test');
const assert = require('node:assert');
const { classifyRedisError } = require('./redis');

test('the Upstash quota message is recognised (this is the log spam we saw)', () => {
    const real = 'ERR max requests limit exceeded. Limit: 500000, Usage: 500001. See https://upstash.com/docs/redis/troubleshooting/max_requests_limit for details';
    assert.strictEqual(classifyRedisError(real), 'quota');
    assert.strictEqual(classifyRedisError(new Error(real)), 'quota');
});

test('other quota wordings are covered too', () => {
    assert.strictEqual(classifyRedisError('ERR max daily request limit exceeded'), 'quota');
    assert.strictEqual(classifyRedisError('ERR max monthly request limit exceeded'), 'quota');
    assert.strictEqual(classifyRedisError('quota exceeded for this plan'), 'quota');
});

test('auth and connection failures keep their own classification', () => {
    assert.strictEqual(classifyRedisError('NOAUTH Authentication required.'), 'auth');
    assert.strictEqual(classifyRedisError('WRONGPASS invalid username-password pair'), 'auth');
    assert.strictEqual(classifyRedisError('connect ECONNREFUSED 127.0.0.1:6379'), 'connection');
    assert.strictEqual(classifyRedisError('getaddrinfo ENOTFOUND my-redis.host'), 'connection');
});

test('unknown errors stay "other" so they are not silently swallowed', () => {
    assert.strictEqual(classifyRedisError('READONLY You cannot write against a read only replica'), 'other');
    assert.strictEqual(classifyRedisError(''), 'other');
    assert.strictEqual(classifyRedisError(undefined), 'other');
});
