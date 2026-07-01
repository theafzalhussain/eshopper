/* Responsive fix: 2 products per row for 800px–501px */
/* Place this in your main CSS file (index.css or Home.jsx style block if using styled-components or similar) */
/*
@media (max-width: 800px) and (min-width: 501px) {
  .hx-product-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
*/
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { queryClient } from '../queries/queryClient';
import { catalogQueryKeys } from '../queries/catalogQueries';
import { getBrand } from '../Store/ActionCreaters/BrandActionCreators';
import { getUser } from '../Store/ActionCreaters/UserActionCreators';
import { getWishlist, addWishlist, deleteWishlist } from '../Store/ActionCreaters/WishlistActionCreators';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import axios from 'axios';
import { BASE_URL } from '../constants';
import { useToast } from './ToastNotification';
import LazyImage from './LazyImage';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const TICKER_ITEMS = [
  "✦ FREE SHIPPING ON ORDERS ABOVE ₹999",
  "✦ NEW ARRIVALS EVERY FRIDAY",
  "✦ EASY 30-DAY RETURNS",
  "✦ PREMIUM FABRICS · CRAFTED FOR YOU",
  "✦ EXCLUSIVE MEMBER DISCOUNTS",
  "✦ SUSTAINABLE FASHION FORWARD",
];

const USP_ITEMS = [
  { icon: "🚚", title: "Free Delivery", sub: "On orders above ₹999" },
  { icon: "↩", title: "Easy Returns", sub: "30-day hassle-free" },
  { icon: "🔒", title: "Secure Payment", sub: "100% protected" },
  { icon: "⭐", title: "Premium Quality", sub: "Handpicked fabrics" },
  { icon: "💎", title: "Exclusive Drops", sub: "Members-only access" },
];

const TESTIMONIALS = [
  { name: "Priya S.", city: "Mumbai", rating: 5, text: "Absolutely stunning quality. The fabric feels like a dream and the fit is perfect. Will definitely order again!", avatar: "P" },
  { name: "Rahul M.", city: "Delhi", rating: 5, text: "Best fashion brand I've discovered this year. Premium feels at surprisingly honest prices. Love the packaging!", avatar: "R" },
  { name: "Ananya K.", city: "Bangalore", rating: 5, text: "Every piece feels luxurious. Customer service is top-notch, delivery was faster than expected.", avatar: "A" },
  { name: "Vikram T.", city: "Hyderabad", rating: 5, text: "The attention to detail is remarkable. From stitching to packaging — everything screams premium.", avatar: "V" },
];

const LOOKBOOK = [
  { img: "/assets/images/CR-3.png", label: "Summer Edit", tag: "WOMEN" },
  { img: "/assets/images/CR-6.png", label: "Urban Man", tag: "MEN" },
  { img: "/assets/images/kids 2.png", label: "Kids Play", tag: "KIDS" },
  { img: "/assets/images/CR-1.png", label: "Elegant Eve", tag: "WOMEN" },
  { img: "/assets/images/choose-1.jpg", label: "Street Style", tag: "MEN" },
  { img: "/assets/images/kids3.png", label: "Little Stars", tag: "KIDS" },
];

const sliderData = [
  {
    title: "Summer Elegance",
    sub: "NEW ARRIVALS 2024",
    desc: "Discover the latest trends in summer fashion with premium fabrics and elegant designs",
    img: "/assets/images/CR-3.png",
    color: "linear-gradient(135deg, #fdfbfb 0%, #f0ede8 100%)",
    link: "/shop/Women",
    accent: "#c8a96e",
  },
  {
    title: "Urban Sophist",
    sub: "MENS ATELIER",
    desc: "Redefine your style with sophisticated urban wear crafted for modern gentlemen",
    img: "/assets/images/CR-6.png",
    color: "linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)",
    link: "/shop/Men",
    accent: "#c8a96e",
    dark: true,
  },
  {
    title: "Kids Paradise",
    sub: "SPRING COLLECTION",
    desc: "Vibrant colors and playful designs for your little ones' everyday adventures",
    img: "/assets/images/kids 2.png",
    color: "linear-gradient(135deg, #fff5f0 0%, #ffe8dc 100%)",
    link: "/shop/Kids",
    accent: "#e07a5f",
  },
  {
    title: "Exclusive Deals",
    sub: "UPTO 60% OFF",
    desc: "Unbeatable prices on premium fashion — Limited time offers you cannot miss",
    img: "/assets/images/Exclusive Deals 2.png",
    color: "linear-gradient(135deg, #f0f4f8 0%, #e8f0e9 100%)",
    link: "/shop/All",
    accent: "#3d7a4f",
  },
];

// ─────────────────────────────────────────────
// DEAL COUNTDOWN
// ─────────────────────────────────────────────
function useCountdown(targetHours = 6) {
  const end = useRef(Date.now() + targetHours * 3600 * 1000);
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, end.current - Date.now());
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function Pad(n) { return String(n).padStart(2, '0'); }

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Home() {
  const product    = useSelector((state) => state.ProductStateData);
  const wishlist   = useSelector((state) => state.WishlistStateData);
  const brandData  = useSelector((state) => state.BrandStateData) || [];
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const toast      = useToast();

  const [currentSlide, setCurrentSlide]   = useState(0);
  const [welcomeUser, setWelcomeUser]     = useState("");
  const [wishlistToast, setWishlistToast] = useState({ show: false, text: "" });
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [quickView, setQuickView]         = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [scrollY, setScrollY]             = useState(0);
  const [activeFilter, setActiveFilter]   = useState('All');
  const heroRef = useRef(null);
  const [reviewStats, setReviewStats] = useState({});
  const countdown = useCountdown(5);
  const [nlEmail, setNlEmail] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [optimisticWishlist, setOptimisticWishlist] = useState({});

  // ── Fast loading ──
  const displayProducts = useMemo(() => {
    let filtered = [...product].reverse();
    const norm = (str) => String(str || '').toLowerCase().trim();

    if (activeFilter === 'New Arrivals') {
      filtered = filtered.filter(p => p.newArrival);
    } else if (activeFilter === 'Sale') {
      filtered = filtered.filter(p => p.isSale === true); // Strictly filter by Admin 'Sale' checkbox
    } else if (activeFilter === 'Men') {
      const aliases = ['man', 'men', 'mens', 'male', 'gents'];
      filtered = filtered.filter(p => aliases.includes(norm(p.maincategory)) || aliases.includes(norm(p.subcategory)));
    } else if (activeFilter === 'Women') {
      const aliases = ['woman', 'women', 'womens', 'lady', 'ladies', 'ladie', 'female'];
      filtered = filtered.filter(p => aliases.includes(norm(p.maincategory)) || aliases.includes(norm(p.subcategory)));
    } else if (activeFilter === 'Kids') {
      const aliases = ['kid', 'kids', 'boy', 'boys', 'noy', 'girl', 'girls', 'child', 'children'];
      filtered = filtered.filter(p => aliases.includes(norm(p.maincategory)) || aliases.includes(norm(p.subcategory)));
    } else if (activeFilter !== 'All') {
      filtered = filtered.filter(p => p.maincategory === activeFilter || p.subcategory === activeFilter);
    }
    return filtered.slice(0, 8);
  }, [product, activeFilter]);

  // ── Extract unique brands dynamically from backend products ──
  const premiumBrands = useMemo(() => {
    // Premium fallback images for brands without products
    const defaultImages = [
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=1025&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://images.unsplash.com/photo-1617822077662-caee20368d7d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://media.istockphoto.com/id/1148893542/photo/stylish-jeans-clothing-store-stands-showcase-boutique.jpg?s=2048x2048&w=is&k=20&c=PHhHzb_VotXJSPDiepAxZGOY_2dkV9XjSvgdTjiDnCg=',
      'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://assets.myntassets.com/h_1440,q_75,w_1080/v1/assets/images/28913990/2024/9/26/b3e3cd7c-fcc8-422e-8dc0-2f49013ff49b1727354856899-Red-Tape-Men-Colourblocked-PU-High-Top-Sneakers-190172735485-1.jpg',     
      'https://assets.myntassets.com/h_1440,q_75,w_1080/v1/assets/images/28913990/2024/9/26/b3e3cd7c-fcc8-422e-8dc0-2f49013ff49b1727354856899-Red-Tape-Men-Colourblocked-PU-High-Top-Sneakers-190172735485-1.jpg',
      'https://assets.myntassets.com/h_1440,q_75,w_1080/v1/assets/images/28913990/2024/9/26/b3e3cd7c-fcc8-422e-8dc0-2f49013ff49b1727354856899-Red-Tape-Men-Colourblocked-PU-High-Top-Sneakers-190172735485-1.jpg',
    ];

    if (brandData && brandData.length > 0) {
      return brandData.map((b, i) => {
        const prodWithBrand = product.find(p => p.brand === b.name && p.pic1);
        return {
          name: b.name,
          img: b.pic || b.image || b.pic1 || (prodWithBrand ? prodWithBrand.pic1 : defaultImages[i % defaultImages.length])
        };
      });
    }

    const brandMap = new Map();
    [...product].reverse().forEach(p => {
      if (p.brand && !brandMap.has(p.brand)) {
        brandMap.set(p.brand, p.pic1 || defaultImages[brandMap.size % defaultImages.length]);
      }
    });
    return Array.from(brandMap.entries()).slice(0, 24).map(([name, img]) => ({ name, img }));
  }, [product, brandData]);

  // ── Scroll parallax ──
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Init ──
  useEffect(() => {
    // Only dispatch if logged in and not already in store
    if (localStorage.getItem('login') === 'true' && localStorage.getItem('userid')) {
        dispatch(getUser());
        dispatch(getWishlist());
    }
    dispatch(getBrand());
    const storedName = localStorage.getItem("name");
    if (storedName) setWelcomeUser(storedName);
    const timer = setInterval(() => setCurrentSlide((p) => (p === 3 ? 0 : p + 1)), 5000);
    return () => clearInterval(timer);
  }, [dispatch]);

  useEffect(() => {
    async function fetchReviewStats() {
      try {
        const response = await axios.get(`${BASE_URL}/api/reviews`);
        if (response.data.success) {
          const statsMap = {};
          response.data.reviews.forEach(review => {
            if (review.products && Array.isArray(review.products)) {
              review.products.forEach(productId => {
                if (!statsMap[productId]) {
                  statsMap[productId] = { totalRating: 0, count: 0 };
                }
                statsMap[productId].totalRating += Number(review.rating) || 0;
                statsMap[productId].count += 1;
              });
            }
          });

          const finalStats = {};
          for (const productId in statsMap) {
            finalStats[productId] = {
              count: statsMap[productId].count,
              average: parseFloat((statsMap[productId].totalRating / statsMap[productId].count).toFixed(1))
            };
          }
          setReviewStats(finalStats);
        }
      } catch (error) {}
    }
    fetchReviewStats();
  }, [product.length]);

  useEffect(() => {
    if (!wishlistToast.show) return;
    const t = setTimeout(() => setWishlistToast({ show: false, text: "" }), 1800);
    return () => clearTimeout(t);
  }, [wishlistToast]);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial((p) => (p + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // ── Wishlist logic (unchanged) ──
  const getWishlistProductId = (item) => {
    return item?.productid?._id || item?.productid || item?.productId || item?.product?._id || item?.product || item?.id || item?._id || null;
  };

  const isInWishlist = (productId) => {
    if (!productId) return false;
    if (Object.prototype.hasOwnProperty.call(optimisticWishlist, productId)) {
      return !!optimisticWishlist[productId];
    }
    return (wishlist || []).some((item) =>
      String(getWishlistProductId(item)) === String(productId)
    );
  };

  function addToWishlist(p) {
    if (!localStorage.getItem("login")) {
      navigate("/login");
    } else {
      const productId = p.id || p._id;
      const userId = localStorage.getItem("userid");
      const d = (wishlist || []).find(
        (item) => String(getWishlistProductId(item)) === String(productId)
      );
      if (d) {
        setOptimisticWishlist(prev => ({ ...prev, [productId]: false }));
        dispatch(deleteWishlist({ id: d.id || d._id || productId }));
        setWishlistToast({ show: true, text: "Removed from Wishlist" });
      } else {
        const sizeStr = Array.isArray(p.size) ? (p.size[0] || "") : p.size;
        setOptimisticWishlist(prev => ({ ...prev, [productId]: true }));
        dispatch(addWishlist({
          productid: productId,
          userid: userId,
          name: p.name,
          color: p.color,
          size: sizeStr,
          price: Number(p.finalprice),
          pic: p.pic1,
        }));
        setWishlistToast({ show: true, text: "Added to Wishlist ✦" });
      }
    }
  }

  useEffect(() => {
    if (!wishlist) return;
    const next = { ...optimisticWishlist };
    let changed = false;
    Object.keys(optimisticWishlist).forEach(pid => {
      const real = (wishlist || []).some(it => String(getWishlistProductId(it)) === String(pid));
      if (optimisticWishlist[pid] === !!real) {
        delete next[pid];
        changed = true;
      }
    });
    if (changed) setOptimisticWishlist(next);
  }, [wishlist]);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const emailTrimmed = nlEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      toast.warning('Please enter your email address.');
      return;
    }
    setNlLoading(true);
    try {
      await axios.post(`${BASE_URL}/newslatter`, { email: emailTrimmed });
      setNlEmail('');
      toast.success("Welcome to the club! You've been subscribed. ✨");
    } catch (err) {
      const message = String(err?.response?.data?.message || err?.response?.data?.error || err?.message || '').toLowerCase();
      if (message.includes('duplicate') || message.includes('already') || message.includes('e11000')) {
        toast.info('You are already on our VIP list! 🌟');
      } else {
        toast.error('Subscription failed. Please try again.');
      }
    } finally {
      setNlLoading(false);
    }
  };

  const handleTransitionNavigate = (path) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      navigate(path);
      setIsTransitioning(false);
    }, 500);
  };

  const handleEditorialClick = (cat) => {
    const categoryPath = cat === 'men' ? 'Men' : cat === 'women' ? 'Women' : cat === 'kids' ? 'Kids' : 'All';
    navigate(`/shop/${categoryPath}`);
    handleTransitionNavigate(`/shop/${categoryPath}`);
  };

  const slide = sliderData[currentSlide];

  return (
    <div className="hx-root">
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

      {/* ─── WISHLIST TOAST ─── */}
      <AnimatePresence>
        {wishlistToast.show && (
          <motion.div
            className="hx-toast"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            {wishlistToast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          1. ANNOUNCEMENT TICKER
      ════════════════════════════════════════ */}
      <div className="hx-ticker-wrap">
        <div className="hx-ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="hx-ticker-item">{t}</span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          2. HERO SLIDER
      ════════════════════════════════════════ */}
      <section className="hx-hero" ref={heroRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="hx-hero-slide"
            style={{ background: slide.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Decorative orbs */}
            <div className="hx-orb hx-orb-1" style={{ background: `radial-gradient(circle, ${slide.accent}33 0%, transparent 70%)` }} />
            <div className="hx-orb hx-orb-2" style={{ background: `radial-gradient(circle, ${slide.accent}22 0%, transparent 70%)` }} />

            {/* Slide Number Watermark */}
            <span className="hx-slide-wm">{Pad(currentSlide + 1)}</span>

            <div className="hx-container hx-hero-inner">
              {/* TEXT */}
              <div className="hx-hero-text">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="hx-hero-badge" style={{ borderColor: `${slide.accent}66`, background: `${slide.accent}14` }}>
                    <span className="hx-badge-dot" style={{ background: slide.accent }} />
                    <span style={{ color: slide.accent, fontWeight: 800, fontSize: 11, letterSpacing: 2 }}>
                      {welcomeUser ? `WELCOME BACK, ${welcomeUser.toUpperCase()}` : slide.sub}
                    </span>
                  </div>

                  <h1 className={`hx-hero-title ${slide.dark ? 'hx-title-light' : ''}`}>
                    {slide.title.split(" ").map((word, wi) => (
                      <motion.span
                        key={wi}
                        className="hx-title-word"
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + wi * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </h1>

                  <p className={`hx-hero-desc ${slide.dark ? 'hx-desc-light' : ''}`}>{slide.desc}</p>

                  <div className="hx-hero-cta">
                  <Link to={slide.link} onClick={(e) => { e.preventDefault(); handleTransitionNavigate(slide.link); }} className="hx-btn-primary" style={{ background: `linear-gradient(135deg, ${slide.accent} 0%, ${slide.accent}cc 100%)` }}>
                      <span>EXPLORE COLLECTION</span>
                      <span className="hx-btn-arrow">→</span>
                    </Link>
                  <Link to="/shop/All" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/All'); }} className={`hx-btn-ghost ${slide.dark ? 'hx-btn-ghost-light' : ''}`}>
                      VIEW ALL
                    </Link>
                  </div>

                  {/* Slide stats removed as per request */}
                </motion.div>
              </div>

              {/* IMAGE */}
              <div className="hx-hero-img-wrap">
                <motion.div
                  className="hx-hero-img-glow"
                  style={{ background: `radial-gradient(circle, ${slide.accent}55 0%, transparent 65%)` }}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2 }}
                />
                <motion.img
                  src={slide.img}
                  alt={slide.title}
                  className="hx-hero-img"
                  loading="eager"
                  fetchpriority="high"
                  initial={{ scale: 0.85, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                />
                {/* Floating tags on image */}
                <motion.div
                  className="hx-float-tag hx-float-tag-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                >
                  <span className="hx-ft-icon">🔥</span>
                  <div><div className="hx-ft-title">Trending Now</div><div className="hx-ft-sub">This Season</div></div>
                </motion.div>
                <motion.div
                  className="hx-float-tag hx-float-tag-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                >
                  <span className="hx-ft-icon">✦</span>
                  <div><div className="hx-ft-title">Premium</div><div className="hx-ft-sub">Certified Quality</div></div>
                </motion.div>
              </div>
            </div>

            {/* Dots */}
            <div className="hx-hero-nav">
              <div className="hx-dots">
                {sliderData.map((_, i) => (
                  <button key={i} className={`hx-dot ${currentSlide === i ? 'hx-dot-active' : ''}`}
                    onClick={() => setCurrentSlide(i)}
                    style={currentSlide === i ? { background: slide.accent } : {}}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
              <div className="hx-hero-counter" style={{ color: slide.dark ? '#fff8' : '#0008' }}>
                <span style={{ color: slide.accent, fontWeight: 900, fontSize: 20 }}>{Pad(currentSlide + 1)}</span>
                <span style={{ opacity: 0.3, margin: '0 6px' }}>/</span>
                <span style={{ opacity: 0.4, fontSize: 13 }}>{Pad(sliderData.length)}</span>
              </div>
            </div>

            {/* Vertical scroll hint */}
            <div className={`hx-scroll-hint ${slide.dark ? 'hx-scroll-light' : ''}`}>
              <div className="hx-scroll-line" />
              <span>SCROLL</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ════════════════════════════════════════
          3. USP TRUST BAR
      ════════════════════════════════════════ */}
      <section className="hx-usp-bar">
        <div className="hx-container hx-usp-inner">
          {USP_ITEMS.map((u, i) => (
            <motion.div
              key={i}
              className="hx-usp-item"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <span className="hx-usp-icon">{u.icon}</span>
              <div>
                <div className="hx-usp-title">{u.title}</div>
                <div className="hx-usp-sub">{u.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          4. EDITORIAL CATEGORIES
      ════════════════════════════════════════ */}
      <section className="hx-editorial">
        <div className="hx-container">
          <motion.div
            className="hx-section-head"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="hx-eyebrow">CURATED STORIES · FALL / WINTER 2024</span>
            <h2 className="hx-section-title">The Editorials</h2>
          </motion.div>

          <div className="hx-ed-grid">
            {/* LARGE LEFT */}
            <motion.div
              className="hx-ed-card hx-ed-large"
              onClick={() => handleEditorialClick('men')}
              whileHover={{ scale: 0.985 }}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <img src="/assets/images/choose-1.jpg" className="hx-ed-img" alt="Man" />
              <div className="hx-ed-overlay" />
              <div className="hx-ed-content">
                <span className="hx-ed-tag">EDITORIAL</span>
                <h3 className="hx-ed-heading">MANIFESTO<br />MAN</h3>
                <button className="hx-ed-btn">EXPLORE SHOP →</button>
              </div>
            </motion.div>

            {/* RIGHT COLUMN */}
            <div className="hx-ed-col">
              <motion.div
                className="hx-ed-card"
                onClick={() => handleEditorialClick('women')}
                whileHover={{ scale: 0.985 }}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
                style={{ flex: 1 }}
              >
                <img src="/assets/images/CR-1.png" className="hx-ed-img" alt="Women" />
                <div className="hx-ed-overlay" />
                <div className="hx-ed-content">
                  <span className="hx-ed-tag">WOMEN</span>
                  <h3 className="hx-ed-heading">ELEGANT<br />MODERN</h3>
                  <span className="hx-ed-link">VIEW DETAILS →</span>
                </div>
              </motion.div>

              <motion.div
                className="hx-ed-card"
                onClick={() => handleEditorialClick('kids')}
                whileHover={{ scale: 0.985 }}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                style={{ flex: 1 }}
              >
                <img src="/assets/images/kids3.png" className="hx-ed-img" alt="Kids" />
                <div className="hx-ed-overlay" />
                <div className="hx-ed-content">
                  <span className="hx-ed-tag">KIDS</span>
                  <h3 className="hx-ed-heading">KIDS<br />LAB ✨</h3>
                  <button className="hx-ed-btn hx-ed-btn-kids">SHOP KIDS →</button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          5. FLASH DEALS COUNTDOWN
      ════════════════════════════════════════ */}
      <section className="hx-deals">
        <div className="hx-container hx-deals-inner">
          <div className="hx-deals-left">
            <span className="hx-deals-eyebrow">⚡ LIMITED TIME OFFER</span>
            <h2 className="hx-deals-title">Flash Sale<br /><em>Ends In</em></h2>
            <div className="hx-countdown">
              {[['H', countdown.h], ['M', countdown.m], ['S', countdown.s]].map(([label, val]) => (
                <React.Fragment key={label}>
                  <div className="hx-cd-block">
                    <span className="hx-cd-num">{Pad(val)}</span>
                    <span className="hx-cd-label">{label}</span>
                  </div>
                  {label !== 'S' && <span className="hx-cd-sep">:</span>}
                </React.Fragment>
              ))}
            </div>
            <Link to="/shop/All?tag=Sale" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/All?tag=Sale'); }} className="hx-deals-btn">GRAB THE DEAL →</Link>
          </div>
          <div className="hx-deals-right">
            <div className="hx-deals-tags">
              <span className="hx-dtag">UP TO 60% OFF</span>
              <span className="hx-dtag hx-dtag-outline">500+ STYLES</span>
              <span className="hx-dtag">FREE SHIP</span>
              <span className="hx-dtag hx-dtag-outline">LIMITED STOCK</span>
            </div>
            <p className="hx-deals-sub">
              Our biggest sale of the season is live. Shop premium styles at unbeatable prices — before they're gone.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          NEW: THE BRAND ATELIER (Dynamic)
      ════════════════════════════════════════ */}
      <section className="hx-brands">
        <div className="hx-container">
          <motion.div
            className="hx-section-head"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="hx-eyebrow">THE BRAND ATELIER</span>
            <h2 className="hx-section-title">Discover by <em>Brand</em></h2>
            <p className="hx-section-sub">Explore our curated selection of world-class luxury houses.</p>
          </motion.div>

          <div className="hx-brands-grid">
            {premiumBrands.map((brand, i) => (
              <motion.div
                key={i}
                className="hx-brand-card"
                onClick={() => handleTransitionNavigate(`/shop/All?brand=${encodeURIComponent(brand.name)}`)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
              >
                <LazyImage src={brand.img || '/assets/images/noimage.png'} alt={brand.name} className="hx-brand-img" maxWidth={400} />
                <div className="hx-brand-overlay" />
                <div className="hx-brand-content">
                  <h3 className="hx-brand-name">{brand.name}</h3>
                  <span className="hx-brand-link">DISCOVER</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          6. PRODUCT SHOWCASE (connected to backend)
      ════════════════════════════════════════ */}
      <section className="hx-products">
        <div className="hx-container">
          <motion.div
            className="hx-section-head"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="hx-eyebrow">HANDPICKED FOR YOU</span>
            <h2 className="hx-section-title">Trending Curations</h2>
            <p className="hx-section-sub">Carefully selected premium collection designed for modern lifestyle</p>
          </motion.div>

          {/* Category pills */}
          <div className="hx-filter-row">
            {['All', 'New Arrivals', 'Sale', 'Men', 'Women', 'Kids'].map((f, i) => (
              <motion.button
                key={f}
                className={`hx-filter-pill ${activeFilter === f ? 'hx-filter-active' : ''}`}
                onClick={() => setActiveFilter(f)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >{f}</motion.button>
            ))}
          </div>

          {displayProducts.length > 0 ? (
            <div className="hx-product-grid">
              {displayProducts.map((item, index) => {
                const stats = reviewStats[item.id];
                const ratingValue = stats ? stats.average : (item.rating || 0);
                const reviewCount = stats ? stats.count : 0;

                return (<motion.div
                  key={item.id}
                  className="hx-pcard"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, duration: 0.5 }}
                  onMouseEnter={() => setHoveredProduct(item.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  {/* IMAGE AREA */}
                  <div className="hx-pcard-img-wrap">
                    <Link to={`/single-product/${item.id}`}>
                      <LazyImage
                        src={item.pic1 || '/assets/images/noimage.png'}
                        className="hx-pcard-img"
                        alt={item.name}
                        maxWidth={500}
                      />
                    </Link>

                    {/* Gradient overlay */}
                    <div className="hx-pcard-grad" />

                    {/* Badges */}
                    <div className="hx-pcard-badges">
                      {item.isSale && <span className="hx-badge hx-badge-sale">✦ SALE</span>}
                      {!item.isSale && item.discount > 0 && <span className="hx-badge hx-badge-discount">✦ {item.discount}% OFF</span>}
                      {item.newArrival && <span className="hx-badge hx-badge-new">✨ NEW ARRIVAL</span>}
                    </div>

                    {/* Wishlist button */}
                    <button
                      className={`hx-wish-btn ${isInWishlist(item.id) ? 'hx-wish-active' : ''}`}
                      onClick={() => addToWishlist(item)}
                      aria-label="Wishlist"
                    >
                      {isInWishlist(item.id) ? '♥' : '♡'}
                    </button>

                    {/* Quick view overlay */}
                    <AnimatePresence>
                      {hoveredProduct === item.id && (
                        <motion.div
                          className="hx-quick-overlay"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ duration: 0.25 }}
                        >
                          <Link to={`/single-product/${item.id}`} className="hx-quick-btn">
                            VIEW DETAILS →
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* CARD BODY */}
                  <div className="hx-pcard-body">
                    <div className="hx-pcard-top">
                      <span className="hx-pcard-brand">{item.brand}</span>
                      <div className="hx-pcard-rating">
                        <span className="hx-stars">{'★'.repeat(Math.floor(ratingValue))}</span>
                        <span className="hx-rating-val">({ratingValue > 0 ? `${ratingValue.toFixed(1)} (${reviewCount})` : 'New'})</span>
                      </div>
                    </div>

                    <h3 className="hx-pcard-name">
                      <Link to={`/single-product/${item.id}`} className="hx-pcard-name-link">
                        {item.name}
                      </Link>
                    </h3>

                    <p className="hx-pcard-cat">{item.maincategory} · {item.subcategory}</p>

                    {/* Chips */}
                    <div className="hx-chips">
                      {item.discount > 0 && <span className="hx-chip hx-chip-sale">Save {item.discount}%</span>}
                      {item.finalprice >= 999 && <span className="hx-chip hx-chip-ship">Free Ship</span>}
                      <span className="hx-chip hx-chip-fabric">Premium</span>
                      {item.stock === "In Stock" && <span className="hx-chip hx-chip-stock">In Stock</span>}
                    </div>

                    {/* Price Row */}
                    <div className="hx-pcard-price-row">
                      <div className="hx-pcard-prices">
                        <span className="hx-price">₹{item.finalprice}</span>
                        {item.baseprice > item.finalprice && (
                          <del className="hx-orig-price">₹{item.baseprice}</del>
                        )}
                      </div>
                      {item.baseprice > item.finalprice && (
                        <span className="hx-save-badge">SAVE ₹{item.baseprice - item.finalprice}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )})}
            </div>
          ) : (
            <div className="hx-loading-state">
              {[1,2,3,4].map(i => (
                <div key={i} className="hx-skeleton">
                  <div className="hx-skel-img hx-shimmer" />
                  <div className="hx-skel-line hx-shimmer" style={{ width: '60%', marginTop: 16 }} />
                  <div className="hx-skel-line hx-shimmer" style={{ width: '80%', marginTop: 8 }} />
                  <div className="hx-skel-line hx-shimmer" style={{ width: '40%', marginTop: 8 }} />
                </div>
              ))}
            </div>
          )}

          <div className="hx-view-all-wrap">
            <Link to="/shop/All" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/All'); }} className="hx-view-all-btn">
              VIEW COMPLETE COLLECTION <span className="hx-va-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          7. BRAND STORY STRIP
      ════════════════════════════════════════ */}
      <section className="hx-brand-story">
        <div className="hx-story-bg-text">LUXURY</div>
        <div className="hx-container hx-story-inner">
          <motion.div
            className="hx-story-text"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="hx-eyebrow hx-eyebrow-gold">OUR PHILOSOPHY</span>
            <h2 className="hx-story-title">Crafted for Those<br />Who Dare to Stand Out</h2>
            <p className="hx-story-desc">
              We believe clothing is an art form. Every thread, every stitch, every silhouette is 
              thoughtfully curated to let you express your truest self. From timeless classics 
              to bold statements — our collections are where quality meets identity.
            </p>
            <div className="hx-story-pillars">
              {['Sustainable Sourcing', 'Expert Craftsmanship', 'Inclusive Sizing', 'Ethical Production'].map(p => (
                <div key={p} className="hx-pillar">
                  <span className="hx-pillar-dot" />
                  {p}
                </div>
              ))}
            </div>
            <Link to="/shop/All" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/All'); }} className="hx-story-btn">DISCOVER OUR STORY →</Link>
          </motion.div>
          <motion.div
            className="hx-story-img-stack"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <img src="/assets/images/CR-1.png" className="hx-story-img hx-story-img-back" alt="story" />
            <img src="/assets/images/CR-3.png" className="hx-story-img hx-story-img-front" alt="story" />
            <div className="hx-story-badge-float">
              <span className="hx-sbf-num">50K+</span>
              <span className="hx-sbf-label">Happy Customers</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          8. LOOKBOOK GRID
      ════════════════════════════════════════ */}
      <section className="hx-lookbook">
        <div className="hx-container">
          <motion.div
            className="hx-section-head"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="hx-eyebrow">STYLE INSPIRATION</span>
            <h2 className="hx-section-title">The Lookbook</h2>
            <p className="hx-section-sub">Get inspired by real styles from our community</p>
          </motion.div>
          <div className="hx-lookbook-grid">
            {LOOKBOOK.map((l, i) => (
              <motion.div
                key={i}
                className={`hx-lb-item ${i === 0 || i === 3 ? 'hx-lb-tall' : ''}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.6 }}
                onClick={() => handleTransitionNavigate(`/shop/${l.tag === 'WOMEN' ? 'Women' : l.tag === 'MEN' ? 'Men' : 'Kids'}`)}
                whileHover={{ scale: 0.98 }}
              >
                <img src={l.img} alt={l.label} className="hx-lb-img" loading="lazy" />
                <div className="hx-lb-overlay" />
                <div className="hx-lb-info">
                  <span className="hx-lb-tag">{l.tag}</span>
                  <span className="hx-lb-label">{l.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          9. TESTIMONIALS
      ════════════════════════════════════════ */}
      <section className="hx-testimonials">
        <div className="hx-test-bg-text">LOVE</div>
        <div className="hx-container">
          <motion.div
            className="hx-section-head"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="hx-eyebrow hx-eyebrow-gold">WHAT THEY SAY</span>
            <h2 className="hx-section-title">Loved by 50,000+<br />Happy Customers</h2>
          </motion.div>

          <div className="hx-test-grid">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                className={`hx-test-card ${i === activeTestimonial ? 'hx-test-active' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setActiveTestimonial(i)}
              >
                <div className="hx-test-stars">{'★'.repeat(t.rating)}</div>
                <p className="hx-test-text">"{t.text}"</p>
                <div className="hx-test-author">
                  <div className="hx-test-avatar">{t.avatar}</div>
                  <div>
                    <div className="hx-test-name">{t.name}</div>
                    <div className="hx-test-city">{t.city}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          10. NEWSLETTER
      ════════════════════════════════════════ */}
      <section className="hx-newsletter">
        <div className="hx-nl-noise" />
        <motion.div
          className="hx-container hx-nl-inner"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="hx-eyebrow hx-eyebrow-gold">JOIN THE CLUB</span>
          <h2 className="hx-nl-title">Get Exclusive Access</h2>
          <p className="hx-nl-sub">Subscribe for early drops, style tips & member-only discounts</p>
          <form className="hx-nl-form" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              className="hx-nl-input"
              placeholder="Enter your email address"
              value={nlEmail}
              onChange={(e) => setNlEmail(e.target.value)}
              required
              disabled={nlLoading}
            />
            <button type="submit" className="hx-nl-btn" disabled={nlLoading}>{nlLoading ? 'JOINING...' : 'SUBSCRIBE'}</button>
          </form>
          <p className="hx-nl-note">No spam, ever. Unsubscribe anytime. 🔒</p>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════
          STYLES
      ════════════════════════════════════════ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        /* ── RESET & BASE ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .hx-root {
          font-family: 'DM Sans', sans-serif;
          background: #0a0a0a;
          color: #1a1a1a;
          overflow-x: hidden;
        }
        .hx-container { max-width: 1380px; margin: 0 auto; padding: 0 40px; }

        /* ── TICKER ── */
        .hx-ticker-wrap {
          background: #0a0a0a;
          overflow: hidden;
          padding: 12px 0;
          border-bottom: 1px solid #222;
        }
        .hx-ticker-track {
          display: flex;
          animation: hxTicker 30s linear infinite;
          white-space: nowrap;
          width: max-content;
        }
        .hx-ticker-item {
          display: inline-block;
          padding: 0 60px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: #c8a96e;
          text-transform: uppercase;
        }
        @keyframes hxTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* ── TOAST ── */
        .hx-toast {
          position: fixed; top: 24px; right: 24px; z-index: 9999;
          background: #0a0a0a;
          color: #c8a96e;
          border: 1px solid #c8a96e44;
          border-radius: 999px;
          padding: 12px 24px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
        }

        /* ── HERO ── */
        .hx-hero {
          position: relative;
          height: 92vh;
          min-height: 700px;
          overflow: hidden;
        }
        .hx-hero-slide {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
        }
        .hx-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .hx-orb-1 { width: 700px; height: 700px; top: -200px; right: -100px; animation: hxOrb1 20s ease-in-out infinite; }
        .hx-orb-2 { width: 500px; height: 500px; bottom: -150px; left: -100px; animation: hxOrb2 16s ease-in-out infinite; }
        @keyframes hxOrb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-60px,60px)} }
        @keyframes hxOrb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(60px,-60px)} }
        .hx-slide-wm {
          position: absolute;
          right: -20px;
          top: 50%;
          transform: translateY(-50%) rotate(90deg);
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(120px, 15vw, 200px);
          font-weight: 700;
          color: rgba(0,0,0,0.04);
          letter-spacing: -10px;
          user-select: none;
          pointer-events: none;
          z-index: 0;
        }
        .hx-hero-inner {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 60px;
          padding: 80px 40px;
          position: relative;
          z-index: 2;
        }
        .hx-hero-text { flex: 1; }
        .hx-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 22px;
          border-radius: 999px;
          border: 1.5px solid;
          margin-bottom: 28px;
        }
        .hx-badge-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          animation: hxPulse 2s ease-in-out infinite;
        }
        @keyframes hxPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.8)} }
        .hx-hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(3.5rem, 7vw, 7rem);
          font-weight: 700;
          line-height: 0.95;
          letter-spacing: -2px;
          color: #0a0a0a;
          margin-bottom: 28px;
          display: flex;
          flex-wrap: wrap;
          gap: 0 20px;
        }
        .hx-title-light { color: #f8f4ee !important; }
        .hx-title-word { display: inline-block; overflow: hidden; }
        .hx-hero-desc {
          font-size: 16px;
          line-height: 1.8;
          color: #555;
          max-width: 480px;
          margin-bottom: 40px;
          font-weight: 400;
        }
        .hx-desc-light { color: rgba(255,255,255,0.65) !important; }
        .hx-hero-cta { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
        .hx-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          padding: 18px 44px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-decoration: none;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          position: relative;
          overflow: hidden;
        }
        .hx-btn-primary::before {
          content:'';
          position:absolute;
          inset:0;
          background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform:translateX(-100%);
          transition:transform 0.5s;
        }
        .hx-btn-primary:hover::before { transform:translateX(100%); }
        .hx-btn-primary:hover { transform:translateY(-4px); box-shadow:0 30px 60px rgba(0,0,0,0.35); color:#fff; }
        .hx-btn-arrow { font-size:20px; transition:transform 0.3s; }
        .hx-btn-primary:hover .hx-btn-arrow { transform:translateX(6px); }
        .hx-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0a0a0a;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          text-decoration: none;
          border-bottom: 2px solid #0a0a0a;
          padding-bottom: 4px;
          transition: all 0.3s;
        }
        .hx-btn-ghost:hover { color:#c8a96e; border-color:#c8a96e; }
        .hx-btn-ghost-light { color:#fff !important; border-color:#fff !important; }
        .hx-btn-ghost-light:hover { color:#c8a96e !important; border-color:#c8a96e !important; }
        .hx-hero-stats {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-top: 48px;
          padding-top: 32px;
          border-top: 1px solid rgba(0,0,0,0.1);
        }
        .hx-stat { display:flex; flex-direction:column; }
        .hx-stat-num { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:700; color:#0a0a0a; line-height:1; }
        .hx-stat-label { font-size:11px; font-weight:600; letter-spacing:1px; color:#888; margin-top:4px; text-transform:uppercase; }
        .hx-stat-div { width:1px; height:36px; background:#ddd; }

        /* Hero Image */
        .hx-hero-img-wrap {
          flex: 1;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          max-width: 560px;
        }
        .hx-hero-img-glow {
          position:absolute; width:80%; height:80%;
          top:10%; left:10%;
          border-radius:50%;
          filter:blur(80px);
          z-index:0;
          animation:hxGlow 5s ease-in-out infinite;
        }
        @keyframes hxGlow { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .hx-hero-img {
          position:relative; z-index:1;
          max-height: 78vh;
          width:auto;
          filter:drop-shadow(0 30px 60px rgba(0,0,0,0.2));
          animation: hxFloat 7s ease-in-out infinite;
        }
        @keyframes hxFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-24px)} }
        .hx-float-tag {
          position: absolute;
          z-index: 3;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(200,169,110,0.3);
          border-radius: 16px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
          font-size: 15px;
        }
        .hx-float-tag-1 {
          left: 0%;
          top: 12%;
          transform: translate(-120%, -50%);
          animation: hxTagFloat1 5s ease-in-out infinite;
        }
        .hx-float-tag-2 {
          right: 3%;
          top: 58%;
          transform: translate(120%, -50%);
          animation: hxTagFloat2 6s ease-in-out infinite;
        }
        @keyframes hxTagFloat1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes hxTagFloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        .hx-ft-icon { font-size:20px; }
        .hx-ft-title { font-size:12px; font-weight:800; color:#0a0a0a; letter-spacing:0.5px; }
        .hx-ft-sub { font-size:10px; font-weight:500; color:#888; margin-top:2px; }

        /* Hero Nav */
        .hx-hero-nav {
          position: absolute;
          bottom: 48px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 20px;
          z-index: 10;
          background: rgba(255,255,255,0.95);
          border-radius: 32px;
          box-shadow: 0 4px 24px 0 rgba(0,0,0,0.08);
          padding: 10px 24px 10px 18px;
          border: 2px solid #e0f3fa;
          min-width: 180px;
        }
        .hx-dots {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .hx-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #fff;
          border: 2px solid #b2dff7;
          box-shadow: 0 2px 8px 0 rgba(0,0,0,0.06);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          padding: 0;
          outline: none;
        }
        .hx-dot-active {
          width: 28px;
          background: #1ec6e6;
          border-color: #1ec6e6;
          box-shadow: 0 2px 12px 0 rgba(30,198,230,0.18);
        }
        .hx-hero-counter {
          font-family: 'Cormorant Garamond', serif;
          display: flex;
          align-items: baseline;
          font-size: 1.2rem;
          font-weight: 700;
          color: #1ec6e6;
          background: none;
          margin-left: 10px;
        }
        .hx-hero-counter span {
          font-size: 1.2rem;
          font-weight: 700;
        }
        .hx-hero-counter span:last-child {
          opacity: 0.4;
          font-size: 1rem;
          margin-left: 2px;
        }
        .hx-scroll-hint {
          position:absolute; right:40px; top:50%;
          transform:translateY(-50%);
          display:flex; flex-direction:column; align-items:center; gap:12px;
          z-index:10;
        }
        .hx-scroll-line {
          width:1px; height:60px;
          background:linear-gradient(to bottom, transparent, rgba(0,0,0,0.3));
          animation:hxScrollLine 2s ease-in-out infinite;
        }
        @keyframes hxScrollLine { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.5)} }
        .hx-scroll-hint span {
          font-size:9px; font-weight:800; letter-spacing:3px;
          color:rgba(0,0,0,0.35);
          writing-mode:vertical-lr;
        }
        .hx-scroll-light .hx-scroll-line { background:linear-gradient(to bottom, transparent, rgba(255,255,255,0.3)); }
        .hx-scroll-light span { color:rgba(255,255,255,0.4); }

        /* ── USP BAR ── */
        .hx-usp-bar { background:#fff; border-top:1px solid #f0ede8; border-bottom:1px solid #f0ede8; padding:24px 0; }
        .hx-usp-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; }
        .hx-usp-item {
          display:flex; align-items:center; gap:14px;
          flex:1; min-width:180px;
          padding:16px 20px;
          border-right:1px solid #f0ede8;
          transition:transform 0.3s;
        }
        .hx-usp-item:last-child { border-right:none; }
        .hx-usp-item:hover { transform:translateY(-3px); }
        .hx-usp-icon { font-size:26px; flex-shrink:0; }
        .hx-usp-title { font-size:13px; font-weight:800; color:#0a0a0a; letter-spacing:0.3px; }
        .hx-usp-sub { font-size:11px; color:#888; margin-top:2px; font-weight:500; }

        /* ── SECTION COMMON ── */
        .hx-section-head { text-align:center; margin-bottom:56px; }
        .hx-eyebrow {
          display:inline-block;
          font-size:11px; font-weight:800; letter-spacing:3px;
          color:#888; margin-bottom:16px;
          text-transform:uppercase;
        }
        .hx-eyebrow-gold { color:#c8a96e !important; }
        .hx-section-title {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(2.5rem, 5vw, 4.5rem);
          font-weight:700;
          color:#0a0a0a;
          line-height:1.1;
          letter-spacing:-1px;
          margin-bottom:16px;
        }
        .hx-section-sub { font-size:15px; color:#777; max-width:560px; margin:0 auto; line-height:1.7; }

        /* ── EDITORIAL ── */
        .hx-editorial { background:#fff; padding:100px 0; }
        .hx-ed-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:20px;
          height:700px;
        }
        .hx-ed-card {
          position:relative; overflow:hidden;
          border-radius:20px; cursor:pointer;
          display:flex;
        }
        .hx-ed-large { grid-row:span 1; }
        .hx-ed-col { display:flex; flex-direction:column; gap:20px; }
        .hx-ed-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .hx-ed-card:hover .hx-ed-img { transform:scale(1.06); }
        .hx-ed-overlay { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%); }
        .hx-ed-content { position:absolute; bottom:0; left:0; right:0; padding:36px; }
        .hx-ed-tag {
          display:inline-block;
          font-size:10px; font-weight:800; letter-spacing:3px;
          color:#c8a96e;
          background:rgba(200,169,110,0.18);
          border:1px solid rgba(200,169,110,0.4);
          padding:5px 14px; border-radius:999px;
          margin-bottom:14px;
        }
        .hx-ed-heading {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(1.8rem, 3vw, 3.5rem);
          font-weight:700; color:#fff;
          line-height:1.05; letter-spacing:-0.5px;
          margin-bottom:18px;
        }
        .hx-ed-btn {
          display:inline-block;
          padding:12px 32px;
          border:2px solid rgba(255,255,255,0.7);
          color:#fff;
          background:transparent;
          font-size:11px; font-weight:800; letter-spacing:2px;
          border-radius:4px; cursor:pointer;
          transition:all 0.3s;
        }
        .hx-ed-btn:hover { background:#fff; color:#0a0a0a; border-color:#fff; }
        .hx-ed-btn-kids { border-color:#c8a96e; color:#c8a96e; }
        .hx-ed-btn-kids:hover { background:#c8a96e; color:#fff; }
        .hx-ed-link { font-size:12px; font-weight:800; letter-spacing:1.5px; color:#c8a96e; border-bottom:1px solid #c8a96e; padding-bottom:3px; cursor:pointer; }

        /* ── FLASH DEALS ── */
        .hx-deals {
          background:linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          padding:80px 0;
          position:relative;
          overflow:hidden;
        }
        .hx-deals::before {
          content:'';
          position:absolute; inset:0;
          background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hx-deals-inner { display:flex; align-items:center; gap:80px; position:relative; z-index:1; }
        .hx-deals-left { flex:1; }
        .hx-deals-eyebrow { font-size:11px; font-weight:800; letter-spacing:3px; color:#c8a96e; display:block; margin-bottom:20px; }
        .hx-deals-title {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(3rem, 5vw, 5.5rem);
          font-weight:700; color:#fff;
          line-height:1; letter-spacing:-2px;
          margin-bottom:36px;
        }
        .hx-deals-title em { font-style:italic; color:#c8a96e; }
        .hx-countdown { display:flex; align-items:center; gap:12px; margin-bottom:40px; }
        .hx-cd-block {
          display:flex; flex-direction:column; align-items:center;
          background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.12);
          border-radius:12px; padding:16px 24px; min-width:80px;
        }
        .hx-cd-num {
          font-family:'Cormorant Garamond',serif;
          font-size:42px; font-weight:700; color:#fff;
          line-height:1;
        }
        .hx-cd-label { font-size:10px; font-weight:800; letter-spacing:2px; color:#c8a96e; margin-top:6px; }
        .hx-cd-sep { font-size:36px; font-weight:300; color:rgba(255,255,255,0.3); margin-bottom:16px; }
        .hx-deals-btn {
          display:inline-flex; align-items:center; gap:10px;
          background:linear-gradient(135deg, #c8a96e, #a07848);
          color:#fff; padding:18px 44px;
          border-radius:4px; font-size:12px; font-weight:800; letter-spacing:2px;
          text-decoration:none;
          transition:all 0.4s;
          box-shadow:0 20px 40px rgba(200,169,110,0.35);
        }
        .hx-deals-btn:hover { transform:translateY(-4px); box-shadow:0 30px 50px rgba(200,169,110,0.45); color:#fff; }
        .hx-deals-right { flex:1; }
        .hx-deals-tags { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; }
        .hx-dtag {
          padding:10px 24px; border-radius:999px;
          background:#c8a96e; color:#0a0a0a;
          font-size:11px; font-weight:800; letter-spacing:1.5px;
        }
        .hx-dtag-outline { background:transparent; color:#c8a96e; border:1.5px solid #c8a96e; }
        .hx-deals-sub { font-size:16px; color:rgba(255,255,255,0.55); line-height:1.8; max-width:400px; }

        /* ── BRANDS ATELIER ── */
        .hx-brands { background:#fff; padding:100px 0; border-top:1px solid #f0ede8; }
        .hx-brands-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 24px;
        }
        .hx-brand-card {
          position: relative; overflow: hidden;
          border-radius: 12px; cursor: pointer;
          aspect-ratio: 16/9; background: #f8f6f2;
        transition: transform 0.6s cubic-bezier(0.16,1,0.3,1), box-shadow 0.6s cubic-bezier(0.16,1,0.3,1);
        transform: perspective(1000px) translateZ(0);
      }
      .hx-brand-card:hover {
        transform: perspective(1000px) translateZ(30px) translateY(-10px);
        box-shadow: 0 30px 60px rgba(0,0,0,0.25);
        z-index: 2;
      }
      .hx-brand-card::after {
        content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        transform: skewX(-25deg); pointer-events: none; z-index: 1; transition: none;
      }
      .hx-brand-card:hover::after {
        left: 150%;
        transition: left 0.8s cubic-bezier(0.16,1,0.3,1);
        }
        .hx-brand-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.8s cubic-bezier(0.16,1,0.3,1);
        }
        .hx-brand-card:hover .hx-brand-img { transform: scale(1.08); }
        .hx-brand-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
        z-index: 2;
        }
        .hx-brand-content {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 20px; text-align: center;
        z-index: 3;
        }
        .hx-brand-name {
          font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: #fff;
          letter-spacing: 2px; margin: 0 0 10px; text-transform: uppercase;
          text-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .hx-brand-link {
          font-size: 9px; font-weight: 700; letter-spacing: 2.5px; color: #fff;
          border: 1px solid rgba(255,255,255,0.4); padding: 8px 24px;
          transition: all 0.4s ease; display: inline-block; text-transform: uppercase;
          background: rgba(0,0,0,0.15); backdrop-filter: blur(4px);
        }
        .hx-brand-card:hover .hx-brand-link { background: #fff; color: #0a0a0a; border-color: #fff; }

        /* ── PRODUCTS ── */
        .hx-products { background:#f8f6f2; padding:100px 0; }
        .hx-filter-row { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:48px; }
        .hx-filter-pill {
          padding:10px 24px; border-radius:999px;
          border:1.5px solid #ddd;
          background:#fff; color:#555;
          font-size:12px; font-weight:700; letter-spacing:1px;
          cursor:pointer; transition:all 0.3s;
        }
        .hx-filter-pill:hover { border-color:#c8a96e; color:#c8a96e; }
        .hx-filter-active { background:#0a0a0a !important; color:#fff !important; border-color:#0a0a0a !important; }
        .hx-product-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        @media (max-width: 1200px) {
          .hx-product-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 800px) {
          .hx-product-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 500px) {
          .hx-product-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 800px) {
          .hx-product-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 550px) {
          .hx-product-grid {
            grid-template-columns: 1fr;
          }
        }
        /* Product Cards */
        .hx-pcard {
          background:#fff;
          border-radius:16px;
          overflow:hidden;
          border:1px solid rgba(0,0,0,0.06);
          transition:all 0.5s cubic-bezier(0.16,1,0.3,1);
          position:relative;
        }
        .hx-pcard:hover { transform:translateY(-16px); box-shadow:0 40px 80px rgba(0,0,0,0.14); border-color:rgba(200,169,110,0.3); }
        .hx-pcard-img-wrap { position:relative; aspect-ratio:3/4; overflow:hidden; background:#f8f6f2; }
        .hx-pcard-img { width:100%; height:100%; object-fit:cover; transition:transform 0.7s cubic-bezier(0.16,1,0.3,1); display:block; }
        .hx-pcard:hover .hx-pcard-img { transform:scale(1.08); }
        .hx-pcard-grad { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%); opacity:0; transition:opacity 0.4s; }
        .hx-pcard:hover .hx-pcard-grad { opacity:1; }
        .hx-pcard-badges { position:absolute; top:14px; left:14px; display:flex; flex-direction:column; gap:8px; z-index:3; }
        .hx-badge {
          padding: 6px 10px; border-radius: 4px;
          font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
          text-transform: uppercase; box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          display: inline-flex; align-items: center; gap: 4px;
          backdrop-filter: blur(4px);
        }
        .hx-badge-sale {
          background: linear-gradient(135deg, #111 0%, #2a2a2a 100%);
          color: #D4AF37;
          border: 1px solid rgba(212,175,55,0.4);
          animation: hxSalePulse 2s infinite;
        }
        @keyframes hxSalePulse {
          0% { box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 0 0 rgba(212,175,55,0.4); }
          70% { box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 0 8px rgba(212,175,55,0); }
          100% { box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 0 0 rgba(212,175,55,0); }
        }
        .hx-badge-new {
          background: linear-gradient(135deg, #D4AF37 0%, #9A7A20 100%);
          color: #fff;
          border: 1px solid #E8C97A;
        }
        .hx-badge-discount {
          background: linear-gradient(135deg, #111 0%, #2a2a2a 100%);
          color: #E8C97A;
          border: 1px solid rgba(212,175,55,0.3);
        }
        .hx-wish-btn {
          position:absolute; top:14px; right:14px; z-index:3;
          width:40px; height:40px; border-radius:50%;
          background:rgba(255,255,255,0.95);
          border:1px solid rgba(0,0,0,0.1);
          font-size:20px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          color:#aaa;
          box-shadow:0 4px 12px rgba(0,0,0,0.1);
          opacity:0;
        }
        .hx-pcard:hover .hx-wish-btn { opacity:1; }
        .hx-wish-btn:hover { transform:scale(1.2); color:#e74c3c; border-color:#e74c3c; }
        .hx-wish-active { opacity:1 !important; color:#e74c3c !important; border-color:#e74c3c !important; background:rgba(231,76,60,0.1) !important; }
        .hx-quick-overlay {
          position:absolute; bottom:0; left:0; right:0; z-index:3;
          padding:16px;
        }
        .hx-quick-btn {
          display:block; width:100%;
          text-align:center;
          background:rgba(10,10,10,0.9);
          color:#c8a96e;
          padding:14px;
          border-radius:8px;
          font-size:11px; font-weight:800; letter-spacing:2px;
          text-decoration:none;
          backdrop-filter:blur(10px);
          transition:all 0.3s;
        }
        .hx-quick-btn:hover { background:#c8a96e; color:#0a0a0a; }
        /* Card body */
        .hx-pcard-body { padding:20px; }
        .hx-pcard-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .hx-pcard-brand { font-size:10px; font-weight:800; letter-spacing:2px; color:#c8a96e; text-transform:uppercase; }
        .hx-pcard-rating { display:flex; align-items:center; gap:5px; }
        .hx-stars { color:#c8a96e; font-size:12px; letter-spacing:-1px; }
        .hx-rating-val { font-size:10px; color:#aaa; font-weight:600; }
        .hx-pcard-name { font-size:15px; font-weight:700; color:#0a0a0a; line-height:1.4; margin-bottom:6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .hx-pcard-name-link { text-decoration:none; color:inherit; transition:color 0.2s; }
        .hx-pcard-name-link:hover { color:#c8a96e; }
        .hx-pcard-cat { font-size:11px; color:#aaa; font-weight:500; margin-bottom:12px; }
        .hx-chips { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:14px; }
        .hx-chip { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.5px; }
        .hx-chip-sale { background:#fff3e0; color:#e65100; border:1px solid #ffcc80; }
        .hx-chip-ship { background:#e8f5e9; color:#2e7d32; border:1px solid #a5d6a7; }
        .hx-chip-fabric { background:#f8f6f2; color:#555; border:1px solid #e0ddd8; }
        .hx-chip-stock { background:#e3f2fd; color:#1565c0; border:1px solid #90caf9; }
        .hx-pcard-price-row { display:flex; align-items:center; justify-content:space-between; border-top:1px solid #f0ede8; padding-top:14px; }
        .hx-pcard-prices { display:flex; align-items:center; gap:8px; }
        .hx-price { font-family:'Cormorant Garamond',serif; font-size:24px; font-weight:700; color:#0a0a0a; }
        .hx-orig-price { font-size:14px; color:#bbb; text-decoration:line-through; }
        .hx-save-badge { font-size:9px; font-weight:800; letter-spacing:1px; color:#c8a96e; background:rgba(200,169,110,0.12); border:1px solid rgba(200,169,110,0.3); padding:4px 10px; border-radius:999px; }
        /* View all */
        .hx-view-all-wrap { text-align:center; margin-top:60px; }
        .hx-view-all-btn {
          display:inline-flex; align-items:center; gap:12px;
          padding:18px 52px;
          border:2px solid #0a0a0a;
          color:#0a0a0a; background:transparent;
          font-size:12px; font-weight:800; letter-spacing:3px;
          border-radius:4px; text-decoration:none;
          transition:all 0.4s cubic-bezier(0.16,1,0.3,1);
          position:relative; overflow:hidden;
          z-index: 1;
        }
        .hx-view-all-btn::before {
          content:'';
          position:absolute; inset:0;
          background:linear-gradient(135deg, #c8a96e 0%, #a07848 100%);
          transform:translateX(-101%);
          transition:transform 0.5s cubic-bezier(0.16,1,0.3,1);
          z-index:-1;
        }
        .hx-view-all-btn:hover::before { transform:translateX(0); }
        .hx-view-all-btn:hover { 
          color:#fff; 
          border-color:#a07848; 
          box-shadow: 0 12px 24px rgba(200, 169, 110, 0.35); 
        }
        .hx-view-all-btn span, .hx-va-arrow { position:relative; z-index:1; transition: transform 0.3s ease; }
        .hx-view-all-btn:hover .hx-va-arrow { transform: translateX(6px); }
        /* Skeleton */
        .hx-loading-state { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }
        .hx-skeleton { background:#fff; border-radius:16px; overflow:hidden; padding:0 0 20px; }
        .hx-skel-img { height:280px; background:#f0ede8; }
        .hx-skel-line { height:12px; background:#f0ede8; border-radius:6px; margin:0 16px; }
        .hx-shimmer { background:linear-gradient(90deg, #f0ede8 25%, #e8e5e0 50%, #f0ede8 75%); background-size:200% 100%; animation:hxShimmer 1.5s infinite; }
        @keyframes hxShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* ── BRAND STORY ── */
        .hx-brand-story { background:#fff; padding:120px 0; position:relative; overflow:hidden; }
        .hx-story-bg-text {
          position:absolute; top:50%; left:-40px;
          transform:translateY(-50%);
          font-family:'Cormorant Garamond',serif;
          font-size:220px; font-weight:700;
          color:rgba(200,169,110,0.04);
          letter-spacing:-10px; user-select:none; pointer-events:none;
          line-height:1;
        }
        .hx-story-inner { display:flex; align-items:center; gap:80px; position:relative; z-index:1; }
        .hx-story-text { flex:1; }
        .hx-story-title {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(2.5rem, 4vw, 4rem);
          font-weight:700; color:#0a0a0a;
          line-height:1.1; letter-spacing:-1px;
          margin-bottom:24px;
        }
        .hx-story-desc { font-size:16px; color:#666; line-height:1.85; margin-bottom:36px; max-width:480px; }
        .hx-story-pillars { display:flex; flex-direction:column; gap:12px; margin-bottom:40px; }
        .hx-pillar { display:flex; align-items:center; gap:12px; font-size:13px; font-weight:600; color:#333; }
        .hx-pillar-dot { width:6px; height:6px; border-radius:50%; background:#c8a96e; flex-shrink:0; }
        .hx-story-btn {
          display:inline-flex; align-items:center; gap:10px;
          padding:16px 40px;
          background:#0a0a0a; color:#fff;
          border-radius:4px; font-size:12px; font-weight:800; letter-spacing:2px;
          text-decoration:none; transition:all 0.3s;
        }
        .hx-story-btn:hover { background:#c8a96e; color:#fff; }
        .hx-story-img-stack { flex:1; position:relative; height:500px; }
        .hx-story-img { position:absolute; border-radius:16px; object-fit:cover; box-shadow:0 30px 60px rgba(0,0,0,0.15); }
        .hx-story-img-back { width:75%; height:85%; top:0; right:0; }
        .hx-story-img-front { width:60%; height:70%; bottom:0; left:0; border:4px solid #fff; }
        .hx-story-badge-float {
          position:absolute; top:20px; left:0;
          background:#0a0a0a; color:#fff;
          padding:20px 24px; border-radius:16px;
          box-shadow:0 20px 40px rgba(0,0,0,0.25);
        }
        .hx-sbf-num { font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:700; color:#c8a96e; display:block; line-height:1; }
        .hx-sbf-label { font-size:10px; font-weight:700; letter-spacing:1.5px; color:rgba(255,255,255,0.6); margin-top:4px; display:block; }

        /* ── LOOKBOOK ── */
        .hx-lookbook { background:#0a0a0a; padding:100px 0; }
        .hx-lookbook .hx-section-title { color:#fff; }
        .hx-lookbook .hx-section-sub { color:rgba(255,255,255,0.45); }
        .hx-lookbook-grid {
          display:grid;
          grid-template-columns:repeat(3, 1fr);
          grid-auto-rows:260px;
          gap:16px;
        }
        .hx-lb-item {
          position:relative; overflow:hidden;
          border-radius:16px; cursor:pointer;
          background:#1a1a1a;
        }
        .hx-lb-tall { grid-row:span 2; }
        .hx-lb-img { width:100%; height:100%; object-fit:cover; transition:transform 0.7s cubic-bezier(0.16,1,0.3,1); display:block; }
        .hx-lb-item:hover .hx-lb-img { transform:scale(1.08); }
        .hx-lb-overlay { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%); }
        .hx-lb-info { position:absolute; bottom:0; left:0; right:0; padding:24px; }
        .hx-lb-tag { display:block; font-size:9px; font-weight:800; letter-spacing:3px; color:#c8a96e; margin-bottom:6px; }
        .hx-lb-label { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:600; color:#fff; line-height:1.2; }

        /* === RESPONSIVE LOOKBOOK === */
        @media (max-width: 900px) {
          .hx-lookbook-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: 180px;
          }
        }
        @media (max-width: 600px) {
          .hx-lookbook { padding: 40px 0 24px 0; }
          .hx-lookbook-grid {
            grid-template-columns: 1fr;
            grid-auto-rows: 180px;
            gap: 10px;
          }
          .hx-lb-item {
            border-radius: 10px;
            min-width: 0;
            max-width: 100%;
            margin: 0 auto;
          }
          .hx-lb-info { padding: 12px; }
          .hx-lb-label { font-size: 15px; }
          .hx-lb-tag { font-size: 8px; }
        }
        @media (max-width: 400px) {
          .hx-lookbook-grid { grid-auto-rows: 120px; }
          .hx-lb-label { font-size: 11px; }
        }

        /* ── TESTIMONIALS ── */
        .hx-testimonials { background:#fff; padding:100px 0; position:relative; overflow:hidden; }
        .hx-test-bg-text {
          position:absolute; top:50%; right:-60px;
          transform:translateY(-50%);
          font-family:'Cormorant Garamond',serif;
          font-size:240px; font-weight:700;
          color:rgba(200,169,110,0.05);
          letter-spacing:-10px; user-select:none; pointer-events:none;
        }
        .hx-test-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }
        .hx-test-card {
          padding:32px; border-radius:20px;
          border:1.5px solid #f0ede8;
          background:#fff;
          transition:all 0.4s cubic-bezier(0.16,1,0.3,1);
          cursor:pointer; position:relative;
        }
        .hx-test-card:hover, .hx-test-active {
          border-color:#c8a96e;
          box-shadow:0 20px 50px rgba(200,169,110,0.15);
          transform:translateY(-6px);
        }
        .hx-test-stars { color:#c8a96e; font-size:18px; letter-spacing:2px; margin-bottom:16px; }
        .hx-test-text { font-size:14px; color:#555; line-height:1.75; margin-bottom:24px; font-style:italic; }
        .hx-test-author { display:flex; align-items:center; gap:12px; }
        .hx-test-avatar {
          width:44px; height:44px; border-radius:50%;
          background:linear-gradient(135deg, #c8a96e, #a07848);
          display:flex; align-items:center; justify-content:center;
          font-size:18px; font-weight:800; color:#fff;
          flex-shrink:0;
        }
        .hx-test-name { font-size:13px; font-weight:800; color:#0a0a0a; }
        .hx-test-city { font-size:11px; color:#aaa; font-weight:500; margin-top:2px; }

        /* === RESPONSIVE TESTIMONIALS === */
        @media (max-width: 900px) {
          .hx-test-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; }
        }
        @media (max-width: 600px) {
          .hx-testimonials { padding: 48px 0 32px 0; }
          .hx-test-bg-text { font-size: 80px; right: -10px; top: 10%; }
          .hx-test-grid { grid-template-columns: 1fr; gap: 16px; }
          .hx-test-card {
            padding: 18px 12px;
            border-radius: 14px;
            font-size: 15px;
            min-width: 0;
            max-width: 100%;
            margin: 0 auto;
          }
          .hx-test-stars { font-size: 15px; margin-bottom: 10px; }
          .hx-test-text { font-size: 13px; margin-bottom: 16px; }
          .hx-test-author { gap: 8px; }
          .hx-test-avatar { width: 36px; height: 36px; font-size: 15px; }
          .hx-test-name { font-size: 12px; }
          .hx-test-city { font-size: 10px; }
        }
        @media (max-width: 400px) {
          .hx-test-card { padding: 12px 4px; }
          .hx-test-bg-text { font-size: 48px; right: 0; top: 5%; }
        }

        /* ── NEWSLETTER ── */
        .hx-newsletter {
          background:linear-gradient(135deg, #0a0a0a 0%, #1c1310 100%);
          padding:100px 0; text-align:center;
          position:relative; overflow:hidden;
        }
        .hx-nl-noise {
          position:absolute; inset:0;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:0.4;
        }
        .hx-nl-inner { position:relative; z-index:1; }
        .hx-nl-title {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(3rem, 5vw, 5rem);
          font-weight:700; color:#fff;
          letter-spacing:-1px; margin-bottom:16px;
        }
        .hx-nl-sub { font-size:16px; color:rgba(255,255,255,0.5); margin-bottom:40px; line-height:1.7; }
        .hx-nl-form { display:flex; gap:0; max-width:500px; margin:0 auto 20px; border-radius:6px; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.4); }
        .hx-nl-input {
          flex:1; padding:18px 24px;
          background:rgba(255,255,255,0.08);
          border:1.5px solid rgba(255,255,255,0.12);
          border-right:none; border-radius:6px 0 0 6px;
          color:#fff; font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none;
        }
        .hx-nl-input::placeholder { color:rgba(255,255,255,0.35); }
        .hx-nl-input:focus { border-color:rgba(200,169,110,0.5); background:rgba(255,255,255,0.12); }
        .hx-nl-btn {
          padding:18px 32px;
          background:linear-gradient(135deg,#c8a96e,#a07848);
          color:#fff; border:none;
          font-size:12px; font-weight:800; letter-spacing:2px;
          cursor:pointer; border-radius:0 6px 6px 0;
          transition:all 0.3s; white-space:nowrap;
        }
        .hx-nl-btn:hover { background:linear-gradient(135deg,#d4b87e,#b08858); }
        .hx-nl-note { font-size:12px; color:rgba(255,255,255,0.3); }

        /* === RESPONSIVE NEWSLETTER === */
        @media (max-width: 600px) {
          .hx-newsletter { padding: 40px 0 24px 0; }
          .hx-nl-title { font-size: 1.7rem !important; margin-bottom: 10px; }
          .hx-nl-sub { font-size: 13px; margin-bottom: 18px; }
          .hx-nl-form {
            flex-direction: column;
            gap: 8px;
            max-width: 100%;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            border-radius: 8px;
            padding: 0 4px;
          }
          .hx-nl-input {
            padding: 12px 10px;
            font-size: 13px;
            border-radius: 6px 6px 0 0;
            border-right: 1.5px solid rgba(255,255,255,0.12);
          }
          .hx-nl-btn {
            width: 100%;
            border-radius: 0 0 6px 6px;
            padding: 12px 0;
            font-size: 13px;
            margin-top: 4px;
          }
          .hx-nl-note { font-size: 10px; }
        }
        @media (max-width: 400px) {
          .hx-nl-title { font-size: 1.1rem !important; }
          .hx-nl-form { padding: 0 1px; }
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width:1200px) {
          .hx-product-grid { grid-template-columns:repeat(3,1fr); }
          .hx-test-grid { grid-template-columns:repeat(2,1fr); }
          .hx-loading-state { grid-template-columns:repeat(3,1fr); }
          .hx-brands-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
        }
        @media (max-width:900px) {
          .hx-brands-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .hx-brands { padding: 60px 0; }
        }
        @media (max-width:992px) {
          .hx-container { padding:0 24px; }
          .hx-hero {
            height: auto;
            min-height: 110vh;
            padding: 40px 0 80px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .hx-hero-inner {
            flex-direction: column;
            padding: 0 2vw;
            gap: 32px;
            width: 100vw;
            min-height: 90vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .hx-hero-text {
            text-align: center;
            z-index: 2;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .hx-hero-title { justify-content: center; }
          .hx-hero-desc { margin: 0 auto 32px; text-align: center; }
          .hx-hero-cta {
            justify-content: center;
            gap: 14px;
            flex-wrap: wrap;
            margin-top: 14px;
          }
          .hx-hero-img-wrap {
            width: 100vw;
            max-width: 100vw;
            min-height: 48vh;
            height: 48vh;
            justify-content: center;
            align-items: center;
            display: flex;
          }
          .hx-hero-img {
            width: 100vw;
            max-width: 100vw;
            height: 48vh;
            max-height: 60vh;
            object-fit: contain;
            background: transparent;
            display: block;
            margin: 0 auto;
          }
          .hx-hero-nav {
            bottom: 18px;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            max-width: 340px;
            min-width: 180px;
            justify-content: center;
          }
             .hx-float-tag-1 {
          left: 5%;
          top: 20%;
          transform: translate(-120%, -50%);
          animation: hxTagFloat1 5s ease-in-out infinite;
        }
        .hx-float-tag-2 {
          right: 8%;
          top: 60%;
          transform: translate(120%, -50%);
          animation: hxTagFloat2 6s ease-in-out infinite;
        }
        }
        @media (max-width:575px) {
          .hx-hero {
            min-height: 95vh;
            height: auto;
            padding: 30px 0 80px;
          }
          .hx-hero-inner {
            flex-direction: column;
            padding: 20px 2px 0 2px;
            gap: 22px;
          }
          .hx-hero-title { font-size: 1.45rem !important; }
          .hx-hero-text {
            text-align: center;
            z-index: 2;
          }
          .hx-hero-img-wrap {
            width: 100vw;
            max-width: 100vw;
            min-height: 60vh;
            height: 60vh;
            justify-content: center;
            align-items: flex-end;
            display: flex;
          }
          .hx-hero-img {
            width: 100vw;
            max-width: 100vw;
            height: 60vh;
            max-height: 70vh;
            object-fit: contain;
            background: transparent;
            display: block;
            margin: 0 auto;
          }
          .hx-hero-cta {
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
          }
          .hx-hero-nav {
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            max-width: 340px;
            min-width: 180px;
            justify-content: center;
          }
          .hx-brands-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .hx-brand-name { font-size: 15px; letter-spacing: 0.5px; margin-bottom: 8px; }
          .hx-brand-content { padding: 15px 8px; transform: translateY(0); }
          .hx-brand-link { opacity: 1; font-size: 9px; }
          .hx-brand-divider { width: 30px; margin-bottom: 10px; }
        }
        @media (max-width: 375px) {
          .hx-hero-title { font-size: 1.1rem !important; }
          .hx-hero-img { max-height: 18vh; }
          .hx-brand-name { font-size: 13px; }
          .hx-brand-link { font-size: 8px; }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .hx-hero-img, .hx-ticker-track, .hx-float-tag-1, .hx-float-tag-2,
          .hx-hero-img-glow, .hx-orb-1, .hx-orb-2, .hx-badge-dot,
          .hx-pcard, .hx-ed-img, .hx-lb-img { animation:none !important; transition:none !important; }
        }
        @media (hover: none) and (pointer: coarse) {
          .hx-wish-btn { opacity:1; }
          .hx-pcard:hover { transform:none; box-shadow:0 6px 20px rgba(0,0,0,0.08); }
        }
      `}} />
    </div>
  );
}