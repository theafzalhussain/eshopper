import axios from 'axios'
import { BASE_URL } from '../../constants'
import {
  OCCASION_MAP, CATEGORY_SYNONYMS
} from './constants'
import { normalizeProduct } from './productUtils'
import { interpretStock, savingsOf, audiencesOf, audienceMatches, AUDIENCE_LABELS } from './catalogIntel'
import { extractSlots, classifyIntent, PRODUCT_INTENTS } from './intentEngine'

/* ══════════════════════════════════════════════════════════
   SOURCE DATA
══════════════════════════════════════════════════════════ */
let apiProductsCache = null
let apiProductsPromise = null
const indexCache = new WeakMap()

const isNormalized = (item) => Boolean(item) && typeof item === 'object' && 'price' in item && 'maincategory' in item && 'link' in item

const normalizeList = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return []
  /* keep the same array reference when nothing needs converting so the
     WeakMap search index stays warm between turns */
  if (list.every(isNormalized)) return list
  return list.map((item) => (isNormalized(item) ? item : normalizeProduct(item))).filter(Boolean)
}

export const getApiProducts = async () => {
  if (Array.isArray(apiProductsCache) && apiProductsCache.length > 0) return apiProductsCache
  if (apiProductsPromise) return apiProductsPromise

  apiProductsPromise = axios.get(`${BASE_URL}/product`, { timeout: 12000 })
    .then(({ data }) => {
      const normalized = normalizeList(Array.isArray(data) ? data : [])
      apiProductsCache = normalized
      return normalized
    })
    .catch(() => [])
    .finally(() => { apiProductsPromise = null })

  return apiProductsPromise
}

const sizeListOf = (value) => {
  if (!value) return []
  const arr = Array.isArray(value) ? value : String(value).split(/[,/|\s]+/)
  return arr.map((v) => String(v).trim().toUpperCase()).filter(Boolean)
}

const toEntry = (item) => {
  const stockInfo = interpretStock(item.stock)
  return {
    item,
    bag: `${item.name} ${item.maincategory} ${item.subcategory} ${item.brand} ${item.color} ${item.fabric} ${item.details}`.toLowerCase(),
    nameLower: String(item.name || '').toLowerCase(),
    catLower: `${item.maincategory} ${item.subcategory}`.toLowerCase(),
    audiences: audiencesOf(item),
    sizes: sizeListOf(item.size),
    price: Number(item.price || 0),
    discount: Number(item.discount || 0),
    rating: Number(item.rating || 0),
    reviews: Number(item.reviews || 0),
    inStock: stockInfo.inStock,
    stockLabel: stockInfo.label,
    lowStock: stockInfo.low
  }
}

const getIndex = (list = []) => {
  if (!Array.isArray(list)) return []
  if (indexCache.has(list)) return indexCache.get(list)
  const indexed = list.map(toEntry)
  indexCache.set(list, indexed)
  return indexed
}

/* ══════════════════════════════════════════════════════════
   MATCH HELPERS
══════════════════════════════════════════════════════════ */
const matchesCategory = (entry, categories = []) => {
  if (!categories.length) return false
  return categories.some((canonical) => {
    const phrases = CATEGORY_SYNONYMS[canonical] || [canonical]
    return phrases.some((p) => entry.bag.includes(p))
  })
}

const matchesOccasion = (entry, occasions = []) => {
  if (!occasions.length) return false
  return occasions.some((key) => {
    const cfg = OCCASION_MAP[key]
    if (!cfg) return false
    if (cfg.words.some((w) => entry.bag.includes(w))) return true
    if (cfg.hints.some((h) => entry.bag.includes(h))) return true
    return cfg.types.some((t) => (CATEGORY_SYNONYMS[t] || []).some((p) => entry.bag.includes(p)))
  })
}

const inBudget = (price, budget) => {
  if (!budget) return true
  if (!Number.isFinite(price) || price <= 0) return true
  if (budget.min !== null && budget.min !== undefined && price < budget.min) return false
  if (budget.max !== null && budget.max !== undefined && price > budget.max) return false
  return true
}

const isRecent = (isoDate, days = 45) => {
  if (!isoDate) return false
  const t = Date.parse(isoDate)
  if (!Number.isFinite(t)) return false
  return Date.now() - t <= days * 24 * 60 * 60 * 1000
}

/* ══════════════════════════════════════════════════════════
   SCORING — every signal contributes, nothing is all-or-nothing
══════════════════════════════════════════════════════════ */
const STOP_TOKENS = new Set([
  'show', 'me', 'my', 'i', 'a', 'an', 'the', 'for', 'and', 'or', 'to', 'of', 'in', 'on', 'with',
  'please', 'need', 'want', 'looking', 'find', 'search', 'suggest', 'recommend', 'give', 'some',
  'any', 'good', 'best', 'nice', 'options', 'option', 'product', 'products', 'item', 'items',
  'image', 'images', 'photo', 'pic', 'pics', 'buy', 'purchase', 'order', 'rs', 'rupees',
  'ki', 'ke', 'ka', 'kya', 'mujhe', 'hai', 'hain', 'chahiye', 'dikhao', 'batao', 'do', 'de',
  'aur', 'ya', 'ko', 'se', 'wala', 'wali', 'liye', 'under', 'below', 'above', 'around', 'upto'
])

const tokenize = (text = '') => text
  .split(/[^a-z0-9]+/)
  .filter((t) => t && t.length > 1 && !STOP_TOKENS.has(t))

const scoreEntry = ({ entry, tokens, slots, audienceOpts = {} }) => {
  let score = 0
  const reasons = []

  /* free-text relevance */
  tokens.forEach((token) => {
    if (entry.nameLower.includes(token)) score += 6
    else if (entry.catLower.includes(token)) score += 4
    else if (entry.bag.includes(token)) score += 2
  })

  if (slots.audience) {
    if (entry.audiences.has(slots.audience)) {
      score += 18
      reasons.push(`${AUDIENCE_LABELS[slots.audience] || slots.audience} section`)
    } else if (audienceMatches(entry.audiences, slots.audience, { allowNeutral: true })) {
      score += 6
      reasons.push('works for everyone')
    } else {
      /* wrong gender should never surface for a gendered request */
      score -= 200
    }
  }

  if (matchesCategory(entry, slots.categories)) {
    score += 16
    reasons.push(slots.categories[0])
  }

  if (matchesOccasion(entry, slots.occasions)) {
    score += 12
    const label = OCCASION_MAP[slots.occasions[0]]?.label || slots.occasions[0]
    reasons.push(`works for ${label}`)
  }

  if (slots.colors?.length) {
    const hit = slots.colors.find((c) => entry.bag.includes(c))
    if (hit) { score += 10; reasons.push(`${hit} shade`) }
  }

  if (slots.fabrics?.length) {
    const hit = slots.fabrics.find((f) => entry.bag.includes(f))
    if (hit) { score += 8; reasons.push(`${hit} fabric`) }
  }

  if (slots.fits?.length) {
    const hit = slots.fits.find((f) => entry.bag.includes(f))
    if (hit) { score += 6; reasons.push(hit) }
  }

  if (slots.patterns?.length) {
    const hit = slots.patterns.find((p) => entry.bag.includes(p))
    if (hit) { score += 5; reasons.push(hit) }
  }

  if (slots.brands?.length) {
    const hit = slots.brands.find((b) => entry.bag.includes(String(b).toLowerCase()))
    if (hit) { score += 12; reasons.push(hit) }
  }

  if (slots.sizes?.length) {
    const hit = slots.sizes.find((s) => entry.sizes.includes(String(s).toUpperCase()))
    if (hit) { score += 9; reasons.push(`size ${hit} available`) }
  }

  if (slots.budget) {
    if (inBudget(entry.price, slots.budget)) {
      score += 10
      if (slots.budget.max) reasons.push(`fits under Rs.${slots.budget.max}`)
    } else {
      score -= 12
    }
  }

  if (slots.wantsSale || slots.discountMin) {
    const min = slots.discountMin || 10
    if (entry.discount >= min) { score += 12; reasons.push(`${entry.discount}% off`) }
    else score -= 6
  }

  if (slots.wantsNewArrival) {
    if (entry.item.newArrival || isRecent(entry.item.createdAt)) { score += 12; reasons.push('new arrival') }
    else score -= 6
  }

  if (slots.wantsTopRated || slots.ratingMin) {
    const min = slots.ratingMin || 4.3
    if (entry.rating >= min) { score += 10; reasons.push(`rated ${entry.rating}/5`) }
    else score -= 5
  }

  if (slots.wantsTrending) {
    if (entry.rating >= 4.3 || entry.reviews >= 5 || entry.discount >= 15) { score += 9; reasons.push('popular pick') }
  }

  if (slots.wantsCheapest && entry.price > 0) score += Math.max(0, 8 - Math.floor(entry.price / 500))
  if (slots.wantsPremium && entry.price > 0) score += Math.min(8, Math.floor(entry.price / 1000))

  /* universal quality signals — keeps results sensible for vague queries */
  if (entry.rating >= 4.5) score += 3
  else if (entry.rating >= 4) score += 1.5
  if (entry.reviews >= 10) score += 1.5
  if (entry.discount >= 30) score += 3
  else if (entry.discount >= 15) score += 1.5
  if (!entry.inStock) score -= 25
  if (entry.lowStock) score += 1

  return { score, reasons }
}

/* ══════════════════════════════════════════════════════════
   PROGRESSIVE FILTERING
   Audience is STICKY — a men's request must never return women's
   or kids' products, no matter how thin the results get. Everything
   else can be loosened so the assistant always has something to show.
══════════════════════════════════════════════════════════ */
const buildFilterChain = (slots, audienceOpts = {}) => {
  const chain = []

  if (slots.audience) {
    chain.push({
      key: 'audience',
      weight: 1000,
      sticky: true,
      test: (e) => audienceMatches(e.audiences, slots.audience, audienceOpts)
    })
  }
  if (slots.categories?.length) {
    chain.push({ key: 'category', weight: 95, test: (e) => matchesCategory(e, slots.categories) })
  }
  if (slots.budget) {
    chain.push({ key: 'budget', weight: 80, test: (e) => inBudget(e.price, slots.budget) })
  }
  if (slots.brands?.length) {
    chain.push({ key: 'brand', weight: 70, test: (e) => slots.brands.some((b) => e.bag.includes(String(b).toLowerCase())) })
  }
  if (slots.sizes?.length) {
    chain.push({ key: 'size', weight: 60, test: (e) => slots.sizes.some((s) => e.sizes.includes(String(s).toUpperCase())) })
  }
  if (slots.occasions?.length) {
    chain.push({ key: 'occasion', weight: 55, test: (e) => matchesOccasion(e, slots.occasions) })
  }
  if (slots.colors?.length) {
    chain.push({ key: 'color', weight: 45, test: (e) => slots.colors.some((c) => e.bag.includes(c)) })
  }
  if (slots.wantsNewArrival) {
    chain.push({ key: 'newArrival', weight: 40, test: (e) => e.item.newArrival || isRecent(e.item.createdAt) })
  }
  if (slots.wantsSale || slots.discountMin) {
    const min = slots.discountMin || 10
    chain.push({ key: 'discount', weight: 38, test: (e) => e.discount >= min || e.item.isSale })
  }
  if (slots.wantsTopRated || slots.ratingMin) {
    const min = slots.ratingMin || 4.3
    chain.push({ key: 'rating', weight: 35, test: (e) => e.rating >= min })
  }
  if (slots.fabrics?.length) {
    chain.push({ key: 'fabric', weight: 30, test: (e) => slots.fabrics.some((f) => e.bag.includes(f)) })
  }
  if (slots.fits?.length) {
    chain.push({ key: 'fit', weight: 25, test: (e) => slots.fits.some((f) => e.bag.includes(f)) })
  }

  return chain.sort((a, b) => b.weight - a.weight)
}

const applyChain = (entries, chain) => entries.filter((e) => chain.every((f) => f.test(e)))

const applySort = (rows, slots) => {
  const byScore = (a, b) => b.score - a.score
  switch (slots.sortBy) {
    case 'price_asc': return rows.sort((a, b) => (a.entry.price || Infinity) - (b.entry.price || Infinity) || byScore(a, b))
    case 'price_desc': return rows.sort((a, b) => (b.entry.price || 0) - (a.entry.price || 0) || byScore(a, b))
    case 'rating': return rows.sort((a, b) => b.entry.rating - a.entry.rating || byScore(a, b))
    case 'discount': return rows.sort((a, b) => b.entry.discount - a.entry.discount || byScore(a, b))
    case 'newest': return rows.sort((a, b) => Date.parse(b.entry.item.createdAt || 0) - Date.parse(a.entry.item.createdAt || 0) || byScore(a, b))
    default: return rows.sort(byScore)
  }
}

const buildReason = (entry, reasons, slots) => {
  const unique = Array.from(new Set(reasons.filter(Boolean)))
  const extras = []
  if (entry.discount >= 20 && !unique.some((r) => r.includes('off'))) extras.push(`${entry.discount}% off`)
  if (entry.rating >= 4.5 && !unique.some((r) => r.includes('rated'))) extras.push(`${entry.rating}/5 rated`)
  if (savingsOf(entry.item) >= 300) extras.push(`saves Rs.${savingsOf(entry.item)}`)
  if (entry.lowStock) extras.push(entry.stockLabel.toLowerCase())
  if (!entry.inStock) extras.push('currently out of stock')
  if (!unique.length && !extras.length) {
    if (slots.wantsCheapest) extras.push('most affordable in this set')
    else extras.push('strong all-round pick')
  }
  return [...unique.slice(0, 3), ...extras.slice(0, 2)].join(' · ')
}

/* ══════════════════════════════════════════════════════════
   PUBLIC SEARCH
══════════════════════════════════════════════════════════ */
export const searchProducts = ({
  slots = {},
  products = [],
  preferred = [],
  limit = 6,
  requireInStock = true
} = {}) => {
  const all = normalizeList(products)
  if (all.length === 0) {
    return { products: [], matchQuality: 'no-data', relaxedOn: [], totalMatches: 0 }
  }

  const usePreferred = slots.referenceAsked && Array.isArray(preferred) && preferred.length > 0
  const base = getIndex(usePreferred ? normalizeList(preferred) : all)
  const tokens = tokenize(slots.text || '')

  /* Audience is resolved in two passes: prefer products explicitly tagged
     for that shopper; only fall back to gender-neutral items when the
     section genuinely has nothing explicit. Wrong gender is never allowed. */
  const hasExplicitAudience = slots.audience
    ? base.some((e) => e.audiences.has(slots.audience))
    : false
  const audienceOpts = { allowNeutral: !hasExplicitAudience }

  /* Filters split into tiers:
     STICKY (audience) — never broken.
     CORE (category, budget, brand) — broken only when nothing matched.
     SOFT (size, occasion, colour, tags, fabric, fit) — loosened to widen
     a thin result set, so the reply is never a dead end. */
  const CORE_WEIGHT = 70
  let active = buildFilterChain(slots, audienceOpts)
  const stickyChain = active.filter((f) => f.sticky)
  const relaxedOn = []
  let pool = applyChain(base, active)

  const dropAt = (idx) => {
    const dropped = active[idx]
    const next = active.filter((_, i) => i !== idx)
    const nextPool = applyChain(base, next)
    active = next
    if (nextPool.length > pool.length) relaxedOn.push(dropped.key)
    pool = nextPool
  }

  const lastIndexWhere = (fn) => {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (fn(active[i])) return i
    }
    return -1
  }

  /* phase 1 — widen using soft, non-sticky filters only */
  for (let guard = 0; guard < 12 && pool.length < 3; guard += 1) {
    const idx = lastIndexWhere((f) => !f.sticky && f.weight < CORE_WEIGHT)
    if (idx === -1) break
    dropAt(idx)
  }

  /* phase 2 — nothing matched at all, so give up core filters (never sticky) */
  for (let guard = 0; guard < 12 && pool.length === 0; guard += 1) {
    const idx = lastIndexWhere((f) => !f.sticky)
    if (idx === -1) break
    dropAt(idx)
  }

  /* last resort — everything that belongs to this shopper, ranked by score */
  if (pool.length === 0 && usePreferred) {
    const wholeCatalog = getIndex(all)
    pool = applyChain(wholeCatalog, stickyChain)
    if (pool.length > 0) relaxedOn.push('previous-selection')
  }
  if (pool.length === 0) {
    pool = stickyChain.length ? applyChain(base, stickyChain) : base
  }

  /* If the shopper's section is genuinely empty we return nothing rather
     than showing the wrong gender — the reply then says so honestly. */
  if (pool.length === 0) {
    return {
      products: [],
      matchQuality: 'none',
      relaxedOn,
      totalMatches: 0,
      audienceEmpty: Boolean(slots.audience)
    }
  }

  if (requireInStock) {
    const inStockPool = pool.filter((e) => e.inStock)
    if (inStockPool.length >= Math.min(3, pool.length)) pool = inStockPool
  }

  const scored = pool.map((entry) => {
    const { score, reasons } = scoreEntry({ entry, tokens, slots, audienceOpts })
    return { entry, score, reasons }
  })

  const sorted = applySort(scored, slots)
  const take = Math.max(1, Math.min(Number(slots.limit || limit) || limit, 8))

  const picked = sorted.slice(0, take).map(({ entry, score, reasons }) => ({
    ...entry.item,
    matchScore: Math.round(score),
    matchReason: buildReason(entry, reasons, slots),
    stockLabel: entry.stockLabel,
    inStock: entry.inStock,
    savings: savingsOf(entry.item)
  }))

  const matchQuality = relaxedOn.length === 0
    ? (picked.length ? 'exact' : 'none')
    : (relaxedOn.length <= 1 ? 'partial' : 'relaxed')

  return {
    products: picked,
    matchQuality,
    relaxedOn,
    totalMatches: sorted.filter((r) => r.score > 0).length
  }
}

/* ══════════════════════════════════════════════════════════
   BACKWARD-COMPATIBLE WRAPPERS
══════════════════════════════════════════════════════════ */
export const getQueryFilters = (query = '') => {
  const slots = extractSlots(query)
  return {
    ...slots,
    lower: slots.text,
    wantsMens: slots.audience === 'men',
    wantsWomens: slots.audience === 'women',
    wantsKids: slots.audience === 'kids',
    wantsBoys: slots.audience === 'boys',
    wantsGirls: slots.audience === 'girls',
    productTypes: slots.categoryPhrases || []
  }
}

export const shouldShowProducts = (text = '') => {
  const slots = extractSlots(text)
  const intent = classifyIntent({ text, slots, lastProducts: [] })
  return PRODUCT_INTENTS.has(intent)
}

export const fetchProductsFromShop = async (query, options = {}) => {
  try {
    const cached = Array.isArray(options.cachedProducts) && options.cachedProducts.length
      ? options.cachedProducts
      : await getApiProducts()

    const slots = options.slots || extractSlots(query, options.brandList || [])
    const result = searchProducts({
      slots,
      products: cached,
      preferred: options.preferredProducts || [],
      limit: options.limit || 6
    })
    return result.products
  } catch {
    return []
  }
}

export const searchCatalog = async (query, options = {}) => {
  const cached = Array.isArray(options.cachedProducts) && options.cachedProducts.length
    ? options.cachedProducts
    : await getApiProducts()

  const slots = options.slots || extractSlots(query, options.brandList || [])
  return searchProducts({
    slots,
    products: cached,
    preferred: options.preferredProducts || [],
    limit: options.limit || 6
  })
}
