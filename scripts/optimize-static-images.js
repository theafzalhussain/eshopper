#!/usr/bin/env node
/*
 * Generate responsive WebP variants for the static images in public/assets.
 *
 * Why this exists: the home-page hero was a 14.4 MB PNG (the second slide 20.4 MB)
 * served straight to the browser with fetchpriority="high", and the whole
 * public/assets/images folder is ~134 MB. Those files were the single largest
 * thing between a visitor and a painted page — a phone downloaded 14.4 MB to fill
 * a strip a few hundred pixels tall.
 *
 * Originals are never modified or deleted. Variants are written beside them as
 * `<name>-<width>.webp`, and a manifest is emitted so the app can pick a variant
 * with a plain object lookup and fall back to the original for anything that has
 * not been processed.
 *
 * Usage:
 *   npm run images:optimize            # only files missing variants
 *   npm run images:optimize -- --force # rebuild everything
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SCAN_DIRS = [path.join(PUBLIC_DIR, 'assets', 'images')];
const MANIFEST_PATH = path.join(ROOT, 'src', 'generated', 'staticImageManifest.json');

/* 480 covers phones, 960 tablets and the 1x desktop hero, 1600 retina desktop.
   Anything wider than the source is skipped rather than upscaled. */
const WIDTHS = [480, 960, 1600];
const MIN_BYTES = 200 * 1024;      // below this, a variant is not worth a request
const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg']);
const VARIANT_RE = /-(\d+)\.webp$/i;

const force = process.argv.includes('--force');

const toPublicPath = (absolute) =>
    '/' + path.relative(PUBLIC_DIR, absolute).split(path.sep).join('/');

const walk = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return [full];
    });
};

const formatMB = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

(async () => {
    const candidates = SCAN_DIRS
        .flatMap(walk)
        .filter((file) => SOURCE_EXT.has(path.extname(file).toLowerCase()))
        .filter((file) => !VARIANT_RE.test(file))
        .filter((file) => fs.statSync(file).size >= MIN_BYTES)
        .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);

    if (candidates.length === 0) {
        console.log('No images above the size threshold — nothing to do.');
        return;
    }

    const manifest = {};
    let sourceBytes = 0;
    let generatedBytes = 0;
    let skipped = 0;

    for (const file of candidates) {
        const stat = fs.statSync(file);
        const meta = await sharp(file).metadata();
        const dir = path.dirname(file);
        const base = path.basename(file, path.extname(file));

        sourceBytes += stat.size;

        const variants = [];
        for (const width of WIDTHS) {
            /* never upscale: a 400px source gains nothing from a 1600px variant */
            if (meta.width && width > meta.width) continue;

            const outFile = path.join(dir, `${base}-${width}.webp`);

            if (!force && fs.existsSync(outFile) && fs.statSync(outFile).mtimeMs >= stat.mtimeMs) {
                skipped += 1;
            } else {
                await sharp(file)
                    .resize({ width, withoutEnlargement: true })
                    /* effort 5 is a build-time cost only, so favour smaller files */
                    .webp({ quality: 72, effort: 5 })
                    .toFile(outFile);
            }

            generatedBytes += fs.statSync(outFile).size;
            variants.push({ width, src: toPublicPath(outFile) });
        }

        /* If the source was smaller than every width we generate, fall back to a
           single full-width variant so the file still gets webp treatment. */
        if (variants.length === 0) {
            const outFile = path.join(dir, `${base}-${meta.width || WIDTHS[0]}.webp`);
            await sharp(file).webp({ quality: 72, effort: 5 }).toFile(outFile);
            generatedBytes += fs.statSync(outFile).size;
            variants.push({ width: meta.width || WIDTHS[0], src: toPublicPath(outFile) });
        }

        manifest[toPublicPath(file)] = {
            width: meta.width || null,
            height: meta.height || null,
            originalBytes: stat.size,
            variants
        };

        const largest = variants[variants.length - 1];
        const largestBytes = fs.statSync(path.join(PUBLIC_DIR, largest.src.replace(/^\//, ''))).size;
        console.log(`${toPublicPath(file)}  ${formatMB(stat.size)} -> ${formatMB(largestBytes)} (${variants.length} variants)`);
    }

    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(`Processed ${candidates.length} source images (${skipped} variants already current)`);
    console.log(`Originals: ${formatMB(sourceBytes)}  ->  variants total: ${formatMB(generatedBytes)}`);
})().catch((err) => {
    console.error('Image optimization failed:', err && err.message);
    process.exit(1);
});
