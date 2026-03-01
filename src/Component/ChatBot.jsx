import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2, Sparkles } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../constants'

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hello Afzal! I'm your AI Stylist. Looking for something specific in our Luxe collection?",
            sender: "bot",
            timestamp: new Date(),
        }
    ])
    const [inputValue, setInputValue] = useState("")
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!inputValue.trim() || loading) return

        const userMessage = {
            id: Date.now(),
            text: inputValue.trim(),
            sender: "user",
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        const userPrompt = inputValue.trim()
        setInputValue("")
        setLoading(true)

        try {
            const response = await axios.post(`${BASE_URL}/api/chat`, {
                prompt: userPrompt,
                history: messages.filter(m => m.sender !== "error").map(m => ({
                    role: m.sender === 'bot' ? 'model' : 'user',
                    parts: [{ text: m.text }]
                }))
            })

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: response.data.text,
                sender: "bot",
                timestamp: new Date()
            }])
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "AI service is adjusting. Please try in a moment.",
                sender: "error",
                timestamp: new Date()
            }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="chatbot-master-wrapper">
            {/* 🤖 FLOATING BUBBLE WITH LIVE ROBOT */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`chatbot-bubble ${isOpen ? 'active' : ''}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
                            <X size={28} />
                        </motion.div>
                    ) : (
                        <motion.div key="bot" className="robot-svg-box">
                            {/* PREMIUM ANIMATED ROBOT SVG */}
                            <svg width="45" height="45" viewBox="0 0 42 42" fill="none">
                                <rect x="8" y="7" width="26" height="18" rx="3" fill="#111" stroke="#FFD700" strokeWidth="1.5"/>
                                <motion.circle cx="15" cy="15" r="2" fill="#00D9FF" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}/>
                                <motion.circle cx="27" cy="15" r="2" fill="#00D9FF" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}/>
                                <path d="M 15 21 Q 21 24 27 21" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round"/>
                                <rect x="12" y="25" width="18" height="10" rx="2" fill="#111" stroke="#FFD700" strokeWidth="1.5"/>
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* 💬 CHAT CARD - PREMIUM RESPONSIVE UI */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="chatbot-card shadow-premium"
                        initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
                    >
                        <div className="chat-header">
                            <div className="header-info">
                                <div className="status-dot"></div>
                                <div>
                                    <h4>Luxe Stylist AI</h4>
                                    <span>Boutique Expert • Online</span>
                                </div>
                            </div>
                            <Sparkles size={18} className="header-icon-glow" />
                        </div>

                        <div className="chat-body">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`msg-row ${msg.sender}`}>
                                    <div className={`msg-bubble ${msg.sender}`}>
                                        {msg.text}
                                    </div>
                                    <span className="msg-time">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                            {loading && (
                                <div className="msg-row bot">
                                    <div className="msg-bubble bot thinking">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="chat-footer">
                            <input
                                type="text"
                                placeholder="Style advice..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                            <button type="submit" disabled={!inputValue.trim()}>
                                <Send size={18} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                .chatbot-master-wrapper { position: fixed; bottom: 30px; right: 30px; z-index: 9999; font-family: 'Inter', sans-serif; }
                
                .chatbot-bubble {
                    width: 70px; height: 70px; border-radius: 50%; background: #111; 
                    border: 2px solid #FFD700; cursor: pointer; display: flex; align-items: center; 
                    justify-content: center; color: #FFD700; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .chatbot-card {
                    position: absolute; bottom: 85px; right: 0; width: 350px; height: 500px;
                    background: white; border-radius: 25px; display: flex; flex-direction: column;
                    overflow: hidden; border: 1px solid #eee;
                }

                .chat-header {
                    background: #111; color: white; padding: 20px; display: flex; 
                    justify-content: space-between; align-items: center; border-bottom: 2px solid #FFD700;
                }

                .header-info { display: flex; align-items: center; gap: 12px; }
                .status-dot { width: 8px; height: 8px; background: #28a745; border-radius: 50%; box-shadow: 0 0 10px #28a745; }
                .header-info h4 { margin: 0; font-size: 15px; font-weight: 700; }
                .header-info span { font-size: 10px; color: #FFD700; text-transform: uppercase; letter-spacing: 1px; }

                .chat-body { flex: 1; overflow-y: auto; padding: 20px; background: #fafafa; display: flex; flex-direction: column; gap: 15px; }
                .msg-row { display: flex; flex-direction: column; max-width: 80%; }
                .msg-row.user { align-self: flex-end; align-items: flex-end; }
                .msg-row.bot { align-self: flex-start; }

                .msg-bubble { padding: 12px 16px; border-radius: 18px; font-size: 13.5px; line-height: 1.5; }
                .msg-bubble.user { background: #111; color: white; border-bottom-right-radius: 4px; }
                .msg-bubble.bot { background: white; color: #333; border: 1px solid #ddd; border-bottom-left-radius: 4px; }
                .msg-time { font-size: 9px; color: #999; margin-top: 4px; }

                .chat-footer { padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px; }
                .chat-footer input { flex: 1; border: 1px solid #ddd; border-radius: 50px; padding: 10px 15px; font-size: 13px; outline: none; }
                .chat-footer button { background: #111; color: #FFD700; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; transition: 0.3s; }
                .chat-footer button:disabled { opacity: 0.3; }

                .thinking span { width: 6px; height: 6px; background: #999; display: inline-block; border-radius: 50%; margin: 0 2px; animation: bounce 1.4s infinite; }
                .thinking span:nth-child(2) { animation-delay: 0.2s; }
                .thinking span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

                /* 📱 MOBILE RESPONSIVE LOGIC */
                @media (max-width: 480px) {
                    .chatbot-master-wrapper { right: 15px; bottom: 15px; }
                    .chatbot-card { fixed; bottom: 0; right: 0; left: 0; width: 100vw; height: 100vh; border-radius: 0; }
                    .chatbot-bubble { width: 60px; height: 60px; }
                    .chatbot-bubble.active { display: none; } /* Hide bubble when full-screen chat is open on mobile */
                }
            `}} />
        </div>
    )
}