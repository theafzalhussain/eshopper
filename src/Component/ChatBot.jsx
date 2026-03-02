import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2, GripVertical, Sparkles, ShoppingBag } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'

const IMAGE_KEYWORDS = [
  'image', 'images', 'img', 'photo', 'photos', 'picture', 'pictures',
  'show', 'dikh', 'dikhao', 'product', 'products', 'catalog', 'collection',
  'dress', 'shirt', 'jeans', 'jacket', 'shoes', 'bag', 'kurti', 'saree', 'coat',
  'mens', 'men', 'womens', 'women', 'male', 'female'
]

const HINDI_WORDS = [
  'hai', 'hain', 'kya', 'chahiye', 'chahie', 'dikhao', 'dikhana', 'batao', 'de', 'do', 'ke', 'ki', 'ka',
  'mujhe', 'mere', 'meri', 'aap', 'aapka', 'aapki', 'hum', 'tum', 'aur', 'ya', 'nahi', 'par', 'kaise',
  'kyun', 'acha', 'accha', 'thik', 'theek', 'bhai', 'behen', 'kr', 'kar', 'karo', 'sakta', 'sakte',
  'chaho', 'chahte', 'bolo', 'sunno', 'suno', 'hindi', 'english', 'hinglish'
]
const HINGLISH_INDICATORS = [
  'hai', 'hain', 'chahiye', 'dikhao', 'batao', 'kya', 'mujhe', 'aap', 'bhai', 'hindi', 'hinglish',
  'kar sakte', 'baat kar', 'samjho', 'dost'
]

const detectLanguage = (text) => {
  if (!text) return 'en'
  const lower = text.toLowerCase()
  const hasDevanagari = /[\u0900-\u097F]/.test(text)
  if (hasDevanagari) return 'hinglish'

  const hasOtherScript = /[\u0600-\u06FF\u0750-\u077F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0400-\u04FF\u4E00-\u9FFF]/.test(text)
  if (hasOtherScript) return 'user'

  if (lower.includes('speak hindi') || lower.includes('talk in hindi') || lower.includes('hindi me') || lower.includes('hindi mein')) {
    return 'hinglish'
  }
  if (lower.includes('speak english') || lower.includes('talk in english') || lower.includes('english please')) {
    return 'en'
  }

  const words = lower.split(/\s+/)
  const hindiCount = words.filter((w) => HINDI_WORDS.includes(w)).length
  const hasHinglish = HINGLISH_INDICATORS.some((word) => lower.includes(word))
  
  if (hindiCount >= 2 || hasHinglish) return 'hinglish'
  if (hindiCount === 1 && words.length <= 4) return 'hinglish'
  return 'en'
}

const detectLanguagePreferenceRequest = (text = '') => {
  const lower = text.toLowerCase()
  if (lower.includes('hindi me') || lower.includes('hindi mein') || lower.includes('hindi') || lower.includes('hinglish')) {
    return 'hinglish'
  }
  if (lower.includes('english me') || lower.includes('english mein') || lower.includes('speak english') || lower.includes('talk in english')) {
    return 'en'
  }
  return null
}

const isGreetingMessage = (text = '') => {
  const lower = text.trim().toLowerCase()
  if (!lower) return false
  const directGreeting = /^(hi|hello|hey|hii|helo|namaste|namaskar|salam|assalamualaikum)$/i.test(lower)
  const containsGreeting = /\b(hi|hello|hey|namaste|namaskar|salam|assalamualaikum)\b/i.test(lower)
  return directGreeting || (containsGreeting && lower.split(/\s+/).length <= 6)
}

const isHowAreYouQuery = (text = '') => {
  const lower = text.trim().toLowerCase()
  const englishPatterns = /\b(how are you|how're you|how r u|how r you|how do you do|how's it going|what's up|wassup|sup)\b/i
  const hindiPatterns = /\b(kaise ho|kaisi ho|kese ho|kesi ho|kya haal|kya hal hai|sab theek|sab thik|aap kaise|tum kaise)\b/i
  return englishPatterns.test(lower) || hindiPatterns.test(lower)
}

const isProductDetailsQuery = (text = '', lastProducts = []) => {
  if (lastProducts.length === 0) return false
  const lower = text.trim().toLowerCase()
  const detailWords = ['detail', 'details', 'about', 'tell me', 'batao', 'info', 'information', 'describe', 'more about', 'iske baare', 'uske baare', 'this', 'that', 'ye', 'yeh', 'wo', 'woh', 'suggested', 'recommended', 'last', 'previous', 'pehle']
  return detailWords.some(word => lower.includes(word)) && lower.split(/\s+/).length <= 8
}

const normalizeResponseLanguage = ({ responseText, language, isGreeting, wantsProducts, userName }) => {
  if (language !== 'hinglish') return responseText

  const lower = (responseText || '').toLowerCase()
  const hasHindiHint = HINDI_WORDS.some((w) => lower.includes(` ${w} `) || lower.startsWith(`${w} `) || lower.endsWith(` ${w}`))
  const looksStrictEnglish = /\b(absolutely|welcome|i can|i have|let me|you're|you are|how are you|please|would you like)\b/.test(lower)

  if (!looksStrictEnglish || hasHindiHint) return responseText

  if (isGreeting) {
    return `Hello ${userName || 'dost'}! 😊✨ Namaste! Main aapki fashion assistant hoon. Aap jis style me chaho, main usi tarah help karungi. Batao kya dekhna hai? 🛍️💫`
  }

  if (wantsProducts) {
    return `Bilkul ${userName || 'dost'}! 🛍️ Mainne aapki demand ke according products select kiye hain. Niche cards dekh lo 👇✨`
  }

  return `Samajh gaya ${userName || 'dost'} 😊 Main aapki language me hi baat karunga. Aap need batao, main best help dunga. 💫`
}

const BOT_AVATAR = '/assets/images/chatbot-avatar.png'
const POSITION_STORAGE_KEY = 'chatbot_position_v2'

const PRODUCT_TYPE_KEYWORDS = [
  'coat', 'blazer', 'jacket', 'shirt', 'tshirt', 't-shirt', 'jeans', 'pant', 'trouser',
  'shoe', 'shoes', 'sneaker', 'heel', 'kurti', 'saree', 'hoodie', 'sweater', 'top', 'dress'
]
const MEN_WORDS = ['men', 'mens', "men's", 'male', 'gents', 'boys', 'boy']
const WOMEN_WORDS = ['women', 'womens', "women's", 'female', 'ladies', 'girls', 'girl']
const REFERENCE_WORDS = ['uski', 'ussi', 'wo', 'woh', 'that', 'this', 'same', 'it', 'suggested', 'jo suggest']

const includesAny = (text, words) => words.some((word) => text.includes(word))

const getQueryFilters = (query = '') => {
  const lower = query.toLowerCase()
  return {
    lower,
    wantsMens: includesAny(lower, MEN_WORDS),
    wantsWomens: includesAny(lower, WOMEN_WORDS),
    referenceAsked: includesAny(lower, REFERENCE_WORDS),
    productTypes: PRODUCT_TYPE_KEYWORDS.filter((word) => lower.includes(word))
  }
}

const detectConversationStyle = (text = '') => {
  const lower = text.toLowerCase()
  const politeWords = ['please', 'plz', 'kindly', 'kripya', 'pleasey']
  const friendlyWords = ['bhai', 'bro', 'dost', 'yaar', 'buddy', 'friend']
  const conciseWords = ['quick', 'jaldi', 'fast', 'short', 'brief']

  const isPolite = politeWords.some((w) => lower.includes(w))
  const isFriendly = friendlyWords.some((w) => lower.includes(w))
  const wantsConcise = conciseWords.some((w) => lower.includes(w))

  return {
    tone: isFriendly ? 'friendly' : (isPolite ? 'polite' : 'neutral'),
    responseLength: wantsConcise ? 'short' : 'normal'
  }
}

const summarizeUserNeeds = (messages = []) => {
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

const PremiumRobotIcon = ({ mood = 'idle' }) => {
  const isThinking = mood === 'thinking'
  const isHappy = mood === 'happy'

  return (
    <motion.svg
      width="58"
      height="58"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ y: [0, -2, 0] }}
      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
    >
      <defs>
        <linearGradient id="rb" x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFEAA0" />
          <stop offset="1" stopColor="#E8BC3A" />
        </linearGradient>
        <radialGradient id="eyeglow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#13BFD9" stopOpacity="1" />
        </radialGradient>
      </defs>

      <rect x="14" y="10" width="36" height="26" rx="8" fill="url(#rb)" stroke="#B88B12" strokeWidth="1.5" />
      
      <rect x="18" y="14" width="11" height="9" rx="3" fill="url(#eyeglow)" />
      <rect x="35" y="14" width="11" height="9" rx="3" fill="url(#eyeglow)" />

      <motion.ellipse
        cx="23.5"
        cy="18.5"
        rx="2.5"
        ry="3"
        fill="#0A0A0A"
        animate={{ 
          scaleY: isThinking ? [1, 0.3, 1] : [1, 0.15, 1],
          y: isHappy ? [0, -0.5, 0] : 0
        }}
        transition={{ repeat: Infinity, duration: isThinking ? 1.2 : 3, times: [0, 0.5, 1] }}
      />
      <motion.circle cx="24" cy="17.5" r="0.8" fill="#FFF" opacity="0.85" />
      
      <motion.ellipse
        cx="40.5"
        cy="18.5"
        rx="2.5"
        ry="3"
        fill="#0A0A0A"
        animate={{ 
          scaleY: isThinking ? [1, 0.3, 1] : [1, 0.15, 1],
          y: isHappy ? [0, -0.5, 0] : 0
        }}
        transition={{ repeat: Infinity, duration: isThinking ? 1.2 : 3, delay: 0.1, times: [0, 0.5, 1] }}
      />
      <motion.circle cx="41" cy="17.5" r="0.8" fill="#FFF" opacity="0.85" />

      <motion.path
        d={isHappy ? 'M22 27 Q32 33 42 27' : 'M24 28 Q32 30.5 40 28'}
        stroke="#3D2D0A"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        animate={isHappy ? { d: ['M22 27 Q32 33 42 27', 'M22 27 Q32 34 42 27', 'M22 27 Q32 33 42 27'] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />

      <rect x="18" y="38" width="28" height="16" rx="5" fill="url(#rb)" stroke="#B88B12" strokeWidth="1.5" />

      <motion.g
        style={{ transformOrigin: '18px 44px' }}
        animate={{ rotate: isThinking ? [0, -12, 0] : [0, -24, 0] }}
        transition={{ repeat: Infinity, duration: isThinking ? 1.7 : 1.2, ease: 'easeInOut' }}
      >
        <rect x="10" y="40" width="8" height="12" rx="3" fill="#E6BE43" stroke="#B88B12" strokeWidth="1.2" />
      </motion.g>

      <motion.g animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
        <rect x="46" y="40" width="8" height="12" rx="3" fill="#E6BE43" stroke="#B88B12" strokeWidth="1.2" />
      </motion.g>

      <motion.line
        x1="26"
        y1="10"
        x2="26"
        y2="4"
        stroke="#B88B12"
        strokeWidth="2"
        strokeLinecap="round"
        animate={{ y: [0, -1, 0] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
      />
      <motion.line
        x1="38"
        y1="10"
        x2="38"
        y2="4"
        stroke="#B88B12"
        strokeWidth="2"
        strokeLinecap="round"
        animate={{ y: [0, -1, 0] }}
        transition={{ repeat: Infinity, duration: 1.6, delay: 0.15 }}
      />
      <circle cx="26" cy="3" r="1.8" fill="#FFD34F" />
      <circle cx="38" cy="3" r="1.8" fill="#FFD34F" />
    </motion.svg>
  )
}

const toUserInitial = (name) => (name || 'U').trim().charAt(0).toUpperCase()

const normalizeProduct = (p) => {
  if (!p) return null
  const image = p.image || p.pic1 || p.pic || p.pic2 || p.pic3 || p.pic4 || ''
  const id = p._id || p.id
  return {
    id,
    name: p.name || 'Product',
    price: p.finalprice || p.baseprice || p.price || '',
    image,
    link: id ? `/single-product/${id}` : '#',
    maincategory: p.maincategory || '',
    subcategory: p.subcategory || ''
  }
}

const extractInlineProducts = (text) => {
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

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isMobileFullScreen, setIsMobileFullScreen] = useState(window.innerWidth < 480)

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! Welcome to Eshopper! 👋✨ I'm your personal AI Fashion Assistant, here to help you discover amazing styles! 🛍️💫 Looking for casual wear, party outfits, trending styles, or something special? Just tell me what you need, and I'll show you the perfect products from our collection! Feel free to chat in English, Hindi, or Hinglish - whatever's comfortable for you! 😊",
      timestamp: new Date(),
      products: []
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState('idle')
  const [currentUser, setCurrentUser] = useState({ name: 'Guest', pic: '', email: '' })
  const [lastSuggestedProducts, setLastSuggestedProducts] = useState([])
  const [allProductsCache, setAllProductsCache] = useState([])
  const [preferredLanguage, setPreferredLanguage] = useState(() => localStorage.getItem('chatbot_preferred_language') || 'en')

  const messagesEndRef = useRef(null)

  const clampPosition = (nextPosition) => {
    const maxRight = 16
    const minLeft = -(window.innerWidth - 118)
    const maxDown = 8
    const minUp = -(window.innerHeight - 118)

    return {
      x: Math.min(maxRight, Math.max(minLeft, nextPosition.x)),
      y: Math.min(maxDown, Math.max(minUp, nextPosition.y))
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setPosition(clampPosition(parsed))
        }
      }
    } catch {
      // ignore invalid cached position
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setIsMobileFullScreen(window.innerWidth < 480 && isOpen)
      setPosition((prev) => clampPosition(prev))
    }

    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isOpen])

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 60)
    return () => clearTimeout(timer)
  }, [messages, loading])

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userId = localStorage.getItem('userid')
        const localName = localStorage.getItem('name')

        if (userId) {
          const response = await axios.get(`${BASE_URL}/user/${userId}`, { timeout: 9000 })
          const user = response.data || {}
          setCurrentUser({
            name: user.name || localName || 'User',
            email: user.email || '',
            pic: user.pic || user.avatar || user.photoURL || ''
          })
          return
        }

        setCurrentUser((prev) => ({
          ...prev,
          name: localName || prev.name
        }))
      } catch (error) {
        setCurrentUser((prev) => ({
          ...prev,
          name: localStorage.getItem('name') || prev.name
        }))
      }
    }

    const loadAllProducts = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/product`, { timeout: 12000 })
        const products = Array.isArray(response.data) ? response.data : []
        setAllProductsCache(products.map(p => normalizeProduct(p)).filter(Boolean))
      } catch (error) {
        console.log('Products will be loaded on demand')
      }
    }

    loadUserProfile()
    loadAllProducts()
  }, [])

  const shouldShowProducts = (text) => {
    const lower = (text || '').toLowerCase()
    return IMAGE_KEYWORDS.some((word) => lower.includes(word))
  }

  const fetchProductsFromShop = async (query, options = {}) => {
    try {
      const response = await axios.get(`${BASE_URL}/product`, { timeout: 12000 })
      const allProducts = Array.isArray(response.data) ? response.data : []
      const allNormalized = allProducts.map((raw) => normalizeProduct(raw)).filter(Boolean)

      const filters = getQueryFilters(query)
      const stopWords = new Set(['show', 'me', 'images', 'image', 'product', 'products', 'please', 'all', 'for', 'the', 'a', 'an', 'ki', 'ke', 'ka', 'dikhao'])
      const queryTokens = filters.lower.split(/[^a-z0-9]+/).filter((token) => token && !stopWords.has(token))

      const applyFilters = (list) => {
        return list.filter((item) => {
          const bag = `${item.name} ${item.maincategory} ${item.subcategory}`.toLowerCase()

          if (filters.wantsMens) {
            const mensMatch = ['men', 'mens', "men's", 'male', 'gents', 'boy', 'boys'].some((word) => bag.includes(word))
            if (!mensMatch) return false
          }

          if (filters.wantsWomens) {
            const womensMatch = ['women', 'womens', "women's", 'female', 'ladies', 'girl', 'girls'].some((word) => bag.includes(word))
            if (!womensMatch) return false
          }

          if (filters.productTypes.length > 0) {
            const typeMatch = filters.productTypes.some((type) => bag.includes(type))
            if (!typeMatch) return false
          }

          return true
        })
      }

      const preferred = Array.isArray(options.preferredProducts) ? options.preferredProducts.map((p) => normalizeProduct(p)).filter(Boolean) : []
      const usePreferred = filters.referenceAsked && preferred.length > 0

      let baseList = usePreferred ? preferred : allNormalized
      let filteredList = applyFilters(baseList)

      if (filteredList.length === 0 && usePreferred) {
        filteredList = applyFilters(allNormalized)
      }

      const scored = filteredList
        .map((item) => {
          const bag = `${item.name} ${item.maincategory} ${item.subcategory}`.toLowerCase()
          let score = 0
          queryTokens.forEach((token) => {
            if (bag.includes(token)) score += 2
          })
          if (filters.lower && bag.includes(filters.lower)) score += 4
          return { item, score }
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item)

      const finalList = scored.length > 0 ? scored : filteredList
      return finalList.slice(0, 6)
    } catch {
      return []
    }
  }

  const getPersonalizedContext = (userQuery, language, conversationStyle, priorNeeds) => {
    const userName = currentUser?.name || 'friend'
    const isGreeting = isGreetingMessage(userQuery)
    const isHowAreYou = isHowAreYouQuery(userQuery)
    const isProductDetail = isProductDetailsQuery(userQuery, lastSuggestedProducts)
    
    const productSummary = allProductsCache.length > 0 
      ? `ESHOPPER PRODUCT DATABASE:
- Total Products: ${allProductsCache.length} premium items
- Categories: Men's wear, Women's wear, Casual, Formal, Party wear, Traditional, Western, Ethnic
- Product Types: Dresses, Shirts, T-shirts, Jeans, Pants, Shoes, Accessories, Jackets, Hoodies, Sarees, Kurtis
- Price Range: Budget-friendly to Premium
- All products are quality-checked and fashion-forward`
      : 'Full premium product catalog available.'
    
    const lastProductsInfo = lastSuggestedProducts.length > 0
      ? `\n\nRECENTLY SUGGESTED PRODUCTS (User can ask details about these):\n${lastSuggestedProducts.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} - ₹${p.price} (${p.maincategory}/${p.subcategory})`).join('\n')}`
      : ''

    const styleGuide = `CONVERSATION INTELLIGENCE:
- User Tone: ${conversationStyle.tone}
- Response Length Preference: ${conversationStyle.responseLength}
- User Preferences Memory: ${priorNeeds}${lastProductsInfo}`
    
    if (isHowAreYou) {
      return `User is asking "how are you?" - respond like a friendly human with personality.

You are Eshopper's AI Fashion Assistant with deep knowledge of fashion trends and products.

CRITICAL INSTRUCTIONS:
- Reply in the SAME language as user (English/Hindi/Hinglish)
- Be warm, friendly, human-like with personality
- Say something like: "I'm doing great! Thanks for asking! I'm excited to help you find amazing fashion today! How can I assist you?"
- If Hindi/Hinglish: "Main bilkul mast hoon! Puchne ke liye thanks! Aaj main tumhe best fashion dhoondhne me help karungi! Batao kya chahiye?"
- Keep it natural, cheerful, and conversational

User: "${userName}"
User query: "${userQuery}"

${styleGuide}`
    }
    
    if (isProductDetail && lastSuggestedProducts.length > 0) {
      return `User is asking for MORE DETAILS about a PREVIOUSLY SUGGESTED product.

${productSummary}
${styleGuide}

CRITICAL:
- User is referring to products YOU ALREADY SUGGESTED
- Reply in SAME language as user
- Provide intelligent details: fabric, style tips, occasion, why it's great, how to style it
- Be enthusiastic like a fashion consultant friend
- Reference specific product(s) from the recently suggested list

User: "${userName}"
User query: "${userQuery}"

Give detailed, smart fashion advice about the suggested product(s).`
    }
    
    if (isGreeting) {
      return `User has sent a greeting. Reply like a warm, cute, smart friend in the SAME language/script as user message.

CRITICAL:
- Match user language exactly (Hindi/Hinglish/English/other).
- Keep friendly human tone.
- Add short greeting + ask what they need.
- Do not force product list unless user asks.

${styleGuide}

User name: ${userName}
User message: ${userQuery}`
    }
    
    if (language === 'hinglish') {
      return `Tum ek BAHUT SMART FASHION EXPERT ho with DEEP KNOWLEDGE of Eshopper's complete product database aur fashion trends.

${productSummary}
${styleGuide}

TUMHARI CAPABILITIES (Google Assistant jaisi):
✓ Fashion industry knowledge (trends, styling tips, occasions)
✓ Complete product database ka detailed knowledge
✓ Color theory, body types, style combinations
✓ Budget-friendly suggestions
✓ Seasonal fashion trends
✓ Celebrity & influencer styles
✓ Care instructions aur maintenance tips

CRITICAL RULES:
- Reply language MUST be Hindi/Hinglish (English me switch BILKUL mat karo)
- Natural human jaisa baat karo - warm, friendly, experienced fashion friend
- User ki EXACT need samjho aur precise suggestions do
- Agar koi product suggest kiya hai, uske baare me expert jaisi details de sakte ho
- Fashion advice, styling tips, occasion guidance - sab kuch kar sakte ho
- Unclear request pe ek smart clarification question pucho

User: "${userName}"
User query: "${userQuery}"

Ab user ko helpful, smart, human-like response do with fashion expertise.`
    }

    if (language === 'user') {
      return `You are a smart fashion assistant with complete knowledge of Eshopper's product database.

${productSummary}
${styleGuide}

CRITICAL:
- Reply in the exact same language/script and communication style as user.
- Do not switch language unless user asks explicitly.
- Be warm, friendly, and human-like like a trusted friend.
- Provide only relevant suggestions based on user need.
- If unclear request, ask one concise clarification question.

User: "${userName}"
User query: "${userQuery}"

Respond naturally, accurately, and helpfully.`
    }

    return `You are a HIGHLY INTELLIGENT FASHION EXPERT with DEEP KNOWLEDGE of Eshopper's complete product database and fashion industry.

${productSummary}
${styleGuide}

YOUR CAPABILITIES (Like Google Assistant/ChatGPT level intelligence):
✓ Comprehensive fashion industry knowledge (trends, designers, styles)
✓ Complete product database expertise with detailed information
✓ Color theory, body types, style combinations, fashion psychology
✓ Budget-conscious suggestions and value recommendations
✓ Seasonal trends, occasion-specific styling
✓ Celebrity fashion insights and influencer trends
✓ Fabric care, maintenance, and longevity tips
✓ Mix & match suggestions, wardrobe building advice

CRITICAL INSTRUCTIONS:
- Reply in fluent, natural English with personality
- Be warm, friendly, experienced like a trusted fashion consultant friend
- Understand user's exact needs and provide precise, smart suggestions
- If discussing previously suggested products, give detailed expert insights
- Provide fashion advice, styling tips, occasion guidance intelligently
- Ask smart clarifying questions when needed
- Never be robotic - be conversational and human-like

User: "${userName}"
User query: "${userQuery}"

Provide helpful, intelligent, human-like response with fashion expertise.`
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    const prompt = inputValue.trim()
    if (!prompt || loading) return

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: prompt,
      timestamp: new Date(),
      products: []
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setLoading(true)
    setMood('thinking')

    try {
      const askedPreference = detectLanguagePreferenceRequest(prompt)
      
      // If user explicitly requests a language change, use that
      if (askedPreference) {
        setPreferredLanguage(askedPreference)
        localStorage.setItem('chatbot_preferred_language', askedPreference)
      }
      
      // Use stored preference (defaults to 'en'), only detect from input if user explicitly requests or if no preference exists
      const detectedLanguage = askedPreference || preferredLanguage || detectLanguage(prompt) || 'en'
      const wantsProducts = shouldShowProducts(prompt)
      const queryFilters = getQueryFilters(prompt)
      const preferredFromSuggestion = queryFilters.referenceAsked ? lastSuggestedProducts : []
      const productPromise = wantsProducts
        ? fetchProductsFromShop(prompt, { preferredProducts: preferredFromSuggestion })
        : Promise.resolve([])

      const history = messages.slice(-6).map((msg) => ({
        role: msg.sender === 'bot' ? 'model' : 'user',
        text: msg.text
      }))

      const conversationStyle = detectConversationStyle(prompt)
      const priorNeeds = summarizeUserNeeds(messages)
      const personalizedContext = getPersonalizedContext(prompt, detectedLanguage, conversationStyle, priorNeeds)
      const enhancedPrompt = personalizedContext

      const aiResponse = await axios.post(
        `${BASE_URL}/api/chat`,
        {
          prompt: enhancedPrompt,
          history
        },
        { timeout: 20000 }
      )

      let responseText =
        aiResponse?.data?.text ||
        aiResponse?.data?.response ||
        aiResponse?.data?.message ||
        (detectedLanguage === 'hinglish' 
          ? `Haan ${currentUser?.name || 'dost'}, zaroor help karungi! ✨ Batao kya dekh rahe ho - casual look, party wear, ya kuch aur special?` 
          : `Hey ${currentUser?.name || 'friend'}! ✨ I'd love to help you find the perfect style. What are you looking for - casual, party wear, or something special?`)
      
      const inlineProducts = extractInlineProducts(responseText)
      const dbProducts = await productPromise

      const finalProducts = inlineProducts.length > 0 ? inlineProducts : dbProducts
      if (finalProducts.length > 0) {
        setLastSuggestedProducts(finalProducts)
      }

      if (wantsProducts && !responseText?.trim()) {
        if (detectedLanguage === 'hinglish') {
          responseText = `Dekho ${currentUser?.name || 'dost'}, maine tumhari demand ke according products ready kiye hain 😊 Niche dekho 👇`
        } else {
          responseText = `Here you go ${currentUser?.name || 'friend'}! I found products based on your request 😊👇`
        }
      }

      const isGreeting = isGreetingMessage(prompt)

      responseText = normalizeResponseLanguage({
        responseText,
        language: detectedLanguage,
        isGreeting,
        wantsProducts,
        userName: currentUser?.name
      })
      
      if (isGreeting && !responseText.includes('Welcome') && !responseText.includes('Namaste')) {
        if (detectedLanguage === 'hinglish') {
          responseText = `Hello ${currentUser?.name || 'dost'}! 😊✨ Namaste! Main aapki fashion assistant hoon. Aaj kya dekhna chahoge - casual outfits, party wear, traditional styles, ya kuch trending? Bolo aur main perfect products suggest karungi! 🛍️💫`
        } else {
          responseText = `Hello ${currentUser?.name || 'friend'}! 😊✨ Welcome! I'm so happy to help you today! Are you looking for casual outfits, party wear, traditional styles, or something trending? Just tell me what you need, and I'll find the perfect products for you! 🛍️💫`
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: responseText.replace(/\[PRODUCT:.*?\]/g, '').trim(),
          timestamp: new Date(),
          products: finalProducts
        }
      ])
      setMood('happy')
    } catch {
      const askedPreference = detectLanguagePreferenceRequest(prompt)
      
      // If user explicitly requests a language change, use that
      if (askedPreference) {
        setPreferredLanguage(askedPreference)
        localStorage.setItem('chatbot_preferred_language', askedPreference)
      }
      
      // Use stored preference (defaults to 'en'), only detect from input if user explicitly requests or if no preference exists
      const detectedLanguage = askedPreference || preferredLanguage || detectLanguage(prompt) || 'en'
      const wantsProducts = shouldShowProducts(prompt)
      const queryFilters = getQueryFilters(prompt)
      const preferredFromSuggestion = queryFilters.referenceAsked ? lastSuggestedProducts : []
      const quickProducts = wantsProducts
        ? await fetchProductsFromShop(prompt, { preferredProducts: preferredFromSuggestion })
        : []
      if (quickProducts.length > 0) {
        setLastSuggestedProducts(quickProducts)
      }

      const isGreeting = isGreetingMessage(prompt)
      const isHowAreYou = isHowAreYouQuery(prompt)
      const isProductDetail = isProductDetailsQuery(prompt, lastSuggestedProducts)
      
      let fallbackText = ''
      
      if (isHowAreYou) {
        fallbackText = detectedLanguage === 'hinglish'
          ? `Main bilkul mast hoon ${currentUser?.name || 'dost'}! 😊✨ Puchne ke liye shukriya! Aaj main tumhe best fashion trends dikhane ke liye bahut excited hoon! Batao kya dekhna hai - casual, party wear, ya trending styles? 🛍️💫`
          : `I'm doing great ${currentUser?.name || 'friend'}! 😊✨ Thanks for asking! I'm so excited to help you discover amazing fashion today! What would you like to see - casual wear, party outfits, or trending styles? 🛍️💫`
      } else if (isProductDetail && lastSuggestedProducts.length > 0) {
        const product = lastSuggestedProducts[0]
        fallbackText = detectedLanguage === 'hinglish'
          ? `Haan bilkul! ${product.name} ke baare me batati hoon 😊 Ye ${product.maincategory} category ka ${product.subcategory} hai, price \u20b9${product.price} hai. Ye bahut trending aur stylish hai! Iska quality premium hai aur ye perfect hai agar tum ${product.maincategory.toLowerCase()} look chahte ho. Aur kuch details chahiye? 💫✨`
          : `Sure! Let me tell you about ${product.name} 😊 It's a ${product.subcategory} from our ${product.maincategory} collection, priced at \u20b9${product.price}. This piece is absolutely trending and stylish! The quality is premium and it's perfect if you're going for a ${product.maincategory.toLowerCase()} look. Want to know more details? 💫✨`
      } else if (isGreeting) {
        fallbackText = detectedLanguage === 'hinglish'
          ? `Hello ${currentUser?.name || 'dost'}! 😊✨ Namaste! Kaisi ho? Main aapki fashion assistant hoon. Aaj kya explore karna chahoge? Casual wear, party outfits, traditional collection, ya trending styles? Bolo aur main perfect products dikhaungi! 🛍️💫`
          : `Hello ${currentUser?.name || 'friend'}! 😊✨ Welcome! How are you today? I'm your fashion assistant. What would you like to explore? Casual wear, party outfits, traditional collection, or trending styles? Tell me and I'll show you perfect products! 🛍️💫`
      } else {
        fallbackText = detectedLanguage === 'hinglish'
          ? (wantsProducts
            ? `Bilkul ${currentUser?.name || 'dost'}! 🛍️ Maine tumhari demand ke according products nikale hain. Niche dekho 👇✨`
            : `Haan ${currentUser?.name || 'dost'}, main samajh gayi! 😊 Thoda aur detail batao - color preference, occasion, budget? Main accurate suggestions dungi! 💫`)
          : (wantsProducts
            ? `Absolutely ${currentUser?.name || 'friend'}! 🛍️ I've found products matching your request. Check them out below 👇✨`
            : `Sure ${currentUser?.name || 'friend'}, I understand! 😊 Tell me more - color preference, occasion, budget? I'll give you accurate suggestions! 💫`)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: fallbackText,
          timestamp: new Date(),
          products: quickProducts
        }
      ])
      setMood('idle')
    } finally {
      setLoading(false)
      setTimeout(() => setMood('idle'), 1800)
    }
  }

  const toggleChat = () => {
    if (isMobileFullScreen) return
    setIsOpen((prev) => !prev)
  }

  return (
    <motion.div
      className="chatbot-wrapper"
      drag={!isMobileFullScreen}
      dragElastic={0.08}
      dragMomentum={false}
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e, info) => {
        setIsDragging(false)
        setPosition((prev) => {
          const next = clampPosition({ x: prev.x + info.offset.x, y: prev.y + info.offset.y })
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next))
          return next
        })
      }}
      style={{ cursor: !isMobileFullScreen ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {!isOpen && !isMobileFullScreen && (
        <motion.div className="grip-handle" whileHover={{ scale: 1.08, opacity: 1 }} initial={{ opacity: 0.7 }}>
          <GripVertical size={11} color="#D2AA2F" />
        </motion.div>
      )}

      <motion.button
        onClick={toggleChat}
        className={`chatbot-bubble ${isOpen ? 'active' : ''} ${isMobileFullScreen ? 'hidden' : ''}`}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        disabled={isMobileFullScreen}
        aria-label="Open assistant"
      >
        <div className="robot-shell">
          <PremiumRobotIcon mood={mood} />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`chat-card ${isMobileFullScreen ? 'fullscreen' : ''}`}
            initial={{ opacity: 0, y: 35, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <div className="chat-header">
              <div className="header-left">
                <div className="online-dot" />
                <div>
                  <h4>AI Fashion Consultant ✨</h4>
                  <span>Online • Your Fashion Bestie 💫</span>
                </div>
              </div>
              <motion.button
                className="close-btn"
                onClick={() => setIsOpen(false)}
                whileHover={{ scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div className="chat-body">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`msg-row msg-${msg.sender}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="profile-box">
                    {msg.sender === 'bot' ? (
                      <>
                        <div className="avatar bot-avatar-wrap">
                          <img src={BOT_AVATAR} onError={(e) => { e.currentTarget.style.display = 'none' }} alt="bot" />
                          <span className="bot-fallback">🤖</span>
                        </div>
                        <small>AI Expert</small>
                      </>
                    ) : (
                      <>
                        <div className="avatar user-avatar-wrap">
                          {currentUser.pic ? (
                            <img src={currentUser.pic} alt={currentUser.name} />
                          ) : (
                            <span>{toUserInitial(currentUser.name)}</span>
                          )}
                        </div>
                        <small>{currentUser.name || 'You'}</small>
                      </>
                    )}
                  </div>

                  <div className="msg-content">
                    <div className={`msg-bubble msg-bubble-${msg.sender}`}>{msg.text}</div>

                    {msg.products?.length > 0 && (
                      <div className="product-grid">
                        {msg.products.map((product, index) => (
                          <motion.a
                            key={`${product.id || product.name}-${index}`}
                            className="product-card"
                            href={product.link || '#'}
                            whileHover={{ y: -4 }}
                          >
                            <div className="product-image-box">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="product-image" />
                              ) : (
                                <div className="no-image">No Image</div>
                              )}
                            </div>
                            <div className="product-meta">
                              <p className="product-name">{product.name}</p>
                              {product.price ? (
                                <p className="product-price"><Sparkles size={11} /> ₹{product.price}</p>
                              ) : null}
                              <span className="product-link"><ShoppingBag size={12} /> View Product</span>
                            </div>
                          </motion.a>
                        ))}
                      </div>
                    )}

                    <span className="msg-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div className="msg-row msg-bot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="profile-box">
                    <div className="avatar bot-avatar-wrap"><span className="bot-fallback">🤖</span></div>
                    <small>AI Expert</small>
                  </div>
                  <div className="typing">
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} />
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-footer">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Apne dil ki baat bolo... kya chahiye? 💬✨"
                maxLength={500}
                disabled={loading}
              />
              <motion.button type="submit" disabled={!inputValue.trim() || loading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}>
                {loading ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .chatbot-wrapper {
          position: fixed;
          right: 24px;
          bottom: 22px;
          z-index: 3200;
          font-family: Inter, -apple-system, Segoe UI, sans-serif;
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .grip-handle {
          position: absolute;
          bottom: 84px;
          left: 50%;
          transform: translateX(-50%);
          border: 1px solid rgba(210, 170, 47, 0.5);
          background: rgba(10, 10, 10, 0.8);
          border-radius: 999px;
          padding: 6px;
        }

        .chatbot-bubble {
          width: 74px;
          height: 74px;
          border-radius: 999px;
          border: 2.5px solid #d4a739;
          background: linear-gradient(135deg, #f5c940 0%, #d9a930 50%, #e0b137 100%);
          box-shadow: 0 12px 28px rgba(212, 175, 55, 0.4), 0 8px 16px rgba(0, 0, 0, 0.25), 0 0 40px rgba(212, 175, 55, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          color: #1a1a1a;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        
        .chatbot-bubble::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          transform: rotate(45deg);
          animation: shimmer 3.5s infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); opacity: 0; }
          50% { transform: translateX(100%) translateY(100%) rotate(45deg); opacity: 1; }
        }

        .chatbot-bubble.active {
          box-shadow: 0 8px 22px rgba(212, 175, 55, 0.45), 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 30px rgba(212, 175, 55, 0.25);
          transform: scale(0.95);
        }

        .chatbot-bubble.hidden {
          display: none;
        }

        .robot-shell {
          width: 58px;
          height: 58px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-card {
          position: fixed;
          right: 20px;
          bottom: 108px;
          width: min(390px, 92vw);
          height: min(560px, calc(100vh - 150px));
          max-height: calc(100vh - 140px);
          background: linear-gradient(180deg, #f9f9f9 0%, #f4f4f4 100%);
          border-radius: 26px;
          border: 1.5px solid rgba(210, 170, 47, 0.45);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-card.fullscreen {
          position: fixed !important;
          left: 2vw;
          right: 2vw;
          width: 96vw;
          bottom: 10px;
          height: 84vh;
          border-radius: 20px;
        }

        .chat-header {
          background: linear-gradient(135deg, #101010, #1e1e1e);
          color: #fff;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(210, 170, 47, 0.35);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .online-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #0dd4f2;
          box-shadow: 0 0 10px rgba(13, 212, 242, 0.8);
        }

        .chat-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
        }

        .chat-header span {
          font-size: 10px;
          color: #85deea;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .close-btn {
          border: 1px solid rgba(210, 170, 47, 0.35);
          background: rgba(210, 170, 47, 0.12);
          color: #e6c35f;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #f7f7f7;
        }

        .chat-body::-webkit-scrollbar {
          width: 6px;
        }

        .chat-body::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(210, 170, 47, 0.5);
        }

        .msg-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .msg-user {
          justify-content: flex-end;
          flex-direction: row-reverse;
        }

        .profile-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 54px;
        }

        .profile-box small {
          font-size: 9px;
          color: #777;
          font-weight: 600;
          text-align: center;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(210, 170, 47, 0.4);
          background: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .bot-avatar-wrap {
          background: linear-gradient(145deg, #e9fbff, #fff7e1);
          position: relative;
        }

        .bot-avatar-wrap .bot-fallback {
          font-size: 15px;
        }

        .msg-content {
          max-width: min(270px, 74vw);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .msg-bubble {
          border-radius: 14px;
          padding: 11px 15px;
          line-height: 1.6;
          font-size: 12.5px;
          border: 1.5px solid transparent;
          word-break: break-word;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          font-weight: 500;
        }
        
        .msg-bubble:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .msg-bubble-bot {
          background: linear-gradient(135deg, #ffffff 0%, #fffbf0 100%);
          color: #1a1a1a;
          border-color: rgba(212, 175, 55, 0.3);
          border-bottom-left-radius: 4px;
          box-shadow: 0 3px 12px rgba(212, 175, 55, 0.15), 0 1px 4px rgba(0, 0, 0, 0.1);
        }
        
        .msg-bubble-bot:hover {
          border-color: rgba(212, 175, 55, 0.45);
          box-shadow: 0 4px 16px rgba(212, 175, 55, 0.2), 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        .msg-bubble-user {
          background: linear-gradient(135deg, #f5c842 0%, #d4a029 100%);
          color: #ffffff;
          border-color: #c7941f;
          border-bottom-right-radius: 4px;
          box-shadow: 0 3px 12px rgba(212, 175, 55, 0.3), 0 1px 4px rgba(0, 0, 0, 0.15);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .msg-bubble-user:hover {
          background: linear-gradient(135deg, #f9d153 0%, #d9a930 100%);
          box-shadow: 0 4px 16px rgba(212, 175, 55, 0.35), 0 2px 8px rgba(0, 0, 0, 0.18);
        }

        .msg-time {
          font-size: 9px;
          color: #8d8d8d;
          margin-left: 4px;
        }

        .typing {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(210, 170, 47, 0.24);
          background: #fff;
          display: flex;
          gap: 5px;
          width: fit-content;
        }

        .typing span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(135deg, #f3ce64, #d49f1a);
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .product-card {
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(210, 170, 47, 0.3);
          background: #fff;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .product-image-box {
          height: 98px;
          background: #efefef;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #777;
        }

        .product-meta {
          padding: 7px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .product-name {
          margin: 0;
          font-size: 10.5px;
          font-weight: 700;
          color: #222;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-price {
          margin: 0;
          font-size: 11px;
          color: #c5961b;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .product-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          color: #b58515;
          font-weight: 700;
        }

        .chat-footer {
          padding: 10px;
          border-top: 1px solid rgba(210, 170, 47, 0.25);
          background: #f9f7f2;
          display: flex;
          gap: 8px;
        }

        .chat-footer input {
          flex: 1;
          border: 1.5px solid rgba(212, 175, 55, 0.4);
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 12.5px;
          background: #ffffff;
          outline: none;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .chat-footer input:focus {
          border-color: #d4a739;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.18), 0 2px 8px rgba(212, 175, 55, 0.15);
          background: #fffef9;
        }
        
        .chat-footer input::placeholder {
          color: #999;
          font-weight: 400;
        }

        .chat-footer button {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1.5px solid #d4a739;
          background: linear-gradient(135deg, #f9d153 0%, #d9a930 100%);
          color: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(212, 175, 55, 0.25);
        }
        
        .chat-footer button:hover:not(:disabled) {
          background: linear-gradient(135deg, #ffd85a 0%, #e0b037 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.35);
        }
        
        .chat-footer button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 1px 4px rgba(212, 175, 55, 0.2);
        }

        .chat-footer button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .chatbot-wrapper {
            right: 16px;
            bottom: 14px;
          }

          .chat-card {
            right: 14px;
            bottom: 96px;
            width: min(360px, 94vw);
            height: min(520px, calc(100vh - 130px));
            max-height: calc(100vh - 120px);
          }

          .product-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .chatbot-bubble {
            display: none;
          }

          .chat-card {
            left: 2vw;
            right: 2vw;
            width: 96vw;
            height: 84vh;
            bottom: 10px;
          }

          .msg-content {
            max-width: calc(100vw - 120px);
          }
        }
      ` }} />
    </motion.div>
  )
}
