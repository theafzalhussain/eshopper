const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_master',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
        resource_type: 'auto',
        /* Store a sane master instead of the raw camera file. The only limit here
           used to be 20 MB of *bytes*, so a 6000x8000 phone photo was kept at full
           resolution — and every later request for it had to be downscaled on the
           fly. 2000px on the long edge is more than the product zoom needs.
           `limit` only ever shrinks: a smaller upload is stored untouched. */
        transformation: [{ width: 2000, height: 2000, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
        /* Pre-generate the two sizes the app actually renders — the grid card and
           the admin/order thumbnail — so the first visitor to see a new product
           does not pay for a cold transform. eager_async keeps the upload fast. */
        eager: [
            { width: 640, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
            { width: 160, height: 160, crop: 'fill', gravity: 'auto', quality: 'auto:good', fetch_format: 'auto' }
        ],
        eager_async: true
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
}).fields([
    { name: 'pic', maxCount: 1 },
    { name: 'pic1', maxCount: 1 },
    { name: 'pic2', maxCount: 1 },
    { name: 'pic3', maxCount: 1 },
    { name: 'pic4', maxCount: 1 }
]);

module.exports = { cloudinary, upload };
