/* ══════════════════════════════════════════════════════════
   CATALOG INTELLIGENCE
   Turns the raw product list into everything the assistant
   needs to answer confidently: category tree, brand map,
   price bands, live deals, stock reality, rating leaders.
══════════════════════════════════════════════════════════ */

export const interpretStock = (stock) => {
  if (stock === undefined || stock === null || stock === '') {
    return { inStock: true, qty: null, label: 'In stock', low: false }
  }
  if (typeof stock === 'boolean') {
    return { inStock: stock, qty: null, label: stock ? 'In stock' : 'Out of stock', low: false }
  }
  const raw = String(stock).trim()
  const num = Number(raw.replace(/[^\d.-]/g, ''))

  if (Number.isFinite(num) && /\d/.test(raw)) {
    return {
      inStock: num > 0,
      qty: num,
      label: num <= 0 ? 'Out of stock' : (num <= 5 ? `Only ${num} left` : 'In stock'),
      low: num > 0 && num <= 5
    }
  }

  const lower = raw.toLowerCase()
  if (/(out of stock|outofstock|unavailable|sold out|soldout|no stock|0)/.test(lower)) {
    return { inStock: false, qty: 0, label: 'Out of stock', low: false }
  }
  if (/(low stock|limited|few left|last few)/.test(lower)) {
    return { inStock: true, qty: null, label: 'Limited stock', low: true }
  }
  return { inStock: true, qty: null, label: 'In stock', low: false }
}

/* ══════════════════════════════════════════════════════════
   AUDIENCE CLASSIFIER
   Critical: a naive substring check is wrong because the word
   "women" literally contains "men", so a men's search used to
   pull in every women's product. We neutralise the female
   words FIRST, then look for male words on what is left.
══════════════════════════════════════════════════════════ */
const scrubAudienceText = (text) => ` ${String(text || '').toLowerCase()} `
  .replace(/[^a-z0-9\s']/g, ' ')
  /* female terms first — this removes the "men" hidden inside "women" */
  .replace(/\bwom[ae]n'?s?\b/g, ' @fem@ ')
  .replace(/\bladies\b|\blady\b|\bfemale\b|\bfemales\b/g, ' @fem@ ')
  .replace(/\bgirl'?s?\b|\bgirls\b|\bgirlswear\b/g, ' @girl@ ')
  .replace(/\bboy'?s?\b|\bboys\b|\bboyswear\b/g, ' @boy@ ')
  .replace(/\bkid'?s?\b|\bkids\b|\bchildren\b|\bchild\b|\btoddler'?s?\b|\bbaby\b|\bbabies\b|\binfant'?s?\b|\bjunior'?s?\b/g, ' @kid@ ')
  .replace(/\bmen'?s?\b|\bmens\b|\bmale\b|\bmales\b|\bgent'?s?\b|\bgents\b|\bgentlemen\b/g, ' @male@ ')
  .replace(/\bunisex\b/g, ' @uni@ ')
  .replace(/\s+/g, ' ')

/* Returns a Set of audiences this product genuinely belongs to.
   An empty set means genuinely gender-neutral (e.g. Accessories). */
export const audiencesOf = (product) => {
  const out = new Set()
  if (!product) return out

  /* maincategory/subcategory are admin-controlled, so they are the
     most trustworthy signal; name and description back them up. */
  const strong = scrubAudienceText(`${product.maincategory || ''} ${product.subcategory || ''}`)
  const weak = scrubAudienceText(`${product.name || ''} ${product.details || ''}`)

  const scan = (t) => {
    if (t.includes('@fem@')) out.add('women')
    if (t.includes('@girl@')) { out.add('girls'); out.add('kids') }
    if (t.includes('@boy@')) { out.add('boys'); out.add('kids') }
    if (t.includes('@kid@')) out.add('kids')
    if (t.includes('@male@')) out.add('men')
    if (t.includes('@uni@')) out.add('unisex')
  }

  scan(strong)
  /* only fall back to the name when the section says nothing */
  if (out.size === 0) scan(weak)

  return out
}

/* Strict audience match — an explicit women's item never satisfies a
   men's request, and vice versa. Neutral items are allowed only when
   nothing explicit exists (handled by the caller's two-pass logic). */
export const audienceMatches = (audiences, want, { allowNeutral = false } = {}) => {
  if (!want) return true
  const has = (a) => audiences.has(a)
  const isNeutral = audiences.size === 0 || (audiences.size === 1 && has('unisex'))

  switch (want) {
    case 'men':
      if (has('women') || has('kids') || has('boys') || has('girls')) return false
      return has('men') || (allowNeutral && isNeutral)
    case 'women':
      if (has('men') || has('kids') || has('boys') || has('girls')) return false
      return has('women') || (allowNeutral && isNeutral)
    case 'kids':
      return has('kids') || has('boys') || has('girls')
    case 'boys':
      if (has('girls') && !has('boys')) return false
      return has('boys') || has('kids')
    case 'girls':
      if (has('boys') && !has('girls')) return false
      return has('girls') || has('kids')
    default:
      return true
  }
}

export const AUDIENCE_LABELS = {
  men: "men's",
  women: "women's",
  kids: "kids'",
  boys: "boys'",
  girls: "girls'"
}

export const savingsOf = (p) => {
  const base = Number(p?.basePrice || 0)
  const price = Number(p?.price || 0)
  if (base > price && price > 0) return Math.round(base - price)
  return 0
}

const round = (n) => (Number.isFinite(n) ? Math.round(n) : 0)

const median = (arr) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export const PRICE_BAND_DEFS = [
  { key: 'under-499', label: 'Under Rs.499', min: 0, max: 499 },
  { key: '500-999', label: 'Rs.500 - Rs.999', min: 500, max: 999 },
  { key: '1000-1999', label: 'Rs.1000 - Rs.1999', min: 1000, max: 1999 },
  { key: '2000-3499', label: 'Rs.2000 - Rs.3499', min: 2000, max: 3499 },
  { key: '3500-4999', label: 'Rs.3500 - Rs.4999', min: 3500, max: 4999 },
  { key: '5000-plus', label: 'Rs.5000 & above', min: 5000, max: Infinity }
]

export const buildCatalogIntel = (products = []) => {
  const list = (Array.isArray(products) ? products : []).filter(Boolean)

  const tree = new Map()        // maincategory -> { count, subs:Map, prices:[] }
  const brandMap = new Map()    // brand -> { count, prices:[], cats:Set }
  const colorMap = new Map()
  const fabricMap = new Map()
  const sizeMap = new Map()
  const prices = []
  const discounts = []
  const bands = PRICE_BAND_DEFS.map((b) => ({ ...b, count: 0 }))

  let inStockCount = 0
  let outOfStockCount = 0
  let lowStockCount = 0
  let newArrivals = 0
  let onSale = 0

  const audienceCounts = { men: 0, women: 0, kids: 0, boys: 0, girls: 0, neutral: 0 }

  list.forEach((item) => {
    const aud = audiencesOf(item)
    if (aud.has('men')) audienceCounts.men += 1
    if (aud.has('women')) audienceCounts.women += 1
    if (aud.has('kids')) audienceCounts.kids += 1
    if (aud.has('boys')) audienceCounts.boys += 1
    if (aud.has('girls')) audienceCounts.girls += 1
    if (aud.size === 0 || (aud.size === 1 && aud.has('unisex'))) audienceCounts.neutral += 1

    const main = String(item.maincategory || 'Other').trim() || 'Other'
    const sub = String(item.subcategory || '').trim()
    const brand = String(item.brand || '').trim()
    const price = Number(item.price || 0)
    const discount = Number(item.discount || 0)
    const stockInfo = interpretStock(item.stock)

    if (!tree.has(main)) tree.set(main, { count: 0, subs: new Map(), prices: [] })
    const node = tree.get(main)
    node.count += 1
    if (price > 0) node.prices.push(price)
    if (sub) node.subs.set(sub, (node.subs.get(sub) || 0) + 1)

    if (brand) {
      if (!brandMap.has(brand)) brandMap.set(brand, { count: 0, prices: [], cats: new Set() })
      const b = brandMap.get(brand)
      b.count += 1
      if (price > 0) b.prices.push(price)
      if (main) b.cats.add(main)
    }

    String(item.color || '').split(/[,/|]+/).map((c) => c.trim().toLowerCase()).filter(Boolean)
      .forEach((c) => colorMap.set(c, (colorMap.get(c) || 0) + 1))

    const fabric = String(item.fabric || '').trim().toLowerCase()
    if (fabric) fabricMap.set(fabric, (fabricMap.get(fabric) || 0) + 1)

    const sizes = Array.isArray(item.size)
      ? item.size
      : String(item.size || '').split(/[,/|\s]+/)
    sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
      .forEach((s) => sizeMap.set(s, (sizeMap.get(s) || 0) + 1))

    if (price > 0) {
      prices.push(price)
      const band = bands.find((b) => price >= b.min && price <= b.max)
      if (band) band.count += 1
    }
    if (discount > 0) discounts.push(discount)

    if (stockInfo.inStock) inStockCount += 1
    else outOfStockCount += 1
    if (stockInfo.low) lowStockCount += 1

    if (item.newArrival) newArrivals += 1
    if (item.isSale || discount >= 10) onSale += 1
  })

  const categories = Array.from(tree.entries())
    .map(([name, node]) => ({
      name,
      count: node.count,
      minPrice: node.prices.length ? Math.min(...node.prices) : 0,
      maxPrice: node.prices.length ? Math.max(...node.prices) : 0,
      subcategories: Array.from(node.subs.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([sname, scount]) => ({ name: sname, count: scount }))
    }))
    .sort((a, b) => b.count - a.count)

  const brands = Array.from(brandMap.entries())
    .map(([name, b]) => ({
      name,
      count: b.count,
      minPrice: b.prices.length ? Math.min(...b.prices) : 0,
      maxPrice: b.prices.length ? Math.max(...b.prices) : 0,
      categories: Array.from(b.cats)
    }))
    .sort((a, b) => b.count - a.count)

  const topBy = (arr, keyFn, n) => [...arr].sort((a, b) => keyFn(b) - keyFn(a)).slice(0, n)

  const bestDeals = topBy(list.filter((p) => Number(p.discount || 0) > 0), (p) => Number(p.discount || 0), 8)
  const biggestSavings = topBy(list, savingsOf, 6).filter((p) => savingsOf(p) > 0)
  const topRated = topBy(
    list.filter((p) => Number(p.rating || 0) > 0),
    (p) => Number(p.rating || 0) * 100 + Math.min(Number(p.reviews || 0), 99),
    8
  )
  const newest = [...list]
    .filter((p) => p.createdAt || p.newArrival)
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
    .slice(0, 8)
  const cheapest = [...list].filter((p) => Number(p.price) > 0).sort((a, b) => a.price - b.price).slice(0, 6)
  const premium = [...list].filter((p) => Number(p.price) > 0).sort((a, b) => b.price - a.price).slice(0, 6)

  return {
    totalProducts: list.length,
    audienceCounts,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      avg: prices.length ? round(prices.reduce((s, v) => s + v, 0) / prices.length) : 0,
      median: median(prices)
    },
    discountStats: {
      count: discounts.length,
      avg: discounts.length ? round(discounts.reduce((s, v) => s + v, 0) / discounts.length) : 0,
      max: discounts.length ? Math.max(...discounts) : 0
    },
    stock: { inStockCount, outOfStockCount, lowStockCount },
    newArrivals,
    onSale,
    categories,
    brands,
    priceBands: bands.filter((b) => b.count > 0),
    colors: Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([name, count]) => ({ name, count })),
    fabrics: Array.from(fabricMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count })),
    sizes: Array.from(sizeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([name, count]) => ({ name, count })),
    bestDeals,
    biggestSavings,
    topRated,
    newest,
    cheapest,
    premium
  }
}

/* One-line product descriptor used inside AI prompts */
export const productLine = (p, index) => {
  if (!p) return ''
  const stockInfo = interpretStock(p.stock)
  const bits = [
    `${index !== undefined ? `${index + 1}. ` : ''}${p.name}`,
    p.brand ? `brand=${p.brand}` : '',
    [p.maincategory, p.subcategory].filter(Boolean).join('>') ? `cat=${[p.maincategory, p.subcategory].filter(Boolean).join('>')}` : '',
    Number(p.price) > 0 ? `price=Rs.${p.price}` : '',
    Number(p.basePrice) > Number(p.price) ? `mrp=Rs.${p.basePrice}` : '',
    Number(p.discount) > 0 ? `discount=${p.discount}%` : '',
    savingsOf(p) > 0 ? `save=Rs.${savingsOf(p)}` : '',
    p.color ? `color=${p.color}` : '',
    p.fabric ? `fabric=${p.fabric}` : '',
    (Array.isArray(p.size) ? p.size.join('/') : p.size) ? `sizes=${Array.isArray(p.size) ? p.size.join('/') : p.size}` : '',
    Number(p.rating) > 0 ? `rating=${p.rating}${Number(p.reviews) > 0 ? `(${p.reviews})` : ''}` : '',
    `stock=${stockInfo.label}`,
    p.newArrival ? 'NEW' : '',
    p.isSale ? 'ON-SALE' : ''
  ].filter(Boolean)
  return bits.join(' | ')
}

export const formatCatalogIntel = (intel, admin = null) => {
  if (!intel || !intel.totalProducts) return 'Catalog data not loaded yet.'

  const cats = intel.categories.slice(0, 12).map((c) => {
    const subs = c.subcategories.slice(0, 8).map((s) => `${s.name}(${s.count})`).join(', ')
    return `  - ${c.name}: ${c.count} items, Rs.${c.minPrice}-Rs.${c.maxPrice}${subs ? ` | subcategories: ${subs}` : ''}`
  }).join('\n')

  const brands = intel.brands.slice(0, 12).map((b) => `${b.name}(${b.count}, Rs.${b.minPrice}-${b.maxPrice})`).join(', ')
  const bands = intel.priceBands.map((b) => `${b.label}: ${b.count}`).join(' | ')
  const colors = intel.colors.slice(0, 10).map((c) => `${c.name}(${c.count})`).join(', ')
  const fabrics = intel.fabrics.slice(0, 8).map((f) => `${f.name}(${f.count})`).join(', ')
  const sizes = intel.sizes.slice(0, 12).map((s) => `${s.name}(${s.count})`).join(', ')
  const deals = intel.bestDeals.slice(0, 5).map((p) => `${p.name} ${p.discount}% off @Rs.${p.price}`).join('; ')
  const rated = intel.topRated.slice(0, 5).map((p) => `${p.name} ${p.rating}/5`).join('; ')
  const ac = intel.audienceCounts || {}

  const adminLines = admin ? [
    admin.maincategories?.length ? `- Official sections (set by the store admin): ${admin.maincategories.join(', ')}` : '',
    admin.subcategories?.length ? `- Official subcategories: ${admin.subcategories.slice(0, 40).join(', ')}` : '',
    admin.brands?.length ? `- Official brand list: ${admin.brands.slice(0, 30).join(', ')}` : ''
  ].filter(Boolean) : []

  return [
    `LIVE CATALOG SNAPSHOT`,
    `- Total products: ${intel.totalProducts} (in stock ${intel.stock.inStockCount}, out of stock ${intel.stock.outOfStockCount}, low stock ${intel.stock.lowStockCount})`,
    `- By shopper: men ${ac.men || 0} | women ${ac.women || 0} | kids ${ac.kids || 0} (boys ${ac.boys || 0}, girls ${ac.girls || 0}) | gender-neutral ${ac.neutral || 0}`,
    `- Price range: Rs.${intel.priceRange.min} - Rs.${intel.priceRange.max} (avg Rs.${intel.priceRange.avg}, median Rs.${intel.priceRange.median})`,
    `- Discounts: ${intel.discountStats.count} items discounted, avg ${intel.discountStats.avg}%, max ${intel.discountStats.max}%`,
    `- New arrivals: ${intel.newArrivals} | On sale: ${intel.onSale}`,
    `- Price buckets: ${bands}`,
    `- Categories:\n${cats}`,
    ...adminLines,
    brands ? `- Brands: ${brands}` : '',
    colors ? `- Colours available: ${colors}` : '',
    fabrics ? `- Fabrics available: ${fabrics}` : '',
    sizes ? `- Sizes available: ${sizes}` : '',
    deals ? `- Biggest live discounts: ${deals}` : '',
    rated ? `- Highest rated: ${rated}` : ''
  ].filter(Boolean).join('\n')
}

/* When the exact request has no match, offer the closest sensible pivots */
export const buildAlternatives = ({ intel, slots }) => {
  if (!intel || !intel.totalProducts) return []
  const out = []

  if (slots?.budget?.max) {
    const band = intel.priceBands.find((b) => b.min <= slots.budget.max && slots.budget.max <= b.max)
    const nextBand = intel.priceBands.find((b) => b.min > (slots.budget.max || 0) && b.count > 0)
    if (band && band.count === 0 && nextBand) out.push(`stretch budget to ${nextBand.label} (${nextBand.count} options)`)
    else if (nextBand) out.push(`slightly higher budget ${nextBand.label} has ${nextBand.count} options`)
  }
  if (slots?.colors?.length) {
    const top = intel.colors.slice(0, 3).map((c) => c.name).filter((c) => !slots.colors.includes(c))
    if (top.length) out.push(`popular colours in stock: ${top.join(', ')}`)
  }
  if (slots?.categories?.length) {
    const top = intel.categories.slice(0, 3).map((c) => `${c.name} (${c.count})`)
    if (top.length) out.push(`well-stocked sections: ${top.join(', ')}`)
  }
  if (intel.bestDeals.length) {
    out.push(`current best deal: ${intel.bestDeals[0].name} at ${intel.bestDeals[0].discount}% off`)
  }
  return out.slice(0, 4)
}
