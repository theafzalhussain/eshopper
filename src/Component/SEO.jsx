import { Helmet } from 'react-helmet-async';
import { FRONTEND_URL, BRAND_LOGO_URL } from '../constants';

const SITE_NAME = 'Eshopper';
const DEFAULT_TITLE = 'Eshopper – Premium Fashion Boutique | Men, Women & Kids';
const DEFAULT_DESCRIPTION =
  'Shop premium fashion at Eshopper (eshopperr.me). Discover luxury clothing for men, women and kids with free shipping above ₹999, easy 30-day returns, and exclusive member drops.';
const DEFAULT_IMAGE = `${FRONTEND_URL}${BRAND_LOGO_URL?.startsWith('http') ? '' : BRAND_LOGO_URL || '/logo512.png'}`;
const TWITTER_HANDLE = '@eshopperr';

function absUrl(pathOrUrl = '/') {
  if (!pathOrUrl) return FRONTEND_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${FRONTEND_URL}${path}`;
}

function toPlainText(value = '', max = 160) {
  const text = String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

/**
 * Page-level SEO tags + optional JSON-LD.
 * Use on every public route for title/description/canonical/OG.
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  keywords,
  jsonLd,
  children,
}) {
  const fullTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : DEFAULT_TITLE;
  const desc = toPlainText(description || DEFAULT_DESCRIPTION, 160);
  const canonical = absUrl(path);
  const ogImage = absUrl(image || DEFAULT_IMAGE);
  const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';

  const graph = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : jsonLd ? [jsonLd] : [];

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:locale" content="en_IN" />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={fullTitle} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      {TWITTER_HANDLE ? <meta name="twitter:site" content={TWITTER_HANDLE} /> : null}

      {graph.map((item, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
      {children}
    </Helmet>
  );
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: ['Eshopper Boutique', 'Eshopperr', 'eshopperr.me'],
    url: FRONTEND_URL,
    logo: absUrl(BRAND_LOGO_URL || '/logo512.png'),
    sameAs: [],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        url: absUrl('/contact'),
        availableLanguage: ['English', 'Hindi'],
      },
    ],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: FRONTEND_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${FRONTEND_URL}/shop/All?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absUrl(item.path),
    })),
  };
}

export function productJsonLd(product = {}) {
  if (!product || product.notFound) return null;
  const id = product._id || product.id;
  const url = absUrl(`/single-product/${id}`);
  const images = [product.pic1, product.pic2, product.pic3, product.pic4]
    .filter(Boolean)
    .map((src) => absUrl(src));
  const price = Number(product.finalprice || product.baseprice || 0);
  const availability =
    String(product.stock || '').toLowerCase() === 'out of stock' ||
    String(product.stock || '').toLowerCase() === 'outofstock' ||
    product.stock === 0
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: toPlainText(product.description || product.name, 5000),
    sku: String(id || ''),
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : { '@type': 'Brand', name: SITE_NAME },
    image: images.length ? images : [absUrl('/logo512.png')],
    category: [product.maincategory, product.subcategory].filter(Boolean).join(' > ') || undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: Number.isFinite(price) ? price.toFixed(2) : undefined,
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    ...(Number(product.rating) > 0 && Number(product.reviews) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating),
            reviewCount: Number(product.reviews),
          },
        }
      : {}),
  };
}

export const SEO_DEFAULTS = {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
};
