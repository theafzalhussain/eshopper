import React, { useEffect, useState } from 'react'
import { useToast } from './ToastNotification';
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { addContact } from "../Store/ActionCreaters/ContactActionCreators"
import { motion, AnimatePresence } from 'framer-motion'

export default function Contact() {
    var dispatch = useDispatch();
    const toast = useToast();
    var [show, setshow] = useState(false);
    var [data, setdata] = useState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
    });
    const [captcha, setCaptcha] = useState("");
    const [captchaInput, setCaptchaInput] = useState("");
    const [captchaError, setCaptchaError] = useState("");
    const [captchaEnabled, setCaptchaEnabled] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    // Get contact info from env
    const brandName = process.env.REACT_APP_BRAND_NAME || "Eshopper";
    const brandSite = process.env.REACT_APP_BRAND_SITE_URL || "https://eshopperr.me";
    const brandEmail = process.env.REACT_APP_BRAND_EMAIL || "support@eshopperr.me";
    const brandPhone = process.env.REACT_APP_BRAND_PHONE || "+91 8447859784";
    const brandAddress = process.env.REACT_APP_BRAND_ADDRESS || "A-43 Sector 16 Noida, UP, India";
    const openMapUrl = "https://www.google.com/maps/search/?api=1&query=A-43+Sector+16+Noida";

    function getData(e) {
        var { name, value } = e.target;
        setdata((old) => ({ ...old, [name]: value }));
    }

    function generateCaptcha() {
        const code = Math.random().toString().slice(2, 7);
        setCaptcha(code);
        setCaptchaInput("");
        setCaptchaError("");
    }

    useEffect(() => {
        if (captchaEnabled && !captcha) {
            generateCaptcha();
        }
    }, [captchaEnabled, captcha]);

    function postData(e) {
        e.preventDefault();
        if (!captchaEnabled) {
            setCaptchaEnabled(true);
            generateCaptcha();
            toast.info("Captcha enabled. Please enter the code and submit again.");
            return;
        }
        if (!captcha) {
            generateCaptcha();
            toast.info("Please enter the captcha code to submit your message.");
            return;
        }
        if (captchaInput !== captcha) {
            setCaptchaError("Captcha code incorrect. Please try again.");
            generateCaptcha();
            return;
        }
        var item = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
            message: data.message,
            status: "Active",
            time: new Date()
        };
        dispatch(addContact(item));
        setshow(true);
        toast.success("Your message has been sent! We'll contact you soon.");
        setdata({ name: "", email: "", phone: "", subject: "", message: "" });
        setCaptchaEnabled(false);
        setCaptcha("");
        setCaptchaInput("");
        setCaptchaError("");
    }

    const faqs = [
        { q: "How long does it take to get a response?", a: "Our concierge team responds within 2–4 business hours for all queries. Priority members receive a response within 30 minutes." },
        { q: "Can I track my order from the contact page?", a: "Yes! Use the 'Track Order' quick link above the form, or visit your orders section after logging in. Real-time tracking is available for all dispatched orders." },
        { q: "What is your return and exchange policy?", a: "We offer a 365-day hassle-free return policy. Returns are completely free — we arrange pickup from your doorstep at no cost to you." },
        { q: "Do you offer international shipping?", a: "Yes, we ship to 32+ countries worldwide. International express delivery typically takes 2–4 business days with end-to-end tracking." },
        { q: "How can I reach a style concierge?", a: "You can reach our style concierge via WhatsApp (click the floating button), email, or the form below. Video consultations are also available by appointment." },
    ]

    return (
        <div className="ct-root">

            {/* ═══════════════════════════════════════
                1. CINEMATIC HERO
            ═══════════════════════════════════════ */}
            <section className="ct-hero">
                <div className="ct-hero-bg">
                    <img
                        src="https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=1800&q=85&fit=crop"
                        alt="Contact"
                        className="ct-hero-img"
                    />
                    <div className="ct-hero-overlay" />
                </div>

                {/* Floating side badge */}
                <div className="ct-hero-side-badge">
                    <motion.div className="ct-side-item" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }}>
                        <span>⚡</span>
                        <div>
                            <strong>2–4 hrs</strong>
                            <span>Response Time</span>
                        </div>
                    </motion.div>
                    <motion.div className="ct-side-item" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4 }}>
                        <span>🌍</span>
                        <div>
                            <strong>24/7</strong>
                            <span>Global Support</span>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    className="ct-hero-content"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                >
                    <div className="ct-eyebrow">
                        <span className="ct-eyebrow-line" />
                        GET IN TOUCH
                        <span className="ct-eyebrow-line" />
                    </div>
                    <h1 className="ct-hero-title">
                        We're Here for<br /><em>Every Moment</em>
                    </h1>
                    <p className="ct-hero-desc">
                        Our white-glove concierge team is ready to assist — from styling advice to order support. Luxury service is not a perk, it's our standard.
                    </p>
                    <div className="ct-hero-actions">
                        <a href="#contact-form" className="ct-btn-gold">Send a Message ↓</a>
                        <a href={`https://wa.me/${brandPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="ct-btn-ghost">
                            WhatsApp Us
                        </a>
                    </div>
                </motion.div>

                <div className="ct-hero-scroll"><span /></div>
            </section>

            {/* ═══════════════════════════════════════
                2. TRUST BAR (Myntra-style)
            ═══════════════════════════════════════ */}
            <div className="ct-trust-bar">
                {[
                    { icon: '⚡', text: 'Response in 2–4 Hours' },
                    { icon: '🔒', text: '100% Secure & Private' },
                    { icon: '🌍', text: '32+ Countries Supported' },
                    { icon: '♾️', text: '365-Day Return Policy' },
                    { icon: '💎', text: 'Dedicated Style Concierge' },
                ].map((item, i) => (
                    <div key={i} className="ct-trust-item">
                        <span>{item.icon}</span>
                        <span>{item.text}</span>
                    </div>
                ))}
            </div>

            {/* ═══════════════════════════════════════
                3. CONTACT INFO CARDS
            ═══════════════════════════════════════ */}
            <section className="ct-info-section">
                <div className="ct-info-grid">
                    {[
                        {
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                            ),
                            label: 'Our Address',
                            text: brandAddress,
                            link: openMapUrl,
                            linkLabel: 'View on Map →',
                            external: true,
                            accent: '#C9A96E',
                        },
                        {
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" /></svg>
                            ),
                            label: 'Call Us',
                            text: brandPhone,
                            link: `tel:${brandPhone.replace(/\D/g, '')}`,
                            linkLabel: 'Call Now →',
                            external: false,
                            accent: '#6E9E8D',
                        },
                        {
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                            ),
                            label: 'Email Us',
                            text: brandEmail,
                            link: `mailto:${brandEmail}`,
                            linkLabel: 'Send Email →',
                            external: false,
                            accent: '#8B7BAB',
                        },
                        {
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                            ),
                            label: 'Website',
                            text: brandSite.replace(/^https?:\/\//, ''),
                            link: brandSite,
                            linkLabel: 'Visit Site →',
                            external: true,
                            accent: '#B05F6D',
                        },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            className="ct-info-card"
                            style={{ '--card-accent': item.accent }}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            whileHover={{ y: -6 }}
                        >
                            <div className="ct-card-icon-wrap">
                                {item.icon}
                            </div>
                            <h5 className="ct-card-label">{item.label}</h5>
                            <p className="ct-card-text">{item.text}</p>
                            {item.external
                                ? <a href={item.link} target="_blank" rel="noreferrer" className="ct-card-link">{item.linkLabel}</a>
                                : <a href={item.link} className="ct-card-link">{item.linkLabel}</a>
                            }
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════
                4. SUPPORT CHANNELS (New — Amazon style)
            ═══════════════════════════════════════ */}
            <section className="ct-channels">
                <div className="ct-channels-inner">
                    <div className="ct-channels-header">
                        <span className="ct-eyebrow-sm">How to Reach Us</span>
                        <h2 className="ct-section-title">Choose Your <em>Channel</em></h2>
                    </div>
                    <div className="ct-channels-grid">
                        {[
                            {
                                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
                                title: 'Live Chat',
                                desc: 'Instant response from our concierge team. No waiting, no bots.',
                                badge: 'Online Now',
                                badgeColor: '#22c55e',
                                action: 'Start Chat',
                                link: `https://wa.me/${brandPhone.replace(/\D/g, '')}`,
                                external: true,
                            },
                            {
                                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
                                title: 'Email Support',
                                desc: 'Detailed queries? Email us and get a curated reply within 4 hours.',
                                badge: '4hr Response',
                                badgeColor: '#C9A96E',
                                action: 'Send Email',
                                link: `mailto:${brandEmail}`,
                                external: false,
                            },
                            {
                                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" /></svg>,
                                title: 'Phone Support',
                                desc: 'Speak directly with a luxury specialist. Mon–Sat, 9am–9pm IST.',
                                badge: 'Tue–Sat Available',
                                badgeColor: '#8B7BAB',
                                action: 'Call Now',
                                link: `tel:${brandPhone.replace(/\D/g, '')}`,
                                external: false,
                            },
                            {
                                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
                                title: 'Track Your Order',
                                desc: 'Real-time tracking, delivery status, and estimated arrival — all in one place.',
                                badge: 'Instant Access',
                                badgeColor: '#6E9E8D',
                                action: 'Track Order',
                                link: '/my-orders',
                                external: false,
                                isLink: true,
                            },
                        ].map((ch, i) => (
                            <motion.div
                                key={i}
                                className="ct-channel-card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                whileHover={{ y: -6 }}
                            >
                                <div className="ct-ch-top">
                                    <div className="ct-ch-icon">{ch.icon}</div>
                                    <span className="ct-ch-badge" style={{ '--badge-color': ch.badgeColor }}>{ch.badge}</span>
                                </div>
                                <h5 className="ct-ch-title">{ch.title}</h5>
                                <p className="ct-ch-desc">{ch.desc}</p>
                                {ch.isLink
                                    ? <Link to={ch.link} className="ct-ch-btn">{ch.action} →</Link>
                                    : ch.external
                                        ? <a href={ch.link} target="_blank" rel="noreferrer" className="ct-ch-btn">{ch.action} →</a>
                                        : <a href={ch.link} className="ct-ch-btn">{ch.action} →</a>
                                }
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                5. QUICK ACTIONS + CONTACT FORM + MAP
            ═══════════════════════════════════════ */}
            <section className="ct-main-section" id="contact-form">
                <div className="ct-main-inner">

                    {/* QUICK LINKS ROW */}
                    <div className="ct-quick-row">
                        <Link to="/my-orders" className="ct-quick-tile">
                            <span className="ct-quick-icon">
                                <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M3 6h18M6 6v14h12V6M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                            </span>
                            <span>Track Order</span>
                        </Link>
                        <Link to="/return-policy" className="ct-quick-tile">
                            <span className="ct-quick-icon">
                                <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M4 12a8 8 0 1012-6.9M4 12h4m-4 0l2.5-2.5M4 12l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                            </span>
                            <span>Return Policy</span>
                        </Link>
                        <Link to="/faq" className="ct-quick-tile">
                            <span className="ct-quick-icon">
                                <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M12 18h.01M9.1 9.5a2.9 2.9 0 115.8 0c0 2-2.9 2.4-2.9 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                            </span>
                            <span>FAQs</span>
                        </Link>
                        <a href={`mailto:${brandEmail}`} className="ct-quick-tile">
                            <span className="ct-quick-icon">
                                <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                            </span>
                            <span>Email Us</span>
                        </a>
                    </div>

                    <div className="ct-form-map-grid">

                        {/* ─── CONTACT FORM ─── */}
                        <motion.div
                            className="ct-form-wrap"
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            {/* Hours badge */}
                            <div className="ct-hours-strip">
                                <span className="ct-live-dot" />
                                <span>Support Active · Mon–Sat · 9 AM–9 PM IST</span>
                            </div>

                            {show && (
                                <motion.div
                                    className="ct-success-alert"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <span className="ct-success-icon">✓</span>
                                    <div>
                                        <strong>Message Received!</strong>
                                        <p>Your query has been sent. Our team will respond within 2–4 hours.</p>
                                    </div>
                                    <button onClick={() => setshow(false)} className="ct-close-btn">×</button>
                                </motion.div>
                            )}

                            <h3 className="ct-form-title">Write to <em>Us</em></h3>
                            <p className="ct-form-sub">Fill in the details below — your message goes directly to our concierge team.</p>

                            <form onSubmit={postData} autoComplete="off" className="ct-form">
                                <div className="ct-form-row">
                                    <div className="ct-float-field">
                                        <input type="text" name='name' value={data.name} onChange={getData} placeholder=" " required />
                                        <label>Full Name</label>
                                    </div>
                                    <div className="ct-float-field">
                                        <input type="email" name='email' value={data.email} onChange={getData} placeholder=" " required />
                                        <label>Email Address</label>
                                    </div>
                                </div>
                                <div className="ct-form-row">
                                    <div className="ct-float-field">
                                        <input type="text" name='phone' value={data.phone} onChange={getData} placeholder=" " required />
                                        <label>Phone Number</label>
                                    </div>
                                    <div className="ct-float-field">
                                        <input type="text" name='subject' value={data.subject} onChange={getData} placeholder=" " required />
                                        <label>Subject</label>
                                    </div>
                                </div>
                                <div className="ct-float-field ct-float-full">
                                    <textarea rows="5" name='message' value={data.message} onChange={getData} placeholder=" " required></textarea>
                                    <label>Your Message</label>
                                </div>

                                {/* Captcha */}
                                {captchaEnabled && (
                                    <div className="ct-captcha-shell">
                                        <div className="ct-captcha-row">
                                            <span className="ct-captcha-chip">{captcha}</span>
                                            <button type="button" className="ct-captcha-refresh" onClick={generateCaptcha} title="Refresh captcha">↻ Refresh</button>
                                        </div>
                                        <div className="ct-float-field">
                                            <input type="text" placeholder=" " value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} required />
                                            <label>Enter Captcha Code</label>
                                        </div>
                                        {captchaError && <p className="ct-captcha-err">{captchaError}</p>}
                                    </div>
                                )}

                                <motion.button
                                    type="submit"
                                    className="ct-submit-btn"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {captchaEnabled ? "✓  Verify & Send Message" : "Send Message →"}
                                </motion.button>
                            </form>
                        </motion.div>

                        {/* ─── MAP ─── */}
                        <motion.div
                            className="ct-map-wrap"
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="ct-map-shell">
                                <div className="ct-map-top-badge">
                                    <span className="ct-map-pulse" />
                                    <span>Flagship Support Desk</span>
                                </div>
                                <a className="ct-map-open-btn" href={openMapUrl} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
                                <iframe
                                    width="100%"
                                    height="100%"
                                    id="gmap_canvas"
                                    src="https://maps.google.com/maps?q=A-43%20Sector%2016%20Noida&t=&z=14&ie=UTF8&iwloc=&output=embed"
                                    frameBorder="0"
                                    scrolling="no"
                                    style={{ filter: "saturate(1.08) contrast(1.12)" }}
                                    loading="lazy"
                                    title="Office Location"
                                />
                                <div className="ct-map-footer">
                                    <span className="ct-map-pin">📍</span>
                                    <span>{brandAddress}</span>
                                </div>
                            </div>

                            {/* Business hours card below map */}
                            <div className="ct-hours-card">
                                <h5 className="ct-hours-title">Support Hours</h5>
                                <div className="ct-hours-list">
                                    {[
                                        { day: 'Monday – Friday', time: '9:00 AM – 9:00 PM', active: true },
                                        { day: 'Saturday', time: '10:00 AM – 7:00 PM', active: true },
                                        { day: 'Sunday', time: 'Email & WhatsApp Only', active: false },
                                    ].map((h, i) => (
                                        <div key={i} className="ct-hours-row">
                                            <span className="ct-day">{h.day}</span>
                                            <span className={`ct-time ${h.active ? 'active' : ''}`}>{h.time}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="ct-response-sla">
                                    <span>🕐</span>
                                    <span>Average first response: <strong>under 2 hours</strong></span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                6. FAQ ACCORDION
            ═══════════════════════════════════════ */}
            <section className="ct-faq">
                <div className="ct-faq-inner">
                    <div className="ct-faq-header">
                        <span className="ct-eyebrow-sm">Quick Answers</span>
                        <h2 className="ct-section-title">Frequently <em>Asked</em></h2>
                        <p className="ct-faq-sub">Can't find what you need? Use the form above or reach us on WhatsApp.</p>
                    </div>
                    <div className="ct-faq-list">
                        {faqs.map((faq, i) => (
                            <motion.div
                                key={i}
                                className={`ct-faq-item ${openFaq === i ? 'open' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.08 }}
                            >
                                <button className="ct-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                    <span>{faq.q}</span>
                                    <span className="ct-faq-arrow">{openFaq === i ? '−' : '+'}</span>
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            className="ct-faq-a"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <p>{faq.a}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                    <div className="ct-faq-cta">
                        <Link to="/faq" className="ct-btn-outline">View All FAQs →</Link>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                7. SOCIAL LINKS STRIP
            ═══════════════════════════════════════ */}
            <section className="ct-social">
                <div className="ct-social-inner">
                    <span className="ct-eyebrow-sm light">Follow the Journey</span>
                    <h3 className="ct-social-title">Stay Connected <em>Everywhere</em></h3>
                    <div className="ct-social-links">
                        {[
                            { name: 'Instagram', handle: '@eshopper', href: '#', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg> },
                            { name: 'Twitter', handle: '@eshopper', href: '#', icon: <svg viewBox="0 0 24 24" fill="currentColor" width="24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
                            { name: 'Pinterest', handle: 'Eshopper Style', href: '#', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.03-2.83.19-.78 1.27-5.39 1.27-5.39s-.32-.65-.32-1.6c0-1.5.87-2.62 1.95-2.62.92 0 1.37.69 1.37 1.52 0 .93-.59 2.31-.9 3.59-.25 1.07.53 1.94 1.58 1.94 1.9 0 3.36-2 3.36-4.89 0-2.56-1.84-4.35-4.46-4.35-3.04 0-4.82 2.28-4.82 4.63 0 .92.35 1.9.79 2.44.09.1.1.2.07.31-.08.33-.26 1.07-.3 1.22-.05.2-.17.24-.38.14C7.45 15 6.5 13 6.5 11.28c0-3.39 2.46-6.51 7.1-6.51 3.73 0 6.63 2.66 6.63 6.2 0 3.7-2.33 6.68-5.56 6.68-1.09 0-2.11-.57-2.46-1.23l-.67 2.49c-.24.93-.89 2.1-1.33 2.81.1.03.2.04.31.04C17.52 22 22 17.52 22 12S17.52 2 12 2z" /></svg> },
                            { name: 'YouTube', handle: 'Eshopper Official', href: '#', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58a2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg> },
                        ].map((s, i) => (
                            <motion.a
                                key={i}
                                href={s.href}
                                className="ct-social-link"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -4 }}
                            >
                                <div className="ct-social-icon">{s.icon}</div>
                                <div>
                                    <strong>{s.name}</strong>
                                    <span>{s.handle}</span>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                8. BOTTOM CTA
            ═══════════════════════════════════════ */}
            <section className="ct-bottom-cta">
                <motion.div
                    className="ct-cta-box"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="ct-eyebrow-sm">We're Listening</span>
                    <h2 className="ct-cta-title">Not Satisfied? <em>Let Us Know.</em></h2>
                    <p className="ct-cta-sub">Your experience matters deeply to us. Every feedback shapes a better Eshopper.</p>
                    <div className="ct-cta-actions">
                        <a href={`mailto:${brandEmail}`} className="ct-btn-gold">Email Directly</a>
                        <a href={`https://wa.me/${brandPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="ct-btn-ghost-dark">WhatsApp Now</a>
                    </div>
                </motion.div>
            </section>

            {/* ═══════════════════════════════════════
                WHATSAPP FLOATING BUTTON (unchanged)
            ═══════════════════════════════════════ */}
            <a
                className="ct-whatsapp-btn"
                href={`https://wa.me/${brandPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                title="Chat on WhatsApp"
            >
                <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.8 9.4c.2-.5.5-.5.8-.5h.7c.2 0 .4 0 .6.5l.5 1.3c.1.2.1.4 0 .6l-.3.5c-.1.2 0 .4.1.6.3.6.8 1.2 1.5 1.6.2.1.5.2.6.1l.5-.3c.2-.1.4-.1.6 0l1.3.5c.5.2.5.4.5.6v.7c0 .3 0 .6-.5.8-.6.3-1.2.4-1.9.2-1.2-.4-2.3-1.1-3.2-2-.9-.9-1.6-2-2-3.2-.2-.7-.1-1.3.2-1.9z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </a>

            {/* ═══════════════════════════════════════
                PREMIUM CSS
            ═══════════════════════════════════════ */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Montserrat:wght@300;400;500;600&display=swap');

                .ct-root {
                    --gold: #C9A96E;
                    --gold-light: #E8D5B0;
                    --dark: #0D0D0D;
                    --text: #3D3D3D;
                    --muted: #888;
                    --light: #F7F5F0;
                    --white: #FFFFFF;
                    font-family: 'Montserrat', sans-serif;
                    background: var(--white);
                    color: var(--text);
                    overflow-x: hidden;
                }

                /* ── SHARED ── */
                .ct-eyebrow-sm {
                    display: block; font-family: 'Montserrat', sans-serif;
                    font-size: 0.6rem; font-weight: 600; letter-spacing: 6px;
                    text-transform: uppercase; color: var(--gold); margin-bottom: 1rem;
                }
                .ct-eyebrow-sm.light { color: var(--gold-light); }
                .ct-section-title {
                    font-family: 'Cormorant Garamond', serif; font-weight: 300;
                    font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.1;
                    color: var(--dark); margin: 0 0 1rem;
                }
                .ct-section-title em { font-style: italic; color: var(--gold); }

                /* ── BUTTONS ── */
                .ct-btn-gold {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: var(--gold); color: var(--dark);
                    padding: 14px 36px; font-family: 'Montserrat', sans-serif;
                    font-size: 0.72rem; font-weight: 600; letter-spacing: 3px;
                    text-transform: uppercase; text-decoration: none; border: none; cursor: pointer;
                    transition: background 0.3s, transform 0.2s;
                }
                .ct-btn-gold:hover { background: var(--gold-light); transform: translateY(-2px); color: var(--dark); text-decoration: none; }
                .ct-btn-ghost {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: transparent; color: var(--white);
                    padding: 14px 36px; font-family: 'Montserrat', sans-serif;
                    font-size: 0.72rem; font-weight: 500; letter-spacing: 2px;
                    text-transform: uppercase; text-decoration: none;
                    border: 1px solid rgba(255,255,255,0.4); transition: all 0.3s;
                }
                .ct-btn-ghost:hover { border-color: var(--gold); color: var(--gold); text-decoration: none; }
                .ct-btn-ghost-dark {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: transparent; color: var(--dark);
                    padding: 14px 36px; font-family: 'Montserrat', sans-serif;
                    font-size: 0.72rem; font-weight: 500; letter-spacing: 2px;
                    text-transform: uppercase; text-decoration: none;
                    border: 1px solid var(--dark); transition: all 0.3s;
                }
                .ct-btn-ghost-dark:hover { background: var(--dark); color: var(--white); text-decoration: none; }
                .ct-btn-outline {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: transparent; color: var(--gold);
                    padding: 12px 32px; font-family: 'Montserrat', sans-serif;
                    font-size: 0.7rem; font-weight: 600; letter-spacing: 3px;
                    text-transform: uppercase; text-decoration: none;
                    border: 1px solid var(--gold); transition: all 0.3s;
                }
                .ct-btn-outline:hover { background: var(--gold); color: var(--dark); text-decoration: none; }

                /* ── 1. HERO ── */
                .ct-hero {
                    position: relative; height: 90vh; min-height: 620px;
                    overflow: hidden; display: flex; align-items: center; justify-content: center;
                }
                .ct-hero-bg { position: absolute; inset: 0; }
                .ct-hero-img { width: 100%; height: 115%; object-fit: cover; object-position: center; }
                .ct-hero-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(135deg, rgba(13,13,13,0.88) 0%, rgba(13,13,13,0.55) 50%, rgba(13,13,13,0.3) 100%);
                }
                .ct-hero-content {
                    position: relative; z-index: 2;
                    max-width: 700px; padding: 0 2rem; text-align: center;
                }
                .ct-eyebrow {
                    display: flex; align-items: center; justify-content: center; gap: 12px;
                    color: var(--gold); font-size: 0.6rem; font-weight: 600;
                    letter-spacing: 6px; text-transform: uppercase; margin-bottom: 1.5rem;
                }
                .ct-eyebrow-line {
                    width: 30px; height: 1px;
                    background: linear-gradient(90deg, transparent, var(--gold), transparent);
                }
                .ct-hero-title {
                    font-family: 'Cormorant Garamond', serif; font-weight: 300;
                    font-size: clamp(2.5rem, 6vw, 5rem); line-height: 1.08;
                    color: var(--white); margin-bottom: 1.5rem;
                }
                .ct-hero-title em { font-style: italic; color: var(--gold); }
                .ct-hero-desc {
                    font-size: 0.9rem; color: rgba(255,255,255,0.65);
                    line-height: 1.8; margin-bottom: 2.5rem; letter-spacing: 0.02em;
                }
                .ct-hero-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
                .ct-hero-scroll {
                    position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 3;
                }
                .ct-hero-scroll span {
                    display: block; width: 1px; height: 60px;
                    background: linear-gradient(to bottom, transparent, var(--gold));
                    animation: ctScrollPulse 2s ease-in-out infinite;
                }
                @keyframes ctScrollPulse {
                    0%, 100% { opacity: 0.3; } 50% { opacity: 1; }
                }
                .ct-hero-side-badge {
                    position: absolute; right: 40px; top: 50%; transform: translateY(-50%);
                    z-index: 3; display: flex; flex-direction: column; gap: 12px;
                }
                .ct-side-item {
                    background: rgba(13,13,13,0.8); backdrop-filter: blur(12px);
                    border: 1px solid rgba(201,169,110,0.3); padding: 14px 20px;
                    display: flex; align-items: center; gap: 12px;
                    font-family: 'Montserrat', sans-serif;
                }
                .ct-side-item > span:first-child { font-size: 1.3rem; }
                .ct-side-item strong { display: block; color: var(--white); font-size: 0.85rem; }
                .ct-side-item > div > span { color: rgba(255,255,255,0.5); font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase; }

                /* ── 2. TRUST BAR ── */
                .ct-trust-bar {
                    background: var(--dark); padding: 14px 5%;
                    display: flex; align-items: center; justify-content: center;
                    flex-wrap: wrap; border-bottom: 1px solid rgba(201,169,110,0.15);
                }
                .ct-trust-item {
                    display: flex; align-items: center; gap: 8px;
                    font-family: 'Montserrat', sans-serif; font-size: 0.62rem;
                    letter-spacing: 1.5px; text-transform: uppercase;
                    color: rgba(255,255,255,0.6); padding: 4px 24px;
                    border-right: 1px solid rgba(255,255,255,0.1);
                }
                .ct-trust-item:last-child { border-right: none; }

                /* ── 3. INFO CARDS ── */
                .ct-info-section { padding: 80px 5%; background: var(--light); }
                .ct-info-grid {
                    max-width: 1100px; margin: 0 auto;
                    display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
                }
                .ct-info-card {
                    background: var(--white); padding: 36px 28px;
                    border: 1px solid rgba(201,169,110,0.15); position: relative;
                    overflow: hidden; transition: all 0.3s;
                }
                .ct-info-card::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0;
                    height: 3px; background: var(--card-accent, var(--gold));
                    transform: scaleX(0); transition: transform 0.3s;
                }
                .ct-info-card:hover::before { transform: scaleX(1); }
                .ct-info-card:hover { box-shadow: 0 20px 50px rgba(0,0,0,0.08); }
                .ct-card-icon-wrap {
                    width: 56px; height: 56px; border-radius: 50%;
                    background: var(--light);
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 1.2rem; color: var(--card-accent, var(--gold));
                    border: 1px solid rgba(201,169,110,0.2);
                }
                .ct-card-label {
                    font-family: 'Cormorant Garamond', serif; font-size: 1.15rem;
                    font-weight: 400; color: var(--dark); margin: 0 0 0.5rem;
                }
                .ct-card-text { font-size: 0.82rem; color: var(--muted); line-height: 1.6; margin: 0 0 1rem; word-break: break-all; }
                .ct-card-link {
                    font-family: 'Montserrat', sans-serif; font-size: 0.6rem;
                    letter-spacing: 2px; text-transform: uppercase; color: var(--gold);
                    text-decoration: none; border-bottom: 1px solid rgba(201,169,110,0.3);
                    padding-bottom: 2px; transition: border-color 0.3s;
                }
                .ct-card-link:hover { border-color: var(--gold); text-decoration: none; color: var(--gold); }

                /* ── 4. CHANNELS ── */
                .ct-channels { padding: 100px 5%; background: var(--dark); }
                .ct-channels-inner { max-width: 1100px; margin: 0 auto; }
                .ct-channels-header { text-align: center; margin-bottom: 60px; }
                .ct-channels-header .ct-eyebrow-sm { color: var(--gold-light); }
                .ct-channels-header .ct-section-title { color: var(--white); }
                .ct-channels-header .ct-section-title em { color: var(--gold); }
                .ct-channels-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
                .ct-channel-card {
                    background: #111; padding: 40px 28px;
                    border: 1px solid #222; transition: all 0.3s; cursor: default;
                }
                .ct-channel-card:hover { border-color: rgba(201,169,110,0.4); background: #161616; }
                .ct-ch-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.2rem; }
                .ct-ch-icon { color: var(--gold); }
                .ct-ch-badge {
                    font-family: 'Montserrat', sans-serif; font-size: 0.5rem;
                    letter-spacing: 2px; text-transform: uppercase;
                    color: var(--badge-color, var(--gold));
                    border: 1px solid var(--badge-color, var(--gold));
                    padding: 4px 10px; white-space: nowrap;
                }
                .ct-ch-title {
                    font-family: 'Cormorant Garamond', serif; font-size: 1.3rem;
                    font-weight: 400; color: var(--white); margin: 0 0 0.7rem;
                }
                .ct-ch-desc { font-size: 0.8rem; color: rgba(255,255,255,0.5); line-height: 1.7; margin: 0 0 1.5rem; }
                .ct-ch-btn {
                    font-family: 'Montserrat', sans-serif; font-size: 0.6rem;
                    letter-spacing: 2px; text-transform: uppercase; color: var(--gold);
                    text-decoration: none; border-bottom: 1px solid rgba(201,169,110,0.3);
                    padding-bottom: 2px; transition: all 0.3s;
                }
                .ct-ch-btn:hover { border-color: var(--gold); text-decoration: none; color: var(--gold); }

                /* ── 5. MAIN FORM + MAP ── */
                .ct-main-section { padding: 100px 5%; background: var(--white); }
                .ct-main-inner { max-width: 1200px; margin: 0 auto; }
                .ct-quick-row {
                    display: flex; gap: 12px; margin-bottom: 60px;
                    flex-wrap: wrap;
                }
                .ct-quick-tile {
                    flex: 1; min-width: 120px; border: 1px solid rgba(201,169,110,0.2);
                    padding: 16px 12px; text-align: center; color: var(--dark);
                    background: var(--light); text-decoration: none;
                    font-family: 'Montserrat', sans-serif; font-size: 0.65rem;
                    font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
                    transition: all 0.25s; display: flex; flex-direction: column;
                    align-items: center; gap: 8px;
                }
                .ct-quick-tile:hover {
                    border-color: var(--gold); color: var(--gold);
                    transform: translateY(-3px);
                    box-shadow: 0 12px 24px rgba(201,169,110,0.12);
                    text-decoration: none;
                }
                .ct-quick-icon {
                    width: 36px; height: 36px; border-radius: 50%;
                    background: var(--white); border: 1px solid rgba(201,169,110,0.2);
                    display: flex; align-items: center; justify-content: center;
                    color: var(--gold); transition: all 0.25s;
                }
                .ct-quick-tile:hover .ct-quick-icon { background: var(--gold); color: var(--white); border-color: var(--gold); }
                .ct-form-map-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }

                /* Form */
                .ct-form-wrap { background: var(--white); }
                .ct-hours-strip {
                    display: flex; align-items: center; gap: 8px; margin-bottom: 1.5rem;
                    font-family: 'Montserrat', sans-serif; font-size: 0.6rem;
                    letter-spacing: 2px; text-transform: uppercase; color: var(--muted);
                    padding: 10px 16px; background: var(--light);
                    border-left: 3px solid #22c55e;
                }
                .ct-live-dot {
                    width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
                    box-shadow: 0 0 0 0 rgba(34,197,94,0.7);
                    animation: livePulse 1.8s infinite;
                    flex-shrink: 0;
                }
                @keyframes livePulse {
                    0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
                    70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
                    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
                }
                .ct-success-alert {
                    display: flex; align-items: flex-start; gap: 16px;
                    background: #f0fdf4; border: 1px solid #bbf7d0;
                    padding: 20px; margin-bottom: 1.5rem; position: relative;
                }
                .ct-success-icon {
                    width: 32px; height: 32px; background: #22c55e; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-size: 1rem; flex-shrink: 0;
                }
                .ct-success-alert strong { display: block; color: #15803d; font-size: 0.85rem; margin-bottom: 4px; }
                .ct-success-alert p { margin: 0; font-size: 0.8rem; color: #166534; }
                .ct-close-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 1.3rem; cursor: pointer; color: var(--muted); }
                .ct-form-title {
                    font-family: 'Cormorant Garamond', serif; font-weight: 300;
                    font-size: clamp(1.8rem, 3vw, 2.4rem); color: var(--dark); margin: 0 0 0.5rem;
                }
                .ct-form-title em { font-style: italic; color: var(--gold); }
                .ct-form-sub { font-size: 0.82rem; color: var(--muted); margin-bottom: 2rem; line-height: 1.6; }
                .ct-form { display: flex; flex-direction: column; gap: 16px; }
                .ct-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .ct-float-field { position: relative; }
                .ct-float-field input, .ct-float-field textarea {
                    width: 100%; padding: 22px 16px 8px;
                    border: 1px solid #e6e2da; background: #fffcf7;
                    font-family: 'Montserrat', sans-serif; font-size: 0.85rem;
                    color: var(--dark); outline: none; resize: none;
                    transition: all 0.3s;
                }
                .ct-float-field input:focus, .ct-float-field textarea:focus {
                    border-color: var(--gold); background: var(--white);
                    box-shadow: 0 6px 20px rgba(201,169,110,0.12);
                }
                .ct-float-field label {
                    position: absolute; left: 16px; top: 50%;
                    transform: translateY(-50%); color: var(--muted);
                    font-family: 'Montserrat', sans-serif; font-size: 0.78rem;
                    pointer-events: none; transition: all 0.2s; background: transparent;
                }
                .ct-float-field textarea ~ label { top: 16px; transform: none; }
                .ct-float-field input:focus + label,
                .ct-float-field input:not(:placeholder-shown) + label,
                .ct-float-field textarea:focus + label,
                .ct-float-field textarea:not(:placeholder-shown) + label {
                    top: 7px; transform: none; font-size: 0.58rem;
                    letter-spacing: 0.08em; text-transform: uppercase; color: #9a7a20;
                }
                .ct-float-full { grid-column: 1 / -1; }
                .ct-captcha-shell {
                    border: 1px solid #eee5d4; padding: 16px;
                    background: linear-gradient(180deg, #fffcf8 0%, #faf6ee 100%);
                    display: flex; flex-direction: column; gap: 12px;
                }
                .ct-captcha-row { display: flex; align-items: center; gap: 12px; }
                .ct-captcha-chip {
                    background: linear-gradient(135deg, #111 0%, #2f2f2f 100%);
                    color: #f3e5b8; border: 1px solid var(--gold);
                    padding: 10px 16px; font-size: 1.2rem;
                    letter-spacing: 5px; font-weight: 700;
                    font-family: monospace;
                }
                .ct-captcha-refresh {
                    border: 1px solid #d8c08a; color: #7b5f15;
                    background: #fff8e6; padding: 8px 14px;
                    font-size: 0.72rem; cursor: pointer; letter-spacing: 1px;
                    transition: all 0.2s;
                }
                .ct-captcha-refresh:hover { background: var(--gold); color: var(--dark); border-color: var(--gold); }
                .ct-captcha-err { color: #dc2626; font-size: 0.72rem; margin: 0; }
                .ct-submit-btn {
                    width: 100%; padding: 18px; margin-top: 8px;
                    background: linear-gradient(135deg, #0D0D0D 0%, #1a1a1a 60%, var(--gold) 100%);
                    border: none; color: var(--white);
                    font-family: 'Montserrat', sans-serif; font-size: 0.75rem;
                    font-weight: 600; letter-spacing: 3px; text-transform: uppercase;
                    cursor: pointer; transition: all 0.3s;
                }
                .ct-submit-btn:hover { box-shadow: 0 16px 30px rgba(13,13,13,0.25); }

                /* Map */
                .ct-map-wrap { display: flex; flex-direction: column; gap: 20px; }
                .ct-map-shell {
                    position: relative; height: 420px; overflow: hidden;
                    border: 1px solid rgba(201,169,110,0.2);
                }
                .ct-map-shell::after {
                    content: ''; position: absolute; inset: 0; pointer-events: none;
                    border: 2px solid transparent;
                    background: linear-gradient(135deg, rgba(201,169,110,0.4), rgba(255,255,255,0)) border-box;
                    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor; mask-composite: exclude; z-index: 3;
                }
                .ct-map-top-badge {
                    position: absolute; top: 14px; left: 14px; z-index: 4;
                    display: inline-flex; align-items: center; gap: 8px;
                    background: rgba(13,13,13,0.88); border: 1px solid rgba(201,169,110,0.4);
                    color: #f8e3ab; padding: 8px 14px;
                    font-family: 'Montserrat', sans-serif; font-size: 0.55rem;
                    letter-spacing: 3px; text-transform: uppercase;
                }
                .ct-map-pulse {
                    width: 8px; height: 8px; border-radius: 50%; background: var(--gold);
                    animation: mapPulse 1.8s infinite;
                }
                @keyframes mapPulse {
                    0% { box-shadow: 0 0 0 0 rgba(201,169,110,0.7); }
                    70% { box-shadow: 0 0 0 8px rgba(201,169,110,0); }
                    100% { box-shadow: 0 0 0 0 rgba(201,169,110,0); }
                }
                .ct-map-open-btn {
                    position: absolute; top: 14px; right: 14px; z-index: 4;
                    background: rgba(255,255,255,0.92); border: 1px solid #dcc48d;
                    color: #6f5311; padding: 7px 14px;
                    font-family: 'Montserrat', sans-serif; font-size: 0.55rem;
                    letter-spacing: 2px; text-transform: uppercase;
                    text-decoration: none; transition: all 0.2s;
                }
                .ct-map-open-btn:hover { color: var(--dark); box-shadow: 0 8px 20px rgba(0,0,0,0.12); text-decoration: none; }
                .ct-map-footer {
                    position: absolute; bottom: 0; left: 0; right: 0; z-index: 4;
                    display: flex; align-items: center; gap: 8px; padding: 14px 16px;
                    background: linear-gradient(transparent, rgba(13,13,13,0.9));
                    font-family: 'Montserrat', sans-serif; font-size: 0.7rem;
                    color: rgba(255,255,255,0.85);
                }
                .ct-map-pin { font-size: 1rem; }
                .ct-hours-card {
                    background: var(--light); padding: 28px;
                    border: 1px solid rgba(201,169,110,0.15);
                }
                .ct-hours-title {
                    font-family: 'Cormorant Garamond', serif; font-size: 1.2rem;
                    color: var(--dark); margin: 0 0 1rem; font-weight: 400;
                }
                .ct-hours-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 1rem; }
                .ct-hours-row { display: flex; justify-content: space-between; align-items: center; }
                .ct-day { font-size: 0.75rem; color: var(--text); }
                .ct-time { font-family: 'Montserrat', sans-serif; font-size: 0.68rem; color: var(--muted); font-weight: 500; }
                .ct-time.active { color: var(--gold); }
                .ct-response-sla {
                    display: flex; align-items: center; gap: 8px;
                    padding: 10px 14px; background: var(--white);
                    border-left: 3px solid var(--gold);
                    font-family: 'Montserrat', sans-serif; font-size: 0.72rem; color: var(--muted);
                }
                .ct-response-sla strong { color: var(--dark); }

                /* ── 6. FAQ ── */
                .ct-faq { padding: 100px 5%; background: var(--white); }
                .ct-faq-inner { max-width: 800px; margin: 0 auto; }
                .ct-faq-header { text-align: center; margin-bottom: 60px; }
                .ct-faq-sub { font-size: 0.85rem; color: var(--muted); margin: 0; line-height: 1.7; }
                .ct-faq-list { display: flex; flex-direction: column; gap: 0; border-top: 1px solid #e0d9ce; }
                .ct-faq-item { border-bottom: 1px solid #e0d9ce; }
                .ct-faq-q {
                    width: 100%; background: none; border: none; cursor: pointer;
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 22px 0; font-family: 'Montserrat', sans-serif;
                    font-size: 0.85rem; font-weight: 500; color: var(--dark);
                    text-align: left; gap: 20px; transition: color 0.3s;
                }
                .ct-faq-item.open .ct-faq-q { color: var(--gold); }
                .ct-faq-arrow {
                    font-size: 1.4rem; color: var(--gold); flex-shrink: 0;
                    font-weight: 300; line-height: 1;
                }
                .ct-faq-a {
                    overflow: hidden; padding: 0 0 20px;
                }
                .ct-faq-a p { font-size: 0.85rem; color: var(--muted); line-height: 1.8; margin: 0; }
                .ct-faq-cta { text-align: center; margin-top: 3rem; }

                /* ── 7. SOCIAL ── */
                .ct-social { background: var(--dark); padding: 80px 5%; }
                .ct-social-inner { max-width: 900px; margin: 0 auto; text-align: center; }
                .ct-social-title {
                    font-family: 'Cormorant Garamond', serif; font-weight: 300;
                    font-size: clamp(1.8rem, 3vw, 2.6rem); color: var(--white);
                    margin: 0 0 2.5rem;
                }
                .ct-social-title em { font-style: italic; color: var(--gold); }
                .ct-social-links { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
                .ct-social-link {
                    display: flex; align-items: center; gap: 14px;
                    background: #111; border: 1px solid #222;
                    padding: 18px 24px; text-decoration: none;
                    transition: all 0.3s; min-width: 160px;
                }
                .ct-social-link:hover { border-color: var(--gold); background: #161616; text-decoration: none; }
                .ct-social-icon { color: var(--gold); }
                .ct-social-link strong { display: block; color: var(--white); font-size: 0.78rem; margin-bottom: 2px; }
                .ct-social-link > div > span { color: rgba(255,255,255,0.5); font-size: 0.62rem; letter-spacing: 1px; }

                /* ── 8. BOTTOM CTA ── */
                .ct-bottom-cta { padding: 100px 5%; background: var(--light); }
                .ct-cta-box {
                    max-width: 600px; margin: 0 auto; text-align: center;
                    padding: 70px 60px; border: 1px solid rgba(201,169,110,0.3);
                    position: relative; background: var(--white);
                }
                .ct-cta-box::before, .ct-cta-box::after {
                    content: ''; position: absolute; width: 30px; height: 30px;
                    border-color: var(--gold); border-style: solid;
                }
                .ct-cta-box::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
                .ct-cta-box::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
                .ct-cta-title {
                    font-family: 'Cormorant Garamond', serif; font-weight: 300;
                    font-size: clamp(2rem, 4vw, 3rem); color: var(--dark);
                    line-height: 1.1; margin: 1rem 0;
                }
                .ct-cta-title em { font-style: italic; color: var(--gold); }
                .ct-cta-sub { font-size: 0.85rem; color: var(--muted); line-height: 1.7; margin-bottom: 2rem; }
                .ct-cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

                /* ── WHATSAPP BUTTON ── */
                .ct-whatsapp-btn {
                    position: fixed; right: 20px; bottom: 20px; z-index: 1100;
                    width: 56px; height: 56px; border-radius: 50%;
                    background: linear-gradient(135deg, #111 0%, #1d1d1d 100%);
                    border: 1px solid rgba(255,255,255,0.15);
                    box-shadow: 0 16px 30px rgba(0,0,0,0.2);
                    display: flex; align-items: center; justify-content: center;
                    color: var(--gold); text-decoration: none;
                    transition: all 0.25s;
                }
                .ct-whatsapp-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 20px 32px rgba(0,0,0,0.28);
                    color: #e8c97a; text-decoration: none;
                }

                /* ── RESPONSIVE ── */
                @media (max-width: 1100px) {
                    .ct-info-grid { grid-template-columns: repeat(2, 1fr); }
                    .ct-channels-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 900px) {
                    .ct-form-map-grid { grid-template-columns: 1fr; gap: 40px; }
                    .ct-hero-side-badge { display: none; }
                    .ct-trust-item { padding: 4px 14px; font-size: 0.58rem; }
                }
                @media (max-width: 768px) {
                    .ct-info-grid { grid-template-columns: 1fr 1fr; }
                    .ct-channels-grid { grid-template-columns: 1fr 1fr; }
                    .ct-form-row { grid-template-columns: 1fr; }
                    .ct-quick-row { grid-template-columns: repeat(2, 1fr); display: grid; }
                    .ct-social-links { gap: 10px; }
                    .ct-cta-box { padding: 50px 30px; }
                    .ct-trust-bar { display: none; }
                    .ct-map-shell { height: 320px; }
                }
                @media (max-width: 480px) {
                    .ct-info-grid { grid-template-columns: 1fr; }
                    .ct-channels-grid { grid-template-columns: 1fr; }
                    .ct-hero-actions { flex-direction: column; align-items: center; }
                    .ct-quick-row { grid-template-columns: 1fr 1fr; }
                }
            `}} />
        </div>
    )
}
