export const getProductId = (p) => {
  if (!p) return null
  return p._id || p.id || p.productid || p.productId || p.productID || null
}

export const normalizeProduct = (p) => {
  if (!p) return null
  const image = p.image || p.pic1 || p.pic || p.pic2 || p.pic3 || p.pic4 || ''
  const id = getProductId(p)

  const basePrice = p.baseprice || p.mrp || 0
  const finalPrice = p.finalprice || p.price || 0
  const discountPercent = basePrice && finalPrice ? Math.round(((basePrice - finalPrice) / basePrice) * 100) : 0

  const fabric = p.fabric || p.material || p.composition || ''
  const details = p.details || p.description || p.desc || ''
  const rating = typeof p.rating === 'number'
    ? p.rating
    : (p.stars || p.reviews?.rating || 0)
  const reviews = typeof p.reviews === 'number'
    ? p.reviews
    : (p.reviews?.count || p.reviewCount || 0)
  const link = p.link || (id ? `/single-product/${id}` : '#')

  const stock = typeof p.stock !== 'undefined'
    ? p.stock
    : (typeof p.inStock !== 'undefined' ? p.inStock : true)

  const createdAt = p.createdAt ? new Date(p.createdAt).toISOString() : null
  const newArrival = Boolean(p.newArrival)
  const isSale = Boolean(p.isSale)

  return {
    id,
    name: p.name || 'Product',
    price: finalPrice,
    basePrice: basePrice,
    discount: discountPercent,
    image,
    link,
    maincategory: p.maincategory || '',
    subcategory: p.subcategory || '',
    fabric: fabric,
    details: details,
    rating: rating,
    reviews: reviews,
    size: p.size || p.sizes || '',
    color: p.color || p.colors || '',
    brand: p.brand || '',
    stock,
    createdAt,
    newArrival,
    isSale
  }
}

export const extractInlineProducts = (text) => {
  if (!text) return []
  const matches = text.match(/\[PRODUCT:(.*?)\]/g) || []
  return matches
    .map((match) => {
      const payload = match.replace(/^\[PRODUCT:/, '').replace(/\]$/, '')
      try {
        const parsed = JSON.parse(payload)
        return normalizeProduct(parsed)
      } catch {
        const [name, price, image, link] = payload.split('|').map((it) => (it || '').trim())
        return normalizeProduct({ name, price, image, link })
      }
    })
    .filter(Boolean)
}
