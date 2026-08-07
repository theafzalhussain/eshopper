import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, X, Loader2, GripVertical,
  Sparkles, ShoppingBag, Minimize2, Crown, Zap, RotateCcw
} from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'
import { BOT_AVATAR, POSITION_STORAGE_KEY, SLOT_MEMORY_KEY } from './chatbot/constants'
import {
  loadTranscript, saveTranscript, clearTranscript, hasUserTurn, lastFollowUps
} from './chatbot/chatTranscript'
import {
  detectLanguage, detectLanguagePreferenceRequest, isHindiLike,
  normalizeResponseLanguage, detectConversationStyle, summarizeUserNeeds
} from './chatbot/languageUtils'
import { normalizeProduct, extractInlineProducts, stripProductTags } from './chatbot/productUtils'
import { searchProducts, getApiProducts } from './chatbot/productSearch'
import { analyzeMessage, distillMemory, INTENTS } from './chatbot/intentEngine'
import { buildCatalogIntel } from './chatbot/catalogIntel'
import { buildPersonalizedContext } from './chatbot/promptBuilder'
import { getSiteKnowledge } from './chatbot/siteKnowledge'
import {
  composeProductReply, composeProductDetail, composeGreeting, composeSmalltalk,
  composeThanks, composeGoodbye, composeIdentity, composeCatalogOverview,
  composeDeals, composeComplaint, composeSizeHelp,
  buildFollowUpChips, DEFAULT_CHIPS
} from './chatbot/replyComposer'
import PremiumRobotIcon from './chatbot/PremiumRobotIcon'
import { CHATBOT_STYLES, CHATBOT_STYLES_EXTRA } from './chatbot/chatbotStyles'
import {
  loadPreferences, savePreferences, updatePreferencesFromText,
  formatPreferences, loadTypingSpeed, saveTypingSpeed,
  detectTypingSpeedPreference, buildTypingSpeedReply
} from './chatbot/preferences'
import { STREAMING_SPEEDS, STREAMING_CHUNKS, streamText } from './chatbot/streamingUtils'

/* ─── helpers ─── */
const toInit = (name) => (name || 'U').trim().charAt(0).toUpperCase()
const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const spring = { type: 'spring', stiffness: 310, damping: 26 }
const RESPONSE_CACHE_TTL_MS = 4 * 60 * 1000
const RESPONSE_CACHE_MAX = 60
const AI_TIMEOUT_MS = 26000

/* The very first thing a visitor reads. Always English, always warm,
   and deliberately free of product counts, discounts or offers. */
const WELCOME_TEXT = "Hi, I'm Aria — your personal style consultant at Eshopper. 🌸 Tell me what you're looking for: the occasion, a budget, a colour, or just the vibe you're after. I'll go through the collection and shortlist the pieces that actually suit you, and I'll tell you honestly which one I'd pick."

const loadSlotMemory = () => {
  try {
    const raw = localStorage.getItem(SLOT_MEMORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

const nameOf = (row) => String(row?.name || row || '').trim()

const freshWelcome = () => ({
  id: Date.now(),
  sender: 'bot',
  text: WELCOME_TEXT,
  timestamp: new Date(),
  products: []
})

/* ══════════════════════════════════════════════════════════
   AVATAR — the bot always shows Aria's face, the customer
   shows their own photo when they have one, initial otherwise.
══════════════════════════════════════════════════════════ */
function ChatAvatar({ sender, user }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (sender === 'bot') {
    return (
      <div className="avatar-col">
        <div className="avatar bot-av" title="Aria · Style Consultant">
          {BOT_AVATAR && !imgFailed ? (
            <img src={BOT_AVATAR} alt="Aria" onError={() => setImgFailed(true)} />
          ) : (
            <PremiumRobotIcon mood="happy" size={30} />
          )}
        </div>
        <small>Aria</small>
      </div>
    )
  }

  const named = user?.name && user.name !== 'Guest'
  const label = named ? user.name : 'You'
  return (
    <div className="avatar-col">
      <div className="avatar user-av" title={label}>
        {user?.pic && !imgFailed ? (
          <img src={user.pic} alt={label} onError={() => setImgFailed(true)} referrerPolicy="no-referrer" />
        ) : (
          <span>{toInit(user?.name)}</span>
        )}
      </div>
      <small>{named ? user.name.trim().split(/\s+/)[0].slice(0, 8) : 'You'}</small>
    </div>
  )
}

export default function ChatBot() {
  /* Restore the saved conversation exactly once, before any state is seeded */
  const restored = useRef(loadTranscript())

  /* ── UI state ── */
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMobileFS, setIsMobileFS] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  /* hide the starter rail once a real conversation exists */
  const [showChips, setShowChips] = useState(() => !hasUserTurn(restored.current))
  const [chips, setChips] = useState(() => lastFollowUps(restored.current) || DEFAULT_CHIPS)

  /* ── chat state (restored from the saved transcript when available) ── */
  const [messages, setMessages] = useState(() => restored.current?.messages || [freshWelcome()])
  const [input, setInput] = useState('')
  const [loading, setLoad] = useState(false)
  const [mood, setMood] = useState('idle')

  /* ── data state ── */
  const [user, setUser] = useState({ name: 'Guest', pic: '', email: '' })
  const [lastProducts, setLastProducts] = useState(() => restored.current?.lastProducts || [])
  const [productCache, setProductCache] = useState([])
  const [coupons, setCoupons] = useState([])
  const [adminCatalog, setAdminCatalog] = useState(null)
  /* null = no explicit choice yet -> English default until the customer writes Hindi */
  const [langPref, setLangPref] = useState(() => localStorage.getItem('chatbot_preferred_language') || null)
  const [prefs, setPrefs] = useState(() => loadPreferences())
  const [speed, setSpeed] = useState(() => loadTypingSpeed())
  const [slotMemory, setSlotMemory] = useState(() => loadSlotMemory())

  /* ── refs ── */
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const prefsRef = useRef(prefs)
  const speedRef = useRef(speed)
  const memoryRef = useRef(slotMemory)
  const langPrefRef = useRef(langPref)
  const streamRef = useRef(null)
  const responseCacheRef = useRef(new Map())

  useEffect(() => { prefsRef.current = prefs }, [prefs])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { langPrefRef.current = langPref }, [langPref])
  useEffect(() => {
    memoryRef.current = slotMemory
    try { localStorage.setItem(SLOT_MEMORY_KEY, JSON.stringify(slotMemory)) } catch { /* ignore */ }
  }, [slotMemory])

  /* ── persist the transcript (debounced, skips mid-stream states) ── */
  useEffect(() => {
    if (loading) return
    if (messages.some((m) => m.typing)) return
    const t = setTimeout(() => saveTranscript(messages, lastProducts), 400)
    return () => clearTimeout(t)
  }, [messages, lastProducts, loading])

  /* ── derived catalog intelligence ── */
  const catalogIntel = useMemo(() => buildCatalogIntel(productCache), [productCache])
  const brandList = useMemo(() => Array.from(new Set([
    ...(catalogIntel.brands || []).map((b) => b.name),
    ...(adminCatalog?.brands || [])
  ].filter(Boolean))), [catalogIntel, adminCatalog])

  /* ── position clamping ── */
  const clamp = (p) => ({
    x: Math.min(16, Math.max(-(window.innerWidth - 118), p.x)),
    y: Math.min(8, Math.max(-(window.innerHeight - 118), p.y))
  })

  useEffect(() => {
    try {
      const s = localStorage.getItem(POSITION_STORAGE_KEY)
      if (s) { const p = JSON.parse(s); if (typeof p?.x === 'number') setPosition(clamp(p)) }
    } catch { /* ignore */ }
  }, [])

  /* ── streaming ── */
  const streamReply = ({ messageId, text, products = [], followUps = null }) =>
    new Promise((resolve) => {
      if (streamRef.current?.cancel) streamRef.current.cancel()
      const sk = speedRef.current || 'fast'
      const ctrl = streamText({
        text: text || '',
        speedMs: STREAMING_SPEEDS[sk] ?? STREAMING_SPEEDS.fast,
        chunkSize: STREAMING_CHUNKS[sk] ?? STREAMING_CHUNKS.fast,
        onUpdate: (partial, done) => {
          setMessages((prev) => prev.map((m) =>
            m.id === messageId ? { ...m, typing: !done, text: partial, products, followUps: done ? followUps : null } : m
          ))
          if (done) { streamRef.current = null; resolve() }
        }
      })
      streamRef.current = ctrl
    })

  /* ── response cache ── */
  const cacheKey = ({ prompt, language, intent, slots }) => [
    language || 'en',
    intent,
    String(prompt || '').trim().toLowerCase(),
    JSON.stringify({
      a: slots?.audience, c: slots?.categories, o: slots?.occasions,
      col: slots?.colors, s: slots?.sizes, b: slots?.budget,
      d: slots?.discountMin, r: slots?.ratingMin, so: slots?.sortBy
    })
  ].join('|')

  const getCached = (key) => {
    const entry = responseCacheRef.current.get(key)
    if (!entry) return null
    if (Date.now() - entry.createdAt > RESPONSE_CACHE_TTL_MS) {
      responseCacheRef.current.delete(key)
      return null
    }
    return entry
  }

  const setCached = (key, value) => {
    const cache = responseCacheRef.current
    cache.set(key, { ...value, createdAt: Date.now() })
    if (cache.size > RESPONSE_CACHE_MAX) {
      const oldest = cache.keys().next().value
      if (oldest) cache.delete(oldest)
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

  /* ── bootstrap user + full catalog knowledge ── */
  useEffect(() => {
    const loadUser = async () => {
      const localName = localStorage.getItem('name')
      const localPic = localStorage.getItem('pic')
        || localStorage.getItem('avatar')
        || localStorage.getItem('photoURL')
        || localStorage.getItem('userpic')
        || ''

      setUser((p) => ({ ...p, name: localName || p.name, pic: localPic || p.pic }))

      try {
        const uid = localStorage.getItem('userid')
        if (!uid) return
        const { data } = await axios.get(`${BASE_URL}/user/${uid}`, { timeout: 9000 })
        setUser({
          name: data.name || localName || 'User',
          email: data.email || '',
          pic: data.pic || data.avatar || data.photoURL || data.image || data.profilePic || localPic || ''
        })
      } catch {
        /* keep whatever we already resolved locally */
      }
    }

    const loadKnowledge = async () => {
      /* One call gives products + admin sections + brands + live coupons */
      try {
        const { data } = await axios.get(`${BASE_URL}/api/chatbot/knowledge`, { timeout: 15000 })
        const list = Array.isArray(data?.products) ? data.products : []

        const admin = {
          maincategories: (data?.maincategories || []).map(nameOf).filter(Boolean),
          subcategories: (data?.subcategories || []).map(nameOf).filter(Boolean),
          brands: (data?.brands || []).map(nameOf).filter(Boolean)
        }
        if (admin.maincategories.length || admin.subcategories.length || admin.brands.length) {
          setAdminCatalog(admin)
        }
        setCoupons(Array.isArray(data?.coupons) ? data.coupons : [])

        if (list.length > 0) {
          setProductCache(list.map(normalizeProduct).filter(Boolean))
          return
        }
      } catch { /* fall through */ }

      try {
        const list = await getApiProducts()
        if (list.length > 0) setProductCache(list)
      } catch { /* offline — search will retry on demand */ }
    }

    loadUser()
    loadKnowledge()
  }, [])

  /* ══════════════════════════════════════════
     PRODUCT RESOLUTION FOR A TURN
  ══════════════════════════════════════════ */
  const resolveProducts = useCallback(async ({ intent, slots }) => {
    let catalog = productCache
    if (!catalog.length) {
      catalog = await getApiProducts()
      if (catalog.length) setProductCache(catalog)
    }

    /* Follow-ups about something already shown stay on those items */
    if ((intent === INTENTS.PRODUCT_DETAIL || intent === INTENTS.AVAILABILITY) && lastProducts.length > 0) {
      const limit = intent === INTENTS.PRODUCT_DETAIL ? 3 : lastProducts.length
      return { products: lastProducts.slice(0, limit), matchQuality: 'exact', relaxedOn: [], totalMatches: lastProducts.length }
    }

    if (intent === INTENTS.COMPARE && lastProducts.length >= 2 && !slots.categories?.length) {
      return { products: lastProducts.slice(0, 3), matchQuality: 'exact', relaxedOn: [], totalMatches: lastProducts.length }
    }

    const limit = intent === INTENTS.OUTFIT ? 6 : (intent === INTENTS.COMPARE ? 3 : 6)
    const searchSlots = intent === INTENTS.DEALS
      ? { ...slots, wantsSale: true, sortBy: slots.sortBy || 'discount' }
      : slots

    return searchProducts({
      slots: searchSlots,
      products: catalog,
      preferred: lastProducts,
      limit
    })
  }, [productCache, lastProducts])

  /* ══════════════════════════════════════════
     LOCAL (NO-AI) COMPOSER — used as fallback
  ══════════════════════════════════════════ */
  const composeLocalReply = useCallback(({ intent, slots, language, result, knowledge }) => {
    const shared = { language, userName: user?.name, intel: catalogIntel, slots }

    switch (intent) {
      case INTENTS.GREETING: return composeGreeting(shared)
      case INTENTS.SMALLTALK: return composeSmalltalk(shared)
      case INTENTS.THANKS: return composeThanks(shared)
      case INTENTS.GOODBYE: return composeGoodbye(shared)
      case INTENTS.BOT_IDENTITY: return composeIdentity(shared)
      case INTENTS.CATALOG_OVERVIEW: return composeCatalogOverview(shared)
      case INTENTS.DEALS: return composeDeals({ ...shared, coupons })
      case INTENTS.COMPLAINT: return composeComplaint(shared)
      case INTENTS.SIZE_HELP: return composeSizeHelp(shared)
      case INTENTS.PRODUCT_DETAIL:
        return composeProductDetail({ language, product: result?.products?.[0], intel: catalogIntel })
      case INTENTS.POLICY:
      case INTENTS.ORDER_HELP:
        if (knowledge?.text) return knowledge.text
        return isHindiLike(language)
          ? 'Ye detail main aapke liye confirm kar deti hoon. Tab tak /faq ya /return-policy dekh sakte hain, ya support@eshopperr.me par likh dein.'
          : 'Let me confirm that detail for you. In the meantime /faq and /return-policy cover most of it, or write to support@eshopperr.me.'
      default:
        if (result?.products?.length || slots?.categories?.length || slots?.occasions?.length || slots?.audience || result?.audienceEmpty) {
          return composeProductReply({ language, userName: user?.name, slots, result: result || {}, intel: catalogIntel })
        }
        return isHindiLike(language)
          ? 'Bataiye, kis cheez ki talaash hai — occasion, budget ya category? Main turant sahi options nikal deti hoon. 😊'
          : 'Tell me what you are after — an occasion, a budget, or a category — and I will pull the right options straight away. 😊'
    }
  }, [user, catalogIntel, coupons])

  /* ══════════════════════════════════════════
     SEND
  ══════════════════════════════════════════ */
  const handleSend = useCallback(async (e, overrideText) => {
    if (e) e.preventDefault()
    const prompt = (overrideText ?? input).trim()
    if (!prompt || loading) return

    if (showChips) setShowChips(false)

    setMessages((p) => [...p, { id: Date.now(), sender: 'user', text: prompt, timestamp: new Date(), products: [] }])
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLoad(true)
    setMood('thinking')

    const typingId = Date.now() + 1000
    setMessages((p) => [...p, { id: typingId, sender: 'bot', text: '', timestamp: new Date(), products: [], typing: true }])

    let intent = INTENTS.GENERAL
    let slots = {}
    let language = 'en'
    let result = { products: [], matchQuality: 'none', relaxedOn: [] }
    let knowledge = null

    try {
      /* 1. language — English is the default. We only reply in Hindi or
            Hinglish when the customer explicitly asked for it, or when this
            very message is written in Hindi/Hinglish. */
      const askedLang = detectLanguagePreferenceRequest(prompt)
      if (askedLang) {
        setLangPref(askedLang)
        langPrefRef.current = askedLang
        localStorage.setItem('chatbot_preferred_language', askedLang)
      }
      const detected = detectLanguage(prompt)
      language = askedLang || langPrefRef.current || detected || 'en'

      /* 2. typing speed shortcut */
      const speedPref = detectTypingSpeedPreference(prompt)
      if (speedPref) {
        setSpeed(speedPref); saveTypingSpeed(speedPref)
        await streamReply({ messageId: typingId, text: buildTypingSpeedReply({ language, speed: speedPref }) })
        setMood('happy'); return
      }

      /* 3. long-lived preferences */
      const prefUp = updatePreferencesFromText(prompt, prefsRef.current)
      if (prefUp.changed) {
        setPrefs(prefUp.prefs); savePreferences(prefUp.prefs)
        if (prefUp.reset) {
          setSlotMemory({})
          await streamReply({
            messageId: typingId,
            text: isHindiLike(language)
              ? 'Saari preferences clear kar di. 😊 Naye sire se shuru karein — kya dhoondh rahe hain?'
              : 'Cleared everything I had saved. 😊 Fresh start — what are you looking for?'
          })
          setMood('happy'); return
        }
      }

      /* 4. understand the message */
      const analysis = analyzeMessage({
        text: prompt,
        memory: memoryRef.current,
        brandList,
        lastProducts
      })
      intent = analysis.intent
      slots = analysis.slots
      setSlotMemory(distillMemory(slots))

      /* 5. grounding knowledge for policy-style questions */
      knowledge = getSiteKnowledge({ text: prompt, language })

      /* 6. products for this turn */
      if (analysis.wantsProducts) {
        result = await resolveProducts({ intent, slots })
        if (result.products.length > 0) setLastProducts(result.products)
      }

      const followUps = analysis.wantsProducts || result.products.length
        ? buildFollowUpChips({ slots, result, intel: catalogIntel, language })
        : []

      /* 7. cache lookup (skip context-sensitive turns) */
      const cacheable = !slots.referenceAsked
        && intent !== INTENTS.PRODUCT_DETAIL
        && intent !== INTENTS.COMPARE
        && intent !== INTENTS.AVAILABILITY
        && intent !== INTENTS.COMPLAINT
      const key = cacheKey({ prompt, language, intent, slots })

      if (cacheable) {
        const cached = getCached(key)
        if (cached) {
          if (cached.products?.length) setLastProducts(cached.products)
          await streamReply({ messageId: typingId, text: cached.text, products: cached.products || [], followUps })
          setChips(followUps.length ? followUps : DEFAULT_CHIPS)
          setMood('happy'); return
        }
      }

      /* 8. ask the model, fully grounded in real catalog data */
      const history = messages
        .filter((m) => m.text && !m.typing)
        .slice(-8)
        .map((m) => ({ role: m.sender === 'bot' ? 'model' : 'user', text: m.text }))

      const grounded = buildPersonalizedContext({
        userQuery: prompt,
        language,
        intent,
        slots,
        conversationStyle: detectConversationStyle(prompt),
        priorNeeds: summarizeUserNeeds(messages),
        preferenceSummary: formatPreferences(prefUp.prefs),
        currentUserName: user?.name && user.name !== 'Guest' ? user.name : '',
        matchedProducts: result.products,
        searchResult: result,
        lastSuggestedProducts: lastProducts,
        catalogIntel,
        adminCatalog,
        knowledgeText: knowledge?.text || '',
        coupons
      })

      const { data } = await axios.post(
        `${BASE_URL}/api/chat`,
        { prompt: grounded, history, intent, language, audience: slots.audience || null },
        { timeout: AI_TIMEOUT_MS }
      )

      let txt = stripProductTags(data?.text || data?.response || data?.message || '')

      /* the model may inline extra product tags — honour them if real */
      const inline = extractInlineProducts(data?.text || '')
      const finalProducts = result.products.length ? result.products : inline
      if (finalProducts.length > 0) setLastProducts(finalProducts)

      if (!txt || txt.length < 12 || data?.fallback) {
        txt = composeLocalReply({ intent, slots, language, result, knowledge })
      } else {
        txt = normalizeResponseLanguage({
          responseText: txt,
          language,
          isGreeting: intent === INTENTS.GREETING,
          wantsProducts: finalProducts.length > 0,
          userName: user?.name
        })
      }

      await streamReply({ messageId: typingId, text: txt, products: finalProducts, followUps })
      setChips(followUps.length ? followUps : DEFAULT_CHIPS)
      if (cacheable) setCached(key, { text: txt, products: finalProducts })
      setMood('happy')

    } catch {
      /* Offline / AI down — still answer like a consultant, locally. */
      try {
        if (!result.products.length && (intent === INTENTS.PRODUCT_SEARCH || intent === INTENTS.DEALS)) {
          result = await resolveProducts({ intent, slots })
          if (result.products.length) setLastProducts(result.products)
        }
      } catch { /* ignore */ }

      const fallback = composeLocalReply({ intent, slots, language, result, knowledge })
      const followUps = buildFollowUpChips({ slots, result, intel: catalogIntel, language })
      await streamReply({ messageId: typingId, text: fallback, products: result.products, followUps })
      setChips(followUps.length ? followUps : DEFAULT_CHIPS)
      setMood('idle')
    } finally {
      setLoad(false)
      setTimeout(() => setMood('idle'), 1800)
    }
  }, [
    input, loading, showChips, messages, lastProducts, user,
    brandList, catalogIntel, coupons, adminCatalog, resolveProducts, composeLocalReply
  ])

  const handleChip = (prompt) => handleSend(null, prompt)

  const resetChat = () => {
    if (streamRef.current?.cancel) streamRef.current.cancel()
    responseCacheRef.current.clear()
    clearTranscript()
    setMessages([freshWelcome()])
    setLastProducts([])
    setSlotMemory({})
    setChips(DEFAULT_CHIPS)
    setShowChips(true)
    setLoad(false)
    setMood('idle')
  }

  const toggle = () => setIsOpen((o) => { if (!o) setHasNew(false); return !o })

  const lastBotId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === 'bot') return messages[i].id
    }
    return null
  }, [messages])

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
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
      {!isOpen && (
        <motion.div className="grip-handle" whileHover={{ scale: 1.1, opacity: 1 }} initial={{ opacity: 0.6 }}>
          <GripVertical size={11} color="#C9A96E" />
        </motion.div>
      )}

      {/* ── Launcher ── */}
      <motion.button
        className={`chatbot-bubble ${isOpen ? 'active' : ''}`}
        onClick={toggle}
        whileHover={{ scale: 1.09 }}
        whileTap={{ scale: 0.93 }}
        initial={{ opacity: 0, scale: 0.6, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={spring}
        aria-label="Open style consultant"
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

      {/* ── Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`chat-card ${isMobileFS ? 'fullscreen' : ''}`}
            initial={{ opacity: 0, y: 44, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.97 }}
            transition={spring}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="header-left">
                <div className="header-logo-wrap">
                  <Crown size={20} color="#1a0e00" strokeWidth={2.2} />
                </div>
                <div className="header-text">
                  <h4 className="header-name">
                    Aria · Style Consultant
                    <span className="ai-badge" style={{ marginLeft: 6 }}>
                      <Zap size={7} /> AI
                    </span>
                  </h4>
                  <div className="header-status">
                    <span className="status-dot" />
                    <span className="status-text">Online · Official Eshopper</span>
                  </div>
                </div>
              </div>

              <div className="header-actions">
                <motion.button
                  className="hdr-btn"
                  onClick={resetChat}
                  whileHover={{ scale: 1.08, rotate: -25 }}
                  whileTap={{ scale: 0.9 }}
                  title="Start a new conversation"
                >
                  <RotateCcw size={13} />
                </motion.button>
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

            {/* Starter chips */}
            <AnimatePresence>
              {showChips && (
                <motion.div
                  className="chips-bar"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  {chips.map((c) => (
                    <motion.button
                      key={c.label}
                      className="chip"
                      onClick={() => handleChip(c.prompt)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {c.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="chat-body">
              {messages.length >= 1 && messages[0].sender === 'bot' && (
                <motion.div
                  className="welcome-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  <div className="welcome-tag">Official Style Desk</div>
                  <h3 className="welcome-title">Your Dedicated Fashion Consultant</h3>
                  <div className="welcome-divider" />
                  <p className="welcome-body">{messages[0].text}</p>
                </motion.div>
              )}

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
                    <ChatAvatar sender={msg.sender} user={user} />

                    <div className="msg-content">
                      {msg.typing && !msg.text ? (
                        <div className="typing-wrap">
                          <span className="typing-lbl">Aria is thinking</span>
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
                          {String(msg.text || '').split('\n').map((line, i) => (
                            <span key={i} className="bubble-line">{line}</span>
                          ))}
                        </div>
                      )}

                      {msg.products?.length > 0 && (
                        <div className="product-grid">
                          {msg.products.map((p, i) => {
                            const href = p.link || (p.id ? `/single-product/${p.id}` : '#')
                            const soldOut = p.inStock === false
                            return (
                              <motion.a
                                key={`${p.id || p.name}-${i}`}
                                className={`product-card ${soldOut ? 'is-out' : ''}`}
                                href={href}
                                whileHover={{ y: -5 }}
                                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                              >
                                <div className="p-img">
                                  {p.image
                                    ? <img src={p.image} alt={p.name} loading="lazy" />
                                    : <div className="p-no-img"><span>🛍️</span><span>No Image</span></div>}
                                  {p.discount > 0 && <span className="p-badge">{p.discount}% OFF</span>}
                                  {p.newArrival && <span className="p-badge p-badge-new">NEW</span>}
                                  {soldOut && <span className="p-sold">Out of stock</span>}
                                </div>

                                <div className="p-meta">
                                  {p.brand && <p className="p-brand">{p.brand}</p>}
                                  <p className="p-name">{p.name}</p>

                                  <div className="p-price-row">
                                    {p.basePrice > 0 && p.discount > 0 ? (
                                      <>
                                        <span className="p-price"><Sparkles size={10} /> {inr(p.price)}</span>
                                        <span className="p-price-old">{inr(p.basePrice)}</span>
                                      </>
                                    ) : p.price ? (
                                      <span className="p-price"><Sparkles size={10} /> {inr(p.price)}</span>
                                    ) : null}
                                  </div>

                                  {p.savings > 0 && <p className="p-save">You save {inr(p.savings)}</p>}
                                  {p.rating > 0 && <p className="p-rating">⭐ {p.rating} {p.reviews > 0 ? `(${p.reviews})` : ''}</p>}
                                  {p.fabric && <p className="p-fabric">🧵 {p.fabric}</p>}
                                  {p.matchReason && <p className="p-reason">{p.matchReason}</p>}
                                  {p.stockLabel && p.stockLabel !== 'In stock' && (
                                    <p className={`p-stock ${soldOut ? 'out' : 'low'}`}>{p.stockLabel}</p>
                                  )}

                                  <span className="p-link"><ShoppingBag size={10} /> View details</span>
                                </div>
                              </motion.a>
                            )
                          })}
                        </div>
                      )}

                      {msg.sender === 'bot' && msg.id === lastBotId && msg.followUps?.length > 0 && !loading && (
                        <div className="followup-bar">
                          {msg.followUps.map((c) => (
                            <button
                              key={c.label}
                              type="button"
                              className="followup-chip"
                              onClick={() => handleChip(c.prompt)}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="msg-time">{fmtTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                )
              })}

              <div ref={endRef} />
            </div>

            {/* Footer */}
            <form className="chat-footer" onSubmit={handleSend}>
              <div className="input-row">
                <div className="input-box">
                  <textarea
                    ref={inputRef}
                    className="chat-input"
                    value={input}
                    placeholder="Tell me the occasion, budget or size…"
                    maxLength={500}
                    disabled={loading}
                    rows={1}
                    onChange={(ev) => {
                      setInput(ev.target.value)
                      ev.target.style.height = 'auto'
                      ev.target.style.height = Math.min(ev.target.scrollHeight, 96) + 'px'
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' && !ev.shiftKey) {
                        ev.preventDefault()
                        handleSend(ev)
                      }
                    }}
                  />
                  {input.length > 380 && <span className="char-count">{input.length}/500</span>}
                </div>

                <motion.button
                  type="submit"
                  className="send-btn"
                  disabled={!input.trim() || loading}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Send message"
                >
                  {loading ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
                </motion.button>
              </div>

              <div className="footer-meta">
                <span className="footer-brand">Powered by <b>Eshopper AI</b></span>
                <span className="footer-hint">⏎ Send · Shift+⏎ New line</span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: CHATBOT_STYLES }} />
      <style dangerouslySetInnerHTML={{ __html: CHATBOT_STYLES_EXTRA }} />
    </motion.div>
  )
}
