import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Loader2 } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "👋 Hello! I'm your AI Fashion Stylist. How can I help you today? Ask me about outfits, trends, or our collection!",
            sender: "bot",
            timestamp: new Date(),
        }
    ])
    const [inputValue, setInputValue] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const messagesEndRef = useRef(null)

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Prepare conversation history for Gemini - FIXED FORMAT
    const getConversationHistory = () => {
        // Filter messages: skip initial bot greeting (id: 1) and errors
        const relevantMessages = messages.filter(m => {
            if (m.sender === "error") return false;
            if (m.id === 1) return false; // Skip initial greeting
            if (!m.text || m.text.trim().length === 0) return false;
            return true;
        });
        
        // If no messages or only one message, return empty array (fresh conversation)
        if (relevantMessages.length <= 1) {
            console.log('📝 Fresh conversation - sending empty history');
            return [];
        }
        
        // Map to backend-compatible format
        const history = relevantMessages.map(m => ({
            sender: m.sender, // 'user' or 'bot'
            text: m.text.trim(),
            id: m.id
        }));
        
        console.log('📤 Sending conversation history:', {
            totalMessages: history.length,
            firstSender: history[0]?.sender,
            lastSender: history[history.length - 1]?.sender
        });
        
        return history;
    }

    // Send message to backend
    const handleSendMessage = async (e) => {
        e.preventDefault()
        
        if (!inputValue.trim()) return

        // Add user message to UI
        const userMessage = {
            id: Date.now(),
            text: inputValue.trim(),
            sender: "user",
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        const currentInput = inputValue.trim()
        const currentHistory = getConversationHistory()
        setInputValue("")
        setLoading(true)
        setError(null)

        try {
            console.log("📤 Sending to backend:", currentInput)
            console.log("📤 History being sent:", currentHistory)

            const response = await axios.post(
                `${BASE_URL}/api/chat`,
                {
                    prompt: currentInput,
                    history: currentHistory,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            )

            const data = response.data

            console.log("✅ Response from Gemini:", data.text || data.message)

            // Add bot response to UI
            const botMessage = {
                id: Date.now() + 1,
                text: data.text || data.message,
                sender: "bot",
                timestamp: new Date(),
            }

            setMessages(prev => [...prev, botMessage])

        } catch (err) {
            console.error("❌ Chat Error:", err)
            setError(err.message)

            const errorMessage = {
                id: Date.now() + 1,
                text: err.message.includes('API key') || err.message.includes('authentication') 
                    ? "🔒 AI service is temporarily unavailable. Our team has been notified. Please try again later." 
                    : err.message.includes('Conversation error')
                    ? "🔄 Conversation history issue detected. Starting fresh conversation..."
                    : `❌ Sorry, I encountered an error: ${err.message}. Please try again or refresh the chat.`,
                sender: "error",
                timestamp: new Date(),
            }

            setMessages(prev => [...prev, errorMessage])
            
            // Auto-clear error messages after timeout
            if (err.message.includes('Conversation error')) {
                setTimeout(() => {
                    setMessages([{
                        id: 1,
                        text: "👋 Hello! I'm your AI Fashion Stylist. How can I help you today? Ask me about outfits, trends, or our collection!",
                        sender: "bot",
                        timestamp: new Date(),
                    }]);
                }, 2000);
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* 🤖 FLOATING CHAT BUBBLE - PREMIUM ANIMATED ROBOT */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="chatbot-bubble"
                whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                whileTap={{ scale: 0.92 }}
                aria-label="Open chat"
                animate={{
                    y: [0, -10, 0],
                    boxShadow: [
                        '0 15px 50px rgba(138, 43, 226, 0.4)',
                        '0 20px 60px rgba(255, 215, 0, 0.5)',
                        '0 15px 50px rgba(138, 43, 226, 0.4)'
                    ]
                }}
                transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <motion.div 
                    className="robot-icon-container"
                    animate={{ 
                        rotate: [0, -5, 5, -3, 3, 0]
                    }}
                    transition={{ 
                        duration: 5, 
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {isOpen ? (
                        <motion.div 
                            key="close" 
                            initial={{ rotate: -180, scale: 0 }} 
                            animate={{ rotate: 0, scale: 1 }}
                            exit={{ rotate: 180, scale: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            <X size={32} strokeWidth={3} />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="open" 
                            initial={{ rotate: 180, scale: 0 }} 
                            animate={{ rotate: 0, scale: 1 }}
                            exit={{ rotate: -180, scale: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            {/* 🤖 PREMIUM ANIMATED AI ROBOT SVG - LARGER VERSION */}
                            <svg width="55" height="55" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="robotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#FFD700" />
                                        <stop offset="50%" stopColor="#FFA500" />
                                        <stop offset="100%" stopColor="#FF6B9D" />
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>
                                
                                {/* Antenna */}
                                <motion.line 
                                    x1="21" y1="3" x2="21" y2="7" 
                                    stroke="url(#robotGradient)" 
                                    strokeWidth="2" 
                                    strokeLinecap="round"
                                    animate={{ y1: [3, 1, 3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <motion.circle 
                                    cx="21" cy="3" r="2.5" 
                                    fill="#FFD700"
                                    filter="url(#glow)"
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                
                                {/* Head */}
                                <rect x="8" y="7" width="26" height="18" rx="3" fill="url(#robotGradient)" stroke="#FFD700" strokeWidth="1.5"/>
                                
                                {/* Eyes with blink animation */}
                                <motion.g>
                                    <motion.circle 
                                        cx="15" cy="15" r="3" 
                                        fill="#00D9FF"
                                        animate={{ 
                                            scale: [1, 0.1, 1],
                                            opacity: [1, 0.3, 1]
                                        }}
                                        transition={{ 
                                            duration: 3, 
                                            repeat: Infinity,
                                            times: [0, 0.1, 0.2]
                                        }}
                                    />
                                    <motion.circle 
                                        cx="15" cy="15" r="1.2" 
                                        fill="white"
                                        animate={{ 
                                            scale: [1, 0, 1],
                                            x: [0, 1, 0],
                                            y: [0, -1, 0]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </motion.g>
                                
                                <motion.g>
                                    <motion.circle 
                                        cx="27" cy="15" r="3" 
                                        fill="#00D9FF"
                                        animate={{ 
                                            scale: [1, 0.1, 1],
                                            opacity: [1, 0.3, 1]
                                        }}
                                        transition={{ 
                                            duration: 3, 
                                            repeat: Infinity,
                                            times: [0, 0.1, 0.2],
                                            delay: 0.05
                                        }}
                                    />
                                    <motion.circle 
                                        cx="27" cy="15" r="1.2" 
                                        fill="white"
                                        animate={{ 
                                            scale: [1, 0, 1],
                                            x: [0, -1, 0],
                                            y: [0, -1, 0]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </motion.g>
                                
                                {/* Smile */}
                                <motion.path 
                                    d="M 13 20 Q 21 24 29 20" 
                                    stroke="#FFD700" 
                                    strokeWidth="2" 
                                    fill="none" 
                                    strokeLinecap="round"
                                    animate={{ d: ["M 13 20 Q 21 24 29 20", "M 13 20 Q 21 25 29 20", "M 13 20 Q 21 24 29 20"] }}
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                />
                                
                                {/* Body */}
                                <rect x="11" y="25" width="20" height="12" rx="2" fill="url(#robotGradient)" stroke="#FFD700" strokeWidth="1.5"/>
                                
                                {/* Chest Light */}
                                <motion.circle 
                                    cx="21" cy="31" r="2" 
                                    fill="#00D9FF"
                                    animate={{ 
                                        opacity: [0.5, 1, 0.5],
                                        scale: [0.9, 1.1, 0.9]
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                
                                {/* Left Arm */}
                                <motion.rect 
                                    x="4" y="27" width="6" height="4" rx="2" 
                                    fill="url(#robotGradient)"
                                    stroke="#FFD700" 
                                    strokeWidth="1.5"
                                    animate={{ 
                                        y: [27, 25, 27],
                                        rotate: [0, -10, 0]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{ originX: '1', originY: '0.5' }}
                                />
                                
                                {/* Right Arm */}
                                <motion.rect 
                                    x="32" y="27" width="6" height="4" rx="2" 
                                    fill="url(#robotGradient)"
                                    stroke="#FFD700" 
                                    strokeWidth="1.5"
                                    animate={{ 
                                        y: [27, 25, 27],
                                        rotate: [0, 10, 0]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                                    style={{ originX: '0', originY: '0.5' }}
                                />
                                
                                {/* Legs */}
                                <rect x="15" y="37" width="5" height="3" rx="1" fill="url(#robotGradient)" stroke="#FFD700" strokeWidth="1"/>
                                <rect x="22" y="37" width="5" height="3" rx="1" fill="url(#robotGradient)" stroke="#FFD700" strokeWidth="1"/>
                            </svg>
                        </motion.div>
                    )}
                </motion.div>
            </motion.button>

            {/* 🤖 CHAT WINDOW */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="chatbot-window"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* HEADER */}
                        <div className="chatbot-header">
                            <motion.div className="chatbot-header-content"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="chatbot-title-box">
                                    <motion.span 
                                        className="header-robot-icon"
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    >
                                        🤖
                                    </motion.span>
                                    <h3 className="chatbot-title">AI Fashion Stylist</h3>
                                    <span className="chatbot-status">🟢 Premium</span>
                                </div>
                                <p className="chatbot-subtitle">✨ Powered by Eshopperr Luxury AI</p>
                            </motion.div>
                            <motion.button
                                onClick={() => setIsOpen(false)}
                                className="chatbot-close-btn"
                                aria-label="Close chat"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* MESSAGES */}
                        <div className="chatbot-messages">
                            <AnimatePresence>
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className={`chatbot-message-wrapper ${msg.sender}`}
                                    >
                                        <div className={`chatbot-message ${msg.sender}`}>
                                            {msg.text}
                                        </div>
                                        <span className="chatbot-timestamp">
                                            {msg.timestamp.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </motion.div>
                                ))}
                                
                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="chatbot-message-wrapper bot"
                                    >
                                        <div className="chatbot-message bot ai-thinking">
                                            <div className="thinking-animation">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT FORM */}
                        <form onSubmit={handleSendMessage} className="chatbot-form">
                            <div className="chatbot-input-box">
                                <input
                                    type="text"
                                    placeholder="Ask me about styles, outfits..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={loading}
                                    className="chatbot-input"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !inputValue.trim()}
                                    className="chatbot-send-btn"
                                    aria-label="Send message"
                                >
                                    {loading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* QUICK STARTERS */}
                        {messages.length === 1 && (
                            <div className="chatbot-quick-starters">
                                <p className="quick-text">Quick questions:</p>
                                <div className="quick-buttons">
                                    <button
                                        onClick={() => {
                                            setInputValue("Suggest an outfit for a casual weekend")
                                            setTimeout(() => {
                                                document.querySelector('.chatbot-send-btn')?.click()
                                            }, 100)
                                        }}
                                        className="quick-btn"
                                    >
                                        📸 Weekend Outfit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setInputValue("What's trending in luxury fashion?")
                                            setTimeout(() => {
                                                document.querySelector('.chatbot-send-btn')?.click()
                                            }, 100)
                                        }}
                                        className="quick-btn"
                                    >
                                        ⭐ Trends
                                    </button>
                                    <button
                                        onClick={() => {
                                            setInputValue("Show me your best summer collection recommendations")
                                            setTimeout(() => {
                                                document.querySelector('.chatbot-send-btn')?.click()
                                            }, 100)
                                        }}
                                        className="quick-btn"
                                    >
                                        ☀️ Summer Picks
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🎨 PREMIUM LUXURY STYLES */}
            <style dangerouslySetInnerHTML={{ __html: `
                /* Floating Chat Bubble - Premium Animated AI Robot with Light Background */
                .chatbot-bubble {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 95px;
                    height: 95px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 255, 0.98) 100%);
                    color: #1a1a2e;
                    border: 3px solid rgba(255, 215, 0, 0.6);
                    box-shadow: 
                        0 25px 70px rgba(138, 43, 226, 0.35),
                        0 15px 40px rgba(255, 215, 0, 0.25),
                        inset 0 2px 5px rgba(255, 255, 255, 0.8),
                        inset 0 -2px 8px rgba(138, 43, 226, 0.1);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9998;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    font-size: 28px;
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }

                .robot-icon-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                }

                .chatbot-bubble:hover {
                    transform: translateY(-10px) scale(1.12) rotate(2deg);
                    box-shadow: 
                        0 30px 90px rgba(138, 43, 226, 0.5),
                        0 20px 50px rgba(255, 215, 0, 0.35),
                        inset 0 2px 5px rgba(255, 255, 255, 1),
                        inset 0 -2px 8px rgba(255, 215, 0, 0.2);
                    border-color: rgba(255, 107, 157, 0.8);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 250, 240, 1) 100%);
                }

                .chatbot-bubble:active {
                    transform: scale(0.94);
                }

                /* Chat Window - Premium */
                .chatbot-window {
                    position: fixed;
                    bottom: 110px;
                    right: 30px;
                    width: 420px;
                    max-height: 680px;
                    background: linear-gradient(to bottom, #FFFFFF 0%, #F8F9FF 100%);
                    border-radius: 28px;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2), 0 0 40px rgba(255, 107, 157, 0.15);
                    display: flex;
                    flex-direction: column;
                    z-index: 9997;
                    overflow: hidden;
                    border: 2px solid rgba(255, 215, 0, 0.2);
                    backdrop-filter: blur(10px);
                }

                /* Header - Premium Luxury */
                .chatbot-header {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    color: white;
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid rgba(255, 215, 0, 0.3);
                    position: relative;
                    overflow: hidden;
                }

                .chatbot-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.05) 50%, transparent 70%);
                    animation: shimmer 3s infinite;
                    pointer-events: none;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .chatbot-header-content {
                    flex: 1;
                    z-index: 1;
                }

                .header-robot-icon {
                    font-size: 20px;
                    display: inline-block;
                    margin-right: 8px;
                }

                .chatbot-title-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                }

                .chatbot-title {
                    font-size: 18px;
                    font-weight: 900;
                    margin: 0;
                    letter-spacing: 0.8px;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .chatbot-status {
                    font-size: 11px;
                    font-weight: 700;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 107, 157, 0.3) 100%);
                    padding: 6px 12px;
                    border-radius: 16px;
                    display: inline-block;
                    border: 1px solid rgba(255, 215, 0, 0.5);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .chatbot-subtitle {
                    font-size: 12px;
                    opacity: 0.85;
                    margin: 0;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                    color: #FFD700;
                }

                .chatbot-close-btn {
                    background: rgba(255, 215, 0, 0.2);
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    z-index: 10;
                    font-weight: bold;
                }

                .chatbot-close-btn:hover {
                    background: rgba(255, 215, 0, 0.3);
                    border-color: rgba(255, 215, 0, 0.5);
                    transform: rotate(90deg);
                }

                /* Messages Container */
                .chatbot-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    background: linear-gradient(to bottom, #FAFBFF 0%, #F0F3F8 100%);
                }

                .chatbot-messages::-webkit-scrollbar {
                    width: 8px;
                }

                .chatbot-messages::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 10px;
                }

                .chatbot-messages::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
                    border-radius: 10px;
                    box-shadow: 0 0 10px rgba(255, 107, 157, 0.3);
                }

                .chatbot-messages::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #FFA500 0%, #FF6B9D 100%);
                }

                /* Message Wrapper */
                .chatbot-message-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    animation: messageSlide 0.4s ease;
                }

                @keyframes messageSlide {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .chatbot-message-wrapper.user {
                    align-items: flex-end;
                }

                .chatbot-message-wrapper.bot {
                    align-items: flex-start;
                }

                /* Message Bubble */
                .chatbot-message {
                    padding: 14px 18px;
                    border-radius: 20px;
                    max-width: 85%;
                    font-size: 14px;
                    line-height: 1.6;
                    word-wrap: break-word;
                    font-weight: 500;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: default;
                }

                .chatbot-message.user {
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #1a1a2e;
                    border-radius: 20px 6px 20px 20px;
                    box-shadow: 0 8px 20px rgba(255, 215, 0, 0.2);
                    font-weight: 600;
                }

                .chatbot-message.user:hover {
                    background: linear-gradient(135deg, #FFA500 0%, #FF6B9D 100%);
                    color: white;
                    transform: translateX(-5px) scale(1.02);
                    box-shadow: 0 12px 30px rgba(255, 107, 157, 0.35);
                }

                .chatbot-message.bot {
                    background: white;
                    color: #1a1a2e;
                    border-radius: 6px 20px 20px 20px;
                    border: 1.5px solid rgba(255, 215, 0, 0.3);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                }

                .chatbot-message.bot:hover {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(138, 43, 226, 0.08) 100%);
                    border-color: #8A2BE2;
                    transform: translateX(5px) scale(1.02);
                    box-shadow: 0 8px 25px rgba(138, 43, 226, 0.2);
                    color: #8A2BE2;
                    font-weight: 600;
                }

                .chatbot-message.error {
                    background: linear-gradient(135deg, #FFE5E5 0%, #FFD4D4 100%);
                    color: #c41e3a;
                    border: 1.5px solid #FF6B6B;
                    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.2);
                }

                .chatbot-message.ai-thinking {
                    background: white;
                    border: 1.5px solid rgba(255, 215, 0, 0.3);
                    padding: 16px 18px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                }

                /* Typing Animation */
                .thinking-animation {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }

                .thinking-animation span {
                    width: 10px;
                    height: 10px;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    border-radius: 50%;
                    animation: bounce 1.4s infinite cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
                }

                .thinking-animation span:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .thinking-animation span:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
                    40% { transform: translateY(-12px) scale(1.1); opacity: 1; }
                }

                /* Timestamp */
                .chatbot-timestamp {
                    font-size: 10px;
                    color: #888;
                    padding: 0 4px;
                    font-weight: 500;
                }

                /* Input Form */
                .chatbot-form {
                    padding: 18px;
                    border-top: 2px solid rgba(255, 215, 0, 0.2);
                    background: linear-gradient(to bottom, #FAFBFF 0%, #F5F7FF 100%);
                }

                .chatbot-input-box {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    animation: slideUp 0.4s ease;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .chatbot-input {
                    flex: 1;
                    border: 2px solid rgba(255, 215, 0, 0.3);
                    border-radius: 26px;
                    padding: 12px 18px;
                    font-size: 14px;
                    outline: none;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    background: white;
                    color: #1a1a2e;
                    font-weight: 500;
                }

                .chatbot-input::placeholder {
                    color: #999;
                    font-weight: 500;
                }

                .chatbot-input:focus {
                    border-color: #FFD700;
                    background: #FFFEF0;
                    box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.15);
                    transform: translateY(-2px);
                }

                .chatbot-input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .chatbot-send-btn {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #1a1a2e;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    font-size: 20px;
                    font-weight: bold;
                    box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
                }

                .chatbot-send-btn:hover:not(:disabled) {
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 12px 30px rgba(255, 215, 0, 0.45);
                }

                .chatbot-send-btn:active:not(:disabled) {
                    transform: scale(0.93);
                }

                .chatbot-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Quick Starters */
                .chatbot-quick-starters {
                    padding: 16px 18px;
                    border-top: 2px solid rgba(255, 215, 0, 0.2);
                    background: linear-gradient(to bottom, #FFFEF0 0%, #FFF8E7 100%);
                }

                .quick-text {
                    font-size: 11px;
                    font-weight: 800;
                    color: #1a1a2e;
                    margin: 0 0 10px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .quick-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .quick-btn {
                    padding: 10px 14px;
                    background: white;
                    border: 2px solid rgba(255, 215, 0, 0.4);
                    border-radius: 14px;
                    font-size: 13px;
                    font-weight: 700;
                    color: #1a1a2e;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    text-align: left;
                }

                .quick-btn:hover {
                    background: linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(255, 215, 0, 0.15) 100%);
                    border-color: #8A2BE2;
                    color: #8A2BE2;
                    transform: translateX(6px) scale(1.03);
                    box-shadow: 0 6px 18px rgba(138, 43, 226, 0.25);
                    font-weight: 800;
                }

                .quick-btn:active {
                    transform: translateX(4px) scale(0.98);
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .chatbot-window {
                        width: calc(100vw - 20px);
                        height: calc(100vh - 80px);
                        max-height: calc(100vh - 80px);
                        bottom: 0;
                        right: 10px;
                        border-radius: 28px 28px 0 0;
                    }

                    .chatbot-bubble {
                        bottom: 20px;
                        right: 20px;
                        width: 85px;
                        height: 85px;
                    }

                    .chatbot-message {
                        max-width: 90%;
                    }
                }

                @media (max-width: 480px) {
                    .chatbot-window {
                        width: 100vw;
                        height: 100vh;
                        max-height: 100vh;
                        bottom: 0;
                        right: 0;
                        border-radius: 0;
                    }

                    .chatbot-bubble {
                        bottom: 20px;
                        right: 20px;
                        width: 80px;
                        height: 80px;
                    }

                    .chatbot-title {
                        font-size: 16px;
                    }

                    .chatbot-input-box {
                        gap: 8px;
                    }

                    .chatbot-send-btn {
                        width: 42px;
                        height: 42px;
                        font-size: 18px;
                    }
                }

                @media (max-width: 380px) {
                    .chatbot-bubble {
                        width: 75px;
                        height: 75px;
                        bottom: 16px;
                        right: 16px;
                    }
                }
            `}} />
        </>
    )
}
