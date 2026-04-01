import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux';
import { getWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { Link } from 'react-router-dom'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import axios from 'axios';
import { BASE_URL } from '../constants';
import Spinner from './Spinner';
import { useToast } from './ToastNotification';

export default function Wishlist() {
    const [wishlist, setWishlist] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [removingIds, setRemovingIds] = useState([])
    const [movingIds, setMovingIds] = useState([])
    const dispatch = useDispatch()
    const toast = useToast()
    const userId = localStorage.getItem("userid")

    axios.defaults.baseURL = BASE_URL;

    const totalWishlistValue = useMemo(() => {
        return wishlist.reduce((acc, item) => acc + Number(item.price || 0), 0)
    }, [wishlist])

    async function fetchWishlist() {
        if (!userId) {
            setWishlist([])
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const res = await axios.get('/wishlist')
            const all = Array.isArray(res.data) ? res.data : []
            const mine = all.filter((item) => String(item.userid) === String(userId))
            setWishlist(mine)
            dispatch(getWishlist())
        } catch (e) {
            setWishlist([])
            toast.error('Failed to load wishlist.')
        }
        setLoading(false)
    }

    async function removeFromWishlist(itemId) {
        setRemovingIds((prev) => [...prev, itemId])
        setActionLoading(true)
        try {
            await axios.delete(`/wishlist/${itemId}`)
            await fetchWishlist()
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
        const productId = item.productid || item.product || itemId
        setMovingIds((prev) => [...prev, itemId])
        setActionLoading(true)
        try {
            await axios.post('/api/cart', {
                userId,
                productId,
                quantity: 1
            })
            await axios.delete(`/wishlist/${itemId}`)
            await fetchWishlist()
            toast.success('Moved to cart successfully.')
        } catch (e) {
            toast.error('Failed to move item to cart.')
        } finally {
            setMovingIds((prev) => prev.filter((id) => id !== itemId))
            setActionLoading(false)
        }
    }

    useEffect(() => { fetchWishlist() }, [])

    return (
        <section className="wishlist-premium-wrap" style={{ boxSizing: 'border-box', maxWidth: '100vw' }}>
            {(loading || actionLoading) && <Spinner />}

            <div className="container py-5">
                <div className="wishlist-hero mb-4">
                    <h2 className="mb-2">My Wishlist</h2>
                    <p className="mb-0">Saved pieces you can move to cart instantly</p>
                </div>

                {wishlist.length > 0 ? (
                    <>
                        <div className="wishlist-summary-bar mb-4">
                            <span>{wishlist.length} item{wishlist.length > 1 ? 's' : ''}</span>
                            <strong>Total Value: ₹{totalWishlistValue}</strong>
                        </div>

                        <div className="row">
                            {wishlist.map((item) => {
                                const itemId = item.id || item._id
                                const removing = removingIds.includes(itemId)
                                const moving = movingIds.includes(itemId)
                                const productId = item.productid || item.product || ''

                                return (
                                    <div key={itemId} className="col-xl-6 col-12 mb-4">
                                        <div className={`wishlist-card h-100 ${removing || moving ? 'is-loading' : ''}`}>
                                            <button className="wishlist-remove-btn" onClick={() => removeFromWishlist(itemId)} title="Remove">
                                                ×
                                            </button>

                                            <div className="d-flex align-items-start">
                                                <div className="wishlist-img-wrap mr-3">
                                                    <img
                                                        src={item.pic ? optimizeCloudinaryUrlAdvanced(item.pic, { maxWidth: 260, crop: 'fill' }) : "/assets/images/noimage.png"}
                                                        loading="lazy"
                                                        decoding="async"
                                                        alt={item.name || 'Product'}
                                                    />
                                                </div>

                                                <div className="flex-grow-1">
                                                    <div className="wishlist-meta-pill mb-2">ID: {itemId}</div>
                                                    <h5 className="wishlist-title mb-1">{item.name || 'Premium Product'}</h5>
                                                    <p className="wishlist-sub mb-2">{item.color || 'Classic'} | Size: {item.size || 'Standard'}</p>
                                                    <div className="wishlist-price mb-3">₹{Number(item.price || 0)}</div>

                                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                                        <button className="btn wishlist-cart-btn" onClick={() => moveToCart(item)} disabled={moving}>
                                                            {moving ? 'Moving...' : 'Move to Cart'}
                                                        </button>
                                                        <Link to={`/single-product/${productId}`} className="btn wishlist-view-btn">
                                                            View Product
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div className='wishlist-empty text-center p-5'>
                        <h4 className="mb-3">Your Wishlist is Empty</h4>
                        <p className="mb-4">Save products you love and access them quickly anytime.</p>
                        <Link to="/shop/All" className='btn wishlist-shop-btn'>Shop Now</Link>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .wishlist-premium-wrap {
                    min-height: 100vh;
                    background:
                        radial-gradient(circle at 0% 0%, rgba(228, 240, 246, 0.75), transparent 32%),
                        radial-gradient(circle at 95% 12%, rgba(255, 235, 206, 0.45), transparent 30%),
                        linear-gradient(180deg, #f6f8fa 0%, #f0f3f7 100%);
                }
                .wishlist-hero h2 {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #14213d;
                    letter-spacing: 0.5px;
                    margin: 0;
                }
                .wishlist-hero p {
                    color: #5a6472;
                }
                .wishlist-summary-bar {
                    background: #ffffff;
                    border: 1px solid #e5e9ef;
                    border-radius: 14px;
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #334155;
                }
                .wishlist-card {
                    position: relative;
                    background: #fff;
                    border: 1px solid #e7ebf0;
                    border-radius: 18px;
                    padding: 18px;
                    box-shadow: 0 12px 28px rgba(16, 24, 40, 0.06);
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                }
                .wishlist-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 18px 34px rgba(16, 24, 40, 0.1);
                }
                .wishlist-card.is-loading {
                    opacity: 0.6;
                    pointer-events: none;
                }
                .wishlist-remove-btn {
                    position: absolute;
                    top: 8px;
                    right: 12px;
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #fff1f1;
                    color: #d14343;
                    font-size: 23px;
                    line-height: 20px;
                    cursor: pointer;
                }
                .wishlist-img-wrap {
                    width: 95px;
                    height: 95px;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid #e7ebf0;
                    flex-shrink: 0;
                }
                .wishlist-img-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .wishlist-meta-pill {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 999px;
                    background: #f8fafc;
                    border: 1px dashed #cbd5e1;
                    color: #4b5563;
                    font-size: 11px;
                    font-weight: 700;
                }
                .wishlist-title {
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #0f172a;
                }
                .wishlist-sub {
                    color: #64748b;
                    font-size: 14px;
                }
                .wishlist-price {
                    font-size: 1.35rem;
                    font-weight: 800;
                    color: #0ea5b7;
                }
                .wishlist-cart-btn {
                    border-radius: 999px;
                    background: linear-gradient(90deg, #b8860b 0%, #f6df95 100%);
                    color: #1f2937;
                    font-weight: 700;
                    border: none;
                    padding: 8px 16px;
                }
                .wishlist-view-btn {
                    border-radius: 999px;
                    border: 1px solid #d5d9df;
                    color: #1f2937;
                    font-weight: 700;
                    padding: 8px 16px;
                    background: #fff;
                }
                .wishlist-empty {
                    border-radius: 18px;
                    background: #fff;
                    border: 1px solid #e7ebf0;
                }
                .wishlist-shop-btn {
                    border-radius: 999px;
                    background: #0ea5b7;
                    color: #fff;
                    font-weight: 700;
                    padding: 10px 22px;
                }
                @media (max-width: 575.98px) {
                    .wishlist-summary-bar {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 6px;
                    }
                    .wishlist-title {
                        font-size: 1.05rem;
                    }
                    .wishlist-price {
                        font-size: 1.2rem;
                    }
                    .wishlist-img-wrap {
                        width: 84px;
                        height: 84px;
                    }
                }
            `}} />
        </section>
    )
}