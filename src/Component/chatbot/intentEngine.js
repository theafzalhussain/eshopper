import {
  CATEGORY_SYNONYMS, CATEGORY_LOOKUP, PRODUCT_TYPE_KEYWORDS,
  OCCASION_MAP, COLOR_KEYWORDS, SIZE_KEYWORDS, FABRIC_KEYWORDS,
  FIT_KEYWORDS, PATTERN_KEYWORDS,
  MEN_WORDS, WOMEN_WORDS, KIDS_WORDS, BOYS_WORDS, GIRLS_WORDS,
  REFERENCE_WORDS
} from './constants'
import {
  normalizeIntentText, containsAnyWord,
  isGreetingMessage, isHowAreYouQuery, isThanksMessage, isGoodbyeMessage,
  isComplaintMessage, isComparisonQuery, isOutfitQuery, isSizeHelpQuery,
  isProductDetailsQuery
} from './languageUtils'

export const EMPTY_SLOTS = {
  audience: null,
  categories: [],
  occasions: [],
  colors: [],
  sizes: [],
  fabrics: [],
  fits: [],
  patterns: [],
  brands: [],
  budget: null,
  discountMin: null,
  ratingMin: null,
  sortBy: null,
  wantsNewArrival: false,
  wantsSale: false,
  wantsTrending: false,
  wantsTopRated: false,
  wantsInStock: false,
  wantsCheapest: false,
  wantsPremium: false,
  referenceAsked: false,
  limit: null
}

/* ══════════════════════════════════════════════════════════
   BUDGET PARSING
══════════════════════════════════════════════════════════ */
const toNumber = (raw) => {
  if (raw === undefined || raw === null) return NaN
  const cleaned = String(raw).replace(/[,\s]/g, '').toLowerCase()
  const kMatch = cleaned.match(/^(\d+(?:\.\d+)?)k$/)
  if (kMatch) return Math.round(Number(kMatch[1]) * 1000)
  return Number(cleaned)
}

const NUM = '(\\d[\\d,]*(?:\\.\\d+)?k?)'

export const parseBudget = (text = '') => {
  if (!text) return null
  const t = text.replace(/rupees|rupaye|rupay|rs\.?|inr/g, ' ').replace(/\s+/g, ' ')

  const between = t.match(new RegExp(`(?:between|from|se)\\s*${NUM}\\s*(?:and|to|-|se)\\s*${NUM}`))
  if (between) {
    const min = toNumber(between[1]); const max = toNumber(between[2])
    if (Number.isFinite(min) && Number.isFinite(max)) return { min: Math.min(min, max), max: Math.max(min, max) }
  }

  const range = t.match(new RegExp(`${NUM}\\s*-\\s*${NUM}`))
  if (range) {
    const min = toNumber(range[1]); const max = toNumber(range[2])
    if (Number.isFinite(min) && Number.isFinite(max) && max > min && max >= 100) {
      return { min, max }
    }
  }

  const under = t.match(new RegExp(`(?:under|below|upto|up to|less than|within|maximum|max|tak|ke andar|se kam|niche)\\s*${NUM}`))
  if (under) {
    const max = toNumber(under[1])
    if (Number.isFinite(max)) return { min: 0, max }
  }

  const underSuffix = t.match(new RegExp(`${NUM}\\s*(?:tak|ke andar|se kam|or less|or below)`))
  if (underSuffix) {
    const max = toNumber(underSuffix[1])
    if (Number.isFinite(max)) return { min: 0, max }
  }

  const over = t.match(new RegExp(`(?:above|over|more than|greater than|minimum|at least|se upar|se zyada)\\s*${NUM}`))
  if (over) {
    const min = toNumber(over[1])
    if (Number.isFinite(min)) return { min, max: null }
  }

  const around = t.match(new RegExp(`(?:around|approx|approximately|near|about|roughly|lagbhag|karib|budget(?:\\s+is)?(?:\\s+of)?)\\s*${NUM}`))
  if (around) {
    const center = toNumber(around[1])
    if (Number.isFinite(center) && center > 0) {
      return { min: Math.max(0, Math.round(center * 0.75)), max: Math.round(center * 1.25) }
    }
  }

  /* bare "budget 3000" / "3000 ka" */
  const bare = t.match(new RegExp(`${NUM}\\s*(?:ka|ke|wala|walla)\\b`))
  if (bare) {
    const center = toNumber(bare[1])
    if (Number.isFinite(center) && center >= 100) {
      return { min: Math.max(0, Math.round(center * 0.75)), max: Math.round(center * 1.25) }
    }
  }

  return null
}

/* ══════════════════════════════════════════════════════════
   SLOT EXTRACTION
══════════════════════════════════════════════════════════ */
const pickPhrases = (text, list) => {
  const found = []
  list.forEach((phrase) => {
    if (!phrase) return
    if (phrase.includes(' ')) {
      if (text.includes(phrase)) found.push(phrase)
      return
    }
    if (new RegExp(`(^|\\s)${phrase}(s|es)?($|\\s)`).test(text)) found.push(phrase)
  })
  return Array.from(new Set(found))
}

const extractSizes = (text) => {
  const sizes = new Set()

  const explicit = text.match(/\bsize\s*[:=-]?\s*(xxs|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|free size|\d{2})\b/g) || []
  explicit.forEach((m) => {
    const v = m.replace(/\bsize\s*[:=-]?\s*/, '').trim().toUpperCase()
    if (v) sizes.add(v)
  })

  /* multi-char letter sizes are safe to match anywhere;
     bare numbers are not (e.g. "40 percent off" is not size 40) */
  SIZE_KEYWORDS.forEach((size) => {
    if (size.length < 2) return
    if (/^\d+$/.test(size)) return
    if (new RegExp(`(^|\\s)${size}($|\\s)`).test(text)) sizes.add(size.toUpperCase())
  })

  /* single letters (s/m/l) only when clearly a size mention */
  const single = text.match(/\b(?:size|in)\s+(s|m|l)\b/)
  if (single) sizes.add(single[1].toUpperCase())

  /* numeric sizes only with explicit waist/size context */
  const waist = text.match(/\b(?:waist|size)\s*(\d{2})\b/)
  if (waist) sizes.add(waist[1])

  const waistSuffix = text.match(/\b(\d{2})\s*(?:waist|inch|inches)\b/)
  if (waistSuffix) sizes.add(waistSuffix[1])

  return Array.from(sizes)
}

const extractSort = (text) => {
  if (/\b(cheapest|lowest price|sasta|sabse sasta|low to high|budget friendly|kam price|kam daam)\b/.test(text)) return 'price_asc'
  if (/\b(most expensive|highest price|premium|luxury|high to low|mehnga|sabse mehnga)\b/.test(text)) return 'price_desc'
  if (/\b(best rated|top rated|highest rated|best reviewed|most loved)\b/.test(text)) return 'rating'
  if (/\b(newest|latest|new arrival|new arrivals|just launched|fresh|naya|nayi)\b/.test(text)) return 'newest'
  if (/\b(biggest discount|max discount|highest discount|best deal|best offer|sabse zyada discount)\b/.test(text)) return 'discount'
  return null
}

const extractLimit = (text) => {
  const m = text.match(/\b(?:top|best|show me|give me|first)\s+(\d{1,2})\b/)
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n >= 1 && n <= 12) return n
  }
  if (/\b(one|ek)\s+(option|suggestion|product|piece)\b/.test(text)) return 1
  return null
}

export const extractSlots = (rawText = '', brandList = []) => {
  const text = normalizeIntentText(rawText)
  if (!text) return { ...EMPTY_SLOTS, raw: '', text: '' }

  const occasions = Object.entries(OCCASION_MAP)
    .filter(([, cfg]) => cfg.words.some((w) => (w.includes(' ') ? text.includes(w) : new RegExp(`(^|\\s)${w}($|\\s)`).test(text))))
    .map(([key]) => key)

  const typeHits = pickPhrases(text, PRODUCT_TYPE_KEYWORDS)
  const categories = Array.from(new Set(typeHits.map((t) => CATEGORY_LOOKUP[t]).filter(Boolean)))

  const audience = containsAnyWord(text, BOYS_WORDS) ? 'boys'
    : containsAnyWord(text, GIRLS_WORDS) ? 'girls'
      : containsAnyWord(text, KIDS_WORDS) ? 'kids'
        : containsAnyWord(text, MEN_WORDS) ? 'men'
          : containsAnyWord(text, WOMEN_WORDS) ? 'women'
            : null

  const brands = (Array.isArray(brandList) ? brandList : [])
    .map((b) => String(b || '').trim())
    .filter((b) => b.length >= 3 && text.includes(b.toLowerCase()))

  const discountMatch = text.match(/(\d{1,2})\s*(?:percent|pct)/)
  const minDiscountAsked = /\b(discount|off|sale|offer|deal)\b/.test(text)

  const ratingMatch = text.match(/(\d(?:\.\d)?)\s*(?:\+|star|stars|rating)/)

  return {
    raw: String(rawText || ''),
    text,
    audience,
    categories,
    categoryPhrases: typeHits,
    occasions,
    colors: pickPhrases(text, COLOR_KEYWORDS),
    sizes: extractSizes(text),
    fabrics: pickPhrases(text, FABRIC_KEYWORDS),
    fits: pickPhrases(text, FIT_KEYWORDS),
    patterns: pickPhrases(text, PATTERN_KEYWORDS),
    brands,
    budget: parseBudget(text),
    discountMin: discountMatch && minDiscountAsked ? Number(discountMatch[1]) : null,
    ratingMin: ratingMatch ? Number(ratingMatch[1]) : null,
    sortBy: extractSort(text),
    wantsNewArrival: /\b(new arrival|new arrivals|newest|latest|just launched|just in|fresh stock|naya|nayi|new collection)\b/.test(text),
    wantsSale: /\b(sale|discount|discounted|offer|offers|deal|deals|clearance|off|bargain|loot|sasta)\b/.test(text),
    wantsTrending: /\b(trending|popular|hot|bestseller|best seller|best selling|top pick|top picks|viral|famous|most bought)\b/.test(text),
    wantsTopRated: /\b(top rated|best rated|highest rated|best reviewed|good rating|acchi rating)\b/.test(text),
    wantsInStock: /\b(in stock|available|availability|stock me|stock hai|deliverable)\b/.test(text),
    wantsCheapest: /\b(cheapest|sasta|sabse sasta|lowest price|budget friendly|kam paise|affordable)\b/.test(text),
    wantsPremium: /\b(premium|luxury|high end|expensive|best quality|designer|mehnga)\b/.test(text),
    referenceAsked: containsAnyWord(text, REFERENCE_WORDS),
    limit: extractLimit(text)
  }
}

/* ══════════════════════════════════════════════════════════
   SLOT MEMORY
   New turn wins, but unset fields inherit from memory so
   "under 2000" after "party wear for women" still works.
══════════════════════════════════════════════════════════ */
const mergeList = (next, prev) => (Array.isArray(next) && next.length ? next : (Array.isArray(prev) ? prev : []))

export const mergeSlots = (memory = {}, next = {}) => {
  const mem = { ...EMPTY_SLOTS, ...memory }
  const isFreshTopic = (next.categories?.length || 0) > 0 || (next.occasions?.length || 0) > 0

  return {
    ...next,
    audience: next.audience || mem.audience || null,
    categories: mergeList(next.categories, isFreshTopic ? [] : mem.categories),
    categoryPhrases: mergeList(next.categoryPhrases, isFreshTopic ? [] : mem.categoryPhrases),
    occasions: mergeList(next.occasions, isFreshTopic ? [] : mem.occasions),
    colors: mergeList(next.colors, mem.colors),
    sizes: mergeList(next.sizes, mem.sizes),
    fabrics: mergeList(next.fabrics, mem.fabrics),
    fits: mergeList(next.fits, mem.fits),
    patterns: mergeList(next.patterns, mem.patterns),
    brands: mergeList(next.brands, mem.brands),
    budget: next.budget || mem.budget || null,
    discountMin: next.discountMin ?? mem.discountMin ?? null,
    ratingMin: next.ratingMin ?? mem.ratingMin ?? null,
    sortBy: next.sortBy || mem.sortBy || null
  }
}

/* Only long-lived preferences are persisted */
export const distillMemory = (slots = {}) => ({
  audience: slots.audience || null,
  categories: slots.categories || [],
  occasions: slots.occasions || [],
  colors: slots.colors || [],
  sizes: slots.sizes || [],
  fabrics: slots.fabrics || [],
  fits: slots.fits || [],
  brands: slots.brands || [],
  budget: slots.budget || null,
  discountMin: slots.discountMin ?? null,
  ratingMin: slots.ratingMin ?? null,
  sortBy: slots.sortBy || null
})

export const hasAnyShoppingSlot = (slots = {}) => Boolean(
  slots.audience ||
  slots.categories?.length ||
  slots.occasions?.length ||
  slots.colors?.length ||
  slots.sizes?.length ||
  slots.fabrics?.length ||
  slots.brands?.length ||
  slots.budget ||
  slots.discountMin ||
  slots.ratingMin ||
  slots.wantsNewArrival || slots.wantsSale || slots.wantsTrending ||
  slots.wantsTopRated || slots.wantsCheapest || slots.wantsPremium
)

/* ══════════════════════════════════════════════════════════
   INTENT CLASSIFICATION
══════════════════════════════════════════════════════════ */
export const INTENTS = {
  GREETING: 'greeting',
  SMALLTALK: 'smalltalk',
  THANKS: 'thanks',
  GOODBYE: 'goodbye',
  BOT_IDENTITY: 'bot_identity',
  PRODUCT_SEARCH: 'product_search',
  PRODUCT_DETAIL: 'product_detail',
  COMPARE: 'compare',
  OUTFIT: 'outfit',
  SIZE_HELP: 'size_help',
  AVAILABILITY: 'availability',
  PRICE_QUERY: 'price_query',
  CATALOG_OVERVIEW: 'catalog_overview',
  DEALS: 'deals',
  POLICY: 'policy',
  ORDER_HELP: 'order_help',
  COMPLAINT: 'complaint',
  GENERAL: 'general'
}

const POLICY_RE = /\b(return|returns|refund|refunds|exchange|replace|replacement|delivery|shipping|ship|dispatch|cod|cash on delivery|payment|pay|upi|emi|terms|privacy|policy|warranty|invoice|gst|cancel|cancellation)\b/
const ORDER_RE = /\b(my order|my orders|track|tracking|order status|where is my order|order id|shipment|awb|courier|delivered|not delivered|cancel my order|order cancel)\b/
const OVERVIEW_RE = /\b(what (all )?(do|does|can) you (sell|have|offer|stock|carry)|what all is there|kya kya hai|kya kya milta|categories|category list|collections|what is available|show me everything|full catalog|catalogue|sections|kitne product|how many products)\b/
const DEALS_RE = /\b(coupon|coupons|promo code|promo|voucher|discount code|best deal|best offer|running offer|sale live|any offer|kuch offer|discount chal)\b/
const IDENTITY_RE = /\b(who are you|what are you|are you a bot|are you human|your name|tumhara naam|kaun ho|what can you do|what can u do|help me with what|kya kar sakte)\b/
const PRICE_RE = /\b(price|cost|rate|how much|kitne ka|kitna hoga|kitne me|daam|kimat|mrp|budget)\b/

const SEARCH_VERBS = /\b(show|dikhao|dikha|dekhna|find|search|need|want|looking for|chahiye|suggest|recommend|options|buy|purchase|order|kharidna|lena|le lu|browse|explore|batao)\b/

export const classifyIntent = ({ text = '', slots = {}, lastProducts = [] }) => {
  const lower = normalizeIntentText(text)
  if (!lower) return INTENTS.GENERAL

  if (isComplaintMessage(lower)) return INTENTS.COMPLAINT
  if (isThanksMessage(lower)) return INTENTS.THANKS
  if (isGoodbyeMessage(lower)) return INTENTS.GOODBYE
  if (IDENTITY_RE.test(lower)) return INTENTS.BOT_IDENTITY
  if (isHowAreYouQuery(lower)) return INTENTS.SMALLTALK

  if (ORDER_RE.test(lower)) return INTENTS.ORDER_HELP
  if (isComparisonQuery(lower)) return INTENTS.COMPARE
  if (isSizeHelpQuery(lower)) return INTENTS.SIZE_HELP
  if (isOutfitQuery(lower)) return INTENTS.OUTFIT
  if (OVERVIEW_RE.test(lower)) return INTENTS.CATALOG_OVERVIEW
  if (DEALS_RE.test(lower)) return INTENTS.DEALS

  const hasSlots = hasAnyShoppingSlot(slots)
  if (POLICY_RE.test(lower) && !hasSlots) return INTENTS.POLICY

  if (isProductDetailsQuery(lower, lastProducts)) return INTENTS.PRODUCT_DETAIL
  if (slots.wantsInStock && lastProducts.length > 0 && !hasSlots) return INTENTS.AVAILABILITY

  if (hasSlots || SEARCH_VERBS.test(lower)) return INTENTS.PRODUCT_SEARCH
  if (PRICE_RE.test(lower)) return lastProducts.length > 0 ? INTENTS.PRODUCT_DETAIL : INTENTS.PRICE_QUERY
  if (isGreetingMessage(lower)) return INTENTS.GREETING

  return INTENTS.GENERAL
}

/* Intents that should be answered with a product carousel */
export const PRODUCT_INTENTS = new Set([
  INTENTS.PRODUCT_SEARCH,
  INTENTS.PRODUCT_DETAIL,
  INTENTS.COMPARE,
  INTENTS.OUTFIT,
  INTENTS.DEALS,
  INTENTS.AVAILABILITY,
  INTENTS.PRICE_QUERY
])

export const analyzeMessage = ({ text = '', memory = {}, brandList = [], lastProducts = [] }) => {
  const fresh = extractSlots(text, brandList)
  const merged = mergeSlots(memory, fresh)
  const intent = classifyIntent({ text, slots: merged, lastProducts })
  return {
    intent,
    slots: merged,
    freshSlots: fresh,
    wantsProducts: PRODUCT_INTENTS.has(intent)
  }
}

export const describeSlots = (slots = {}) => {
  const parts = []
  if (slots.audience) parts.push(`for: ${slots.audience}`)
  if (slots.occasions?.length) parts.push(`occasion: ${slots.occasions.map((o) => OCCASION_MAP[o]?.label || o).join(', ')}`)
  if (slots.categories?.length) parts.push(`category: ${slots.categories.join(', ')}`)
  if (slots.colors?.length) parts.push(`colour: ${slots.colors.join(', ')}`)
  if (slots.sizes?.length) parts.push(`size: ${slots.sizes.join(', ')}`)
  if (slots.fabrics?.length) parts.push(`fabric: ${slots.fabrics.join(', ')}`)
  if (slots.fits?.length) parts.push(`fit: ${slots.fits.join(', ')}`)
  if (slots.brands?.length) parts.push(`brand: ${slots.brands.join(', ')}`)
  if (slots.budget) {
    const { min, max } = slots.budget
    parts.push(`budget: ${max ? `Rs.${min || 0} - Rs.${max}` : `Rs.${min}+`}`)
  }
  if (slots.discountMin) parts.push(`min discount: ${slots.discountMin}%`)
  if (slots.ratingMin) parts.push(`min rating: ${slots.ratingMin}`)
  if (slots.sortBy) parts.push(`sort: ${slots.sortBy}`)
  if (slots.wantsNewArrival) parts.push('wants new arrivals')
  if (slots.wantsSale) parts.push('wants discounted items')
  if (slots.wantsTrending) parts.push('wants trending items')
  return parts.length ? parts.join(' | ') : 'nothing specific captured yet'
}

/* Which slot to ask about next — one question at a time */
export const nextMissingSlot = (slots = {}) => {
  if (!slots.audience && !slots.categories?.length) return 'audience'
  if (!slots.occasions?.length && !slots.categories?.length) return 'occasion'
  if (!slots.budget) return 'budget'
  if (!slots.sizes?.length) return 'size'
  if (!slots.colors?.length) return 'color'
  return null
}

export const CATEGORY_KEYS = Object.keys(CATEGORY_SYNONYMS)
