import { normalizeIntentText } from './languageUtils'

const BRAND_NAME = process.env.REACT_APP_BRAND_NAME || 'Eshopper'
const BRAND_SITE = process.env.REACT_APP_BRAND_SITE_URL || 'https://eshopperr.me'
const BRAND_EMAIL = process.env.REACT_APP_BRAND_EMAIL || 'support@eshopperr.me'
const BRAND_PHONE = process.env.REACT_APP_BRAND_PHONE || '+91 8447859784'
const BRAND_ADDRESS = process.env.REACT_APP_BRAND_ADDRESS || 'A-43 Sector 16 Noida, UP, India'

export const SITE_FACTS = [
  `Return policy: 7 days from delivery (eligible items).`,
  `Delivery: metro 2-4 business days, tier-2/3 4-7 business days.`,
  `Refunds: 3-7 business days after quality check.`,
  `COD availability depends on pincode and order value.`
].join(' ')

const buildReturnPolicy = (language) => {
  if (language === 'hi') {
    return (
      `Return policy (7 din delivery ke baad):\n` +
      `- Return request My Orders ya Contact Support se raise karein.\n` +
      `- Item unused, unwashed, tags + invoice + original packaging ke sath ho.\n` +
      `- Reverse pickup + quality check ke baad refund/exchange hota hai.\n` +
      `- Refund 3-7 business days me (prepaid). COD refund bank/UPI me.\n` +
      `Non-returnable: innerwear/socks, opened beauty, gift cards/freebies, final sale items.\n` +
      `More: /return-policy`
    )
  }

  return (
    `Return policy (7 days from delivery):\n` +
    `- Raise a return via My Orders or Contact Support.\n` +
    `- Items must be unused, unwashed, with tags, invoice, and packaging.\n` +
    `- Reverse pickup + QC required before refund/exchange.\n` +
    `- Refund in 3-7 business days after QC (prepaid). COD to bank/UPI.\n` +
    `Non-returnable: innerwear/socks, opened beauty, gift cards/freebies, final sale items.\n` +
    `More: /return-policy`
  )
}

const buildExchangePolicy = (language) => {
  if (language === 'hi') {
    return (
      `Exchange (7 din ke andar):\n` +
      `- Eligible products ke liye 1 free exchange (serviceable pincodes).\n` +
      `- Exchange delivery 3-5 business days.\n` +
      `- Agar variant out of stock ho to refund auto-initiate hota hai.\n` +
      `More: /return-policy`
    )
  }

  return (
    `Exchange (within 7 days):\n` +
    `- One free exchange for eligible items (serviceable pincodes).\n` +
    `- Exchange delivery in 3-5 business days.\n` +
    `- If the variant is unavailable, a refund is initiated.\n` +
    `More: /return-policy`
  )
}

const buildRefundInfo = (language) => {
  if (language === 'hi') {
    return (
      `Refund timeline:\n` +
      `- Quality check pass hone ke baad prepaid refund 3-7 business days me.\n` +
      `- COD refunds verified bank/UPI me transfer hote hain.\n` +
      `More: /return-policy`
    )
  }

  return (
    `Refund timeline:\n` +
    `- Prepaid refunds: 3-7 business days after QC.\n` +
    `- COD refunds go to verified bank/UPI.\n` +
    `More: /return-policy`
  )
}

const buildDeliveryInfo = (language) => {
  if (language === 'hi') {
    return (
      `Delivery timeline:\n` +
      `- Metro cities: 2-4 business days.\n` +
      `- Tier-2/3: 4-7 business days.\n` +
      `- Sale events me 1-2 din extra lag sakte hain.\n` +
      `More: /faq`
    )
  }

  return (
    `Delivery timeline:\n` +
    `- Metro cities: 2-4 business days.\n` +
    `- Tier-2/3: 4-7 business days.\n` +
    `- Sale events may add 1-2 extra days.\n` +
    `More: /faq`
  )
}

const buildTrackingInfo = (language) => {
  if (language === 'hi') {
    return `Order tracking: My Orders me jaakar apna order select karein. Wahan real-time status aur ETA dikh jaata hai. More: /my-orders`
  }
  return `Order tracking: Open My Orders and select your order for real-time status and ETA. More: /my-orders`
}

const buildCodInfo = (language) => {
  if (language === 'hi') {
    return `COD availability pincode aur order value par depend karti hai. Checkout par option show hoga agar serviceable ho. More: /faq`
  }
  return `COD availability depends on your pincode and order value. You will see the option at checkout if serviceable. More: /faq`
}

const buildContactInfo = (language) => {
  if (language === 'hi') {
    return (
      `Contact ${BRAND_NAME}:\n` +
      `- Email: ${BRAND_EMAIL}\n` +
      `- Phone: ${BRAND_PHONE}\n` +
      `- Address: ${BRAND_ADDRESS}\n` +
      `- Website: ${BRAND_SITE}\n` +
      `Support hours: 10 AM - 8 PM (fastest response). More: /contact`
    )
  }

  return (
    `Contact ${BRAND_NAME}:\n` +
    `- Email: ${BRAND_EMAIL}\n` +
    `- Phone: ${BRAND_PHONE}\n` +
    `- Address: ${BRAND_ADDRESS}\n` +
    `- Website: ${BRAND_SITE}\n` +
    `Support hours: 10 AM - 8 PM (fastest response). More: /contact`
  )
}

const buildTermsInfo = (language) => {
  if (language === 'hi') {
    return (
      `Terms highlights:\n` +
      `- Quality, authenticity, aur craftsmanship focus.\n` +
      `- Premium logistics + insured delivery.\n` +
      `- 24/7 concierge support.\n` +
      `- Returns: 7-day policy (eligible items).\n` +
      `- Data security and privacy focus.\n` +
      `More: /terms`
    )
  }

  return (
    `Terms highlights:\n` +
    `- Quality, authenticity, and craftsmanship focus.\n` +
    `- Premium logistics with insured delivery.\n` +
    `- 24/7 concierge support.\n` +
    `- Returns: 7-day policy (eligible items).\n` +
    `- Strong data security and privacy focus.\n` +
    `More: /terms`
  )
}

const buildAboutInfo = (language) => {
  if (language === 'hi') {
    return (
      `${BRAND_NAME} ke baare me:\n` +
      `- 2024 me shuru, premium fashion aur sustainable focus.\n` +
      `- Sizes XXS-6XL, global delivery (32+ countries).\n` +
      `- Men, women, kids, accessories ke liye curated collections.\n` +
      `More: /about`
    )
  }

  return (
    `${BRAND_NAME} About:\n` +
    `- Founded in 2024 with premium, sustainable fashion focus.\n` +
    `- Sizes XXS–6XL, global delivery (32+ countries).\n` +
    `- Curated collections for men, women, kids, and accessories.\n` +
    `More: /about`
  )
}

const INTENTS = [
  { key: 'return-policy', keywords: ['return policy', 'return', 'returns'], builder: buildReturnPolicy },
  { key: 'exchange', keywords: ['exchange', 'replace', 'replacement'], builder: buildExchangePolicy },
  { key: 'refund', keywords: ['refund', 'refunds', 'money back'], builder: buildRefundInfo },
  { key: 'delivery', keywords: ['delivery', 'shipping', 'ship', 'dispatch'], builder: buildDeliveryInfo },
  { key: 'tracking', keywords: ['track', 'tracking', 'order status', 'where is my order'], builder: buildTrackingInfo },
  { key: 'cod', keywords: ['cod', 'cash on delivery'], builder: buildCodInfo },
  { key: 'contact', keywords: ['contact', 'support', 'customer care', 'email', 'phone', 'address', 'whatsapp'], builder: buildContactInfo },
  { key: 'terms', keywords: ['terms', 'conditions', 't&c', 'policy', 'privacy'], builder: buildTermsInfo },
  { key: 'about', keywords: ['about', 'brand', 'story', 'mission', 'vision'], builder: buildAboutInfo }
]

export const getSiteKnowledgeReply = ({ text, language }) => {
  const lower = normalizeIntentText(text)
  if (!lower) return null

  const matched = INTENTS.find((intent) => intent.keywords.some((k) => lower.includes(k)))
  if (!matched) return null

  return matched.builder(language)
}
