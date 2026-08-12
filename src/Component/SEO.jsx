import { Helmet } from 'react-helmet-async';
import { FRONTEND_URL, BRAND_LOGO_URL } from '../constants';
import { absSeoUrl, normalizeSeoPath } from '../utils/seoPath';

const SITE_NAME = 'Eshopper';
const DEFAULT_TITLE = 'Eshopper – Premium Fashion Boutique | Men, Women & Kids';
const DEFAULT_DESCRIPTION =
  'Shop premium fashion at Eshopper (eshopperr.me). Discover luxury clothing for men, women and kids with free shipping above ₹999, easy 30-day returns, and exclusive member drops.';
const DEFAULT_IMAGE = `${FRONTEND_URL}/og-default.jpg`;
const TWITTER_HANDLE = '@eshopperr';

function absUrl(pathOrUrl = '/') {
  return absSeoUrl(pathOrUrl);
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
      <html lang="en-IN" />
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
    url: `${FRONTEND_URL}/`,
    logo: absUrl(BRAND_LOGO_URL || '/logo512.png'),
    image: DEFAULT_IMAGE,
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
    url: `${FRONTEND_URL}/`,
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

/** Merchant fields Google looks for in Product rich results. */
function priceValidUntilDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function offerShippingDetails(price) {
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

function merchantReturnPolicy() {
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
    merchantReturnLink: `${FRONTEND_URL}/return-policy`,
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

  const rawDesc = product.description || '';
  const description =
    rawDesc && !/^this is sample product$/i.test(String(rawDesc).trim())
      ? rawDesc
      : `Buy ${product.name}${product.brand ? ` by ${product.brand}` : ''} online at Eshopper. Premium ${[product.maincategory, product.subcategory].filter(Boolean).join(' ')} fashion with free shipping above ₹999.`;

  const offers = {
    '@type': 'Offer',
    url,
    priceCurrency: 'INR',
    price: Number.isFinite(price) ? price.toFixed(2) : undefined,
    priceValidUntil: priceValidUntilDate(),
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    seller: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    hasMerchantReturnPolicy: merchantReturnPolicy(),
  };

  const shipping = offerShippingDetails(price);
  if (shipping) offers.shippingDetails = shipping;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: toPlainText(description, 5000),
    sku: String(id || ''),
    mpn: String(id || ''),
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : { '@type': 'Brand', name: SITE_NAME },
    image: images.length ? images : [DEFAULT_IMAGE],
    category: [product.maincategory, product.subcategory].filter(Boolean).join(' > ') || undefined,
    ...(product.color ? { color: product.color } : {}),
    url,
    offers,
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

export { normalizeSeoPath, absUrl as absSeoUrl };
