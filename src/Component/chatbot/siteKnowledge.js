import { normalizeIntentText, isHindiLike } from './languageUtils'

const BRAND_NAME = process.env.REACT_APP_BRAND_NAME || 'Eshopper'
const BRAND_SITE = process.env.REACT_APP_BRAND_SITE_URL || 'https://eshopperr.me'
const BRAND_EMAIL = process.env.REACT_APP_BRAND_EMAIL || 'support@eshopperr.me'
const BRAND_PHONE = process.env.REACT_APP_BRAND_PHONE || '+91 8447859784'
const BRAND_ADDRESS = process.env.REACT_APP_BRAND_ADDRESS || 'A-43 Sector 16 Noida, UP, India'

export const BRAND = { BRAND_NAME, BRAND_SITE, BRAND_EMAIL, BRAND_PHONE, BRAND_ADDRESS }

/* Compact, factual policy sheet used to ground every AI answer.
   The assistant must never invent policy details outside this list. */
export const SITE_FACTS = [
  'Returns: 7 days from delivery for eligible items; item must be unused, unwashed, with tags, invoice and original packaging.',
  'Non-returnable: innerwear and socks, opened beauty products, gift cards and freebies, final-sale items.',
  'Exchange: one free exchange within 7 days on eligible items at serviceable pincodes; exchange delivery 3-5 business days.',
  'Refunds: 3-7 business days after quality check for prepaid; COD refunds go to a verified bank account or UPI.',
  'Delivery: metro cities 2-4 business days, tier-2/3 cities 4-7 business days; sale events can add 1-2 days.',
  'COD: availability depends on pincode and order value; the option appears at checkout when serviceable.',
  'Payments: UPI, cards and netbanking via Razorpay, plus COD where serviceable. Card details are never stored by Eshopper.',
  'Order tracking: My Orders page shows live status, timeline and ETA; status emails are sent at each stage.',
  'Cancellation: allowed free of cost until the order is packed; after dispatch use the return flow instead.',
  'Coupons: applied on the cart page; one coupon per order, minimum-order and usage limits may apply.',
  'Sizes: XXS to 6XL depending on the product; every product page carries a size chart.',
  `Support: ${BRAND_EMAIL}, ${BRAND_PHONE}, 10 AM - 8 PM. Address: ${BRAND_ADDRESS}.`
].join('\n- ')

/* ══════════════════════════════════════════════════════════
   TOPIC BUILDERS
══════════════════════════════════════════════════════════ */
const T = {
  'return-policy': {
    hi: `Return policy (delivery ke 7 din ke andar):\n• Return My Orders ya Contact Support se raise karein\n• Item unused, unwashed ho — tags, invoice aur original packaging ke sath\n• Reverse pickup + quality check ke baad refund/exchange\n• Prepaid refund 3-7 business days, COD refund bank/UPI me\n• Non-returnable: innerwear/socks, opened beauty, gift cards/freebies, final sale\nDetails: /return-policy`,
    en: `Return policy (within 7 days of delivery):\n• Raise the return from My Orders or Contact Support\n• Item must be unused and unwashed, with tags, invoice and original packaging\n• Reverse pickup plus a quality check happens before refund or exchange\n• Prepaid refunds in 3-7 business days; COD refunds to bank or UPI\n• Non-returnable: innerwear and socks, opened beauty, gift cards and freebies, final-sale items\nFull text: /return-policy`
  },
  exchange: {
    hi: `Exchange (7 din ke andar):\n• Eligible items par 1 free exchange (serviceable pincodes)\n• Exchange delivery 3-5 business days\n• Variant out of stock ho to refund auto-initiate ho jaata hai\nDetails: /return-policy`,
    en: `Exchange (within 7 days):\n• One free exchange on eligible items at serviceable pincodes\n• Exchange delivery in 3-5 business days\n• If the variant is unavailable, a refund is initiated automatically\nDetails: /return-policy`
  },
  refund: {
    hi: `Refund timeline:\n• Quality check pass hone ke baad prepaid refund 3-7 business days me\n• COD refund verified bank account ya UPI me\n• Refund status My Orders me track kar sakte hain\nDetails: /return-policy`,
    en: `Refund timeline:\n• Prepaid refunds land in 3-7 business days after the quality check clears\n• COD refunds go to a verified bank account or UPI\n• You can track refund status from My Orders\nDetails: /return-policy`
  },
  delivery: {
    hi: `Delivery timeline:\n• Metro cities: 2-4 business days\n• Tier-2/3 cities: 4-7 business days\n• Sale events me 1-2 din extra lag sakte hain\n• Har stage par email update aata hai\nDetails: /faq`,
    en: `Delivery timeline:\n• Metro cities: 2-4 business days\n• Tier-2/3 cities: 4-7 business days\n• Sale events may add 1-2 days\n• You get an email update at every stage\nDetails: /faq`
  },
  tracking: {
    hi: `Order tracking: My Orders kholein aur apna order select karein — live status, timeline aur ETA wahin dikhta hai. Har status change par email bhi jaata hai. Link: /my-orders`,
    en: `Order tracking: open My Orders and select your order — live status, timeline and ETA are all there. You also get an email at each status change. Link: /my-orders`
  },
  cancel: {
    hi: `Order cancellation:\n• Packing se pehle bilkul free cancel ho jaata hai — My Orders se\n• Dispatch ke baad cancel nahi hota, tab return flow use karein\n• Prepaid amount cancel hone par 3-7 business days me wapas\nDetails: /my-orders`,
    en: `Order cancellation:\n• Free cancellation until the order is packed — do it from My Orders\n• After dispatch, cancellation is not possible; use the return flow instead\n• Prepaid amounts are refunded within 3-7 business days of cancellation\nDetails: /my-orders`
  },
  cod: {
    hi: `COD availability pincode aur order value par depend karti hai. Serviceable hone par checkout par option apne aap dikh jaata hai. Baaki payment options: UPI, card, netbanking (Razorpay). Details: /faq`,
    en: `COD availability depends on your pincode and order value. When serviceable, the option shows up automatically at checkout. Other options: UPI, card and netbanking via Razorpay. Details: /faq`
  },
  payment: {
    hi: `Payment options:\n• UPI (GPay, PhonePe, Paytm) — Razorpay ke through\n• Debit/Credit card aur Netbanking\n• COD serviceable pincodes par\nCard details Eshopper store nahi karta; payment gateway PCI-compliant hai. Payment fail ho to amount 3-5 din me auto-refund hota hai. Details: /faq`,
    en: `Payment options:\n• UPI (GPay, PhonePe, Paytm) through Razorpay\n• Debit/credit cards and netbanking\n• COD at serviceable pincodes\nEshopper never stores your card details; the gateway is PCI compliant. If a payment fails, the amount auto-reverses in 3-5 days. Details: /faq`
  },
  coupon: {
    hi: `Coupons:\n• Cart page par coupon code apply karein\n• Ek order par ek coupon lagta hai\n• Minimum order value aur usage limit ho sakti hai\n• Live offers cart aur home page par dikhte hain\nMain aapko abhi ke sabse bade discounts bhi dikha sakta hoon — bas "best deals" likh dijiye.`,
    en: `Coupons:\n• Apply the code on the cart page\n• One coupon per order\n• Minimum order value and usage limits may apply\n• Live offers are shown on the cart and home pages\nI can also pull up the biggest live discounts — just say "best deals".`
  },
  'size-guide': {
    hi: `Size guide:\n• Har product page par size chart diya hota hai\n• Shirt/kurta me chest, jeans/trouser me waist decide karta hai\n• Oversized look chahiye to ek size upar\n• Sizes XXS se 6XL tak (product ke hisaab se)\nApna usual size bata dijiye, main sirf wahi products dikhaunga jo us size me stock me hain.`,
    en: `Size guide:\n• Every product page has a size chart\n• Chest decides it for shirts and kurtas; waist for jeans and trousers\n• Going oversized? Take one size up\n• Sizes run from XXS to 6XL depending on the product\nTell me your usual size and I will only show pieces that actually have it in stock.`
  },
  account: {
    hi: `Account help:\n• Login/Signup email ya OTP se hota hai\n• Password bhool gaye to Forgot Password se OTP par reset karein\n• Profile me address, size aur preferences save kar sakte hain\n• Wishlist aur Cart account ke sath sync rehte hain\nLinks: /login, /profile, /wishlist`,
    en: `Account help:\n• Log in or sign up with email or OTP\n• Forgot your password? Reset it via Forgot Password using an OTP\n• Save addresses, sizes and preferences in Profile\n• Wishlist and Cart stay synced to your account\nLinks: /login, /profile, /wishlist`
  },
  contact: {
    hi: `Contact ${BRAND_NAME}:\n• Email: ${BRAND_EMAIL}\n• Phone: ${BRAND_PHONE}\n• Address: ${BRAND_ADDRESS}\n• Website: ${BRAND_SITE}\nSupport hours: 10 AM - 8 PM. Page: /contact`,
    en: `Contact ${BRAND_NAME}:\n• Email: ${BRAND_EMAIL}\n• Phone: ${BRAND_PHONE}\n• Address: ${BRAND_ADDRESS}\n• Website: ${BRAND_SITE}\nSupport hours: 10 AM - 8 PM. Page: /contact`
  },
  terms: {
    hi: `Terms highlights:\n• Quality, authenticity aur craftsmanship par focus\n• Premium logistics with insured delivery\n• 7-day return policy (eligible items)\n• Data security aur privacy par strong focus\nPoora text: /terms`,
    en: `Terms highlights:\n• Focus on quality, authenticity and craftsmanship\n• Premium logistics with insured delivery\n• 7-day return policy on eligible items\n• Strong data security and privacy practices\nFull text: /terms`
  },
  about: {
    hi: `${BRAND_NAME} ke baare me:\n• 2024 me shuru — premium aur sustainable fashion\n• Sizes XXS-6XL, global delivery (32+ countries)\n• Men, women, kids aur accessories ke curated collections\nDetails: /about`,
    en: `About ${BRAND_NAME}:\n• Founded in 2024 with a premium, sustainable fashion focus\n• Sizes XXS-6XL, delivery to 32+ countries\n• Curated collections for men, women, kids and accessories\nDetails: /about`
  }
}

const INTENTS = [
  { key: 'tracking', phrases: ['track my order', 'track order', 'tracking', 'order status', 'where is my order', 'order kahan', 'kab aayega', 'kab tak aayega'] },
  { key: 'cancel', phrases: ['cancel order', 'cancel my order', 'order cancel', 'cancellation', 'cancel kar'] },
  { key: 'return-policy', phrases: ['return policy', 'return', 'returns', 'wapas kar', 'return kaise'] },
  { key: 'exchange', phrases: ['exchange', 'replace', 'replacement', 'badal'] },
  { key: 'refund', phrases: ['refund', 'money back', 'paisa wapas', 'paise kab'] },
  { key: 'size-guide', phrases: ['size chart', 'size guide', 'which size', 'what size', 'size kaise', 'konsa size', 'measurement', 'fitting'] },
  { key: 'coupon', phrases: ['coupon', 'promo code', 'discount code', 'voucher', 'apply code', 'offer code'] },
  { key: 'payment', phrases: ['payment', 'payment method', 'payment option', 'how to pay', 'how can i pay', 'how do i pay', 'modes of payment', 'pay online', 'upi', 'razorpay', 'netbanking', 'credit card', 'debit card', 'emi', 'paise kaise', 'paisa kaise'] },
  { key: 'cod', phrases: ['cod', 'cash on delivery'] },
  { key: 'delivery', phrases: ['delivery', 'shipping', 'shipping charge', 'dispatch', 'kitne din me', 'delivery charge'] },
  { key: 'account', phrases: ['login', 'log in', 'signup', 'sign up', 'my account', 'forgot password', 'reset password', 'profile', 'account'] },
  { key: 'contact', phrases: ['contact', 'customer care', 'customer support', 'helpline', 'phone number', 'email address', 'whatsapp'] },
  { key: 'terms', phrases: ['terms', 'conditions', 't c', 'privacy policy', 'privacy'] },
  { key: 'about', phrases: ['about eshopper', 'about you company', 'brand story', 'company mission', 'who founded'] }
]

/* Returns { topic, text } or null. The caller may use the text
   directly (instant answer) or feed it to the model as grounding. */
export const getSiteKnowledge = ({ text, language }) => {
  const lower = normalizeIntentText(text)
  if (!lower) return null

  const matched = INTENTS.find((intent) => intent.phrases.some((p) => lower.includes(p)))
  if (!matched) return null

  const entry = T[matched.key]
  if (!entry) return null

  return { topic: matched.key, text: isHindiLike(language) ? entry.hi : entry.en }
}

/* Legacy signature kept so older callers do not break */
export const getSiteKnowledgeReply = ({ text, language }) => {
  const found = getSiteKnowledge({ text, language })
  return found ? found.text : null
}

export const listKnowledgeTopics = () => Object.keys(T)
