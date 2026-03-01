import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Shield, Truck, Users, RefreshCw, Lock, Zap } from 'lucide-react'

export default function Terms({ isOpen, onClose }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="terms-master-container">
                    {/* BACKDROP - 100% DARK & BLURRY */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="terms-backdrop"
                    />

                    {/* MODAL CARD - PERFECTLY CENTERED */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="terms-modal-card"
                    >
                        {/* CLOSE BUTTON */}
                        <button onClick={onClose} className="terms-absolute-close">
                            <X size={22} />
                        </button>

                        {/* HEADER SECTION */}
                        <div className="terms-header">
                            <div className="legal-badge">EST. 2024 • LEGAL</div>
                            <h2 className="terms-title">Terms & Conditions</h2>
                            <div className="title-underline"></div>
                            <p className="brand-label">eShopperr Luxury Boutique</p>
                        </div>

                        {/* SCROLLABLE BODY */}
                        <div className="terms-body">
                            <Section icon={<Zap />} title="Our Commitment" text="At Eshopperr, every piece is curated by AI and certified by humans for unparalleled luxury standards." />
                            <Section icon={<Truck />} title="Premium Shipping" text="Insured, white-glove logistics for all worldwide deliveries. Real-time updates every step of the way." />
                            <Section icon={<Users />} title="24/7 Concierge" text="Private access to our stylists for orders, resizing, and lifestyle advice. Reach us via our verified channels." />
                            <Section icon={<RefreshCw />} title="Bespoke Returns" text="Seven-day hassle-free return window for all unbranded tags. We offer instant store credit for members." />
                            <Section icon={<Lock />} title="Privacy Protocols" text="Your data is your legacy. We utilize AES-256 encryption to protect every transaction and personal profile." />
                            <Section icon={<Shield />} title="Authenticity Pact" text="A legal guarantee of 100% originality for every item, or we return triple your purchase value." isLast />
                        </div>

                        {/* FOOTER */}
                        <div className="terms-footer">
                            <button onClick={onClose} className="terms-agree-btn">
                                <CheckCircle size={16} style={{marginRight: '8px'}} />
                                AGREE & PROCEED
                            </button>
                        </div>
                    </motion.div>

                    <style dangerouslySetInnerHTML={{ __html: `
                        /* 1. FLEX CENTERING LOGIC - THE KEY FIX */
                        .terms-master-container {
                            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                            display: flex; align-items: center; justify-content: center;
                            z-index: 99999; padding: 20px; overflow: hidden;
                        }

                        .terms-backdrop {
                            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
                        }

                        .terms-modal-card {
                            position: relative; width: 100%; max-width: 650px;
                            max-height: 85vh; background: #fff; border-radius: 40px;
                            display: flex; flex-direction: column; overflow: hidden;
                            border: 1px solid rgba(255, 215, 0, 0.2);
                            box-shadow: 0 40px 100px rgba(0,0,0,0.4);
                        }

                        .terms-absolute-close {
                            position: absolute; top: 20px; right: 20px;
                            background: #f4f4f4; border: none; width: 40px; height: 40px;
                            border-radius: 50%; display: flex; align-items: center;
                            justify-content: center; cursor: pointer; transition: 0.3s;
                            z-index: 10;
                        }

                        .terms-absolute-close:hover { background: #eee; transform: rotate(90deg); }

                        .terms-header { padding: 40px 40px 20px 40px; text-align: center; }
                        .legal-badge { font-size: 9px; letter-spacing: 3px; color: #D4AF37; font-weight: 700; margin-bottom: 10px; }
                        .terms-title { font-size: 32px; font-weight: 800; color: #111; margin: 0; }
                        .title-underline { width: 50px; height: 3px; background: #D4AF37; margin: 15px auto; }
                        .brand-label { font-size: 11px; letter-spacing: 2px; color: #888; text-transform: uppercase; }

                        .terms-body { flex: 1; padding: 0 40px; overflow-y: auto; scroll-behavior: smooth; }
                        
                        .terms-body::-webkit-scrollbar { width: 4px; }
                        .terms-body::-webkit-scrollbar-thumb { background: #D4AF37; border-radius: 10px; }

                        .section-item { display: flex; gap: 20px; margin-bottom: 25px; transition: 0.3s; }
                        .section-icon { color: #D4AF37; }
                        .section-item h3 { font-size: 15px; font-weight: 700; color: #222; margin-bottom: 5px; }
                        .section-item p { font-size: 13px; color: #666; line-height: 1.6; }

                        .terms-footer { padding: 30px; text-align: center; border-top: 1px solid #f0f0f0; }
                        .terms-agree-btn { 
                            background: #111; color: white; border: none; padding: 16px 50px;
                            border-radius: 50px; font-weight: 800; letter-spacing: 2px;
                            font-size: 11px; cursor: pointer; transition: 0.4s;
                            display: inline-flex; align-items: center;
                        }
                        .terms-agree-btn:hover { background: #D4AF37; box-shadow: 0 15px 30px rgba(212, 175, 55, 0.2); }

                        /* MOBILE OPTIMIZATIONS */
                        @media (max-width: 480px) {
                            .terms-modal-card { max-height: 90vh; border-radius: 25px; }
                            .terms-header { padding: 30px 20px; }
                            .terms-title { font-size: 24px; }
                            .terms-body { padding: 0 20px; }
                            .terms-agree-btn { width: 100%; justify-content: center; }
                        }
                    `}} />
                </div>
            )}
        </AnimatePresence>
    )
}

function Section({ icon, title, text, isLast }) {
    return (
        <div className="section-item" style={{ marginBottom: isLast ? '30px' : '25px' }}>
            <div className="section-icon">{icon}</div>
            <div className="section-content">
                <h3>{title}</h3>
                <p>{text}</p>
            </div>
        </div>
    );
}