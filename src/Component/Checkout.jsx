import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { clearCart, getCart } from "../Store/ActionCreaters/CartActionCreators"
import BuyerProfile from './BuyerProfile'
import { useMembership } from './MembershipContext'
import { motion, AnimatePresence } from 'framer-motion'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { BASE_URL } from '../constants'
import { createRazorpayOrderAPI, getRazorpayConfigAPI, verifyRazorpayPaymentAPI } from '../Store/Services'

export default function Checkout() {
    const [mode, setMode] = useState("UPI")
    const [user, setuser] = useState({})
    const [cart, setcart] = useState([])
    const [subtotal, setSubtotal] = useState(0)
    const [shipping, setshipping] = useState(0)
    const [placingOrder, setplacingOrder] = useState(false)
    const [paymentProcessing, setPaymentProcessing] = useState(false)
    const [razorpayKeyId, setRazorpayKeyId] = useState('')
    const [razorpayCurrency, setRazorpayCurrency] = useState('INR')
    const fallbackRazorpayKeyId = process.env.REACT_APP_RAZORPAY_KEY_ID || ''
    const [appliedCoupon, setAppliedCoupon] = useState({ code: '', discount: 0 })
    const [giftWrap, setGiftWrap] = useState(false)
    const [deliveryProtection, setDeliveryProtection] = useState(true)
    const [ecoPackaging, setEcoPackaging] = useState(false)
    const [orderNotes, setOrderNotes] = useState('')
    const [showPriceDetails, setShowPriceDetails] = useState(true)
    const [deliverySlot, setDeliverySlot] = useState('Evening 6 PM - 9 PM')

    const users = useSelector((state) => state.UserStateData)
    const carts = useSelector((state) => (state.CartStateData && state.CartStateData.items) ? state.CartStateData.items : [])
    const { membershipType } = useMembership()

    const dispatch = useDispatch()
    const navigate = useNavigate()

    const paymentMeta = useMemo(() => {
        if (mode === 'Card') return { label: 'Card / NetBanking', fee: 49 }
        if (mode === 'COD') return { label: 'Cash on Delivery', fee: 39 }
        return { label: 'UPI / Wallet', fee: 0 }
    }, [mode])

    const loadRazorpayScript = useMemo(() => {
        return () => new Promise((resolve) => {
            if (typeof window === 'undefined') {
                resolve(false)
                return
            }

            if (window.Razorpay) {
                resolve(true)
                return
            }

            const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(true), { once: true })
                existingScript.addEventListener('error', () => resolve(false), { once: true })
                return
            }

            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.async = true
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }, [])

    const gst = useMemo(() => Math.round(subtotal * 0.05), [subtotal])
    const giftWrapCharge = giftWrap ? 99 : 0
    const protectionCharge = deliveryProtection ? 49 : 0
    const ecoCharge = ecoPackaging ? 19 : 0
    const paymentFee = paymentMeta.fee
    const preDiscountTotal = subtotal + shipping + gst + giftWrapCharge + protectionCharge + ecoCharge + paymentFee
    const instantDiscount = useMemo(() => {
        return cart.reduce((acc, item) => {
            const qty = Number(item?.quantity ?? item?.qty ?? 1)
            const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1
            const sellingPrice = Number(item?.price ?? item?.product?.finalprice ?? item?.product?.price ?? 0)
            const originalPrice = Number(item?.mrp ?? item?.originalPrice ?? item?.product?.mrp ?? item?.product?.price ?? sellingPrice)
            if (!Number.isFinite(sellingPrice) || !Number.isFinite(originalPrice)) return acc
            if (originalPrice <= sellingPrice) return acc
            return acc + ((originalPrice - sellingPrice) * safeQty)
        }, 0)
    }, [cart])
    const totalSavings = Number(appliedCoupon.discount || 0) + instantDiscount + (shipping === 0 && subtotal > 0 ? 150 : 0)

    const final = useMemo(() => {
        return Math.max(
            0,
            subtotal + shipping + gst + giftWrapCharge + protectionCharge + ecoCharge + paymentFee - Number(appliedCoupon.discount || 0)
        )
    }, [subtotal, shipping, gst, giftWrapCharge, protectionCharge, ecoCharge, paymentFee, appliedCoupon.discount])

    const totalItems = useMemo(() => {
        return cart.reduce((acc, item) => acc + Number(item.quantity ?? item.qty ?? 1), 0)
    }, [cart])

    const estimatedDelivery = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + 4)
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    }, [])

    const deliverySlots = useMemo(() => ([
        'Morning 9 AM - 12 PM',
        'Afternoon 1 PM - 4 PM',
        'Evening 6 PM - 9 PM'
    ]), [])

    const timelineSteps = useMemo(() => ([
        { title: 'Order Review', eta: 'Within 30 min' },
        { title: 'Packed by Team', eta: 'Today' },
        { title: 'Delivered', eta: estimatedDelivery }
    ]), [estimatedDelivery])

    useEffect(() => {
        let cancelled = false

        const loadPaymentConfig = async () => {
            try {
                const config = await getRazorpayConfigAPI()
                if (cancelled) return
                if (config?.keyId) setRazorpayKeyId(config.keyId)
                if (config?.currency) setRazorpayCurrency(String(config.currency).toUpperCase())
            } catch (error) {
                console.warn('Razorpay config load failed:', error?.message || error)
            }
        }

        loadPaymentConfig()
        return () => {
            cancelled = true
        }
    }, [])

    function getAPIData() {
        dispatch(getUser())
        dispatch(getCart())
        const userId = localStorage.getItem("userid")

        const userData = users.find((item) => String(item.id || item._id) === String(userId))
        if (userData) setuser(userData)

        if (carts && carts.length > 0) {
            setcart(carts)
            let sum = 0
            carts.forEach((i) => {
                const lineQty = Number(i.quantity ?? i.qty ?? 1)
                const linePrice = Number(i.price ?? i.product?.finalprice ?? i.product?.price ?? 0)
                sum += (linePrice * lineQty)
            })
            const ship = membershipType === 'Elite' ? 0 : ((sum > 0 && sum < 1000) ? 150 : 0)

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
            setSubtotal(sum)
            setshipping(ship)
        } else {
            setcart([])
            setSubtotal(0)
            setshipping(0)
        }
    }

    async function placeOrder(paymentDetails = {}) {
        try {
            const userid = localStorage.getItem("userid")
            if (!userid || cart.length === 0 || placingOrder) return

            setplacingOrder(true)

            const normalizedProducts = cart.map((item) => {
                const qtyVal = Number(item?.quantity ?? item?.qty ?? item?.count ?? 1)
                const qty = Number.isFinite(qtyVal) && qtyVal > 0 ? qtyVal : 1
                const unitPriceVal = Number(item?.price ?? item?.product?.finalprice ?? item?.product?.price ?? 0)
                const unitPrice = Number.isFinite(unitPriceVal) ? unitPriceVal : 0
                const productId = item?.productid || item?.product?._id || item?.product?.id || item?._id || item?.id || ''

                return {
                    ...item,
                    productid: productId,
                    qty,
                    quantity: qty,
                    price: unitPrice,
                    total: Number(item?.total ?? item?.lineTotal ?? (qty * unitPrice))
                }
            })

            const payload = {
                userId: userid,
                paymentMethod: paymentDetails.paymentMethod || mode,
                paymentStatus: paymentDetails.paymentStatus || ((paymentDetails.paymentMethod || mode) === 'COD' ? 'Pending' : 'Paid'),
                paidAt: paymentDetails.paidAt,
                razorpayOrderId: paymentDetails.razorpayOrderId,
                razorpayPaymentId: paymentDetails.razorpayPaymentId,
                razorpaySignature: paymentDetails.razorpaySignature,
                totalAmount: subtotal,
                shippingAmount: shipping,
                gstAmount: gst,
                finalAmount: final,
                couponCode: appliedCoupon.code || undefined,
                couponDiscount: Number(appliedCoupon.discount || 0),
                discountAmount: Number(instantDiscount || 0),
                giftWrapCharge,
                protectionCharge,
                ecoCharge,
                paymentFee,
                extraCharges: giftWrapCharge + protectionCharge + ecoCharge + paymentFee,
                preDiscountTotal,
                notes: orderNotes,
                deliverySlot,
                shippingAddress: {
                    fullName: user?.name || '',
                    phone: user?.phone || '',
                    addressline1: user?.addressline1 || '',
                    city: user?.city || '',
                    state: user?.state || '',
                    pin: user?.pin || '',
                    country: 'India'
                },
                products: normalizedProducts
            }

            const response = await axios.post(`${BASE_URL}/api/place-order`, payload, { timeout: 20000 })
            const placedOrder = response?.data?.order

            if (placedOrder) {
                localStorage.setItem('lastPlacedOrder', JSON.stringify(placedOrder))
                localStorage.removeItem('appliedCoupon')
                dispatch(clearCart({ userid }))
                window.dispatchEvent(new Event('membership-updated'))
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

    async function handlePaymentAndPlaceOrder() {
        if (mode === 'COD') {
            await placeOrder()
            return
        }

        if (paymentProcessing || placingOrder) return

        setPaymentProcessing(true)

        try {

            let payableAmount = Number(final)
            if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
                alert('Payable amount invalid hai! Amount: ' + final + '. Please refresh checkout or contact support.');
                setPaymentProcessing(false)
                return
            }
            payableAmount = Math.round(payableAmount)

            const loaded = await loadRazorpayScript()
            if (!loaded) {
                throw new Error('Razorpay checkout failed to load. Please try again.')
            }

            const userId = localStorage.getItem('userid')
            const receipt = `checkout_${String(userId || 'guest')}_${Date.now()}`

            // Debug log for outgoing payload
            console.log('[Razorpay] Creating order with:', {
                amount: payableAmount,
                currency: razorpayCurrency || 'INR',
                paymentMethod: mode,
                userId,
                receipt,
                final,
                razorpayCurrency,
                mode
            })

            const orderResponse = await createRazorpayOrderAPI({
                amount: payableAmount,
                currency: razorpayCurrency || 'INR',
                paymentMethod: mode,
                userId,
                receipt
            })

            const razorpayOrder = orderResponse?.order
            const keyId = orderResponse?.keyId || razorpayKeyId || fallbackRazorpayKeyId

            if (!razorpayOrder?.id || !keyId) {
                throw new Error('Razorpay order could not be created. Please try again.')
            }

            const options = {
                key: keyId,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency || razorpayCurrency || 'INR',
                name: 'Eshopper',
                description: mode === 'Card' ? 'Card / NetBanking payment' : 'UPI / Wallet payment',
                order_id: razorpayOrder.id,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: user?.phone || ''
                },
                notes: {
                    userId: String(userId || ''),
                    paymentMethod: mode,
                    cartItems: String(cart.length)
                },
                theme: { color: '#0f766e' },
                modal: {
                    ondismiss: () => setPaymentProcessing(false)
                },
                handler: async (response) => {
                    try {
                        const verifyResponse = await verifyRazorpayPaymentAPI({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })

                        if (!verifyResponse?.success) {
                            throw new Error(verifyResponse?.message || 'Payment verification failed')
                        }

                        await placeOrder({
                            paymentMethod: mode,
                            paymentStatus: 'Paid',
                            paidAt: new Date().toISOString(),
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        })
                    } catch (paymentError) {
                        console.error('Razorpay verification/order error:', paymentError)
                        alert(paymentError?.message || 'Payment verified but order could not be placed. Please contact support.')
                    } finally {
                        setPaymentProcessing(false)
                    }
                }
            }

            const razorpayInstance = new window.Razorpay(options)
            razorpayInstance.on('payment.failed', (response) => {
                console.error('Razorpay payment failed:', response?.error)
                setPaymentProcessing(false)
                alert(response?.error?.description || 'Payment failed. Please try again.')
            })
            razorpayInstance.open()
        } catch (error) {
            console.error('Razorpay checkout error:', error)
            alert(error?.message || 'Unable to start payment checkout.')
            setPaymentProcessing(false)
        }
    }

    useEffect(() => { getAPIData() }, [users.length, carts.length, membershipType])

    return (
        <div className="checkout-page-shell" style={{ minHeight: "100vh" }}>
            <div className="py-5 text-center mb-5 shadow-sm checkout-hero-band">
                <h1 className="text-white font-weight-bold display-4">Luxury Checkout</h1>
                <p className="text-light small text-uppercase" style={{ letterSpacing: '2px' }}>Secure flow with complete order intelligence</p>
            </div>

            <section className="container pb-5">
                <div className="checkout-headline mb-4 d-flex flex-wrap justify-content-between align-items-end gap-3">
                    <div>
                        <span className="checkout-pill">Premium Checkout</span>
                        <h3 className="mb-1">Final step for your curated order</h3>
                        <p className="mb-0">Every detail reviewed before your order is confirmed.</p>
                    </div>
                    <div className="eta-chip">Estimated Delivery: <strong>{estimatedDelivery}</strong></div>
                </div>

                <div className="row">
                    <motion.div
                        className="col-xl-7 col-lg-7 mb-4"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="card border-0 shadow-sm rounded-2xl p-4 bg-white h-100 checkout-panel">
                            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                <h4 className="font-weight-bold mb-0">Delivery Details</h4>
                                <div className="d-flex align-items-center gap-2">
                                    <button type="button" className="address-edit-link" onClick={() => navigate('/update-profile')}>
                                        Edit address
                                    </button>
                                    <span className="verified-pill">Verified Account</span>
                                </div>
                            </div>
                            <BuyerProfile user={user} />

                            <div className="premium-extras mt-4 shipping-options-card">
                                <div className="shipping-options-head mb-3">
                                    <h6 className="shipping-options-title mb-1">Shipping Options</h6>
                                    <p className="shipping-options-subtitle mb-0">Choose add-ons for safer and premium delivery.</p>
                                </div>
                                <label className="extra-row shipping-option-row">
                                    <span>
                                        <strong>🛡 Delivery Protection</strong>
                                        <small>Covers damage and loss in transit</small>
                                    </span>
                                    <span className="d-flex align-items-center gap-2">
                                        <span className="price-tag">₹49</span>
                                        <input type="checkbox" checked={deliveryProtection} onChange={(e) => setDeliveryProtection(e.target.checked)} />
                                    </span>
                                </label>
                                <label className="extra-row shipping-option-row mb-0">
                                    <span>
                                        <strong>🎁 Gift Wrapping</strong>
                                        <small>Premium wrapping with message card</small>
                                    </span>
                                    <span className="d-flex align-items-center gap-2">
                                        <span className="price-tag">₹99</span>
                                        <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
                                    </span>
                                </label>
                                <label className="extra-row mb-0 mt-2">
                                    <span>
                                        <strong>Eco Packaging</strong>
                                        <small>Plastic-free sustainable packaging</small>
                                    </span>
                                    <span className="d-flex align-items-center gap-2">
                                        <span className="price-tag">₹19</span>
                                        <input type="checkbox" checked={ecoPackaging} onChange={(e) => setEcoPackaging(e.target.checked)} />
                                    </span>
                                </label>
                            </div>

                            <div className="mt-4">
                                <label className="small text-uppercase text-muted font-weight-bold">Order Notes (Optional)</label>
                                <textarea
                                    className="form-control premium-note-input"
                                    rows="3"
                                    placeholder="Special instructions for delivery, gift note, landmark..."
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                />
                            </div>

                            <motion.h5 className="font-weight-bold mb-3 mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.3 }}>Payment Methods</motion.h5>
                            <motion.div className="mb-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
                                <button type="button" className={`payment-selector ${mode === 'UPI' ? 'is-selected' : ''}`} onClick={() => setMode('UPI')}>
                                    <span className="payment-radio" />
                                    <span className="payment-copy"><strong>UPI / Wallet</strong><small>Recommended • Zero fee</small></span>
                                    <span className="pay-badge">FAST</span>
                                </button>
                                <button type="button" className={`payment-selector ${mode === 'Card' ? 'is-selected' : ''}`} onClick={() => setMode('Card')}>
                                    <span className="payment-radio" />
                                    <span className="payment-copy"><strong>Cards / NetBanking</strong><small>Secured by 256-bit encryption</small></span>
                                    <span className="pay-badge">₹49</span>
                                </button>
                                <button type="button" className={`payment-selector ${mode === 'COD' ? 'is-selected' : ''}`} onClick={() => setMode('COD')}>
                                    <span className="payment-radio" />
                                    <span className="payment-copy"><strong>Cash on Delivery</strong><small>Pay at doorstep</small></span>
                                    <span className="pay-badge">₹39</span>
                                </button>
                            </motion.div>

                            <motion.div className="mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.3 }}>
                                <h6 className="font-weight-bold mb-2">Select Delivery Slot</h6>
                                <div className="delivery-slot-grid">
                                    {deliverySlots.map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            className={`slot-btn ${deliverySlot === slot ? 'slot-btn-active' : ''}`}
                                            onClick={() => setDeliverySlot(slot)}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>

                                <h6 className="font-weight-bold mb-2 mt-4">Order Timeline</h6>
                                <div className="timeline-wrap">
                                    {timelineSteps.map((step, i) => (
                                        <div className="timeline-row" key={step.title}>
                                            <div className="timeline-dot-wrap">
                                                <span className="timeline-dot" />
                                                {i !== timelineSteps.length - 1 ? <span className="timeline-line" /> : null}
                                            </div>
                                            <div className="timeline-content">
                                                <strong>{step.title}</strong>
                                                <small>{step.eta}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="luxury-info-grid mt-3">
                                    <div className="luxury-info-card">
                                        <h6>White-Glove Delivery</h6>
                                        <p>Priority packed, tamper-proof, and carefully handled dispatch.</p>
                                    </div>
                                    <div className="luxury-info-card">
                                        <h6>Post-Order Support</h6>
                                        <p>Dedicated assistance for delivery updates and order changes.</p>
                                    </div>
                                    <div className="luxury-info-card">
                                        <h6>Return Assurance</h6>
                                        <p>Hassle-free return and replacement flow from your profile section.</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="col-xl-5 col-lg-5"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="card border-0 shadow-lg rounded-2xl p-4 bg-white checkout-panel sticky-summary">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="font-weight-bold mb-0">Order Summary</h4>
                                <span className="item-count-pill">{totalItems} items</span>
                            </div>

                            <div className="checkout-items mb-4 premium-scroll" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                {cart.map((item, index) => {
                                    const lineQty = Number(item.quantity ?? item.qty ?? 1)
                                    const linePrice = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0)
                                    const lineTotal = Number(item.total ?? (lineQty * linePrice))
                                    const linePic = item.pic || item.product?.pic1 || "/assets/images/noimage.png"

                                    return (
                                        <div key={item._id || item.id || index} className="checkout-item-row">
                                            <img src={optimizeCloudinaryUrlAdvanced(linePic, { maxWidth: 220, crop: 'fill' })} width="68" height="68" loading="lazy" decoding="async" className="rounded shadow-sm object-fit-cover" alt="item" />
                                            <div className="item-mid">
                                                <h6 className="mb-1 font-weight-bold text-dark">{item.name || item.product?.name || 'Product'}</h6>
                                                <div className="line-highlight-wrap">
                                                    <span className="qty-pill">Qty {lineQty}</span>
                                                    <span className="line-meta">x ₹{linePrice}</span>
                                                </div>
                                                <div className="sku-pill">SKU {String(item._id || item.id || '').slice(0, 12)}...</div>
                                            </div>
                                            <div className="item-total">₹{lineTotal}</div>
                                        </div>
                                    )
                                })}
                            </div>

                            <motion.div
                                className="bg-light p-4 rounded-xl mb-4 checkout-total-box"
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.32 }}
                            >
                                <div className="cost-header mb-3">
                                    <p className="mb-1">Detailed Cost Breakdown</p>
                                </div>
                                <div className="transparent-pill-wrap mb-3"><span>Transparent Pricing</span></div>

                                <button type="button" className="price-accordion-btn" onClick={() => setShowPriceDetails((prev) => !prev)}>
                                    <span>{showPriceDetails ? 'Hide Price Details' : 'Show Price Details'}</span>
                                    <strong>{showPriceDetails ? '−' : '+'}</strong>
                                </button>

                                <AnimatePresence initial={false}>
                                    {showPriceDetails ? (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}>
                                            <div className="price-row"><span>Items Subtotal</span><strong>₹{subtotal}</strong></div>
                                            {instantDiscount > 0 ? (
                                                <div className="price-row text-success"><span>Instant Discount</span><strong>-₹{instantDiscount}</strong></div>
                                            ) : null}
                                            <div className="price-row"><span>Shipping</span><strong>{shipping === 0 ? "FREE" : `₹${shipping}`}</strong></div>
                                            <div className="price-row"><span>GST (5%)</span><strong>₹{gst}</strong></div>
                                            <div className="price-row"><span>Payment Fee ({paymentMeta.label})</span><strong>{paymentFee ? `₹${paymentFee}` : 'FREE'}</strong></div>
                                            {deliveryProtection ? <div className="price-row"><span>Delivery Protection</span><strong>₹{protectionCharge}</strong></div> : null}
                                            {giftWrap ? <div className="price-row"><span>Luxury Gift Wrap</span><strong>₹{giftWrapCharge}</strong></div> : null}
                                            {ecoPackaging ? <div className="price-row"><span>Eco Packaging</span><strong>₹{ecoCharge}</strong></div> : null}
                                            {appliedCoupon.code && appliedCoupon.discount > 0 ? (
                                                <div className="price-row text-success">
                                                    <span>Coupon ({appliedCoupon.code})</span>
                                                    <strong>-₹{appliedCoupon.discount}</strong>
                                                </div>
                                            ) : null}
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>

                                <div className="savings-chip mt-3 mb-3">You save ₹{Math.max(0, totalSavings)} on this order</div>

                                <motion.div className="payable-hero" whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                                    <div>
                                        <p className="mb-1">Payable Amount</p>
                                        <h3 className="mb-0">₹{final}</h3>
                                        <small>From pre-discount total ₹{preDiscountTotal}</small>
                                    </div>
                                    <span className="payable-flag">SECURE</span>
                                </motion.div>
                            </motion.div>

                            <motion.div className="trust-grid mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }}>
                                <div>Secure Checkout</div>
                                <div>Easy Returns</div>
                                <div>Authentic Products</div>
                            </motion.div>

                            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} onClick={handlePaymentAndPlaceOrder} disabled={placingOrder || paymentProcessing || cart.length === 0} className="btn btn-info btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold premium-place-btn">
                                {placingOrder || paymentProcessing
                                    ? (mode === 'COD' ? 'Placing Order...' : 'Opening Razorpay...')
                                    : (mode === 'COD' ? `Place Order - ₹${final.toLocaleString('en-IN')}` : `Pay & Place Order - ₹${final.toLocaleString('en-IN')}`)}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </section>
            <style dangerouslySetInnerHTML={{ __html: `
                .checkout-page-shell {
                    background:
                        radial-gradient(circle at 0% 0%, rgba(191, 219, 254, 0.34), transparent 35%),
                        radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.24), transparent 32%),
                        linear-gradient(180deg, #f5f7fa 0%, #edf2f7 100%);
                }
                .checkout-hero-band {
                    background: linear-gradient(120deg, #111827, #1f2937 50%, #0f172a);
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
                .eta-chip {
                    padding: 8px 14px;
                    border-radius: 999px;
                    background: #ffffff;
                    border: 1px solid #d7dee8;
                    color: #334155;
                    font-size: 0.9rem;
                }
                .verified-pill {
                    border-radius: 999px;
                    padding: 5px 10px;
                    background: #e6fffa;
                    border: 1px solid #99f6e4;
                    color: #0f766e;
                    font-size: 12px;
                    font-weight: 700;
                }
                .address-edit-link {
                    border: 1px solid #bae6fd;
                    background: linear-gradient(90deg, #f0f9ff, #ecfeff);
                    color: #0e7490;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.2px;
                    border-radius: 999px;
                    padding: 6px 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.22s ease;
                }
                .address-edit-link::before {
                    content: '✎';
                    font-size: 12px;
                    line-height: 1;
                }
                .address-edit-link:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 16px rgba(14, 116, 144, 0.16);
                    border-color: #67e8f9;
                    color: #0f766e;
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
                .sticky-summary {
                    position: sticky;
                    top: 24px;
                }
                .checkout-total-box {
                    border: 1px solid #e4e8ee;
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                }
                .cost-header {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .cost-header p {
                    font-weight: 800;
                    color: #0f172a;
                    font-size: 0.95rem;
                    text-align: center;
                }
                .transparent-pill-wrap {
                    display: flex;
                    justify-content: center;
                }
                .transparent-pill-wrap span {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #155e75;
                    background: #e0f2fe;
                    border: 1px solid #bae6fd;
                    padding: 6px 12px;
                    border-radius: 999px;
                }
                .price-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    color: #334155;
                    font-size: 0.95rem;
                }
                .price-accordion-btn {
                    width: 100%;
                    border: 1px solid #bfdbfe;
                    border-radius: 10px;
                    background: linear-gradient(90deg, #eff6ff, #f8fafc);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 10px;
                    margin-bottom: 10px;
                    color: #0f172a;
                    font-size: 13px;
                    font-weight: 700;
                }
                .price-row strong {
                    color: #0f172a;
                }
                .savings-chip {
                    border: 1px solid #86efac;
                    background: #f0fdf4;
                    color: #15803d;
                    border-radius: 999px;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 800;
                    display: inline-flex;
                }
                .payable-hero {
                    margin-top: 4px;
                    border: 1px solid #99f6e4;
                    background: linear-gradient(120deg, #ecfeff, #f0f9ff 55%, #f8fafc);
                    border-radius: 14px;
                    padding: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 12px 20px rgba(2, 132, 199, 0.08);
                }
                .payable-hero p {
                    color: #0e7490;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.7px;
                    font-weight: 800;
                }
                .payable-hero h3 {
                    color: #0284c7;
                    font-size: 2rem;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                }
                .payable-hero small {
                    color: #64748b;
                    font-size: 12px;
                }
                .payable-flag {
                    border: 1px solid #cbd5e1;
                    border-radius: 999px;
                    background: #ffffff;
                    color: #0f172a;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.6px;
                    padding: 6px 10px;
                    align-self: flex-start;
                }
                .checkout-item-row {
                    display: grid;
                    grid-template-columns: 68px 1fr auto;
                    gap: 12px;
                    align-items: center;
                    padding: 10px;
                    border: 1px solid #e5ebf2;
                    border-radius: 14px;
                    margin-bottom: 10px;
                    background: #ffffff;
                }
                .checkout-item-row:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 14px rgba(15, 23, 42, 0.07);
                }
                .line-meta {
                    font-size: 12px;
                    color: #64748b;
                }
                .line-highlight-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 6px;
                }
                .qty-pill {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 62px;
                    border-radius: 999px;
                    background: linear-gradient(90deg, #0ea5b7, #0284c7);
                    color: #fff;
                    font-size: 11px;
                    font-weight: 800;
                    padding: 4px 8px;
                    letter-spacing: 0.3px;
                }
                .sku-pill {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    background: #eef2ff;
                    color: #334155;
                    border: 1px solid #c7d2fe;
                    padding: 3px 8px;
                    font-size: 11px;
                    font-weight: 700;
                    max-width: fit-content;
                }
                .item-total {
                    color: #0284c7;
                    font-size: 1.2rem;
                    font-weight: 800;
                }
                .payment-selector {
                    width: 100%;
                    border: 1.5px solid rgba(148, 163, 184, 0.35);
                    background: #ffffff;
                    display: flex;
                    gap: 12px;
                    justify-content: space-between;
                    align-items: center;
                    text-align: left;
                    padding: 12px 14px;
                    border-radius: 14px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .payment-selector:hover {
                    border-color: #67e8f9;
                    background: #f8fbff;
                }
                .payment-selector.is-selected {
                    border-color: #0891b2;
                    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.16);
                    background: linear-gradient(130deg, rgba(240, 249, 255, 0.85), rgba(224, 242, 254, 0.66));
                }
                .payment-radio {
                    width: 18px;
                    height: 18px;
                    border-radius: 999px;
                    border: 2px solid #94a3b8;
                    position: relative;
                    flex-shrink: 0;
                }
                .payment-selector.is-selected .payment-radio {
                    border-color: #0891b2;
                }
                .payment-selector.is-selected .payment-radio::after {
                    content: '';
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: #0891b2;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                .payment-copy {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }
                .payment-copy strong { display: block; }
                .payment-copy small { display: block; color: #64748b; }
                .pay-badge {
                    font-size: 11px;
                    font-weight: 800;
                    border-radius: 999px;
                    padding: 4px 8px;
                    background: #fff7ed;
                    color: #9a3412;
                    border: 1px solid #fed7aa;
                }
                .premium-extras {
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 14px;
                    background: #f8fafc;
                }
                .shipping-options-card {
                    background: linear-gradient(140deg, #f8fafc, #f1f5f9);
                    border-color: #d9e2ec;
                }
                .shipping-options-head {
                    border-bottom: 1px dashed #cbd5e1;
                    padding-bottom: 8px;
                }
                .shipping-options-title {
                    font-size: 1rem;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: 0.2px;
                }
                .shipping-options-subtitle {
                    font-size: 12px;
                    color: #64748b;
                }
                .shipping-option-row {
                    padding: 12px 0;
                }
                .extra-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 0;
                    border-bottom: 1px dashed #d5deea;
                    margin-bottom: 6px;
                }
                .extra-row small {
                    display: block;
                    color: #64748b;
                }
                .price-tag {
                    font-weight: 800;
                    color: #0f766e;
                }
                .premium-note-input {
                    border-radius: 12px;
                    border: 1px solid #dbe4ef;
                    background: #f9fbfd;
                }
                .delivery-slot-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 8px;
                }
                .slot-btn {
                    border: 1px solid #dbe4ef;
                    border-radius: 10px;
                    background: #ffffff;
                    padding: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #334155;
                    transition: all 0.2s ease;
                }
                .slot-btn-active {
                    background: linear-gradient(90deg, #ecfeff, #eff6ff);
                    border-color: #67e8f9;
                    color: #0f766e;
                    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.16);
                }
                .timeline-wrap {
                    border: 1px solid #dce5ef;
                    border-radius: 12px;
                    background: #f8fafc;
                    padding: 10px;
                }
                .timeline-row {
                    display: grid;
                    grid-template-columns: 22px 1fr;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .timeline-row:last-child { margin-bottom: 0; }
                .timeline-dot-wrap {
                    position: relative;
                    display: flex;
                    justify-content: center;
                }
                .timeline-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 999px;
                    background: linear-gradient(90deg, #0ea5b7, #0284c7);
                    margin-top: 3px;
                }
                .timeline-line {
                    position: absolute;
                    top: 15px;
                    width: 2px;
                    bottom: -8px;
                    background: #bfdbfe;
                }
                .timeline-content strong {
                    display: block;
                    font-size: 13px;
                    color: #0f172a;
                    font-weight: 800;
                }
                .timeline-content small {
                    color: #64748b;
                    font-size: 12px;
                }
                .luxury-info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
                }
                .luxury-info-card {
                    border: 1px solid #dce5ef;
                    border-radius: 12px;
                    background: linear-gradient(140deg, #ffffff, #f8fafc);
                    padding: 10px;
                    box-shadow: 0 10px 16px rgba(15, 23, 42, 0.05);
                }
                .luxury-info-card h6 {
                    margin-bottom: 6px;
                    font-weight: 800;
                    color: #0f172a;
                    font-size: 0.9rem;
                }
                .luxury-info-card p {
                    margin-bottom: 0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.5;
                }
                .item-count-pill {
                    border-radius: 999px;
                    background: #0ea5b7;
                    color: #fff;
                    padding: 6px 10px;
                    font-size: 12px;
                    font-weight: 700;
                }
                .trust-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 8px;
                }
                .trust-grid div {
                    border: 1px solid #dce5ef;
                    border-radius: 10px;
                    padding: 8px;
                    text-align: center;
                    font-size: 12px;
                    font-weight: 700;
                    color: #334155;
                    background: #f8fafc;
                }
                .premium-place-btn {
                    background: linear-gradient(90deg, #0ea5b7, #0284c7) !important;
                    border: none !important;
                    letter-spacing: 0.6px;
                    font-size: 1.02rem;
                }
                .premium-place-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 26px rgba(2, 132, 199, 0.34);
                }
                .premium-scroll::-webkit-scrollbar { width: 8px; }
                .premium-scroll::-webkit-scrollbar-thumb { background: #d4dbe4; border-radius: 999px; }
                @media (max-width: 1199.98px) {
                    .sticky-summary { position: static; }
                }
                @media (max-width: 767.98px) {
                    .checkout-headline h3 { font-size: 1.25rem; }
                    .checkout-item-row { grid-template-columns: 58px 1fr; }
                    .item-total { grid-column: span 2; text-align: right; }
                    .trust-grid { grid-template-columns: 1fr; }
                    .delivery-slot-grid { grid-template-columns: 1fr; }
                    .luxury-info-grid { grid-template-columns: 1fr; }
                    .extra-row { align-items: flex-start; }
                    .payable-hero { flex-direction: column; align-items: flex-start; }
                    .payable-hero h3 { font-size: 1.7rem; }
                }
            `}} />
        </div>
    )
}