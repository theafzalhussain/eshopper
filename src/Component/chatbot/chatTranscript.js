import { TRANSCRIPT_KEY } from './constants'

/* ══════════════════════════════════════════════════════════
   TRANSCRIPT PERSISTENCE
   Conversations survive reloads and page navigation for 7 days.
   We trim aggressively so localStorage never blows up, and we
   degrade gracefully if the quota is hit or the data is corrupt.
══════════════════════════════════════════════════════════ */
export const TRANSCRIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const MAX_SAVED_MESSAGES = 40
export const MAX_SAVED_PRODUCTS = 4

/* Only the fields the product card actually renders */
export const slimProduct = (p = {}) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  basePrice: p.basePrice,
  discount: p.discount,
  savings: p.savings,
  image: p.image,
  link: p.link,
  brand: p.brand,
  rating: p.rating,
  reviews: p.reviews,
  fabric: p.fabric,
  size: p.size,
  color: p.color,
  maincategory: p.maincategory,
  subcategory: p.subcategory,
  stock: p.stock,
  stockLabel: p.stockLabel,
  inStock: p.inStock,
  newArrival: p.newArrival,
  matchReason: p.matchReason
})

const store = () => {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export const clearTranscript = () => {
  const ls = store()
  if (!ls) return
  try { ls.removeItem(TRANSCRIPT_KEY) } catch { /* ignore */ }
}

export const loadTranscript = () => {
  const ls = store()
  if (!ls) return null
  try {
    const raw = ls.getItem(TRANSCRIPT_KEY)
    if (!raw) return null

    const saved = JSON.parse(raw)
    if (!saved || !Array.isArray(saved.messages) || saved.messages.length === 0) return null

    if (!saved.savedAt || Date.now() - saved.savedAt > TRANSCRIPT_TTL_MS) {
      clearTranscript()
      return null
    }

    const messages = saved.messages
      .filter((m) => m && (m.sender === 'bot' || m.sender === 'user') && typeof m.text === 'string' && m.text.trim())
      .map((m, i) => ({
        id: m.id || Date.now() + i,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        products: Array.isArray(m.products) ? m.products : [],
        followUps: Array.isArray(m.followUps) && m.followUps.length ? m.followUps : null,
        typing: false
      }))

    if (messages.length === 0) return null

    return {
      messages,
      lastProducts: Array.isArray(saved.lastProducts) ? saved.lastProducts : [],
      savedAt: saved.savedAt
    }
  } catch {
    clearTranscript()
    return null
  }
}

export const saveTranscript = (messages = [], lastProducts = []) => {
  const ls = store()
  if (!ls) return

  const clean = (messages || []).filter((m) => m && m.text && !m.typing)

  if (clean.length === 0) {
    clearTranscript()
    return
  }

  const pack = (list, withProducts) => JSON.stringify({
    savedAt: Date.now(),
    messages: list.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: new Date(m.timestamp || Date.now()).toISOString(),
      products: withProducts ? (m.products || []).slice(0, MAX_SAVED_PRODUCTS).map(slimProduct) : [],
      followUps: withProducts ? (m.followUps || null) : null
    })),
    lastProducts: withProducts ? (lastProducts || []).slice(0, MAX_SAVED_PRODUCTS).map(slimProduct) : []
  })

  try {
    ls.setItem(TRANSCRIPT_KEY, pack(clean.slice(-MAX_SAVED_MESSAGES), true))
  } catch {
    /* quota exceeded — keep the recent text only */
    try {
      ls.setItem(TRANSCRIPT_KEY, pack(clean.slice(-10), false))
    } catch { /* give up silently */ }
  }
}

/* Has the customer actually said something yet? */
export const hasUserTurn = (transcript) => Boolean(
  transcript?.messages?.some((m) => m.sender === 'user')
)

export const lastFollowUps = (transcript) => {
  const list = transcript?.messages || []
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].sender === 'bot' && list[i].followUps?.length) return list[i].followUps
  }
  return null
}
