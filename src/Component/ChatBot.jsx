import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2, Sparkles, GripVertical, Star, ShoppingBag } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'

// ===== PREMIUM ANIMATED ROBOT WITH HIGHLIGHTS & SHADOWS =====
const PremiumRobotIcon = ({ emotion = 'neutral' }) => {
    return (
        <svg width="64" height="72" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="bodyGradPrem" cx="40%" cy="40%">
                    <stop offset="0%" stopColor="#FFFF99"/>
                    <stop offset="70%" stopColor="#FFE55C"/>
                    <stop offset="100%" stopColor="#E6C200"/>
                </radialGradient>
                <linearGradient id="highlight1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
                </linearGradient>
                <filter id="premiumShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feOffset dx="0" dy="4" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="offsetblur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <filter id="glowEffect">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* PREMIUM HEAD with gradient and shadow */}
            <circle cx="32" cy="20" r="16" fill="url(#bodyGradPrem)" stroke="#D4AF37" strokeWidth="2" filter="url(#premiumShadow)"/>
            
            {/* Highlight on head */}
            <ellipse cx="24" cy="12" rx="6" ry="8" fill="url(#highlight1)" opacity="0.8"/>
            
            {/* PREMIUM EYES with shadows */}
            <g>
                <rect x="20" y="14" width="8" height="8" rx="2" fill="#00D9FF" stroke="#0099CC" strokeWidth="1" filter="url(#premiumShadow)"/>
                <ellipse cx="23" cy="17" rx="2.5" ry="3" fill="#000"/>
                <circle cx="21" cy="15" r="1.5" fill="white" opacity="0.7"/>
            </g>

            <g>
                <rect x="36" y="14" width="8" height="8" rx="2" fill="#00D9FF" stroke="#0099CC" strokeWidth="1" filter="url(#premiumShadow)"/>
                <ellipse cx="39" cy="17" rx="2.5" ry="3" fill="#000"/>
                <circle cx="37" cy="15" r="1.5" fill="white" opacity="0.7"/>
            </g>

            {/* MOUTH with premium styling */}
            <path d="M 24 26 Q 32 28 40 26" stroke="#D4AF37" strokeWidth="2.5" fill="none" strokeLinecap="round" filter="url(#premiumShadow)"/>

            {/* PREMIUM BODY with gradient */}
            <rect x="14" y="38" width="36" height="26" rx="4" fill="url(#bodyGradPrem)" stroke="#D4AF37" strokeWidth="2" filter="url(#premiumShadow)"/>
            
            {/* Highlight on body */}
            <rect x="16" y="40" width="30" height="8" rx="3" fill="url(#highlight1)" opacity="0.6"/>

            {/* PREMIUM CHEST PLATE */}
            <g filter="url(#premiumShadow)">
                <rect x="20" y="48" width="24" height="14" rx="3" fill="none" stroke="#00D9FF" strokeWidth="2"/>
                <motion.circle cx="32" cy="55" r="4" fill="none" stroke="#00D9FF" strokeWidth="1.5"
                    animate={{ r: [4, 5.5, 4], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                />
            </g>

            {/* LEFT ARM - Waving Premium */}
            <motion.g
                animate={{ rotate: [0, -35, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                style={{ transformOrigin: '14px 45px' }}
                filter="url(#premiumShadow)"
            >
                <rect x="8" y="42" width="7" height="16" rx="3" fill="url(#bodyGradPrem)" stroke="#D4AF37" strokeWidth="1.5"/>
                <ellipse cx="8" cy="60" rx="3" ry="4" fill="url(#bodyGradPrem)" stroke="#D4AF37" strokeWidth="1.5"/>
            </motion.g>

            {/* RIGHT ARM - Floating Premium */}
            <motion.g
                animate={{ translateY: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                filter="url(#premiumShadow)"
            >
                <rect x="49" y="42" width="7" height="16" rx="3" fill="url(#bodyGradPrem)" stroke="#D4AF37" strokeWidth="1.5"/>
                <ellipse cx="56" cy="60" rx="3" ry="4" fill="url(#bodyGradPrem)" stroke="#D4AF37" strokeWidth="1.5"/>
            </motion.g>

            {/* PREMIUM ANTENNAE */}
            <g filter="url(#premiumShadow)">
                <motion.g
                    animate={{ rotate: [0, -20, 20, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    style={{ transformOrigin: '22px 38px' }}
                >
                    <line x1="22" y1="38" x2="22" y2="22" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="22" cy="20" r="2.5" fill="#FFD700" stroke="#D4AF37" strokeWidth="1"/>
                </motion.g>

                <motion.g
                    animate={{ rotate: [0, 20, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.3 }}
                    style={{ transformOrigin: '42px 38px' }}
                >
                    <line x1="42" y1="38" x2="42" y2="22" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="42" cy="20" r="2.5" fill="#FFD700" stroke="#D4AF37" strokeWidth="1"/>
                </motion.g>
            </g>
        </svg>
    )
}

// ===== BOT PROFILE COMPONENT =====
const BotProfile = () => (
    <div className="profile-card bot-profile">
        <div className="profile-avatar bot-profile-avatar">
            🤖
        </div>
        <div className="profile-info">
            <h5 className="profile-name">AI Fashion Expert</h5>
            <p className="profile-status">Online • Always Ready</p>
        </div>
    </div>
)

// ===== USER PROFILE COMPONENT =====
const UserProfile = ({ user }) => (
    <div className="profile-card user-profile">
        <div className="profile-avatar user-profile-avatar">
            {user?.avatar || user?.name?.charAt(0) || '👤'}
        </div>
        <div className="profile-info">
            <h5 className="profile-name">{user?.name || 'Guest'}</h5>
            <p className="profile-status">{user?.email || 'Member'}</p>
        </div>
    </div>
)

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hey! 👋 I'm your AI Fashion Consultant. Ask me about styles, get product recommendations, or request images of items you're interested in. What can I help you with?",
            sender: "bot",
            timestamp: new Date(),
            products: []
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [loading, setLoading] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 480)
    const [isMobileFullScreen, setIsMobileFullScreen] = useState(window.innerWidth < 480)
    const messagesEndRef = useRef(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [userLoading, setUserLoading] = useState(true)
    const [fetchingProducts, setFetchingProducts] = useState(false)

    // Fetch user profile on mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const userSession = localStorage.getItem('userSession')
                if (userSession) {
                    const user = JSON.parse(userSession)
                    setCurrentUser(user)
                } else {
                    // Try API
                    try {
                        const response = await axios.get(`${BASE_URL}/api/user`, { timeout: 5000 })
                        if (response.data) {
                            setCurrentUser(response.data)
                        }
                    } catch {
                        // Set default user if fetch fails
                        setCurrentUser({
                            name: 'Guest',
                            email: 'user@eshopper.com',
                            avatar: '👤'
                        })
                    }
                }
            } catch (err) {
                console.error('User fetch error:', err)
                setCurrentUser({
                    name: 'Guest',
                    email: 'user@eshopper.com',
                    avatar: '👤'
                })
            } finally {
                setUserLoading(false)
            }
        }

        fetchUserProfile()
    }, [])

    // Handle screen resize
    useEffect(() => {
        const handleResize = () => {
            const isMobileNow = window.innerWidth < 480
            setIsMobile(isMobileNow)
            setIsMobileFullScreen(isMobileNow && isOpen)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [isOpen])

    // Auto-scroll to latest message
    useEffect(() => {
        const scrollTimer = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
        return () => clearTimeout(scrollTimer)
    }, [messages, loading])

    // Check if user is asking for products/images
    const isProductRequest = (text) => {
        const productKeywords = ['image', 'images', 'show me', 'product', 'products', 'item', 'items', 'photo', 'photos', 'picture', 'pictures', 'dress', 'shirt', 'pant', 'jacket', 'collection']
        return productKeywords.some(keyword => text.toLowerCase().includes(keyword))
    }

    // Fetch products from database/shop
    const fetchProductsFromShop = async (query = '') => {
        try {
            setFetchingProducts(true)
            const response = await axios.get(`${BASE_URL}/api/products`, {
                params: { query: query || 'featured', limit: 6 },
                timeout: 8000
            })
            return response.data.products || []
        } catch (err) {
            console.error('Product fetch error:', err)
            return []
        } finally {
            setFetchingProducts(false)
        }
    }

    // Extract products from AI response
    const extractProducts = (text) => {
        const productMatches = text.match(/\[PRODUCT:(.*?)\]/g) || []
        return productMatches.map(match => {
            const content = match.replace(/\[PRODUCT:(.*?)\]/g, '$1')
            try {
                return JSON.parse(content)
            } catch {
                return null
            }
        }).filter(Boolean)
    }

    // Handle sending messages
    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!inputValue.trim() || loading) return

        const userMessage = {
            id: Date.now(),
            text: inputValue,
            sender: "user",
            timestamp: new Date(),
            products: []
        }

        setMessages(prev => [...prev, userMessage])
        const userPrompt = inputValue
        setInputValue('')
        setLoading(true)

        try {
            // Check if user is asking for products/images
            const needsProducts = isProductRequest(userPrompt)
            let productsFromShop = []
            
            if (needsProducts) {
                productsFromShop = await fetchProductsFromShop(userPrompt)
            }

            const conversationHistory = messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }))

            const response = await axios.post(`${BASE_URL}/api/chat`, {
                message: userPrompt,
                conversationHistory: conversationHistory,
                includeProducts: needsProducts
            }, {
                timeout: 15000
            })

            const responseText = response.data.response || response.data.message || "Let me help you with that!"
            const products = extractProducts(responseText)
            
            // If user asked for products and none found in response, use fetched ones
            const finalProducts = products.length > 0 ? products : (needsProducts ? productsFromShop : [])

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: responseText,
                sender: "bot",
                timestamp: new Date(),
                products: finalProducts
            }])
        } catch (err) {
            console.error('Chat error:', err)
            const errorMessage = "Let me get that for you! One moment..."

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: errorMessage,
                sender: "bot",
                timestamp: new Date(),
                products: []
            }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div 
            className="chatbot-master-wrapper"
            drag={!isMobileFullScreen}
            dragElastic={0.05}
            dragMomentum={false}
            initial={{ x: position.x, y: position.y }}
            animate={{ x: position.x, y: position.y }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(e, info) => {
                setIsDragging(false)
                setPosition({ x: info.offset.x, y: info.offset.y })
            }}
            style={{ cursor: isDragging && !isMobileFullScreen ? 'grabbing' : 'grab' }}
        >
            {/* GRIP HANDLE */}
            {!isMobileFullScreen && !isOpen && (
                <motion.div 
                    className="grip-handle"
                    whileHover={{ opacity: 1, scale: 1.15 }}
                    initial={{ opacity: 0.6 }}
                    title="Drag to move"
                >
                    <GripVertical size={13} color="#FFD700" />
                </motion.div>
            )}

            {/* ROBOT BUTTON */}
            <motion.button
                onClick={() => !isMobileFullScreen && setIsOpen(!isOpen)}
                className={`chatbot-bubble ${isOpen ? 'active' : ''} ${isMobileFullScreen ? 'hidden' : ''}`}
                whileHover={{ scale: 1.18, boxShadow: "0 0 120px rgba(255, 215, 0, 0.9)" }}
                whileTap={{ scale: 0.92 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                disabled={isMobileFullScreen}
            >
                <AnimatePresence mode="wait">
                    {isOpen && isMobileFullScreen ? null : (
                        <motion.div key="robot" className="robot-container">
                            <PremiumRobotIcon />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* CHAT WINDOW */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`chatbot-card ${isMobileFullScreen ? 'fullscreen' : ''}`}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    >
                        {/* HEADER */}
                        <div className="chat-header">
                            <div className="header-info">
                                <motion.div 
                                    className="status-indicator"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                                <div className="header-text">
                                    <h4>AI Fashion Consultant</h4>
                                    <span className="status-label">🟢 Online & Ready</span>
                                </div>
                            </div>
                            <motion.button
                                onClick={() => {
                                    setIsOpen(false)
                                    setPosition({ x: 0, y: 0 })
                                }}
                                className="close-btn"
                                whileHover={{ rotate: 90, scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* MESSAGES */}
                        <div className="chat-body">
                            {messages.map((msg) => (
                                <motion.div 
                                    key={msg.id} 
                                    className={`msg-wrapper msg-${msg.sender}`}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 }}
                                >
                                    {msg.sender === 'bot' && (
                                        <BotProfile />
                                    )}

                                    <div className="msg-container">
                                        <motion.div 
                                            className={`msg-bubble msg-bubble-${msg.sender}`}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            {msg.text}
                                        </motion.div>

                                        {msg.products && msg.products.length > 0 && (
                                            <motion.div 
                                                className="products-section"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div className="products-grid-premium">
                                                    {msg.products.map((product, idx) => (
                                                        <motion.div 
                                                            key={idx}
                                                            className="product-card-premium"
                                                            whileHover={{ y: -8, scale: 1.06 }}
                                                            initial={{ opacity: 0, scale: 0.7 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.08 }}
                                                        >
                                                            {product.image && (
                                                                <div className="product-image-wrapper">
                                                                    <img src={product.image} alt={product.name} className="product-image-premium"/>
                                                                    <div className="product-badge">
                                                                        <Star size={14} fill="#FFD700" stroke="#FFD700"/>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="product-info-premium">
                                                                <h6 className="product-name-premium">{product.name}</h6>
                                                                {product.price && (
                                                                    <p className="product-price-premium">
                                                                        <Sparkles size={11} className="price-icon"/> ₹{product.price}
                                                                    </p>
                                                                )}
                                                                {product.link && (
                                                                    <a href={product.link} target="_blank" rel="noopener noreferrer" 
                                                                       className="product-btn-premium">
                                                                        <ShoppingBag size={12}/> View
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        <span className="msg-timestamp">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {msg.sender === 'user' && currentUser && (
                                        <UserProfile user={currentUser} />
                                    )}
                                </motion.div>
                            ))}
                            
                            {(loading || fetchingProducts) && (
                                <motion.div 
                                    className="msg-wrapper msg-bot"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <BotProfile />
                                    <div className="thinking-loader">
                                        <motion.span animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                                        <motion.span animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} />
                                        <motion.span animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                                    </div>
                                </motion.div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* FOOTER */}
                        <form onSubmit={handleSendMessage} className="chat-footer">
                            <input
                                type="text"
                                placeholder="Ask about styles, see products, get recommendations..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={loading || fetchingProducts}
                                maxLength={500}
                                className="chat-input"
                            />
                            <motion.button 
                                type="submit" 
                                disabled={!inputValue.trim() || loading}
                                whileHover={{ scale: 1.15, rotate: 15 }}
                                whileTap={{ scale: 0.85 }}
                                className="send-btn"
                            >
                                {loading || fetchingProducts ? (
                                    <Loader2 size={18} className="spin-icon" />
                                ) : (
                                    <Send size={18} />
                                )}
                            </motion.button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                /* MASTER WRAPPER */
                .chatbot-master-wrapper { 
                    position: fixed; bottom: 32px; right: 32px; z-index: 9999; 
                    font-family: 'Inter', '-apple-system', 'Segoe UI', sans-serif;
                    display: flex; align-items: flex-end; gap: 14px;
                }

                .grip-handle {
                    position: absolute; bottom: 92px; left: 50%; transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.88); padding: 9px; border-radius: 22px;
                    border: 2px solid #FFD700; opacity: 0.7; cursor: grab;
                    box-shadow: 
                        0 6px 20px rgba(0, 0, 0, 0.4),
                        0 0 20px rgba(255, 215, 0, 0.3);
                    transition: all 0.3s ease;
                }

                .grip-handle:hover {
                    opacity: 1; 
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.5);
                }

                /* PREMIUM ROBOT BUBBLE */
                .chatbot-bubble {
                    width: 80px; height: 80px; border-radius: 50%; 
                    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 50%, #000 100%);
                    border: 3px solid #FFD700;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; 
                    color: #FFD700; padding: 0; outline: none;
                    box-shadow: 
                        0 0 60px rgba(255, 215, 0, 0.6),
                        0 0 120px rgba(255, 215, 0, 0.3),
                        0 20px 60px rgba(0, 0, 0, 0.8),
                        inset 0 2px 5px rgba(255, 255, 255, 0.15),
                        inset 0 -2px 5px rgba(0, 0, 0, 0.5);
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                    animation: premiumBubbleGlow 3.5s ease-in-out infinite;
                    flex-shrink: 0;
                }

                @keyframes premiumBubbleGlow {
                    0%, 100% { 
                        box-shadow: 0 0 60px rgba(255, 215, 0, 0.6), 0 0 120px rgba(255, 215, 0, 0.3), 0 20px 60px rgba(0, 0, 0, 0.8), inset 0 2px 5px rgba(255, 255, 255, 0.15), inset 0 -2px 5px rgba(0, 0, 0, 0.5);
                    }
                    50% { 
                        box-shadow: 0 0 90px rgba(255, 215, 0, 0.9), 0 0 180px rgba(255, 215, 0, 0.5), 0 30px 80px rgba(0, 0, 0, 1), inset 0 3px 8px rgba(255, 255, 255, 0.2), inset 0 -3px 8px rgba(0, 0, 0, 0.6);
                    }
                }

                .chatbot-bubble:hover:not(:disabled) {
                    transform: translateY(-15px) scale(1.22);
                    box-shadow: 
                        0 0 120px rgba(255, 215, 0, 1),
                        0 0 200px rgba(255, 215, 0, 0.7),
                        0 35px 100px rgba(0, 0, 0, 1),
                        inset 0 3px 8px rgba(255, 255, 255, 0.25),
                        inset 0 -3px 8px rgba(0, 0, 0, 0.7);
                }

                .chatbot-bubble:active:not(:disabled) {
                    transform: scale(0.88);
                }

                .chatbot-bubble.active {
                    background: linear-gradient(135deg, #2a2a2a 0%, #151515 100%);
                }

                .robot-container {
                    animation: robotPremiumFloat 3.2s ease-in-out infinite;
                }

                @keyframes robotPremiumFloat {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-8px) scale(1.08); }
                }

                /* CHAT CARD */
                .chatbot-card {
                    position: absolute; bottom: 100px; right: 0; 
                    width: 400px; 
                    height: 580px;
                    background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
                    border-radius: 40px; display: flex; flex-direction: column;
                    overflow: hidden; 
                    border: 2.5px solid rgba(255, 215, 0, 0.5);
                    box-shadow: 
                        0 0 100px rgba(255, 215, 0, 0.25),
                        0 40px 120px rgba(0, 0, 0, 0.4),
                        inset 0 1px 1px rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(12px);
                    touch-action: auto;
                }

                .chatbot-card.fullscreen {
                    position: fixed !important; 
                    width: 96vw; height: 85vh;
                    bottom: 16px !important; right: 2% !important; left: 2%;
                    border-radius: 32px;
                }

                /* HEADER */
                .chat-header {
                    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                    color: white; 
                    padding: 22px 26px; 
                    display: flex; justify-content: space-between; align-items: center; 
                    border-bottom: 3px solid rgba(255, 215, 0, 0.5);
                    position: relative;
                    overflow: hidden;
                    flex-shrink: 0;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
                }

                .chat-header::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5), transparent);
                }

                .header-info { display: flex; align-items: center; gap: 14px; flex: 1; }
                
                .status-indicator { 
                    width: 13px; height: 13px; background: #00D9FF; border-radius: 50%; 
                    box-shadow: 0 0 15px #00D9FF, 0 0 30px rgba(0, 217, 255, 0.5), inset 0 1px 3px rgba(255, 255, 255, 0.3);
                    flex-shrink: 0;
                    border: 1px solid rgba(0, 217, 255, 0.5);
                }

                .header-text { display: flex; flex-direction: column; gap: 4px; }
                .header-info h4 { margin: 0; font-size: 15px; font-weight: 900; letter-spacing: -0.3px; color: #FFF; }
                .status-label { 
                    font-size: 10px; color: #00D9FF; text-transform: uppercase; 
                    letter-spacing: 1.2px; font-weight: 800;
                }

                .close-btn {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.08));
                    border: 1.5px solid rgba(255, 215, 0, 0.4);
                    color: #FFD700; cursor: pointer; padding: 7px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .close-btn:hover {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.15));
                    border-color: rgba(255, 215, 0, 0.6);
                    box-shadow: 0 0 25px rgba(255, 215, 0, 0.4);
                }

                /* CHAT BODY */
                .chat-body { 
                    flex: 1; overflow-y: auto; overflow-x: hidden; padding: 16px 14px; 
                    background: linear-gradient(to bottom, #FAFAFA 0%, #F8F8F8 100%);
                    display: flex; flex-direction: column; gap: 12px;
                }

                .chat-body::-webkit-scrollbar { width: 8px; }
                .chat-body::-webkit-scrollbar-track { background: rgba(255, 215, 0, 0.05); border-radius: 10px; }
                .chat-body::-webkit-scrollbar-thumb { 
                    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
                    border-radius: 10px; 
                    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
                }

                /* MESSAGE WRAPPERS */
                .msg-wrapper {
                    display: flex;
                    gap: 10px;
                    align-items: flex-end;
                    animation: msgSlideIn 0.35s ease;
                }

                .msg-wrapper.msg-user {
                    justify-content: flex-end;
                    flex-direction: row-reverse;
                }

                @keyframes msgSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

                /* PROFILE CARDS */
                .profile-card {
                    display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 6px 10px;
                    border-radius: 12px; background: rgba(255, 215, 0, 0.05); border: 1px solid rgba(255, 215, 0, 0.15);
                }

                .bot-profile {
                    background: linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(255, 215, 0, 0.05));
                    border-color: rgba(0, 217, 255, 0.2);
                }

                .user-profile {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.08));
                    border-color: rgba(255, 215, 0, 0.3);
                }

                .profile-avatar {
                    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-size: 14px; flex-shrink: 0; border: 1.5px solid rgba(255, 215, 0, 0.3);
                    background: rgba(255, 255, 255, 0.5);
                }

                .bot-profile-avatar {
                    box-shadow: 0 0 12px rgba(0, 217, 255, 0.3);
                }

                .user-profile-avatar {
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
                }

                .profile-info { display: flex; flex-direction: column; gap: 2px; }
                .profile-name { margin: 0; font-weight: 700; color: #111; font-size: 11px; }
                .profile-status { margin: 0; font-size: 9px; color: #999; }

                .msg-container {
                    display: flex; flex-direction: column; gap: 6px; max-width: 300px;
                }

                .msg-wrapper.msg-user .msg-container { max-width: calc(100% - 38px); }

                /* MESSAGE BUBBLES */
                .msg-bubble { 
                    padding: 12px 15px; border-radius: 16px; font-size: 13px; 
                    line-height: 1.6; transition: all 0.3s ease;
                    cursor: default; font-weight: 500;
                    word-wrap: break-word;
                    word-break: break-word;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .msg-bubble-user { 
                    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
                    color: #FFE55C; border-bottom-right-radius: 4px;
                    box-shadow: 
                        0 6px 16px rgba(0, 0, 0, 0.25),
                        inset 0 1px 2px rgba(255, 255, 255, 0.1);
                    font-weight: 600;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                }

                .msg-bubble-user:hover {
                    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.15);
                    border-color: rgba(255, 215, 0, 0.5);
                    transform: translateY(-2px);
                }

                .msg-bubble-bot { 
                    background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
                    color: #222; 
                    border: 1.5px solid rgba(255, 215, 0, 0.3); 
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.8);
                }

                .msg-bubble-bot:hover {
                    border-color: rgba(255, 215, 0, 0.5);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.9);
                    transform: translateY(-2px);
                }

                .msg-timestamp { 
                    font-size: 9px; color: #AAA; 
                    margin-left: 8px;
                    letter-spacing: 0.3px; 
                }

                /* THINKING DOTS */
                .thinking-loader {
                    display: flex; gap: 6px; align-items: center;
                    padding: 11px 14px;
                    background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
                    border: 1.5px solid rgba(255, 215, 0, 0.3);
                    border-radius: 16px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .thinking-loader span { 
                    width: 8px; height: 8px; background: linear-gradient(135deg, #FFD700, #FFA500);
                    display: inline-block; border-radius: 50%; 
                    box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
                }

                /* PRODUCTS PREMIUM DISPLAY */
                .products-section {
                    margin-top: 10px;
                }

                .products-grid-premium {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
                    gap: 12px;
                }

                .product-card-premium {
                    background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
                    border: 1.5px solid rgba(255, 215, 0, 0.3);
                    border-radius: 14px; overflow: hidden;
                    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: pointer; 
                    box-shadow: 
                        0 4px 12px rgba(0, 0, 0, 0.08),
                        inset 0 1px 2px rgba(255, 255, 255, 0.8);
                    display: flex; flex-direction: column; height: 100%;
                    position: relative;
                }

                .product-card-premium:hover {
                    border-color: rgba(255, 215, 0, 0.6);
                    box-shadow: 
                        0 12px 35px rgba(255, 215, 0, 0.3),
                        0 2px 8px rgba(0, 0, 0, 0.15),
                        inset 0 1px 2px rgba(255, 255, 255, 0.9);
                    background: linear-gradient(135deg, #FFFEF0 0%, #FFFFF5 100%);
                }

                .product-image-wrapper {
                    position: relative;
                    width: 100%;
                    height: 145px;
                    overflow: hidden;
                    background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
                }

                .product-image-premium {
                    width: 100%; height: 100%; object-fit: cover;
                    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .product-card-premium:hover .product-image-premium {
                    transform: scale(1.12) rotate(2deg);
                }

                .product-badge {
                    position: absolute; top: 8px; right: 8px;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    width: 28px; height: 28px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
                    border: 1.5px solid rgba(255, 255, 255, 0.6);
                }

                .product-info-premium { 
                    padding: 10px; display: flex; flex-direction: column; gap: 6px; flex: 1;
                    justify-content: space-between;
                }

                .product-name-premium {
                    font-size: 11px; font-weight: 800; color: #1a1a1a;
                    margin: 0; line-height: 1.35; display: -webkit-box;
                    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                }

                .product-price-premium {
                    font-size: 12px; color: #FFD700; font-weight: 900; margin: 0;
                    display: flex; align-items: center; gap: 4px;
                }

                .price-icon { width: 11px; height: 11px; }

                .product-btn-premium {
                    font-size: 9.5px; color: #FFD700; text-decoration: none;
                    padding: 6px 8px; border-radius: 7px;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.08));
                    text-align: center;
                    transition: all 0.25s ease;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    font-weight: 700;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 4px;
                }

                .product-btn-premium:hover {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.15));
                    border-color: rgba(255, 215, 0, 0.5);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(255, 215, 0, 0.25);
                }

                /* FOOTER */
                .chat-footer { 
                    padding: 14px 16px; border-top: 2px solid rgba(255, 215, 0, 0.3); 
                    display: flex; gap: 11px;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 215, 0, 0.02));
                    flex-shrink: 0;
                    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
                }

                .chat-input { 
                    flex: 1; border: 1.5px solid rgba(255, 215, 0, 0.3); border-radius: 50px; 
                    padding: 10px 16px; font-size: 13px; outline: none; 
                    background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
                    color: #222; font-weight: 500;
                    transition: all 0.35s ease;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.8);
                }

                .chat-input::placeholder { color: #BBB; font-weight: 500; }

                .chat-input:focus { 
                    border-color: #FFD700;
                    background: linear-gradient(135deg, #FFFEF0 0%, #FFFFF5 100%);
                    box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.9);
                    transform: scale(1.02);
                }

                .chat-input:disabled {
                    opacity: 0.5; cursor: not-allowed;
                }

                .send-btn { 
                    background: linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%);
                    color: #111; border: 1.5px solid #FFA500; width: 44px; height: 44px; border-radius: 50%; 
                    cursor: pointer; transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 
                        0 0 20px rgba(255, 215, 0, 0.5),
                        0 10px 25px rgba(255, 215, 0, 0.3),
                        inset 0 2px 5px rgba(255, 255, 255, 0.3),
                        inset 0 -2px 5px rgba(0, 0, 0, 0.2);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; padding: 0; outline: none; flex-shrink: 0;
                }

                .send-btn:hover:not(:disabled) { 
                    transform: translateY(-6px) scale(1.18);
                    box-shadow: 
                        0 0 50px rgba(255, 215, 0, 0.8),
                        0 20px 40px rgba(255, 215, 0, 0.5),
                        inset 0 2px 6px rgba(255, 255, 255, 0.4),
                        inset 0 -2px 6px rgba(0, 0, 0, 0.25);
                }

                .send-btn:active:not(:disabled) { transform: translateY(-2px) scale(1); }
                .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

                .spin-icon {
                    animation: spinRotate 1.2s linear infinite;
                }

                @keyframes spinRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* ===== RESPONSIVE ===== */
                @media (max-width: 1200px) {
                    .chatbot-bubble { width: 76px; height: 76px; }
                    .chatbot-card { width: 385px; height: 560px; }
                    .msg-container { max-width: 290px; }
                    .products-grid-premium { grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); }
                }

                @media (max-width: 768px) {
                    .chatbot-master-wrapper { bottom: 20px; right: 20px; }
                    .chatbot-bubble { width: 72px; height: 72px; }
                    .chatbot-card { 
                        width: 370px; 
                        height: 540px;
                        bottom: 90px;
                        border-radius: 36px;
                    }
                    .chat-header { padding: 18px 22px; }
                    .header-info h4 { font-size: 14px; }
                    .status-label { font-size: 9px; letter-spacing: 1px; }
                    .chat-body { padding: 13px 12px; gap: 10px; }
                    .msg-bubble { padding: 10px 14px; font-size: 12.5px; }
                    .msg-container { max-width: 270px; }
                    .chat-footer { padding: 12px 14px; gap: 10px; }
                    .chat-input { font-size: 12px; padding: 9px 14px; }
                    .send-btn { width: 40px; height: 40px; }
                    .products-grid-premium { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .product-card-premium { border-radius: 12px; }
                    .product-image-wrapper { height: 130px; }
                }

                @media (max-width: 640px) {
                    .chatbot-master-wrapper { bottom: 16px; right: 16px; }
                    .chatbot-bubble { width: 68px; height: 68px; }
                    .chatbot-card { 
                        width: 350px; 
                        height: 510px;
                        border-radius: 32px;
                    }
                    .msg-container { max-width: 260px; }
                    .msg-bubble { padding: 9px 13px; font-size: 12px; }
                }

                @media (max-width: 480px) {
                    .chatbot-master-wrapper { bottom: 12px; right: 12px; }
                    .chatbot-bubble { display: none; }
                    .chatbot-card { 
                        position: fixed !important; 
                        width: 96vw; height: 85vh;
                        bottom: 14px !important; right: 2% !important; left: 2%;
                        border-radius: 28px;
                    }
                    .chat-header { padding: 14px 16px; }
                    .header-info h4 { font-size: 13px; }
                    .status-label { font-size: 8px; letter-spacing: 0.8px; }
                    .chat-body { padding: 11px 10px; gap: 8px; }
                    .msg-wrapper { justify-content: flex-start; }
                    .msg-container { max-width: calc(100% - 36px); }
                    .msg-bubble { padding: 8px 12px; font-size: 11.5px; }
                    .chat-footer { padding: 11px 12px; }
                    .chat-input { font-size: 11px; padding: 8px 12px; }
                    .send-btn { width: 38px; height: 38px; }
                    .products-grid-premium { grid-template-columns: 1fr; gap: 9px; }
                    .product-image-wrapper { height: 120px; }
                    .profile-card { font-size: 11px; padding: 5px 8px; }
                    .profile-avatar { width: 26px; height: 26px; font-size: 13px; }
                }

                @media (max-height: 700px) and (orientation: landscape) {
                    .chatbot-card { height: max(88vh, 420px); }
                    .chat-body { gap: 8px; }
                    .msg-bubble { padding: 8px 12px; font-size: 11px; }
                }

                /* ACCESSIBILITY */
                .send-btn:focus-visible,
                .chatbot-bubble:focus-visible,
                .close-btn:focus-visible {
                    outline: 2px solid #FFD700;
                    outline-offset: -2px;
                }

                .chat-input:focus-visible { outline: none; }
            `}} />
        </motion.div>
    )
}
