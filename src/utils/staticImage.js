/* Responsive variants for the static images under public/assets.
 *
 * `npm run images:optimize` writes src/generated/staticImageManifest.json,
 * mapping each original (e.g. /assets/images/CR-3.png, 14.4 MB) to a set of WebP
 * variants. This helper turns an original path into the srcSet/sizes the browser
 * needs, so a phone downloads the 480px file instead of the original.
 *
 * Anything not in the manifest is returned untouched, so a new image dropped into
 * public/assets keeps working — it just has no variants until the script runs.
 */
import manifest from '../generated/staticImageManifest.json';

/* Paths such as "/assets/images/kids 2.png" contain spaces, and a raw space
   inside srcset would be read as the descriptor separator. */
const encodePath = (p) => String(p).split('/').map(encodeURIComponent).join('/');

export const staticImage = (src, { sizes = '100vw' } = {}) => {
    const entry = src ? manifest[src] : null;
    const variants = entry && Array.isArray(entry.variants) ? entry.variants : [];

    if (variants.length === 0) return { src };

    const largest = variants[variants.length - 1];

    return {
        src: encodePath(largest.src),
        srcSet: variants.map((v) => `${encodePath(v.src)} ${v.width}w`).join(', '),
        sizes
    };
};

/* The widest variant on its own — for spots where a single URL is all the markup
   can take (CSS background, meta tags, preload hrefs). */
export const staticImageSrc = (src) => staticImage(src).src;

export default staticImage;
