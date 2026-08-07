import { extractSlots } from './intentEngine'

const PREF_KEY = 'chatbot_preferences'
const SPEED_KEY = 'chatbot_typing_speed'

export const DEFAULT_PREFERENCES = {
  size: null,
  color: null,
  budget: null,
  gender: null,
  fabric: null,
  brand: null,
  occasion: null
}

const isValidBudget = (budget) => budget && (budget.min !== null || budget.max !== null)

export const loadPreferences = () => {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export const savePreferences = (prefs) => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)) } catch { /* ignore */ }
}

/* Slot extraction is shared with the intent engine so a size like "s"
   is only captured when it is genuinely a size mention. */
export const updatePreferencesFromText = (text, currentPrefs) => {
  const current = currentPrefs || { ...DEFAULT_PREFERENCES }
  const raw = String(text || '')
  if (!raw.trim()) return { prefs: current, changed: false, reset: false }

  if (/(reset|clear|forget)\s+(my\s+)?(preferences|memory|prefs|everything)/i.test(raw)) {
    return { prefs: { ...DEFAULT_PREFERENCES }, changed: true, reset: true }
  }

  const slots = extractSlots(raw)
  const next = { ...current }

  if (slots.colors?.length) next.color = slots.colors[0]
  if (slots.sizes?.length) next.size = slots.sizes[0]
  if (slots.audience) next.gender = slots.audience
  if (slots.budget) next.budget = slots.budget
  if (slots.fabrics?.length) next.fabric = slots.fabrics[0]
  if (slots.brands?.length) next.brand = slots.brands[0]
  if (slots.occasions?.length) next.occasion = slots.occasions[0]

  const changed = JSON.stringify(next) !== JSON.stringify(current)
  return { prefs: next, changed, reset: false }
}

export const formatPreferences = (prefs) => {
  const data = prefs || DEFAULT_PREFERENCES
  const parts = []

  if (data.gender) parts.push(`shops for: ${data.gender}`)
  if (data.size) parts.push(`usual size: ${data.size}`)
  if (data.color) parts.push(`favourite colour: ${data.color}`)
  if (data.fabric) parts.push(`prefers fabric: ${data.fabric}`)
  if (data.brand) parts.push(`likes brand: ${data.brand}`)
  if (data.occasion) parts.push(`shopping for: ${data.occasion}`)
  if (isValidBudget(data.budget)) {
    const min = data.budget.min ?? 0
    const max = data.budget.max
    parts.push(`budget: ${max ? `₹${min}-₹${max}` : `₹${min}+`}`)
  }

  return parts.length ? parts.join(', ') : ''
}

export const loadTypingSpeed = () => {
  try { return localStorage.getItem(SPEED_KEY) || 'fast' } catch { return 'fast' }
}

export const saveTypingSpeed = (speed) => {
  try { localStorage.setItem(SPEED_KEY, speed) } catch { /* ignore */ }
}

export const detectTypingSpeedPreference = (text) => {
  const lower = String(text || '').toLowerCase()
  if (!lower) return null

  const isSpeedRequest = /(typing speed|reply speed|response speed|type speed)/.test(lower)
  if (/instant reply|no typing|instant mode|turant reply/.test(lower)) return 'instant'
  if (!isSpeedRequest) return null
  if (/fast|quick|jaldi/.test(lower)) return 'fast'
  if (/slow|dheere/.test(lower)) return 'slow'
  if (/normal|default/.test(lower)) return 'normal'
  return null
}

export const buildTypingSpeedReply = ({ language, speed }) => {
  const label = speed || 'fast'
  return language === 'hi'
    ? `Ho gaya — typing speed ab ${label} hai.`
    : `Done — typing speed is now ${label}.`
}
