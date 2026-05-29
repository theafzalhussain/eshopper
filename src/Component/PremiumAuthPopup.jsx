import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Sparkles, ShieldCheck, Truck, Gift, X, ArrowRight, BadgeCheck, Clock3, Star, Zap, Heart } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

// ── BACKEND CONSTANTS (DO NOT CHANGE) ──────────────────────────────────────
const POPUP_DELAY_MS = 15000
const POPUP_SEEN_KEY = 'eshopper_premium_auth_popup_seen'

const FEATURE_ITEMS = [
    { icon: Truck, title: 'Priority Delivery', text: 'Express shipping and premium handling on every order.' },
    { icon: Gift, title: 'Exclusive Drops', text: 'Early access to luxury collections and private sales.' },
    { icon: ShieldCheck, title: 'Secure Account', text: 'Protected login, order tracking, seamless checkout.' },
]

// ── ANIMATION VARIANTS ─────────────────────────────────────────────────────
const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit:   { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
}

const modalVariants = {
    hidden:  { opacity: 0, y: 48, scale: 0.96, rotateX: 3 },
    visible: {
        opacity: 1, y: 0, scale: 1, rotateX: 0,
        transition: { type: 'spring', stiffness: 160, damping: 22, staggerChildren: 0.07, delayChildren: 0.08 }
    },
    exit: { opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.22 } },
}

const itemVariants = {
    hidden:  { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 22 } },
}

const floatVariants = {
    animate: {
        y: [-10, 10, -10],
        rotate: [-4, 4, -4],
        transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
    }
}

const pulseVariants = {
    animate: {
        scale: [1, 1.18, 1],
        opacity: [0.5, 0.85, 0.5],
        transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
    }
}

const shimmerVariants = {
    animate: {
        x: ['-100%', '200%'],
        transition: { duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.8 }
    }
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function PremiumAuthPopup() {
    const location = useLocation()
    const [open, setOpen]   = useState(false)
    const [ready, setReady] = useState(false)
    const [countdown, setCountdown] = useState(null)

    // ── BACKEND LOGIC (DO NOT CHANGE) ──────────────────────────────────────
    const shouldSuppress = useMemo(() => {
        const loggedIn    = localStorage.getItem('login') === 'true'
        const onAuthPages = ['/login', '/signup', '/forget-password'].includes(location.pathname)
        const seen        = sessionStorage.getItem(POPUP_SEEN_KEY) === 'true'
        return loggedIn || onAuthPages || seen
    }, [location.pathname])

    useEffect(() => {
        if (shouldSuppress) { setOpen(false); setReady(false); return undefined }
        setReady(false)
        const timer = window.setTimeout(() => { setReady(true); setOpen(true) }, POPUP_DELAY_MS)
        return () => window.clearTimeout(timer)
    }, [shouldSuppress, location.pathname])

    useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (e) => { if (e.key === 'Escape') handleClose() }
        document.addEventListener('keydown', onKeyDown)
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = '' }
    }, [open])

    const handleClose = () => {
        sessionStorage.setItem(POPUP_SEEN_KEY, 'true')
        setOpen(false)
    }
    // ── END BACKEND LOGIC ─────────────────────────────────────────────────

    // UI-only countdown (visual urgency, no backend)
    useEffect(() => {
        if (!open) { setCountdown(null); return }
        let secs = 59
        setCountdown(secs)
        const id = setInterval(() => {
            secs -= 1
            if (secs <= 0) { clearInterval(id); setCountdown(null) }
            else setCountdown(secs)
        }, 1000)
        return () => clearInterval(id)
    }, [open])

    if (shouldSuppress && !open) return null

    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="pap-overlay"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onMouseDown={handleClose}
                        aria-modal="true"
                        role="dialog"
                        aria-label="Sign in to continue"
                    >
                        {/* Floating bg orbs */}
                        <motion.div className="pap-orb pap-orb1" variants={floatVariants} animate="animate" />
                        <motion.div className="pap-orb pap-orb2" variants={floatVariants} animate="animate" style={{ animationDelay: '1.2s' }} />
                        <motion.div className="pap-orb pap-orb3" variants={floatVariants} animate="animate" style={{ animationDelay: '2.4s' }} />

                        <motion.div
                            className="pap-modal"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {/* ── CLOSE ── */}
                            <motion.button
                                type="button"
                                className="pap-close"
                                onClick={handleClose}
                                aria-label="Close"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                            >
                                <X size={16} />
                            </motion.button>

                            {/* ══ LEFT PANEL ══ */}
                            <div className="pap-left">
                                {/* Animated grid overlay */}
                                <div className="pap-grid-overlay" aria-hidden="true" />

                                {/* Shimmer sweep */}
                                <motion.div
                                    className="pap-shimmer"
                                    variants={shimmerVariants}
                                    animate="animate"
                                    aria-hidden="true"
                                />

                                {/* Floating decorative stars */}
                                <motion.div className="pap-deco pap-deco1" variants={floatVariants} animate="animate" aria-hidden="true">
                                    <Sparkles size={13} />
                                </motion.div>
                                <motion.div className="pap-deco pap-deco2" variants={floatVariants} animate="animate" style={{ animationDelay: '1.5s' }} aria-hidden="true">
                                    <Star size={11} />
                                </motion.div>
                                <motion.div className="pap-deco pap-deco3" variants={floatVariants} animate="animate" style={{ animationDelay: '3s' }} aria-hidden="true">
                                    <Crown size={12} />
                                </motion.div>

                                {/* Content */}
                                <div className="pap-left-inner">
                                    <motion.div variants={itemVariants} className="pap-eyebrow">
                                        <span className="pap-eyebrow-line" />
                                        <Crown size={13} />
                                        <span>Premium Member Access</span>
                                        <span className="pap-eyebrow-line" />
                                    </motion.div>

                                    <motion.div variants={itemVariants} className="pap-brand">
                                        <div className="pap-brand-icon">
                                            <Sparkles size={16} />
                                        </div>
                                        <span>Eshopper Boutique Luxe</span>
                                    </motion.div>

                                    <motion.h2 variants={itemVariants} className="pap-heading">
                                        Unlock your <em>premium</em> experience
                                    </motion.h2>

                                    <motion.p variants={itemVariants} className="pap-subtext">
                                        Sign in to save wishlists, track orders and get early access to exclusive luxury offers curated just for you.
                                    </motion.p>

                                    {/* Badges */}
                                    <motion.div variants={itemVariants} className="pap-badges">
                                        <span className="pap-badge">
                                            <BadgeCheck size={11} /> VIP Offers
                                        </span>
                                        <span className="pap-badge">
                                            <Zap size={11} /> Fast Checkout
                                        </span>
                                        <span className="pap-badge">
                                            <ShieldCheck size={11} /> Order Tracking
                                        </span>
                                    </motion.div>

                                    {/* Feature cards */}
                                    <motion.div variants={itemVariants} className="pap-features">
                                        {FEATURE_ITEMS.map((feat, i) => {
                                            const Icon = feat.icon
                                            return (
                                                <motion.div
                                                    key={feat.title}
                                                    className="pap-feat"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                                    whileHover={{ y: -5, scale: 1.02 }}
                                                >
                                                    <div className="pap-feat-icon">
                                                        <Icon size={15} />
                                                    </div>
                                                    <h4>{feat.title}</h4>
                                                    <p>{feat.text}</p>
                                                </motion.div>
                                            )
                                        })}
                                    </motion.div>
                                </div>
                            </div>

                            {/* ══ RIGHT PANEL ══ */}
                            <div className="pap-right">
                                <motion.div variants={itemVariants} className="pap-card">
                                    {/* Top row */}
                                    <div className="pap-card-top">
                                        <div className="pap-card-badge">
                                            <motion.span
                                                className={`pap-live-dot ${ready ? 'live' : ''}`}
                                                variants={pulseVariants}
                                                animate={ready ? 'animate' : {}}
                                            />
                                            <span className="pap-card-label">Member Access</span>
                                        </div>
                                        {countdown !== null && (
                                            <motion.span
                                                className="pap-countdown"
                                                key={countdown}
                                                initial={{ scale: 1.2, opacity: 0.7 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                            >
                                                <Clock3 size={11} />
                                                0:{String(countdown).padStart(2, '0')}
                                            </motion.span>
                                        )}
                                    </div>

                                    {/* Ornament tag */}
                                    <div className="pap-ornament">
                                        <Star size={11} />
                                        <span>Exclusive access · Seamless entry</span>
                                    </div>

                                    {/* Heading */}
                                    <h3 className="pap-card-title">Welcome back</h3>
                                    <p className="pap-card-sub">
                                        Create your account in seconds, or sign in to continue where you left off.
                                    </p>

                                    {/* Perks mini-list */}
                                    <ul className="pap-perks">
                                        {[
                                            { icon: Heart, text: 'Save wishlist & favourites' },
                                            { icon: Truck, text: 'Real-time order tracking' },
                                            { icon: Gift, text: 'Exclusive member-only deals' },
                                        ].map((p) => (
                                            <li key={p.text} className="pap-perk">
                                                <span className="pap-perk-icon"><p.icon size={12} /></span>
                                                {p.text}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTAs */}
                                    <div className="pap-actions">
                                        <Link to="/login" className="pap-btn pap-btn-primary" onClick={handleClose}>
                                            <span>Login to my account</span>
                                            <motion.span
                                                className="pap-btn-arrow"
                                                animate={{ x: [0, 4, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                <ArrowRight size={15} />
                                            </motion.span>
                                        </Link>
                                        <Link to="/signup" className="pap-btn pap-btn-secondary" onClick={handleClose}>
                                            <Sparkles size={13} />
                                            <span>Create free account</span>
                                        </Link>
                                    </div>

                                    {/* Skip */}
                                    <button type="button" className="pap-skip" onClick={handleClose}>
                                        Maybe later, continue browsing →
                                    </button>

                                    {/* Trust strip */}
                                    <div className="pap-trust">
                                        <span><ShieldCheck size={11} /> Secure</span>
                                        <span className="pap-trust-sep" />
                                        <span><BadgeCheck size={11} /> 100% Authentic</span>
                                        <span className="pap-trust-sep" />
                                        <span><Zap size={11} /> Instant</span>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── SCOPED STYLES ── */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap');

                /* ══ OVERLAY ══ */
                .pap-overlay {
                    position: fixed; inset: 0; z-index: 12000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 20px;
                    background:
                        radial-gradient(ellipse 60% 50% at 15% 20%, rgba(255,63,108,0.14) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 50% at 85% 80%, rgba(201,169,110,0.12) 0%, transparent 60%),
                        rgba(14, 16, 24, 0.75);
                    backdrop-filter: blur(18px) saturate(130%);
                    font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    -webkit-font-smoothing: antialiased;
                    perspective: 1200px;
                }

                /* ── FLOATING ORBS ── */
                .pap-orb {
                    position: absolute; border-radius: 50%;
                    pointer-events: none; filter: blur(60px);
                }
                .pap-orb1 {
                    width: 500px; height: 500px;
                    background: radial-gradient(circle, rgba(255,63,108,0.18) 0%, transparent 70%);
                    top: -120px; left: -100px;
                }
                .pap-orb2 {
                    width: 420px; height: 420px;
                    background: radial-gradient(circle, rgba(201,169,110,0.16) 0%, transparent 70%);
                    bottom: -80px; right: -60px;
                }
                .pap-orb3 {
                    width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(3,166,133,0.13) 0%, transparent 70%);
                    top: 50%; right: 25%;
                    transform: translateY(-50%);
                }

                /* ══ MODAL SHELL ══ */
                .pap-modal {
                    position: relative;
                    width: min(1120px, 100%);
                    border-radius: 28px;
                    overflow: hidden;
                    display: grid;
                    grid-template-columns: 1.1fr 0.9fr;
                    box-shadow:
                        0 0 0 1px rgba(255,255,255,0.1),
                        0 40px 120px rgba(0,0,0,0.55),
                        0 12px 36px rgba(0,0,0,0.3),
                        inset 0 1px 0 rgba(255,255,255,0.08);
                    transform-style: preserve-3d;
                }

                /* ══ LEFT PANEL ══ */
                .pap-left {
                    position: relative; overflow: hidden;
                    background: linear-gradient(140deg, #0d0f17 0%, #161d2c 40%, #1a1228 80%, #0e1419 100%);
                    padding: 46px 42px 40px;
                    display: flex; flex-direction: column;
                    min-height: 580px;
                }

                /* Grid dot pattern */
                .pap-grid-overlay {
                    position: absolute; inset: 0;
                    background-image:
                        radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
                    background-size: 32px 32px;
                    pointer-events: none;
                    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
                }

                /* Shimmer sweep */
                .pap-shimmer {
                    position: absolute; top: 0; bottom: 0; width: 60%;
                    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.055) 50%, transparent 70%);
                    pointer-events: none; z-index: 1;
                }

                /* Floating deco icons */
                .pap-deco {
                    position: absolute; z-index: 2;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 50%; backdrop-filter: blur(4px);
                    pointer-events: none;
                }
                .pap-deco1 {
                    top: 12%; right: 14%;
                    width: 36px; height: 36px;
                    background: rgba(201,169,110,0.18);
                    border: 1px solid rgba(201,169,110,0.3);
                    color: #c9a96e;
                }
                .pap-deco2 {
                    top: 35%; right: 8%;
                    width: 28px; height: 28px;
                    background: rgba(255,63,108,0.15);
                    border: 1px solid rgba(255,63,108,0.25);
                    color: #ff3f6c;
                }
                .pap-deco3 {
                    bottom: 22%; right: 18%;
                    width: 30px; height: 30px;
                    background: rgba(3,166,133,0.18);
                    border: 1px solid rgba(3,166,133,0.3);
                    color: #03a685;
                }

                .pap-left-inner {
                    position: relative; z-index: 3;
                    display: flex; flex-direction: column; gap: 18px;
                    flex: 1;
                }

                .pap-eyebrow {
                    display: flex; align-items: center; gap: 10px;
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 3.5px; color: #c9a96e; text-transform: uppercase;
                    width: fit-content;
                }
                .pap-eyebrow-line {
                    display: block; width: 24px; height: 1px;
                    background: linear-gradient(90deg, transparent, #c9a96e, transparent);
                }

                .pap-brand {
                    display: inline-flex; align-items: center; gap: 10px;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 999px; padding: 9px 16px;
                    color: #f2d38a;
                    font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
                    width: fit-content; backdrop-filter: blur(8px);
                }
                .pap-brand-icon {
                    display: flex; align-items: center; justify-content: center;
                    width: 26px; height: 26px; border-radius: 8px;
                    background: linear-gradient(135deg, #c9a96e 0%, #f2d38a 100%);
                    color: #1a0a00;
                }

                .pap-heading {
                    margin: 0;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-size: clamp(30px, 3.8vw, 52px);
                    font-weight: 600; line-height: 1.05; letter-spacing: -0.02em;
                    color: #ffffff;
                    max-width: 14ch;
                }
                .pap-heading em {
                    font-style: italic; color: #f2d38a;
                    font-weight: 500;
                }

                .pap-subtext {
                    margin: 0;
                    font-size: 15px; line-height: 1.7;
                    color: rgba(255,251,242,0.82);
                    max-width: 420px;
                }

                .pap-badges {
                    display: flex; flex-wrap: wrap; gap: 8px;
                }
                .pap-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.14);
                    border-radius: 999px; padding: 7px 13px;
                    font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.9);
                    letter-spacing: 0.3px; backdrop-filter: blur(6px);
                    transition: background 0.2s, border-color 0.2s;
                }
                .pap-badge:hover {
                    background: rgba(201,169,110,0.16);
                    border-color: rgba(201,169,110,0.35);
                    color: #f2d38a;
                }

                /* Feature cards */
                .pap-features {
                    margin-top: auto;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                .pap-feat {
                    padding: 18px 16px;
                    border-radius: 18px;
                    background: linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.15);
                    backdrop-filter: blur(12px);
                    cursor: default;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .pap-feat:hover {
                    border-color: rgba(201,169,110,0.28);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 28px rgba(0,0,0,0.18), 0 0 0 1px rgba(201,169,110,0.15);
                }
                .pap-feat-icon {
                    width: 34px; height: 34px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    background: linear-gradient(135deg, #c9a96e 0%, #f2d38a 100%);
                    color: #1a0a00; margin-bottom: 12px;
                    box-shadow: 0 4px 12px rgba(201,169,110,0.3);
                }
                .pap-feat h4 {
                    margin: 0 0 7px; color: #fff;
                    font-size: 14px; font-weight: 700; line-height: 1.2;
                    letter-spacing: 0.1px;
                }
                .pap-feat p {
                    margin: 0; color: rgba(255,250,240,0.8);
                    font-size: 12px; line-height: 1.55;
                }

                /* ══ RIGHT PANEL ══ */
                .pap-right {
                    background: linear-gradient(180deg, #ffffff 0%, #faf8f4 100%);
                    display: flex; align-items: center; justify-content: center;
                    padding: 28px 24px;
                    position: relative;
                }
                .pap-right::before {
                    content: '';
                    position: absolute; inset: 0;
                    background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(201,169,110,0.06) 0%, transparent 60%);
                    pointer-events: none;
                }

                .pap-card {
                    position: relative; z-index: 1;
                    width: 100%; max-width: 380px;
                    background: #ffffff;
                    border: 1px solid rgba(40,44,63,0.08);
                    border-radius: 24px;
                    padding: 30px 26px 22px;
                    box-shadow:
                        0 2px 4px rgba(40,44,63,0.04),
                        0 12px 32px rgba(40,44,63,0.1),
                        0 28px 56px rgba(40,44,63,0.08);
                }
                .pap-card::after {
                    content: '';
                    position: absolute; top: 0; left: 20px; right: 20px; height: 2px;
                    background: linear-gradient(90deg, transparent, #c9a96e 30%, #ff3f6c 70%, transparent);
                    border-radius: 0 0 999px 999px;
                    opacity: 0.7;
                }

                .pap-card-top {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 10px; margin-bottom: 14px;
                }
                .pap-card-badge {
                    display: inline-flex; align-items: center; gap: 7px;
                }
                .pap-live-dot {
                    display: inline-block;
                    width: 8px; height: 8px; border-radius: 50%;
                    background: #94a3b8;
                    transition: background 0.3s, box-shadow 0.3s;
                }
                .pap-live-dot.live {
                    background: #03a685;
                    box-shadow: 0 0 0 4px rgba(3,166,133,0.18), 0 0 0 8px rgba(3,166,133,0.07);
                }
                .pap-card-label {
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 2px; text-transform: uppercase;
                    color: #94a3b8;
                }
                .pap-countdown {
                    display: inline-flex; align-items: center; gap: 5px;
                    background: linear-gradient(135deg, #fff5f7 0%, #ffeef3 100%);
                    border: 1px solid rgba(255,63,108,0.2);
                    border-radius: 999px; padding: 4px 10px;
                    font-size: 11px; font-weight: 800;
                    color: #ff3f6c; letter-spacing: 0.5px;
                }

                .pap-ornament {
                    display: inline-flex; align-items: center; gap: 7px;
                    background: linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(255,63,108,0.05) 100%);
                    border: 1px solid rgba(201,169,110,0.2);
                    border-radius: 999px; padding: 7px 12px;
                    font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
                    color: #7c5c1a; text-transform: uppercase;
                    margin-bottom: 14px; width: fit-content;
                }
                .pap-ornament svg { color: #c9a96e; }

                .pap-card-title {
                    margin: 0 0 8px;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-size: clamp(24px, 2.8vw, 32px);
                    font-weight: 600; line-height: 1.08; letter-spacing: -0.02em;
                    color: #282c3f;
                }
                .pap-card-sub {
                    margin: 0 0 18px;
                    font-size: 14px; line-height: 1.6; color: #696b79;
                }

                /* Perks list */
                .pap-perks {
                    list-style: none; margin: 0 0 20px; padding: 0;
                    display: flex; flex-direction: column; gap: 8px;
                }
                .pap-perk {
                    display: flex; align-items: center; gap: 10px;
                    font-size: 13px; color: #535766; font-weight: 500;
                }
                .pap-perk-icon {
                    display: flex; align-items: center; justify-content: center;
                    width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
                    background: linear-gradient(135deg, #f0fcf7 0%, #e6fff8 100%);
                    border: 1px solid rgba(3,166,133,0.2);
                    color: #03a685;
                }

                /* CTA Buttons */
                .pap-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 4px; }

                .pap-btn {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    min-height: 50px; border-radius: 12px;
                    text-decoration: none; font-family: 'Assistant', sans-serif;
                    font-weight: 800; font-size: 13px; letter-spacing: 0.8px;
                    transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s;
                    position: relative; overflow: hidden;
                }
                .pap-btn::after {
                    content: '';
                    position: absolute; inset: 0;
                    background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%);
                    pointer-events: none;
                }
                .pap-btn:hover { transform: translateY(-2px); }

                .pap-btn-primary {
                    background: linear-gradient(135deg, #282c3f 0%, #3d1f47 50%, #ff3f6c 120%);
                    color: #ffffff;
                    box-shadow: 0 4px 14px rgba(40,44,63,0.28), 0 10px 28px rgba(255,63,108,0.2);
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                }
                .pap-btn-primary:hover {
                    box-shadow: 0 8px 22px rgba(40,44,63,0.32), 0 14px 36px rgba(255,63,108,0.28);
                    color: #ffffff;
                }
                .pap-btn-arrow { display: flex; align-items: center; }

                .pap-btn-secondary {
                    background: linear-gradient(180deg, #ffffff 0%, #f8f6f2 100%);
                    color: #282c3f;
                    border: 1.5px solid rgba(40,44,63,0.18);
                    box-shadow: 0 2px 8px rgba(40,44,63,0.08);
                }
                .pap-btn-secondary:hover {
                    border-color: #c9a96e;
                    color: #7c5c1a;
                    box-shadow: 0 4px 14px rgba(201,169,110,0.2);
                }
                .pap-btn-secondary svg { color: #c9a96e; }

                .pap-skip {
                    display: block; width: 100%; margin-top: 10px;
                    border: none; background: transparent; padding: 8px 0 0;
                    font-family: 'Assistant', sans-serif;
                    font-size: 12px; font-weight: 600; color: #94969f;
                    cursor: pointer; letter-spacing: 0.3px;
                    transition: color 0.2s;
                }
                .pap-skip:hover { color: #ff3f6c; }

                /* Trust strip */
                .pap-trust {
                    display: flex; align-items: center; justify-content: center;
                    gap: 10px; flex-wrap: wrap;
                    margin-top: 16px; padding-top: 14px;
                    border-top: 1px dashed rgba(40,44,63,0.1);
                    font-size: 11px; color: #94969f; font-weight: 600;
                }
                .pap-trust span {
                    display: inline-flex; align-items: center; gap: 5px;
                }
                .pap-trust svg { color: #03a685; }
                .pap-trust-sep {
                    width: 3px; height: 3px; border-radius: 50%;
                    background: #d4d5d9; display: inline-block;
                    flex-shrink: 0;
                }

                /* ══ CLOSE BUTTON ══ */
                .pap-close {
                    position: absolute; top: 14px; right: 14px;
                    width: 36px; height: 36px; border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.16);
                            /* High-contrast gold gradient to remain visible over light areas */
                            background: linear-gradient(135deg, #b78628 0%, #f3d27a 100%);
                            color: #08111a; /* dark icon color for contrast */
                            cursor: pointer;
                            z-index: 3;
                            transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
                            box-shadow: 0 6px 18px rgba(183, 134, 40, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12);
                            border: 1px solid rgba(0, 0, 0, 0.06);
                        }

                        .premium-auth-close:hover {
                            transform: scale(1.06);
                            box-shadow: 0 8px 22px rgba(183, 134, 40, 0.34), 0 4px 10px rgba(0, 0, 0, 0.14);
                            background: linear-gradient(135deg, #d4a23a 0%, #ffd47a 100%);
                    backdrop-filter: blur(8px);
                    transition: background 0.2s, border-color 0.2s;
                }
                .pap-close:hover {
                    background: rgba(255,63,108,0.85);
                    border-color: rgba(255,63,108,0.6);
                }

                /* ══ RESPONSIVE ══ */
                @media (max-width: 960px) {
                    .pap-modal {
                        grid-template-columns: 1fr;
                        max-width: 540px;
                        border-radius: 24px;
                    }
                    .pap-left { min-height: auto; padding: 38px 30px 28px; }
                    .pap-features { grid-template-columns: repeat(3,1fr); gap: 10px; }
                    .pap-feat { padding: 14px 12px; }
                    .pap-feat h4 { font-size: 12px; }
                    .pap-feat p { display: none; }
                    .pap-heading { font-size: clamp(28px, 5vw, 40px); }
                    .pap-subtext { font-size: 14px; }
                    .pap-deco1, .pap-deco2, .pap-deco3 { display: none; }
                }

                @media (max-width: 640px) {
                    .pap-overlay {
                        padding: 0;
                        align-items: flex-end;
                    }
                    .pap-modal {
                        width: 100%; max-width: 100%;
                        border-radius: 24px 24px 0 0;
                        grid-template-columns: 1fr;
                        max-height: 93vh;
                        overflow-y: auto;
                    }
                    .pap-left {
                        padding: 30px 20px 22px;
                        min-height: auto;
                    }
                    .pap-heading { font-size: clamp(26px, 7vw, 34px); }
                    .pap-subtext { font-size: 13px; line-height: 1.65; }
                    .pap-features { grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 16px; }
                    .pap-feat { padding: 12px 10px; border-radius: 14px; }
                    .pap-feat-icon { width: 28px; height: 28px; margin-bottom: 8px; }
                    .pap-feat h4 { font-size: 11px; margin-bottom: 0; }
                    .pap-feat p { display: none; }
                    .pap-right { padding: 16px 16px 24px; }
                    .pap-card {
                        border-radius: 20px;
                        padding: 22px 18px 18px;
                        box-shadow: 0 4px 16px rgba(40,44,63,0.1);
                    }
                    .pap-card-title { font-size: 26px; }
                    .pap-card-sub { font-size: 13px; margin-bottom: 14px; }
                    .pap-perks { gap: 6px; margin-bottom: 16px; }
                    .pap-perk { font-size: 12px; }
                    .pap-btn { min-height: 46px; font-size: 12px; }
                    .pap-ornament { font-size: 10px; }
                    .pap-badges { gap: 6px; }
                    .pap-badge { font-size: 10px; padding: 5px 10px; }
                    .pap-close { top: 12px; right: 12px; width: 32px; height: 32px; }
                }

                @media (max-width: 380px) {
                    .pap-left { padding: 26px 16px 18px; gap: 14px; }
                    .pap-heading { font-size: 24px; }
                    .pap-features { display: none; }
                    .pap-right { padding: 12px 12px 20px; }
                    .pap-card { padding: 18px 14px 16px; }
                    .pap-card-title { font-size: 22px; }
                    .pap-perks { display: none; }
                    .pap-trust { font-size: 10px; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .pap-shimmer, .pap-orb, .pap-deco { animation: none !important; }
                    .pap-btn, .pap-feat, .pap-close, .pap-skip { transition: none !important; }
                }
            `}} />
        </>
    )
}
