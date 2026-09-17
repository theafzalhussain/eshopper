/*
 * Cloudinary URL helpers.
 *
 * These used to append every optimized Cloudinary URL to the app's own
 * `${BASE_URL}/img?src=…` proxy. The effect was an inverted pipeline: the browser
 * asked our Node server for each image, Node downloaded it from the CDN,
 * re-encoded it with sharp (effort 6, on libuv's 4-thread pool — the same pool
 * bcrypt and fs use), base64'd it and kept it in an in-process Map. So Cloudinary
 * was paid for and then bypassed, the origin became the image server for the whole
 * catalog, and one shopper scrolling the grid could add latency to someone else's
 * login.
 *
 * Now the transformed Cloudinary URL is returned directly. Two consequences worth
 * knowing:
 *   • `w_auto` and `dpr_auto` are gone. Both need Sec-CH-Width/Sec-CH-DPR client
 *     hints; server-side fetches never sent them, so `w_auto` silently resolved to
 *     the ORIGINAL width — the images were never downscaled. Explicit `w_<n>` plus
 *     srcset (see LazyImage) is deterministic instead.
 *   • the <link rel="preconnect" href="res.cloudinary.com"> in index.html finally
 *     does something.
 */

const isProxyUrl = (url) => {
  if (!url) return false;
  return url.includes('/img?src=');
};

/* Cloudinary delivery URLs look like
   https://res.cloudinary.com/<cloud>/image/upload/<transforms?>/<public_id> */
const splitUpload = (url) => {
  const match = url.match(/(.+\/upload\/)(.+)/);
  if (!match) return null;
  return { baseUrl: match[1], imagePath: match[2] };
};

const isCloudinary = (url) => url.includes('res.cloudinary.com') || url.includes('cloudinary.com');

/**
 * Format/quality optimization with no resize.
 * Prefer optimizeCloudinaryUrlAdvanced with an explicit maxWidth — an unresized
 * image is usually far larger than the slot it is painted into.
 * @param {string} url
 * @returns {string}
 */
export const optimizeCloudinaryUrl = (url) => {
  if (!url) return url;
  if (isProxyUrl(url) || url.startsWith('data:')) return url;
  if (!isCloudinary(url)) return url;

  const parts = splitUpload(url);
  if (!parts) return url;

  /* already carries a transformation — leave it alone rather than stacking */
  if (parts.imagePath.includes('f_auto') || parts.imagePath.includes('q_auto')) return url;

  return `${parts.baseUrl}f_auto,q_auto:good/${parts.imagePath}`;
};

/**
 * Optimization with an explicit target width and optional crop.
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.maxWidth] target width in CSS px (1x)
 * @param {string} [options.crop]     Cloudinary crop mode: fill, fit, pad, …
 * @param {number} [options.quality]  1-100; omit for q_auto:good
 * @returns {string}
 */
export const optimizeCloudinaryUrlAdvanced = (url, options = {}) => {
  if (!url) return url;
  if (isProxyUrl(url) || url.startsWith('data:')) return url;
  if (!isCloudinary(url)) return url;

  const parts = splitUpload(url);
  if (!parts) return url;
  if (parts.imagePath.includes('f_auto') || parts.imagePath.includes('q_auto')) return url;

  const transformations = ['f_auto'];

  const quality = Number(options.quality);
  transformations.push(Number.isFinite(quality) && quality > 0 && quality <= 100
    ? `q_${Math.round(quality)}`
    : 'q_auto:good');

  if (options.maxWidth) transformations.push(`w_${Math.round(Number(options.maxWidth))}`);

  if (options.crop) {
    transformations.push(`c_${options.crop}`);
    /* g_auto lets Cloudinary keep the subject in frame when cropping */
    if (options.crop !== 'pad') transformations.push('g_auto');
  }

  return `${parts.baseUrl}${transformations.join(',')}/${parts.imagePath}`;
};

/**
 * Small square thumbnail — admin tables, order lines, review avatars. Those sites
 * were rendering full-resolution originals into 40-80px boxes.
 * @param {string} url
 * @param {number} [size=80] rendered box size in CSS px
 * @returns {string}
 */
export const thumbUrl = (url, size = 80) =>
  optimizeCloudinaryUrlAdvanced(url, { maxWidth: size * 2, crop: 'fill' });
