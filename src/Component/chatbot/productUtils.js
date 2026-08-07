export const getProductId = (p) => {
  if (!p) return null
  return p._id || p.id || p.productid || p.productId || p.productID || null
}

const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export const normalizeProduct = (p) => {
  if (!p) return null
  const image = p.image || p.pic1 || p.pic || p.pic2 || p.pic3 || p.pic4 || ''
  const id = getProductId(p)

  const basePrice = toNum(p.baseprice || p.basePrice || p.mrp || 0)
  const finalPrice = toNum(p.finalprice || p.finalPrice || p.price || 0)

  /* Prefer the real spread between MRP and selling price; fall back to
     the stored discount field when MRP is missing. */
  const computed = basePrice > 0 && finalPrice > 0 && basePrice > finalPrice
    ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
    : 0
  const discountPercent = computed > 0 ? computed : Math.max(0, Math.round(toNum(p.discount)))

  const fabric = p.fabric || p.material || p.composition || ''
  const details = p.details || p.description || p.desc || ''

  const rating = typeof p.rating === 'number' ? p.rating : toNum(p.stars || p.rating)
  const reviews = typeof p.reviews === 'number'
    ? p.reviews
    : toNum(p.reviewCount || p.reviews?.count || 0)

  const link = p.link || (id ? `/single-product/${id}` : '#')

  const stock = typeof p.stock !== 'undefined' && p.stock !== null
    ? p.stock
    : (typeof p.inStock !== 'undefined' ? p.inStock : true)

  let createdAt = null
  if (p.createdAt) {
    const t = Date.parse(p.createdAt)
    if (Number.isFinite(t)) createdAt = new Date(t).toISOString()
  }

  return {
    id,
    name: p.name || 'Product',
    price: finalPrice,
    basePrice,
    discount: discountPercent,
    image,
    link,
    maincategory: p.maincategory || '',
    subcategory: p.subcategory || '',
    fabric,
    details,
    rating,
    reviews,
    size: p.size || p.sizes || '',
    color: p.color || p.colors || '',
    brand: p.brand || '',
    stock,
    createdAt,
    newArrival: Boolean(p.newArrival),
    isSale: Boolean(p.isSale)
  }
}

export const extractInlineProducts = (text) => {
  if (!text) return []
  const matches = text.match(/\[PRODUCT:(.*?)\]/g) || []
  return matches
    .map((match) => {
      const payload = match.replace(/^\[PRODUCT:/, '').replace(/\]$/, '')
      try {
        return normalizeProduct(JSON.parse(payload))
      } catch {
        const [name, price, image, link] = payload.split('|').map((it) => (it || '').trim())
        return normalizeProduct({ name, price, image, link })
      }
    })
    .filter(Boolean)
}

export const stripProductTags = (text = '') => String(text || '').replace(/\[PRODUCT:.*?\]/g, '').trim()
