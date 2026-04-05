import React, { useEffect, useState } from 'react'
import { useToast } from './ToastNotification';
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { addContact } from "../Store/ActionCreaters/ContactActionCreators"
import { motion } from 'framer-motion' // For smooth premium animations

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
        // 5 digit random code
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

    // Animation Variants
    const fadeInUp = {
        initial: { y: 40, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: 0.6 } }
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa" }}>
            {/* --- PREMIUM BREADCRUMB BANNER --- */}
            <div className="hero-wrap hero-bread py-4 compact-contact-hero" style={{ background: 'linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.58)), url("/assets/images/bg_6.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="container">
                    <div className="row no-gutters slider-text align-items-center justify-content-center">
                        <div className="col-md-9 text-center">
                            <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-0 bread text-white contact-hero-title">Get In Touch</motion.h1>
                            <p className="text-white-50 mt-2">We'd love to hear from you. Send us a message!</p>
                        </div>
                    </div>
                </div>
            </div>

            <section className="ftco-section contact-section">
                <div className="container">
                    {/* --- CONTACT INFO CARDS --- */}
                    <div className="row d-flex mb-5 contact-info">
                        {[
                            { icon: "icon-map-marker", label: "Address", text: brandAddress, link: "#" },
                            { icon: "icon-phone", label: "Phone", text: brandPhone, link: `tel:${brandPhone.replace(/\D/g, "")}` },
                            { icon: "icon-paper-plane", label: "Email", text: brandEmail, link: `mailto:${brandEmail}` },
                            { icon: "icon-globe", label: "Website", text: brandSite.replace(/^https?:\/\//, ''), link: brandSite }
                        ].map((item, i) => (
                            <motion.div key={i} className="col-md-3 d-flex" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <div className="info bg-white p-4 shadow-sm rounded-lg border-0 w-100 text-center transition-all hover-info">
                                    <div className="icon-circle mb-3 mx-auto shadow-sm">
                                        <span className={`icon ${item.icon} text-info`}></span>
                                    </div>
                                    <p><span className="font-weight-bold d-block text-dark small text-uppercase mb-1">{item.label}</span> 
                                       <Link to={item.link} className="text-muted">{item.text}</Link>
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="row">
                        {/* --- CONTACT FORM: PREMIUM LOOK --- */}
                        <motion.div className="col-md-6 order-md-last d-flex" variants={fadeInUp} initial="initial" whileInView="animate">
                            <div className="bg-white p-5 contact-form shadow rounded-lg w-100">
                                <div className="quick-action-grid mb-4">
                                    <Link to="/my-orders" className="quick-action-tile">
                                        <span className="quick-icon">
                                            <svg viewBox="0 0 24 24" fill="none" role="presentation"><path d="M3 6h18M6 6v14h12V6M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                                        </span>
                                        <span>Track Order</span>
                                    </Link>
                                    <Link to="/return-policy" className="quick-action-tile">
                                        <span className="quick-icon">
                                            <svg viewBox="0 0 24 24" fill="none" role="presentation"><path d="M4 12a8 8 0 1012-6.9M4 12h4m-4 0l2.5-2.5M4 12l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                                        </span>
                                        <span>Return Policy</span>
                                    </Link>
                                    <Link to="/faq" className="quick-action-tile">
                                        <span className="quick-icon">
                                            <svg viewBox="0 0 24 24" fill="none" role="presentation"><path d="M12 18h.01M9.1 9.5a2.9 2.9 0 115.8 0c0 2-2.9 2.4-2.9 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                                        </span>
                                        <span>FAQs</span>
                                    </Link>
                                </div>
                                {show && (
                                    <div className="alert alert-success alert-dismissible fade show border-0 shadow-sm" role="alert">
                                        <strong>Success!</strong> Your query has been sent. We'll contact you soon.
                                        <button type="button" className="close" onClick={() => setshow(false)}>
                                            <span>&times;</span>
                                        </button>
                                    </div>
                                )}
                                <h3 className="mb-4 font-weight-bold contact-form-heading">Write to Us</h3>
                                <form onSubmit={postData} autoComplete="off">
                                    <div className="form-group floating-field">
                                        <input type="text" className="form-control premium-input" name='name' value={data.name} onChange={getData} placeholder=" " required />
                                        <label>Full Name</label>
                                    </div>
                                    <div className="form-group floating-field">
                                        <input type="email" className="form-control premium-input" name='email' value={data.email} onChange={getData} placeholder=" " required />
                                        <label>Email Address</label>
                                    </div>
                                    <div className="form-group floating-field">
                                        <input type="text" className="form-control premium-input" name='phone' value={data.phone} onChange={getData} placeholder=" " required />
                                        <label>Phone Number</label>
                                    </div>
                                    <div className="form-group floating-field">
                                        <input type="text" className="form-control premium-input" name='subject' value={data.subject} onChange={getData} placeholder=" " required />
                                        <label>Subject</label>
                                    </div>
                                    <div className="form-group floating-field">
                                        <textarea rows="4" className="form-control premium-input" name='message' value={data.message} onChange={getData} placeholder=" " required></textarea>
                                        <label>Your Message</label>
                                    </div>
                                    {/* Captcha Section */}
                                    {captchaEnabled && (
                                        <div className="form-group captcha-shell">
                                            <div className="d-flex align-items-center mb-2 captcha-code-row">
                                                <span className="captcha-code-chip">{captcha}</span>
                                                <button type="button" className="btn btn-sm btn-refresh-captcha ml-2" onClick={generateCaptcha}>↻</button>
                                            </div>
                                            <div className="floating-field mb-0">
                                                <input type="text" className="form-control premium-input" placeholder=" " value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} required />
                                                <label>Enter Captcha Code</label>
                                            </div>
                                            {captchaError && <div className="text-danger small mt-1">{captchaError}</div>}
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-luxury-contact py-3 px-5 rounded-pill shadow-lg w-100 font-weight-bold">
                                            {captchaEnabled ? "VERIFY & SEND" : "PROCEED TO CAPTCHA"}
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>

                        {/* --- GOOGLE MAP: MODERN STYLED --- */}
                        <motion.div className="col-md-6 d-flex" initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                            <div className="map-premium-shell w-100" style={{ height: "550px" }}>
                                <div className="map-top-badge">
                                    <span className="map-pulse-dot"></span>
                                    <span>Flagship Support Desk</span>
                                </div>
                                <a className="map-open-btn" href={openMapUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>
                                <iframe
                                    width="100%"
                                    height="100%"
                                    id="gmap_canvas"
                                    src="https://maps.google.com/maps?q=A-43%20Sector%2016%20Noida&t=&z=14&ie=UTF8&iwloc=&output=embed"
                                    frameBorder="0"
                                    scrolling="no"
                                    style={{ filter: "saturate(1.08) contrast(1.12)" }}
                                    title="Office Location"
                                ></iframe>
                                <div className="map-bottom-strip">
                                    <span className="map-address-text">{brandAddress}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* --- CUSTOM CSS FOR PREMIUM FEEL --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .compact-contact-hero {
                    min-height: 220px;
                    display: flex;
                    align-items: center;
                }
                .contact-hero-title {
                    font-family: 'Playfair Display', serif;
                    font-weight: 400;
                    letter-spacing: 0.02em;
                    font-size: clamp(2rem, 4vw, 2.9rem);
                }
                .contact-form-heading {
                    font-family: 'Playfair Display', serif;
                    font-weight: 400 !important;
                    letter-spacing: 0.02em;
                }
                .premium-input {
                    border: 1px solid #e6e2da !important;
                    border-radius: 12px !important;
                    padding: 26px 16px 10px !important;
                    background: #fffcf7 !important;
                    transition: 0.3s;
                }
                .premium-input:focus {
                    border-color: #c9a84c !important;
                    background: #fff !important;
                    box-shadow: 0 6px 16px rgba(201,168,76,0.16) !important;
                }
                .floating-field {
                    position: relative;
                }
                .floating-field label {
                    position: absolute;
                    top: 50%;
                    left: 16px;
                    transform: translateY(-50%);
                    color: #7c756b;
                    font-size: 13px;
                    pointer-events: none;
                    transition: all 0.2s ease;
                    background: transparent;
                }
                .floating-field .premium-input:focus + label,
                .floating-field .premium-input:not(:placeholder-shown) + label {
                    top: 9px;
                    transform: none;
                    font-size: 10px;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: #9a7a20;
                }
                .icon-circle {
                    width: 60px; height: 60px;
                    background: #eefbff;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 24px;
                }
                .contact-info .info {
                    position: relative;
                    overflow: hidden;
                    border-radius: 22px !important;
                    border: 1px solid #e8ddc4 !important;
                    box-shadow: 0 20px 36px rgba(17, 17, 17, 0.16) !important;
                    background: #fff;
                    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
                }
                .contact-info .info::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 22px;
                    pointer-events: none;
                    border: 2px solid transparent;
                    background: linear-gradient(135deg, rgba(201,168,76,0.54), rgba(255,255,255,0)) border-box;
                    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                }
                .hover-info:hover {
                    transform: translateY(-5px);
                    border-color: #dec68f !important;
                    box-shadow: 0 24px 40px rgba(17,17,17,0.2) !important;
                }
                .quick-action-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
                }
                .quick-action-tile {
                    border: 1px solid #ece6d9;
                    border-radius: 12px;
                    padding: 10px 8px;
                    text-align: center;
                    color: #1f2937;
                    background: linear-gradient(180deg, #ffffff 0%, #fbf8f2 100%);
                    text-decoration: none;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    transition: all 0.2s ease;
                }
                .quick-action-tile:hover {
                    border-color: #c9a84c;
                    color: #9a7a20;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(201,168,76,0.12);
                }
                .quick-icon {
                    width: 28px;
                    height: 28px;
                    margin: 0 auto 6px;
                    border-radius: 999px;
                    border: 1px solid #f0e7d2;
                    background: #fffaf0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .quick-icon svg {
                    width: 14px;
                    height: 14px;
                    color: #9a7a20;
                }
                .captcha-shell {
                    border: 1px solid #eee5d4;
                    border-radius: 12px;
                    padding: 12px;
                    background: linear-gradient(180deg, #fffcf8 0%, #faf6ee 100%);
                }
                .captcha-code-chip {
                    background: linear-gradient(135deg, #111111 0%, #2f2f2f 100%);
                    color: #f3e5b8;
                    border: 1px solid #c9a84c;
                    border-radius: 10px;
                    padding: 8px 12px;
                    font-size: 18px;
                    letter-spacing: 3px;
                    font-weight: 700;
                }
                .btn-refresh-captcha {
                    border: 1px solid #d8c08a !important;
                    color: #7b5f15 !important;
                    background: #fff8e6 !important;
                    border-radius: 10px !important;
                }
                .btn-luxury-contact {
                    background: linear-gradient(135deg, #111111 0%, #2a2a2a 65%, #c9a84c 100%) !important;
                    border: 1px solid #111111 !important;
                    color: #ffffff !important;
                    letter-spacing: 0.14em;
                    font-size: 12px;
                }
                .btn-luxury-contact:hover {
                    box-shadow: 0 14px 26px rgba(17,17,17,0.22) !important;
                }
                .map-premium-shell {
                    position: relative;
                    overflow: hidden;
                    border-radius: 22px;
                    border: 1px solid #e8ddc4;
                    box-shadow: 0 20px 36px rgba(17, 17, 17, 0.16);
                    background: #fff;
                }
                .map-premium-shell::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 22px;
                    pointer-events: none;
                    border: 2px solid transparent;
                    background: linear-gradient(135deg, rgba(201,168,76,0.54), rgba(255,255,255,0)) border-box;
                    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    z-index: 3;
                }
                .map-top-badge {
                    position: absolute;
                    top: 14px;
                    left: 14px;
                    z-index: 4;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(17, 17, 17, 0.86);
                    border: 1px solid rgba(233, 203, 126, 0.45);
                    color: #f8e3ab;
                    border-radius: 999px;
                    padding: 8px 12px;
                    font-size: 11px;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
                .map-pulse-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #e8c56e;
                    box-shadow: 0 0 0 0 rgba(232,197,110,0.7);
                    animation: mapPulse 1.8s infinite;
                }
                @keyframes mapPulse {
                    0% { box-shadow: 0 0 0 0 rgba(232,197,110,0.7); }
                    70% { box-shadow: 0 0 0 8px rgba(232,197,110,0); }
                    100% { box-shadow: 0 0 0 0 rgba(232,197,110,0); }
                }
                .map-open-btn {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    z-index: 4;
                    background: rgba(255,255,255,0.92);
                    border: 1px solid #dcc48d;
                    color: #6f5311;
                    border-radius: 999px;
                    padding: 7px 12px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                .map-open-btn:hover {
                    color: #5f460d;
                    transform: translateY(-1px);
                    box-shadow: 0 10px 18px rgba(100, 79, 25, 0.18);
                }
                .map-bottom-strip {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 4;
                    padding: 12px 14px;
                    background: linear-gradient(180deg, rgba(17,17,17,0) 0%, rgba(17,17,17,0.88) 88%);
                }
                .map-address-text {
                    display: inline-block;
                    color: #f8e3ab;
                    font-size: 12px;
                    letter-spacing: 0.02em;
                    text-shadow: 0 2px 6px rgba(0,0,0,0.28);
                }
                .floating-support-btn {
                    position: fixed;
                    right: 18px;
                    bottom: 18px;
                    z-index: 1100;
                    width: 54px;
                    height: 54px;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.5);
                    background: linear-gradient(135deg, #111111 0%, #1d1d1d 100%);
                    box-shadow: 0 16px 24px rgba(0,0,0,0.18);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #c9a84c;
                    text-decoration: none;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .floating-support-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 18px 26px rgba(0,0,0,0.24);
                    color: #e8c97a;
                }
                .floating-support-btn svg {
                    width: 22px;
                    height: 22px;
                }
                @media (max-width: 767px) {
                    .compact-contact-hero { min-height: 180px; }
                    .quick-action-grid { grid-template-columns: 1fr; gap: 8px; }
                    .contact-form { padding: 18px !important; }
                    .map-top-badge {
                        font-size: 10px;
                        padding: 7px 10px;
                        max-width: calc(100% - 120px);
                    }
                    .map-open-btn {
                        font-size: 10px;
                        padding: 6px 10px;
                    }
                    .floating-support-btn {
                        width: 48px;
                        height: 48px;
                        right: 12px;
                        bottom: 12px;
                    }
                }
                .rounded-lg { border-radius: 20px !important; }
            `}} />

            <a
                className="floating-support-btn"
                href={`https://wa.me/${brandPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                title="Chat on WhatsApp"
            >
                <svg viewBox="0 0 24 24" fill="none" role="presentation">
                    <path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.8 9.4c.2-.5.5-.5.8-.5h.7c.2 0 .4 0 .6.5l.5 1.3c.1.2.1.4 0 .6l-.3.5c-.1.2 0 .4.1.6.3.6.8 1.2 1.5 1.6.2.1.5.2.6.1l.5-.3c.2-.1.4-.1.6 0l1.3.5c.5.2.5.4.5.6v.7c0 .3 0 .6-.5.8-.6.3-1.2.4-1.9.2-1.2-.4-2.3-1.1-3.2-2-.9-.9-1.6-2-2-3.2-.2-.7-.1-1.3.2-1.9z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </a>
        </div>
    )
}