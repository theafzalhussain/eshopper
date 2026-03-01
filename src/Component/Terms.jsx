import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Terms({ isOpen, onClose }) {
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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="terms-modal"
                    >
                        {/* HEADER */}
                        <div className="terms-header">
                            <h1 className="terms-main-title">Terms & Conditions</h1>
                            <p className="terms-subtitle">eShopper Boutique Luxe</p>
                            <button onClick={onClose} className="terms-close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="terms-content">
                            {/* SECTION 1 */}
                            <div className="terms-section">
                                <h2 className="terms-heading">🏆 Our Commitment to Luxury</h2>
                                <p className="terms-text">
                                    At eShopper Boutique Luxe, we ensure that every product listed meets the highest standards of quality and craftsmanship. Our curated collection represents exclusivity and superior design.
                                </p>
                            </div>

                            {/* SECTION 2 */}
                            <div className="terms-section">
                                <h2 className="terms-heading">📦 White-Glove Shipping & Handling</h2>
                                <p className="terms-text">
                                    We take utmost care in packaging your luxury items to ensure they arrive in pristine condition. All shipments are insured and handled by our premium courier partners for a seamless delivery experience.
                                </p>
                            </div>

                            {/* SECTION 3 */}
                            <div className="terms-section">
                                <h2 className="terms-heading">👑 Concierge Support</h2>
                                <p className="terms-text">
                                    Your satisfaction is paramount. Our dedicated luxury concierge team is available 24/7 to assist you with inquiries, styling advice, or assistance with your orders.
                                </p>
                            </div>

                            {/* SECTION 4 */}
                            <div className="terms-section">
                                <h2 className="terms-heading">✨ Hassle-Free Returns & Exchanges</h2>
                                <p className="terms-text">
                                    We offer a 7-day, no-questions-asked return policy for all items, provided they are in their original, unused condition with all tags attached. Returns are complimentary for our registered members.
                                </p>
                            </div>

                            {/* SECTION 5 */}
                            <div className="terms-section">
                                <h2 className="terms-heading">🔒 Privacy & Data Integrity</h2>
                                <p className="terms-text">
                                    We treat your personal information with the highest level of security and confidentiality. Your data is used exclusively to enhance your shopping experience and will never be shared with unauthorized third parties.
                                </p>
                            </div>

                            {/* SECTION 6 */}
                            <div className="terms-section">
                                <h2 className="terms-heading">💎 Authenticity Guarantee</h2>
                                <p className="terms-text">
                                    We guarantee that all products sold on eShopper Boutique Luxe are 100% authentic and sourced directly from reputable luxury designers and manufacturers.
                                </p>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="terms-footer">
                            <button onClick={onClose} className="terms-accept-btn">
                                I Understand & Accept
                            </button>
                        </div>
                    </motion.div>
                </>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .terms-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    z-index: 1000;
                }

                .terms-modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90%;
                    max-width: 700px;
                    max-height: 85vh;
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                    border-radius: 30px;
                    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.3), 
                                0 0 60px rgba(23, 162, 184, 0.2);
                    overflow: hidden;
                    z-index: 1001;
                    display: flex;
                    flex-direction: column;
                    border: 2px solid rgba(212, 175, 55, 0.3);
                }

                .terms-header {
                    background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
                    color: white;
                    padding: 40px 30px;
                    position: relative;
                    border-bottom: 3px solid #d4af37;
                    text-align: center;
                }

                .terms-main-title {
                    font-size: 32px;
                    font-weight: 900;
                    letter-spacing: 3px;
                    margin: 0;
                    text-transform: uppercase;
                    background: linear-gradient(135deg, #d4af37 0%, #ffffff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 8px;
                }

                .terms-subtitle {
                    font-size: 14px;
                    color: #d4af37;
                    font-weight: 700;
                    letter-spacing: 2px;
                    margin: 0;
                    text-transform: uppercase;
                }

                .terms-close-btn {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: rgba(212, 175, 55, 0.2);
                    border: none;
                    color: #d4af37;
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 2px solid rgba(212, 175, 55, 0.4);
                }

                .terms-close-btn:hover {
                    background: rgba(212, 175, 55, 0.3);
                    transform: rotate(90deg) scale(1.1);
                    border-color: #d4af37;
                }

                .terms-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 40px 30px;
                    background: white;
                }

                .terms-content::-webkit-scrollbar {
                    width: 8px;
                }

                .terms-content::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }

                .terms-content::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #d4af37, #17a2b8);
                    border-radius: 10px;
                }

                .terms-content::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #17a2b8, #d4af37);
                }

                .terms-section {
                    margin-bottom: 35px;
                    padding-bottom: 25px;
                    border-bottom: 1px solid rgba(212, 175, 55, 0.2);
                }

                .terms-section:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }

                .terms-heading {
                    font-size: 18px;
                    font-weight: 900;
                    color: #111;
                    margin: 0 0 12px 0;
                    letter-spacing: 1px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-transform: uppercase;
                }

                .terms-heading::before {
                    content: '';
                    width: 4px;
                    height: 20px;
                    background: linear-gradient(180deg, #d4af37, #17a2b8);
                    border-radius: 2px;
                }

                .terms-text {
                    font-size: 14px;
                    line-height: 1.8;
                    color: #555;
                    margin: 0;
                    font-weight: 500;
                    letter-spacing: 0.3px;
                }

                .terms-footer {
                    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                    padding: 25px 30px;
                    border-top: 2px solid rgba(212, 175, 55, 0.2);
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                }

                .terms-accept-btn {
                    background: linear-gradient(135deg, #d4af37 0%, #c99e1f 100%);
                    color: white;
                    border: none;
                    padding: 14px 40px;
                    border-radius: 25px;
                    font-weight: 800;
                    font-size: 13px;
                    letter-spacing: 1.5px;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    text-transform: uppercase;
                    box-shadow: 0 5px 20px rgba(212, 175, 55, 0.3);
                }

                .terms-accept-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 30px rgba(212, 175, 55, 0.4);
                    background: linear-gradient(135deg, #c99e1f 0%, #d4af37 100%);
                }

                .terms-accept-btn:active {
                    transform: translateY(-1px);
                }

                @media (max-width: 768px) {
                    .terms-modal {
                        width: 95%;
                        max-height: 90vh;
                        max-width: 100%;
                    }

                    .terms-header {
                        padding: 30px 20px;
                    }

                    .terms-main-title {
                        font-size: 24px;
                        letter-spacing: 2px;
                    }

                    .terms-content {
                        padding: 25px 20px;
                    }

                    .terms-section {
                        margin-bottom: 25px;
                        padding-bottom: 20px;
                    }

                    .terms-heading {
                        font-size: 16px;
                    }

                    .terms-text {
                        font-size: 13px;
                    }

                    .terms-footer {
                        padding: 20px;
                    }

                    .terms-accept-btn {
                        padding: 12px 30px;
                        font-size: 12px;
                    }
                }

                @media (max-width: 480px) {
                    .terms-modal {
                        width: 98%;
                        border-radius: 20px;
                    }

                    .terms-header {
                        padding: 20px 15px;
                    }

                    .terms-main-title {
                        font-size: 18px;
                        letter-spacing: 1px;
                    }

                    .terms-subtitle {
                        font-size: 12px;
                    }

                    .terms-close-btn {
                        width: 40px;
                        height: 40px;
                    }

                    .terms-content {
                        padding: 20px 15px;
                    }

                    .terms-heading {
                        font-size: 14px;
                    }

                    .terms-text {
                        font-size: 12px;
                        line-height: 1.6;
                    }
                }
            `}} />
        </AnimatePresence>
    )
}
