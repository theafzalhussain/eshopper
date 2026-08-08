/**
 * sha256 hex of a string, using the browser's Web Crypto API.
 *
 * Used to compare a value with a server-sent hash without either side putting
 * the plain value on the wire (see the password-reset broadcast).
 * Returns null when Web Crypto is unavailable (very old browser, or a page
 * served over plain http) so callers can simply skip the comparison.
 */
export async function sha256Hex(value) {
    try {
        const subtle = window.crypto && window.crypto.subtle
        if (!subtle) return null
        const bytes = new TextEncoder().encode(String(value))
        const digest = await subtle.digest('SHA-256', bytes)
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
    } catch (_) {
        return null
    }
}

export default sha256Hex
