import React, { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'

function useCounter(target, duration = 2000) {
    const [count, setCount] = useState(0)
    const ref = useRef(null)
    const inView = useInView(ref, { once: true })
    useEffect(() => {
        if (!inView) return
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
            start += step
            if (start >= target) { setCount(target); clearInterval(timer) }
            else setCount(Math.floor(start))
        }, 16)
        return () => clearInterval(timer)
    }, [inView, target, duration])
    return { count, ref }
}

function StatItem({ value, suffix, label, prefix = '' }) {
    const { count, ref } = useCounter(value)
    return (
        <div ref={ref} className="stat-item">
            <span className="stat-number">{prefix}{count}{suffix}</span>
            <span className="stat-label">{label}</span>
        </div>
    )
}

const HERO_IMG = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1800&q=90&fit=crop'
const STORY_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85&fit=crop'
const AMBASSADOR_1 = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=80&fit=crop'
const AMBASSADOR_2 = 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&q=80&fit=crop'
const AMBASSADOR_3 = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&q=80&fit=crop'
const AMBASSADOR_4 = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80&fit=crop'

export default function About() {
    const navigate = useNavigate()

    const heroRef = useRef(null)
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
    const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
    const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

    const [activeTab, setActiveTab] = useState(0)
    const [activeMilestone, setActiveMilestone] = useState(0)
    const [marqueeRunning, setMarqueeRunning] = useState(true)
    const [activeCategory, setActiveCategory] = useState(0)

    const values = [
        { icon: '✦', title: 'Timeless Craft', desc: 'Every piece is born from a meticulous 48-step process, overseen by artisans with decades of expertise. We refuse to rush perfection.', accent: '#C9A96E' },
        { icon: '◈', title: 'Sustainable Soul', desc: 'From seed to stitch, we trace every fibre. Our supply chain is 100% transparent, carbon-neutral, and certified by Fair Wear Foundation.', accent: '#6E9E8D' },
        { icon: '⬡', title: 'Global Vision', desc: 'Designed in Paris, crafted in artisan ateliers across 12 countries, delivered to 32 nations. Fashion without borders.', accent: '#8B7BAB' },
        { icon: '◉', title: 'Radical Inclusion', desc: 'Sizes XXS–6XL in every collection, no exceptions. Beauty is not a size, a shade, or a shape — it is a feeling we create for everyone.', accent: '#B05F6D' },
    ]

    const milestones = [
        { year: '2024', title: 'The Genesis', desc: 'Eshopper was founded with one obsession: make luxury democratically accessible without sacrificing a single stitch of quality.' },
        { year: '2024 Q2', title: 'First Collection', desc: 'Our debut Soleil line sold out in 72 hours. 500 pieces, 32 countries, zero compromises.' },
        { year: '2024 Q4', title: 'Global Recognition', desc: 'Awarded Most Innovative Fashion Brand by Vogue Business and featured in Forbes 30 Under 30.' },
        { year: '2025', title: 'The Future', desc: 'Expanding into bespoke tailoring, sustainable luxury fabrics, and our first flagship atelier in Paris.' },
    ]

    const testimonials = [
        { quote: 'The craftsmanship is extraordinary. I have worn Chanel, Dior — Eshopper belongs in that conversation.', author: 'Sofia L., Milan', rating: 5, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&fit=crop&crop=face' },
        { quote: 'Finally, a brand that delivers on every promise. The quality is genuinely jaw-dropping at this price.', author: 'Marcus T., London', rating: 5, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&fit=crop&crop=face' },
        { quote: 'I have never felt more confident. The fit, the fabric, the finish — nothing short of perfection.', author: 'Ayesha R., Dubai', rating: 5, avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&fit=crop&crop=face' },
        { quote: 'Eshopper redefined what I expect from a fashion brand. Exceptional in every way.', author: 'James W., New York', rating: 5, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&fit=crop&crop=face' },
        { quote: 'The sustainable ethos combined with luxury aesthetics is exactly what the industry needed.', author: 'Chloe M., Paris', rating: 5, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&fit=crop&crop=face' },
    ]

    const awards = ['Vogue Business Award', 'Forbes Innovation', 'Sustainable Fashion Leader', 'GQ Style Icon', "Harper's Bazaar Pick", 'Elle Global Award', 'Business of Fashion']

    const categories = [
        { name: 'Women', sub: '2,400+ Styles', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=85&fit=crop', badge: 'New In' },
        { name: 'Men', sub: '1,800+ Styles', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=85&fit=crop', badge: 'Trending' },
        { name: 'Kids', sub: '900+ Styles', img: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&q=85&fit=crop', badge: 'Bestseller' },
        { name: 'Accessories', sub: '600+ Pieces', img: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&q=85&fit=crop', badge: 'Limited' },
        { name: 'Beauty', sub: '300+ Products', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=85&fit=crop', badge: 'Luxury' },
        { name: 'Sport', sub: '500+ Styles', img: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=85&fit=crop', badge: 'Active' },
    ]

    const pressItems = [
        { name: 'VOGUE', quote: '"The democratisation of true luxury"', year: '2024' },
        { name: 'FORBES', quote: '"Disrupting fashion from the inside"', year: '2024' },
        { name: 'ELLE', quote: '"A paradigm shift in ethical couture"', year: '2025' },
        { name: 'GQ', quote: '"The brand every man needs to know"', year: '2025' },
        { name: "HARPER'S BAZAAR", quote: '"Sustainability never looked this good"', year: '2024' },
    ]

    const ambassadors = [
        { name: 'Aria Fontaine', role: 'Creative Director, Paris', img: AMBASSADOR_1, quote: 'Eshopper is the future of conscious luxury.' },
        { name: 'Zara Mehta', role: 'Style Icon, Mumbai', img: AMBASSADOR_2, quote: 'Every piece tells a story of exceptional craft.' },
        { name: 'Luca Romano', role: 'International Model', img: AMBASSADOR_3, quote: 'Wearing Eshopper feels like wearing art.' },
        { name: 'Maya Chen', role: 'Fashion Editor, Tokyo', img: AMBASSADOR_4, quote: 'The quality speaks before you even touch it.' },
    ]

    return (
        <div className="ab-root">

            {/* ═══════════════════════════════════════
                1. CINEMATIC HERO
            ═══════════════════════════════════════ */}
            <section className="ab-hero" ref={heroRef}>
                <motion.div className="ab-hero-img-wrap" style={{ y: heroY }}>
                    <img src={HERO_IMG} className="ab-hero-img" alt="Fashion" />
                    <div className="ab-hero-overlay" />
                </motion.div>

                {/* Floating trust badges */}
                <div className="ab-floating-badges">
                    <motion.div className="ab-float-badge" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4, duration: 0.8 }}>
                        <span className="ab-float-icon">★</span>
                        <div>
                            <strong>4.9/5</strong>
                            <span>Rating</span>
                        </div>
                    </motion.div>
                    <motion.div className="ab-float-badge" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6, duration: 0.8 }}>
                        <span className="ab-float-icon">🌿</span>
                        <div>
                            <strong>Carbon Zero</strong>
                            <span>Certified</span>
                        </div>
                    </motion.div>
                </div>

                <motion.div className="ab-hero-content" style={{ opacity: heroOpacity }}>
                    <motion.span className="ab-hero-eyebrow" initial={{ opacity: 0, letterSpacing: '20px' }} animate={{ opacity: 1, letterSpacing: '8px' }} transition={{ duration: 1.2, delay: 0.3 }}>
                        OUR JOURNEY
                    </motion.span>
                    <motion.h1 className="ab-hero-title" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6 }}>
                        Crafting a <br /><em>New Standard</em><br />in Fashion.
                    </motion.h1>
                    <motion.p className="ab-hero-sub" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.9 }}>
                        Since 2024 · Bridging luxury & everyday comfort
                    </motion.p>
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.1 }} className="ab-hero-actions">
                        <Link to="/shop/All" className="ab-btn-gold">Explore Collection</Link>
                        <a href="#story" className="ab-btn-ghost">Our Story ↓</a>
                    </motion.div>
                </motion.div>

                <div className="ab-hero-badge">
                    <span className="ab-badge-num">24/7</span>
                    <span className="ab-badge-txt">Global Support</span>
                </div>
                <div className="ab-hero-scroll-hint"><span /></div>
            </section>

            {/* ═══════════════════════════════════════
                2. TRUST BAR (Myntra-style)
            ═══════════════════════════════════════ */}
            <div className="ab-trust-bar">
                {[
                    { icon: '🚚', text: 'Free Delivery on ₹999+' },
                    { icon: '↩️', text: '365-Day Returns' },
                    { icon: '🔒', text: 'Secure Payments' },
                    { icon: '✓', text: '100% Authentic' },
                    { icon: '💬', text: '24/7 Concierge' },
                ].map((item, i) => (
                    <div key={i} className="ab-trust-item">
                        <span>{item.icon}</span>
                        <span>{item.text}</span>
                    </div>
                ))}
            </div>

            {/* ═══════════════════════════════════════
                3. MARQUEE AWARDS STRIP
            ═══════════════════════════════════════ */}
            <div className="ab-marquee-strip" onMouseEnter={() => setMarqueeRunning(false)} onMouseLeave={() => setMarqueeRunning(true)}>
                <div className={`ab-marquee-inner ${marqueeRunning ? '' : 'ab-marquee-paused'}`}>
                    {[...awards, ...awards, ...awards].map((a, i) => (
                        <span key={i} className="ab-marquee-item">
                            <span className="ab-marquee-dot">✦</span> {a}
                        </span>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                4. ANIMATED STATS
            ═══════════════════════════════════════ */}
            <section className="ab-stats">
                <div className="ab-stats-inner">
                    <StatItem value={15} suffix="k+" label="Happy Clients" />
                    <div className="ab-stats-divider" />
                    <StatItem value={500} suffix="+" label="Unique Styles" />
                    <div className="ab-stats-divider" />
                    <StatItem value={32} suffix="" label="Countries Served" />
                    <div className="ab-stats-divider" />
                    <StatItem value={100} suffix="%" label="Pure Quality" />
                    <div className="ab-stats-divider" />
                    <StatItem value={4} suffix=".9★" label="Average Rating" prefix="" />
                </div>
            </section>

            {/* ═══════════════════════════════════════
                5. SHOP BY CATEGORY (Myntra-style)
            ═══════════════════════════════════════ */}
            <section className="ab-categories">
                <div className="ab-categories-header">
                    <span className="ab-section-eyebrow center">Discover</span>
                    <h2 className="ab-section-title center">Shop by <em>Category</em></h2>
                    <p className="ab-categories-sub">Curated collections for every occasion, every person, every story.</p>
                </div>
                <div className="ab-cat-grid">
                    {categories.map((cat, i) => (
                        <motion.div
                            key={i}
                            className={`ab-cat-card ${activeCategory === i ? 'active' : ''}`}
                            onClick={() => {
                                setActiveCategory(i)
                                navigate(`/shop/${cat.name}`)
                            }}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.08 }}
                            whileHover={{ y: -8 }}
                        >
                            <div className="ab-cat-img-wrap">
                                <img src={cat.img} alt={cat.name} className="ab-cat-img" />
                                <div className="ab-cat-overlay" />
                                <span className="ab-cat-badge">{cat.badge}</span>
                            </div>
                            <div className="ab-cat-info">
                                <h4 className="ab-cat-name">{cat.name}</h4>
                                <span className="ab-cat-sub">{cat.sub}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════
                6. BRAND STORY
            ═══════════════════════════════════════ */}
            <section className="ab-story" id="story">
                <div className="ab-story-grid">
                    <motion.div className="ab-story-img-col" initial={{ opacity: 0, x: -60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }}>
                        <div className="ab-story-img-frame">
                            <img src={STORY_IMG} alt="Our Story" className="ab-story-img" />
                            <div className="ab-story-img-caption">
                                <span>ATELIER</span>
                                <span>2024</span>
                            </div>
                        </div>
                        <div className="ab-story-accent-block">
                            <p className="ab-accent-quote">"Fashion is not something that exists in dresses only. Fashion is in the sky, in the street."</p>
                            <span className="ab-accent-author">— Coco Chanel</span>
                        </div>
                    </motion.div>
                    <motion.div className="ab-story-text-col" initial={{ opacity: 0, x: 60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }}>
                        <span className="ab-section-eyebrow">The Eshopper Story</span>
                        <h2 className="ab-section-title">Born from<br /><em>Passion,</em><br />Built on Quality.</h2>
                        <p className="ab-story-para">
                            Eshopper began with a single conviction: that extraordinary fashion should not be a privilege of the few. Our founders — a coalition of designers, technologists, and ethical sourcing experts — came together in 2024 to disrupt the industry from the inside.
                        </p>
                        <p className="ab-story-para">
                            Today, we operate a fully transparent supply chain across 12 countries, with every garment traceable to its origin. We partner only with certified sustainable factories, paying artisans a living wage while maintaining the exacting standards of a Parisian atelier.
                        </p>
                        <div className="ab-story-pillars">
                            {['Ethical Sourcing', 'Master Artisans', 'Carbon Neutral', 'Fair Wages'].map((p, i) => (
                                <span key={i} className="ab-pillar-tag">{p}</span>
                            ))}
                        </div>
                        {/* Mini stats row */}
                        <div className="ab-story-mini-stats">
                            {[
                                { num: '12', label: 'Countries' },
                                { num: '48', label: 'Step Process' },
                                { num: '100%', label: 'Traceable' },
                            ].map((s, i) => (
                                <div key={i} className="ab-story-mini-stat">
                                    <strong>{s.num}</strong>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </div>
                        <Link to="/shop/All" className="ab-btn-gold" style={{ marginTop: '2rem', display: 'inline-flex' }}>Shop the Vision</Link>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                7. INTERACTIVE VALUES TABS
            ═══════════════════════════════════════ */}
            <section className="ab-values">
                <div className="ab-values-header">
                    <span className="ab-section-eyebrow">Our Philosophy</span>
                    <h2 className="ab-section-title center">The Four<br /><em>Pillars</em> of Eshopper</h2>
                </div>
                <div className="ab-values-tabs">
                    {values.map((v, i) => (
                        <button key={i} className={`ab-tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)} style={{ '--accent': v.accent }}>
                            <span className="ab-tab-icon">{v.icon}</span>
                            <span>{v.title}</span>
                        </button>
                    ))}
                </div>
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} className="ab-tab-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} style={{ '--accent': values[activeTab].accent }}>
                        <div className="ab-tab-icon-big">{values[activeTab].icon}</div>
                        <h3 className="ab-tab-title">{values[activeTab].title}</h3>
                        <p className="ab-tab-desc">{values[activeTab].desc}</p>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* ═══════════════════════════════════════
                8. PRODUCTION PROCESS — CINEMATIC CARDS
            ═══════════════════════════════════════ */}
            <section className="ab-process">
                <div className="ab-process-header">
                    <span className="ab-section-eyebrow light">The Craft</span>
                    <h2 className="ab-section-title center light">Production<br /><em>Excellence</em></h2>
                    <p className="ab-process-sub">From raw fibre to your wardrobe — every step is an act of devotion.</p>
                </div>
                <div className="ab-process-cards">
                    {[
                        { img: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=700&q=85&fit=crop', step: '01', title: 'Selection', text: 'We travel to the world\'s finest mills — Biella, Osaka, Como — hand-selecting every fabric bolt.', tag: 'Sourcing' },
                        { img: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=700&q=85&fit=crop', step: '02', title: 'Precision', text: 'Laser-guided cutting, hand-basted seams, and a 48-point inspection checklist. Zero shortcuts.', tag: 'Craftsmanship' },
                        { img: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=700&q=85&fit=crop', step: '03', title: 'Testing', text: 'Each piece endures 200+ wear cycles, wash tests, and colorfastness checks before it earns our label.', tag: 'Quality Control' },
                    ].map((item, i) => (
                        <motion.div key={i} className="ab-process-card" initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.15 }} whileHover={{ y: -12 }}>
                            <div className="ab-process-img-wrap">
                                <img src={item.img} alt={item.title} className="ab-process-img" />
                                <div className="ab-process-img-overlay" />
                                <span className="ab-process-tag">{item.tag}</span>
                                <span className="ab-process-step">{item.step}</span>
                            </div>
                            <div className="ab-process-card-body">
                                <h4 className="ab-process-title">{item.title}</h4>
                                <p className="ab-process-text">{item.text}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════
                9. BRAND MILESTONE TIMELINE
            ═══════════════════════════════════════ */}
            <section className="ab-timeline">
                <span className="ab-section-eyebrow center">Our Milestones</span>
                <h2 className="ab-section-title center">The Journey<br />So <em>Far</em></h2>
                <div className="ab-timeline-track">
                    {milestones.map((m, i) => (
                        <div key={i} className={`ab-tl-item ${activeMilestone === i ? 'active' : ''}`} onClick={() => setActiveMilestone(i)}>
                            <div className="ab-tl-dot" />
                            <span className="ab-tl-year">{m.year}</span>
                        </div>
                    ))}
                    <div className="ab-tl-progress" style={{ width: `${(activeMilestone / (milestones.length - 1)) * 100}%` }} />
                </div>
                <AnimatePresence mode="wait">
                    <motion.div key={activeMilestone} className="ab-tl-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                        <h3 className="ab-tl-title">{milestones[activeMilestone].title}</h3>
                        <p className="ab-tl-desc">{milestones[activeMilestone].desc}</p>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* ═══════════════════════════════════════
                10. PRESS COVERAGE (New — premium brand style)
            ═══════════════════════════════════════ */}
            <section className="ab-press">
                <div className="ab-press-header">
                    <span className="ab-section-eyebrow center light">Featured In</span>
                    <h2 className="ab-section-title center light">As Seen <em>In</em></h2>
                </div>
                <div className="ab-press-grid">
                    {pressItems.map((item, i) => (
                        <motion.div key={i} className="ab-press-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }} whileHover={{ borderColor: '#C9A96E', y: -4 }}>
                            <div className="ab-press-name">{item.name}</div>
                            <p className="ab-press-quote">{item.quote}</p>
                            <span className="ab-press-year">{item.year}</span>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════
                11. SERVICE / PROMISE GRID
            ═══════════════════════════════════════ */}
            <section className="ab-promise">
                <div className="ab-promise-header">
                    <span className="ab-section-eyebrow">Our Promise</span>
                    <h2 className="ab-section-title center">Every Purchase,<br />Every <em>Promise</em> Kept.</h2>
                </div>
                <div className="ab-promise-grid">
                    {[
                        { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M5 12l7-7 7 7M5 12v7a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-7"/></svg>, title: 'Express Delivery', desc: 'Same-day dispatch on orders before 2 PM. Global express in 2–4 business days, tracked every step.', color: '#EFF6FF' },
                        { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>, title: 'Vault-Level Security', desc: '256-bit SSL encryption, PCI-DSS Level 1 compliant. Your data never leaves our secure infrastructure.', color: '#F0FDF4' },
                        { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M4 4h16v16H4V4zm4 8l3 3 5-5"/></svg>, title: 'Infinite Returns', desc: '365-day returns, no questions asked. We cover return shipping worldwide. Always.', color: '#FFF7ED' },
                        { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M12 2l3 6.5L22 9l-5 5 1.2 7L12 18l-6.2 3L7 14 2 9l7-.5L12 2z"/></svg>, title: 'Certified Authentic', desc: 'Every item ships with a unique QR-verified certificate of authenticity and a care passport.', color: '#FDF4FF' },
                        { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM12 4v3M8 4v3M16 4v3"/></svg>, title: 'Luxury Packaging', desc: 'Signature matte black boxes, hand-tied ribbons, and a personalised note — every time.', color: '#FFFBEB' },
                        { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, title: 'Concierge Support', desc: 'Dedicated style concierge available 24/7 via chat, WhatsApp, and video call. Real humans only.', color: '#F0F9FF' },
                    ].map((item, i) => (
                        <motion.div key={i} className="ab-promise-card" style={{ '--bg': item.color }} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }} whileHover={{ y: -8, scale: 1.02 }}>
                            <span className="ab-promise-icon">{item.svg}</span>
                            <h5 className="ab-promise-title">{item.title}</h5>
                            <p className="ab-promise-desc">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════
                12. TESTIMONIALS CAROUSEL
            ═══════════════════════════════════════ */}
            <section className="ab-testimonials">
                <div className="ab-test-header">
                    <span className="ab-section-eyebrow light">Client Stories</span>
                    <h2 className="ab-section-title center light">What Our <em>Clients</em> Say</h2>
                </div>
                <div className="ab-test-marquee">
                    <div className="ab-test-track">
                        {[...testimonials, ...testimonials].map((t, i) => (
                            <div key={i} className="ab-test-card">
                                <div className="ab-test-top">
                                    <img src={t.avatar} alt={t.author} className="ab-test-avatar" />
                                    <div>
                                        <div className="ab-test-stars">{'★'.repeat(t.rating)}</div>
                                        <span className="ab-test-author">{t.author}</span>
                                    </div>
                                </div>
                                <p className="ab-test-quote">"{t.quote}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                13. BRAND AMBASSADORS (New)
            ═══════════════════════════════════════ */}
            <section className="ab-ambassadors">
                <div className="ab-ambassadors-header">
                    <span className="ab-section-eyebrow center">The Faces</span>
                    <h2 className="ab-section-title center">Our Brand <em>Ambassadors</em></h2>
                    <p className="ab-ambassadors-sub">Visionaries who wear their values, not just our clothes.</p>
                </div>
                <div className="ab-amb-grid">
                    {ambassadors.map((a, i) => (
                        <motion.div key={i} className="ab-amb-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.12 }} whileHover={{ y: -8 }}>
                            <div className="ab-amb-img-wrap">
                                <img src={a.img} alt={a.name} className="ab-amb-img" />
                                <div className="ab-amb-overlay">
                                    <p className="ab-amb-quote">"{a.quote}"</p>
                                </div>
                            </div>
                            <div className="ab-amb-info">
                                <h5 className="ab-amb-name">{a.name}</h5>
                                <span className="ab-amb-role">{a.role}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════
                14. APP DOWNLOAD BANNER (Myntra-style)
            ═══════════════════════════════════════ */}
            <section className="ab-app-banner">
                <div className="ab-app-content">
                    <motion.div className="ab-app-text" initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                        <span className="ab-section-eyebrow light">Mobile Experience</span>
                        <h2 className="ab-section-title light">Shop Luxury,<br /><em>Anywhere.</em></h2>
                        <p className="ab-app-desc">Get exclusive app-only deals, early access to new collections, and personalised styling recommendations. Your luxury wardrobe, in your pocket.</p>
                        <div className="ab-app-features">
                            {['Exclusive App Deals', 'Early Access Drops', 'Live Style Assist', 'AR Try-On'].map((f, i) => (
                                <div key={i} className="ab-app-feature">
                                    <span className="ab-app-check">✓</span>
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>
                        <div className="ab-app-btns">
                            <a href="#" className="ab-store-btn">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="22"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                                <div><small>Download on the</small><strong>App Store</strong></div>
                            </a>
                            <a href="#" className="ab-store-btn">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="22"><path d="M3.18 23.76c.3.17.64.24.99.2l13.5-7.74-2.84-2.85-11.65 10.39zm15.73-9.28L5.23 7.02l2.84 2.83 10.84 4.63zM2.1 1.54C2.04 1.75 2 1.98 2 2.23v19.54c0 .25.04.48.1.69L14.2 10.4 2.1 1.54zm18.44 9.2l-2.87-1.64-3.13 3.14 3.13 3.14 2.9-1.66c.83-.47.83-1.51-.03-1.98z"/></svg>
                                <div><small>Get it on</small><strong>Google Play</strong></div>
                            </a>
                        </div>
                    </motion.div>
                    <motion.div className="ab-app-phone" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }}>
                        <div className="ab-phone-mockup">
                            <div className="ab-phone-screen">
                                <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=85&fit=crop" alt="App" className="ab-phone-img" />
                                <div className="ab-phone-ui">
                                    <div className="ab-phone-bar">
                                        <span>New Arrivals</span>
                                        <span className="ab-phone-tag">LIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                15. NEWSLETTER (Amazon-style)
            ═══════════════════════════════════════ */}
            <section className="ab-newsletter">
                <motion.div className="ab-newsletter-inner" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                    <span className="ab-section-eyebrow center">Stay Ahead</span>
                    <h2 className="ab-news-title">Get Exclusive <em>Access</em></h2>
                    <p className="ab-news-sub">Early drops, member-only sales, style guides, and curated edits — delivered to your inbox first.</p>
                    <div className="ab-news-form">
                        <input type="email" placeholder="Enter your email address" className="ab-news-input" />
                        <button className="ab-btn-gold">Subscribe</button>
                    </div>
                    <p className="ab-news-fine">No spam, ever. Unsubscribe anytime. By subscribing you agree to our Privacy Policy.</p>
                    <div className="ab-news-perks">
                        {['₹500 Welcome Voucher', 'Exclusive Pre-Sale Access', 'Free Style Consultation'].map((p, i) => (
                            <span key={i} className="ab-news-perk">✦ {p}</span>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* ═══════════════════════════════════════
                16. CTA BANNER
            ═══════════════════════════════════════ */}
            <section className="ab-cta">
                <motion.div className="ab-cta-inner" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                    <span className="ab-cta-eyebrow">Begin Your Journey</span>
                    <h2 className="ab-cta-title">Wear What You<br /><em>Believe In.</em></h2>
                    <p className="ab-cta-sub">Join 15,000+ clients who chose quality, conscience, and character.</p>
                    <div className="ab-cta-actions">
                        <Link to="/shop/All" className="ab-btn-gold lg">Shop Now</Link>
                        <Link to="/contact" className="ab-btn-ghost-dark">Contact Us</Link>
                    </div>
                </motion.div>
            </section>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Montserrat:wght@300;400;500;600&display=swap');

                .ab-root {
                    --gold: #C9A96E;
                    --gold-light: #E8D5B0;
                    --dark: #0D0D0D;
                    --mid: #1A1A1A;
                    --text: #3D3D3D;
                    --muted: #888;
                    --light: #F7F5F0;
                    --white: #FFFFFF;
                    --radius: 4px;
                    font-family: 'Montserrat', sans-serif;
                    background: var(--white);
                    color: var(--text);
                    overflow-x: hidden;
                }
                .ab-section-eyebrow {
                    display: block;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 0.65rem; font-weight: 600;
                    letter-spacing: 6px; text-transform: uppercase;
                    color: var(--gold); margin-bottom: 1rem;
                }
                .ab-section-eyebrow.light { color: var(--gold-light); }
                .ab-section-eyebrow.center { text-align: center; }
                .ab-section-title {
                    font-family: 'Cormorant Garamond', serif;
                    font-weight: 300;
                    font-size: clamp(2.4rem, 5vw, 4rem);
                    line-height: 1.1; color: var(--dark); margin: 0 0 1.5rem;
                }
                .ab-section-title em { font-style: italic; color: var(--gold); }
                .ab-section-title.center { text-align: center; }
                .ab-section-title.light { color: var(--white); }

                /* BUTTONS */
                .ab-btn-gold {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: var(--gold); color: var(--dark);
                    padding: 14px 36px; font-family: 'Montserrat', sans-serif;
                    font-size: 0.72rem; font-weight: 600; letter-spacing: 3px;
                    text-transform: uppercase; text-decoration: none;
                    border: none; cursor: pointer;
                    transition: background 0.3s, transform 0.2s;
                }
                .ab-btn-gold:hover { background: var(--gold-light); transform: translateY(-2px); color: var(--dark); }
                .ab-btn-gold.lg { padding: 18px 48px; font-size: 0.8rem; }
                .ab-btn-ghost {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: transparent; color: var(--white);
                    padding: 14px 36px; font-family: 'Montserrat', sans-serif;
                    font-size: 0.72rem; font-weight: 500; letter-spacing: 2px;
                    text-transform: uppercase; text-decoration: none;
                    border: 1px solid rgba(255,255,255,0.4);
                    transition: border-color 0.3s, color 0.3s;
                }
                .ab-btn-ghost:hover { border-color: var(--gold); color: var(--gold); }
                .ab-btn-ghost-dark {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: transparent; color: var(--dark);
                    padding: 18px 48px; font-family: 'Montserrat', sans-serif;
                    font-size: 0.8rem; font-weight: 500; letter-spacing: 2px;
                    text-transform: uppercase; text-decoration: none;
                    border: 1px solid var(--dark); transition: all 0.3s;
                }
                .ab-btn-ghost-dark:hover { background: var(--dark); color: var(--white); }

                /* HERO */
                .ab-hero {
                    position: relative; height: 100vh; min-height: 700px;
                    overflow: hidden; display: flex; align-items: center; justify-content: center;
                }
                .ab-hero-img-wrap { position: absolute; inset: 0; will-change: transform; }
                .ab-hero-img { width: 100%; height: 115%; object-fit: cover; object-position: center top; }
                .ab-hero-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(135deg, rgba(13,13,13,0.82) 0%, rgba(13,13,13,0.5) 50%, rgba(13,13,13,0.25) 100%);
                }
                .ab-hero-content {
                    position: relative; z-index: 2;
                    max-width: 700px; padding: 0 2rem; text-align: left;
                }
                .ab-hero-eyebrow {
                    display: block; font-family: 'Montserrat', sans-serif;
                    font-size: 0.6rem; font-weight: 600; color: var(--gold);
                    letter-spacing: 8px; text-transform: uppercase; margin-bottom: 2rem;
                }
                .ab-hero-title {
                    font-family: 'Cormorant Garamond', serif; font-weight: 300;
                    font-size: clamp(3rem, 7vw, 6rem); line-height: 1.05;
                    color: var(--white); margin-bottom: 1.5rem;
                }
                .ab-hero-title em { font-style: italic; color: var(--gold); }
                .ab-hero-sub {
                    font-family: 'Montserrat', sans-serif; font-size: 0.8rem;
                    letter-spacing: 3px; color: rgba(255,255,255,0.6);
                    margin-bottom: 2.5rem; text-transform: uppercase;
                }
                .ab-hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
                .ab-hero-badge {
                    position: absolute; bottom: 60px; right: 60px; z-index: 3;
                    background: var(--gold); padding: 24px 32px; text-align: center;
                }
                .ab-badge-num {
                    display: block; font-family: 'Cormorant Garamond', serif;
                    font-size: 2.4rem; font-weight: 600; color: var(--dark); line-height: 1;
                }
                .ab-badge-txt {
                    display: block; font-family: 'Montserrat', sans-serif;
                    font-size: 0.6rem; letter-spacing: 3px; color: var(--dark);
                    text-transform: uppercase; margin-top: 4px;
                }
                .ab-hero-scroll-hint {
                    position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 3;
                }
                .ab-hero-scroll-hint span {
                    display: block; width: 1px; height: 60px;
                    background: linear-gradient(to bottom, transparent, var(--gold));
                    animation: scrollPulse 2s ease-in-out infinite;
                }
                @keyframes scrollPulse {
                    0%, 100% { opacity: 0.3; transform: scaleY(1); }
                    50% { opacity: 1; transform: scaleY(1.3); }
                }
                /* Floating badges on hero */
                .ab-floating-badges {
                    position: absolute; left: 40px; top: 50%; transform: translateY(-50%);
                    z-index: 3; display: flex; flex-direction: column; gap: 12px;
                }
                .ab-float-badge {
                    background: rgba(13,13,13,0.8); backdrop-filter: blur(12px);
                    border: 1px solid rgba(201,169,110,0.3); padding: 14px 20px;
                    display: flex; align-items: center; gap: 12px;
                    font-family: 'Montserrat', sans-serif;
                }
                .ab-float-badge strong { display: block; color: var(--white); font-size: 0.85rem; }
                .ab-float-badge span:last-child { color: rgba(255,255,255,0.5); font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase; }
                .ab-float-icon { font-size: 1.2rem; }

                /* TRUST BAR */
                .ab-trust-bar {
                    background: var(--dark); padding: 14px 5%;
                    display: flex; align-items: center; justify-content: center;
                    gap: 0; flex-wrap: wrap;
                    border-bottom: 1px solid rgba(201,169,110,0.2);
                }
                .ab-trust-item {
                    display: flex; align-items: center; gap: 8px;
                    font-family: 'Montserrat', sans-serif; font-size: 0.65rem;
                    letter-spacing: 1.5px; text-transform: uppercase;
                    color: rgba(255,255,255,0.6); padding: 0 24px;
                    border-right: 1px solid rgba(255,255,255,0.1);
                }
                .ab-trust-item:last-child { border-right: none; }

                /* MARQUEE */
                .ab-marquee-strip {
                    background: #111; overflow: hidden;
                    padding: 14px 0; border-bottom: 1px solid #1a1a1a;
                }
                .ab-marquee-inner {
                    display: flex; gap: 0;
                    animation: marqueeScroll 35s linear infinite; width: max-content;
                }
                .ab-marquee-paused { animation-play-state: paused; }
                @keyframes marqueeScroll {
                    from { transform: translateX(0); }
                    to { transform: translateX(-33.33%); }
                }
                .ab-marquee-item {
                    font-family: 'Montserrat', sans-serif; font-size: 0.65rem;
                    letter-spacing: 4px; text-transform: uppercase;
                    color: rgba(255,255,255,0.4); padding: 0 3rem; white-space: nowrap;
                    transition: color 0.3s;
                }
                .ab-marquee-item:hover { color: var(--gold); }
                .ab-marquee-dot { color: var(--gold); margin-right: 0.5rem; }

                /* STATS */
                .ab-stats {
                    padding: 80px 5%; background: var(--light);
                    border-bottom: 1px solid rgba(201,169,110,0.2);
                }
                .ab-stats-inner {
                    max-width: 1100px; margin: 0 auto;
                    display: flex; align-items: center;
                    justify-content: space-around; flex-wrap: wrap; gap: 2rem;
                }
                .stat-item { text-align: center; flex: 1; min-width: 140px; }
                .stat-number {
                    display: block; font-family: 'Cormorant Garamond', serif;
                    font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 600;
                    color: var(--gold); line-height: 1;
                }
                .stat-label {
                    display: block; font-family: 'Montserrat', sans-serif;
                    font-size: 0.6rem; letter-spacing: 4px;
                    text-transform: uppercase; color: var(--muted); margin-top: 8px;
                }
                .ab-stats-divider {
                    width: 1px; height: 80px;
                    background: linear-gradient(to bottom, transparent, var(--gold), transparent);
                }

                /* CATEGORIES */
                .ab-categories { padding: 120px 5%; background: var(--white); }
                .ab-categories-header { text-align: center; margin-bottom: 60px; }
                .ab-categories-sub {
                    font-size: 0.9rem; color: var(--muted); max-width: 500px;
                    margin: 0 auto; line-height: 1.7;
                }
                .ab-cat-grid {
                    max-width: 1200px; margin: 0 auto;
                    display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px;
                }
                .ab-cat-card {
                    cursor: pointer; border-radius: 2px; overflow: hidden;
                    transition: all 0.4s; border: 2px solid transparent;
                }
                .ab-cat-card.active { border-color: var(--gold); }
                .ab-cat-img-wrap { position: relative; overflow: hidden; aspect-ratio: 3/4; }
                .ab-cat-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
                .ab-cat-card:hover .ab-cat-img { transform: scale(1.06); }
                .ab-cat-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(to top, rgba(13,13,13,0.7) 0%, transparent 60%);
                }
                .ab-cat-badge {
                    position: absolute; top: 12px; left: 12px;
                    font-family: 'Montserrat', sans-serif; font-size: 0.5rem;
                    letter-spacing: 2px; text-transform: uppercase;
                    background: var(--gold); color: var(--dark);
                    padding: 4px 10px; font-weight: 600;
                }
                .ab-cat-info { padding: 14px 10px; background: var(--white); }
                .ab-cat-name {
                    font-family: 'Cormorant Garamond', serif; font-size: 1.1rem;
                    font-weight: 400; color: var(--dark); margin: 0 0 2px;
                }
                .ab-cat-sub {
                    font-family: 'Montserrat', sans-serif; font-size: 0.55rem;
                    letter-spacing: 2px; color: var(--muted); text-transform: uppercase;
                }

                /* BRAND STORY */
                .ab-story { padding: 120px 5%; background: var(--white); }
                .ab-story-grid {
                    max-width: 1200px; margin: 0 auto;
                    display: grid; grid-template-columns: 1fr 1fr;
                    gap: 80px; align-items: start;
                }
                .ab-story-img-frame { position: relative; overflow: hidden; }
                .ab-story-img { width: 100%; height: 580px; object-fit: cover; display: block; }
                .ab-story-img-caption {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    background: rgba(13,13,13,0.7);
                    display: flex; justify-content: space-between; padding: 12px 20px;
                    font-family: 'Montserrat', sans-serif; font-size: 0.6rem;
                    letter-spacing: 4px; color: rgba(255,255,255,0.6); text-transform: uppercase;
                }
                .ab-story-accent-block {
                    background: var(--dark); padding: 32px;
                    border-left: 3px solid var(--gold);
                }
                .ab-accent-quote {
                    font-family: 'Cormorant Garamond', serif; font-size: 1.1rem;
                    font-style: italic; color: rgba(255,255,255,0.8); margin: 0 0 0.5rem; line-height: 1.6;
                }
                .ab-accent-author {
                    font-family: 'Montserrat', sans-serif; font-size: 0.6rem;
                    letter-spacing: 3px; color: var(--gold); text-transform: uppercase;
                }
                .ab-story-text-col { padding-top: 20px; }
                .ab-story-para { font-size: 0.95rem; line-height: 1.85; color: var(--text); margin-bottom: 1.2rem; }
                .ab-story-pillars { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2rem; }
                .ab-pillar-tag {
                    font-family: 'Montserrat', sans-serif; font-size: 0.6rem;
                    letter-spacing: 2px; text-transform: uppercase; color: var(--gold);
                    border: 1px solid var(--gold); padding: 6px 16px;
                }
                .ab-story-mini-stats {
                    display: flex; gap: 2rem; margin-top: 2rem;
                    padding-top: 2rem; border-top: 1px solid rgba(201,169,110,0.2);
                }
                .ab-story-mini-stat { text-align: center; }
                .ab-story-mini-stat strong {
                    display: block; font-family: 'Cormorant Garamond', serif;
                    font-size: 2rem; font-weight: 600; color: var(--gold);
                }
                .ab-story-mini-stat span {
                    font-family: 'Montserrat', sans-serif; font-size: 0.55rem;
                    letter-spacing: 2px; text-transform: uppercase; color: var(--muted);
                }

                /* VALUES TABS */
                .ab-values { padding: 120px 5%; background: var(--light); }
                .ab-values-header { text-align: center; margin-bottom: 3rem; }
                .ab-values-tabs {
                    max-width: 800px; margin: 0 auto 3rem;
                    display: flex; gap: 0; border-bottom: 1px solid #ddd;
                }
                .ab-tab-btn {
                    flex: 1; padding: 16px 8px; background: none;
                    border: none; border-bottom: 3px solid transparent;
                    font-family: 'Montserrat', sans-serif; font-size: 0.65rem;
                    letter-spacing: 2px; text-transform: uppercase; color: var(--muted);
                    cursor: pointer; transition: all 0.3s;
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    margin-bottom: -1px;
                }
                .ab-tab-btn.active { color: var(--accent, var(--gold)); border-bottom-color: var(--accent, var(--gold)); }
                .ab-tab-icon { font-size: 1.2rem; }
                .ab-tab-content {
                    max-width: 600px; margin: 0 auto; text-align: center; padding: 40px 20px;
                }
                .ab-tab-icon-big { font-size: 3rem; color: var(--accent, var(--gold)); margin-bottom: 1rem; display: block; }
                .ab-tab-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 400; color: var(--dark); margin-bottom: 1rem; }
                .ab-tab-desc { font-size: 0.95rem; line-height: 1.9; color: var(--text); }

                /* PROCESS */
                .ab-process { background: var(--dark); padding: 120px 5%; }
                .ab-process-header { text-align: center; margin-bottom: 60px; }
                .ab-process-sub { font-size: 0.85rem; color: rgba(255,255,255,0.5); font-family: 'Montserrat', sans-serif; letter-spacing: 1px; max-width: 500px; margin: 0 auto; }
                .ab-process-cards { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
                .ab-process-card { background: #111; cursor: pointer; transition: all 0.4s; }
                .ab-process-img-wrap { position: relative; overflow: hidden; }
                .ab-process-img { width: 100%; height: 420px; object-fit: cover; display: block; transition: transform 0.6s ease; }
                .ab-process-card:hover .ab-process-img { transform: scale(1.05); }
                .ab-process-img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(13,13,13,0.8), transparent); }
                .ab-process-tag { position: absolute; top: 20px; left: 20px; font-family: 'Montserrat', sans-serif; font-size: 0.55rem; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); background: rgba(13,13,13,0.7); padding: 6px 14px; border: 1px solid rgba(201,169,110,0.3); }
                .ab-process-step { position: absolute; bottom: 20px; right: 20px; font-family: 'Cormorant Garamond', serif; font-size: 3rem; font-weight: 300; color: rgba(201,169,110,0.3); line-height: 1; }
                .ab-process-card-body { padding: 28px 24px; border-top: 1px solid #222; }
                .ab-process-title { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; color: var(--white); margin-bottom: 0.5rem; font-weight: 400; }
                .ab-process-text { font-size: 0.82rem; color: rgba(255,255,255,0.5); line-height: 1.7; margin: 0; }

                /* TIMELINE */
                .ab-timeline { padding: 120px 5%; background: var(--white); }
                .ab-timeline-track { max-width: 800px; margin: 3rem auto 0; position: relative; display: flex; justify-content: space-between; align-items: center; }
                .ab-timeline-track::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e0e0e0; transform: translateY(-50%); }
                .ab-tl-progress { position: absolute; top: 50%; left: 0; height: 2px; background: var(--gold); transform: translateY(-50%); transition: width 0.5s ease; z-index: 1; }
                .ab-tl-item { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer; }
                .ab-tl-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ddd; background: var(--white); transition: all 0.3s; }
                .ab-tl-item.active .ab-tl-dot { background: var(--gold); border-color: var(--gold); width: 18px; height: 18px; box-shadow: 0 0 0 6px rgba(201,169,110,0.2); }
                .ab-tl-year { font-family: 'Montserrat', sans-serif; font-size: 0.6rem; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; white-space: nowrap; }
                .ab-tl-item.active .ab-tl-year { color: var(--gold); font-weight: 600; }
                .ab-tl-content { max-width: 600px; margin: 3rem auto 0; text-align: center; padding: 40px; border: 1px solid rgba(201,169,110,0.2); background: var(--light); }
                .ab-tl-title { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; color: var(--dark); margin-bottom: 1rem; font-weight: 400; }
                .ab-tl-desc { font-size: 0.9rem; color: var(--text); line-height: 1.8; margin: 0; }

                /* PRESS */
                .ab-press { background: var(--dark); padding: 100px 5%; }
                .ab-press-header { text-align: center; margin-bottom: 60px; }
                .ab-press-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: rgba(255,255,255,0.05); }
                .ab-press-card {
                    background: #111; padding: 40px 28px; text-align: center;
                    border: 1px solid transparent; transition: all 0.3s; cursor: default;
                }
                .ab-press-name {
                    font-family: 'Cormorant Garamond', serif; font-size: 1.2rem;
                    font-weight: 600; color: var(--white); letter-spacing: 4px;
                    text-transform: uppercase; margin-bottom: 1rem;
                }
                .ab-press-quote { font-family: 'Cormorant Garamond', serif; font-size: 0.9rem; font-style: italic; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 1rem; }
                .ab-press-year { font-family: 'Montserrat', sans-serif; font-size: 0.55rem; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; }

                /* PROMISE GRID */
                .ab-promise { padding: 120px 5%; background: var(--light); }
                .ab-promise-header { text-align: center; margin-bottom: 60px; }
                .ab-promise-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
                .ab-promise-card { background: var(--bg, var(--white)); padding: 40px 32px; border: 1px solid rgba(0,0,0,0.06); transition: all 0.3s; cursor: default; }
                .ab-promise-card:hover { box-shadow: 0 20px 50px rgba(0,0,0,0.08); border-color: var(--gold); }
                .ab-promise-icon { color: var(--gold); display: block; margin-bottom: 1.2rem; }
                .ab-promise-title { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 400; color: var(--dark); margin-bottom: 0.7rem; }
                .ab-promise-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.8; margin: 0; }

                /* TESTIMONIALS */
                .ab-testimonials { background: var(--dark); padding: 120px 0; overflow: hidden; }
                .ab-test-header { text-align: center; margin-bottom: 60px; padding: 0 5%; }
                .ab-test-marquee { overflow: hidden; }
                .ab-test-track { display: flex; gap: 2rem; animation: testScroll 45s linear infinite; width: max-content; padding: 0 1rem; }
                .ab-test-track:hover { animation-play-state: paused; }
                @keyframes testScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                .ab-test-card { min-width: 400px; max-width: 400px; background: #111; padding: 36px; border: 1px solid #222; flex-shrink: 0; transition: border-color 0.3s; }
                .ab-test-card:hover { border-color: var(--gold); }
                .ab-test-top { display: flex; align-items: center; gap: 14px; margin-bottom: 1.2rem; }
                .ab-test-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(201,169,110,0.4); flex-shrink: 0; }
                .ab-test-stars { color: var(--gold); font-size: 0.7rem; letter-spacing: 3px; margin-bottom: 4px; }
                .ab-test-quote { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; font-style: italic; color: rgba(255,255,255,0.8); line-height: 1.7; margin-bottom: 0; }
                .ab-test-author { font-family: 'Montserrat', sans-serif; font-size: 0.6rem; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; }

                /* AMBASSADORS */
                .ab-ambassadors { padding: 120px 5%; background: var(--white); }
                .ab-ambassadors-header { text-align: center; margin-bottom: 60px; }
                .ab-ambassadors-sub { font-size: 0.9rem; color: var(--muted); max-width: 500px; margin: 0 auto; line-height: 1.7; }
                .ab-amb-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
                .ab-amb-card { cursor: default; overflow: hidden; }
                .ab-amb-img-wrap { position: relative; overflow: hidden; aspect-ratio: 3/4; }
                .ab-amb-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
                .ab-amb-card:hover .ab-amb-img { transform: scale(1.04); }
                .ab-amb-overlay {
                    position: absolute; inset: 0;
                    background: rgba(13,13,13,0.75); opacity: 0;
                    display: flex; align-items: center; justify-content: center; padding: 24px;
                    transition: opacity 0.4s;
                }
                .ab-amb-card:hover .ab-amb-overlay { opacity: 1; }
                .ab-amb-quote { font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-style: italic; color: var(--white); text-align: center; line-height: 1.6; }
                .ab-amb-info { padding: 16px 0 0; border-top: 2px solid var(--gold); margin-top: 2px; }
                .ab-amb-name { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: var(--dark); margin: 0 0 4px; font-weight: 400; }
                .ab-amb-role { font-family: 'Montserrat', sans-serif; font-size: 0.55rem; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }

                /* APP DOWNLOAD BANNER */
                .ab-app-banner { background: var(--dark); padding: 100px 5%; overflow: hidden; }
                .ab-app-content { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
                .ab-app-desc { font-size: 0.9rem; color: rgba(255,255,255,0.6); line-height: 1.8; margin: 0 0 2rem; }
                .ab-app-features { display: flex; flex-direction: column; gap: 10px; margin-bottom: 2rem; }
                .ab-app-feature { display: flex; align-items: center; gap: 10px; font-family: 'Montserrat', sans-serif; font-size: 0.78rem; color: rgba(255,255,255,0.7); }
                .ab-app-check { color: var(--gold); font-size: 0.9rem; }
                .ab-app-btns { display: flex; gap: 12px; flex-wrap: wrap; }
                .ab-store-btn {
                    display: flex; align-items: center; gap: 12px;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
                    padding: 14px 24px; color: var(--white); text-decoration: none;
                    transition: all 0.3s; font-family: 'Montserrat', sans-serif;
                }
                .ab-store-btn:hover { border-color: var(--gold); background: rgba(201,169,110,0.1); }
                .ab-store-btn small { display: block; font-size: 0.55rem; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
                .ab-store-btn strong { display: block; font-size: 0.85rem; font-weight: 600; }
                .ab-app-phone { display: flex; justify-content: center; align-items: center; }
                .ab-phone-mockup {
                    width: 240px; height: 480px; background: #1a1a1a;
                    border-radius: 32px; border: 6px solid #333; overflow: hidden;
                    box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
                    position: relative;
                }
                .ab-phone-screen { width: 100%; height: 100%; position: relative; }
                .ab-phone-img { width: 100%; height: 100%; object-fit: cover; }
                .ab-phone-ui { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(13,13,13,0.8); padding: 14px 16px; }
                .ab-phone-bar { display: flex; justify-content: space-between; align-items: center; font-family: 'Montserrat', sans-serif; font-size: 0.65rem; color: var(--white); letter-spacing: 1px; }
                .ab-phone-tag { background: var(--gold); color: var(--dark); padding: 3px 8px; font-size: 0.5rem; letter-spacing: 2px; font-weight: 600; }

                /* NEWSLETTER */
                .ab-newsletter { padding: 100px 5%; background: var(--light); }
                .ab-newsletter-inner { max-width: 600px; margin: 0 auto; text-align: center; }
                .ab-news-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.1; color: var(--dark); margin: 0 0 1rem; }
                .ab-news-title em { font-style: italic; color: var(--gold); }
                .ab-news-sub { font-size: 0.88rem; color: var(--muted); line-height: 1.7; margin-bottom: 2.5rem; }
                .ab-news-form { display: flex; gap: 0; max-width: 480px; margin: 0 auto 1rem; }
                .ab-news-input {
                    flex: 1; padding: 16px 20px; border: 1px solid #ddd; border-right: none;
                    font-family: 'Montserrat', sans-serif; font-size: 0.8rem;
                    outline: none; background: var(--white); color: var(--dark);
                    transition: border-color 0.3s;
                }
                .ab-news-input:focus { border-color: var(--gold); }
                .ab-news-form .ab-btn-gold { padding: 16px 28px; white-space: nowrap; flex-shrink: 0; }
                .ab-news-fine { font-size: 0.65rem; color: var(--muted); margin-bottom: 2rem; }
                .ab-news-perks { display: flex; justify-content: center; flex-wrap: wrap; gap: 1.5rem; }
                .ab-news-perk { font-family: 'Montserrat', sans-serif; font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }

                /* CTA */
                .ab-cta { padding: 120px 5%; background: var(--white); }
                .ab-cta-inner {
                    max-width: 700px; margin: 0 auto; text-align: center; padding: 80px;
                    border: 1px solid rgba(201,169,110,0.3); position: relative;
                }
                .ab-cta-inner::before, .ab-cta-inner::after { content: ''; position: absolute; width: 30px; height: 30px; border-color: var(--gold); border-style: solid; }
                .ab-cta-inner::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
                .ab-cta-inner::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
                .ab-cta-eyebrow { display: block; font-family: 'Montserrat', sans-serif; font-size: 0.6rem; letter-spacing: 6px; text-transform: uppercase; color: var(--gold); margin-bottom: 1.5rem; }
                .ab-cta-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 300; color: var(--dark); line-height: 1.1; margin-bottom: 1rem; }
                .ab-cta-title em { font-style: italic; color: var(--gold); }
                .ab-cta-sub { font-size: 0.85rem; color: var(--muted); margin-bottom: 2.5rem; line-height: 1.7; }
                .ab-cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

                /* RESPONSIVE */
                @media (max-width: 1200px) {
                    .ab-cat-grid { grid-template-columns: repeat(3, 1fr); }
                    .ab-press-grid { grid-template-columns: repeat(3, 1fr); }
                    .ab-amb-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 992px) {
                    .ab-story-grid { grid-template-columns: 1fr; gap: 40px; }
                    .ab-process-cards { grid-template-columns: 1fr; }
                    .ab-promise-grid { grid-template-columns: repeat(2, 1fr); }
                    .ab-hero-badge { bottom: 20px; right: 20px; padding: 16px 20px; }
                    .ab-cta-inner { padding: 50px 30px; }
                    .ab-app-content { grid-template-columns: 1fr; gap: 50px; }
                    .ab-app-phone { order: -1; }
                    .ab-floating-badges { display: none; }
                    .ab-trust-item { padding: 0 14px; font-size: 0.58rem; }
                }
                @media (max-width: 768px) {
                    .ab-promise-grid { grid-template-columns: 1fr; }
                    .ab-values-tabs { flex-wrap: wrap; }
                    .ab-tab-btn { flex: 1 0 45%; font-size: 0.55rem; }
                    .ab-hero-content { padding: 0 1.5rem; }
                    .ab-hero-title { font-size: clamp(2.2rem, 8vw, 3.5rem); }
                    .ab-stats-inner { flex-direction: column; gap: 3rem; }
                    .ab-stats-divider { width: 80px; height: 1px; }
                    .ab-test-card { min-width: 300px; max-width: 300px; }
                    .ab-timeline-track { gap: 10px; }
                    .ab-tl-year { font-size: 0.5rem; }
                    .ab-cat-grid { grid-template-columns: repeat(2, 1fr); }
                    .ab-press-grid { grid-template-columns: repeat(2, 1fr); }
                    .ab-amb-grid { grid-template-columns: repeat(2, 1fr); }
                    .ab-news-form { flex-direction: column; }
                    .ab-news-input { border-right: 1px solid #ddd; border-bottom: none; }
                    .ab-trust-bar { display: none; }
                }
                @media (max-width: 480px) {
                    .ab-hero-actions { flex-direction: column; }
                    .ab-hero-badge { display: none; }
                    .ab-story-img { height: 350px; }
                    .ab-process-img { height: 280px; }
                    .ab-cat-grid { grid-template-columns: repeat(2, 1fr); }
                    .ab-press-grid { grid-template-columns: 1fr; }
                    .ab-amb-grid { grid-template-columns: 1fr 1fr; }
                    .ab-app-store-btn { width: 100%; }
                }
            `}} />
        </div>
    )
}
