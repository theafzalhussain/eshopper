import { FRONTEND_URL } from '../constants';

/** Normalize internal paths for canonical URLs (no query/hash, no trailing slash). */
export function normalizeSeoPath(pathOrUrl = '/') {
  if (!pathOrUrl) return '/';

  let path = pathOrUrl;
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      path = u.pathname || '/';
    } catch {
      path = '/';
    }
  }

  path = String(path).split('?')[0].split('#')[0] || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

export function absSeoUrl(pathOrUrl = '/') {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    // Still normalize host path trailing slash for our domain
    try {
      const u = new URL(pathOrUrl);
      if (u.origin.replace(/\/$/, '') === String(FRONTEND_URL).replace(/\/$/, '')) {
        const p = normalizeSeoPath(u.pathname);
        return p === '/' ? `${FRONTEND_URL}/` : `${FRONTEND_URL}${p}`;
      }
      return pathOrUrl;
    } catch {
      return pathOrUrl;
    }
  }
  const path = normalizeSeoPath(pathOrUrl);
  return path === '/' ? `${FRONTEND_URL}/` : `${FRONTEND_URL}${path}`;
}
