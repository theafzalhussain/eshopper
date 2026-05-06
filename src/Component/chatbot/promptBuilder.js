import { isGreetingMessage, isHowAreYouQuery, isProductDetailsQuery } from './languageUtils'
import { SITE_FACTS } from './siteKnowledge'

const formatPriceRange = (products = []) => {
  const prices = products.map((p) => Number(p.price || 0)).filter((n) => n > 0)
  if (prices.length === 0) return '₹0 - ₹0'
  return `₹${Math.min(...prices)} - ₹${Math.max(...prices)}`
}

const formatMetaPriceRange = (range = {}) => {
  const min = Number(range.min)
  const max = Number(range.max)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '₹0 - ₹0'
  return `₹${min} - ₹${max}`
}

const summarizeRecentProducts = (items = []) => {
  if (!items.length) return ''
  return items.slice(0, 3).map((p, i) => {
    const discountStr = p.discount > 0 ? ` | ${p.discount}% OFF` : ''
    const ratingStr = p.rating > 0 ? ` | ${p.rating}/5` : ''
    return `${i + 1}. ${p.name} - ₹${p.price}${discountStr}${ratingStr} (${p.maincategory}/${p.subcategory})`
  }).join('\n')
}

const formatCatalogInsight = (catalogMeta) => {
  if (!catalogMeta) return ''

  const intelligence = catalogMeta.productIntelligence || {}
  const priceRange = intelligence.priceRange || {}
  const totalLine = Number.isFinite(Number(intelligence.totalProducts))
    ? `Total products: ${intelligence.totalProducts}`
    : ''
  const newArrivalsLine = Number.isFinite(Number(intelligence.newArrivals))
    ? `New arrivals: ${intelligence.newArrivals}`
    : ''
  const onSaleLine = Number.isFinite(Number(intelligence.onSale))
    ? `On sale: ${intelligence.onSale}`
    : ''
  const avgDiscountLine = Number.isFinite(Number(intelligence.avgDiscount))
    ? `Average discount: ${intelligence.avgDiscount}%`
    : ''
  const priceLine = Number.isFinite(Number(priceRange.min)) && Number.isFinite(Number(priceRange.max))
    ? `Price range: ₹${priceRange.min} - ₹${priceRange.max} (avg ₹${priceRange.avg || 0})`
    : ''

  const categories = Array.isArray(catalogMeta.filterOptions?.categories)
    ? catalogMeta.filterOptions.categories.slice(0, 8)
    : []
  const brands = Array.isArray(catalogMeta.brands)
    ? catalogMeta.brands.slice(0, 6).map((brand) => brand.name).filter(Boolean)
    : []
  const topDiscounts = Array.isArray(intelligence.topDiscounts)
    ? intelligence.topDiscounts.slice(0, 4).map((item) => `${item.name} (${item.discount}% off)`).filter(Boolean)
    : []

  const parts = [
    totalLine,
    priceLine,
    newArrivalsLine,
    onSaleLine,
    avgDiscountLine,
    categories.length ? `Popular categories: ${categories.join(', ')}` : '',
    brands.length ? `Top brands: ${brands.join(', ')}` : '',
    topDiscounts.length ? `Top discounts: ${topDiscounts.join(', ')}` : ''
  ].filter(Boolean)

  return parts.length ? `Catalog intelligence:\n- ${parts.join('\n- ')}` : ''
}

export const buildPersonalizedContext = ({
  userQuery,
  language,
  conversationStyle,
  priorNeeds,
  preferenceSummary,
  currentUserName,
  lastSuggestedProducts,
  allProductsCache,
  catalogMeta
}) => {
  const userName = currentUserName || 'customer'
  const isGreeting = isGreetingMessage(userQuery)
  const isHowAreYou = isHowAreYouQuery(userQuery)
  const isProductDetail = isProductDetailsQuery(userQuery, lastSuggestedProducts)

  const metaStats = catalogMeta?.productIntelligence || {}
  const totalProducts = allProductsCache.length || Number(metaStats.totalProducts || 0)
  const priceRange = allProductsCache.length > 0
    ? formatPriceRange(allProductsCache)
    : formatMetaPriceRange(metaStats.priceRange || {})
  const categories = Array.isArray(catalogMeta?.filterOptions?.categories)
    ? catalogMeta.filterOptions.categories.slice(0, 8)
    : []
  const categoryLine = categories.length
    ? categories.join(', ')
    : "Men's, Women's, Casual, Formal, Party, Traditional, Western, Ethnic, Accessories"

  const productSummary = totalProducts > 0
    ? `Catalog snapshot:\n- Items: ${totalProducts}\n- Price range: ${priceRange}\n- Categories: ${categoryLine}`
    : 'Catalog is available on request.'

  const catalogInsight = formatCatalogInsight(catalogMeta)

  const lastProductsInfo = lastSuggestedProducts.length > 0
    ? `\nRecent suggestions (for reference):\n${summarizeRecentProducts(lastSuggestedProducts)}`
    : ''

  const memoryLine = preferenceSummary ? `${priorNeeds} | ${preferenceSummary}` : priorNeeds
  const styleGuide = `Conversation preferences:\n- Tone: ${conversationStyle.tone}\n- Length: ${conversationStyle.responseLength}\n- Memory: ${memoryLine}${lastProductsInfo}`

  const siteFacts = `Site facts: ${SITE_FACTS}`

  const languageRule = language === 'hi'
    ? 'Reply in natural, respectful Hindi (Roman Hindi or Devanagari both acceptable). Keep it human and easy to understand.'
    : (language === 'user'
      ? 'Reply in the same language/script as the user. Keep the tone professional, clear, and human.'
      : 'Reply only in professional English. Do not switch to Hindi unless the user message is in Hindi or asks for Hindi.')

  const toneRule = 'Use an official luxury-brand concierge voice: polished, warm, respectful, concise, and confident. Sound human and attentive, never robotic, overly casual, or vague.'

  if (isHowAreYou) {
    return `User is asking how you are. Respond warmly and briefly, then invite the user to share their fashion need.

${styleGuide}
  ${siteFacts}
${catalogInsight ? `\n${catalogInsight}` : ''}

${languageRule}
${toneRule}
User name: ${userName}
User query: "${userQuery}"`
  }

  if (isProductDetail && lastSuggestedProducts.length > 0) {
    return `User is asking for details about a previously suggested product.

${productSummary}
${styleGuide}
  ${siteFacts}
${catalogInsight ? `\n${catalogInsight}` : ''}

Rules:
- ${languageRule}
- ${toneRule}
- Keep the answer user-friendly and conversational while staying professional.
- Focus on the recent suggestions.
- Provide fabric, styling tips, occasion fit, and value (price/discount) if available.
- Keep it concise and helpful.
- Offer one practical next step at the end.

User name: ${userName}
User query: "${userQuery}"`
  }

  if (isGreeting) {
    return `User sent a greeting. Reply politely, keep it short, and ask one clear question to understand their needs.

${styleGuide}
  ${siteFacts}

Rules:
- ${languageRule}
- ${toneRule}
- Keep the greeting natural and human; avoid generic chatbot phrases.
- Keep greeting premium yet approachable in one to two lines.
- Do not list products unless the user asked for them.

User name: ${userName}
User query: "${userQuery}"`
  }

  return `You are Eshopper's AI Fashion Consultant.

${productSummary}
${styleGuide}
${siteFacts}
${catalogInsight ? `\n${catalogInsight}` : ''}

Guidelines:
- ${languageRule}
- ${toneRule}
- Maintain a professional, official, human tone. Avoid slang and emojis.
- If user writes in English, reply in English. If user writes in Hindi, reply in Hindi naturally.
- Prefer clarity over hype; keep responses concrete and useful.
- Keep wording simple enough for any user to understand quickly.
- Suggest relevant products based on the user's need.
- Do not invent product names, prices, discounts, or inventory.
- Ask one clarifying question if the request is ambiguous.

User name: ${userName}
User query: "${userQuery}"`
}
