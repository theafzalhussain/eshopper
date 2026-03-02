import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Shield, Truck, Users, RefreshCw, Lock, Zap } from 'lucide-react'

export default function Terms({ isOpen, onClose }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }

        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [isOpen])

    // Create or get portal container
    const getPortalContainer = () => {
        let container = document.getElementById('terms-modal-root')
        if (!container) {
            container = document.createElement('div')
            container.id = 'terms-modal-root'
            container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none;'
            document.body.appendChild(container)
        }
        return container
    }

    if (typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="terms-overlay-container"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 2147483647,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                        overflow: 'hidden'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="terms-backdrop"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 0,
                            pointerEvents: 'auto'
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 60 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 60 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22, duration: 0.5 }}
                        className="terms-modal-card"
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            margin: '0 auto'
                        }}
                    >
                        <button onClick={onClose} className="terms-close-btn" aria-label="Close Terms">
                            <X size={24} strokeWidth={2.5} />
                        </button>

                        <div className="terms-header">
                            <h2 className="terms-title">Terms & Conditions</h2>
                            <div className="terms-divider"></div>
                            <p className="terms-subtitle">ESHOPPERR LUXURY BOUTIQUE</p>
                        </div>

                        <div className="terms-body">
                            <TermsSection
                                icon={<Zap />}
                                title="Excellence Commitment"
                                text="At Eshopperr, we ensure that every product listed meets the highest standards of quality, authenticity, and craftsmanship. Our AI-powered curation system guarantees exclusivity and superior design in every collection."
                            />
                            <TermsSection
                                icon={<Truck />}
                                title="Premium Logistics"
                                text="We provide white-glove shipping services with real-time tracking. Each luxury item is automatically insured and handled by our premium courier network ensuring pristine, on-time delivery to your doorstep."
                            />
                            <TermsSection
                                icon={<Users />}
                                title="24/7 Concierge"
                                text="Your satisfaction is our priority. Our dedicated luxury concierge team is available round-the-clock via chat, email, or phone to assist with orders, styling advice, and after-purchase care."
                            />
                            <TermsSection
                                icon={<RefreshCw />}
                                title="Returns"
                                text="We honor a seven-day hassle-free return policy on all items in original, unused condition with tags intact. Premium members receive complimentary return shipping and instant refunds within 5 business days."
                            />
                            <TermsSection
                                icon={<Lock />}
                                title="Security"
                                text="We employ enterprise-grade encryption and comply with international data protection standards. Your personal information is treated with absolute confidentiality and is never shared with unauthorized third parties."
                            />
                            <TermsSection
                                icon={<Shield />}
                                title="Authenticity Guarantee"
                                text="Every product on Eshopperr is certified authentic. We source exclusively from authorized luxury designers and provide authentic certificates for high-value items. Money-back guarantee if authenticity is questioned."
                                isLast
                            />
                        </div>

                        <div className="terms-footer">
                            <button onClick={onClose} className="terms-agree-btn">
                                <CheckCircle size={18} strokeWidth={2.5} />
                                <span>AGREE & PROCEED</span>
                            </button>
                        </div>
                    </motion.div>

                    <style dangerouslySetInnerHTML={{ __html: `
                        .terms-overlay-container {
                            position: fixed !important;
                            top: 0 !important;
                            left: 0 !important;
                            right: 0 !important;
                            bottom: 0 !important;
                            width: 100vw !important;
                            height: 100vh !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            z-index: 2147483647 !important;
                            padding: clamp(12px, 2vw, 24px) !important;
                            pointer-events: auto !important;
                            overflow: hidden !important;
                            isolation: isolate !important;
                            overscroll-behavior: contain !important;
                            -webkit-transform: translateZ(0) !important;
                            transform: translateZ(0) !important;
                            will-change: opacity !important;
                        }

                        .terms-backdrop {
                            position: fixed !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100vw !important;
                            height: 100vh !important;
                            background: rgba(0, 0, 0, 0.72) !important;
                            backdrop-filter: blur(14px) !important;
                            -webkit-backdrop-filter: blur(14px) !important;
                            z-index: 0 !important;
                            pointer-events: auto !important;
                            -webkit-transform: translateZ(0) !important;
                            transform: translateZ(0) !important;
                        }

                        .terms-modal-card {
                            position: relative !important;
                            width: min(740px, calc(100vw - 28px)) !important;
                            max-width: calc(100vw - 28px) !important;
                            max-height: calc(100dvh - 24px) !important;
                            background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 55%, #F0F0F0 100%) !important;
                            border-radius: 34px !important;
                            display: flex !important;
                            flex-direction: column !important;
                            overflow: hidden !important;
                            border: 2.5px solid rgba(212, 175, 55, 0.55) !important;
                            box-shadow:
                                0 0 90px rgba(212, 175, 55, 0.22),
                                0 36px 110px rgba(0, 0, 0, 0.6),
                                inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
                            z-index: 1 !important;
                            margin: 0 auto !important;
                            -webkit-transform: translateZ(0) !important;
                            transform: translateZ(0) !important;
                            will-change: transform, opacity !important;
                        }

                        .terms-close-btn {
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            width: 42px;
                            height: 42px;
                            border-radius: 50%;
                            border: 1.5px solid #d4af37;
                            background: linear-gradient(135deg, #f8dc7c 0%, #d4af37 50%, #f8dc7c 100%);
                            color: #111;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            z-index: 3;
                            transition: transform 0.35s ease, box-shadow 0.35s ease;
                            box-shadow: 0 10px 28px rgba(212, 175, 55, 0.35);
                        }

                        .terms-close-btn:hover {
                            transform: rotate(90deg) scale(1.08);
                            box-shadow: 0 14px 32px rgba(212, 175, 55, 0.45);
                        }

                        .terms-header {
                            padding: 22px 36px 14px;
                            text-align: center;
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.14) 0%, rgba(212, 175, 55, 0.04) 100%);
                            border-bottom: 2px solid rgba(212, 175, 55, 0.28);
                        }

                        .terms-title {
                            margin: 0;
                            font-size: 35px;
                            font-weight: 900;
                            letter-spacing: -1px;
                            background: linear-gradient(135deg, #101010 0%, #2e2e2e 45%, #d4af37 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        }

                        .terms-divider {
                            width: 70px;
                            height: 3px;
                            margin: 10px auto 8px;
                            border-radius: 10px;
                            background: linear-gradient(90deg, transparent, #d4af37, transparent);
                        }

                        .terms-subtitle {
                            margin: 0;
                            font-size: 10px;
                            letter-spacing: 2px;
                            color: #6f6f6f;
                            text-transform: uppercase;
                            font-weight: 800;
                        }

                        .terms-body {
                            flex: 1;
                            padding: 16px 30px;
                            overflow-y: auto;
                            background: linear-gradient(to bottom, #fcfcfc 0%, #f8f8f8 100%);
                        }

                        .terms-body::-webkit-scrollbar {
                            width: 8px;
                        }

                        .terms-body::-webkit-scrollbar-thumb {
                            border-radius: 10px;
                            background: linear-gradient(180deg, #f1cf65 0%, #d4af37 100%);
                        }

                        .terms-section {
                            display: flex;
                            gap: 14px;
                            margin-bottom: 14px;
                            padding: 13px;
                            border-radius: 14px;
                            border: 1.5px solid rgba(212, 175, 55, 0.24);
                            border-left: 4px solid rgba(212, 175, 55, 0.7);
                            background: linear-gradient(135deg, rgba(255, 250, 236, 0.95), rgba(255, 255, 255, 0.9));
                            transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
                        }

                        .terms-section:hover {
                            transform: translateY(-3px);
                            border-color: rgba(212, 175, 55, 0.45);
                            box-shadow: 0 14px 34px rgba(212, 175, 55, 0.22);
                        }

                        .terms-section-icon {
                            width: 38px;
                            min-width: 38px;
                            height: 38px;
                            border-radius: 12px;
                            color: #d4af37;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.08));
                            border: 1px solid rgba(212, 175, 55, 0.24);
                            box-shadow: 0 5px 14px rgba(212, 175, 55, 0.18);
                        }

                        .terms-section-content h3 {
                            margin: 0 0 5px;
                            font-size: 15px;
                            color: #161616;
                            font-weight: 800;
                            letter-spacing: -0.3px;
                            text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
                        }

                        .terms-section-content p {
                            margin: 0;
                            font-size: 12px;
                            line-height: 1.58;
                            color: #4f4f4f;
                            font-weight: 500;
                        }

                        @media (max-width: 1024px) {
                            .terms-overlay-container {
                                padding: 12px;
                            }

                            .terms-modal-card {
                                width: 96vw;
                                max-width: 96vw;
                                max-height: 92dvh;
                                border-radius: 24px;
                            }

                            .terms-header {
                                padding: 20px 20px 12px;
                            }

                            .terms-title {
                                font-size: 31px;
                            }

                            .terms-body {
                                padding: 14px 18px;
                            }

                            .terms-footer {
                                padding: 10px 16px;
                            }
                        }

                        .terms-footer {
                            padding: 10px 24px;
                            text-align: center;
                            background: linear-gradient(135deg, rgba(212, 175, 55, 0.14) 0%, rgba(212, 175, 55, 0.04) 100%);
                            border-top: 2px solid rgba(212, 175, 55, 0.28);
                        }

                        .terms-agree-btn {
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                            padding: 11px 28px;
                            border-radius: 999px;
                            border: 2px solid #d4af37;
                            background: linear-gradient(135deg, #151515 0%, #303030 45%, #d4af37 100%);
                            color: #fff;
                            font-size: 9px;
                            font-weight: 900;
                            letter-spacing: 1.6px;
                            text-transform: uppercase;
                            cursor: pointer;
                            transition: transform 0.3s ease, box-shadow 0.3s ease;
                            box-shadow: 0 14px 36px rgba(212, 175, 55, 0.28);
                        }

                        .terms-agree-btn:hover {
                            transform: translateY(-2px) scale(1.02);
                            box-shadow: 0 18px 40px rgba(212, 175, 55, 0.35);
                        }

                        @media (max-width: 768px) {
                            .terms-modal-card {
                                width: 97vw;
                                max-width: 97vw;
                                max-height: 94dvh;
                                border-radius: 18px;
                            }

                            .terms-header {
                                padding: 18px 16px 10px;
                            }

                            .terms-title {
                                font-size: 26px;
                            }

                            .terms-body {
                                padding: 12px 14px;
                            }

                            .terms-footer {
                                padding: 10px 12px;
                            }
                        }

                        @media (max-width: 480px) {
                            .terms-overlay-container {
                                padding: 0;
                            }

                            .terms-modal-card {
                                width: 100vw;
                                height: 100dvh;
                                max-width: 100vw;
                                max-height: 100dvh;
                                border-radius: 0;
                                border-left: none;
                                border-right: none;
                            }

                            .terms-header {
                                padding: 14px 12px 8px;
                            }

                            .terms-title {
                                font-size: 22px;
                            }

                            .terms-subtitle {
                                font-size: 8px;
                                letter-spacing: 1.5px;
                            }

                            .terms-body {
                                padding: 10px 10px;
                            }

                            .terms-section {
                                gap: 10px;
                                padding: 11px;
                                border-radius: 12px;
                                border-left-width: 4px;
                            }

                            .terms-section-icon {
                                width: 34px;
                                min-width: 34px;
                                height: 34px;
                                border-radius: 10px;
                            }

                            .terms-section-content h3 {
                                font-size: 13px;
                            }

                            .terms-section-content p {
                                font-size: 11px;
                                line-height: 1.6;
                            }

                            .terms-footer {
                                padding: 8px 8px;
                            }

                            .terms-agree-btn {
                                width: 100%;
                                justify-content: center;
                                padding: 10px 12px;
                                font-size: 8px;
                                letter-spacing: 1px;
                            }

                            .terms-close-btn {
                                top: 14px;
                                right: 14px;
                                width: 38px;
                                height: 38px;
                            }
                        }
                    ` }} />
                </div>
            )}
        </AnimatePresence>
    , getPortalContainer()
    )
}

function TermsSection({ icon, title, text, isLast }) {
    return (
        <div className="terms-section" style={{ marginBottom: isLast ? 0 : undefined }}>
            <div className="terms-section-icon">{React.cloneElement(icon, { size: 18, strokeWidth: 2.2 })}</div>
            <div className="terms-section-content">
                <h3>{title}</h3>
                <p>{text}</p>
            </div>
        </div>
    )
}