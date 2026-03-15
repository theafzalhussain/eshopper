// Helper to sanitize Cloudinary URLs
function sanitizeCloudinaryUrl(url) {
    if (!url) return null;
    if (url.includes('res.cloudinary.com')) {
        return url;
    }
    return url;
}

module.exports = { sanitizeCloudinaryUrl };
