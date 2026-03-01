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
                /* ===== PREMIUM CHATBOT MASTER ===== */
                .chatbot-master-wrapper { 
                    position: fixed; bottom: 32px; right: 32px; z-index: 9999; 
                    font-family: 'Inter', 'Segoe UI', sans-serif;
                }
                
                /* ===== PREMIUM ANIMATED BUBBLE ===== */
                .chatbot-bubble {
                    width: 76px; height: 76px; border-radius: 50%; 
                    background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #000 100%);
                    border: 2.5px solid #FFD700;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; 
                    color: #FFD700; 
                    box-shadow: 
                        0 0 40px rgba(255, 215, 0, 0.4),
                        0 15px 40px rgba(0, 0, 0, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                }

                .chatbot-bubble:hover {
                    transform: translateY(-8px) scale(1.08);
                    box-shadow: 
                        0 0 60px rgba(255, 215, 0, 0.6),
                        0 20px 50px rgba(0, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15);
                }

                .chatbot-bubble:active {
                    transform: scale(0.92);
                }

                .chatbot-bubble.active {
                    background: linear-gradient(135deg, #333 0%, #1a1a1a 100%);
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
                    width: min(380px, calc(100vw - 40px)); 
                    height: min(540px, calc(100vh - 150px));
                    background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
                    border-radius: 32px; display: flex; flex-direction: column;
                    overflow: hidden; 
                    border: 2px solid rgba(255, 215, 0, 0.3);
                    box-shadow: 
                        0 0 80px rgba(255, 215, 0, 0.2),
                        0 30px 80px rgba(0, 0, 0, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(8px);
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
                }

                .chat-header::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
                }

                .header-info { display: flex; align-items: center; gap: 14px; }
                .status-dot { 
                    width: 10px; height: 10px; background: #00D9FF; border-radius: 50%; 
                    box-shadow: 0 0 15px #00D9FF, 0 0 30px rgba(0, 217, 255, 0.4);
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse { 0%, 100% { box-shadow: 0 0 15px #00D9FF, 0 0 30px rgba(0, 217, 255, 0.4); } 50% { box-shadow: 0 0 8px #00D9FF, 0 0 15px rgba(0, 217, 255, 0.2); } }

                .header-info h4 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
                .header-info span { 
                    font-size: 10px; color: #FFD700; text-transform: uppercase; 
                    letter-spacing: 1.5px; font-weight: 700;
                }

                .header-icon-glow {
                    animation: iconGlow 2s ease-in-out infinite;
                }

                @keyframes iconGlow { 
                    0%, 100% { color: #FFD700; filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6)); }
                    50% { color: #FFA500; filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.8)); }
                }

                /* ===== PREMIUM CHAT BODY ===== */
                .chat-body { 
                    flex: 1; overflow-y: auto; padding: 20px; 
                    background: linear-gradient(to bottom, #FAFAFA 0%, #F8F8F8 100%);
                    display: flex; flex-direction: column; gap: 14px;
                }

                .chat-body::-webkit-scrollbar { width: 6px; }
                .chat-body::-webkit-scrollbar-track { background: transparent; }
                .chat-body::-webkit-scrollbar-thumb { 
                    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
                    border-radius: 10px; box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
                }

                .msg-row { display: flex; flex-direction: column; max-width: 85%; animation: slideIn 0.3s ease; }
                .msg-row.user { align-self: flex-end; align-items: flex-end; }
                .msg-row.bot { align-self: flex-start; }

                @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                /* ===== MESSAGE BUBBLES - PREMIUM ===== */
                .msg-bubble { 
                    padding: 13px 17px; border-radius: 20px; font-size: 13px; 
                    line-height: 1.6; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: default; font-weight: 500;
                }
                .msg-bubble.user { 
                    background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
                    color: #FFD700; border-bottom-right-radius: 4px;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                    font-weight: 600;
                }
                .msg-bubble.user:hover {
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
                    transform: translateY(-2px);
                }

                .msg-bubble.bot { 
                    background: white; color: #222; border: 1.5px solid rgba(255, 215, 0, 0.2); 
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                }
                .msg-bubble.bot:hover {
                    border-color: rgba(255, 215, 0, 0.4);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
                    transform: translateY(-2px);
                }

                .msg-time { font-size: 9px; color: #999; margin-top: 5px; letter-spacing: 0.3px; }

                /* ===== THINKING ANIMATION ===== */
                .thinking span { 
                    width: 7px; height: 7px; background: linear-gradient(135deg, #FFD700, #FFA500);
                    display: inline-block; border-radius: 50%; margin: 0 3px; 
                    animation: typingBounce 1.4s infinite cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
                }
                .thinking span:nth-child(2) { animation-delay: 0.2s; }
                .thinking span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typingBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-10px); opacity: 1; } }

                /* ===== PREMIUM FOOTER ===== */
                .chat-footer { 
                    padding: 16px; border-top: 2px solid rgba(255, 215, 0, 0.2); 
                    display: flex; gap: 10px;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 215, 0, 0.02));
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

                .chat-footer button { 
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #111; border: none; width: 42px; height: 42px; border-radius: 50%; 
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold;
                }
                .chat-footer button:hover:not(:disabled) { 
                    transform: translateY(-4px) scale(1.08);
                    box-shadow: 0 12px 30px rgba(255, 215, 0, 0.5);
                }
                .chat-footer button:active:not(:disabled) { transform: scale(0.92); }
                .chat-footer button:disabled { opacity: 0.4; cursor: not-allowed; }

                /* ===== FULLY RESPONSIVE DESIGN ===== */
                @media (max-width: 1200px) {
                    .chatbot-master-wrapper { bottom: 28px; right: 28px; }
                    .chatbot-bubble { width: 72px; height: 72px; }
                    .chatbot-card { width: min(370px, calc(100vw - 35px)); height: min(520px, calc(100vh - 140px)); }
                }

                @media (max-width: 768px) {
                    .chatbot-master-wrapper { bottom: 24px; right: 24px; }
                    .chatbot-bubble { width: 68px; height: 68px; }
                    .chatbot-card { 
                        width: min(360px, calc(100vw - 30px)); 
                        height: min(500px, calc(100vh - 130px));
                        bottom: 90px;
                        border-radius: 28px;
                    }
                    .chat-header { padding: 18px 20px; }
                    .header-info h4 { font-size: 14px; }
                    .header-info span { font-size: 9px; }
                    .chat-body { padding: 16px; gap: 12px; }
                    .msg-bubble { padding: 11px 15px; font-size: 12px; }
                    .chat-footer { padding: 14px; gap: 8px; }
                    .chat-footer input { font-size: 12px; padding: 9px 14px; }
                    .chat-footer button { width: 39px; height: 39px; }
                }

                @media (max-width: 640px) {
                    .chatbot-master-wrapper { bottom: 20px; right: 20px; }
                    .chatbot-bubble { width: 64px; height: 64px; }
                    .chatbot-card { 
                        width: min(92vw, 340px); 
                        height: min(480px, calc(100vh - 120px));
                        bottom: 85px; border-radius: 26px;
                    }
                    .chat-header { padding: 16px 18px; }
                    .header-info { gap: 12px; }
                    .header-info h4 { font-size: 13px; }
                    .status-dot { width: 8px; height: 8px; }
                    .msg-row { max-width: 88%; }
                    .msg-bubble { padding: 10px 14px; font-size: 12px; }
                    .thinking span { width: 6px; height: 6px; }
                }

                @media (max-width: 480px) {
                    .chatbot-master-wrapper { bottom: 16px; right: 16px; }
                    .chatbot-bubble { width: 60px; height: 60px; bottom: 12px; right: 12px; }
                    .chatbot-card { 
                        position: fixed; 
                        width: 95vw; height: 85vh;
                        bottom: 20px; right: 2.5%; left: 2.5%;
                        border-radius: 24px;
                    }
                    .chat-header { padding: 14px 16px; }
                    .header-info h4 { font-size: 12px; }
                    .header-info span { font-size: 8px; letter-spacing: 1px; }
                    .chat-body { padding: 12px; gap: 10px; }
                    .msg-row { max-width: 90%; }
                    .msg-bubble { padding: 9px 12px; font-size: 11px; }
                    .chat-footer { padding: 12px; }
                    .chat-footer input { font-size: 11px; padding: 8px 12px; }
                    .chat-footer button { width: 36px; height: 36px; }
                    .chatbot-bubble.active { display: none; }
                }

                @media (max-width: 380px) {
                    .chatbot-master-wrapper { bottom: 12px; right: 12px; }
                    .chatbot-bubble { width: 56px; height: 56px; }
                    .chatbot-card { 
                        width: 98vw; height: 82vh;
                        border-radius: 20px;
                    }
                    .chat-header { padding: 12px 14px; }
                    .header-info { gap: 10px; }
                    .header-info h4 { font-size: 11px; }
                    .header-info span { font-size: 7px; }
                    .chat-body { padding: 10px; }
                    .msg-bubble { padding: 8px 11px; font-size: 10px; }
                    .msg-time { font-size: 8px; }
                    .chat-footer { padding: 10px; gap: 8px; }
                    .chat-footer input { font-size: 10px; padding: 7px 10px; }
                    .chat-footer button { width: 34px; height: 34px; font-size: 14px; }
                }

                /* LANDSCAPE OPTIMIZATION */
                @media (max-height: 600px) and (orientation: landscape) {
                    .chatbot-card { height: 90vh; }
                    .chat-header { padding: 12px 16px; }
                    .chat-body { padding: 12px; }
                }
            `}} />
        </div>
    )
}