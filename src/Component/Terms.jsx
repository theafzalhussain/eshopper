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
                        /* ===== ULTRA PREMIUM TERMS ===== */
                        .terms-master-container {
                            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                            display: flex; align-items: center; justify-content: center;
                            z-index: 99999; padding: 20px; overflow: hidden;
                        }

                        /* ULTRA LUXURY BACKDROP */
                        .terms-backdrop {
                            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            background: linear-gradient(135deg, rgba(0,0,0,0.88) 0%, rgba(15,15,35,0.92) 50%, rgba(0,0,0,0.88) 100%);
                            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
                            animation: backdropPulse 4s ease-in-out infinite;
                        }

                        @keyframes backdropPulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.95; }
                        }

                        /* ULTRA PREMIUM MODAL CARD */
                        .terms-modal-card {
                            position: relative; width: 100%; max-width: 750px;
                            max-height: 88vh; background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 50%, #F0F0F0 100%);
                            border-radius: 50px; display: flex; flex-direction: column; overflow: hidden;
                            border: 2.5px solid rgba(212, 175, 55, 0.5);
                            box-shadow: 
                                0 0 100px rgba(212, 175, 55, 0.25),
                                0 0 150px rgba(212, 175, 55, 0.1),
                                0 45px 150px rgba(0,0,0,0.6),
                                inset 0 1px 0 rgba(255,255,255,0.9);
                            backdrop-filter: blur(5px);
                        }

                        /* ULTRA PREMIUM CLOSE BUTTON */
                        .terms-absolute-close {
                            position: absolute; top: 28px; right: 28px;
                            background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
                            border: 1.5px solid #FFA500; width: 46px; height: 46px;
                            border-radius: 50%; display: flex; align-items: center;
                            justify-content: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                            z-index: 10; color: #0a0a0a; 
                            box-shadow: 
                                0 0 30px rgba(212, 175, 55, 0.4),
                                0 12px 30px rgba(212, 175, 55, 0.4);
                        }

                        .terms-absolute-close:hover { 
                            transform: rotate(90deg) scale(1.15); 
                            box-shadow: 
                                0 0 50px rgba(212, 175, 55, 0.6),
                                0 15px 40px rgba(212, 175, 55, 0.5);
                            background: linear-gradient(135deg, #FFA500 0%, #FFD700 50%, #FFA500 100%);
                        }

                        .terms-absolute-close:active { transform: scale(0.92) rotate(90deg); }

                        /* ULTRA HEADER */
                        .terms-header { 
                            padding: 50px 50px 34px 50px; 
                            text-align: center; 
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.03) 100%);
                            border-bottom: 2px solid rgba(212, 175, 55, 0.3);
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
                            height: 2px;
                            background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent);
                        }

                        .legal-badge { 
                            font-size: 10px; letter-spacing: 4px; 
                            color: #FFD700; font-weight: 900; margin-bottom: 16px;
                            text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            animation: badgeGlow 2s ease-in-out infinite;
                        }

                        @keyframes badgeGlow {
                            0%, 100% { text-shadow: 0 0 8px rgba(212, 175, 55, 0.4); }
                            50% { text-shadow: 0 0 16px rgba(212, 175, 55, 0.8); }
                        }

                        .terms-title { 
                            font-size: 44px; font-weight: 900; color: #0a0a0a; margin: 0;
                            background: linear-gradient(135deg, #1a1a1a 0%, #333 40%, #D4AF37 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                            letter-spacing: -1px;
                            animation: titleGlow 3s ease-in-out infinite;
                        }

                        @keyframes titleGlow {
                            0%, 100% { text-shadow: 0 0 0 transparent; filter: drop-shadow(0 0 0 transparent); }
                            50% { filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.2)); }
                        }

                        .title-underline { 
                            width: 90px; height: 5px; 
                            background: linear-gradient(90deg, transparent, #FFD700, transparent); 
                            margin: 20px auto; border-radius: 10px;
                            box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4);
                        }

                        .brand-label { 
                            font-size: 12px; letter-spacing: 3px; color: #888; 
                            text-transform: uppercase; font-weight: 800;
                        }

                        /* ULTRA PREMIUM BODY */
                        .terms-body { 
                            flex: 1; padding: 34px 50px; overflow-y: auto; scroll-behavior: smooth;
                            background: linear-gradient(to bottom, #FAFAFA 0%, #F8F8F8 100%);
                        }
                        
                        .terms-body::-webkit-scrollbar { width: 8px; }
                        .terms-body::-webkit-scrollbar-track { background: rgba(212, 175, 55, 0.05); border-radius: 10px; }
                        .terms-body::-webkit-scrollbar-thumb { 
                            background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
                            border-radius: 10px; 
                            box-shadow: 0 0 12px rgba(212, 175, 55, 0.4);
                            border: 1px solid rgba(212, 175, 55, 0.2);
                        }

                        /* ULTRA PREMIUM SECTION ITEMS */
                        .section-item { 
                            display: flex; gap: 26px; margin-bottom: 35px; 
                            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                            padding: 24px; border-radius: 26px;
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.06), rgba(212, 175, 55, 0.01));
                            border: 1.5px solid rgba(212, 175, 55, 0.15);
                            cursor: default;
                        }

                        .section-item:hover {
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(212, 175, 55, 0.04));
                            border-color: rgba(212, 175, 55, 0.35);
                            box-shadow: 
                                0 0 30px rgba(212, 175, 55, 0.2),
                                0 12px 32px rgba(212, 175, 55, 0.15);
                            transform: translateY(-6px);
                        }

                        .section-icon { 
                            color: #FFD700; min-width: 44px; width: 44px; height: 44px;
                            display: flex; align-items: center; justify-content: center;
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.08));
                            border-radius: 16px; 
                            box-shadow: 
                                0 0 16px rgba(212, 175, 55, 0.25),
                                0 6px 16px rgba(212, 175, 55, 0.15);
                            border: 1px solid rgba(212, 175, 55, 0.2);
                        }

                        .section-item h3 { 
                            font-size: 17px; font-weight: 800; color: #0a0a0a; margin: 0 0 9px 0;
                            letter-spacing: -0.5px;
                        }

                        .section-item p { 
                            font-size: 13px; color: #555; line-height: 1.85; margin: 0;
                            font-weight: 500;
                        }

                        /* ULTRA PREMIUM FOOTER */
                        .terms-footer { 
                            padding: 34px 50px; text-align: center; 
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.03) 100%);
                            border-top: 2px solid rgba(212, 175, 55, 0.3);
                        }

                        /* ULTRA AGREE BUTTON */
                        .terms-agree-btn { 
                            background: linear-gradient(135deg, #1a1a1a 0%, #333 40%, #FFD700 100%);
                            color: white; border: 2.5px solid #FFD700;
                            padding: 18px 56px; border-radius: 50px; font-weight: 900; 
                            letter-spacing: 3px; font-size: 11px; cursor: pointer; 
                            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                            display: inline-flex; align-items: center;
                            box-shadow: 
                                0 0 30px rgba(212, 175, 55, 0.3),
                                0 15px 40px rgba(212, 175, 55, 0.2);
                            text-transform: uppercase;
                        }

                        .terms-agree-btn:hover { 
                            background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
                            color: #0a0a0a;
                            box-shadow: 
                                0 0 50px rgba(212, 175, 55, 0.5),
                                0 20px 50px rgba(212, 175, 55, 0.3);
                            transform: translateY(-4px) scale(1.05);
                        }

                        .terms-agree-btn:active { 
                            transform: translateY(-1px) scale(0.96);
                        }

                        /* ====== ULTRA RESPONSIVE DESIGN ====== */
                        
                        @media (max-width: 1400px) {
                            .terms-modal-card { max-width: 700px; }
                            .terms-header { padding: 46px 46px 32px 46px; }
                            .terms-title { font-size: 40px; }
                            .terms-body { padding: 30px 46px; }
                            .terms-footer { padding: 30px 46px; }
                            .section-item { gap: 20px; margin-bottom: 32px; padding: 22px; }
                        }

                        @media (max-width: 1024px) {
                            .terms-modal-card { max-width: 680px; }
                            .terms-header { padding: 42px 42px 30px 42px; }
                            .terms-title { font-size: 38px; }
                            .terms-body { padding: 28px 42px; }
                            .terms-footer { padding: 28px 42px; }
                            .section-item { gap: 18px; margin-bottom: 28px; padding: 20px; }
                            .section-icon { width: 40px; height: 40px; min-width: 40px; }
                            .section-item h3 { font-size: 16px; }
                        }

                        @media (max-width: 768px) {
                            .terms-modal-card { max-width: 92vw; max-height: 90vh; border-radius: 38px; border-width: 2px; }
                            .terms-header { padding: 38px 34px 24px 34px; }
                            .legal-badge { font-size: 9px; letter-spacing: 3px; margin-bottom: 12px; }
                            .terms-title { font-size: 34px; }
                            .title-underline { width: 70px; height: 4px; margin: 16px auto; }
                            .terms-body { padding: 26px 34px; }
                            .terms-footer { padding: 26px 34px; }
                            .section-item { gap: 16px; margin-bottom: 26px; padding: 18px; }
                            .section-item h3 { font-size: 15px; margin-bottom: 7px; }
                            .section-item p { font-size: 12px; }
                            .section-icon { width: 38px; height: 38px; min-width: 38px; }
                            .terms-absolute-close { top: 22px; right: 22px; width: 42px; height: 42px; }
                            .terms-agree-btn { padding: 15px 44px; font-size: 10px; letter-spacing: 2px; }
                        }

                        @media (max-width: 640px) {
                            .terms-modal-card { max-width: 96vw; max-height: 88vh; border-radius: 34px; }
                            .terms-header { padding: 34px 30px 22px 30px; }
                            .legal-badge { font-size: 8px; letter-spacing: 2.5px; margin-bottom: 10px; }
                            .terms-title { font-size: 30px; letter-spacing: -0.8px; }
                            .title-underline { width: 55px; height: 3px; }
                            .brand-label { font-size: 11px; }
                            .terms-body { padding: 22px 30px; }
                            .terms-footer { padding: 22px 30px; }
                            .section-item { 
                                gap: 14px; margin-bottom: 22px; padding: 16px; 
                                border-radius: 22px;
                            }
                            .section-item h3 { font-size: 14px; margin-bottom: 6px; }
                            .section-item p { font-size: 11.5px; line-height: 1.7; }
                            .section-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 12px; }
                            .terms-absolute-close { top: 20px; right: 20px; width: 40px; height: 40px; font-size: 18px; }
                            .terms-agree-btn { padding: 13px 38px; font-size: 9.5px; letter-spacing: 2px; }
                        }

                        @media (max-width: 480px) {
                            .terms-modal-card { max-width: 98vw; max-height: 87vh; border-radius: 30px; border-width: 1.5px; }
                            .terms-header { padding: 30px 22px 20px 22px; }
                            .legal-badge { font-size: 7px; letter-spacing: 2px; margin-bottom: 8px; }
                            .terms-title { font-size: 26px; }
                            .title-underline { width: 45px; margin: 12px auto; }
                            .brand-label { font-size: 10px; }
                            .terms-body { padding: 18px 22px; }
                            .terms-footer { padding: 18px 22px; }
                            .section-item { 
                                gap: 12px; margin-bottom: 18px; padding: 14px; 
                                border-radius: 18px;
                            }
                            .section-item h3 { font-size: 13px; margin-bottom: 5px; }
                            .section-item p { font-size: 11px; line-height: 1.6; }
                            .section-icon { width: 34px; height: 34px; min-width: 34px; }
                            .terms-absolute-close { top: 16px; right: 16px; width: 38px; height: 38px; font-size: 16px; }
                            .terms-agree-btn { 
                                width: 88%; justify-content: center; 
                                padding: 12px 28px; font-size: 9px; letter-spacing: 1.5px;
                            }
                        }

                        @media (max-width: 380px) {
                            .terms-modal-card { max-width: 99vw; border-radius: 26px; }
                            .terms-header { padding: 26px 18px 18px 18px; }
                            .legal-badge { font-size: 6.5px; letter-spacing: 1.5px; margin-bottom: 6px; }
                            .terms-title { font-size: 23px; letter-spacing: -0.3px; }
                            .title-underline { width: 38px; height: 2.5px; }
                            .brand-label { font-size: 9px; }
                            .terms-body { padding: 14px 18px; }
                            .terms-footer { padding: 14px 18px; }
                            .section-item { 
                                gap: 10px; margin-bottom: 14px; padding: 12px;
                                border-radius: 16px;
                            }
                            .section-item h3 { font-size: 12px; margin-bottom: 4px; }
                            .section-item p { font-size: 10px; line-height: 1.5; }
                            .section-icon { width: 32px; height: 32px; min-width: 32px; }
                            .terms-absolute-close { top: 12px; right: 12px; width: 36px; height: 36px; font-size: 14px; }
                            .terms-agree-btn { 
                                width: 100%; padding: 11px 22px; font-size: 8.5px; 
                                letter-spacing: 1px;
                            }
                        }

                        @media (max-width: 320px) {
                            .terms-modal-card { border-radius: 22px; }
                            .terms-header { padding: 22px 14px 16px 14px; }
                            .legal-badge { font-size: 6px; }
                            .terms-title { font-size: 20px; }
                            .terms-body { padding: 12px 14px; }
                            .section-item { gap: 8px; padding: 10px; }
                            .section-item h3 { font-size: 11px; }
                            .section-item p { font-size: 9px; }
                            .section-icon { width: 28px; height: 28px; }
                        }

                        /* LANDSCAPE OPTIMIZATION */
                        @media (max-height: 700px) and (orientation: landscape) {
                            .terms-modal-card { max-height: 94vh; }
                            .terms-header { padding: 24px 40px 20px 40px; }
                            .terms-body { padding: 20px 40px; }
                            .terms-footer { padding: 20px 40px; }
                            .section-item { margin-bottom: 18px; padding: 16px; }
                        }

                        @media (max-height: 500px) and (orientation: landscape) {
                            .terms-modal-card { max-height: 92vh; }
                            .terms-header { padding: 18px 30px 14px 30px; }
                            .terms-title { font-size: 28px; }
                            .terms-body { padding: 14px 30px; }
                            .section-item { margin-bottom: 12px; padding: 12px; }
                            .section-item h3 { font-size: 13px; }
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