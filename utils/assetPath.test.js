const test = require('node:test');
const assert = require('node:assert');
const { isAssetRequest } = require('./assetPath');

test('asset paths are never served the SPA shell', () => {
    assert.strictEqual(isAssetRequest('/static/js/5361.c0264308.chunk.js'), true);
    assert.strictEqual(isAssetRequest('/static/css/main.abc123.chunk.css'), true);
    assert.strictEqual(isAssetRequest('/manifest.json'), true);
    assert.strictEqual(isAssetRequest('/logo192.png'), true);
    assert.strictEqual(isAssetRequest('/sw.js'), true);
});

test('app routes still get the SPA shell', () => {
    assert.strictEqual(isAssetRequest('/admin-home'), false);
    assert.strictEqual(isAssetRequest('/admin-deploy-checks'), false);
    assert.strictEqual(isAssetRequest('/single-product/68f2ab91c1d2e3f4a5b6c7d8'), false);
    assert.strictEqual(isAssetRequest('/order-tracking/ORD-2026-001'), false);
    assert.strictEqual(isAssetRequest('/'), false);
    assert.strictEqual(isAssetRequest(''), false);
});
