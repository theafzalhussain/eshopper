import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, X, Loader2, GripVertical,
  Sparkles, ShoppingBag, Minimize2, Crown, Zap
} from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'
import { BOT_AVATAR, POSITION_STORAGE_KEY } from './chatbot/constants'
import {
  detectLanguage, detectLanguagePreferenceRequest,
  isGreetingMessage, isHowAreYouQuery, isProductDetailsQuery,
  normalizeResponseLanguage, detectConversationStyle, summarizeUserNeeds
} from './chatbot/languageUtils'
import { normalizeProduct, extractInlineProducts } from './chatbot/productUtils'
import { fetchProductsFromShop, getQueryFilters, shouldShowProducts } from './chatbot/productSearch'
import { buildPersonalizedContext } from './chatbot/promptBuilder'
import PremiumRobotIcon from './chatbot/PremiumRobotIcon'
import { CHATBOT_STYLES } from './chatbot/chatbotStyles'
import { getSiteKnowledgeReply } from './chatbot/siteKnowledge'
import { buildProductDetailReply, buildProductListReply } from './chatbot/responseUtils'
import {
  loadPreferences, savePreferences, updatePreferencesFromText,
  formatPreferences, loadTypingSpeed, saveTypingSpeed,
  detectTypingSpeedPreference, buildTypingSpeedReply
} from './chatbot/preferences'
import { STREAMING_SPEEDS, STREAMING_CHUNKS, streamText } from './chatbot/streamingUtils'

/* ─── helpers ─── */
const toInit = (name) => (name || 'U').trim().charAt(0).toUpperCase()
const fmtTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const CHIPS = [
  { key: 'party', label: '👗 Party wear' },
  { key: 'office', label: '💼 Office look' },
  { key: 'casual', label: '🌸 Casual' },
  { key: 'new-arrivals', label: '✨ New arrivals' },
  { key: 'gift', label: '🎁 Gifts' },
  { key: 'ethnic', label: '🧵 Ethnic wear' },
  { key: 'men', label: '👔 Men' },
  { key: 'women', label: '👠 Women' },
  { key: 'kids', label: '🧸 Kids' },
  { key: 'under-999', label: '💰 Under ₹999' },
  { key: 'under-1999', label: '💵 Under ₹1999' },
  { key: 'under-2999', label: '💎 Under ₹2999' },
]

const CHIP_PROMPTS = {
  party: 'Show party wear outfits for men and women',
  office: 'Show office wear formal outfits',
  casual: 'Show casual daily wear outfits',
  'new-arrivals': 'Show new arrivals',
  gift: 'Help me pick a stylish gift and show product options',
  ethnic: 'Show ethnic wear outfits for men women and kids',
  men: 'Show men products',
  women: 'Show women products',
  kids: 'Show kids products',
  'under-999': 'Show products under 999 rupees',
  'under-1999': 'Show products under 1999 rupees',
  'under-2999': 'Show products under 2999 rupees',
}

const resolveChipPrompt = (key) => {
  const prompt = CHIP_PROMPTS[key]
  if (!prompt) return 'Show products'
  return prompt
}

const buildCatalogMeta = (products = []) => {
  const list = Array.isArray(products) ? products.filter(Boolean) : []
  const categoryCounts = new Map()
  const brandCounts = new Map()
  const priceValues = []
  const discounts = []
  let newArrivals = 0
  let onSale = 0

  list.forEach((item) => {
    const category = [item.maincategory, item.subcategory].filter(Boolean).join(' / ') || 'Uncategorized'
    const brand = String(item.brand || '').trim()
    const price = Number(item.price || 0)
    const discount = Number(item.discount || 0)

    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    if (brand) brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1)
    if (Number.isFinite(price) && price > 0) priceValues.push(price)
    if (Number.isFinite(discount) && discount > 0) discounts.push({ name: item.name || 'Product', discount })
    if (item.newArrival) newArrivals += 1
    if (item.isSale || discount >= 10) onSale += 1
  })

  const sortedCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => `${name} (${count})`)

  const sortedBrands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))

  const totalProducts = list.length
  const minPrice = priceValues.length ? Math.min(...priceValues) : 0
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0
  const avgPrice = priceValues.length ? Math.round(priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length) : 0
  const avgDiscount = discounts.length
    ? Math.round(discounts.reduce((sum, item) => sum + item.discount, 0) / discounts.length)
    : 0

  return {
    productIntelligence: {
      totalProducts,
      newArrivals,
      onSale,
      avgDiscount,
      priceRange: { min: minPrice, max: maxPrice, avg: avgPrice },
      topDiscounts: discounts.sort((a, b) => b.discount - a.discount).slice(0, 5)
    },
    filterOptions: {
      categories: sortedCategories
    },
    brands: sortedBrands
  }
}

/* spring preset */
const spring = { type: 'spring', stiffness: 310, damping: 26 }
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000
const RESPONSE_CACHE_MAX = 60

export default function ChatBot() {
  /* ── UI state ── */
  const [isOpen, setIsOpen]                   = useState(false)
  const [isDragging, setIsDragging]           = useState(false)
  const [position, setPosition]               = useState({ x: 0, y: 0 })
  const [isMobileFS, setIsMobileFS]           = useState(false)
  const [hasNew, setHasNew]                   = useState(false)
  const [showChips, setShowChips]             = useState(true)

  /* ── chat state ── */
  const [messages, setMessages] = useState([
    {
      id: 1, sender: 'bot',
      text: 'Welcome to Eshopper. I am your personal style concierge. Share your occasion, size, or budget, and I will curate refined options for you.',
      timestamp: new Date(), products: []
    }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoad]  = useState(false)
  const [mood, setMood]     = useState('idle')

  /* ── user / product state ── */
  const [user, setUser]                       = useState({ name: 'Guest', pic: '', email: '' })
  const [lastProducts, setLastProducts]       = useState([])
  const [productCache, setProductCache]       = useState([])
  const [lang, setLang]                       = useState(() => localStorage.getItem('chatbot_preferred_language') || 'en')
  const [prefs, setPrefs]                     = useState(() => loadPreferences())
  const [speed, setSpeed]                     = useState(() => loadTypingSpeed())

  /* ── refs ── */
  const endRef       = useRef(null)
  const inputRef     = useRef(null)
  const prefsRef     = useRef(prefs)
  const speedRef     = useRef(speed)
  const streamRef    = useRef(null)
  const responseCacheRef = useRef(new Map())

  useEffect(() => { prefsRef.current = prefs }, [prefs])
  useEffect(() => { speedRef.current = speed }, [speed])

  /* ── position clamping ── */
  const clamp = (p) => ({
    x: Math.min(16,  Math.max(-(window.innerWidth  - 118), p.x)),
    y: Math.min(8,   Math.max(-(window.innerHeight - 118), p.y)),
  })

  useEffect(() => {
    try {
      const s = localStorage.getItem(POSITION_STORAGE_KEY)
      if (s) { const p = JSON.parse(s); if (typeof p?.x === 'number') setPosition(clamp(p)) }
    } catch { /* ignore */ }
  }, [])

  /* ── streaming helper ── */
  const streamReply = ({ messageId, text, products = [] }) =>
    new Promise((resolve) => {
      if (streamRef.current?.cancel) streamRef.current.cancel()
      const sk = speedRef.current || 'fast'
      const ctrl = streamText({
        text: text || '',
        speedMs: STREAMING_SPEEDS[sk] ?? STREAMING_SPEEDS.fast,
        chunkSize: STREAMING_CHUNKS[sk] ?? STREAMING_CHUNKS.fast,
        onUpdate: (partial, done) => {
          setMessages((prev) => prev.map((m) =>
            m.id === messageId ? { ...m, typing: !done, text: partial, products } : m
          ))
          if (done) { streamRef.current = null; resolve() }
        }
      })
      streamRef.current = ctrl
    })

  const buildResponseCacheKey = ({ prompt, language, preferences, wantsProducts }) => {
    const cleanPrompt = String(prompt || '').trim().toLowerCase()
    const prefStr = JSON.stringify(preferences || {})
    return `${language || 'en'}|${wantsProducts ? 'p' : 'c'}|${cleanPrompt}|${prefStr}`
  }

  const getCachedResponse = (key) => {
    const cache = responseCacheRef.current
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.createdAt > RESPONSE_CACHE_TTL_MS) {
      cache.delete(key)
      return null
    }
    return entry
  }

  const setCachedResponse = (key, value) => {
    const cache = responseCacheRef.current
    cache.set(key, { ...value, createdAt: Date.now() })
    if (cache.size > RESPONSE_CACHE_MAX) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
  }

  /* ── effects ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('openChat') === '1') {
      setIsOpen(true)
      params.delete('openChat')
      const q = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`)
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth <= 500) {
        setIsMobileFS(true)
        setPosition({ x: 0, y: 0 })
        return
      }

      setIsMobileFS(false)
      setPosition((p) => clamp(p))
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isOpen])

  useEffect(() => {
    const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
    return () => clearTimeout(t)
  }, [messages, loading])

  useEffect(() => {
    if (isOpen) {
      setHasNew(false)
      setTimeout(() => inputRef.current?.focus(), 340)
    }
  }, [isOpen])

  /* ── load user + products ── */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const uid  = localStorage.getItem('userid')
        const name = localStorage.getItem('name')
        if (uid) {
          const { data } = await axios.get(`${BASE_URL}/user/${uid}`, { timeout: 9000 })
          setUser({ name: data.name || name || 'User', email: data.email || '', pic: data.pic || data.avatar || data.photoURL || '' })
          return
        }
        setUser((p) => ({ ...p, name: name || p.name }))
      } catch {
        setUser((p) => ({ ...p, name: localStorage.getItem('name') || p.name }))
      }
    }
    const loadProducts = async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/product`, { timeout: 12000 })
        setProductCache((Array.isArray(data) ? data : []).map(normalizeProduct).filter(Boolean))
      } catch { /* load on demand */ }
    }
    loadUser()
    loadProducts()
  }, [])

  /* ════════════════════════════════════════════
     SEND MESSAGE
  ════════════════════════════════════════════ */
  const handleSend = useCallback(async (e, overrideText) => {
    if (e) e.preventDefault()
    const prompt = (overrideText ?? input).trim()
    if (!prompt || loading) return

    if (showChips) setShowChips(false)

    setMessages((p) => [...p, { id: Date.now(), sender: 'user', text: prompt, timestamp: new Date(), products: [] }])
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    setLoad(true)
    setMood('thinking')

    const typingId = Date.now() + 1000
    setMessages((p) => [...p, { id: typingId, sender: 'bot', text: '', timestamp: new Date(), products: [], typing: true }])

    try {
      const askedLang = detectLanguagePreferenceRequest(prompt)
      if (askedLang) { setLang(askedLang); localStorage.setItem('chatbot_preferred_language', askedLang) }
      const detectedFromText = detectLanguage(prompt)
      const detectedLang = askedLang || detectedFromText || lang || 'en'

      /* typing speed */
      const speedPref = detectTypingSpeedPreference(prompt)
      if (speedPref) {
        setSpeed(speedPref); saveTypingSpeed(speedPref)
        await streamReply({ messageId: typingId, text: buildTypingSpeedReply({ language: detectedLang, speed: speedPref }) })
        setMood('happy'); return
      }

      /* preferences */
      const prefUp = updatePreferencesFromText(prompt, prefsRef.current)
      if (prefUp.changed) {
        setPrefs(prefUp.prefs); savePreferences(prefUp.prefs)
        if (prefUp.reset) {
          await streamReply({ messageId: typingId, text: detectedLang === 'hinglish' ? 'Reset ho gaya.' : 'Reset done.' })
          setMood('happy'); return
        }
      }

      const prefSummary = formatPreferences(prefUp.prefs, detectedLang)
      const wantsP = shouldShowProducts(prompt)
      const filters = getQueryFilters(prompt)
      const canUseCache = !filters.referenceAsked && !isProductDetailsQuery(prompt, lastProducts)
      const responseCacheKey = buildResponseCacheKey({
        prompt,
        language: detectedLang,
        preferences: prefUp.prefs,
        wantsProducts: wantsP
      })

      if (canUseCache) {
        const cached = getCachedResponse(responseCacheKey)
        if (cached) {
          if (Array.isArray(cached.products) && cached.products.length > 0) {
            setLastProducts(cached.products)
          }
          await streamReply({ messageId: typingId, text: cached.text, products: cached.products || [] })
          setMood('happy'); return
        }
      }

      /* site knowledge */
      const knowledgeReply = getSiteKnowledgeReply({ text: prompt, language: detectedLang })
      if (knowledgeReply) {
        await streamReply({ messageId: typingId, text: knowledgeReply })
        if (canUseCache) setCachedResponse(responseCacheKey, { text: knowledgeReply, products: [] })
        setMood('happy'); return
      }

      /* product detail */
      if (isProductDetailsQuery(prompt, lastProducts) && lastProducts.length > 0) {
        const detailProducts = lastProducts.slice(0, 3)
        const detailText = buildProductDetailReply({ language: detectedLang, product: lastProducts[0] }) || ''
        await streamReply({ messageId: typingId, text: detailText, products: detailProducts })
        setMood('happy'); return
      }

      /* product search */
      const fromPrev = filters.referenceAsked ? lastProducts : []
      const prodProm = wantsP ? fetchProductsFromShop(prompt, { preferredProducts: fromPrev, cachedProducts: productCache, preferences: prefUp.prefs }) : Promise.resolve([])

      if (wantsP) {
        const pList = await prodProm
        if (pList.length > 0) setLastProducts(pList)
        const productText = buildProductListReply({ language: detectedLang, userName: user?.name, products: pList })
        await streamReply({ messageId: typingId, text: productText, products: pList })
        if (canUseCache) setCachedResponse(responseCacheKey, { text: productText, products: pList })
        setMood('happy'); return
      }

      /* instant conversational fast-path */
      if (isGreetingMessage(prompt) || isHowAreYouQuery(prompt)) {
        const quickText = isHowAreYouQuery(prompt)
          ? (detectedLang === 'hi'
            ? 'Main achha hoon, dhanyavaad. Kripya batayein, aaj main aapki kis tarah vyaktigat sahayata kar sakta hoon?'
            : 'I am doing well, thank you. How may I assist you with your selection today?')
          : (detectedLang === 'hi'
            ? `Namaste ${user?.name || 'ji'}, swagat hai. Kripya batayein, aap kya dhoondh rahe hain?`
            : `Welcome back${user?.name ? `, ${user.name}` : ''}. How may I assist you today? I can curate options by occasion, fit, or budget.`)

        await streamReply({ messageId: typingId, text: quickText })
        if (canUseCache) setCachedResponse(responseCacheKey, { text: quickText, products: [] })
        setMood('happy'); return
      }

      /* AI chat */
      const history = messages.slice(-6).map((m) => ({ role: m.sender === 'bot' ? 'model' : 'user', text: m.text }))
      const catalogMeta = buildCatalogMeta(productCache)
      const enhanced = buildPersonalizedContext({
        userQuery: prompt,
        language: detectedLang,
        conversationStyle: detectConversationStyle(prompt),
        priorNeeds: summarizeUserNeeds(messages),
        preferenceSummary: prefSummary,
        currentUserName: user?.name,
        lastSuggestedProducts: lastProducts,
        allProductsCache: productCache,
        catalogMeta
      })

      const { data } = await axios.post(`${BASE_URL}/api/chat`, { prompt: enhanced, history }, { timeout: 12000 })

      let txt = data?.text || data?.response || data?.message ||
        (detectedLang === 'hi'
          ? `Dhanyavaad ${user?.name || 'ji'}. Kripya batayein, aap kis type ka outfit dekhna chahte hain?`
          : `Thank you${user?.name ? `, ${user.name}` : ''}. What type of outfit are you looking for today? I can tailor recommendations to your occasion and budget.`)

      const inline = extractInlineProducts(txt)
      const dbP    = await prodProm
      const finals = inline.length > 0 ? inline : dbP
      if (finals.length > 0) setLastProducts(finals)

      if (wantsP && !txt?.trim()) txt = detectedLang === 'hi' ? 'Aapke liye curated options neeche share kiye gaye hain.' : 'I have shared curated options for you below.'

      txt = normalizeResponseLanguage({ responseText: txt, language: detectedLang, isGreeting: isGreetingMessage(prompt), wantsProducts: wantsP, userName: user?.name })
      if (isGreetingMessage(prompt) && !txt.includes('Welcome') && !txt.includes('Namaste')) {
        txt = detectedLang === 'hi'
          ? `Namaste ${user?.name || 'ji'}, swagat hai. Kripya batayein, main aaj aapki kis tarah sahayata kar sakta hoon?`
          : `Welcome back${user?.name ? `, ${user.name}` : ''}. How may I assist you today?`
      }

      const finalText = txt.replace(/\[PRODUCT:.*?\]/g, '').trim()
      await streamReply({ messageId: typingId, text: finalText, products: finals })
      if (canUseCache) setCachedResponse(responseCacheKey, { text: finalText, products: finals })
      setMood('happy')

    } catch {
      const askedLang    = detectLanguagePreferenceRequest(prompt)
      if (askedLang) { setLang(askedLang); localStorage.setItem('chatbot_preferred_language', askedLang) }
      const detectedFromText = detectLanguage(prompt)
      const detectedLang = askedLang || detectedFromText || lang || 'en'
      const wantsP       = shouldShowProducts(prompt)
      const filters      = getQueryFilters(prompt)
      const quickP       = wantsP ? await fetchProductsFromShop(prompt, { preferredProducts: filters.referenceAsked ? lastProducts : [], cachedProducts: productCache, preferences: prefsRef.current }) : []
      if (quickP.length > 0) setLastProducts(quickP)

      const isGreet  = isGreetingMessage(prompt)
      const isHAY    = isHowAreYouQuery(prompt)
      const isPD     = isProductDetailsQuery(prompt, lastProducts)
      let fallback   = ''

      if (isHAY) {
        fallback = detectedLang === 'hi'
            ? 'Main achha hoon, dhanyavaad. Kripya batayein, main aapki kaise sahayata kar sakta hoon?'
            : 'I am doing well, thank you. How may I assist you today?'
      } else if (isPD && lastProducts.length > 0) {
        const p = lastProducts[0]
        fallback = `${p.name}: ${p.discount > 0 ? `${p.discount}% off — ₹${p.price}` : `₹${p.price}`}${p.rating > 0 ? ` | ⭐ ${p.rating}` : ''}`
      } else if (isGreet) {
        fallback = detectedLang === 'hi'
            ? `Namaste ${user?.name || 'ji'}, aapka swagat hai.`
            : `Welcome back${user?.name ? `, ${user.name}` : ''}.`
      } else {
        fallback = detectedLang === 'hi'
            ? (wantsP ? 'Aapke liye curated options neeche share kiye gaye hain.' : 'Kripya apna budget ya occasion batayein, main turant suitable options suggest karunga.')
            : (wantsP ? 'I have shared curated options for you below.' : 'Please share your budget or occasion, and I will suggest suitable options right away.')
      }

      await streamReply({ messageId: typingId, text: fallback, products: quickP })
      if (!filters.referenceAsked) {
        const fallbackCacheKey = buildResponseCacheKey({
          prompt,
          language: detectedLang,
          preferences: prefsRef.current,
          wantsProducts: wantsP
        })
        setCachedResponse(fallbackCacheKey, { text: fallback, products: quickP })
      }
      setMood('idle')
    } finally {
      setLoad(false)
      setTimeout(() => setMood('idle'), 1800)
    }
  }, [input, loading, messages, lang, lastProducts, productCache, user, showChips])

  /* ── chip handler ── */
  const handleChip = (chipKey) => handleSend(null, resolveChipPrompt(chipKey))

  /* ── toggle ── */
  const toggle = () => setIsOpen((o) => { if (!o) setHasNew(false); return !o })

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <motion.div
      className="chatbot-wrapper"
      drag={!isOpen}
      dragElastic={0.07}
      dragMomentum={false}
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false)
        setPosition((p) => {
          const n = clamp({ x: p.x + info.offset.x, y: p.y + info.offset.y })
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(n))
          return n
        })
      }}
      style={{ cursor: !isOpen ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {/* grip */}
      {!isOpen && (
        <motion.div className="grip-handle" whileHover={{ scale: 1.1, opacity: 1 }} initial={{ opacity: 0.6 }}>
          <GripVertical size={11} color="#C9A96E" />
        </motion.div>
      )}

      {/* ── Launcher bubble ── */}
      <motion.button
        className={`chatbot-bubble ${isOpen ? 'active' : ''}`}
        onClick={toggle}
        whileHover={{ scale: 1.09 }}
        whileTap={{ scale: 0.93 }}
        initial={{ opacity: 0, scale: 0.6, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={spring}
        aria-label="Open style concierge"
      >
        <div className="robot-shell">
          <PremiumRobotIcon mood={mood} size={54} />
        </div>

        <AnimatePresence>
          {hasNew && !isOpen && (
            <motion.div
              className="notif-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 18 }}
            >1</motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`chat-card ${isMobileFS ? 'fullscreen' : ''}`}
            initial={{ opacity: 0, y: 44, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.97 }}
            transition={spring}
          >

            {/* ── Header ── */}
            <div className="chat-header">
              <div className="header-left">
                <div className="header-logo-wrap">
                  <Crown size={20} color="#1a0e00" strokeWidth={2.2} />
                </div>
                <div className="header-text">
                  <h4 className="header-name">
                    Eshopper Client Concierge
                    <span className="ai-badge" style={{ marginLeft: 6 }}>
                      <Zap size={7} /> AI
                    </span>
                  </h4>
                  <div className="header-status">
                    <span className="status-dot" />
                    <span className="status-text">Official · Eshopper</span>
                  </div>
                </div>
              </div>

              <div className="header-actions">
                {!isMobileFS && (
                  <motion.button
                    className="hdr-btn"
                    onClick={toggle}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    title="Minimize"
                  >
                    <Minimize2 size={13} />
                  </motion.button>
                )}
                <motion.button
                  className="hdr-close"
                  onClick={toggle}
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close"
                >
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            {/* ── Quick chips ── */}
            <AnimatePresence>
              {showChips && (
                <motion.div
                  className="chips-bar"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  {CHIPS.map((c) => (
                    <motion.button
                      key={c.key}
                      className="chip"
                      onClick={() => handleChip(c.key)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {c.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Messages ── */}
            <div className="chat-body">

              {/* Welcome card (first bot message) */}
              {messages.length >= 1 && messages[0].sender === 'bot' && (
                <motion.div
                  className="welcome-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  <div className="welcome-tag">Official Style Desk</div>
                  <h3 className="welcome-title">Your Dedicated Fashion Guide</h3>
                  <div className="welcome-divider" />
                  <p className="welcome-body">{messages[0].text}</p>
                </motion.div>
              )}

              {/* All messages (skip idx=0 which is the welcome card above) */}
              {messages.map((msg, idx) => {
                if (idx === 0 && msg.sender === 'bot') return null
                return (
                  <motion.div
                    key={msg.id}
                    className={`msg-row msg-${msg.sender}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    {/* Avatar */}
                    <div className="avatar-col">
                      {msg.sender === 'bot' ? (
                        <>
                          <div className="avatar bot-av">
                            {BOT_AVATAR
                              ? <img src={BOT_AVATAR} onError={(e) => { e.currentTarget.style.display = 'none' }} alt="bot" />
                              : <span style={{ fontSize: 14 }}>✦</span>
                            }
                          </div>
                          <small>AI</small>
                        </>
                      ) : (
                        <>
                          <div className="avatar user-av">
                            {user.pic
                              ? <img src={user.pic} alt={user.name} />
                              : <span>{toInit(user.name)}</span>
                            }
                          </div>
                          <small>You</small>
                        </>
                      )}
                    </div>

                    {/* Content */}
                    <div className="msg-content">
                      {/* Typing or bubble */}
                      {msg.typing && !msg.text ? (
                        <div className="typing-wrap">
                          <span className="typing-lbl">typing</span>
                          <div className="typing-dots">
                            {[0, 0.11, 0.22].map((d, i) => (
                              <motion.div
                                key={i}
                                className="dot"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ repeat: Infinity, duration: 0.55, delay: d }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={`bubble bubble-${msg.sender}`}>
                          {msg.text}
                        </div>
                      )}

                      {/* Products */}
                      {msg.products?.length > 0 && (
                        <div className="product-grid">
                          {msg.products.map((p, i) => {
                            const href = p.link || (p.id ? `/single-product/${p.id}` : '#')
                            return (
                              <motion.a
                                key={`${p.id || p.name}-${i}`}
                                className="product-card"
                                href={href}
                                whileHover={{ y: -5 }}
                                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                              >
                                <div className="p-img">
                                  {p.image
                                    ? <img src={p.image} alt={p.name} />
                                    : <div className="p-no-img"><span>🛍️</span><span>No Image</span></div>
                                  }
                                  {p.discount > 0 && (
                                    <span className="p-badge">{p.discount}% OFF</span>
                                  )}
                                </div>

                                <div className="p-meta">
                                  <p className="p-name">{p.name}</p>

                                  <div className="p-price-row">
                                    {p.basePrice && p.discount > 0 ? (
                                      <>
                                        <span className="p-price"><Sparkles size={10} /> ₹{p.price}</span>
                                        <span className="p-price-old">₹{p.basePrice}</span>
                                      </>
                                    ) : p.price ? (
                                      <span className="p-price"><Sparkles size={10} /> ₹{p.price}</span>
                                    ) : null}
                                  </div>

                                  {p.rating > 0 && (
                                    <p className="p-rating">⭐ {p.rating} ({p.reviews})</p>
                                  )}
                                  {p.fabric && <p className="p-fabric">🧵 {p.fabric}</p>}

                                  <span className="p-link">
                                    <ShoppingBag size={10} /> View details
                                  </span>
                                </div>
                              </motion.a>
                            )
                          })}
                        </div>
                      )}

                      <span className="msg-time">{fmtTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                )
              })}

              <div ref={endRef} />
            </div>

            {/* ── Footer / Input ── */}
            <form className="chat-footer" onSubmit={handleSend}>
              <div className="input-row">
                <div className="input-box">
                  <textarea
                    ref={inputRef}
                    className="chat-input"
                    value={input}
                    placeholder="Tell me your size, budget, or occasion…"
                    maxLength={500}
                    disabled={loading}
                    rows={1}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend(e)
                      }
                    }}
                  />
                  {input.length > 380 && (
                    <span className="char-count">{input.length}/500</span>
                  )}
                </div>

                <motion.button
                  type="submit"
                  className="send-btn"
                  disabled={!input.trim() || loading}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Send message"
                >
                  {loading
                    ? <Loader2 size={17} className="spin" />
                    : <Send size={17} />
                  }
                </motion.button>
              </div>

              <div className="footer-meta">
                <span className="footer-brand">
                  Powered by <b>Eshopper AI</b>
                </span>
                <span className="footer-hint">⏎ Send · Shift+⏎ New line</span>
              </div>
            </form>

          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: CHATBOT_STYLES }} />
      <style dangerouslySetInnerHTML={{ __html: `
        .chat-card.fullscreen {
          position: fixed !important;
          left: 0 !important; right: auto !important;
          bottom: auto !important; top: 0 !important;
          width: 125vw !important;
          height: 125dvh !important;
          max-height: 125dvh !important;
          border-radius: 0 !important;
          border: none !important;
          z-index: 9200 !important;
        }
        @media (max-width: 500px) {
          .chat-card {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            right: auto !important; bottom: auto !important;
            width: 125vw !important;
            height: 125dvh !important;
            max-height: 125dvh !important;
            border-radius: 0 !important;
            border: none !important;
            z-index: 9200 !important;
          }
        }
      `}} />
    </motion.div>
  )
}
