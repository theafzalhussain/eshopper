import React, { useEffect, useMemo, useState, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUp,
  BadgeCheck,
  CircleHelp,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  Youtube,
  Sparkles,
  Send,
  Boxes,
  X
} from 'lucide-react'
import { createNewslatterAPI, getFooterDataAPI, getMaincategoryAPI } from '../Store/Services'
import { useToast } from './ToastNotification'

const fallbackFooterData = {
  brand: {
    name: 'eShopper Boutique Luxe',
    tagline: 'Trusted Premium Commerce Experience'
  },
  contact: {
    email: 'support@eshopperr.me',
    phone: '+91 8447859784',
    address: 'Eshopper Boutique Luxe, New Delhi, India'
  },
  socialLinks: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    x: 'https://x.com',
    youtube: 'https://youtube.com',
    linkedin: 'https://linkedin.com'
  },
  stats: {
    products: 0,
    categories: 0,
    members: 0,
    subscribers: 0
  },
  trustBadges: ['Secure Payments', 'Verified Support', 'Premium Quality', 'Fast Delivery Network']
  ,
  userFeatures: [
    { title: 'Live Order Tracking', subtitle: 'Real-time status updates after every order event' },
    { title: 'Secure Payments', subtitle: 'Protected checkout with verified payment security' },
    { title: 'Priority Support', subtitle: 'Fast help on WhatsApp and email whenever needed' },
    { title: 'Premium Drops', subtitle: 'Early alerts for new launches and exclusive deals' }
  ]
}

const Footer = () => {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const toast = useToast()
  // Robust admin detection (same as Shop.jsx)
  const [role, setRole] = useState(() => String(localStorage.getItem('role') || '').toLowerCase())
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      const isAdminLS = localStorage.getItem("isAdmin");
      const roleLS = localStorage.getItem("role");
      const adminEmails = ["admin@gmail.com", "theafzalhussain@gmail.com", "theafzalhussain786@gmail.com"];
      const adminUserIds = [
        "1",
        "admin",
        "your-admin-id",
        "699af12865bfff087143211c" // Afzal Hussain's MongoDB ObjectId
      ];
      const userEmail = localStorage.getItem("email") || "";
      const userId = localStorage.getItem("userid") || "";
      setIsAdmin(
        isAdminLS === true ||
        isAdminLS === "true" ||
        isAdminLS === 1 ||
        isAdminLS === "1" ||
        roleLS === "admin" ||
        roleLS === true ||
        roleLS === 1 ||
        roleLS === "1" ||
        adminEmails.includes(userEmail) ||
        adminUserIds.includes(userId)
      );
    };
    checkAdmin();
    window.addEventListener('storage', checkAdmin);
    window.addEventListener('focus', checkAdmin);
    return () => {
      window.removeEventListener('storage', checkAdmin);
      window.removeEventListener('focus', checkAdmin);
    };
  }, []);
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false)
  const [footerData, setFooterData] = useState(fallbackFooterData)
  const [mainCategories, setMainCategories] = useState([])

  useEffect(() => {
    let mounted = true

    const loadFooterData = async () => {
      try {
        const [footerResponse, categoriesResponse] = await Promise.all([
          getFooterDataAPI(),
          getMaincategoryAPI()
        ])

        if (!mounted) return

        setFooterData({
          ...fallbackFooterData,
          ...footerResponse,
          brand: { ...fallbackFooterData.brand, ...(footerResponse?.brand || {}) },
          contact: { ...fallbackFooterData.contact, ...(footerResponse?.contact || {}) },
          socialLinks: { ...fallbackFooterData.socialLinks, ...(footerResponse?.socialLinks || {}) },
          stats: { ...fallbackFooterData.stats, ...(footerResponse?.stats || {}) },
          trustBadges: Array.isArray(footerResponse?.trustBadges) && footerResponse.trustBadges.length
            ? footerResponse.trustBadges
            : fallbackFooterData.trustBadges,
          userFeatures: Array.isArray(footerResponse?.userFeatures) && footerResponse.userFeatures.length
            ? footerResponse.userFeatures
            : fallbackFooterData.userFeatures
        })

        const categoryList = Array.isArray(categoriesResponse) ? categoriesResponse : []
        const menCategory = categoryList.find((item) => String(item?.name || '').trim().toLowerCase() === 'mens')
        const orderedCategories = menCategory
          ? [menCategory, ...categoryList.filter((item) => item !== menCategory)]
          : [{ name: 'Mens' }, ...categoryList]
        const filteredCategories = orderedCategories.filter((item) => {
          const name = String(item?.name || '').trim().toLowerCase()
          return name !== 'ladies' && name !== 'lady'
        })

        setMainCategories(filteredCategories.slice(0, 5))
      } catch (err) {
        console.warn('Footer data load issue:', err?.message || err)
      }
    }

    loadFooterData()

    return () => {
      mounted = false
    }
  }, [])

  const socialButtons = useMemo(() => ([
    { name: 'Instagram', href: footerData.socialLinks.instagram, Icon: Instagram },
    { name: 'Facebook', href: footerData.socialLinks.facebook, Icon: Facebook },
    { name: 'X', href: footerData.socialLinks.x, Icon: X },
    { name: 'YouTube', href: footerData.socialLinks.youtube, Icon: Youtube },
    { name: 'LinkedIn', href: footerData.socialLinks.linkedin, Icon: Linkedin }
  ]), [footerData.socialLinks])

  const featureChips = useMemo(() => ([
    { label: 'Secure Checkout', Icon: ShieldCheck },
    { label: 'Premium Support', Icon: CircleHelp },
    { label: 'Fast Shipping', Icon: Truck }
  ]), [])

  const statCards = useMemo(() => ([
    { label: 'Products', value: Number(footerData.stats.products || 0), Icon: ShoppingBag },
    { label: 'Categories', value: Number(footerData.stats.categories || 0), Icon: Boxes },
    { label: 'Members', value: Number(footerData.stats.members || 0), Icon: Users },
    { label: 'Subscribers', value: Number(footerData.stats.subscribers || 0), Icon: BadgeCheck }
  ]), [footerData.stats])

  const userFeatureCards = useMemo(() => {
    const iconSet = [Truck, ShieldCheck, CircleHelp, Sparkles]
    const incoming = Array.isArray(footerData.userFeatures) && footerData.userFeatures.length
      ? footerData.userFeatures
      : fallbackFooterData.userFeatures

    return incoming.slice(0, 4).map((item, idx) => ({
      title: String(item?.title || fallbackFooterData.userFeatures[idx]?.title || `Feature ${idx + 1}`),
      subtitle: String(item?.subtitle || fallbackFooterData.userFeatures[idx]?.subtitle || ''),
      Icon: iconSet[idx % iconSet.length]
    }))
  }, [footerData.userFeatures])

  // (isAdmin state is now used)

  useEffect(() => {
    const syncRole = () => setRole(String(localStorage.getItem('role') || '').toLowerCase())
    window.addEventListener('storage', syncRole)
    window.addEventListener('focus', syncRole)
    return () => {
      window.removeEventListener('storage', syncRole)
      window.removeEventListener('focus', syncRole)
    }
  }, [])

  const quickLinks = [
    { to: '/about', label: 'About Us' },
    { to: '/shop/fashion', label: 'Shop Collections' },
    { to: '/contact', label: 'Contact Support' },
    { to: '/faq', label: 'FAQs' },
    { to: '/return-policy', label: 'Return Policy' },
    { to: '/terms', label: 'Terms & Conditions' }
  ]

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault()
    const email = newsletterEmail.trim().toLowerCase()

    if (!email) {
      toast.warning('Please enter your email address.')
      return
    }

    setSubmittingNewsletter(true)
    try {
      await createNewslatterAPI({ email })
      setNewsletterEmail('')
      setFooterData((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          subscribers: Number(prev.stats.subscribers || 0) + 1
        }
      }))
      toast.success('You are subscribed to premium updates.')
    } catch (err) {
      const message = String(err?.data?.message || err?.data?.error || err?.message || '').toLowerCase()
      if (message.includes('duplicate') || message.includes('already')) {
        toast.info('This email is already subscribed.')
      } else {
        toast.error('Subscription failed. Please try again.')
      }
    } finally {
      setSubmittingNewsletter(false)
    }
  }

  const goToTop = (e) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTransitionNavigate = (path) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      navigate(path);
      window.scrollTo(0, 0);
      setIsTransitioning(false);
    }, 500);
  };

  return (
    <footer className="esh-footer-shell">
      <div className="esh-footer-bg" aria-hidden="true"></div>
      
      {/* ─── PAGE TRANSITION OVERLAY ─── */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{
              position: 'fixed', inset: 0, backgroundColor: '#0a0a0a',
              zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#c8a96e', letterSpacing: '4px', textTransform: 'uppercase' }}
            >
              Curating Selection
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="container esh-footer-container">
        <div className="esh-footer-top">
          <div className="esh-brand-block">
              <Link to="/" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/'); }} className="footer-logo-link" aria-label="eShopper home">
              <div className="footer-logo-wrapper">
                <span className="footer-logo-e">E</span>
                <div className="footer-logo-text-box">
                  <span className="footer-logo-brand-name">SHOPPER</span>
                  <span className="footer-logo-tagline">BOUTIQUE LUXE</span>
                </div>
              </div>
            </Link>
            <div className="esh-brand-tag"><Sparkles size={14} /> Verified Premium Commerce</div>
            <p>{footerData.brand.tagline}</p>
            <div className="esh-feature-chips">
              {featureChips.map(({ label, Icon }) => (
                <span key={label}><Icon size={14} /> {label}</span>
              ))}
            </div>
            <div className="esh-social-row">
              {socialButtons.map(({ name, href, Icon }) => (
                <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} title={name}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="esh-footer-links">
            <h3>Quick Links</h3>
            <ul>
              {quickLinks.map((item) => (
                  <li key={item.to}><Link to={item.to} onClick={(e) => { e.preventDefault(); handleTransitionNavigate(item.to); }}>{item.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="esh-footer-links">
            <h3>Top Categories</h3>
            <ul>
              {mainCategories.length > 0 ? (
                mainCategories.map((cat) => {
                  const categoryName = String(cat?.name || '').trim()
                  const categoryKey = categoryName.toLowerCase().replace(/\s+/g, '-')
                    const path = `/shop/${encodeURIComponent(categoryName)}`;
                    return <li key={cat.id || cat._id || categoryKey}><Link to={path} onClick={(e) => { e.preventDefault(); handleTransitionNavigate(path); }}>{cat.name}</Link></li>
                })
              ) : (
                <>
                    <li><Link to="/shop/Mens" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/Mens'); }}>Mens</Link></li>
                    <li><Link to="/shop/Women" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/Women'); }}>Women</Link></li>
                    <li><Link to="/shop/Kids" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/Kids'); }}>Kids</Link></li>
                    <li><Link to="/shop/Boys" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/Boys'); }}>Boys</Link></li>
                    <li><Link to="/shop/Fashion" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/Fashion'); }}>Fashion Essentials</Link></li>
                    <li><Link to="/shop/Beauty" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/Beauty'); }}>Beauty & Care</Link></li>
                    <li><Link to="/shop/Electronics" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/Electronics'); }}>Electronics</Link></li>
                </>
              )}
            </ul>
          </div>

          <div className="esh-contact-block">
            <h3>Contact & Trust</h3>
            <div className="esh-contact-line"><Mail size={14} /> <a href={`mailto:${footerData.contact.email}`}>{footerData.contact.email}</a></div>
            <div className="esh-contact-line"><Phone size={14} /> <a href={`tel:${footerData.contact.phone}`}>{footerData.contact.phone}</a></div>
            <div className="esh-contact-line"><MapPin size={14} /> <span>{footerData.contact.address}</span></div>
            <div className="esh-trust-list">
              {(footerData.trustBadges || []).slice(0, 3).map((badge) => (
                <span key={badge}><BadgeCheck size={13} /> {badge}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="esh-footer-mid">
          {isAdmin ? (
            <div className="esh-stats-grid">
              {statCards.map(({ label, value, Icon }) => (
                <div className="esh-stat-card" key={label}>
                  <Icon size={17} />
                  <strong>{value.toLocaleString()}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="esh-user-features-grid">
              {userFeatureCards.map(({ title, subtitle, Icon }) => (
                <div className="esh-user-feature-card" key={title}>
                  <Icon size={17} />
                  <strong>{title}</strong>
                  <span>{subtitle}</span>
                </div>
              ))}
            </div>
          )}

          <form className="esh-newsletter" onSubmit={handleNewsletterSubmit}>
            <h4>Join Official eShopper Updates</h4>
            <p>Receive verified product launches, exclusive drops, and order-security updates.</p>
            <div className="esh-newsletter-row">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Newsletter email"
                required
              />
              <button type="submit" disabled={submittingNewsletter}>
                {submittingNewsletter ? 'Joining...' : <><Send size={14} /> Subscribe</>}
              </button>
            </div>
          </form>
        </div>

        <div className="esh-footer-bottom">
          <p>© {new Date().getFullYear()} {footerData.brand.name}. All rights reserved. Built with security, trust, and premium quality.</p>
          <a href="#top" onClick={goToTop} className="esh-top-btn"><ArrowUp size={14} /> Back to Top</a>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .esh-footer-shell {
          position: relative;
          margin-top: 80px;
          color: #e6edf7;
          overflow: hidden;
          background:
            radial-gradient(circle at 14% -4%, rgba(183, 134, 40, 0.22), transparent 36%),
            radial-gradient(circle at 92% 96%, rgba(15, 118, 110, 0.2), transparent 34%),
            linear-gradient(132deg, #08111a 0%, #0f1f2a 54%, #1f1812 100%);
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .esh-footer-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.28;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(circle at center, #000 44%, transparent 90%);
        }

        .esh-footer-container {
          position: relative;
          z-index: 2;
          padding: 56px 12px 24px;
        }

        .esh-footer-top {
          display: grid;
          grid-template-columns: 1.35fr 1fr 1fr 1.15fr;
          gap: 20px;
        }

        .esh-brand-block h2 {
          margin: 10px 0 8px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.95rem;
          letter-spacing: 1.5px;
          color: #f4f7fb;
        }

        .footer-logo-link {
          text-decoration: none;
          display: inline-flex;
          margin-bottom: 10px;
        }

        .footer-logo-wrapper { display: flex; align-items: center; gap: 8px; }

        .footer-logo-e {
          background: linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
          color: #fff;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 800;
          border-radius: 4px;
          border-right: 3px solid #d4af37;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.22);
        }

        .footer-logo-text-box {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .footer-logo-brand-name {
          font-weight: 800;
          letter-spacing: 3px;
          font-size: 20px;
          color: #f3f4f6;
        }

        .footer-logo-tagline {
          font-size: 8px;
          letter-spacing: 2px;
          color: #d4af37;
          font-weight: 700;
          margin-top: 2px;
        }

        .esh-brand-block p {
          margin: 0;
          color: #b8c3d8;
          font-size: 0.95rem;
          line-height: 1.62;
          max-width: 360px;
        }

        .esh-brand-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(103, 143, 193, 0.5);
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #9ec8ff;
          background: rgba(10, 20, 36, 0.7);
        }

        .esh-feature-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .esh-feature-chips span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: #d7e0ef;
          border: 1px solid rgba(89, 109, 136, 0.52);
          border-radius: 999px;
          padding: 5px 10px;
          background: rgba(10, 18, 30, 0.65);
        }

        .esh-social-row {
          display: flex;
          gap: 9px;
          margin-top: 14px;
        }

        .esh-social-row a {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid rgba(115, 145, 182, 0.45);
          color: #d7e6fb;
          text-decoration: none;
          background: rgba(10, 18, 30, 0.65);
          transition: all 0.2s ease;
        }

        .esh-social-row a:hover {
          transform: translateY(-1px);
          color: #fff;
          border-color: rgba(102, 179, 255, 0.95);
          box-shadow: 0 8px 18px rgba(43, 115, 197, 0.28);
        }

        .esh-footer-links h3,
        .esh-contact-block h3 {
          margin: 3px 0 12px;
          color: #f2f6fd;
          font-size: 0.93rem;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          font-weight: 800;
        }

        .esh-footer-links ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 9px;
        }

        .esh-footer-links a {
          color: #b7c7df;
          font-size: 0.88rem;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .esh-footer-links a:hover {
          color: #f7fafc;
        }

        .esh-contact-line {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-bottom: 10px;
          font-size: 0.86rem;
          color: #b8c6dc;
          line-height: 1.45;
        }

        .esh-contact-line a {
          color: #8ecbff;
          text-decoration: none;
        }

        .esh-trust-list {
          margin-top: 12px;
          display: grid;
          gap: 8px;
        }

        .esh-trust-list span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(76, 111, 149, 0.56);
          border-radius: 10px;
          padding: 7px 9px;
          font-size: 0.78rem;
          color: #d7e4f8;
          background: rgba(10, 18, 30, 0.65);
        }

        .esh-footer-mid {
          margin-top: 26px;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 16px;
          align-items: stretch;
        }

        .esh-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .esh-user-features-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .esh-stat-card {
          border: 1px solid rgba(78, 106, 141, 0.55);
          border-radius: 13px;
          background: rgba(8, 17, 29, 0.66);
          padding: 12px 10px;
          display: grid;
          gap: 6px;
          justify-items: start;
        }

        .esh-stat-card svg { color: #89c4ff; }

        .esh-stat-card strong {
          color: #ffffff;
          font-size: 1.06rem;
          line-height: 1;
        }

        .esh-stat-card span {
          color: #b6c5dd;
          font-size: 0.76rem;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .esh-user-feature-card {
          border: 1px solid rgba(78, 106, 141, 0.55);
          border-radius: 13px;
          background: rgba(8, 17, 29, 0.66);
          padding: 12px 10px;
          display: grid;
          gap: 6px;
          justify-items: start;
        }

        .esh-user-feature-card svg {
          color: #7fc2ff;
        }

        .esh-user-feature-card strong {
          color: #ffffff;
          font-size: 0.94rem;
          line-height: 1.2;
          letter-spacing: 0.2px;
        }

        .esh-user-feature-card span {
          color: #b6c5dd;
          font-size: 0.75rem;
          line-height: 1.5;
        }

        .esh-newsletter {
          border: 1px solid rgba(96, 123, 156, 0.54);
          border-radius: 14px;
          background: rgba(8, 17, 29, 0.66);
          padding: 14px;
        }

        .esh-newsletter h4 {
          margin: 0;
          color: #f3f8ff;
          font-size: 1rem;
          font-weight: 800;
        }

        .esh-newsletter p {
          margin: 8px 0 12px;
          color: #b7c5dc;
          font-size: 0.82rem;
          line-height: 1.55;
        }

        .esh-newsletter-row {
          display: flex;
          gap: 8px;
        }

        .esh-newsletter input {
          flex: 1;
          border: 1px solid rgba(104, 132, 168, 0.68);
          border-radius: 10px;
          background: #0b1627;
          color: #ecf3ff;
          padding: 10px 11px;
          font-size: 0.86rem;
          outline: none;
        }

        .esh-newsletter input::placeholder { color: #9cb0ce; }

        .esh-newsletter button {
          border: 0;
          border-radius: 10px;
          background: linear-gradient(90deg, #17a1ff, #2d6fff);
          color: #fff;
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 10px 12px;
          min-width: 122px;
          transition: transform 0.2s ease, filter 0.2s ease;
        }

        .esh-newsletter button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }

        .esh-newsletter button:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .esh-footer-bottom {
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid rgba(132, 157, 187, 0.24);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .esh-footer-bottom p {
          margin: 0;
          color: #9cb0ce;
          font-size: 0.78rem;
          line-height: 1.52;
        }

        .esh-top-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(104, 132, 168, 0.68);
          border-radius: 999px;
          padding: 7px 12px;
          text-decoration: none;
          color: #d5e6ff;
          font-size: 0.74rem;
          font-weight: 800;
          background: rgba(8, 17, 29, 0.72);
        }

        @media (max-width: 1100px) {
          .esh-footer-top {
            grid-template-columns: 1fr 1fr;
          }

          .esh-footer-mid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          .esh-footer-shell {
            margin-top: 44px;
          }

          .esh-footer-container {
            padding: 38px 10px 20px;
          }

          .esh-footer-top {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .esh-brand-block h2 {
            font-size: 1.6rem;
          }

          .footer-logo-brand-name {
            font-size: 16px;
            letter-spacing: 2px;
          }

          .footer-logo-e {
            width: 32px;
            height: 32px;
            font-size: 18px;
          }

          .footer-logo-tagline {
            font-size: 6px;
          }

          .esh-stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .esh-user-features-grid {
            grid-template-columns: 1fr;
          }

          .esh-newsletter-row {
            flex-direction: column;
          }

          .esh-newsletter button {
            width: 100%;
            min-width: 100%;
          }

          .esh-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 430px) {
          .esh-feature-chips span,
          .esh-footer-links a,
          .esh-contact-line,
          .esh-trust-list span,
          .esh-newsletter p,
          .esh-footer-bottom p {
            font-size: 0.76rem;
          }

          .esh-stats-grid {
            grid-template-columns: 1fr;
          }

          .esh-user-feature-card strong {
            font-size: 0.88rem;
          }

          .esh-user-feature-card span {
            font-size: 0.72rem;
          }

          .footer-logo-brand-name {
            font-size: 14px;
            letter-spacing: 1.5px;
          }

          .footer-logo-e {
            width: 28px;
            height: 28px;
            font-size: 16px;
          }

          .footer-logo-tagline {
            font-size: 5px;
          }
        }
      `}} />
    </footer>
  )
};

export default memo(Footer);
