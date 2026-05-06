import axios from 'axios'
import { BASE_URL } from '../../constants'
import {
  IMAGE_KEYWORDS,
  PRODUCT_TYPE_KEYWORDS,
  MEN_WORDS,
  WOMEN_WORDS,
  KIDS_WORDS,
  BOYS_WORDS,
  GIRLS_WORDS,
  REFERENCE_WORDS,
  COLOR_KEYWORDS,
  SIZE_KEYWORDS
} from './constants'
import { normalizeIntentText } from './languageUtils'
import { normalizeProduct } from './productUtils'

const STOP_WORDS = new Set([
  'show', 'me', 'images', 'image', 'product', 'products', 'please', 'all', 'for', 'the', 'a', 'an',
  'ki', 'ke', 'ka', 'dikhao', 'dikhana', 'do', 'de', 'ya', 'aur', 'ko', 'ke', 'please'
])

const TAG_KEYWORDS = {
  newArrival: ['new arrival', 'new arrivals', 'new', 'latest', 'just launched', 'fresh'],
  sale: ['sale', 'discount', 'offer', 'deals', 'deal', 'clearance'],
  trending: ['trending', 'popular', 'hot', 'bestseller', 'best seller', 'top pick', 'top picks', 'viral'],
  topRated: ['top rated', 'best rated', 'highest rated', 'rating']
}

let normalizedApiProductsCache = null
let apiProductsPromise = null
const searchIndexCache = new WeakMap()

const includesAny = (text, words) => words.some((word) => text.includes(word))

const isNormalizedProduct = (item) => {
  return Boolean(item) && typeof item === 'object' && 'price' in item && 'maincategory' in item && 'link' in item
}

const normalizeList = (list = []) => {
  return list
    .map((item) => (isNormalizedProduct(item) ? item : normalizeProduct(item)))
    .filter(Boolean)
}

const toSearchEntry = (item) => {
  const bag = `${item.name} ${item.maincategory} ${item.subcategory} ${item.brand} ${item.color} ${item.fabric} ${item.details}`.toLowerCase()
  return {
    item,
    bag,
    nameLower: String(item.name || '').toLowerCase(),
    sizes: normalizeSizeList(item.size),
    price: Number(item.price || 0)
  }
}

const getSearchIndex = (list = []) => {
  if (!Array.isArray(list)) return []
  if (searchIndexCache.has(list)) return searchIndexCache.get(list)
  const indexed = list.map(toSearchEntry)
  searchIndexCache.set(list, indexed)
  return indexed
}

const getApiProducts = async () => {
  if (Array.isArray(normalizedApiProductsCache) && normalizedApiProductsCache.length > 0) {
    return normalizedApiProductsCache
  }

  if (apiProductsPromise) return apiProductsPromise

  apiProductsPromise = axios.get(`${BASE_URL}/product`, { timeout: 9000 })
    .then(({ data }) => {
      const rawList = Array.isArray(data) ? data : []
      const normalized = normalizeList(rawList)
      normalizedApiProductsCache = normalized
      return normalized
    })
    .catch(() => [])
    .finally(() => {
      apiProductsPromise = null
    })

  return apiProductsPromise
}

const KIDS_AUDIENCE_WORDS = [...KIDS_WORDS, ...BOYS_WORDS, ...GIRLS_WORDS]

const matchesAudience = (bag, filters) => {
  if (filters.wantsMens && !includesAny(bag, MEN_WORDS)) return false
  if (filters.wantsWomens && !includesAny(bag, WOMEN_WORDS)) return false
  if (filters.wantsKids && !includesAny(bag, KIDS_AUDIENCE_WORDS)) return false
  if (filters.wantsBoys && !includesAny(bag, BOYS_WORDS)) return false
  if (filters.wantsGirls && !includesAny(bag, GIRLS_WORDS)) return false
  return true
}

export const getQueryFilters = (query = '') => {
  const lower = normalizeIntentText(query)
  const wantsNewArrival = TAG_KEYWORDS.newArrival.some((word) => lower.includes(word))
  const wantsSale = TAG_KEYWORDS.sale.some((word) => lower.includes(word))
  const wantsTrending = TAG_KEYWORDS.trending.some((word) => lower.includes(word))
  const wantsTopRated = TAG_KEYWORDS.topRated.some((word) => lower.includes(word))
  return {
    lower,
    wantsMens: includesAny(lower, MEN_WORDS),
    wantsWomens: includesAny(lower, WOMEN_WORDS),
    wantsKids: includesAny(lower, KIDS_WORDS),
    wantsBoys: includesAny(lower, BOYS_WORDS),
    wantsGirls: includesAny(lower, GIRLS_WORDS),
    referenceAsked: includesAny(lower, REFERENCE_WORDS),
    productTypes: PRODUCT_TYPE_KEYWORDS.filter((word) => lower.includes(word)),
    wantsNewArrival,
    wantsSale,
    wantsTrending,
    wantsTopRated
  }
}

const tokenize = (text = '') => {
  return text.split(/[^a-z0-9]+/).filter((token) => token && !STOP_WORDS.has(token))
}

const parseBudgetRange = (text) => {
  if (!text) return null

  const betweenMatch = text.match(/(?:between|from)\s*₹?\s*(\d{2,6})\s*(?:and|to|-)\s*₹?\s*(\d{2,6})/)
  if (betweenMatch) {
    const min = Number(betweenMatch[1])
    const max = Number(betweenMatch[2])
    if (!Number.isNaN(min) && !Number.isNaN(max)) return { min, max }
  }

  const rangeMatch = text.match(/₹?\s*(\d{2,6})\s*-\s*₹?\s*(\d{2,6})/)
  if (rangeMatch) {
    const min = Number(rangeMatch[1])
    const max = Number(rangeMatch[2])
    if (!Number.isNaN(min) && !Number.isNaN(max)) return { min, max }
  }

  const underMatch = text.match(/(?:under|below|upto|up to|less than|within)\s*₹?\s*(\d{2,6})/)
  if (underMatch) {
    const max = Number(underMatch[1])
    if (!Number.isNaN(max)) return { min: 0, max }
  }

  const overMatch = text.match(/(?:above|over|more than|greater than)\s*₹?\s*(\d{2,6})/)
  if (overMatch) {
    const min = Number(overMatch[1])
    if (!Number.isNaN(min)) return { min, max: null }
  }

  const aroundMatch = text.match(/(?:around|approx|approximately|near|budget)\s*₹?\s*(\d{2,6})/)
  if (aroundMatch) {
    const center = Number(aroundMatch[1])
    if (!Number.isNaN(center)) return { min: Math.max(0, Math.round(center * 0.8)), max: Math.round(center * 1.2) }
  }

  return null
}

const parseColors = (text) => {
  if (!text) return []
  return COLOR_KEYWORDS.filter((color) => text.includes(color))
}

const normalizeSizeList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim().toUpperCase()).filter(Boolean)
  }
  return String(value)
    .split(/[,/|\s]+/)
    .map((v) => String(v).trim().toUpperCase())
    .filter(Boolean)
}

const parseSizes = (text) => {
  if (!text) return []
  const sizes = new Set()
  const lower = text.toLowerCase()

  SIZE_KEYWORDS.forEach((size) => {
    if (lower.includes(size)) sizes.add(size.toUpperCase())
  })

  const sizeMatch = lower.match(/size\s*[:=]?\s*(xs|s|m|l|xl|xxl|2xl|3xl|4xl|\d{2})/)
  if (sizeMatch) sizes.add(String(sizeMatch[1]).toUpperCase())

  return Array.from(sizes)
}

export const shouldShowProducts = (text) => {
  const lower = normalizeIntentText(text)
  if (!lower) return false

  if (IMAGE_KEYWORDS.some((word) => lower.includes(word))) return true
  if (includesAny(lower, MEN_WORDS)) return true
  if (includesAny(lower, WOMEN_WORDS)) return true
  if (includesAny(lower, KIDS_WORDS)) return true
  if (includesAny(lower, BOYS_WORDS)) return true
  if (includesAny(lower, GIRLS_WORDS)) return true
  if (PRODUCT_TYPE_KEYWORDS.some((word) => lower.includes(word))) return true
  if (TAG_KEYWORDS.newArrival.some((word) => lower.includes(word))) return true
  if (TAG_KEYWORDS.sale.some((word) => lower.includes(word))) return true
  if (TAG_KEYWORDS.trending.some((word) => lower.includes(word))) return true
  if (TAG_KEYWORDS.topRated.some((word) => lower.includes(word))) return true

  const intentWords = ['recommend', 'suggest', 'find', 'search', 'looking', 'need', 'buy', 'purchase', 'options', 'choices']
  return intentWords.some((word) => lower.includes(word))
}

const isRecent = (isoDate) => {
  if (!isoDate) return false
  const created = Date.parse(isoDate)
  if (!Number.isFinite(created)) return false
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return Date.now() - created <= thirtyDays
}

const scoreProduct = ({ entry, tokens, colors, sizes, filters }) => {
  const { item, bag, nameLower } = entry
  let score = 0

  tokens.forEach((token) => {
    if (!token) return
    if (nameLower.includes(token)) score += 3
    if (bag.includes(token)) score += 2
  })

  if (filters.productTypes.length > 0 && filters.productTypes.some((type) => bag.includes(type))) {
    score += 3
  }

  if (filters.wantsNewArrival && (item.newArrival || isRecent(item.createdAt))) {
    score += 3
  }

  if (filters.wantsSale && (item.isSale || item.discount >= 10)) {
    score += 3
  }

  if (filters.wantsTrending) {
    if ((item.rating || 0) >= 4.4 || (item.reviews || 0) >= 5 || item.discount >= 15) score += 3
  }

  if (filters.wantsTopRated && (item.rating || 0) >= 4.5) {
    score += 3
  }

  if (colors.length > 0 && colors.some((color) => bag.includes(color))) {
    score += 2
  }

  if (sizes.length > 0) {
    if (sizes.some((size) => entry.sizes.includes(size.toUpperCase()))) {
      score += 2
    }
  }

  if (filters.wantsMens && includesAny(bag, MEN_WORDS)) score += 2
  if (filters.wantsWomens && includesAny(bag, WOMEN_WORDS)) score += 2
  if (filters.wantsKids && includesAny(bag, KIDS_AUDIENCE_WORDS)) score += 2
  if (filters.wantsBoys && includesAny(bag, BOYS_WORDS)) score += 2
  if (filters.wantsGirls && includesAny(bag, GIRLS_WORDS)) score += 2

  return score
}

export const fetchProductsFromShop = async (query, options = {}) => {
  try {
    const cached = Array.isArray(options.cachedProducts) ? options.cachedProducts : []
    const sourceProducts = cached.length ? cached : await getApiProducts()
    const rawList = Array.isArray(sourceProducts) ? sourceProducts : []
    const allNormalized = normalizeList(rawList)
    const allIndexed = getSearchIndex(allNormalized)

    const filters = getQueryFilters(query)
    const tokens = tokenize(filters.lower)
    const colors = parseColors(filters.lower)
    const sizes = parseSizes(filters.lower)
    const budget = parseBudgetRange(filters.lower)
    const preferences = options.preferences || {}
    const prefColor = preferences.color ? [String(preferences.color).toLowerCase()] : []
    const prefSize = preferences.size ? [String(preferences.size).toUpperCase()] : []
    const prefBudget = preferences.budget && (preferences.budget.min !== null || preferences.budget.max !== null)
      ? preferences.budget
      : null
    const prefGender = preferences.gender || null

    const applyFilters = (entries) => {
      return entries.filter((entry) => {
        const { item, bag, sizes: entrySizes, price } = entry

        if (!matchesAudience(bag, filters)) return false

        if (filters.productTypes.length > 0) {
          const typeMatch = filters.productTypes.some((type) => bag.includes(type))
          if (!typeMatch) return false
        }

        if (filters.wantsNewArrival && !(item.newArrival || isRecent(item.createdAt))) {
          return false
        }

        if (filters.wantsSale && !(item.isSale || item.discount >= 10)) {
          return false
        }

        if (filters.wantsTrending) {
          const trendingMatch = (item.rating || 0) >= 4.4 || (item.reviews || 0) >= 5 || item.discount >= 15
          if (!trendingMatch) return false
        }

        if (filters.wantsTopRated && (item.rating || 0) < 4.5) {
          return false
        }

        if (colors.length > 0 && !colors.some((color) => bag.includes(color))) {
          return false
        }

        if (sizes.length > 0) {
          if (!sizes.some((size) => entrySizes.includes(size.toUpperCase()))) {
            return false
          }
        }

        if (budget) {
          if (!Number.isNaN(price) && price > 0) {
            if (budget.min !== null && price < budget.min) return false
            if (budget.max !== null && price > budget.max) return false
          }
        }

        return true
      })
    }

    const preferred = Array.isArray(options.preferredProducts)
      ? normalizeList(options.preferredProducts)
      : []
    const preferredIndexed = getSearchIndex(preferred)
    const usePreferred = filters.referenceAsked && preferred.length > 0

    let baseIndexed = usePreferred ? preferredIndexed : allIndexed
    let filteredEntries = applyFilters(baseIndexed)

    if (filteredEntries.length === 0 && usePreferred) {
      filteredEntries = applyFilters(allIndexed)
    }

    const scored = filteredEntries
      .map((entry) => ({
        entry,
        score: scoreProduct({ entry, tokens, colors, sizes, filters })
      }))
      .sort((a, b) => b.score - a.score)

    const boosted = scored.map(({ entry, score }) => {
      const { item, bag, sizes: entrySizes, price } = entry
      let boost = 0

      if (prefColor.length > 0 && prefColor.some((color) => bag.includes(color))) boost += 2
      if (prefSize.length > 0) {
        if (prefSize.some((size) => entrySizes.includes(size))) boost += 2
      }
      if (prefGender === 'men' && includesAny(bag, MEN_WORDS)) boost += 2
      if (prefGender === 'women' && includesAny(bag, WOMEN_WORDS)) boost += 2

      if (prefBudget) {
        if (Number.isFinite(price) && price > 0) {
          if (prefBudget.min !== null && price < prefBudget.min) boost -= 1
          if (prefBudget.max !== null && price > prefBudget.max) boost -= 1
        }
      }

      return { entry, score: score + boost }
    }).sort((a, b) => b.score - a.score)

    const primaryList = scored.length > 0
      ? scored.map((x) => x.entry.item)
      : filteredEntries.map((x) => x.item)
    const finalList = boosted.length > 0 ? boosted.map((x) => x.entry.item) : primaryList
    return finalList.slice(0, 6)
  } catch {
    return []
  }
}
