import { COLOR_KEYWORDS, SIZE_KEYWORDS, MEN_WORDS, WOMEN_WORDS } from './constants'

const PREF_KEY = 'chatbot_preferences'
const SPEED_KEY = 'chatbot_typing_speed'

export const DEFAULT_PREFERENCES = {
  size: null,
  color: null,
  budget: null,
  gender: null
}

const isValidBudget = (budget) => budget && (budget.min !== null || budget.max !== null)

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

const parseColor = (text) => {
  if (!text) return null
  const lower = text.toLowerCase()
  return COLOR_KEYWORDS.find((color) => lower.includes(color)) || null
}

const parseSize = (text) => {
  if (!text) return null
  const lower = text.toLowerCase()
  const sizeToken = SIZE_KEYWORDS.find((size) => lower.includes(size))
  if (sizeToken) return sizeToken.toUpperCase()

  const match = lower.match(/size\s*[:=]?\s*(xs|s|m|l|xl|xxl|2xl|3xl|4xl|\d{2})/)
  return match ? String(match[1]).toUpperCase() : null
}

const parseGender = (text) => {
  if (!text) return null
  const lower = text.toLowerCase()
  if (MEN_WORDS.some((word) => lower.includes(word))) return 'men'
  if (WOMEN_WORDS.some((word) => lower.includes(word))) return 'women'
  return null
}

export const loadPreferences = () => {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export const savePreferences = (prefs) => {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  } catch {
    // ignore storage failures
  }
}

export const updatePreferencesFromText = (text, currentPrefs) => {
  const current = currentPrefs || { ...DEFAULT_PREFERENCES }
  const lower = String(text || '').toLowerCase()
  if (!lower) return { prefs: current, changed: false, reset: false }

  if (/(reset|clear)\s+(preferences|memory)/.test(lower)) {
    return { prefs: { ...DEFAULT_PREFERENCES }, changed: true, reset: true }
  }

  const next = { ...current }
  const color = parseColor(lower)
  const size = parseSize(lower)
  const gender = parseGender(lower)
  const budget = parseBudgetRange(lower)

  if (color) next.color = color
  if (size) next.size = size
  if (gender) next.gender = gender
  if (budget) next.budget = budget

  const changed = JSON.stringify(next) !== JSON.stringify(current)
  return { prefs: next, changed, reset: false }
}

export const formatPreferences = (prefs, language) => {
  const data = prefs || DEFAULT_PREFERENCES
  const parts = []

  if (data.gender) parts.push(`gender: ${data.gender}`)
  if (data.size) parts.push(`size: ${data.size}`)
  if (data.color) parts.push(`color: ${data.color}`)
  if (isValidBudget(data.budget)) {
    const min = data.budget.min !== null ? data.budget.min : 0
    const max = data.budget.max !== null ? data.budget.max : null
    parts.push(`budget: ${min}${max ? '-' + max : '+'}`)
  }

  if (!parts.length) return ''

  if (language === 'hi') {
    return `User preferences: ${parts.join(', ')}`
  }

  return `User preferences: ${parts.join(', ')}`
}

export const loadTypingSpeed = () => {
  try {
    return localStorage.getItem(SPEED_KEY) || 'fast'
  } catch {
    return 'fast'
  }
}

export const saveTypingSpeed = (speed) => {
  try {
    localStorage.setItem(SPEED_KEY, speed)
  } catch {
    // ignore storage failures
  }
}

export const detectTypingSpeedPreference = (text) => {
  const lower = String(text || '').toLowerCase()
  if (!lower) return null

  const isSpeedRequest = /(typing speed|reply speed|response speed|typing speed)/.test(lower)
  const isInstant = /instant reply|no typing|instant mode/.test(lower)
  const isFast = /fast reply|fast typing|speed fast|typing speed fast/.test(lower)
  const isSlow = /slow reply|slow typing|speed slow|typing speed slow/.test(lower)
  const isNormal = /normal speed|default speed|typing speed normal/.test(lower)

  if (isInstant) return 'instant'
  if (isFast && isSpeedRequest) return 'fast'
  if (isSlow && isSpeedRequest) return 'slow'
  if (isNormal && isSpeedRequest) return 'normal'
  return null
}

export const buildTypingSpeedReply = ({ language, speed }) => {
  const label = speed || 'fast'
  if (language === 'hi') {
    return `Typing speed ${label} set ho gayi hai.`
  }
  return `Typing speed set to ${label}.`
}
