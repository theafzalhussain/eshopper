/**
 * Vercel Edge Middleware — injects correct canonical/title/description/JSON-LD
 * into the SPA shell BEFORE Googlebot sees the HTML.
 *
 * Root cause of GSC "Duplicate without user-selected canonical":
 * every route was serving index.html with homepage canonical https://eshopperr.me/
 */
const SITE_URL = 'https://eshopperr.me';
const API_URL = 'https://eshopper-qtgl.onrender.com';

const NOINDEX_PREFIXES = [
  '/admin',
  '/cart',
  '/checkout',
  '/wishlist',
  '/profile',
  '/update-profile',
  '/my-orders',
  '/order-tracking',
  '/login',
  '/signup',
  '/forget-password',
  '/confirmation',
];

const STATIC_META = {
  '/': {
    title: 'Eshopper – Premium Fashion Boutique | Men, Women & Kids',
    description:
      'Shop premium fashion at Eshopper (eshopperr.me). Luxury clothing for men, women & kids. Free shipping above ₹999, easy 30-day returns.',
    type: 'website',
  },
  '/about': {
    title: 'About Us | Eshopper',
    description:
      'Learn about Eshopper – a premium fashion boutique crafting elevated essentials for men, women and kids.',
    type: 'website',
  },
  '/contact': {
    title: 'Contact Us | Eshopper',
    description:
      'Contact Eshopper support for orders, styling help and partnership enquiries.',
    type: 'website',
  },
  '/faq': {
    title: 'FAQs | Eshopper',
    description:
      'Frequently asked questions about shipping, returns, payments and membership at Eshopper.',
    type: 'website',
  },
  '/return-policy': {
    title: 'Return Policy | Eshopper',
    description: 'Eshopper policies for returns, refunds and exchanges.',
    type: 'website',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Eshopper',
    description: 'Eshopper privacy policy for customer data and cookies.',
    type: 'website',
  },
  '/terms': {
    title: 'Terms & Conditions | Eshopper',
    description: 'Terms and conditions for shopping at Eshopper.',
    type: 'website',
  },
};

function normalizePath(pathname = '/') {
  if (!pathname) return '/';
  let path = pathname.split('?')[0].split('#')[0] || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/`/g, '');
}

function toPlainText(value = '', max = 160) {
  const text = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function isNoindexPath(path) {
  return NOINDEX_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith('/admin')
  );
}

function absUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = normalizePath(path);
  return normalized === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalized}`;
}

function replaceMeta(html, { title, description, canonical, image, type, noindex, jsonLdExtra }) {
  let out = html;

  if (title) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    out = out.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeAttr(title)}" />`
    );
    out = out.replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeAttr(title)}" />`
    );
  }

  if (description) {
    const desc = toPlainText(description, 160);
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeAttr(desc)}" />`
    );
    out = out.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeAttr(desc)}" />`
    );
    out = out.replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeAttr(desc)}" />`
    );
  }

  if (canonical) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeAttr(canonical)}" />`
    );
    out = out.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`
    );
  }

  if (image) {
    out = out.replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${escapeAttr(image)}" />`
    );
    out = out.replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${escapeAttr(image)}" />`
    );
  }

  if (type) {
    out = out.replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:type" content="${escapeAttr(type)}" />`
    );
  }

  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large';
  out = out.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${robots}" />`
  );

  if (jsonLdExtra) {
    const block = `<script type="application/ld+json">${jsonLdExtra}</script>`;
    out = out.replace('</head>', `  ${block}\n</head>`);
  }

  return out;
}

function shopMeta(path) {
  const parts = path.split('/').filter(Boolean);
  const cat = decodeURIComponent(parts[1] || 'All');
  const label = cat === 'All' ? 'All Products' : cat;
  return {
    title: `${label} Fashion Collection | Eshopper`,
    description: `Shop ${label} at Eshopper – premium styles, exclusive drops, free shipping above ₹999.`,
    type: 'website',
  };
}

/** Merchant fields Google looks for in Product rich results. */
function priceValidUntil() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function shippingDetails(price) {
  // Site policy: free shipping on orders above ₹999 (India).
  if (!Number.isFinite(price) || price < 999) return undefined;
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: '0',
      currency: 'INR',
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'IN',
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: 2,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: 2,
        maxValue: 7,
        unitCode: 'DAY',
      },
      businessDays: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'https://schema.org/Monday',
          'https://schema.org/Tuesday',
          'https://schema.org/Wednesday',
          'https://schema.org/Thursday',
          'https://schema.org/Friday',
          'https://schema.org/Saturday',
        ],
      },
    },
  };
}

function returnPolicy() {
  // Industry standard for Indian fashion e-commerce (Myntra/Ajio/Amazon Fashion):
  // 30-day window, free return pickup, full refund.
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'IN',
    returnPolicyCountry: 'IN',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 30,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
    refundType: 'https://schema.org/FullRefund',
    returnShippingFeesAmount: {
      '@type': 'MonetaryAmount',
      value: '0',
      currency: 'INR',
    },
    merchantReturnLink: `${SITE_URL}/return-policy`,
  };
}

function buildProductJsonLd(product, canonical) {
  const images = [product.pic1, product.pic2, product.pic3, product.pic4].filter(Boolean);
  const price = Number(product.finalprice || product.baseprice || 0);
  const stock = String(product.stock || '').toLowerCase();
  const availability =
    stock.includes('out') || product.stock === 0
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';

  const descRaw = product.description && !/^this is sample product$/i.test(product.description)
    ? product.description
    : `Buy ${product.name}${product.brand ? ` by ${product.brand}` : ''} online at Eshopper. Premium ${[product.maincategory, product.subcategory].filter(Boolean).join(' ')} fashion with easy returns.`;

  const offers = {
    '@type': 'Offer',
    url: canonical,
    priceCurrency: 'INR',
    price: Number.isFinite(price) ? price.toFixed(2) : undefined,
    priceValidUntil: priceValidUntil(),
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: 'Eshopper' },
    hasMerchantReturnPolicy: returnPolicy(),
  };

  const shipping = shippingDetails(price);
  if (shipping) offers.shippingDetails = shipping;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: toPlainText(descRaw, 5000),
    sku: String(product._id || ''),
    mpn: String(product._id || ''),
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : { '@type': 'Brand', name: 'Eshopper' },
    image: images.length ? images : [`${SITE_URL}/assets/images/CR-1.png`],
    category: [product.maincategory, product.subcategory].filter(Boolean).join(' > ') || undefined,
    ...(product.color ? { color: product.color } : {}),
    url: canonical,
    offers,
  };

  if (Number(product.rating) > 0 && Number(product.reviews) > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating),
      reviewCount: Number(product.reviews),
    };
  }

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.maincategory || 'Shop',
        item: absUrl(`/shop/${encodeURIComponent(product.maincategory || 'All')}`),
      },
      { '@type': 'ListItem', position: 3, name: product.name, item: canonical },
    ],
  };

  return JSON.stringify([data, crumbs]);
}

async function fetchProduct(id) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${API_URL}/product/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'EshopperSEOMiddleware/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const rawPath = url.pathname || '/';

  // Permanent trailing-slash normalization (except root)
  if (rawPath !== '/' && rawPath.endsWith('/')) {
    url.pathname = normalizePath(rawPath);
    return Response.redirect(url.toString(), 301);
  }

  const path = normalizePath(rawPath);

  // Only rewrite HTML document navigations
  const accept = request.headers.get('accept') || '';
  const isDocument = accept.includes('text/html') || accept.includes('*/*') || accept === '';
  const method = request.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    return; // let Vercel continue
  }
  if (!isDocument) {
    return;
  }

  // Skip obvious non-page requests (matcher should already cover this)
  if (path.includes('.') && !path.endsWith('.html')) {
    return;
  }

  try {
    const indexRes = await fetch(new URL('/index.html', url.origin));
    if (!indexRes.ok) return;

    let html = await indexRes.text();
    const canonical = absUrl(path);
    const noindex = isNoindexPath(path);

    let title;
    let description;
    let image = `${SITE_URL}/assets/images/CR-1.png`;
    let type = 'website';
    let jsonLdExtra;

    if (STATIC_META[path]) {
      ({ title, description, type } = STATIC_META[path]);
    } else if (path.startsWith('/shop/')) {
      ({ title, description, type } = shopMeta(path));
    } else if (path.startsWith('/single-product/')) {
      const id = path.split('/')[2] || '';
      const product = id ? await fetchProduct(id) : null;
      if (product && product.name) {
        title = `${product.name}${product.brand ? ` by ${product.brand}` : ''} | Eshopper`;
        const rawDesc =
          product.description && !/^this is sample product$/i.test(String(product.description))
            ? product.description
            : `Buy ${product.name}${product.brand ? ` by ${product.brand}` : ''} online at Eshopper. Premium ${[product.maincategory, product.subcategory].filter(Boolean).join(' ')} fashion with free shipping above ₹999.`;
        description = rawDesc;
        image = product.pic1 || image;
        type = 'product';
        jsonLdExtra = buildProductJsonLd(product, canonical);
      } else {
        title = 'Product | Eshopper';
        description = 'Premium product details at Eshopper boutique.';
        type = 'product';
      }
    } else if (noindex) {
      title = 'Eshopper';
      description = 'Eshopper premium fashion boutique.';
    } else {
      title = 'Eshopper – Premium Fashion Boutique | Men, Women & Kids';
      description = STATIC_META['/'].description;
    }

    html = replaceMeta(html, {
      title,
      description,
      canonical,
      image,
      type,
      noindex,
      jsonLdExtra,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': noindex
          ? 'private, no-store'
          : 'public, s-maxage=300, stale-while-revalidate=900',
        'X-SEO-Canonical': canonical,
        'X-SEO-Middleware': '1',
      },
    });
  } catch (err) {
    // Fail open — serve default static shell
    return;
  }
}

export const config = {
  matcher: [
    '/',
    '/shop/:path*',
    '/single-product/:path*',
    '/about',
    '/contact',
    '/faq',
    '/return-policy',
    '/privacy-policy',
    '/terms',
    '/cart',
    '/checkout',
    '/wishlist',
    '/profile',
    '/update-profile',
    '/my-orders',
    '/order-tracking/:path*',
    '/login',
    '/signup',
    '/forget-password',
    '/confirmation',
    '/admin',
    '/admin/:path*',
    '/admin-home',
    '/admin-home/:path*',
  ],
};
