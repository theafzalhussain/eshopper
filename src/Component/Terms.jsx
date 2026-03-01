import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Shield, Truck, Users, RefreshCw, Lock, Zap } from 'lucide-react'

export default function Terms({ isOpen, onClose }) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.3 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: 'easeOut' }
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* BACKDROP */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="terms-backdrop"
                    />

                    {/* MODAL */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 30 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="terms-modal"
                    >
                        {/* HEADER */}
                        <motion.div 
                            className="terms-header"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="terms-header-badge">✨ LEGAL</div>
                            <h1 className="terms-main-title">Terms & Conditions</h1>
                            <p className="terms-subtitle">Eshopperr Luxury AI Fashion Boutique</p>
                            <div className="terms-header-divider"></div>
                            <motion.button 
                                onClick={onClose} 
                                className="terms-close-btn"
                                whileHover={{ rotate: 90, scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <X size={24} />
                            </motion.button>
                        </motion.div>

                        {/* CONTENT */}
                        <motion.div 
                            className="terms-content"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* SECTION 1 */}
                            <motion.div className="terms-section" variants={itemVariants}>
                                <div className="terms-section-header">
                                    <Zap className="terms-icon" size={24} />
                                    <h2 className="terms-heading">Our Commitment to Excellence</h2>
                                </div>
                                <p className="terms-text">
                                    At <span className="brand-text">Eshopperr</span>, we ensure that every product listed meets the highest standards of quality, authenticity, and craftsmanship. Our AI-powered curation system guarantees exclusivity and superior design in every collection.
                                </p>
                            </motion.div>

                            {/* SECTION 2 */}
                            <motion.div className="terms-section" variants={itemVariants}>
                                <div className="terms-section-header">
                                    <Truck className="terms-icon" size={24} />
                                    <h2 className="terms-heading">Premium Shipping & Logistics</h2>
                                </div>
                                <p className="terms-text">
                                    We provide white-glove shipping services with real-time tracking. Each luxury item is automatically insured and handled by our premium courier network ensuring pristine, on-time delivery to your doorstep.
                                </p>
                            </motion.div>

                            {/* SECTION 3 */}
                            <motion.div className="terms-section" variants={itemVariants}>
                                <div className="terms-section-header">
                                    <Users className="terms-icon" size={24} />
                                    <h2 className="terms-heading">24/7 Concierge Support</h2>
                                </div>
                                <p className="terms-text">
                                    Your satisfaction is our priority. Our dedicated luxury concierge team is available round-the-clock for order assistance, styling advice, or any customer service inquiries. We respond within 2 hours, guaranteed.
                                </p>
                            </motion.div>

                            {/* SECTION 4 */}
                            <motion.div className="terms-section" variants={itemVariants}>
                                <div className="terms-section-header">
                                    <RefreshCw className="terms-icon" size={24} />
                                    <h2 className="terms-heading">Hassle-Free Returns & Exchanges</h2>
                                </div>
                                <p className="terms-text">
                                    Enjoy our 30-day, no-questions-asked return policy on all items in original, unused condition with tags intact. Premium members receive complimentary return shipping and instant refunds within 5 business days.
                                </p>
                            </motion.div>

                            {/* SECTION 5 */}
                            <motion.div className="terms-section" variants={itemVariants}>
                                <div className="terms-section-header">
                                    <Lock className="terms-icon" size={24} />
                                    <h2 className="terms-heading">Privacy & Data Security</h2>
                                </div>
                                <p className="terms-text">
                                    We employ enterprise-grade encryption and comply with international data protection standards. Your personal information is treated with absolute confidentiality and is never shared with unauthorized third parties.
                                </p>
                            </motion.div>

                            {/* SECTION 6 */}
                            <motion.div className="terms-section terms-section-last" variants={itemVariants}>
                                <div className="terms-section-header">
                                    <Shield className="terms-icon" size={24} />
                                    <h2 className="terms-heading">100% Authenticity Guarantee</h2>
                                </div>
                                <p className="terms-text">
                                    Every product on <span className="brand-text">Eshopperr</span> is certified authentic. We source exclusively from authorized luxury designers and provide authentic certificates for high-value items. Money-back guarantee if authenticity is questioned.
                                </p>
                            </motion.div>
                        </motion.div>

                        {/* FOOTER */}
                        <motion.div 
                            className="terms-footer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <motion.button 
                                onClick={onClose} 
                                className="terms-accept-btn"
                                whileHover={{ scale: 1.05, y: -3 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <CheckCircle size={18} />
                                <span>I Accept Terms & Conditions</span>
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                /* ====== PREMIUM BACKDROP ====== */
                .terms-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(26, 26, 46, 0.8) 100%);
                    backdrop-filter: blur(12px);
                    z-index: 1000;
                    animation: backdropFade 0.4s ease-out;
                }

                @keyframes backdropFade {
                    from { opacity: 0; backdrop-filter: blur(0px); }
                    to { opacity: 1; backdrop-filter: blur(12px); }
                }

                /* ====== PREMIUM MODAL CONTAINER ====== */
                .terms-modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90%;
                    max-width: 800px;
                    max-height: 88vh;
                    background: linear-gradient(to bottom, #FFFFFF 0%, #F5F7FF 100%);
                    border-radius: 40px;
                    box-shadow: 
                        0 40px 120px rgba(0, 0, 0, 0.25),
                        0 15px 50px rgba(255, 215, 0, 0.15),
                        inset 0 1px 1px rgba(255, 255, 255, 0.8);
                    overflow: hidden;
                    z-index: 1001;
                    display: flex;
                    flex-direction: column;
                    border: 2px solid rgba(255, 215, 0, 0.25);
                    backdrop-filter: blur(10px);
                }

                /* ====== PREMIUM HEADER ====== */
                .terms-header {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    color: white;
                    padding: 50px 40px;
                    position: relative;
                    border-bottom: 3px solid #FFD700;
                    text-align: center;
                    overflow: hidden;
                }

                .terms-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.08) 50%, transparent 70%);
                    animation: shimmerWave 3s infinite;
                    pointer-events: none;
                }

                @keyframes shimmerWave {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .terms-header-badge {
                    display: inline-block;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #1a1a2e;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    margin-bottom: 16px;
                    text-transform: uppercase;
                    box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
                    position: relative;
                    z-index: 1;
                }

                .terms-main-title {
                    font-size: 42px;
                    font-weight: 900;
                    letter-spacing: 3px;
                    margin: 0;
                    text-transform: uppercase;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B9D 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 12px;
                    position: relative;
                    z-index: 1;
                }

                .terms-subtitle {
                    font-size: 14px;
                    color: #FFD700;
                    font-weight: 700;
                    letter-spacing: 2.5px;
                    margin: 0 0 16px 0;
                    text-transform: uppercase;
                    position: relative;
                    z-index: 1;
                }

                .terms-header-divider {
                    position: relative;
                    z-index: 1;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #FFD700, #FF6B9D, transparent);
                    margin: 16px 0 0 0;
                    border-radius: 1px;
                }

                .terms-close-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 107, 157, 0.2) 100%);
                    border: 2px solid rgba(255, 215, 0, 0.4);
                    color: #FFD700;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    z-index: 10;
                    font-weight: bold;
                }

                .terms-close-btn:hover {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 107, 157, 0.3) 100%);
                    border-color: rgba(255, 215, 0, 0.8);
                }

                /* ====== PREMIUM CONTENT ====== */
                .terms-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 45px 45px;
                    background: linear-gradient(to bottom, #FFFFFF 0%, #F5F7FF 50%, #F0F3F8 100%);
                    scroll-behavior: smooth;
                }

                .terms-content::-webkit-scrollbar {
                    width: 10px;
                }

                .terms-content::-webkit-scrollbar-track {
                    background: linear-gradient(180deg, rgba(255, 215, 0, 0.05) 0%, rgba(0, 0, 0, 0.05) 100%);
                    border-radius: 10px;
                }

                .terms-content::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF6B9D 100%);
                    border-radius: 10px;
                    box-shadow: 0 0 15px rgba(255, 107, 157, 0.3);
                }

                .terms-content::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #FFA500 0%, #FF6B9D 100%);
                }

                /* ====== SECTION STYLES ====== */
                .terms-section {
                    margin-bottom: 40px;
                    padding: 25px 25px 30px 25px;
                    background: white;
                    border-radius: 20px;
                    border: 1.5px solid rgba(255, 215, 0, 0.2);
                    border-left: 4px solid #FFD700;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
                }

                .terms-section:hover {
                    transform: translateX(8px);
                    border-left-color: #FF6B9D;
                    box-shadow: 0 10px 35px rgba(255, 107, 157, 0.15);
                }

                .terms-section-last {
                    margin-bottom: 0;
                }

                .terms-section-header {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 14px;
                }

                .terms-icon {
                    color: #FFD700;
                    flex-shrink: 0;
                    filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.2));
                }

                .terms-heading {
                    font-size: 18px;
                    font-weight: 900;
                    color: #1a1a2e;
                    margin: 0;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                }

                .brand-text {
                    background: linear-gradient(135deg, #FFD700 0%, #FF6B9D 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                }

                .terms-text {
                    font-size: 14px;
                    line-height: 1.9;
                    color: #555;
                    margin: 0;
                    font-weight: 500;
                    letter-spacing: 0.4px;
                }

                /* ====== PREMIUM FOOTER ====== */
                .terms-footer {
                    background: linear-gradient(135deg, #FAFBFF 0%, #F5F7FF 100%);
                    padding: 30px 45px;
                    border-top: 2px solid rgba(255, 215, 0, 0.2);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                }

                .terms-accept-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B9D 100%);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    padding: 16px 40px;
                    border-radius: 30px;
                    font-weight: 900;
                    font-size: 14px;
                    letter-spacing: 1.2px;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    text-transform: uppercase;
                    box-shadow: 0 12px 35px rgba(255, 215, 0, 0.4);
                }

                .terms-accept-btn:hover {
                    transform: translateY(-5px) scale(1.02);
                    box-shadow: 0 18px 50px rgba(255, 107, 157, 0.5);
                    background: linear-gradient(135deg, #FFA500 0%, #FF6B9D 50%, #FFD700 100%);
                    border-color: rgba(255, 255, 255, 0.6);
                }

                .terms-accept-btn:active {
                    transform: translateY(-2px) scale(0.98);
                }

                /* ====== RESPONSIVE DESIGN ====== */
                @media (max-width: 768px) {
                    .terms-modal {
                        width: 95%;
                        max-height: 90vh;
                        border-radius: 32px;
                    }

                    .terms-header {
                        padding: 35px 25px;
                    }

                    .terms-main-title {
                        font-size: 32px;
                        letter-spacing: 2px;
                    }

                    .terms-subtitle {
                        font-size: 12px;
                        letter-spacing: 1.5px;
                    }

                    .terms-close-btn {
                        width: 45px;
                        height: 45px;
                    }

                    .terms-content {
                        padding: 30px 25px;
                    }

                    .terms-section {
                        margin-bottom: 30px;
                        padding: 20px 20px 25px 20px;
                    }

                    .terms-heading {
                        font-size: 16px;
                    }

                    .terms-text {
                        font-size: 13px;
                        line-height: 1.8;
                    }

                    .terms-footer {
                        padding: 24px 25px;
                    }

                    .terms-accept-btn {
                        padding: 14px 30px;
                        font-size: 12px;
                    }
                }

                @media (max-width: 480px) {
                    .terms-modal {
                        width: 98%;
                        border-radius: 24px;
                    }

                    .terms-header {
                        padding: 25px 18px;
                    }

                    .terms-header-badge {
                        font-size: 10px;
                        padding: 6px 12px;
                        margin-bottom: 12px;
                    }

                    .terms-main-title {
                        font-size: 24px;
                        letter-spacing: 1px;
                        margin-bottom: 8px;
                    }

                    .terms-subtitle {
                        font-size: 11px;
                        letter-spacing: 1px;
                    }

                    .terms-close-btn {
                        width: 40px;
                        height: 40px;
                        top: 15px;
                        right: 15px;
                    }

                    .terms-content {
                        padding: 20px 16px;
                    }

                    .terms-section {
                        margin-bottom: 20px;
                        padding: 16px 14px 20px 14px;
                        border-radius: 16px;
                    }

                    .terms-section-header {
                        gap: 10px;
                        margin-bottom: 10px;
                    }

                    .terms-icon {
                        width: 20px;
                        height: 20px;
                    }

                    .terms-heading {
                        font-size: 14px;
                        letter-spacing: 0.5px;
                    }

                    .terms-text {
                        font-size: 12px;
                        line-height: 1.7;
                        letter-spacing: 0.2px;
                    }

                    .terms-footer {
                        padding: 18px 16px;
                    }

                    .terms-accept-btn {
                        padding: 12px 24px;
                        font-size: 11px;
                        letter-spacing: 0.8px;
                        gap: 8px;
                    }

                    .terms-accept-btn svg {
                        width: 16px;
                        height: 16px;
                    }
                }
            `}} />
        </AnimatePresence>
    )
}
