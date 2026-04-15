import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from "../Store/ActionCreaters/ProductActionCreators"
import { getCart, addCart } from "../Store/ActionCreaters/CartActionCreators"
import { getWishlist, addWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { optimizeCloudinaryUrl } from '../utils/cloudinaryHelper';
import { useMembership } from './MembershipContext'

// ─── Inline Styles ─────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --gold: #C9A84C;
    --gold-light: #E8C97A;
    --teal: #1A8C8C;
    --teal-dark: #0f6b6b;
    --dark: #0D0D0D;
    --charcoal: #1A1A1A;
    --card-bg: #F7F5F0;
    --text-primary: #1A1A1A;
    --text-secondary: #6B6660;
    --border: #E2DDD8;
    --white: #FFFFFF;
  }

  .spg-wrapper {
    font-family: 'DM Sans', sans-serif;
    background: var(--card-bg);
    min-height: 100vh;
    padding: 40px 0 80px;
    color: var(--text-primary);
    overflow-x: hidden;
  }

  .spg-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Breadcrumb */
  .spg-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .spg-breadcrumb a {
    color: var(--teal);
    text-decoration: none;
    transition: color 0.2s;
  }
  .spg-breadcrumb a:hover { color: var(--gold); }
  .spg-breadcrumb-sep { color: var(--border); }

  /* Main Grid */
  .spg-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .spg-grid { grid-template-columns: 1fr; gap: 40px; }
  }

  /* ── LEFT: Gallery ── */
  .spg-gallery {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: static;
  }
  @media (min-width: 901px) {
    .spg-gallery {
      position: sticky;
      top: 24px;
    }
  }

  .spg-main-img-wrap {
    position: relative;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    aspect-ratio: 3/4;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .spg-main-img-wrap::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(201,168,76,0.04) 0%, transparent 60%);
    pointer-events: none;
    z-index: 1;
  }

  .spg-main-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    padding: 24px;
  }
  @media (hover: hover) and (pointer: fine) {
    .spg-main-img-wrap:hover .spg-main-img { transform: scale(1.04); }
  }

  /* Discount Badge on Image */
  .spg-img-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    background: var(--teal);
    color: var(--white);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    padding: 5px 12px;
    border-radius: 2px;
    z-index: 2;
  }

  /* Thumbnails */
  .spg-thumbs {
    display: flex;
    gap: 10px;
    width: 100%;
  }
  .spg-thumb {
    flex: 1;
    min-width: 0;
    aspect-ratio: 1;
    border: 1.5px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    background: var(--white);
    transition: border-color 0.2s, transform 0.2s;
  }
  .spg-thumb:hover { border-color: var(--teal); transform: translateY(-2px); }
  .spg-thumb.active { border-color: var(--gold); border-width: 2px; }
  .spg-thumb img { width: 100%; height: 100%; object-fit: cover; }

  /* ── RIGHT: Details ── */
  .spg-details {
    padding-top: 8px;
    min-width: 0;
  }

  .spg-tag-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .spg-tag {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 2px;
    font-weight: 500;
  }
  .spg-tag-teal { background: rgba(26,140,140,0.12); color: var(--teal-dark); }
  .spg-tag-gold { background: rgba(201,168,76,0.12); color: #9A7A20; }
  .spg-tag-stock-in { background: rgba(34,197,94,0.1); color: #15803d; }
  .spg-tag-stock-out { background: rgba(239,68,68,0.1); color: #b91c1c; }

  .spg-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(32px, 4vw, 52px);
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: var(--dark);
    margin-bottom: 6px;
    text-transform: capitalize;
    word-break: break-word;
  }

  .spg-brand {
    font-size: 13px;
    color: var(--text-secondary);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  .spg-brand strong { color: var(--teal); }

  /* Rating */
  .spg-rating-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
  }
  .spg-stars { color: var(--gold); font-size: 17px; letter-spacing: 2px; }
  .spg-rating-num {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--dark);
  }
  .spg-review-count { font-size: 12px; color: var(--text-secondary); }

  /* Price */
  .spg-price-block { margin-bottom: 28px; }
  .spg-final-price {
    font-family: 'Cormorant Garamond', serif;
    font-size: 42px;
    font-weight: 600;
    color: var(--dark);
    line-height: 1;
  }
  .spg-original-price {
    font-size: 18px;
    color: var(--text-secondary);
    text-decoration: line-through;
    margin-left: 12px;
  }
  .spg-saving {
    display: inline-block;
    margin-top: 6px;
    font-size: 12px;
    color: #15803d;
    background: rgba(34,197,94,0.1);
    padding: 3px 10px;
    border-radius: 2px;
    letter-spacing: 0.05em;
  }

  /* Description */
  .spg-section-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 8px;
    font-weight: 500;
  }
  .spg-desc {
    font-size: 14px;
    line-height: 1.75;
    color: var(--text-secondary);
    margin-bottom: 28px;
    word-break: break-word;
  }

  /* Attributes */
  .spg-attrs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 32px;
  }
  .spg-attr-box {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 14px 16px;
  }
  .spg-attr-label {
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  .spg-attr-value {
    font-size: 15px;
    font-weight: 500;
    color: var(--dark);
    text-transform: capitalize;
  }

  /* Quantity */
  .spg-qty-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 32px;
  }
  .spg-qty-label {
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .spg-qty-ctrl {
    display: flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
    background: var(--white);
  }
  .spg-qty-btn {
    width: 40px;
    height: 42px;
    border: none;
    background: transparent;
    font-size: 18px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .spg-qty-btn:hover { background: var(--teal); color: var(--white); }
  .spg-qty-input {
    width: 52px;
    text-align: center;
    border: none;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    background: transparent;
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--dark);
    outline: none;
    padding: 0;
    height: 42px;
  }

  /* Divider */
  .spg-divider { border: none; border-top: 1px solid var(--border); margin: 28px 0; }

  /* CTA Buttons */
  .spg-cta-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    margin-bottom: 28px;
  }
  @media (max-width: 480px) { .spg-cta-row { grid-template-columns: 1fr; } }

  .spg-btn-cart {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--teal);
    color: var(--white);
    border: none;
    border-radius: 3px;
    padding: 16px 32px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.25s, transform 0.15s, box-shadow 0.25s;
    position: relative;
    overflow: hidden;
  }
  .spg-btn-cart::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    pointer-events: none;
  }
  .spg-btn-cart:hover {
    background: var(--teal-dark);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(26,140,140,0.3);
  }
  .spg-btn-cart:active { transform: translateY(0); }

  .spg-btn-wish {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--white);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 16px 20px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s;
    white-space: nowrap;
  }
  .spg-btn-wish:hover {
    border-color: #e11d48;
    color: #e11d48;
    background: rgba(225,29,72,0.04);
    transform: translateY(-1px);
  }

  /* Trust Badges */
  .spg-trust {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 28px;
  }
  .spg-trust-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 8px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 4px;
    text-align: center;
  }
  .spg-trust-icon { font-size: 20px; }
  .spg-trust-text {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* Gold accent line */
  .spg-gold-line {
    width: 48px;
    height: 2px;
    background: linear-gradient(90deg, var(--gold), var(--gold-light));
    margin-bottom: 20px;
    border-radius: 1px;
  }

  /* Zoom indicator */
  .spg-zoom-hint {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(255,255,255,0.9);
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 5px 10px;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-secondary);
    z-index: 2;
    backdrop-filter: blur(4px);
    pointer-events: none;
  }

  /* Pincode checker */
  .spg-delivery-check {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .spg-delivery-title {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .spg-delivery-row { display: flex; gap: 8px; }
  .spg-pincode-input {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 10px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: var(--dark);
    outline: none;
    transition: border-color 0.2s;
    background: var(--card-bg);
  }
  .spg-pincode-input:focus { border-color: var(--teal); }
  .spg-pincode-btn {
    background: var(--dark);
    color: var(--white);
    border: none;
    border-radius: 3px;
    padding: 10px 18px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.2s;
  }
  .spg-pincode-btn:hover { background: var(--teal); }
  .spg-delivery-result { font-size: 12px; color: #15803d; }

  @media (max-width: 1200px) {
    .spg-container { max-width: 1080px; }
    .spg-grid { gap: 44px; }
  }

  @media (max-width: 900px) {
    .spg-wrapper { padding: 24px 0 56px; }
    .spg-container { padding: 0 18px; }
    .spg-breadcrumb {
      margin-bottom: 20px;
      flex-wrap: wrap;
      row-gap: 6px;
    }
    .spg-main-img-wrap {
      aspect-ratio: 4/5;
      max-height: min(76vh, 640px);
    }
    .spg-main-img { padding: 18px; }
    .spg-zoom-hint { display: none; }
    .spg-name { font-size: clamp(28px, 7vw, 42px); }
    .spg-final-price { font-size: clamp(34px, 7vw, 40px); }
    .spg-attrs { grid-template-columns: 1fr 1fr; }
    .spg-trust { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  @media (max-width: 767px) {
    .spg-container { padding: 0 14px; }
    .spg-grid { gap: 28px; }
    .spg-main-img-wrap {
      aspect-ratio: 1/1;
      max-height: none;
    }
    .spg-main-img { padding: 14px; }
    .spg-thumbs {
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }
    .spg-thumb {
      flex: 0 0 72px;
      min-width: 72px;
    }
    .spg-rating-row { gap: 8px; }
    .spg-review-count { width: 100%; }
    .spg-attrs { grid-template-columns: 1fr; }
    .spg-qty-row { gap: 10px; }
    .spg-qty-label { width: 100%; }
    .spg-cta-row { grid-template-columns: 1fr; }
    .spg-btn-wish { width: 100%; }
    .spg-delivery-row {
      flex-direction: column;
      gap: 10px;
    }
    .spg-pincode-btn {
      width: 100%;
      padding: 12px 16px;
    }
    .spg-trust { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  @media (max-width: 480px) {
    .spg-wrapper { padding: 16px 0 40px; }
    .spg-container { padding: 0 12px; }
    .spg-breadcrumb { font-size: 11px; }
    .spg-main-img-wrap { border-radius: 3px; }
    .spg-img-badge {
      top: 10px;
      left: 10px;
      font-size: 10px;
      padding: 4px 8px;
    }
    .spg-tag-row { gap: 8px; }
    .spg-tag { font-size: 10px; }
    .spg-name { font-size: clamp(24px, 8vw, 34px); }
    .spg-brand { margin-bottom: 14px; }
    .spg-price-block { margin-bottom: 22px; }
    .spg-final-price { font-size: 34px; }
    .spg-original-price {
      display: inline-block;
      margin-left: 8px;
      font-size: 16px;
    }
    .spg-btn-cart,
    .spg-btn-wish {
      padding: 14px 16px;
      font-size: 11px;
      letter-spacing: 0.1em;
    }
    .spg-trust { grid-template-columns: 1fr; }
  }

  @media (max-width: 360px) {
    .spg-container { padding: 0 10px; }
    .spg-main-img { padding: 10px; }
    .spg-thumb {
      flex-basis: 64px;
      min-width: 64px;
    }
    .spg-final-price { font-size: 30px; }
  }
`;

// ─── Component ─────────────────────────────────────────────────────────────────
export default function SingleProductPage() {
    let [p, setp] = useState({ pic1: "", pic2: "", pic3: "", pic4: "" })
    let [qty, setqty] = useState(1)
    let [mainImage, setMainImage] = useState("")
    let [pincode, setPincode] = useState("")
    let [deliveryMsg, setDeliveryMsg] = useState("")

    let { id } = useParams()
    let dispatch = useDispatch()
    let navigate = useNavigate()
    let location = useLocation()

    let product = useSelector((state) => state.ProductStateData)
    let cartState = useSelector((state) => state.CartStateData)
    const cartItems = cartState && Array.isArray(cartState.items) ? cartState.items : []
    let wishlist = useSelector((state) => state.WishlistStateData)
    const { membershipType } = useMembership()

    function getAPIData() {
        dispatch(getProduct())
        dispatch(getCart())
        dispatch(getWishlist())
        let data = product.find((item) => item.id === id)
        if (data) {
            setp(data)
            setMainImage(data.pic1)
        }
    }

    function addToCart() {
      if (!localStorage.getItem("login")) {
        navigate("/login", { state: { from: location.pathname } })
      } else {
        const userId = localStorage.getItem("userid")
        const productId = p.id || p._id || id
        const size = selectedSize || p.size || "";
        const color = selectedColor || p.color || "";
        if (!size || !color) {
          alert("Please select both size and color before adding to cart.");
          return;
        }
        const eliteDiscountedPrice = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0)
        let d = cartItems.find((item) =>
          String(item.productid) === String(productId) &&
          String(item.userid) === String(userId) &&
          String(item.size || "") === String(size) &&
          String(item.color || "") === String(color)
        );
        if (d) {
          dispatch(getCart());
          navigate("/cart");
        } else {
          let item = {
            userId,
            productId,
            quantity: Number(qty),
            price: eliteDiscountedPrice,
            size,
            color
          }
          console.log("Add to Cart Payload:", item); // Debug log
          dispatch(addCart(item))
          navigate("/cart")
        }
      }
    }

    function addToWishlist() {
        if (!localStorage.getItem("login")) {
            navigate("/login", { state: { from: location.pathname } })
        } else {
            let d = wishlist.find((item) => item.productid === id && item.userid === localStorage.getItem("userid"))
            if (d) {
                navigate("/wishlist")
            } else {
                let item = {
                    productid: p.id,
                    userid: localStorage.getItem("userid"),
                    name: p.name,
                    color: p.color,
                    size: p.size,
                    price: Number(p.finalprice),
                    pic: p.pic1,
                }
                dispatch(addWishlist(item))
                navigate("/wishlist")
            }
        }
    }

    function checkDelivery() {
        if (pincode.length === 6 && /^\d+$/.test(pincode)) {
            setDeliveryMsg(`✓ Delivery available to ${pincode} — arrives in 3–5 business days`)
        } else {
            setDeliveryMsg("Please enter a valid 6-digit pincode.")
        }
    }

    useEffect(() => {
        getAPIData()
    }, [product.length, id])

    const savings = p.baseprice > p.finalprice ? (p.baseprice - p.finalprice) : 0
    const eliteDiscountedPrice = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0)
    const eliteSavings = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.1) : 0
    const thumbs = [p.pic1, p.pic2, p.pic3, p.pic4].filter(Boolean)

    return (
        <>
            {/* Inject styles */}
            <style>{styles}</style>

            <div className="spg-wrapper">
                <div className="spg-container">

                    {/* Breadcrumb */}
                    <nav className="spg-breadcrumb">
                        <a href="/">Home</a>
                        <span className="spg-breadcrumb-sep">›</span>
                        <a href="/shop">Shop</a>
                        <span className="spg-breadcrumb-sep">›</span>
                        <span style={{ textTransform: 'capitalize' }}>{p.maincategory || 'Product'}</span>
                        <span className="spg-breadcrumb-sep">›</span>
                        <span style={{ color: 'var(--dark)', fontWeight: 500, textTransform: 'capitalize' }}>{p.name}</span>
                    </nav>

                    <div className="spg-grid">

                        {/* ── LEFT: GALLERY ── */}
                        <div className="spg-gallery">
                            <div className="spg-main-img-wrap">
                                {p.discount > 0 && (
                                    <span className="spg-img-badge">{p.discount}% OFF</span>
                                )}
                                <img
                                    src={optimizeCloudinaryUrl(mainImage || p.pic1)}
                                    className="spg-main-img"
                                    alt={p.name}
                                />
                                <div className="spg-zoom-hint">Hover to zoom</div>
                            </div>

                            {thumbs.length > 1 && (
                                <div className="spg-thumbs">
                                    {thumbs.map((img, index) => (
                                        <div
                                            key={index}
                                            className={`spg-thumb ${mainImage === img ? 'active' : ''}`}
                                            onClick={() => setMainImage(img)}
                                        >
                                            <img src={optimizeCloudinaryUrl(img)} alt={`View ${index + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT: DETAILS ── */}
                        <div className="spg-details">

                            {/* Tags row */}
                            <div className="spg-tag-row">
                                {p.maincategory && (
                                    <span className="spg-tag spg-tag-teal">{p.maincategory}</span>
                                )}
                                {p.discount > 0 && (
                                    <span className="spg-tag spg-tag-gold">{p.discount}% Off</span>
                                )}
                                <span className={`spg-tag ${p.stock === 'In Stock' ? 'spg-tag-stock-in' : 'spg-tag-stock-out'}`}>
                                    {p.stock || 'In Stock'}
                                </span>
                            </div>

                            {/* Gold accent */}
                            <div className="spg-gold-line"></div>

                            {/* Name */}
                            <h1 className="spg-name">{p.name}</h1>
                            <div className="spg-brand">
                                By <strong>{p.brand || 'EShopper'}</strong>
                            </div>

                            {membershipType === 'Elite' && (
                              <div className="spg-tag-row">
                                <span className="spg-tag spg-tag-gold">Elite Auto Discount 10%</span>
                              </div>
                            )}

                            {/* Rating */}
                            <div className="spg-rating-row">
                                <div className="spg-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star}>
                                            {star <= Math.floor(p.rating || 4.5) ? '★' :
                                             star === Math.ceil(p.rating || 4.5) && (p.rating || 4.5) % 1 !== 0 ? '★' : '☆'}
                                        </span>
                                    ))}
                                </div>
                                <span className="spg-rating-num">{(p.rating || 4.5).toFixed(1)}</span>
                                <span className="spg-review-count">({p.reviews || 0} verified reviews)</span>
                            </div>

                            {/* Price */}
                            <div className="spg-price-block">
                                <div>
                                    <span className="spg-final-price">₹{eliteDiscountedPrice}</span>
                                  {(p.baseprice > p.finalprice || membershipType === 'Elite') && (
                                        <span className="spg-original-price">₹{p.baseprice}</span>
                                    )}
                                </div>
                                {(savings > 0 || membershipType === 'Elite') && (
                                  <span className="spg-saving">You save ₹{membershipType === 'Elite' ? eliteSavings : savings}</span>
                                )}
                            </div>

                            <hr className="spg-divider" />

                            {/* Description */}
                            <div className="spg-section-label">Product Details</div>
                            <p className="spg-desc">{p.description}</p>

                            {/* Attributes */}
                            <div className="spg-attrs">
                                {p.color && (
                                    <div className="spg-attr-box">
                                        <div className="spg-attr-label">Colour</div>
                                        <div className="spg-attr-value">{p.color}</div>
                                    </div>
                                )}
                                {p.size && (
                                    <div className="spg-attr-box">
                                        <div className="spg-attr-label">Size</div>
                                        <div className="spg-attr-value">{p.size}</div>
                                    </div>
                                )}
                            </div>

                            <hr className="spg-divider" />

                            {/* Quantity */}
                            <div className="spg-qty-row">
                                <span className="spg-qty-label">Quantity</span>
                                <div className="spg-qty-ctrl">
                                    <button className="spg-qty-btn" onClick={() => qty > 1 && setqty(qty - 1)}>−</button>
                                    <input className="spg-qty-input" type="text" value={qty} readOnly />
                                    <button className="spg-qty-btn" onClick={() => setqty(qty + 1)}>+</button>
                                </div>
                            </div>

                            {/* CTA Buttons */}
                            <div className="spg-cta-row">
                                <button className="spg-btn-cart" onClick={addToCart}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                                    </svg>
                                    Add to Cart
                                </button>
                                <button className="spg-btn-wish" onClick={addToWishlist}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                                    </svg>
                                    Wishlist
                                </button>
                            </div>

                            {/* Delivery Check */}
                            <div className="spg-delivery-check">
                                <div className="spg-delivery-title">📦 Check Delivery Availability</div>
                                <div className="spg-delivery-row">
                                    <input
                                        className="spg-pincode-input"
                                        type="text"
                                        placeholder="Enter 6-digit pincode"
                                        maxLength={6}
                                        value={pincode}
                                        onChange={(e) => { setPincode(e.target.value); setDeliveryMsg("") }}
                                    />
                                    <button className="spg-pincode-btn" onClick={checkDelivery}>Check</button>
                                </div>
                                {deliveryMsg && <div className="spg-delivery-result">{deliveryMsg}</div>}
                            </div>

                            {/* Trust Badges */}
                            <div className="spg-trust">
                                <div className="spg-trust-item">
                                    <div className="spg-trust-icon">🔄</div>
                                    <div className="spg-trust-text">Easy 30-Day Returns</div>
                                </div>
                                <div className="spg-trust-item">
                                    <div className="spg-trust-icon">🛡️</div>
                                    <div className="spg-trust-text">Secure Payments</div>
                                </div>
                                <div className="spg-trust-item">
                                    <div className="spg-trust-icon">✨</div>
                                    <div className="spg-trust-text">Authenticity Guaranteed</div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}