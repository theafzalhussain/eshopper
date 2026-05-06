import { HINDI_WORDS, HINGLISH_INDICATORS } from './constants'

const TYPO_REPLACEMENTS = {
  helo: 'hello',
  hallo: 'hello',
  hiii: 'hi',
  hlo: 'hello',
  gud: 'good',
  moring: 'morning',
  mornng: 'morning',
  evning: 'evening',
  profeesional: 'professional',
  proffesional: 'professional',
  repsoe: 'response',
  responce: 'response',
  repsonse: 'response',
  mesage: 'message',
  messsage: 'message',
  freindly: 'friendly',
  frindly: 'friendly',
  sugest: 'suggest',
  sugestion: 'suggestion',
  reccomend: 'recommend',
  recomend: 'recommend',
  jurkty: 'kurti',
  tshrt: 'tshirt',
  womans: 'women',
  menss: 'mens',
  kidz: 'kids',
  dikhaoo: 'dikhao',
  dikhado: 'dikhao',
  bataoo: 'batao',
  btado: 'batao',
  kaisee: 'kaise',
  kaese: 'kaise',
  theekk: 'theek',
  chahie: 'chahiye',
  chahiyee: 'chahiye',
  krdo: 'kardo',
  plz: 'please',
  pls: 'please'
}

const FUZZY_VOCAB = new Set([
  'hi', 'hello', 'hey', 'namaste', 'namaskar', 'salam', 'how', 'are', 'you',
  'show', 'product', 'products', 'image', 'images', 'dress', 'shirt', 'jeans', 'kurti',
  'men', 'mens', 'women', 'womens', 'kids', 'boys', 'girls',
  'party', 'casual', 'office', 'formal', 'budget', 'under', 'above', 'around',
  'return', 'exchange', 'refund', 'delivery', 'tracking', 'contact',
  'hindi', 'english', 'reply', 'speak', 'talk',
  'kaise', 'kya', 'haal', 'theek', 'chahiye', 'dikhao', 'batao', 'madad'
])

const normalizeRepeatedChars = (token = '') => token.replace(/(.)\1{2,}/g, '$1$1')

const levenshteinDistance = (a = '', b = '') => {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[m][n]
}

const correctToken = (rawToken = '') => {
  const token = normalizeRepeatedChars(rawToken.toLowerCase())
  if (!token) return token
  if (TYPO_REPLACEMENTS[token]) return TYPO_REPLACEMENTS[token]
  if (FUZZY_VOCAB.has(token) || token.length <= 2) return token

  let bestWord = token
  let bestDistance = 3
  FUZZY_VOCAB.forEach((word) => {
    if (Math.abs(word.length - token.length) > 2) return
    const distance = levenshteinDistance(token, word)
    if (distance < bestDistance) {
      bestDistance = distance
      bestWord = word
    }
  })

  return bestDistance <= 2 ? bestWord : token
}

export const normalizeIntentText = (text = '') => {
  const safe = String(text || '').toLowerCase()
  const compact = safe.replace(/[^a-z0-9\u0900-\u097f\s]/gi, ' ').replace(/\s+/g, ' ').trim()
  if (!compact) return ''

  const normalized = compact
    .split(' ')
    .map(correctToken)
    .join(' ')
    .replace(/\bhwo\s+are\s+you\b/g, 'how are you')
    .replace(/\bhw\s+are\s+you\b/g, 'how are you')
    .replace(/\bhow\s+r\s+u\b/g, 'how are you')
    .replace(/\bkya\s+hal\b/g, 'kya haal')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

export const detectLanguage = (text) => {
  if (!text) return 'en'
  const lower = normalizeIntentText(text)
  if (/(no hindi|not hindi|dont want hindi|don't want hindi|english only)/i.test(lower)) {
    return 'en'
  }
  const hasDevanagari = /[\u0900-\u097F]/.test(text)
  if (hasDevanagari) return 'hi'

  const hasOtherScript = /[\u0600-\u06FF\u0750-\u077F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0400-\u04FF\u4E00-\u9FFF]/.test(text)
  if (hasOtherScript) return 'user'

  if (lower.includes('speak hindi') || lower.includes('talk in hindi') || lower.includes('hindi me') || lower.includes('hindi mein')) {
    return 'hi'
  }
  if (lower.includes('speak english') || lower.includes('talk in english') || lower.includes('english please') || lower.includes('reply in english')) {
    return 'en'
  }

  const words = lower.split(/\s+/)
  const hindiCount = words.filter((w) => HINDI_WORDS.includes(w)).length
  const hasHinglish = HINGLISH_INDICATORS.some((word) => lower.includes(word))

  if (hindiCount >= 2 || hasHinglish) return 'hi'
  if (hindiCount === 1 && words.length <= 4) return 'hi'
  return 'en'
}

export const detectLanguagePreferenceRequest = (text = '') => {
  const lower = normalizeIntentText(text)
  const wantsHindi = /(?:hindi\s*(?:me|mein)|speak\s+hindi|talk\s+in\s+hindi|reply\s+in\s+hindi|hindi\s+please)/i.test(lower)
  const wantsEnglish = /(?:english\s*(?:me|mein)|speak\s+english|talk\s+in\s+english|reply\s+in\s+english|english\s+please|english\s+only)/i.test(lower)
  if (wantsHindi) {
    return 'hi'
  }
  if (wantsEnglish) {
    return 'en'
  }
  return null
}

export const isGreetingMessage = (text = '') => {
  const lower = normalizeIntentText(text)
  if (!lower) return false
  const directGreeting = /^(hi|hello|hey|hii|helo|namaste|namaskar|salam|assalamualaikum)$/i.test(lower)
  const containsGreeting = /\b(hi|hello|hey|namaste|namaskar|salam|assalamualaikum)\b/i.test(lower)
  return directGreeting || (containsGreeting && lower.split(/\s+/).length <= 6)
}

export const isHowAreYouQuery = (text = '') => {
  const lower = normalizeIntentText(text)
  const englishPatterns = /\b(how are you|how're you|how r u|how r you|how do you do|how's it going|what's up|wassup|sup)\b/i
  const hindiPatterns = /\b(kaise ho|kaisi ho|kese ho|kesi ho|kya haal|kya hal hai|sab theek|sab thik|aap kaise|tum kaise)\b/i
  return englishPatterns.test(lower) || hindiPatterns.test(lower)
}

export const isProductDetailsQuery = (text = '', lastProducts = []) => {
  if (lastProducts.length === 0) return false
  const lower = normalizeIntentText(text)
  const detailWords = ['detail', 'details', 'about', 'tell me', 'batao', 'info', 'information', 'describe', 'more about', 'iske baare', 'uske baare', 'this', 'that', 'ye', 'yeh', 'wo', 'woh', 'suggested', 'recommended', 'last', 'previous', 'pehle']
  return detailWords.some(word => lower.includes(word)) && lower.split(/\s+/).length <= 8
}

export const normalizeResponseLanguage = ({ responseText, language, isGreeting, wantsProducts, userName }) => {
  if (language !== 'hi') return responseText

  const cleaned = String(responseText || '').trim()
  const hasDevanagari = /[\u0900-\u097F]/.test(cleaned)
  const lower = cleaned.toLowerCase()
  const hasHindiHint = HINDI_WORDS.some((w) => lower.includes(` ${w} `) || lower.startsWith(`${w} `) || lower.endsWith(` ${w}`))

  if (hasDevanagari || hasHindiHint) return responseText

  if (isGreeting) {
    return `Namaste ${userName || 'aap'}! Main aapka fashion concierge hoon. Kripya batayein, aapko kis type ke outfit ki zarurat hai?`
  }

  if (wantsProducts) {
    return `Aapke request ke hisab se maine products shortlist kiye hain. Kripya niche cards dekhein.`
  }

  return `Samajh gaya. Kripya apni requirement batayein, main sahi options share karunga.`
}

export const detectConversationStyle = (text = '') => {
  const lower = normalizeIntentText(text)
  const politeWords = ['please', 'plz', 'kindly', 'kripya', 'pleasey']
  const friendlyWords = ['bhai', 'bro', 'dost', 'yaar', 'buddy', 'friend']
  const conciseWords = ['quick', 'jaldi', 'fast', 'short', 'brief']

  const isPolite = politeWords.some((w) => lower.includes(w))
  const isFriendly = friendlyWords.some((w) => lower.includes(w))
  const wantsConcise = conciseWords.some((w) => lower.includes(w))

  return {
    tone: isFriendly ? 'warm' : (isPolite ? 'formal' : 'professional'),
    responseLength: wantsConcise ? 'short' : 'normal'
  }
}

export const summarizeUserNeeds = (messages = []) => {
  const userTexts = messages
    .filter((m) => m?.sender === 'user' && typeof m?.text === 'string')
    .slice(-8)
    .map((m) => m.text.toLowerCase())

  if (userTexts.length === 0) {
    return 'No prior preference captured yet.'
  }

  const corpus = userTexts.join(' ')
  const colors = ['black', 'white', 'blue', 'red', 'green', 'pink', 'brown', 'gold', 'silver']
  const occasions = ['party', 'wedding', 'casual', 'office', 'formal', 'college', 'festive']
  const budgetMatch = corpus.match(/(?:under|below|upto|within|around|near)\s*\d{2,6}|\d{2,6}\s*(?:rs|inr)/g) || []

  const pickedColors = colors.filter((c) => corpus.includes(c)).slice(0, 2)
  const pickedOccasions = occasions.filter((o) => corpus.includes(o)).slice(0, 2)

  return [
    pickedColors.length ? `Preferred colors: ${pickedColors.join(', ')}` : null,
    pickedOccasions.length ? `Occasion hints: ${pickedOccasions.join(', ')}` : null,
    budgetMatch.length ? `Budget hints: ${budgetMatch.slice(0, 2).join(', ')}` : null
  ].filter(Boolean).join(' | ') || 'No clear color/occasion/budget preference from recent chat.'
}
