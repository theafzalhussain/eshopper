import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2, Sparkles, GripVertical, Heart, Star, Zap } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'

// ===== ENHANCED ANIMATED ROBOT WITH EMOTIONS =====
const AnimatedRobotIcon = ({ emotion = 'neutral', isTyping = false }) => {
    const getEyeStyle = () => {
        switch(emotion) {
            case 'happy': return { happy: true }
            case 'thinking': return { thinking: true }
            case 'excited': return { excited: true }
            default: return { neutral: true }
        }
    }

    const eyeStyle = getEyeStyle()

    return (
        <svg width="56" height="64" viewBox="0 0 56 64" fill="none" xmlns="http://www.w3.org/2000/svg" 
             style={{ filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.5))' }}>
            <defs>
                <radialGradient id="bodyGrad" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#FFE55C"/>
                    <stop offset="100%" stopColor="#FFD700"/>
                </radialGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Head with gradient */}
            <circle cx="28" cy="16" r="12" fill="url(#bodyGrad)" stroke="#FFD700" strokeWidth="1.5" filter="url(#glow)"/>
            
            {/* Left Eye */}
            <g>
                <rect x="14" y="10" width="7" height="8" rx="2" fill="#00D9FF" opacity="0.8"/>
                {eyeStyle.happy && (
                    <path d="M 17 15 Q 17 16 17.5 16" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" 
                          style={{ animation: 'smile 2s ease-in-out infinite' }}/>
                )}
                {eyeStyle.thinking && (
                    <circle cx="17.5" cy="13.5" r="1" fill="#000" style={{ animation: 'think 2s ease-in-out infinite' }}/>
                )}
                {eyeStyle.excited && (
                    <circle cx="17" cy="13" r="1.5" fill="#000" style={{ animation: 'excited 1s ease-in-out infinite' }}/>
                )}
                {eyeStyle.neutral && (
                    <motion.circle cx="17" cy="13.5" r="1" fill="#000" 
                                  animate={{ opacity: [1, 1, 0.2, 1] }} 
                                  transition={{ repeat: Infinity, duration: 3 }}/>
                )}
            </g>

            {/* Right Eye */}
            <g>
                <rect x="35" y="10" width="7" height="8" rx="2" fill="#00D9FF" opacity="0.8"/>
                {eyeStyle.happy && (
                    <path d="M 38.5 15 Q 38.5 16 39 16" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"
                          style={{ animation: 'smile 2s ease-in-out infinite' }}/>
                )}
                {eyeStyle.thinking && (
                    <circle cx="38.5" cy="13.5" r="1" fill="#000" style={{ animation: 'think 2s ease-in-out infinite' }}/>
                )}
                {eyeStyle.excited && (
                    <circle cx="38.5" cy="13" r="1.5" fill="#000" style={{ animation: 'excited 1s ease-in-out infinite' }}/>
                )}
                {eyeStyle.neutral && (
                    <motion.circle cx="38.5" cy="13.5" r="1" fill="#000"
                                  animate={{ opacity: [1, 1, 0.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 3, delay: 0.1 }}/>
                )}
            </g>

            {/* Mouth */}
            <g>
                {emotion === 'happy' && (
                    <path d="M 18 20 Q 28 23 38 20" stroke="#FFD700" strokeWidth="2" fill="none" strokeLinecap="round"
                          style={{ animation: 'smileMouth 2s ease-in-out infinite' }}/>
                )}
                {emotion === 'thinking' && (
                    <circle cx="28" cy="21" r="1.5" fill="#FFD700" style={{ animation: 'thinkMouth 2s ease-in-out infinite' }}/>
                )}
                {emotion === 'excited' && (
                    <ellipse cx="28" cy="21" rx="2.5" ry="3" fill="#FFD700" style={{ animation: 'excitedMouth 1s ease-in-out infinite' }}/>
                )}
                {emotion === 'neutral' && (
                    <path d="M 18 21 L 38 21" stroke="#FFD700" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                )}
            </g>

            {/* Body */}
            <rect x="10" y="30" width="36" height="22" rx="4" fill="url(#bodyGrad)" stroke="#FFD700" strokeWidth="1.5" filter="url(#glow)"/>
            
            {/* Chest Plate */}
            <rect x="16" y="35" width="24" height="12" rx="3" fill="none" stroke="#00D9FF" strokeWidth="1" opacity="0.6"
                  style={{ animation: emotion === 'happy' ? 'pulseFast 1.5s ease-in-out infinite' : 'pulse 2s ease-in-out infinite' }}/>

            {/* Left Arm - Waving */}
            <motion.g 
                animate={{ rotate: [0, -40, 0] }} 
                transition={{ repeat: Infinity, duration: emotion === 'excited' ? 0.8 : 1.6, ease: "easeInOut" }}
                style={{ transformOrigin: '10px 38px' }}
            >
                <rect x="4" y="36" width="6" height="14" rx="2" fill={emotion === 'excited' ? '#FF6B6B' : '#FFD700'}/>
                <circle cx="4" cy="52" r="2.5" fill={emotion === 'excited' ? '#FF6B6B' : '#FFD700'}/>
            </motion.g>

            {/* Right Arm */}
            <motion.g 
                animate={{ translateY: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            >
                <rect x="46" y="36" width="6" height="14" rx="2" fill="#FFD700"/>
                <circle cx="52" cy="52" r="2.5" fill="#FFD700"/>
            </motion.g>

            {/* Antennae - Left */}
            <motion.g
                animate={{ rotate: [0, -15, 15, 0] }}
                transition={{ repeat: Infinity, duration: emotion === 'thinking' ? 2.5 : 1.8, ease: "easeInOut" }}
                style={{ transformOrigin: '18px 30px' }}
            >
                <line x1="18" y1="30" x2="18" y2="18" stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="18" cy="16" r="2" fill="#FFD700"/>
            </motion.g>

            {/* Antennae - Right */}
            <motion.g
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: emotion === 'thinking' ? 2.5 : 1.8, ease: "easeInOut", delay: 0.2 }}
                style={{ transformOrigin: '38px 30px' }}
            >
                <line x1="38" y1="30" x2="38" y2="18" stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="38" cy="16" r="2" fill="#FFD700"/>
            </motion.g>

            {/* Heart for Happy - Extra flair */}
            {emotion === 'happy' && (
                <motion.g
                    animate={{ y: [0, -8, 0], opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1] }}
                >
                    <path d="M 28 6 L 29 4 L 31 6 L 30 8 L 28 8 Z" fill="#FF69B4"/>
                </motion.g>
            )}

            <style>{`
                @keyframes smile { 0%, 100% { d: path("M 17 15 Q 17 16 17.5 16"); } 50% { d: path("M 17 15 Q 17 16.5 17.5 16.5"); } }
                @keyframes smileMouth { 0%, 100% { d: path("M 18 20 Q 28 23 38 20"); } }
                @keyframes think { 0%, 100% { cy: 13.5; } 50% { cy: 12.5; } }
                @keyframes thinkMouth { 0%, 100% { r: 1.5; } 50% { r: 2; } }
                @keyframes excited { 0%, 100% { r: 1.5; } 50% { r: 2.2; } }
                @keyframes excitedMouth { 0%, 100% { ry: 3; } 50% { ry: 4; } }
                @keyframes pulse { 0%, 100% { opacity: 0.4; stroke-width: 1; } 50% { opacity: 0.8; stroke-width: 1.5; } }
                @keyframes pulseFast { 0%, 100% { opacity: 0.6; stroke-width: 1; } 50% { opacity: 1; stroke-width: 2; } }
            `}</style>
        </svg>
    )
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "👋 Hey there! I'm your AI Fashion Consultant. Need styling tips or product recommendations? I'm here to help!",
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
    const [emotion, setEmotion] = useState('neutral')
    const [isTyping, setIsTyping] = useState(false)

    // Fetch user profile on mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                // Try to get user from localStorage or session
                const userSession = localStorage.getItem('userSession')
                if (userSession) {
                    const user = JSON.parse(userSession)
                    setCurrentUser(user)
                } else {
                    // Fallback: Try to fetch from backend
                    const response = await axios.get(`${BASE_URL}/api/user`, { timeout: 5000 })
                    if (response.data) {
                        setCurrentUser(response.data)
                    } else {
                        setCurrentUser({
                            name: 'Guest',
                            avatar: '👤',
                            id: Date.now()
                        })
                    }
                }
            } catch (err) {
                // Fallback user
                setCurrentUser({
                    name: 'Guest',
                    avatar: '👤',
                    id: Date.now()
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
            setIsMobile(window.innerWidth < 480)
            setIsMobileFullScreen(window.innerWidth < 480 && isOpen)
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

    // Detect emotion based on message content
    const detectEmotion = (response) => {
        const text = response.toLowerCase()
        if (text.includes('great') || text.includes('love') || text.includes('awesome') || text.includes('perfect')) {
            setEmotion('happy')
            setTimeout(() => setEmotion('neutral'), 3000)
        } else if (text.includes('think') || text.includes('hmm') || text.includes('consider')) {
            setEmotion('thinking')
            setTimeout(() => setEmotion('neutral'), 2500)
        } else if (text.includes('wow') || text.includes('amazing') || text.includes('incredible')) {
            setEmotion('excited')
            setTimeout(() => setEmotion('neutral'), 2500)
        }
    }

    // Extract products from AI response
    const extractProducts = (text) => {
        const productMatches = text.match(/\[PRODUCT:(.*?)\]/g) || []
        return productMatches.map(match => {
            const content = match.replace(/\[PRODUCT:(.*?)\]/g, '$1')
            const [name, price, image, link] = content.split('|').map(s => s.trim())
            return { name, price, image, link }
        })
    }

    // Handle sending messages
    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        // Add user message
        const userMessage = {
            id: Date.now(),
            text: inputValue,
            sender: "user",
            timestamp: new Date(),
            products: []
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setLoading(true)
        setEmotion('thinking')
        setIsTyping(true)

        try {
            const conversationHistory = messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }))

            const response = await axios.post(`${BASE_URL}/api/chat`, {
                message: inputValue,
                conversationHistory: conversationHistory
            }, {
                timeout: 15000
            })

            const responseText = response.data.response
            const products = extractProducts(responseText)
            
            detectEmotion(responseText)

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: responseText,
                sender: "bot",
                timestamp: new Date(),
                products: products
            }])
        } catch (err) {
            console.error('Chat error:', err)
            const errorMessage = err.response?.data?.message || "I'm temporarily adjusting. Try again in a moment! 🔧"
            setEmotion('neutral')
            
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: errorMessage,
                sender: "bot",
                timestamp: new Date(),
                products: []
            }])
        } finally {
            setLoading(false)
            setIsTyping(false)
            setEmotion('neutral')
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
                const newX = info.offset.x
                const newY = info.offset.y
                setPosition({ x: newX, y: newY })
            }}
            style={{ cursor: isDragging && !isMobileFullScreen ? 'grabbing' : 'grab' }}
        >
            {/* GRIP HANDLE */}
            {!isMobileFullScreen && !isOpen && (
                <motion.div 
                    className="grip-handle"
                    whileHover={{ opacity: 1, scale: 1.1 }}
                    initial={{ opacity: 0.6 }}
                    title="Drag me"
                >
                    <GripVertical size={12} color="#FFD700" />
                </motion.div>
            )}

            {/* ANIMATED ROBOT BUTTON */}
            <motion.button
                onClick={() => {
                    if (!isMobileFullScreen) setIsOpen(!isOpen)
                }}
                className={`chatbot-bubble ${isOpen ? 'active' : ''} ${isMobileFullScreen ? 'hidden' : ''}`}
                whileHover={{ scale: !isMobileFullScreen ? 1.15 : 1 }}
                whileTap={{ scale: !isMobileFullScreen ? 0.92 : 1 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                disabled={isMobileFullScreen}
                title="Fashion AI Assistant"
            >
                <AnimatePresence mode="wait">
                    {isOpen && isMobileFullScreen ? null : (
                        <motion.div key="bot" className="robot-container">
                            <AnimatedRobotIcon emotion={emotion} isTyping={isTyping} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* PREMIUM CHAT WINDOW */}
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
                                    <span className="status-badge">🟢 Available</span>
                                </div>
                            </div>
                            <motion.button
                                onClick={() => {
                                    setIsOpen(false)
                                    setPosition({ x: 0, y: 0 })
                                }}
                                className="close-btn"
                                whileHover={{ rotate: 90, scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* CHAT MESSAGES */}
                        <div className="chat-body">
                            {messages.map((msg) => (
                                <motion.div 
                                    key={msg.id} 
                                    className={`msg-row msg-${msg.sender}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                >
                                    {msg.sender === 'bot' && (
                                        <div className="msg-avatar bot-avatar">
                                            {emotion && msg === messages[messages.length - 1] ? 
                                                <span className="robot-emoji">🤖</span> : 
                                                <span>🤖</span>
                                            }
                                        </div>
                                    )}
                                    
                                    <div className="msg-content">
                                        <motion.div 
                                            className={`msg-bubble msg-bubble-${msg.sender}`}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            {msg.text}
                                        </motion.div>

                                        {msg.products && msg.products.length > 0 && (
                                            <motion.div 
                                                className="products-showcase"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                {msg.products.map((product, idx) => (
                                                    <motion.div 
                                                        key={idx} 
                                                        className="product-card-enhanced"
                                                        whileHover={{ y: -8, scale: 1.05 }}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                    >
                                                        {product.image && (
                                                            <div className="product-img-wrapper">
                                                                <img src={product.image} alt={product.name} className="product-image"/>
                                                                <div className="product-overlay">
                                                                    <Star size={18} fill="#FFD700" color="#FFD700"/>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="product-details">
                                                            <h5 className="product-name">{product.name}</h5>
                                                            {product.price && (
                                                                <p className="product-price">
                                                                    <Sparkles size={12} className="inline-icon"/> {product.price}
                                                                </p>
                                                            )}
                                                            {product.link && (
                                                                <a href={product.link} target="_blank" rel="noopener noreferrer" 
                                                                   className="product-link">
                                                                    View Details ➜
                                                                </a>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}

                                        <span className="msg-time">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {msg.sender === 'user' && currentUser && (
                                        <div className="msg-avatar user-avatar" title={currentUser.name}>
                                            <span>{currentUser.avatar || currentUser.name?.charAt(0) || '👤'}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            
                            {loading && (
                                <motion.div 
                                    className="msg-row msg-bot"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="msg-avatar bot-avatar">
                                        <span>🤖</span>
                                    </div>
                                    <div className="thinking-dots">
                                        <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                                        <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} />
                                        <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                                    </div>
                                </motion.div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT FOOTER */}
                        <form onSubmit={handleSendMessage} className="chat-footer">
                            <input
                                type="text"
                                placeholder="Ask about trends, styles, or products..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={loading}
                                maxLength={500}
                            />
                            <motion.button 
                                type="submit" 
                                disabled={!inputValue.trim() || loading}
                                whileHover={{ scale: 1.12, rotate: 15 }}
                                whileTap={{ scale: 0.88 }}
                                title="Send (Enter)"
                            >
                                {loading ? (
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
                    display: flex; align-items: flex-end; gap: 12px;
                }

                .grip-handle {
                    position: absolute; bottom: 90px; left: 50%; transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.85); padding: 8px; border-radius: 20px;
                    border: 2px solid #FFD700; opacity: 0.7; cursor: grab;
                    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
                    transition: all 0.3s ease;
                }

                .grip-handle:hover {
                    opacity: 1; box-shadow: 0 6px 30px rgba(255, 215, 0, 0.5);
                }

                /* CHATBOT BUBBLE */
                .chatbot-bubble {
                    width: 76px; height: 76px; border-radius: 50%; 
                    background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
                    border: 2.5px solid #FFD700;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; 
                    color: #FFD700; padding: 0; outline: none;
                    box-shadow: 
                        0 0 50px rgba(255, 215, 0, 0.5),
                        0 0 100px rgba(255, 215, 0, 0.25),
                        0 15px 50px rgba(0, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                    animation: bubbleGlow 3s ease-in-out infinite;
                    flex-shrink: 0;
                }

                @keyframes bubbleGlow {
                    0%, 100% { 
                        box-shadow: 0 0 50px rgba(255, 215, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.25), 0 15px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    }
                    50% { 
                        box-shadow: 0 0 80px rgba(255, 215, 0, 0.8), 0 0 150px rgba(255, 215, 0, 0.4), 0 15px 70px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                    }
                }

                .chatbot-bubble:hover:not(:disabled) {
                    transform: translateY(-12px) scale(1.18);
                    box-shadow: 
                        0 0 100px rgba(255, 215, 0, 1),
                        0 0 150px rgba(255, 215, 0, 0.6),
                        0 25px 80px rgba(0, 0, 0, 0.8),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
                }

                .chatbot-bubble:active:not(:disabled) {
                    transform: scale(0.92);
                }

                .chatbot-bubble.active {
                    background: linear-gradient(135deg, #333 0%, #1a1a1a 100%);
                }

                .chatbot-bubble.hidden {
                    display: none !important;
                }

                .robot-container {
                    animation: robotFloat 3s ease-in-out infinite;
                }

                @keyframes robotFloat {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-6px) scale(1.05); }
                }

                /* CHAT CARD */
                .chatbot-card {
                    position: absolute; bottom: 95px; right: 0; 
                    width: 390px; 
                    height: 560px;
                    background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
                    border-radius: 36px; display: flex; flex-direction: column;
                    overflow: hidden; 
                    border: 2px solid rgba(255, 215, 0, 0.4);
                    box-shadow: 
                        0 0 80px rgba(255, 215, 0, 0.15),
                        0 30px 100px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(10px);
                    touch-action: auto;
                }

                .chatbot-card.fullscreen {
                    position: fixed !important; 
                    width: 96vw; height: 84vh;
                    bottom: 18px !important; right: 2% !important; left: 2%;
                    border-radius: 28px;
                }

                /* HEADER */
                .chat-header {
                    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                    color: white; 
                    padding: 20px 24px; 
                    display: flex; justify-content: space-between; align-items: center; 
                    border-bottom: 2.5px solid rgba(255, 215, 0, 0.4);
                    position: relative;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .chat-header::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.4), transparent);
                }

                .header-info { display: flex; align-items: center; gap: 12px; flex: 1; }
                
                .status-indicator { 
                    width: 12px; height: 12px; background: #00D9FF; border-radius: 50%; 
                    box-shadow: 0 0 12px #00D9FF, 0 0 25px rgba(0, 217, 255, 0.4);
                    flex-shrink: 0;
                }

                .header-text { display: flex; flex-direction: column; gap: 3px; }
                .header-info h4 { margin: 0; font-size: 14px; font-weight: 800; letter-spacing: -0.2px; }
                .status-badge { 
                    font-size: 9px; color: #00D9FF; text-transform: uppercase; 
                    letter-spacing: 1px; font-weight: 700;
                }

                .close-btn {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05));
                    border: 1.5px solid rgba(255, 215, 0, 0.3);
                    color: #FFD700; cursor: pointer; padding: 6px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                }

                .close-btn:hover {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1));
                    border-color: rgba(255, 215, 0, 0.5);
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
                }

                /* CHAT BODY */
                .chat-body { 
                    flex: 1; overflow-y: auto; overflow-x: hidden; padding: 18px; 
                    background: linear-gradient(to bottom, #FAFAFA 0%, #F8F8F8 100%);
                    display: flex; flex-direction: column; gap: 12px;
                }

                .chat-body::-webkit-scrollbar { width: 7px; }
                .chat-body::-webkit-scrollbar-track { background: rgba(255, 215, 0, 0.05); border-radius: 10px; }
                .chat-body::-webkit-scrollbar-thumb { 
                    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
                    border-radius: 10px; box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
                }

                .chat-body::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #FFE55C 0%, #FFD700 100%);
                }

                /* MESSAGE ROWS */
                .msg-row { 
                    display: flex; 
                    gap: 10px;
                    align-items: flex-end;
                    animation: slideIn 0.3s ease;
                }

                .msg-row.msg-user { justify-content: flex-end; }
                .msg-row.msg-user .msg-avatar { order: 2; }
                .msg-row.msg-user .msg-content { order: 1; }

                @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                /* AVATARS */
                .msg-avatar {
                    width: 34px; height: 34px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px;
                    flex-shrink: 0;
                    border: 1.5px solid rgba(255, 215, 0, 0.3);
                    animation: fadeIn 0.3s ease;
                }

                .bot-avatar {
                    background: linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(255, 215, 0, 0.1));
                    box-shadow: 0 0 12px rgba(0, 217, 255, 0.2);
                }

                .user-avatar {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
                    border-color: rgba(255, 215, 0, 0.4);
                    box-shadow: 0 0 8px rgba(255, 215, 0, 0.15);
                }

                @keyframes fadeIn { from { opacity: 0; scale: 0.8; } to { opacity: 1; scale: 1; } }

                .msg-content {
                    display: flex; flex-direction: column; gap: 8px; max-width: 290px;
                }

                .msg-row.msg-user .msg-content { max-width: calc(100% - 44px); }

                /* MESSAGE BUBBLES */
                .msg-bubble { 
                    padding: 12px 16px; border-radius: 18px; font-size: 13px; 
                    line-height: 1.6; transition: all 0.3s ease;
                    cursor: default; font-weight: 500;
                    word-wrap: break-word;
                    word-break: break-word;
                }

                .msg-bubble-user { 
                    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
                    color: #FFD700; border-bottom-right-radius: 4px;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                    font-weight: 600;
                    border: 1px solid rgba(255, 215, 0, 0.25);
                }

                .msg-bubble-user:hover {
                    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
                    border-color: rgba(255, 215, 0, 0.4);
                    transform: translateY(-2px);
                }

                .msg-bubble-bot { 
                    background: white; 
                    color: #222; 
                    border: 1.5px solid rgba(255, 215, 0, 0.2); 
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                }

                .msg-bubble-bot:hover {
                    border-color: rgba(255, 215, 0, 0.4);
                    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.12);
                    transform: translateY(-2px);
                }

                .msg-time { 
                    font-size: 8.5px; color: #999; 
                    margin-top: 4px; 
                    text-align: right;
                    letter-spacing: 0.3px; 
                }

                .msg-row.msg-user .msg-time { text-align: right; }
                .msg-row.msg-bot .msg-time { text-align: left; }

                /* THINKING ANIMATION */
                .thinking-dots {
                    display: flex; gap: 5px; align-items: center;
                    padding: 10px 14px;
                    background: white;
                    border: 1.5px solid rgba(255, 215, 0, 0.2);
                    border-radius: 18px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                }

                .thinking-dots span { 
                    width: 7px; height: 7px; background: linear-gradient(135deg, #FFD700, #FFA500);
                    display: inline-block; border-radius: 50%; 
                    box-shadow: 0 0 6px rgba(255, 215, 0, 0.4);
                }

                /* PRODUCTS SHOWCASE */
                .products-showcase {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 10px; margin-top: 12px;
                }

                .product-card-enhanced {
                    background: white; border: 1.5px solid rgba(255, 215, 0, 0.2);
                    border-radius: 14px; overflow: hidden; padding: 0;
                    transition: all 0.3s ease;
                    cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    display: flex; flex-direction: column; height: 100%;
                }

                .product-card-enhanced:hover {
                    border-color: rgba(255, 215, 0, 0.5);
                    box-shadow: 0 12px 30px rgba(255, 215, 0, 0.25);
                    background: linear-gradient(135deg, #FFFEF0 0%, #FFFFF5 100%);
                }

                .product-img-wrapper {
                    position: relative;
                    width: 100%;
                    height: 130px;
                    overflow: hidden;
                    background: linear-gradient(135deg, #f5f5f5, #e8e8e8);
                }

                .product-image {
                    width: 100%; height: 100%; object-fit: cover;
                    border-radius: 0; transition: transform 0.4s ease;
                }

                .product-card-enhanced:hover .product-image {
                    transform: scale(1.08);
                }

                .product-overlay {
                    position: absolute; top: 0; right: 0; bottom: 0; left: 0;
                    background: rgba(0, 0, 0, 0);
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s ease;
                }

                .product-card-enhanced:hover .product-overlay {
                    background: rgba(0, 0, 0, 0.3);
                }

                .product-details { 
                    padding: 10px; display: flex; flex-direction: column; gap: 6px; flex: 1;
                    justify-content: space-between;
                }

                .product-name {
                    font-size: 11px; font-weight: 700; color: #1a1a1a;
                    margin: 0; line-height: 1.3; display: -webkit-box;
                    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                }

                .product-price {
                    font-size: 12px; color: #FFD700; font-weight: 800; margin: 0;
                    display: flex; align-items: center; gap: 4px;
                }

                .inline-icon { width: 11px; height: 11px; }

                .product-link {
                    font-size: 9px; color: #FFD700; text-decoration: none;
                    padding: 5px 8px; border-radius: 6px;
                    background: rgba(255, 215, 0, 0.1); text-align: center;
                    transition: all 0.2s ease;
                    border: 1px solid rgba(255, 215, 0, 0.25);
                    font-weight: 600;
                    cursor: pointer;
                }

                .product-link:hover {
                    background: rgba(255, 215, 0, 0.2);
                    border-color: rgba(255, 215, 0, 0.5);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
                }

                /* FOOTER */
                .chat-footer { 
                    padding: 14px; border-top: 2px solid rgba(255, 215, 0, 0.2); 
                    display: flex; gap: 10px;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 215, 0, 0.01));
                    flex-shrink: 0;
                }

                .chat-footer input { 
                    flex: 1; border: 1.5px solid rgba(255, 215, 0, 0.25); border-radius: 50px; 
                    padding: 10px 16px; font-size: 13px; outline: none; 
                    background: white; color: #222; font-weight: 500;
                    transition: all 0.3s ease;
                }

                .chat-footer input::placeholder { color: #aaa; font-weight: 500; }

                .chat-footer input:focus { 
                    border-color: #FFD700; background: #FFFEF0;
                    box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
                    transform: scale(1.01);
                }

                .chat-footer input:disabled {
                    opacity: 0.5; cursor: not-allowed;
                }

                .chat-footer button { 
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
                    color: #111; border: 1.5px solid #FFA500; width: 42px; height: 42px; border-radius: 50%; 
                    cursor: pointer; transition: all 0.3s ease;
                    box-shadow: 
                        0 0 20px rgba(255, 215, 0, 0.4),
                        0 8px 20px rgba(255, 215, 0, 0.3);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; padding: 0; outline: none; flex-shrink: 0;
                }

                .chat-footer button:hover:not(:disabled) { 
                    transform: translateY(-5px) scale(1.15);
                    box-shadow: 
                        0 0 40px rgba(255, 215, 0, 0.7),
                        0 15px 35px rgba(255, 215, 0, 0.5);
                }

                .chat-footer button:active:not(:disabled) { transform: translateY(-2px) scale(1); }
                .chat-footer button:disabled { opacity: 0.4; cursor: not-allowed; }

                .spin-icon {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* ===== RESPONSIVE ===== */
                @media (max-width: 1200px) {
                    .chatbot-bubble { width: 72px; height: 72px; }
                    .chatbot-card { width: 380px; height: 540px; }
                    .msg-content { max-width: 280px; }
                    .products-showcase { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
                }

                @media (max-width: 768px) {
                    .chatbot-master-wrapper { bottom: 20px; right: 20px; }
                    .chatbot-bubble { width: 68px; height: 68px; }
                    .chatbot-card { 
                        width: 360px; 
                        height: 520px;
                        bottom: 85px;
                        border-radius: 30px;
                    }
                    .chat-header { padding: 16px 18px; }
                    .header-info h4 { font-size: 13px; }
                    .header-info span { font-size: 8px; }
                    .chat-body { padding: 14px; gap: 10px; }
                    .msg-bubble { padding: 10px 14px; font-size: 12px; }
                    .msg-content { max-width: 260px; }
                    .chat-footer { padding: 12px; gap: 8px; }
                    .chat-footer input { font-size: 12px; padding: 8px 12px; }
                    .chat-footer button { width: 38px; height: 38px; }
                    .products-showcase { grid-template-columns: repeat(2, 1fr); }
                    .product-card-enhanced { border-radius: 12px; }
                    .product-img-wrapper { height: 110px; }
                }

                @media (max-width: 640px) {
                    .chatbot-master-wrapper { bottom: 16px; right: 16px; }
                    .chatbot-bubble { width: 64px; height: 64px; }
                    .chatbot-card { 
                        width: 340px; 
                        height: 490px;
                        border-radius: 26px;
                    }
                    .msg-content { max-width: 250px; }
                    .msg-bubble { padding: 9px 13px; font-size: 11.5px; }
                    .msg-avatar { width: 30px; height: 30px; font-size: 16px; }
                }

                @media (max-width: 480px) {
                    .chatbot-master-wrapper { bottom: 12px; right: 12px; }
                    .chatbot-bubble { display: none; }
                    .chatbot-card { 
                        position: fixed !important; 
                        width: 96vw; height: 84vh;
                        bottom: 16px !important; right: 2% !important; left: 2%;
                        border-radius: 24px;
                    }
                    .chat-header { padding: 12px 14px; }
                    .header-info h4 { font-size: 12px; }
                    .header-info span { font-size: 7px; }
                    .chat-body { padding: 10px; gap: 8px; }
                    .msg-row { justify-content: flex-start; }
                    .msg-content { max-width: calc(100% - 38px); }
                    .msg-bubble { padding: 8px 11px; font-size: 11px; }
                    .msg-avatar { width: 28px; height: 28px; font-size: 14px; }
                    .chat-footer { padding: 10px; }
                    .chat-footer input { font-size: 11px; padding: 7px 11px; }
                    .chat-footer button { width: 36px; height: 36px; }
                    .products-showcase { grid-template-columns: 1fr; }
                    .product-img-wrapper { height: 100px; }
                }

                @media (max-height: 700px) and (orientation: landscape) {
                    .chatbot-card { height: max(90vh, 440px); }
                    .chat-body { gap: 8px; }
                }

                /* ACCESSIBILITY */
                .chat-footer button:focus-visible,
                .chatbot-bubble:focus-visible,
                .close-btn:focus-visible {
                    outline: 2px solid #FFD700;
                    outline-offset: -2px;
                }

                input:focus-visible { outline: none; }
            `}} />
        </motion.div>
    )
}
