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
                        /* PREMIUM CENTERING - PERFECT ON ALL SCREENS */
                        .terms-master-container {
                            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                            display: flex; align-items: center; justify-content: center;
                            z-index: 99999; padding: 20px; overflow: hidden;
                        }

                        /* LUXURY BACKDROP - DARK & SOPHISTICATED */
                        .terms-backdrop {
                            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            background: linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(15,15,35,0.9) 100%);
                            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                        }

                        /* PREMIUM MODAL CARD - LUXURY DESIGN */
                        .terms-modal-card {
                            position: relative; width: 100%; max-width: 720px;
                            max-height: 88vh; background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
                            border-radius: 48px; display: flex; flex-direction: column; overflow: hidden;
                            border: 2px solid rgba(212, 175, 55, 0.4);
                            box-shadow: 
                                0 0 80px rgba(212, 175, 55, 0.15),
                                0 40px 120px rgba(0,0,0,0.5),
                                inset 0 1px 0 rgba(255,255,255,0.8);
                            backdrop-filter: blur(4px);
                        }

                        /* CLOSE BUTTON - PREMIUM STYLE */
                        .terms-absolute-close {
                            position: absolute; top: 28px; right: 28px;
                            background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
                            border: none; width: 44px; height: 44px;
                            border-radius: 50%; display: flex; align-items: center;
                            justify-content: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                            z-index: 10; color: #1a1a1a; box-shadow: 0 8px 25px rgba(212, 175, 55, 0.3);
                        }

                        .terms-absolute-close:hover { 
                            transform: rotate(90deg) scale(1.1); 
                            box-shadow: 0 12px 35px rgba(212, 175, 55, 0.5);
                            background: linear-gradient(135deg, #F4D03F 0%, #D4AF37 100%);
                        }

                        .terms-absolute-close:active { transform: scale(0.95) rotate(90deg); }

                        /* HEADER - ELEGANT & LUXURIOUS */
                        .terms-header { 
                            padding: 48px 48px 32px 48px; 
                            text-align: center; 
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%);
                            border-bottom: 1.5px solid rgba(212, 175, 55, 0.2);
                            position: relative;
                            overflow: hidden;
                        }

                        .terms-header::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 200%;
                            height: 1px;
                            background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent);
                        }

                        .legal-badge { 
                            font-size: 10px; letter-spacing: 4px; 
                            color: #D4AF37; font-weight: 900; margin-bottom: 14px;
                            text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.05);
                        }

                        .terms-title { 
                            font-size: 42px; font-weight: 900; color: #0a0a0a; margin: 0;
                            background: linear-gradient(135deg, #1a1a1a 0%, #333 50%, #D4AF37 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                            letter-spacing: -1px;
                        }

                        .title-underline { 
                            width: 80px; height: 4px; 
                            background: linear-gradient(90deg, transparent, #D4AF37, transparent); 
                            margin: 18px auto; border-radius: 10px;
                            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                        }

                        .brand-label { 
                            font-size: 12px; letter-spacing: 3px; color: #888; 
                            text-transform: uppercase; font-weight: 700;
                        }

                        /* SCROLLABLE BODY - PREMIUM CONTENT */
                        .terms-body { 
                            flex: 1; padding: 32px 48px; overflow-y: auto; scroll-behavior: smooth;
                            background: linear-gradient(to bottom, #FAFAFA 0%, #F9F9F9 100%);
                        }
                        
                        .terms-body::-webkit-scrollbar { width: 6px; }
                        .terms-body::-webkit-scrollbar-track { background: transparent; }
                        .terms-body::-webkit-scrollbar-thumb { 
                            background: linear-gradient(180deg, #D4AF37 0%, #F4D03F 100%);
                            border-radius: 10px; box-shadow: 0 0 8px rgba(212, 175, 55, 0.3);
                        }

                        /* SECTION ITEMS - LUXURY PRESENTATION */
                        .section-item { 
                            display: flex; gap: 24px; margin-bottom: 32px; 
                            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                            padding: 20px; border-radius: 24px;
                            background: rgba(212, 175, 55, 0.04);
                            border: 1px solid rgba(212, 175, 55, 0.1);
                            cursor: default;
                        }

                        .section-item:hover {
                            background: rgba(212, 175, 55, 0.08);
                            border-color: rgba(212, 175, 55, 0.25);
                            box-shadow: 0 8px 24px rgba(212, 175, 55, 0.15);
                            transform: translateY(-4px);
                        }

                        .section-icon { 
                            color: #D4AF37; min-width: 40px; width: 40px; height: 40px;
                            display: flex; align-items: center; justify-content: center;
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
                            border-radius: 14px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15);
                        }

                        .section-item h3 { 
                            font-size: 16px; font-weight: 800; color: #0a0a0a; margin: 0 0 8px 0;
                            letter-spacing: -0.5px;
                        }

                        .section-item p { 
                            font-size: 13px; color: #555; line-height: 1.8; margin: 0;
                        }

                        /* PREMIUM FOOTER */
                        .terms-footer { 
                            padding: 32px 48px; text-align: center; 
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%);
                            border-top: 1.5px solid rgba(212, 175, 55, 0.2);
                        }

                        /* PREMIUM AGREE BUTTON */
                        .terms-agree-btn { 
                            background: linear-gradient(135deg, #1a1a1a 0%, #333 50%, #D4AF37 100%);
                            color: white; border: 2px solid #D4AF37;
                            padding: 16px 52px; border-radius: 50px; font-weight: 900; 
                            letter-spacing: 2.5px; font-size: 11px; cursor: pointer; 
                            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                            display: inline-flex; align-items: center;
                            box-shadow: 0 12px 30px rgba(212, 175, 55, 0.25);
                            text-transform: uppercase;
                        }

                        .terms-agree-btn:hover { 
                            background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 50%, #D4AF37 100%);
                            color: #1a1a1a;
                            box-shadow: 0 18px 45px rgba(212, 175, 55, 0.4);
                            transform: translateY(-3px);
                        }

                        .terms-agree-btn:active { 
                            transform: translateY(-1px) scale(0.98);
                        }

                        /* ====== FULLY RESPONSIVE DESIGN ====== */
                        
                        @media (max-width: 1024px) {
                            .terms-modal-card { max-width: 680px; }
                            .terms-header { padding: 40px 40px 28px 40px; }
                            .terms-title { font-size: 36px; }
                            .terms-body { padding: 28px 40px; }
                            .terms-footer { padding: 28px 40px; }
                            .section-item { gap: 18px; margin-bottom: 28px; padding: 18px; }
                        }

                        @media (max-width: 768px) {
                            .terms-modal-card { max-width: 90vw; max-height: 90vh; border-radius: 36px; }
                            .terms-header { padding: 36px 32px 24px 32px; }
                            .legal-badge { font-size: 9px; letter-spacing: 3px; }
                            .terms-title { font-size: 32px; }
                            .title-underline { width: 60px; }
                            .terms-body { padding: 24px 32px; }
                            .terms-footer { padding: 24px 32px; }
                            .section-item { gap: 16px; margin-bottom: 24px; padding: 16px; }
                            .section-item h3 { font-size: 15px; }
                            .section-item p { font-size: 12.5px; }
                            .terms-absolute-close { top: 24px; right: 24px; width: 40px; height: 40px; }
                        }

                        @media (max-width: 640px) {
                            .terms-modal-card { max-width: 95vw; max-height: 88vh; border-radius: 32px; }
                            .terms-header { padding: 32px 28px 20px 28px; }
                            .legal-badge { font-size: 8px; letter-spacing: 2px; margin-bottom: 10px; }
                            .terms-title { font-size: 28px; letter-spacing: -0.5px; }
                            .title-underline { width: 50px; height: 3px; }
                            .terms-body { padding: 20px 28px; }
                            .terms-footer { padding: 20px 28px; }
                            .section-item { 
                                gap: 14px; margin-bottom: 20px; padding: 14px; 
                                flex-direction: row; align-items: flex-start;
                            }
                            .section-item h3 { font-size: 14px; }
                            .section-item p { font-size: 12px; line-height: 1.6; }
                            .section-icon { min-width: 36px; width: 36px; height: 36px; }
                            .terms-absolute-close { top: 20px; right: 20px; width: 38px; height: 38px; font-size: 18px; }
                            .terms-agree-btn { padding: 14px 40px; font-size: 10px; letter-spacing: 2px; }
                        }

                        @media (max-width: 480px) {
                            .terms-modal-card { max-width: 98vw; max-height: 87vh; border-radius: 28px; border-width: 1.5px; }
                            .terms-header { padding: 28px 20px 18px 20px; }
                            .legal-badge { font-size: 7px; letter-spacing: 2px; margin-bottom: 8px; }
                            .terms-title { font-size: 24px; }
                            .title-underline { width: 40px; margin: 12px auto; }
                            .brand-label { font-size: 10px; }
                            .terms-body { padding: 16px 20px; }
                            .terms-footer { padding: 16px 20px; }
                            .section-item { 
                                gap: 12px; margin-bottom: 16px; padding: 12px; 
                                border-radius: 16px;
                            }
                            .section-item h3 { font-size: 13px; margin-bottom: 6px; }
                            .section-item p { font-size: 11px; line-height: 1.5; }
                            .section-icon { min-width: 32px; width: 32px; height: 32px; border-radius: 10px; }
                            .terms-absolute-close { top: 18px; right: 18px; width: 36px; height: 36px; font-size: 16px; }
                            .terms-agree-btn { 
                                width: 90%; justify-content: center; 
                                padding: 13px 28px; font-size: 10px; letter-spacing: 1.5px;
                            }
                        }

                        @media (max-width: 380px) {
                            .terms-modal-card { max-width: 99vw; border-radius: 24px; }
                            .terms-header { padding: 24px 16px 16px 16px; }
                            .legal-badge { font-size: 7px; margin-bottom: 6px; }
                            .terms-title { font-size: 22px; }
                            .brand-label { font-size: 9px; }
                            .terms-body { padding: 12px 16px; }
                            .terms-footer { padding: 12px 16px; }
                            .section-item { 
                                gap: 10px; margin-bottom: 12px; padding: 10px;
                                border-radius: 12px;
                            }
                            .section-item h3 { font-size: 12px; }
                            .section-item p { font-size: 10px; line-height: 1.4; }
                            .section-icon { min-width: 28px; width: 28px; height: 28px; }
                            .terms-absolute-close { top: 14px; right: 14px; width: 32px; height: 32px; font-size: 14px; }
                            .terms-agree-btn { 
                                width: 100%; padding: 12px 20px; font-size: 9px; 
                                letter-spacing: 1px;
                            }
                        }

                        /* LANDSCAPE OPTIMIZATION */
                        @media (max-height: 600px) and (orientation: landscape) {
                            .terms-modal-card { max-height: 95vh; }
                            .terms-header { padding: 20px 40px 16px 40px; }
                            .terms-body { padding: 16px 40px; }
                            .section-item { margin-bottom: 16px; }
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