import React, { useRef, useState, useEffect } from 'react';
import { optimizeCloudinaryUrl, optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

const LazyImage = ({ src, alt = '', className = '', placeholder, maxWidth, quality = 70, ...rest }) => {
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } });
      });
      obs.observe(imgRef.current);
      return () => obs.disconnect();
    }
    // Fallback: immediately load
    setVisible(true);
  }, [imgRef]);

  const finalSrc = visible ? optimizeCloudinaryUrlAdvanced ? optimizeCloudinaryUrlAdvanced(src, { maxWidth, quality }) : optimizeCloudinaryUrl(src) : placeholder || '';

  const loadingAttr = rest.loading || 'lazy';
  return (
    <img
      ref={imgRef}
      src={finalSrc}
      alt={alt}
      className={className + (loaded ? ' loaded' : ' loading')}
      loading={loadingAttr}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  );
};

export default LazyImage;
