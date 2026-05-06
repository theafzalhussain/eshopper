import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { getWishlist, deleteWishlist } from '../Store/ActionCreaters/WishlistActionCreators'
import { addCart } from '../Store/ActionCreaters/CartActionCreators'
import { Link } from 'react-router-dom'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper'
import axios from 'axios'
import { BASE_URL } from '../constants'
import Spinner from './Spinner'
import { useToast } from './ToastNotification'
import { motion } from 'framer-motion'
import {
    Heart,
    ShoppingCart,
    Trash2,
    Search,
    SlidersHorizontal,
    Share2,
    Sparkles,
    BadgePercent,
    PackageCheck,
    LayoutGrid,
    ArrowUpDown,
    Star,
    ArrowRight,
    ShieldCheck,
    Layers3,
    Crown,
} from 'lucide-react'

export default function Wishlist() {
    const [wishlist, setWishlist] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [removingIds, setRemovingIds] = useState([])
    const [movingIds, setMovingIds] = useState([])
    const [query, setQuery] = useState('')
    const [sortMode, setSortMode] = useState('recent')
    const dispatch = useDispatch()
    const toast = useToast()
    const userId = localStorage.getItem('userid')

    axios.defaults.baseURL = BASE_URL

    const totalWishlistValue = useMemo(() => {
        return wishlist.reduce((acc, item) => acc + Number(item.price || 0), 0)
    }, [wishlist])

    const averageWishlistValue = useMemo(() => {
        if (!wishlist.length) return 0
        return Math.round(totalWishlistValue / wishlist.length)
    }, [wishlist, totalWishlistValue])

    const premiumStats = useMemo(() => ([
        {
            label: 'Saved Pieces',
            value: wishlist.length,
            icon: Heart,
            tone: 'gold',
            note: 'curated items in your list',
        },
        {
            label: 'Wishlist Value',
            value: `₹${totalWishlistValue.toLocaleString('en-IN')}`,
            icon: BadgePercent,
            tone: 'teal',
            note: 'estimated total savings target',
        },
        {
            label: 'Average Price',
            value: `₹${averageWishlistValue.toLocaleString('en-IN')}`,
            icon: Star,
            tone: 'dark',
            note: 'premium price signal',
        },
    ]), [wishlist.length, totalWishlistValue, averageWishlistValue])

    const sortedWishlist = useMemo(() => {
        const items = [...wishlist]

        switch (sortMode) {
            case 'price-low':
                return items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
            case 'price-high':
                return items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
            case 'name':
                return items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
            default:
                return items.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
        }
    }, [wishlist, sortMode])

    const visibleWishlist = useMemo(() => {
        const term = query.trim().toLowerCase()
        if (!term) return sortedWishlist

        return sortedWishlist.filter((item) => {
            const searchable = [item.name, item.color, item.size, item.brand, item.category]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            return searchable.includes(term)
        })
    }, [sortedWishlist, query])

    async function fetchWishlist() {
        if (!userId) {
            setWishlist([])
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            // Always fetch wishlist for the current user
            const res = await axios.get('/wishlist', { params: { user: userId } })
            setWishlist(Array.isArray(res.data) ? res.data : [])
            dispatch(getWishlist())
        } catch (e) {
            setWishlist([])
            setLoading(false)
        }
        setLoading(false)
    }

    async function removeFromWishlist(itemId) {
        setRemovingIds((prev) => [...prev, itemId])
        setActionLoading(true)
        try {
            dispatch(deleteWishlist({ id: itemId }))
            setWishlist((prev) => prev.filter((item) => (item.id || item._id) !== itemId))
            toast.success('Item removed from wishlist.')
        } catch (e) {
            toast.error('Failed to remove item.')
        } finally {
            setRemovingIds((prev) => prev.filter((id) => id !== itemId))
            setActionLoading(false)
        }
    }

    async function moveToCart(item) {
        const itemId = item.id || item._id
        const rawProduct = item.productid || item.product || itemId
        const productId = (rawProduct && (rawProduct._id || rawProduct.id)) ? (rawProduct._id || rawProduct.id) : rawProduct
        setMovingIds((prev) => [...prev, itemId])
        setActionLoading(true)
        try {
            dispatch(addCart({
                userId,
                productId,
                quantity: item.quantity || item.qty || 1,
                size: item.size || "",
                color: item.color || "",
                name: item.name,
                price: item.price,
                pic: item.pic || item.pic1,
            }))
            dispatch(deleteWishlist({ id: itemId }))
            setWishlist((prev) => prev.filter(x => (x.id || x._id) !== itemId))
            toast.success('Moved to cart successfully.')
        } catch (e) {
            toast.error('Failed to move item to cart.')
        } finally {
            setMovingIds((prev) => prev.filter((id) => id !== itemId))
            setActionLoading(false)
        }
    }

    async function moveAllToCart() {
        if (!visibleWishlist.length) return

        setActionLoading(true)
        try {
            for (const item of visibleWishlist) {
                    const itemId = item.id || item._id
                    const rawProduct = item.productid || item.product || itemId
                    const productId = (rawProduct && (rawProduct._id || rawProduct.id)) ? (rawProduct._id || rawProduct.id) : rawProduct
                dispatch(addCart({
                    userId,
                    productId,
                    quantity: item.quantity || item.qty || 1,
                    size: item.size || "",
                    color: item.color || "",
                    name: item.name,
                    price: item.price,
                    pic: item.pic || item.pic1,
                }))
                dispatch(deleteWishlist({ id: itemId }))
            }
            setWishlist(prev => prev.filter(x => !visibleWishlist.some(v => (v.id || v._id) === (x.id || x._id))))
            toast.success('All visible wishlist items moved to cart.')
        } catch (e) {
            toast.error('Failed to move all items to cart.')
        } finally {
            setActionLoading(false)
        }
    }

    function buildWishlistShareText() {
        const title = 'My Eshopper Wishlist'
        const lines = visibleWishlist.slice(0, 10).map((item, index) => `${index + 1}. ${item.name || 'Premium Product'} - ₹${Number(item.price || 0).toLocaleString('en-IN')}`)
        return `${title}\n\n${lines.join('\n') || 'No items yet.'}`
    }

    async function shareWishlist() {
        const text = buildWishlistShareText()
        try {
            if (navigator.share) {
                await navigator.share({ title: 'My Wishlist', text })
                toast.success('Wishlist shared successfully.')
                return
            }
            await navigator.clipboard.writeText(text)
            toast.success('Wishlist summary copied to clipboard.')
        } catch (error) {
            toast.error('Unable to share wishlist.')
        }
    }

    useEffect(() => {
        fetchWishlist()
    }, [])

    return (
        <section className="wishlist-premium-wrap" style={{ boxSizing: 'border-box', maxWidth: '100vw' }}>
            {(loading || actionLoading) && <Spinner />}

            <div className="container py-5 wishlist-shell">
                <motion.div
                    className="wishlist-hero mb-4"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="wishlist-hero-badge">
                        <Crown size={14} />
                        Luxury Wishlist Suite
                    </div>

                    <div className="wishlist-hero-grid">
                        <div>
                            <h2 className="mb-3">My Wishlist</h2>
                            <p className="mb-4">A premium curated shelf for products you love, with instant move-to-cart, share, and smart filtering.</p>
                            <div className="wishlist-hero-actions">
                                <button type="button" className="wishlist-hero-btn primary" onClick={moveAllToCart} disabled={!visibleWishlist.length || actionLoading}>
                                    <ShoppingCart size={15} />
                                    Move All to Cart
                                </button>
                                <button type="button" className="wishlist-hero-btn ghost" onClick={shareWishlist} disabled={!visibleWishlist.length}>
                                    <Share2 size={15} />
                                    Share Wishlist
                                </button>
                            </div>
                        </div>

                        <div className="wishlist-hero-card">
                            <div className="wishlist-hero-card-top">
                                <Sparkles size={16} />
                                Premium Overview
                            </div>
                            <div className="wishlist-hero-mini-grid">
                                {premiumStats.map((stat) => {
                                    const Icon = stat.icon
                                    return (
                                        <div key={stat.label} className={`wishlist-mini-stat ${stat.tone}`}>
                                            <Icon size={18} />
                                            <div>
                                                <span>{stat.label}</span>
                                                <strong>{stat.value}</strong>
                                                <small>{stat.note}</small>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    className="wishlist-control-bar mb-4"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.05 }}
                >
                    <div className="wishlist-search-wrap">
                        <Search size={16} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search saved products, colors, sizes..."
                        />
                    </div>

                    <div className="wishlist-control-actions">
                        <button type="button" className="wishlist-chip-btn" onClick={() => setSortMode('recent')}>
                            <LayoutGrid size={14} />
                            Recent
                        </button>
                        <button type="button" className="wishlist-chip-btn" onClick={() => setSortMode('name')}>
                            <ArrowUpDown size={14} />
                            Name
                        </button>
                        <button type="button" className="wishlist-chip-btn" onClick={() => setSortMode('price-low')}>
                            <SlidersHorizontal size={14} />
                            Low to High
                        </button>
                        <button type="button" className="wishlist-chip-btn" onClick={() => setSortMode('price-high')}>
                            <SlidersHorizontal size={14} />
                            High to Low
                        </button>
                    </div>
                </motion.div>

                {wishlist.length > 0 ? (
                    <>
                        <div className="wishlist-summary-bar mb-4">
                            <span>{visibleWishlist.length} visible item{visibleWishlist.length > 1 ? 's' : ''} of {wishlist.length}</span>
                            <strong>Total Value: ₹{totalWishlistValue.toLocaleString('en-IN')}</strong>
                        </div>

                        <div className="wishlist-grid">
                            {visibleWishlist.map((item, index) => {
                                const itemId = item.id || item._id
                                const removing = removingIds.includes(itemId)
                                const moving = movingIds.includes(itemId)
                                const rawProduct = item.productid || item.product || ''
                                const productId = (rawProduct && (rawProduct._id || rawProduct.id)) ? (rawProduct._id || rawProduct.id) : rawProduct
                                const price = Number(item.price || 0)

                                return (
                                    <motion.article
                                        key={itemId}
                                        className={`wishlist-card ${removing || moving ? 'is-loading' : ''}`}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
                                    >
                                        <button className="wishlist-remove-btn" onClick={() => removeFromWishlist(itemId)} title="Remove from wishlist">
                                            <Trash2 size={14} />
                                        </button>

                                        <div className="wishlist-card-topline">
                                            <span className="wishlist-meta-pill">Saved #{index + 1}</span>
                                            <span className="wishlist-meta-sub">ID: {itemId}</span>
                                        </div>

                                        <div className="wishlist-card-body">
                                            <div className="wishlist-img-wrap mr-3">
                                                <img
                                                    src={item.pic ? optimizeCloudinaryUrlAdvanced(item.pic, { maxWidth: 360, crop: 'fill' }) : '/assets/images/noimage.png'}
                                                    loading="lazy"
                                                    decoding="async"
                                                    alt={item.name || 'Product'}
                                                />
                                            </div>

                                            <div className="wishlist-copy">
                                                <div className="wishlist-copy-head">
                                                    <div>
                                                        <div className="wishlist-eyebrow">Saved Item</div>
                                                        <h5 className="wishlist-title mb-1">{item.name || 'Premium Product'}</h5>
                                                    </div>
                                                    <div className="wishlist-price">₹{price.toLocaleString('en-IN')}</div>
                                                </div>

                                                <p className="wishlist-sub mb-3">{item.color || 'Classic'} · Size: {item.size || 'Standard'} · {item.brand || 'Luxury Edit'}</p>

                                                <div className="wishlist-features">
                                                    <span><ShieldCheck size={12} /> Premium Quality</span>
                                                    <span><PackageCheck size={12} /> Fast Move to Cart</span>
                                                    <span><Layers3 size={12} /> Wishlist Ready</span>
                                                </div>

                                                <div className="wishlist-card-actions">
                                                    <button className="btn wishlist-cart-btn" onClick={() => moveToCart(item)} disabled={moving}>
                                                        {moving ? 'Moving...' : 'Move to Cart'}
                                                        <ArrowRight size={15} />
                                                    </button>
                                                    <Link to={`/single-product/${productId}`} className="btn wishlist-view-btn">
                                                        View Product
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.article>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div className="wishlist-empty text-center p-5">
                        <div className="wishlist-empty-icon"><Heart size={24} /></div>
                        <h4 className="mb-3">Your Wishlist is Empty</h4>
                        <p className="mb-4">Save products you love and access them quickly anytime. Use the heart icon on products to build a premium shortlist.</p>
                        <div className="wishlist-empty-actions">
                            <Link to="/shop/All" className="btn wishlist-shop-btn">Start Shopping</Link>
                            <Link to="/profile" className="btn wishlist-empty-link">Back to Profile</Link>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .wishlist-premium-wrap {
                    min-height: 100vh;
                    background:
                        radial-gradient(circle at 0% 0%, rgba(227, 246, 244, 0.86), transparent 30%),
                        radial-gradient(circle at 100% 0%, rgba(255, 236, 200, 0.55), transparent 28%),
                        linear-gradient(180deg, #f7f3ea 0%, #eef3f7 100%);
                }

                .wishlist-shell {
                    position: relative;
                    z-index: 2;
                }

                .wishlist-hero {
                    background: linear-gradient(125deg,
                        #0a0805 0%,
                        rgba(15, 10, 5, 0.95) 15%,
                        rgba(40, 30, 15, 0.92) 35%,
                        rgba(80, 60, 25, 0.88) 55%,
                        rgba(212, 175, 55, 0.95) 85%,
                        rgba(255, 220, 100, 0.92) 100%);
                    color: #fff;
                    border-radius: 40px;
                    padding: 48px;
                    box-shadow:
                        0 40px 80px rgba(0, 0, 0, 0.4),
                        0 20px 40px rgba(212, 175, 55, 0.15),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15);
                    border: 2px solid rgba(255, 220, 100, 0.35);
                    position: relative;
                    overflow: hidden;
                }

                .wishlist-hero::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    pointer-events: none;
                }

                .wishlist-hero::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.08), transparent 50%);
                    pointer-events: none;
                }

                .wishlist-hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    border-radius: 999px;
                    padding: 11px 20px;
                    margin-bottom: 28px;
                    background: linear-gradient(135deg, rgba(255, 220, 100, 0.25), rgba(212, 175, 55, 0.15));
                    border: 1.5px solid rgba(255, 220, 100, 0.5);
                    text-transform: uppercase;
                    letter-spacing: 0.18em;
                    font-size: 10px;
                    font-weight: 900;
                    color: #fff9e6;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                    transition: all 0.3s ease;
                }

                .wishlist-hero-badge:hover {
                    background: linear-gradient(135deg, rgba(255, 220, 100, 0.35), rgba(212, 175, 55, 0.25));
                    border-color: rgba(255, 220, 100, 0.7);
                    transform: translateY(-1px);
                }

                .wishlist-hero-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 42px;
                    align-items: center;
                    position: relative;
                    z-index: 1;
                }

                .wishlist-hero h2 {
                    font-size: clamp(40px, 6vw, 62px);
                    line-height: 1.1;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                    margin: 0;
                    color: #fffef9;
                    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                .wishlist-hero p {
                    color: rgba(255, 254, 249, 0.92);
                    max-width: 680px;
                    font-size: 17px;
                    line-height: 1.8;
                    margin-top: 16px;
                    font-weight: 400;
                    letter-spacing: 0.4px;
                }

                .wishlist-hero-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 18px;
                    margin-top: 32px;
                }

                .wishlist-hero-btn {
                    border: none;
                    border-radius: 999px;
                    padding: 16px 32px;
                    font-weight: 900;
                    font-size: 13px;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    letter-spacing: 0.6px;
                    text-transform: uppercase;
                    position: relative;
                    overflow: hidden;
                }

                .wishlist-hero-btn::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.15), transparent);
                    transform: translateX(-100%);
                    transition: transform 0.6s ease;
                }

                .wishlist-hero-btn:hover::before {
                    transform: translateX(100%);
                }

                .wishlist-hero-btn.primary {
                    color: #0a0805;
                    background: linear-gradient(135deg,
                        #fef9e7 0%,
                        #fef3c7 25%,
                        #fbbf24 50%,
                        #f59e0b 75%,
                        #d97706 100%);
                    box-shadow:
                        0 24px 48px rgba(251, 191, 36, 0.35),
                        0 12px 24px rgba(212, 175, 55, 0.25);
                }

                .wishlist-hero-btn.primary:hover {
                    transform: translateY(-3px);
                    box-shadow:
                        0 32px 64px rgba(251, 191, 36, 0.45),
                        0 16px 32px rgba(212, 175, 55, 0.35);
                }

                .wishlist-hero-btn.ghost {
                    color: #fffef9;
                    background: rgba(255, 255, 255, 0.15);
                    border: 2px solid rgba(255, 254, 249, 0.35);
                    backdrop-filter: blur(15px);
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
                }

                .wishlist-hero-btn.ghost:hover {
                    background: rgba(255, 255, 255, 0.25);
                    border-color: rgba(255, 254, 249, 0.55);
                    transform: translateY(-3px);
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
                }

                .wishlist-hero-btn:hover,
                .wishlist-chip-btn:hover,
                .wishlist-cart-btn:hover,
                .wishlist-view-btn:hover {
                    transform: translateY(-1px);
                }

                .wishlist-hero-btn:disabled,
                .wishlist-chip-btn:disabled,
                .wishlist-cart-btn:disabled,
                .wishlist-view-btn:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .wishlist-hero-card {
                    background: linear-gradient(135deg,
                        rgba(255, 255, 255, 0.18) 0%,
                        rgba(255, 255, 255, 0.12) 50%,
                        rgba(212, 175, 55, 0.15) 100%);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 32px;
                    padding: 32px;
                    backdrop-filter: blur(25px);
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.3),
                        0 20px 40px rgba(0, 0, 0, 0.2);
                    position: relative;
                    overflow: hidden;
                }

                .wishlist-hero-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.1), transparent 60%);
                    pointer-events: none;
                }

                .wishlist-hero-card-top {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    margin-bottom: 24px;
                    color: rgba(255, 254, 249, 0.95);
                    position: relative;
                    z-index: 1;
                }

                .wishlist-hero-mini-grid {
                    display: grid;
                    gap: 18px;
                    position: relative;
                    z-index: 1;
                }

                .wishlist-mini-stat {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 18px;
                    align-items: start;
                    padding: 22px;
                    border-radius: 26px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
                    border: 1.5px solid rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(15px);
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.2),
                        0 8px 20px rgba(0, 0, 0, 0.15);
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .wishlist-mini-stat::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.08), transparent 70%);
                    pointer-events: none;
                }

                .wishlist-mini-stat:hover {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.1));
                    border-color: rgba(255, 255, 255, 0.35);
                    transform: translateY(-2px);
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.3),
                        0 12px 28px rgba(0, 0, 0, 0.2);
                }

                .wishlist-mini-stat.gold {
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(255, 255, 255, 0.1));
                    border-color: rgba(251, 191, 36, 0.4);
                }

                .wishlist-mini-stat.gold:hover {
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(255, 255, 255, 0.14));
                    border-color: rgba(251, 191, 36, 0.6);
                }

                .wishlist-mini-stat.teal {
                    background: linear-gradient(135deg, rgba(20, 184, 166, 0.22), rgba(255, 255, 255, 0.1));
                    border-color: rgba(20, 184, 166, 0.4);
                }

                .wishlist-mini-stat.teal:hover {
                    background: linear-gradient(135deg, rgba(20, 184, 166, 0.28), rgba(255, 255, 255, 0.14));
                    border-color: rgba(20, 184, 166, 0.6);
                }

                .wishlist-mini-stat.dark {
                    background: linear-gradient(135deg, rgba(10, 8, 5, 0.25), rgba(255, 255, 255, 0.1));
                    border-color: rgba(255, 255, 255, 0.25);
                }

                .wishlist-mini-stat.dark:hover {
                    background: linear-gradient(135deg, rgba(10, 8, 5, 0.32), rgba(255, 255, 255, 0.14));
                    border-color: rgba(255, 255, 255, 0.4);
                }

                .wishlist-mini-stat svg {
                    color: #fef9e7;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
                    flex-shrink: 0;
                }

                .wishlist-mini-stat span {
                    display: block;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.16em;
                    color: rgba(255, 254, 249, 0.85);
                    margin-bottom: 6px;
                    font-weight: 900;
                }

                .wishlist-mini-stat strong {
                    display: block;
                    color: #fffef9;
                    font-size: 26px;
                    line-height: 1.2;
                    margin-bottom: 5px;
                    font-weight: 900;
                    letter-spacing: -0.01em;
                }

                .wishlist-mini-stat small {
                    color: rgba(255, 254, 249, 0.8);
                    font-size: 12px;
                    font-weight: 500;
                    letter-spacing: 0.2px;
                }

                .wishlist-control-bar {
                    display: grid;
                    grid-template-columns: 1.3fr 1fr;
                    gap: 12px;
                    align-items: center;
                    background: rgba(255,255,255,0.7);
                    border: 1px solid rgba(209, 213, 219, 0.8);
                    border-radius: 20px;
                    padding: 14px;
                    backdrop-filter: blur(6px);
                }

                .wishlist-search-wrap {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #fff;
                    border: 1px solid #e5e7eb;
                    border-radius: 999px;
                    padding: 12px 16px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
                }

                .wishlist-search-wrap input {
                    width: 100%;
                    border: none;
                    outline: none;
                    background: transparent;
                    color: #111827;
                    font-weight: 500;
                }

                .wishlist-control-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: flex-end;
                }

                .wishlist-chip-btn {
                    border: 1px solid rgba(148, 163, 184, 0.28);
                    background: #fff;
                    color: #334155;
                    border-radius: 999px;
                    padding: 10px 14px;
                    font-size: 12px;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }

                .wishlist-summary-bar {
                    background: linear-gradient(135deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74));
                    border: 1px solid rgba(229, 233, 239, 0.9);
                    border-radius: 16px;
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #334155;
                    backdrop-filter: blur(6px);
                }

                .wishlist-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 18px;
                }

                .wishlist-card {
                    position: relative;
                    background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    border-radius: 24px;
                    padding: 18px;
                    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
                    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
                    overflow: hidden;
                }

                .wishlist-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(14,165,233,0.05), rgba(245,158,11,0.06));
                    opacity: 0;
                    transition: opacity 0.25s ease;
                    pointer-events: none;
                }

                .wishlist-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 22px 46px rgba(15, 23, 42, 0.12);
                    border-color: rgba(148, 163, 184, 0.55);
                }

                .wishlist-card:hover::before {
                    opacity: 1;
                }

                .wishlist-card.is-loading {
                    opacity: 0.6;
                    pointer-events: none;
                }

                .wishlist-remove-btn {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    border: none;
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: rgba(248,113,113,0.1);
                    color: #dc2626;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 20px rgba(220, 38, 38, 0.08);
                    cursor: pointer;
                    z-index: 2;
                }

                .wishlist-card-topline {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 14px;
                    padding-right: 30px;
                }

                .wishlist-img-wrap {
                    width: 118px;
                    height: 118px;
                    border-radius: 22px;
                    overflow: hidden;
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    background: #f8fafc;
                    flex-shrink: 0;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
                }

                .wishlist-img-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .wishlist-meta-pill {
                    display: inline-block;
                    padding: 5px 11px;
                    border-radius: 999px;
                    background: linear-gradient(135deg, #fff7ed, #fffbeb);
                    border: 1px solid rgba(251, 191, 36, 0.35);
                    color: #92400e;
                    font-size: 11px;
                    font-weight: 700;
                }

                .wishlist-meta-sub {
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }

                .wishlist-card-body {
                    position: relative;
                    z-index: 1;
                    display: grid;
                    grid-template-columns: 118px 1fr;
                    gap: 16px;
                    align-items: start;
                }

                .wishlist-copy {
                    min-width: 0;
                }

                .wishlist-copy-head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }

                .wishlist-eyebrow {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.16em;
                    color: #0f766e;
                    margin-bottom: 6px;
                }

                .wishlist-title {
                    font-size: 1.18rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                }

                .wishlist-sub {
                    color: #64748b;
                    font-size: 13px;
                    line-height: 1.55;
                }

                .wishlist-price {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: #0f766e;
                    white-space: nowrap;
                }

                .wishlist-features {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 14px;
                }

                .wishlist-features span {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 10px;
                    border-radius: 999px;
                    background: #f8fafc;
                    border: 1px solid #e5e7eb;
                    color: #475569;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .wishlist-card-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .wishlist-cart-btn {
                    border-radius: 999px;
                    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
                    color: #fff;
                    font-weight: 800;
                    border: none;
                    padding: 10px 16px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 12px 22px rgba(15,118,110,0.22);
                }

                .wishlist-view-btn {
                    border-radius: 999px;
                    border: 1px solid rgba(148,163,184,0.28);
                    color: #1f2937;
                    font-weight: 800;
                    padding: 10px 16px;
                    background: #fff;
                }

                .wishlist-empty {
                    border-radius: 26px;
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                    border: 1px solid #e7ebf0;
                    box-shadow: 0 16px 34px rgba(15,23,42,0.08);
                }

                .wishlist-empty-icon {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    margin: 0 auto 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, rgba(15,118,110,0.12), rgba(251,191,36,0.14));
                    color: #0f766e;
                }

                .wishlist-empty-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    justify-content: center;
                }

                .wishlist-shop-btn {
                    border-radius: 999px;
                    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
                    color: #fff;
                    font-weight: 800;
                    padding: 10px 22px;
                    border: none;
                    box-shadow: 0 12px 22px rgba(15,118,110,0.22);
                }

                .wishlist-empty-link {
                    border-radius: 999px;
                    border: 1px solid rgba(148,163,184,0.28);
                    color: #334155;
                    font-weight: 800;
                    padding: 10px 22px;
                    background: #fff;
                }

                @media (max-width: 991.98px) {
                    .wishlist-hero-grid,
                    .wishlist-control-bar,
                    .wishlist-grid {
                        grid-template-columns: 1fr;
                    }

                    .wishlist-control-actions {
                        justify-content: flex-start;
                    }
                }

                @media (max-width: 575.98px) {
                    .wishlist-hero {
                        padding: 22px;
                        border-radius: 22px;
                    }

                    .wishlist-hero h2 {
                        font-size: 31px;
                    }

                    .wishlist-hero-actions,
                    .wishlist-card-actions,
                    .wishlist-empty-actions {
                        flex-direction: column;
                    }

                    .wishlist-hero-btn,
                    .wishlist-chip-btn,
                    .wishlist-cart-btn,
                    .wishlist-view-btn,
                    .wishlist-shop-btn,
                    .wishlist-empty-link {
                        width: 100%;
                        justify-content: center;
                    }

                    .wishlist-summary-bar {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 6px;
                    }

                    .wishlist-card-body,
                    .wishlist-copy-head {
                        grid-template-columns: 1fr;
                        flex-direction: column;
                    }

                    .wishlist-img-wrap {
                        width: 100%;
                        height: 220px;
                    }

                    .wishlist-card-topline {
                        padding-right: 38px;
                    }
                }
            `}} />
        </section>
    )
}