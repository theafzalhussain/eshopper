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
            {/* 🤖 FLOATING CHAT BUBBLE */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="chatbot-bubble"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open chat"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90 }} exit={{ rotate: 90 }}>
                            <X size={24} />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ rotate: 90 }} exit={{ rotate: -90 }}>
                            <MessageCircle size={24} />
                        </motion.div>
                    )}
                </AnimatePresence>
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
                            <div className="chatbot-header-content">
                                <div className="chatbot-title-box">
                                    <h3 className="chatbot-title">Fashion Stylist AI</h3>
                                    <span className="chatbot-status">🟢 Online</span>
                                </div>
                                <p className="chatbot-subtitle">Powered by Gemini</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="chatbot-close-btn"
                                aria-label="Close chat"
                            >
                                <X size={20} />
                            </button>
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

            {/* 🎨 STYLES */}
            <style dangerouslySetInnerHTML={{ __html: `
                /* Floating Chat Bubble */
                .chatbot-bubble {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #17a2b8 0%, #0c7a8d 100%);
                    color: white;
                    border: none;
                    box-shadow: 0 8px 24px rgba(23, 162, 184, 0.35);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9998;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    font-size: 24px;
                }

                .chatbot-bubble:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 32px rgba(23, 162, 184, 0.5);
                }

                .chatbot-bubble:active {
                    transform: scale(0.95);
                }

                /* Chat Window */
                .chatbot-window {
                    position: fixed;
                    bottom: 100px;
                    right: 30px;
                    width: 420px;
                    max-height: 650px;
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                    display: flex;
                    flex-direction: column;
                    z-index: 9997;
                    overflow: hidden;
                    border: 1px solid #f0f0f0;
                }

                /* Header */
                .chatbot-header {
                    background: linear-gradient(135deg, #17a2b8 0%, #0c7a8d 100%);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 1px solid rgba(23, 162, 184, 0.3);
                }

                .chatbot-header-content {
                    flex: 1;
                }

                .chatbot-title-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .chatbot-title {
                    font-size: 16px;
                    font-weight: 800;
                    margin: 0;
                    letter-spacing: 0.5px;
                }

                .chatbot-status {
                    font-size: 12px;
                    font-weight: 600;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 4px 10px;
                    border-radius: 12px;
                    display: inline-block;
                }

                .chatbot-subtitle {
                    font-size: 12px;
                    opacity: 0.9;
                    margin: 0;
                    letter-spacing: 1px;
                    font-weight: 600;
                }

                .chatbot-close-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.3s;
                }

                .chatbot-close-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                /* Messages Container */
                .chatbot-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    background: #fafafa;
                }

                .chatbot-messages::-webkit-scrollbar {
                    width: 6px;
                }

                .chatbot-messages::-webkit-scrollbar-track {
                    background: transparent;
                }

                .chatbot-messages::-webkit-scrollbar-thumb {
                    background: #e0e0e0;
                    border-radius: 3px;
                }

                .chatbot-messages::-webkit-scrollbar-thumb:hover {
                    background: #c0c0c0;
                }

                /* Message Wrapper */
                .chatbot-message-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .chatbot-message-wrapper.user {
                    align-items: flex-end;
                }

                .chatbot-message-wrapper.bot {
                    align-items: flex-start;
                }

                /* Message Bubble */
                .chatbot-message {
                    padding: 12px 16px;
                    border-radius: 16px;
                    max-width: 85%;
                    font-size: 14px;
                    line-height: 1.5;
                    word-wrap: break-word;
                    animation: fadeIn 0.3s ease;
                }

                .chatbot-message.user {
                    background: linear-gradient(135deg, #17a2b8 0%, #0c7a8d 100%);
                    color: white;
                    border-radius: 16px 4px 16px 16px;
                    font-weight: 500;
                }

                .chatbot-message.bot {
                    background: white;
                    color: #333;
                    border-radius: 4px 16px 16px 16px;
                    border: 1px solid #e0e0e0;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .chatbot-message.error {
                    background: #ffe5e5;
                    color: #d32f2f;
                    border: 1px solid #ffcdd2;
                }

                .chatbot-message.ai-thinking {
                    background: white;
                    border: 1px solid #e0e0e0;
                    padding: 14px 16px;
                }

                /* Typing Animation */
                .thinking-animation {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                }

                .thinking-animation span {
                    width: 8px;
                    height: 8px;
                    background: #17a2b8;
                    border-radius: 50%;
                    animation: bounce 1.4s infinite;
                }

                .thinking-animation span:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .thinking-animation span:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.7; }
                    40% { transform: translateY(-8px); opacity: 1; }
                }

                /* Timestamp */
                .chatbot-timestamp {
                    font-size: 11px;
                    color: #999;
                    padding: 0 4px;
                }

                /* Input Form */
                .chatbot-form {
                    padding: 16px;
                    border-top: 1px solid #e0e0e0;
                    background: white;
                }

                .chatbot-input-box {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .chatbot-input {
                    flex: 1;
                    border: 1px solid #e0e0e0;
                    border-radius: 24px;
                    padding: 10px 16px;
                    font-size: 14px;
                    outline: none;
                    transition: all 0.3s;
                    background: #f8f9fa;
                }

                .chatbot-input:focus {
                    border-color: #17a2b8;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(23, 162, 184, 0.1);
                }

                .chatbot-input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .chatbot-send-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #17a2b8 0%, #0c7a8d 100%);
                    color: white;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                    font-size: 18px;
                }

                .chatbot-send-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(23, 162, 184, 0.35);
                }

                .chatbot-send-btn:active:not(:disabled) {
                    transform: scale(0.95);
                }

                .chatbot-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Quick Starters */
                .chatbot-quick-starters {
                    padding: 12px 16px;
                    border-top: 1px solid #e0e0e0;
                    background: #f8f9fa;
                }

                .quick-text {
                    font-size: 11px;
                    font-weight: 700;
                    color: #666;
                    margin: 0 0 8px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .quick-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .quick-btn {
                    padding: 8px 12px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #333;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-align: left;
                }

                .quick-btn:hover {
                    background: #f0f7f8;
                    border-color: #17a2b8;
                    color: #17a2b8;
                }

                /* Animations */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .chatbot-window {
                        width: 100%;
                        height: 100vh;
                        max-height: 100vh;
                        bottom: 0;
                        right: 0;
                        border-radius: 0;
                    }

                    .chatbot-bubble {
                        bottom: 20px;
                        right: 20px;
                    }

                    .chatbot-message {
                        max-width: 90%;
                    }
                }

                @media (max-width: 480px) {
                    .chatbot-window {
                        width: 100%;
                        max-height: 100vh;
                    }

                    .chatbot-title {
                        font-size: 14px;
                    }

                    .chatbot-input-box {
                        gap: 6px;
                    }

                    .chatbot-send-btn {
                        width: 36px;
                        height: 36px;
                        font-size: 16px;
                    }
                }
            `}} />
        </>
    )
}
