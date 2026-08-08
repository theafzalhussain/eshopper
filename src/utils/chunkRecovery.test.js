import { isChunkLoadFailure } from './chunkRecovery';

describe('isChunkLoadFailure', () => {
    test('detects the HTML-served-as-JS syntax error (the /admin-home blank page)', () => {
        expect(isChunkLoadFailure(new SyntaxError("Unexpected token '<'"))).toBe(true);
        expect(isChunkLoadFailure("Uncaught SyntaxError: Unexpected token '<'")).toBe(true);
        // Firefox wording
        expect(isChunkLoadFailure(new SyntaxError("expected expression, got '<'"))).toBe(true);
    });

    test('detects webpack and native chunk errors', () => {
        const err = new Error('Loading chunk 5361 failed.');
        err.name = 'ChunkLoadError';
        expect(isChunkLoadFailure(err)).toBe(true);
        expect(isChunkLoadFailure(new Error('Failed to fetch dynamically imported module: /x.js'))).toBe(true);
        expect(isChunkLoadFailure(new Error('Importing a module script failed.'))).toBe(true);
        expect(isChunkLoadFailure({ reason: { name: 'ChunkLoadError' } })).toBe(true);
    });

    test('ignores unrelated errors so it never reload-loops', () => {
        expect(isChunkLoadFailure(new TypeError('x is not a function'))).toBe(false);
        expect(isChunkLoadFailure(new Error('Network Error'))).toBe(false);
        // An API returning an HTML error page is not a stale-build problem
        expect(isChunkLoadFailure(new SyntaxError('Unexpected token \'<\', "<!DOCTYPE " is not valid JSON'))).toBe(false);
    });
});
