import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { clearCart, getCart } from "../Store/ActionCreaters/CartActionCreators"
import BuyerProfile from './BuyerProfile'
import { motion } from 'framer-motion'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { BASE_URL } from '../constants'

export default function Checkout() {
    var [mode, setMode] = useState("COD")
    var [user, setuser] = useState({})
    var [cart, setcart] = useState([])
    var [total, settotal] = useState(0)
    var [shipping, setshipping] = useState(0)
    var [final, setfinal] = useState(0)
    var [placingOrder, setplacingOrder] = useState(false)
    var [appliedCoupon, setAppliedCoupon] = useState({ code: '', discount: 0 })

    var users = useSelector((state) => state.UserStateData)
    var carts = useSelector((state) => (state.CartStateData && state.CartStateData.items) ? state.CartStateData.items : [])
    
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getAPIData() {
        dispatch(getUser())
        dispatch(getCart())
        const userId = localStorage.getItem("userid")
        
        var userData = users.find((item) => item.id === userId)
        if (userData) setuser(userData)

        // If your cart is per-user, just use all items (already filtered by backend)
        if (carts && carts.length > 0) {
            setcart(carts)
            let sum = 0
            carts.forEach(i => {
                const lineQty = Number(i.quantity ?? i.qty ?? 1)
                const linePrice = Number(i.price ?? i.product?.finalprice ?? i.product?.price ?? 0)
                sum += (linePrice * lineQty)
            })
            let ship = (sum > 0 && sum < 1000) ? 150 : 0

            const savedCouponRaw = localStorage.getItem('appliedCoupon')
            let couponDiscount = 0
            let couponCode = ''
            if (savedCouponRaw) {
                try {
                    const parsed = JSON.parse(savedCouponRaw)
                    if (parsed && String(parsed.userId) === String(userId) && parsed.code) {
                        couponCode = String(parsed.code)
                        couponDiscount = Math.max(0, Number(parsed.discount || 0))
                    }
                } catch (e) {
                    localStorage.removeItem('appliedCoupon')
                }
            }

            setAppliedCoupon({ code: couponCode, discount: couponDiscount })
            settotal(sum)
            setshipping(ship)
            setfinal(Math.max(0, sum + ship - couponDiscount))
        }
    }

    async function placeOrder() {
        try {
            const userid = localStorage.getItem("userid")
            if (!userid || cart.length === 0 || placingOrder) return

            setplacingOrder(true)

            const payload = {
                userId: userid,
                paymentMethod: mode,
                totalAmount: total,
                shippingAmount: shipping,
                finalAmount: final,
                couponCode: appliedCoupon.code || undefined,
                couponDiscount: Number(appliedCoupon.discount || 0),
                shippingAddress: {
                    fullName: user?.name || '',
                    phone: user?.phone || '',
                    addressline1: user?.addressline1 || '',
                    city: user?.city || '',
                    state: user?.state || '',
                    pin: user?.pin || '',
                    country: 'India'
                },
                products: cart
            }

            const response = await axios.post(`${BASE_URL}/api/place-order`, payload, { timeout: 20000 })
            const placedOrder = response?.data?.order

            if (placedOrder) {
                localStorage.setItem('lastPlacedOrder', JSON.stringify(placedOrder))
                localStorage.removeItem('appliedCoupon')
                dispatch(clearCart({ userid }))
                navigate("/confirmation", { state: { order: placedOrder } })
                return
            }

            alert('Order place nahi ho paya. Please try again.')
        } catch (error) {
            const message = error?.response?.data?.message || 'Order place karte waqt issue aaya. Please try again.'
            alert(message)
        } finally {
            setplacingOrder(false)
        }
    }

    useEffect(() => { getAPIData() }, [users.length, carts.length])

    return (
        <div className="checkout-page-shell" style={{ minHeight: "100vh" }}>
            <div className="py-5 text-center mb-5 shadow-sm checkout-hero-band">
                <h1 className="text-white font-weight-bold display-4">Secure Checkout</h1>
                <p className="text-info small text-uppercase" style={{letterSpacing:'2px'}}>Review your order and complete payment</p>
            </div>

            <section className="container pb-5">
                <div className="checkout-headline mb-4">
                    <span className="checkout-pill">Premium Checkout</span>
                    <h3 className="mb-1">Final step for your curated order</h3>
                    <p className="mb-0">Fast, secure, and crafted for a luxury experience.</p>
                </div>
                <div className="row">
                    {/* LEFT: Buyer Profile */}
                    <motion.div 
                        className="col-lg-6 mb-4"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="card border-0 shadow-sm rounded-2xl p-4 bg-white h-100 checkout-panel">
                            <h4 className="font-weight-bold mb-4 border-bottom pb-2">Delivery Details</h4>
                            <BuyerProfile user={user} />
                        </div>
                    </motion.div>

                    {/* RIGHT: Order Summary */}
                    <motion.div 
                        className="col-lg-6"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="card border-0 shadow-lg rounded-2xl p-4 bg-white checkout-panel">
                            <h4 className="font-weight-bold mb-4">Order Summary</h4>
                            <div className="checkout-items mb-4 premium-scroll" style={{maxHeight:'320px', overflowY:'auto'}}>
                                {cart.map((item, index) => {
                                    const lineQty = Number(item.quantity ?? item.qty ?? 1)
                                    const linePrice = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0)
                                    const lineTotal = Number(item.total ?? (lineQty * linePrice))
                                    const linePic = item.pic || item.product?.pic1 || "/assets/images/noimage.png"

                                    return (
                                    <div key={index} className="d-flex align-items-center mb-3 border-bottom pb-3 checkout-item-row">
                                        <img src={optimizeCloudinaryUrlAdvanced(linePic, { maxWidth: 220, crop: 'fill' })} width="72px" height="72px" loading="lazy" decoding="async" className="rounded shadow-sm object-fit-cover" alt="" />
                                        <div className="ml-3 flex-grow-1">
                                            <h6 className="mb-0 font-weight-bold text-dark">{item.name}</h6>
                                            <small className="text-muted">{lineQty} x ₹{linePrice}</small>
                                        </div>
                                        <span className="font-weight-bold text-info checkout-line-total">₹{lineTotal}</span>
                                    </div>
                                    )
                                })}
                            </div>

                            <div className="bg-light p-4 rounded-xl mb-4 checkout-total-box">
                                <div className="d-flex justify-content-between mb-2"><span>Subtotal</span><span>₹{total}</span></div>
                                <div className="d-flex justify-content-between mb-2"><span>Shipping</span><span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span></div>
                                {appliedCoupon.code && appliedCoupon.discount > 0 && (
                                    <div className="d-flex justify-content-between mb-2 text-success">
                                        <span>Coupon ({appliedCoupon.code})</span>
                                        <span>-₹{appliedCoupon.discount}</span>
                                    </div>
                                )}
                                <hr />
                                <div className="d-flex justify-content-between align-items-center">
                                    <h4 className="font-weight-bold mb-0">Payable Amount</h4>
                                    <h3 className="font-weight-bold text-info mb-0">₹{final}</h3>
                                </div>
                            </div>

                            <h5 className="font-weight-bold mb-3">Payment Method</h5>
                            <div className="mb-4">
                                <div 
                                    className={`payment-option p-3 border rounded-xl mb-2 cursor-pointer transition premium-pay-option ${mode === 'COD' ? 'border-info bg-aliceblue premium-pay-active' : ''}`}
                                    onClick={() => setMode("COD")}
                                >
                                    <input type="radio" checked={mode === "COD"} readOnly className="mr-2" />
                                    <strong>Cash on Delivery (COD)</strong>
                                </div>
                                <div 
                                    className={`payment-option p-3 border rounded-xl mb-2 cursor-pointer transition premium-pay-option ${mode === 'NetBanking' ? 'border-info bg-aliceblue premium-pay-active' : ''}`}
                                    onClick={() => setMode("NetBanking")}
                                >
                                    <input type="radio" checked={mode === "NetBanking"} readOnly className="mr-2" />
                                    <strong>Online Payment (Cards/UPI)</strong>
                                </div>
                            </div>

                            <button onClick={placeOrder} disabled={placingOrder || cart.length === 0} className="btn btn-info btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold premium-place-btn">
                                {placingOrder ? 'PLACING ORDER...' : 'PLACE ORDER NOW'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>
            <style dangerouslySetInnerHTML={{ __html: `
                .checkout-page-shell {
                    background:
                        radial-gradient(circle at 0% 0%, rgba(191, 219, 254, 0.26), transparent 30%),
                        radial-gradient(circle at 100% 0%, rgba(253, 230, 138, 0.24), transparent 28%),
                        linear-gradient(180deg, #f5f7fa 0%, #eef2f6 100%);
                }
                .checkout-hero-band {
                    background: linear-gradient(120deg, #1f2937, #111827 55%, #374151);
                }
                .checkout-headline {
                    margin-top: -10px;
                }
                .checkout-headline h3 {
                    font-weight: 800;
                    color: #0f172a;
                }
                .checkout-headline p {
                    color: #64748b;
                }
                .checkout-pill {
                    display: inline-block;
                    border-radius: 999px;
                    padding: 6px 12px;
                    margin-bottom: 10px;
                    background: linear-gradient(90deg, #fff8e1, #fef3c7);
                    border: 1px solid #ecd18b;
                    color: #7a5c1f;
                    font-size: 12px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .rounded-2xl { border-radius: 25px !important; }
                .rounded-xl { border-radius: 15px !important; }
                .bg-aliceblue { background-color: #f0faff; }
                .cursor-pointer { cursor: pointer; }
                .transition { transition: 0.3s all ease; }
                .object-fit-cover { object-fit: cover; }
                .checkout-panel {
                    border: 1px solid #e7ebf0;
                    background: linear-gradient(145deg, #ffffff, #f9fbfd);
                    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08) !important;
                }
                .checkout-total-box {
                    border: 1px solid #e4e8ee;
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                }
                .checkout-item-row {
                    transition: transform 0.2s ease;
                }
                .checkout-item-row:hover {
                    transform: translateX(2px);
                }
                .checkout-line-total {
                    font-size: 1.05rem;
                }
                .premium-pay-option {
                    border-color: #dde3eb !important;
                    background: #fff;
                }
                .premium-pay-active {
                    border-color: #7dd3fc !important;
                    box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.22);
                }
                .premium-place-btn {
                    background: linear-gradient(90deg, #0ea5b7, #0284c7) !important;
                    border: none !important;
                    letter-spacing: 0.6px;
                }
                .premium-place-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 26px rgba(2, 132, 199, 0.34);
                }
                .premium-scroll::-webkit-scrollbar { width: 8px; }
                .premium-scroll::-webkit-scrollbar-thumb { background: #d4dbe4; border-radius: 999px; }
                @media (max-width: 767.98px) {
                    .checkout-headline h3 { font-size: 1.25rem; }
                }
            `}} />
        </div>
    )
}