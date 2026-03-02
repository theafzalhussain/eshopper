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

const HINDI_WORDS = ['hai', 'hain', 'kya', 'chahiye', 'chahie', 'dikhao', 'batao', 'de', 'do', 'ke', 'ki', 'ka', 'mujhe', 'mere', 'aur', 'ya', 'nahi', 'par', 'kaise', 'kya', 'kyun', 'accha', 'thik']
const HINGLISH_INDICATORS = ['hai', 'hain', 'chahiye', 'dikhao', 'batao', 'kya', 'mujhe']

const detectLanguage = (text) => {
  if (!text) return 'en'
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)
  const hindiCount = words.filter(w => HINDI_WORDS.includes(w)).length
  const hasHinglish = HINGLISH_INDICATORS.some(word => lower.includes(word))
  
  if (hindiCount >= 2 || hasHinglish) return 'hinglish'
  if (hindiCount === 1 && words.length <= 4) return 'hinglish'
  return 'en'
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

const getRandomGreeting = (language, userName) => {
  const name = userName || 'dost'
  const hinglish = [
    `Haan ${name}! 😊 Batao kya dekhna hai?`,
    `Bilkul ${name}! ✨ Main help karungi`,
    `Sure ${name}! 🌟 Kya pasand hai?`,
    `Perfect ${name}! 💫 Kya chahiye?`
  ]
  const english = [
    `Hey ${name}! 😊 What can I show you?`,
    `Sure ${name}! ✨ I'm here to help`,
    `Of course ${name}! 🌟 What do you like?`,
    `Perfect ${name}! 💫 What are you looking for?`
  ]
  const options = language === 'hinglish' ? hinglish : english
  return options[Math.floor(Math.random() * options.length)]
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

  const getPersonalizedContext = (userQuery, language) => {
    const userName = currentUser?.name || 'friend'
    const isGreeting = /^(hi|hello|hey|hii|helo|namaste|namaskar)$/i.test(userQuery.trim())
    
    const productSummary = allProductsCache.length > 0 
      ? `Available products: ${allProductsCache.length} items including mens wear, womens wear, casual, formal, party wear, traditional, western, shoes, accessories, and more.`
      : 'Full product catalog available.'
    
    if (isGreeting) {
      if (language === 'hinglish') {
        return `User ne sirf greeting ki hai. Unhe warm welcome karo aur batao ki tum unki kaise help kar sakti ho. Product suggestions dene ke liye tayyar raho.

Response example: "Hello ${userName}! 😊✨ Namaste! Main aapki fashion assistant hoon. Aaj kya dekhna chahoge - casual outfits, party wear, traditional styles, ya kuch trending? Bolo aur main perfect products suggest karungi! 🛍️💫"`
      } else {
        return `User has just greeted you. Give them a warm, enthusiastic welcome and let them know how you can help. Be ready to suggest products.

Response example: "Hello ${userName}! 😊✨ Welcome! I'm so happy to help you today! Are you looking for casual outfits, party wear, traditional styles, or something trending? Just tell me what you need, and I'll find the perfect products for you! 🛍️💫"`
      }
    }
    
    if (language === 'hinglish') {
      return `Tum ek smart fashion assistant ho with complete knowledge of Eshopper's product database.

${productSummary}

Personality:
- Friendly, helpful aur accurate
- Natural Hinglish mein baat karo
- SIRF wahi products suggest karo jo user ne manga hai
- Extra suggestions mat do unless user specifically mange

Guidelines:
- User: "${userName}"
- 2-3 lines concise response
- User ki exact demand ke according products dikhao
- Database knowledge use karke accurate suggestions do
- Agar products dikhaane hain to confirm karo ki wo user ki demand match karte hain

User query: "${userQuery}"

User ki exact demand samjho aur ONLY relevant response do.`
    } else {
      return `You are a smart fashion assistant with complete knowledge of Eshopper's product database.

${productSummary}

Personality:
- Friendly, helpful, and accurate
- Speak naturally in English
- ONLY suggest products that user specifically asks for
- Don't give extra suggestions unless user explicitly asks

Guidelines:
- User: "${userName}"
- Keep responses concise (2-3 lines)
- Show products according to user's exact demand
- Use database knowledge for accurate suggestions
- If showing products, confirm they match user's request

User query: "${userQuery}"

Understand user's exact demand and give ONLY relevant response.`
    }
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
      const detectedLanguage = detectLanguage(prompt)
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

      const personalizedContext = getPersonalizedContext(prompt, detectedLanguage)
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
      
      if (wantsProducts && finalProducts.length > 0) {
        if (detectedLanguage === 'hinglish') {
          responseText = responseText || `Dekho ${currentUser?.name || 'dost'}, maine tumhare liye kuch amazing products choose kiye hain! 😊 Niche dekho 👇`
        } else {
          responseText = responseText || `Check these out ${currentUser?.name || 'friend'}! I've picked some amazing products for you 😊👇`
        }
      }

      const inlineProducts = extractInlineProducts(responseText)
      const dbProducts = await productPromise

      const finalProducts = inlineProducts.length > 0 ? inlineProducts : dbProducts
      if (finalProducts.length > 0) {
        setLastSuggestedProducts(finalProducts)
      }

      const isGreeting = /^(hi|hello|hey|hii|helo|namaste|namaskar)$/i.test(prompt)
      
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
      const detectedLanguage = detectLanguage(prompt)
      const wantsProducts = shouldShowProducts(prompt)
      const queryFilters = getQueryFilters(prompt)
      const preferredFromSuggestion = queryFilters.referenceAsked ? lastSuggestedProducts : []
      const quickProducts = wantsProducts
        ? await fetchProductsFromShop(prompt, { preferredProducts: preferredFromSuggestion })
        : []
      if (quickProducts.length > 0) {
        setLastSuggestedProducts(quickProducts)
      }

      const isGreeting = /^(hi|hello|hey|hii|helo|namaste|namaskar)$/i.test(prompt)
      
      const fallbackText = isGreeting
        ? (detectedLanguage === 'hinglish'
          ? `Hello ${currentUser?.name || 'dost'}! 😊✨ Namaste! Kaisi ho? Main aapki fashion assistant hoon. Aaj kya explore karna chahoge? Casual wear, party outfits, traditional collection, ya trending styles? Bolo aur main perfect products dikhaungi! 🛍️💫`
          : `Hello ${currentUser?.name || 'friend'}! 😊✨ Welcome! How are you today? I'm your fashion assistant. What would you like to explore? Casual wear, party outfits, traditional collection, or trending styles? Tell me and I'll show you perfect products! 🛍️💫`)
        : (detectedLanguage === 'hinglish'
          ? (wantsProducts
            ? `Bilkul ${currentUser?.name || 'dost'}! 🛍️ Maine tumhari demand ke according products nikale hain. Niche dekho 👇✨`
            : `Haan ${currentUser?.name || 'dost'}, main samajh gayi! 😊 Thoda aur detail batao - color preference, occasion, budget? Main accurate suggestions dungi! 💫`)
          : (wantsProducts
            ? `Absolutely ${currentUser?.name || 'friend'}! 🛍️ I've found products matching your request. Check them out below 👇✨`
            : `Sure ${currentUser?.name || 'friend'}, I understand! 😊 Tell me more - color preference, occasion, budget? I'll give you accurate suggestions! 💫`))

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
          border: 2px solid #d2aa2f;
          background: linear-gradient(135deg, #111 0%, #1e1e1e 100%);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35), 0 0 24px rgba(210, 170, 47, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          color: #d2aa2f;
        }

        .chatbot-bubble.active {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), 0 0 18px rgba(210, 170, 47, 0.2);
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
          padding: 10px 12px;
          line-height: 1.45;
          font-size: 12.5px;
          border: 1px solid transparent;
          word-break: break-word;
        }

        .msg-bubble-bot {
          background: #ffffff;
          color: #1e1e1e;
          border-color: rgba(210, 170, 47, 0.22);
          border-bottom-left-radius: 4px;
        }

        .msg-bubble-user {
          background: linear-gradient(135deg, #101010, #252525);
          color: #f0d577;
          border-color: rgba(210, 170, 47, 0.35);
          border-bottom-right-radius: 4px;
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
          border: 1px solid rgba(210, 170, 47, 0.35);
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          background: #fff;
          outline: none;
        }

        .chat-footer input:focus {
          border-color: #cfa12a;
          box-shadow: 0 0 0 3px rgba(210, 170, 47, 0.14);
        }

        .chat-footer button {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid #c7961d;
          background: linear-gradient(135deg, #f3ce64, #d49f1a);
          color: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
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
