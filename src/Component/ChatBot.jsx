import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2, GripVertical, Sparkles, ShoppingBag } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'

const IMAGE_KEYWORDS = [
  'image', 'images', 'img', 'photo', 'photos', 'picture', 'pictures',
  'show', 'dikh', 'dikhao', 'product', 'products', 'catalog', 'collection',
  'dress', 'shirt', 'jeans', 'jacket', 'shoes', 'bag', 'kurti', 'saree'
]

const BOT_AVATAR = '/assets/images/chatbot-avatar.png'

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
      </defs>

      <rect x="14" y="10" width="36" height="26" rx="8" fill="url(#rb)" stroke="#B88B12" strokeWidth="1.5" />
      <rect x="18" y="14" width="11" height="9" rx="3" fill="#13BFD9" />
      <rect x="35" y="14" width="11" height="9" rx="3" fill="#13BFD9" />

      <motion.circle
        cx="23"
        cy="18"
        r="2"
        fill="#111"
        animate={{ opacity: [1, 1, 0.25, 1] }}
        transition={{ repeat: Infinity, duration: isThinking ? 1.4 : 2.6, times: [0, 0.75, 0.86, 1] }}
      />
      <motion.circle
        cx="40"
        cy="18"
        r="2"
        fill="#111"
        animate={{ opacity: [1, 1, 0.25, 1] }}
        transition={{ repeat: Infinity, duration: isThinking ? 1.4 : 2.6, delay: 0.08, times: [0, 0.75, 0.86, 1] }}
      />

      <path
        d={isHappy ? 'M22 28 Q32 34 42 28' : 'M23 28 Q32 30 41 28'}
        stroke="#513C0A"
        strokeWidth="2"
        strokeLinecap="round"
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
      text: "Hi! 👋 Main aapka AI Fashion Assistant hoon. Aap style advice, outfit ideas, ya products ki images bolenge to main direct shop ke products yahin dikha dunga.",
      timestamp: new Date(),
      products: []
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState('idle')
  const [currentUser, setCurrentUser] = useState({ name: 'Guest', pic: '', email: '' })

  const messagesEndRef = useRef(null)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setIsMobileFullScreen(window.innerWidth < 480 && isOpen)
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

    loadUserProfile()
  }, [])

  const shouldShowProducts = (text) => {
    const lower = (text || '').toLowerCase()
    return IMAGE_KEYWORDS.some((word) => lower.includes(word))
  }

  const fetchProductsFromShop = async (query) => {
    try {
      const response = await axios.get(`${BASE_URL}/product`, { timeout: 12000 })
      const allProducts = Array.isArray(response.data) ? response.data : []
      const q = (query || '').toLowerCase()

      const scored = allProducts
        .map((raw) => normalizeProduct(raw))
        .filter(Boolean)
        .map((item) => {
          const bag = `${item.name} ${item.maincategory} ${item.subcategory}`.toLowerCase()
          let score = 0
          if (q && bag.includes(q)) score += 3
          q.split(' ').forEach((token) => {
            if (token && bag.includes(token)) score += 1
          })
          return { item, score }
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item)

      return scored.slice(0, 6)
    } catch {
      return []
    }
  }

  const chatContext = useMemo(() => {
    return `You are a premium but friendly fashion assistant for Eshopper.
- Speak naturally like a smart human assistant (clear, warm, not robotic).
- Use concise and helpful responses with practical outfit advice.
- If user asks for product images/items, acknowledge and guide briefly.
- Prefer simple Hinglish tone when user speaks Hinglish.
- Keep response under 5 lines.`
  }, [])

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
      const wantsProducts = shouldShowProducts(prompt)
      const productPromise = wantsProducts ? fetchProductsFromShop(prompt) : Promise.resolve([])

      const history = messages.map((msg) => ({
        role: msg.sender === 'bot' ? 'model' : 'user',
        text: msg.text
      }))

      const enhancedPrompt = `${chatContext}\nUser name: ${currentUser?.name || 'User'}\nUser query: ${prompt}`

      const aiResponse = await axios.post(
        `${BASE_URL}/api/chat`,
        {
          prompt: enhancedPrompt,
          history
        },
        { timeout: 20000 }
      )

      const responseText =
        aiResponse?.data?.text ||
        aiResponse?.data?.response ||
        aiResponse?.data?.message ||
        "Sure, main help karta hoon. Aap thoda specific batao kis type ka look chahiye."

      const inlineProducts = extractInlineProducts(responseText)
      const dbProducts = await productPromise

      const finalProducts = inlineProducts.length > 0 ? inlineProducts : dbProducts

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
      const wantsProducts = shouldShowProducts(prompt)
      const quickProducts = wantsProducts ? await fetchProductsFromShop(prompt) : []

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: wantsProducts
            ? 'Bilkul! Mainne shop se relevant products nikaal diye hain, aap niche cards dekh lo 👇'
            : 'Samajh gaya 👍 Main aapko better suggest karne ke liye ready hoon — color, occasion aur budget batao.',
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
    if (!isOpen) {
      setPosition({ x: 0, y: 0 })
    }
    setIsOpen((prev) => !prev)
  }

  return (
    <motion.div
      className="chatbot-wrapper"
      drag={!isOpen && !isMobileFullScreen}
      dragElastic={0.08}
      dragMomentum={false}
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e, info) => {
        setIsDragging(false)
        setPosition({ x: info.offset.x, y: info.offset.y })
      }}
      style={{ cursor: !isOpen && !isMobileFullScreen ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
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
                  <h4>AI Fashion Consultant</h4>
                  <span>Online • Human-like Assistant</span>
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
                placeholder="Ask styles, product images, outfit ideas..."
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
          z-index: 980;
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
          position: absolute;
          right: 0;
          bottom: 88px;
          width: min(390px, 92vw);
          height: min(560px, calc(100vh - 130px));
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
            width: min(360px, 94vw);
            height: min(520px, calc(100vh - 120px));
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
