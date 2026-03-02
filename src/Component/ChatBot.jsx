import React, { useState, useRef, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Send, X, Loader2, Sparkles, GripVertical, Home } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'

// ===== PREMIUM AI ROBOT SVG COMPONENT =====
const AnimatedRobotIcon = () => (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.4))' }}>
        {/* Head */}
        <rect x="10" y="8" width="32" height="24" rx="4" fill="#111" stroke="#FFD700" strokeWidth="2"/>
        
        {/* Eyes - LEFT */}
        <g>
            <rect x="16" y="14" width="6" height="6" rx="2" fill="#00D9FF"/>
            <motion.circle cx="19" cy="17" r="2.5" fill="#000" animate={{ opacity: [1, 1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 3, times: [0, 0.7, 0.8, 1] }}/>
        </g>
        
        {/* Eyes - RIGHT */}
        <g>
            <rect x="30" y="14" width="6" height="6" rx="2" fill="#00D9FF"/>
            <motion.circle cx="33" cy="17" r="2.5" fill="#000" animate={{ opacity: [1, 1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 3, times: [0, 0.7, 0.8, 1]}}/>
        </g>
        
        {/* Mouth */}
        <path d="M 18 23 Q 26 25 34 23" stroke="#FFD700" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        
        {/* Body */}
        <rect x="12" y="33" width="28" height="14" rx="3" fill="#111" stroke="#FFD700" strokeWidth="2"/>
        
        {/* Chest Glow */}
        <circle cx="26" cy="40" r="5" fill="none" stroke="#FFD700" strokeWidth="1" opacity="0.6"/>
        <motion.circle cx="26" cy="40" r="5" fill="none" stroke="#FFD700" strokeWidth="1.5" animate={{ r: [5, 7, 5] }} transition={{ repeat: Infinity, duration: 2 }}/>
        
        {/* Left Arm - WAVING */}
        <motion.g 
            animate={{ rotate: [0, -25, 0] }} 
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", delay: 0.3 }}
            style={{ transformOrigin: '12px 38px' }}
        >
            <rect x="6" y="36" width="6" height="12" rx="2" fill="#FFD700"/>
            <circle cx="6" cy="50" r="3" fill="#FFD700"/>
        </motion.g>
        
        {/* Right Arm */}
        <rect x="40" y="36" width="6" height="12" rx="2" fill="#FFD700"/>
        <circle cx="46" cy="50" r="3" fill="#FFD700"/>
        
        {/* Antennae */}
        <motion.line x1="18" y1="8" x2="18" y2="3" stroke="#FFD700" strokeWidth="1.5" animate={{ strokeWidth: [1.5, 2.5, 1.5] }} transition={{ repeat: Infinity, duration: 2 }}/>
        <motion.line x1="34" y1="8" x2="34" y2="3" stroke="#FFD700" strokeWidth="1.5" animate={{ strokeWidth: [1.5, 2.5, 1.5] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}/>
    </svg>
)

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isMobileFullScreen, setIsMobileFullScreen] = useState(false)
    const [currentUser, setCurrentUser] = useState({ name: "You", avatar: "👤" })
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "👋 Hello! I'm your Eshopper Premium AI Fashion Consultant. Welcome to Boutique Luxe! How can I help you today? Ask me about outfits, trends, or our exclusive collection!",
            sender: "bot",
            timestamp: new Date(),
            products: []
        }
    ])
    const [inputValue, setInputValue] = useState("")
    const [loading, setLoading] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const messagesEndRef = useRef(null)
    const scrollTimeoutRef = useRef(null)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 480)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (isMobile && isOpen) {
            setIsMobileFullScreen(true)
        } else {
            setIsMobileFullScreen(false)
        }
    }, [isMobile, isOpen])

    const scrollToBottom = () => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading])

    const extractProducts = (text) => {
        // Parse product suggestions from AI response
        const productRegex = /\[PRODUCT:(.*?)\]/g
        const matches = []
        let match
        while ((match = productRegex.exec(text)) !== null) {
            try {
                matches.push(JSON.parse(match[1]))
            } catch (e) {
                console.error('Product parse error:', e)
            }
        }
        return matches
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!inputValue.trim() || loading) return

        const userMessage = {
            id: Date.now(),
            text: inputValue.trim(),
            sender: "user",
            timestamp: new Date(),
            products: []
        }

        setMessages(prev => [...prev, userMessage])
        const userPrompt = inputValue.trim()
        setInputValue("")
        setLoading(true)

        try {
            const conversationHistory = messages.map(m => ({
                role: m.sender === 'bot' ? 'model' : 'user',
                parts: [{ text: m.text.replace(/\[PRODUCT:.*?\]/g, '').trim() }]
            }))

            const response = await axios.post(`${BASE_URL}/api/chat`, {
                prompt: userPrompt,
                history: conversationHistory,
                context: "You are an AI Fashion Consultant for Eshopper Boutique Luxe. Be friendly, professional, and natural in your responses. Help users with fashion advice, outfit recommendations, and product suggestions. When recommending products, format them naturally in conversation."
            }, {
                timeout: 15000
            })

            const responseText = response.data.text || response.data.message || response.data.reply || "I'm here to help! Tell me more about what you're looking for."
            const products = extractProducts(responseText)

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: responseText,
                sender: "bot",
                timestamp: new Date(),
                products: products
            }])
        } catch (err) {
            console.error('Chat error:', err)
            const errorMessage = err.response?.data?.message || "I'm temporarily adjusting to better serve you. Please try again in a moment!"
            
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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
            {/* ===== GRIP HANDLE FOR DRAGGING ===== */}
            {!isMobileFullScreen && !isOpen && (
                <motion.div 
                    className="grip-handle"
                    whileHover={{ opacity: 1, scale: 1.1 }}
                    initial={{ opacity: 0.6 }}
                    title="Drag me to move around"
                >
                    <GripVertical size={12} color="#FFD700" />
                </motion.div>
            )}

            {/* ===== ANIMATED ROBOT BUTTON ===== */}
            <motion.button
                onClick={() => {
                    if (!isMobileFullScreen) setIsOpen(!isOpen)
                }}
                className={`chatbot-bubble ${isOpen ? 'active' : ''} ${isMobileFullScreen ? 'hidden' : ''}`}
                whileHover={{ scale: !isMobileFullScreen ? 1.12 : 1 }}
                whileTap={{ scale: !isMobileFullScreen ? 0.95 : 1 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                disabled={isMobileFullScreen}
            >
                <AnimatePresence mode="wait">
                    {isOpen && isMobileFullScreen ? null : (
                        <motion.div key="bot" className="robot-svg-box">
                            <AnimatedRobotIcon />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* ===== PREMIUM CHAT WINDOW ===== */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`chatbot-card ${isMobileFullScreen ? 'fullscreen' : ''}`}
                        initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    >
                        {/* ===== HEADER WITH STATUS ===== */}
                        <div className="chat-header">
                            <div className="header-info">
                                <motion.div 
                                    className="status-dot"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                ></motion.div>
                                <div className="header-text">
                                    <h4>Eshopper AI Fashion Consultant</h4>
                                    <span>🟢 Premium Assistant • Online</span>
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
                                title="Close chat"
                            >
                                <X size={22} />
                            </motion.button>
                        </div>

                        {/* ===== CHAT MESSAGES ===== */}
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
                                            <span>🤖</span>
                                        </div>
                                    )}
                                    
                                    <div className="msg-content">
                                        <div className={`msg-bubble msg-bubble-${msg.sender}`}>
                                            {msg.text}
                                        </div>
                                        {msg.products && msg.products.length > 0 && (
                                            <div className="products-grid">
                                                {msg.products.map((product, idx) => (
                                                    <motion.div 
                                                        key={idx} 
                                                        className="product-card"
                                                        whileHover={{ y: -5, boxShadow: "0 15px 30px rgba(255, 215, 0, 0.3)" }}
                                                    >
                                                        {product.image && (
                                                            <img src={product.image} alt={product.name} className="product-image"/>
                                                        )}
                                                        <div className="product-info">
                                                            <p className="product-name">{product.name}</p>
                                                            {product.price && <p className="product-price">${product.price}</p>}
                                                            {product.link && (
                                                                <a href={product.link} target="_blank" rel="noopener noreferrer" className="product-link">
                                                                    View Product
                                                                </a>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                        <span className="msg-time">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {msg.sender === 'user' && (
                                        <div className="msg-avatar user-avatar">
                                            <span>👤</span>
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
                                    <div className="msg-thinking">
                                        <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} ></motion.span>
                                        <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} ></motion.span>
                                        <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} ></motion.span>
                                    </div>
                                </motion.div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ===== INPUT FOOTER ===== */}
                        <form onSubmit={handleSendMessage} className="chat-footer">
                            <input
                                type="text"
                                placeholder="Ask about outfits, trends, or our collection..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={loading}
                                maxLength={500}
                            />
                            <motion.button 
                                type="submit" 
                                disabled={!inputValue.trim() || loading}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Send message"
                            >
                                {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                            </motion.button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                /* ===== ULTRA PREMIUM CHATBOT MASTER WRAPPER ===== */
                .chatbot-master-wrapper { 
                    position: fixed; bottom: 32px; right: 32px; z-index: 9999; 
                    font-family: 'Inter', '-apple-system', 'Segoe UI', sans-serif;
                    display: flex; align-items: flex-end; gap: 12px;
                }

                .grip-handle {
                    position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8); padding: 6px; border-radius: 20px;
                    border: 1px solid #FFD700; opacity: 0.6; cursor: grab;
                    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.2);
                }
                
                /* ===== ULTRA PREMIUM ANIMATED BUBBLE ===== */
                .chatbot-bubble {
                    width: 76px; height: 76px; border-radius: 50%; 
                    background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #000 100%);
                    border: 2.5px solid #FFD700;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; 
                    color: #FFD700; padding: 0; outline: none;
                    box-shadow: 
                        0 0 50px rgba(255, 215, 0, 0.5),
                        0 0 80px rgba(255, 215, 0, 0.25),
                        0 15px 40px rgba(0, 0, 0, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                    animation: bubbleGlow 3s ease-in-out infinite;
                    flex-shrink: 0;
                }

                @keyframes bubbleGlow {
                    0%, 100% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.5), 0 0 80px rgba(255, 215, 0, 0.25), 0 15px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
                    50% { box-shadow: 0 0 70px rgba(255, 215, 0, 0.7), 0 0 120px rgba(255, 215, 0, 0.4), 0 15px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15); }
                }

                .chatbot-bubble:hover:not(:disabled) {
                    transform: translateY(-12px) scale(1.15);
                    box-shadow: 
                        0 0 80px rgba(255, 215, 0, 0.8),
                        0 0 120px rgba(255, 215, 0, 0.5),
                        0 25px 60px rgba(0, 0, 0, 0.7),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
                }

                .chatbot-bubble:active:not(:disabled) {
                    transform: scale(0.92);
                }

                .chatbot-bubble.active {
                    background: linear-gradient(135deg, #333 0%, #1a1a1a 100%);
                    opacity: 0.9;
                }

                .chatbot-bubble.hidden {
                    display: none !important;
                }

                .robot-svg-box {
                    animation: robotFloat 3s ease-in-out infinite;
                }

                @keyframes robotFloat {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-8px) rotate(2deg); }
                }

                /* ===== PREMIUM CHAT CARD ===== */
                .chatbot-card {
                    position: absolute; bottom: 95px; right: 0; 
                    width: 380px; 
                    height: 540px;
                    background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
                    border-radius: 32px; display: flex; flex-direction: column;
                    overflow: hidden; 
                    border: 2px solid rgba(255, 215, 0, 0.3);
                    box-shadow: 
                        0 0 80px rgba(255, 215, 0, 0.2),
                        0 30px 80px rgba(0, 0, 0, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(8px);
                    touch-action: auto;
                }

                .chatbot-card.fullscreen {
                    position: fixed !important; 
                    width: 96vw; height: 84vh;
                    bottom: 18px !important; right: 2% !important; left: 2%;
                    border-radius: 23px;
                    max-width: 100vw;
                }

                /* ===== PREMIUM HEADER ===== */
                .chat-header {
                    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                    color: white; 
                    padding: 22px 24px; 
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
                    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
                }

                .header-info { display: flex; align-items: center; gap: 14px; flex: 1; }
                .status-dot { 
                    width: 10px; height: 10px; background: #00D9FF; border-radius: 50%; 
                    box-shadow: 0 0 15px #00D9FF, 0 0 30px rgba(0, 217, 255, 0.4);
                    animation: pulse 2s ease-in-out infinite;
                    flex-shrink: 0;
                }

                @keyframes pulse { 0%, 100% { box-shadow: 0 0 15px #00D9FF, 0 0 30px rgba(0, 217, 255, 0.4); } 50% { box-shadow: 0 0 8px #00D9FF, 0 0 15px rgba(0, 217, 255, 0.2); } }

                .header-text { display: flex; flex-direction: column; gap: 2px; }
                .header-info h4 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
                .header-info span { 
                    font-size: 10px; color: #FFD700; text-transform: uppercase; 
                    letter-spacing: 1.5px; font-weight: 700;
                }

                .close-btn {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    color: #FFD700; cursor: pointer; padding: 6px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    flex-shrink: 0;
                }

                .close-btn:hover {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.15));
                    border-color: rgba(255, 215, 0, 0.5);
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
                }

                /* ===== PREMIUM CHAT BODY ===== */
                .chat-body { 
                    flex: 1; overflow-y: auto; overflow-x: hidden; padding: 20px; 
                    background: linear-gradient(to bottom, #FAFAFA 0%, #F8F8F8 100%);
                    display: flex; flex-direction: column; gap: 14px;
                }

                .chat-body::-webkit-scrollbar { width: 6px; }
                .chat-body::-webkit-scrollbar-track { background: transparent; }
                .chat-body::-webkit-scrollbar-thumb { 
                    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
                    border-radius: 10px; box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
                }

                .msg-row { 
                    display: flex; 
                    gap: 10px;
                    align-items: flex-end;
                    animation: slideIn 0.3s ease;
                }

                .msg-row.msg-user { justify-content: flex-end; }
                .msg-row.msg-user .msg-avatar { order: 2; }
                .msg-row.msg-user .msg-content { order: 1; }

                .msg-row.msg-bot { justify-content: flex-start; }
                .msg-row.msg-bot .msg-avatar { order: 1; }
                .msg-row.msg-bot .msg-content { order: 2; }

                @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                /* ===== AVATARS ===== */
                .msg-avatar {
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 20px;
                    flex-shrink: 0;
                    background: rgba(255, 215, 0, 0.1);
                    border: 1px solid rgba(255, 215, 0, 0.2);
                    animation: fadeIn 0.3s ease;
                }

                .bot-avatar {
                    background: linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(255, 215, 0, 0.15));
                    border: 1px solid rgba(255, 215, 0, 0.2);
                    box-shadow: 0 0 12px rgba(0, 217, 255, 0.2);
                }

                .user-avatar {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.15));
                    border: 1px solid rgba(255, 215, 0, 0.3);
                }

                @keyframes fadeIn { from { opacity: 0; scale: 0.8; } to { opacity: 1; scale: 1; } }

                .msg-content {
                    display: flex; flex-direction: column; gap: 8px; max-width: 280px;
                }

                .msg-row.msg-user .msg-content { max-width: calc(100% - 42px); }

                /* ===== MESSAGE BUBBLES - PREMIUM ===== */
                .msg-bubble { 
                    padding: 13px 17px; border-radius: 20px; font-size: 13px; 
                    line-height: 1.6; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: default; font-weight: 500;
                    word-wrap: break-word;
                    word-break: break-word;
                }

                .msg-bubble-user { 
                    background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
                    color: #FFD700; border-bottom-right-radius: 4px;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                    font-weight: 600;
                    border: 1px solid rgba(255, 215, 0, 0.2);
                }

                .msg-bubble-user:hover {
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
                    border-color: rgba(255, 215, 0, 0.4);
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
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
                }

                .msg-time { 
                    font-size: 9px; color: #999; 
                    margin-top: 2px; 
                    text-align: right;
                    letter-spacing: 0.3px; 
                }

                .msg-row.msg-user .msg-time { text-align: right; }
                .msg-row.msg-bot .msg-time { text-align: left; }

                /* ===== THINKING / LOADING ANIMATION ===== */
                .msg-thinking {
                    display: flex; gap: 6px; align-items: center;
                    padding: 10px 13px;
                    background: white;
                    border: 1.5px solid rgba(255, 215, 0, 0.2);
                    border-radius: 20px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                }

                .msg-thinking span { 
                    width: 8px; height: 8px; background: linear-gradient(135deg, #FFD700, #FFA500);
                    display: inline-block; border-radius: 50%; 
                    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
                }

                /* ===== PRODUCTS GRID IN MESSAGES ===== */
                .products-grid {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 10px; margin-top: 10px;
                }

                .product-card {
                    background: white; border: 1px solid rgba(255, 215, 0, 0.2);
                    border-radius: 12px; overflow: hidden; padding: 10px;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }

                .product-card:hover {
                    border-color: rgba(255, 215, 0, 0.4);
                    box-shadow: 0 10px 25px rgba(255, 215, 0, 0.2);
                    background: linear-gradient(135deg, #FFFEF0 0%, #FFFFF5 100%);
                }

                .product-image {
                    width: 100%; height: 120px; object-fit: cover;
                    border-radius: 8px; margin-bottom: 8px;
                }

                .product-info { display: flex; flex-direction: column; gap: 6px; }

                .product-name {
                    font-size: 11px; font-weight: 600; color: #1a1a1a;
                    margin: 0; line-height: 1.3;
                }

                .product-price {
                    font-size: 12px; color: #FFD700; font-weight: 700; margin: 0;
                }

                .product-link {
                    font-size: 10px; color: #FFD700; text-decoration: none;
                    padding: 4px 6px; border-radius: 4px;
                    background: rgba(255, 215, 0, 0.1); text-align: center;
                    transition: all 0.2s ease;
                    border: 1px solid rgba(255, 215, 0, 0.2);
                }

                .product-link:hover {
                    background: rgba(255, 215, 0, 0.2);
                    border-color: rgba(255, 215, 0, 0.4);
                }

                /* ===== PREMIUM FOOTER ===== */
                .chat-footer { 
                    padding: 16px; border-top: 2px solid rgba(255, 215, 0, 0.2); 
                    display: flex; gap: 10px;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 215, 0, 0.02));
                    flex-shrink: 0;
                }

                .chat-footer input { 
                    flex: 1; border: 1.5px solid rgba(255, 215, 0, 0.25); border-radius: 50px; 
                    padding: 11px 16px; font-size: 13px; outline: none; 
                    background: white; color: #222; font-weight: 500;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .chat-footer input::placeholder { color: #999; font-weight: 500; }

                .chat-footer input:focus { 
                    border-color: #FFD700; background: #FFFEF0;
                    box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.15);
                    transform: translateY(-1px);
                }

                .chat-footer input:disabled {
                    opacity: 0.6; cursor: not-allowed;
                }

                .chat-footer button { 
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
                    color: #111; border: 1.5px solid #FFA500; width: 42px; height: 42px; border-radius: 50%; 
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 
                        0 0 20px rgba(255, 215, 0, 0.4),
                        0 8px 20px rgba(255, 215, 0, 0.3);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; padding: 0; outline: none; flex-shrink: 0;
                }

                .chat-footer button:hover:not(:disabled) { 
                    transform: translateY(-5px) scale(1.12);
                    box-shadow: 
                        0 0 40px rgba(255, 215, 0, 0.6),
                        0 15px 35px rgba(255, 215, 0, 0.5);
                }

                .chat-footer button:active:not(:disabled) { transform: scale(0.88); }
                .chat-footer button:disabled { opacity: 0.4; cursor: not-allowed; }

                .chat-footer button.spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* ===== RESPONSIVE DESIGN ===== */
                @media (max-width: 1400px) {
                    .chatbot-master-wrapper { bottom: 30px; right: 30px; }
                    .chatbot-bubble { width: 74px; height: 74px; }
                    .chatbot-card { width: 375px; height: 530px; }
                }

                @media (max-width: 1200px) {
                    .chatbot-master-wrapper { bottom: 28px; right: 28px; }
                    .chatbot-bubble { width: 70px; height: 70px; }
                    .chatbot-card { width: 365px; height: 510px; }
                }

                @media (max-width: 1024px) {
                    .chatbot-master-wrapper { bottom: 26px; right: 26px; }
                    .chatbot-bubble { width: 68px; height: 68px; }
                    .chatbot-card { width: 360px; height: 495px; }
                }

                @media (max-width: 768px) {
                    .chatbot-master-wrapper { bottom: 22px; right: 22px; }
                    .chatbot-bubble { width: 64px; height: 64px; }
                    .chatbot-card { 
                        width: 355px; 
                        height: 480px;
                        bottom: 88px;
                        border-radius: 28px;
                    }
                    .chat-header { padding: 17px 19px; }
                    .header-info h4 { font-size: 13.5px; }
                    .header-info span { font-size: 8.5px; }
                    .chat-body { padding: 15px; gap: 11px; }
                    .msg-bubble { padding: 10px 14px; font-size: 11.5px; }
                    .msg-content { max-width: 260px; }
                    .chat-footer { padding: 13px; gap: 9px; }
                    .chat-footer input { font-size: 11.5px; padding: 8px 13px; }
                    .chat-footer button { width: 38px; height: 38px; }
                    .products-grid { grid-template-columns: repeat(2, 1fr); }
                }

                @media (max-width: 640px) {
                    .chatbot-master-wrapper { bottom: 18px; right: 18px; }
                    .chatbot-bubble { width: 60px; height: 60px; }
                    .chatbot-card { 
                        width: 330px; 
                        height: 470px;
                        bottom: 80px; border-radius: 25px;
                    }
                    .chat-header { padding: 15px 16px; }
                    .header-info { gap: 11px; }
                    .header-info h4 { font-size: 12px; }
                    .status-dot { width: 7px; height: 7px; }
                    .msg-row { max-width: 100%; }
                    .msg-content { max-width: 250px; }
                    .msg-bubble { padding: 9px 13px; font-size: 11px; }
                    .msg-avatar { width: 28px; height: 28px; font-size: 16px; }
                }

                @media (max-width: 480px) {
                    .chatbot-master-wrapper { bottom: 14px; right: 14px; }
                    .chatbot-bubble { width: 56px; height: 56px; display: none; }
                    .chatbot-card { 
                        position: fixed !important; 
                        width: 96vw; height: 84vh;
                        bottom: 18px !important; right: 2% !important; left: 2%;
                        border-radius: 23px;
                        max-height: 90vh;
                    }
                    .chat-header { padding: 13px 15px; }
                    .header-info h4 { font-size: 11px; }
                    .header-info span { font-size: 7px; letter-spacing: 0.8px; }
                    .chat-body { padding: 11px; gap: 9px; }
                    .msg-row { justify-content: flex-start; }
                    .msg-content { max-width: calc(100% - 40px); }
                    .msg-bubble { padding: 8px 11px; font-size: 10.5px; }
                    .msg-avatar { width: 26px; height: 26px; font-size: 14px; }
                    .chat-footer { padding: 11px; }
                    .chat-footer input { font-size: 10px; padding: 7px 11px; }
                    .chat-footer button { width: 34px; height: 34px; }
                    .products-grid { grid-template-columns: 1fr; }
                }

                @media (max-width: 380px) {
                    .chatbot-master-wrapper { bottom: 10px; right: 10px; }
                    .chatbot-bubble { width: 52px; height: 52px; }
                    .chatbot-card { 
                        width: 97vw; height: 81vh;
                        border-radius: 20px;
                    }
                    .chat-header { padding: 11px 13px; }
                    .header-info { gap: 9px; }
                    .header-info h4 { font-size: 10px; }
                    .header-info span { font-size: 6.5px; }
                    .chat-body { padding: 9px; }
                    .msg-content { max-width: calc(100% - 36px); }
                    .msg-bubble { padding: 7px 10px; font-size: 9.5px; }
                    .msg-time { font-size: 7px; }
                    .chat-footer { padding: 9px; gap: 7px; }
                    .chat-footer input { font-size: 9px; padding: 6px 10px; }
                    .chat-footer button { width: 32px; height: 32px; font-size: 12px; }
                }

                @media (max-height: 700px) and (orientation: landscape) {
                    .chatbot-card { height: max(92vh, 450px); }
                    .chat-header { padding: 11px 15px; }
                    .chat-body { padding: 11px; gap: 10px; }
                    .msg-bubble { padding: 8px 12px; font-size: 11px; }
                    .chat-footer { padding: 11px; }
                }

                @media (max-height: 500px) and (orientation: landscape) {
                    .chatbot-card { height: 88vh; }
                    .chat-header { padding: 9px 12px; }
                    .chat-body { padding: 9px; gap: 8px; }
                    .msg-bubble { padding: 6px 10px; font-size: 10px; }
                    .chat-footer { padding: 9px; }
                }

                /* ===== ACCESSIBILITY ===== */
                .chat-footer button:focus-visible,
                .chatbot-bubble:focus-visible,
                .close-btn:focus-visible {
                    outline: 2px solid #FFD700;
                    outline-offset: -2px;
                }

                input:focus-visible {
                    outline: none;
                }
            `}} />
        </motion.div>
    )
}