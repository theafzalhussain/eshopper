import { HINDI_WORDS, HINGLISH_INDICATORS, DOMAIN_VOCAB, FUZZY_VOCAB } from './constants'

/* ══════════════════════════════════════════════════════════
   TYPO NORMALISATION
   Rule: only repair chit-chat words. Never touch shopping
   vocabulary — the old version rewrote "shoes" -> "show".
══════════════════════════════════════════════════════════ */
const TYPO_REPLACEMENTS = {
  helo: 'hello', hallo: 'hello', hlo: 'hello', hii: 'hi', hiii: 'hi', heyy: 'hey',
  gud: 'good', gd: 'good', moring: 'morning', mornng: 'morning', evning: 'evening',
  thankz: 'thanks', thnks: 'thanks', thx: 'thanks', tq: 'thanks', tnx: 'thanks',
  profeesional: 'professional', proffesional: 'professional',
  responce: 'response', repsonse: 'response', repsoe: 'response',
  mesage: 'message', messsage: 'message', freindly: 'friendly', frindly: 'friendly',
  sugest: 'suggest', sugestion: 'suggestion', sugesst: 'suggest',
  reccomend: 'recommend', recomend: 'recommend', recommand: 'recommend',
  plz: 'please', pls: 'please', pleas: 'please', kindaly: 'kindly',
  /* shopping typos — explicit, safe mappings only */
  jurkty: 'kurti', kurty: 'kurti', kurthi: 'kurti', kurtis: 'kurti',
  tshrt: 'tshirt', tshit: 'tshirt', tshit_: 'tshirt', shrt: 'shirt', shirtt: 'shirt',
  jens: 'jeans', jeens: 'jeans', jeanss: 'jeans',
  shooes: 'shoes', shose: 'shoes', shoose: 'shoes',
  sari: 'saree', saaree: 'saree', sarre: 'saree',
  lehnga: 'lehenga', lehanga: 'lehenga',
  wemen: 'women', womans: 'women', womon: 'women', wonen: 'women',
  menss: 'mens', mans: 'men', kidz: 'kids', kids_: 'kids',
  disocunt: 'discount', discout: 'discount', discunt: 'discount',
  pirce: 'price', prise: 'price', prize: 'price',
  buget: 'budget', budgt: 'budget',
  dikhaoo: 'dikhao', dikhado: 'dikhao', dekhao: 'dikhao', dikao: 'dikhao',
  bataoo: 'batao', btado: 'batao', btao: 'batao',
  kaisee: 'kaise', kaese: 'kaise', kese: 'kaise',
  theekk: 'theek', thik: 'theek', chahie: 'chahiye', chahiyee: 'chahiye', chaiye: 'chahiye',
  krdo: 'kardo', mujhee: 'mujhe', muje: 'mujhe'
}

const normalizeRepeatedChars = (token = '') => token.replace(/(.)\1{2,}/g, '$1$1')

const levenshteinDistance = (a = '', b = '') => {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j += 1) prev[j] = j

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const swap = prev
    prev = curr
    curr = swap
  }
  return prev[n]
}

const correctToken = (rawToken = '') => {
  const raw = rawToken.toLowerCase()
  if (!raw) return raw

  /* Numbers must survive untouched — collapsing repeats used to turn
     "2000" into "200" and silently wrecked every budget filter. */
  if (/\d/.test(raw)) return raw

  /* 1. Real shopping word? leave untouched. */
  if (DOMAIN_VOCAB.has(raw)) return raw
  if (TYPO_REPLACEMENTS[raw]) return TYPO_REPLACEMENTS[raw]

  const token = normalizeRepeatedChars(raw)
  if (DOMAIN_VOCAB.has(token)) return token
  if (TYPO_REPLACEMENTS[token]) return TYPO_REPLACEMENTS[token]

  /* 2. Never fuzzy-match short tokens or known chat words. */
  if (token.length <= 3) return token
  if (FUZZY_VOCAB.has(token)) return token

  /* 3. Simple plural of a domain word (shoes/shirts/bags) -> keep as is. */
  if (token.endsWith('s') && DOMAIN_VOCAB.has(token.slice(0, -1))) return token
  if (token.endsWith('es') && DOMAIN_VOCAB.has(token.slice(0, -2))) return token

  /* 4. Conservative fuzzy repair against chit-chat vocab only. */
  let bestWord = token
  let bestDistance = 2
  FUZZY_VOCAB.forEach((word) => {
    if (word.length < 4) return
    if (Math.abs(word.length - token.length) > 1) return
    const distance = levenshteinDistance(token, word)
    if (distance < bestDistance) {
      bestDistance = distance
      bestWord = word
    }
  })

  return bestDistance <= 1 ? bestWord : token
}

export const normalizeIntentText = (text = '') => {
  const safe = String(text || '').toLowerCase()
  const compact = safe
    .replace(/[₹]/g, ' rs ')
    .replace(/%/g, ' percent ')
    .replace(/[^a-z0-9\u0900-\u097f\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!compact) return ''

  return compact
    .split(' ')
    .map(correctToken)
    .join(' ')
    .replace(/\bhwo\s+are\s+you\b/g, 'how are you')
    .replace(/\bhw\s+are\s+you\b/g, 'how are you')
    .replace(/\bhow\s+r\s+u\b/g, 'how are you')
    .replace(/\bkya\s+hal\b/g, 'kya haal')
    .replace(/\bt\s+shirt\b/g, 'tshirt')
    .replace(/\bt-shirt\b/g, 'tshirt')
    .replace(/\bco-ord\b/g, 'coord')
    .replace(/\s+/g, ' ')
    .trim()
}

const hasWord = (text, word) => {
  if (!word) return false
  if (word.includes(' ')) return text.includes(word)
  return new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?($|\\s)`).test(text)
}

export const containsAnyWord = (text = '', words = []) => words.some((word) => hasWord(text, word))

/* ══════════════════════════════════════════════════════════
   LANGUAGE DETECTION
   Three real modes our shoppers use:
   'hi'       -> Devanagari Hindi        (reply in Devanagari)
   'hinglish' -> Roman Hindi / mixed     (reply in Roman Hinglish)
   'en'       -> English                 (reply in English)
   'user'     -> some other script       (mirror it)
══════════════════════════════════════════════════════════ */
export const isHindiLike = (language) => language === 'hi' || language === 'hinglish'

export const LANGUAGE_LABELS = {
  hi: 'Hindi (Devanagari)',
  hinglish: 'Hinglish (Roman Hindi mixed with English)',
  en: 'English',
  user: "the customer's own language"
}

/* Words counted for Hindi detection. Deliberately excludes anything that
   collides with English so an English sentence is never mistaken for Hindi.
   Default is ALWAYS English — we only switch when the customer clearly
   writes Hindi or Hinglish themselves. */
const HINDI_DETECT_WORDS = HINDI_WORDS.filter((w) => w !== 'hindi' && !w.includes(' '))

export const detectLanguage = (text) => {
  if (!text) return 'en'
  const raw = String(text)
  const lower = normalizeIntentText(raw)

  if (/(no hindi|not hindi|dont want hindi|don't want hindi|english only)/.test(lower)) return 'en'

  if (/[\u0900-\u097F]/.test(raw)) return 'hi'

  const hasOtherScript = /[\u0600-\u06FF\u0750-\u077F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0400-\u04FF\u4E00-\u9FFF]/.test(raw)
  if (hasOtherScript) return 'user'

  if (/(speak hindi|talk in hindi|hindi me|hindi mein|reply in hindi|hinglish)/.test(lower)) return 'hinglish'
  if (/(speak english|talk in english|english please|reply in english)/.test(lower)) return 'en'

  /* exact token match, so "me" or "do" can never trip this */
  const words = lower.split(/\s+/).filter(Boolean)
  const hindiCount = words.filter((w) => HINDI_DETECT_WORDS.includes(w)).length
  if (hindiCount > 0) return 'hinglish'

  const hasHinglishPhrase = HINGLISH_INDICATORS.some((phrase) => phrase.includes(' ') && lower.includes(phrase))
  if (hasHinglishPhrase) return 'hinglish'

  return 'en'
}

export const detectLanguagePreferenceRequest = (text = '') => {
  const raw = String(text || '')
  const lower = normalizeIntentText(raw)
  const hasDevanagari = /[\u0900-\u097F]/.test(raw)

  /* asked in Devanagari -> answer in Devanagari */
  if (/हिंदी|हिन्दी/.test(raw)) return 'hi'
  if (/अंग्रेज़ी|अंग्रेजी|इंग्लिश|इंगलिश/.test(raw)) return 'en'

  const wantsHindi = /(hindi\s*(?:me|mein)|speak\s+hindi|talk\s+in\s+hindi|reply\s+in\s+hindi|hindi\s+please|hinglish)/.test(lower)
  if (wantsHindi) return hasDevanagari ? 'hi' : 'hinglish'
  if (/(english\s*(?:me|mein)|speak\s+english|talk\s+in\s+english|reply\s+in\s+english|english\s+please|english\s+only)/.test(lower)) return 'en'
  return null
}

/* ══════════════════════════════════════════════════════════
   LIGHTWEIGHT MESSAGE CLASSIFIERS
══════════════════════════════════════════════════════════ */
const GREETING_WORDS = ['hi', 'hello', 'hey', 'namaste', 'namaskar', 'salam', 'assalamualaikum', 'yo', 'hola', 'good morning', 'good afternoon', 'good evening']

export const isGreetingMessage = (text = '') => {
  const lower = normalizeIntentText(text)
  if (!lower) return false
  const words = lower.split(/\s+/).filter(Boolean)
  if (words.length > 5) return false
  return GREETING_WORDS.some((g) => hasWord(lower, g))
}

export const isHowAreYouQuery = (text = '') => {
  const lower = normalizeIntentText(text)
  const en = /\b(how are you|how're you|how r u|how r you|how do you do|how is it going|hows it going|what s up|whats up|wassup)\b/
  const hi = /\b(kaise ho|kaisi ho|kese ho|kya haal|kya hal hai|sab theek|sab thik|aap kaise|tum kaise)\b/
  return en.test(lower) || hi.test(lower)
}

export const isThanksMessage = (text = '') => {
  const lower = normalizeIntentText(text)
  if (!lower) return false
  if (lower.split(/\s+/).length > 6) return false
  return /\b(thanks|thank you|thankyou|shukriya|dhanyavaad|dhanyawad|great work|nice work|awesome|perfect|helpful)\b/.test(lower)
}

export const isGoodbyeMessage = (text = '') => {
  const lower = normalizeIntentText(text)
  if (!lower) return false
  if (lower.split(/\s+/).length > 5) return false
  return /\b(bye|goodbye|good bye|see you|see ya|tata|alvida|chalta hoon|later|gtg)\b/.test(lower)
}

export const isComplaintMessage = (text = '') => {
  const lower = normalizeIntentText(text)
  if (!lower) return false
  return /\b(not working|doesn t work|worst|useless|bad quality|damaged|defective|torn|broken|wrong item|wrong size|late delivery|not delivered|still not|refund nahi|paisa nahi|cheat|fraud|complaint|angry|frustrated|bekar|ghatiya|galat)\b/.test(lower)
}

export const isProductDetailsQuery = (text = '', lastProducts = []) => {
  if (!Array.isArray(lastProducts) || lastProducts.length === 0) return false
  const lower = normalizeIntentText(text)
  if (!lower) return false
  if (lower.split(/\s+/).length > 12) return false

  const detailWords = [
    'detail', 'details', 'more about', 'tell me about', 'about this', 'about that',
    'info', 'information', 'describe', 'specification', 'spec', 'material', 'fabric',
    'iske baare', 'uske baare', 'iski detail', 'batao is', 'ye kaisa', 'ye kaisi',
    'first one', 'second one', 'third one', 'last one', 'this one', 'that one'
  ]
  if (detailWords.some((w) => lower.includes(w))) return true

  /* "iska price?" / "is it available?" style short follow-ups */
  const shortRef = /^(ye|yeh|is|this|that|wo|woh|uska|iska|iski)\b/.test(lower)
  return shortRef && lower.split(/\s+/).length <= 6
}

export const isComparisonQuery = (text = '') => {
  const lower = normalizeIntentText(text)
  return /\b(compare|comparison|vs|versus|difference between|which is better|kaunsa better|konsa accha|which one should|better option)\b/.test(lower)
}

export const isOutfitQuery = (text = '') => {
  const lower = normalizeIntentText(text)
  return /\b(outfit|full look|complete look|complete the look|whole look|pair with|match with|matching|styling tip|how to style|kaise pair|full set|head to toe)\b/.test(lower)
}

export const isSizeHelpQuery = (text = '') => {
  const lower = normalizeIntentText(text)
  return /\b(size chart|size guide|which size|what size|my size|size kaise|konsa size|size fit|fitting|true to size|size me confusion|measurement)\b/.test(lower)
}

/* ══════════════════════════════════════════════════════════
   RESPONSE SAFETY NET
   Only rewrite when the model clearly answered in the wrong
   language. Never overwrite a good, on-topic answer.
══════════════════════════════════════════════════════════ */
export const normalizeResponseLanguage = ({ responseText, language, isGreeting, wantsProducts, userName }) => {
  const cleaned = String(responseText || '').trim()
  if (!cleaned) return cleaned
  if (!isHindiLike(language)) return cleaned

  const hasDevanagari = /[\u0900-\u097F]/.test(cleaned)
  if (language === 'hi' && hasDevanagari) return cleaned
  if (language === 'hinglish' && hasDevanagari) return cleaned

  const lower = ` ${cleaned.toLowerCase()} `
  const hindiHits = HINDI_WORDS.filter((w) => lower.includes(` ${w} `)).length
  if (hindiHits >= 2) return cleaned

  /* Long English answers are still useful — keep them rather than
     replacing with a generic canned line. */
  if (cleaned.length > 160) return cleaned

  if (isGreeting) {
    return `Namaste ${userName || 'ji'}! Main Aria hoon, aapki personal style consultant. Bataiye, kis occasion ke liye kuch dhoondh rahe hain?`
  }
  if (wantsProducts) {
    return 'Aapke liye kuch behtareen options shortlist kiye hain, neeche dekh lijiye. Budget ya size bata dein to aur precise kar dunga.'
  }
  return 'Samajh gayi. Thoda detail bataiye — occasion, budget ya size — main exactly wahi options nikal dungi.'
}

export const detectConversationStyle = (text = '') => {
  const lower = normalizeIntentText(text)
  const politeWords = ['please', 'kindly', 'kripya']
  const friendlyWords = ['bhai', 'bro', 'dost', 'yaar', 'buddy', 'friend', 'bhaiya']
  const conciseWords = ['quick', 'jaldi', 'fast', 'short', 'brief', 'just tell', 'seedha']
  const detailWords = ['detail', 'explain', 'why', 'compare', 'kyun', 'samjhao']

  const isPolite = politeWords.some((w) => hasWord(lower, w))
  const isFriendly = friendlyWords.some((w) => hasWord(lower, w))
  const wantsConcise = conciseWords.some((w) => lower.includes(w))
  const wantsDetail = detailWords.some((w) => lower.includes(w))

  return {
    tone: isFriendly ? 'warm-friendly' : (isPolite ? 'polite-formal' : 'professional-warm'),
    responseLength: wantsConcise ? 'short' : (wantsDetail ? 'detailed' : 'normal')
  }
}

export const summarizeUserNeeds = (messages = []) => {
  const userTexts = messages
    .filter((m) => m?.sender === 'user' && typeof m?.text === 'string')
    .slice(-10)
    .map((m) => m.text.toLowerCase())

  if (userTexts.length === 0) return 'First message of the conversation — nothing captured yet.'

  const corpus = userTexts.join(' | ')
  return `Last ${userTexts.length} user message(s): ${corpus.slice(0, 600)}`
}
