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

  const finalSrc = visible
    ? (optimizeCloudinaryUrlAdvanced
      ? optimizeCloudinaryUrlAdvanced(src, { maxWidth, quality })
      : optimizeCloudinaryUrl(src))
    : (placeholder || '');

  /* Reserving the box stops the layout jumping as images arrive,
     which is the main cause of the page feeling "jumpy" while scrolling. */
  const style = {
    ...(rest.style || {}),
    ...(aspectRatio && !height ? { aspectRatio } : {})
  };

  return (
    <img
      ref={imgRef}
      src={finalSrc}
      alt={alt}
      className={className + (loaded ? ' loaded' : ' loading')}
      loading={eager ? 'eager' : (rest.loading || 'lazy')}
      decoding={eager ? 'sync' : 'async'}
      fetchpriority={eager ? 'high' : undefined}
      width={width}
      height={height}
      onLoad={() => setLoaded(true)}
      {...rest}
      style={style}
    />
  );
};

export default LazyImage;
