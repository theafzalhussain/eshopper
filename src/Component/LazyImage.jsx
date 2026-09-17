import React, { useRef, useState, useEffect } from 'react';
import { optimizeCloudinaryUrl, optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

/* Shared observer: one IntersectionObserver for every image on the page
   instead of one per image. On a grid of 50 cards that is 49 fewer
   observers competing for the main thread. */
let sharedObserver = null;
const callbacks = new WeakMap();

const getObserver = () => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
  if (sharedObserver) return sharedObserver;

  sharedObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const cb = callbacks.get(entry.target);
      if (cb) {
        cb();
        callbacks.delete(entry.target);
      }
      sharedObserver.unobserve(entry.target);
    });
  }, {
    /* start fetching well before the image scrolls into view so the
       user never sees a blank box */
    rootMargin: '400px 0px',
    threshold: 0.01
  });

  return sharedObserver;
};

/* A 1x1 transparent GIF. The previous placeholder was an empty string, and per
   the HTML spec src="" resolves against the document base URL — so every
   below-the-fold image asked the server for the page HTML again and then fired an
   `error` event. On a 50-card grid that was ~46 wasted document requests plus a
   broken-image glyph flashing in each slot. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* Widths offered to the browser via srcset. The grid slot is ~240-300 CSS px
   (Shop.jsx .mp-grid uses minmax(240px,1fr)), so without a srcset a phone was
   downloading the same 600px asset as a 2x desktop. */
const SRCSET_STEPS = [0.5, 0.75, 1, 1.5];

const LazyImage = ({
  src,
  alt = '',
  className = '',
  placeholder,
  maxWidth,
  quality = 70,
  eager = false,
  width,
  height,
  aspectRatio,
  sizes,
  ...rest
}) => {
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (eager || visible) return;
    const node = imgRef.current;
    if (!node) return;

    const observer = getObserver();
    if (!observer) { setVisible(true); return; }

    /* already on screen at mount (above the fold) — skip the wait */
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight + 400 && rect.bottom > -400) {
      setVisible(true);
      return;
    }

    callbacks.set(node, () => setVisible(true));
    observer.observe(node);

    return () => {
      callbacks.delete(node);
      observer.unobserve(node);
    };
  }, [eager, visible]);

  const optimize = (targetWidth) => (optimizeCloudinaryUrlAdvanced
    ? optimizeCloudinaryUrlAdvanced(src, { maxWidth: targetWidth, quality })
    : optimizeCloudinaryUrl(src));

  const finalSrc = visible ? optimize(maxWidth) : (placeholder || BLANK);

  /* Only build a srcset once the image is in play and a target width is known.
     Cloudinary is the only source we can resize on demand, so a plain local path
     correctly yields a single candidate and is skipped. */
  const srcSet = (() => {
    if (!visible || !maxWidth || !src) return undefined;

    const candidates = SRCSET_STEPS
      .map((step) => Math.round(maxWidth * step))
      .filter((w, i, arr) => w >= 80 && arr.indexOf(w) === i)
      .map((w) => ({ w, url: optimize(w) }));

    /* If the helper ignored the width (non-Cloudinary URL) every candidate is the
       same string — a srcset would then only add bytes to the HTML. */
    const distinct = new Set(candidates.map((c) => c.url));
    if (distinct.size < 2) return undefined;

    return candidates.map((c) => `${c.url} ${c.w}w`).join(', ');
  })();

  /* Reserving the box stops the layout jumping as images arrive,
     which is the main cause of the page feeling "jumpy" while scrolling. */
  const style = {
    ...(rest.style || {}),
    ...(aspectRatio && !height ? { aspectRatio } : {})
  };

  /* `rest` is spread FIRST on purpose. It used to come last, which let a caller
     passing loading="eager" silently overwrite the managed attributes and end up
     with an image that was neither high-priority nor lazily gated. Anything the
     component manages itself now wins. */
  return (
    <img
      {...rest}
      ref={imgRef}
      src={finalSrc}
      srcSet={srcSet}
      sizes={srcSet ? (sizes || `${maxWidth}px`) : undefined}
      alt={alt}
      className={className + (loaded ? ' loaded' : ' loading')}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      fetchpriority={eager ? 'high' : undefined}
      width={width}
      height={height}
      onLoad={(e) => {
        setLoaded(true);
        if (typeof rest.onLoad === 'function') rest.onLoad(e);
      }}
      style={style}
    />
  );
};

export default LazyImage;
