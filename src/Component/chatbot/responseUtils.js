const formatCurrency = (value) => {
  const num = Number(value || 0)
  if (!Number.isFinite(num) || num <= 0) return ''
  return `₹${num}`
}

export const buildProductListReply = ({ language, userName, products = [] }) => {
  const count = products.length
  if (language === 'hi') {
    return count
      ? `Aapki request ke hisaab se ${count} options mil gaye hain. Kripya budget, size, ya color batayein, main aapke liye shortlist aur refined kar deta hoon.`
      : `Filhaal exact match nahi mila. Kripya budget, size, ya color batayein, main suitable options aur acche se refine kar deta hoon.`
  }

  return count
    ? `I found ${count} options aligned with your request. Share your budget, size, or preferred color, and I will refine this into a focused shortlist for you.`
    : `I could not find a close match yet. Please share your budget, size, or preferred color, and I will refine the shortlist promptly.`
}

export const buildProductDetailReply = ({ language, product }) => {
  if (!product) return null

  const price = formatCurrency(product.price)
  const basePrice = formatCurrency(product.basePrice)
  const discount = product.discount > 0 ? `${product.discount}% OFF` : ''
  const rating = product.rating ? `${product.rating}/5` : ''
  const reviews = product.reviews ? `${product.reviews} reviews` : ''

  const priceLine = discount && basePrice
    ? `Price: ${basePrice} → ${price} (${discount})`
    : (price ? `Price: ${price}` : '')

  const ratingLine = rating ? `Rating: ${rating}${reviews ? ` (${reviews})` : ''}` : ''
  const fabricLine = product.fabric ? `Fabric: ${product.fabric}` : ''
  const categoryLine = (product.maincategory || product.subcategory)
    ? `Category: ${product.maincategory || ''}${product.subcategory ? ` / ${product.subcategory}` : ''}`
    : ''

  const lines = [priceLine, ratingLine, fabricLine, categoryLine].filter(Boolean)

  if (language === 'hi') {
    return `Yeh details hain: ${product.name || 'Product'}.
${lines.join('\n')}
Kya aap size, color, ya delivery details bhi chahenge? Main aapki madad ke liye yahin hoon.`
  }

  return `Here are the key details for ${product.name || 'this product'}:
${lines.join('\n')}
Would you like size guidance, color availability, or delivery information as well? I can help refine the best choice.`
}
