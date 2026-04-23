import React, { useState, useEffect, useMemo, useCallback } from 'react'
import AddressSelection from './AddressSelection';
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { clearCart, getCart } from "../Store/ActionCreaters/CartActionCreators"
import { useMembership } from './MembershipContext'
import { motion, AnimatePresence } from 'framer-motion'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { BASE_URL } from '../constants'
import { createRazorpayOrderAPI, getRazorpayConfigAPI, verifyRazorpayPaymentAPI } from '../Store/Services'
import { X, Crosshair, ShieldCheck, RotateCcw, Award, CalendarCheck, Sparkles } from 'lucide-react'
import { useToast } from './ToastNotification';

// Utility to dynamically load Razorpay script
function loadRazorpayScript(src = "https://checkout.razorpay.com/v1/checkout.js") {
    return new Promise((resolve) => {
        // Check if script already exists
        if (document.querySelector(`script[src='${src}']`)) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
}

export default function Checkout() {
    // Address selection state
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editAddress, setEditAddress] = useState(null);
    const [addressFormData, setAddressFormData] = useState({
        fullName: '', phone: '', addressline1: '', addressline2: '', landmark: '', city: '', state: '', pin: '', type: 'Home'
    });
    const [locationLoading, setLocationLoading] = useState(false);
    const [mapCoords, setMapCoords] = useState(null);
    const location = useLocation();
    const [mode, setMode] = useState("UPI")
    const [user, setuser] = useState({})
    const [cart, setcart] = useState([])
    const [deliveryEstimate, setDeliveryEstimate] = useState({ pincode: '', estimatedDate: null, label: '' })
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
    const [showPromoBanner, setShowPromoBanner] = useState(true)

    const userState = useSelector((state) => state.UserStateData)
    const cartState = useSelector((state) => state.CartStateData)
    const users = userState || []
    const carts = cartState?.items || []
    const cartDeliveryEstimate = cartState?.deliveryEstimate || {}
    const { membershipType } = useMembership()

    const dispatch = useDispatch()
    const navigate = useNavigate()

    const toast = useToast();

    useEffect(() => {
        const timer = setTimeout(() => setShowPromoBanner(false), 20000);
        return () => clearTimeout(timer);
    }, []);

    // Handler for Add/Edit/Delete address
    const handleAddAddress = useCallback(() => {
        setEditAddress(null);
        setShowAddressModal(true);
    }, []);
    const handleEditAddress = useCallback((address) => {
        setEditAddress(address);
        setShowAddressModal(true);
    }, []);
    const handleDeleteAddress = useCallback((addressId) => {
        // Always delete directly and show toast notification
        axios.delete(`${BASE_URL}/api/user/${user?._id || user?.id}/addresses/${addressId}`)
            .then(() => {
                toast.success('Address deleted successfully!');
                window.location.reload();
            })
            .catch(() => toast.error('Failed to delete address'));
    }, [membershipType, user, toast]);

    useEffect(() => {
        if (editAddress) {
            setAddressFormData({
                fullName: editAddress.fullName || '',
                phone: editAddress.phone || '',
                addressline1: editAddress.addressline1 || '',
                addressline2: editAddress.addressline2 || '',
                landmark: editAddress.landmark || '',
                city: editAddress.city || '',
                state: editAddress.state || '',
                pin: editAddress.pin || '',
                type: editAddress.type || 'Home'
            });
        } else {
            setAddressFormData({ fullName: '', phone: '', addressline1: '', addressline2: '', landmark: '', city: '', state: '', pin: '', type: 'Home' });
        }
    }, [editAddress, showAddressModal]);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }
        setLocationLoading(true);
        toast.info('Detecting precise location... 🛰️');

        const options = {
            enableHighAccuracy: true, 
            timeout: 15000,           
            maximumAge: 0             
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    setMapCoords({ lat: latitude, lng: longitude });
                    
                    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en&addressdetails=1&zoom=18`);
                    
                    const data = response.data;
                    const addr = data.address || {};

                    // Deep & Accurate Location Extraction
                    const house = addr.house_number || "";
                    const premise = addr.amenity || addr.building || addr.shop || addr.office || addr.historic || "";
                    const street = addr.road || addr.street || addr.pedestrian || addr.path || "";
                    const area = addr.neighbourhood || addr.residential || addr.suburb || "";
                    const district = addr.city_district || addr.district || addr.county || "";

                    // Combine all detailed parts into Address Line 1
                    const fullAddressParts = [];
                    if (house) fullAddressParts.push(`House No. ${house}`);
                    if (premise) fullAddressParts.push(premise);
                    if (street) fullAddressParts.push(street);
                    if (area) fullAddressParts.push(area);
                    if (district) fullAddressParts.push(district);

                    const fullAddress = [...new Set(fullAddressParts)].filter(Boolean).join(", ");

                    const landmark = addr.point_of_interest || addr.landmark || addr.commercial || "";

                    // Title Case Helper
                    const toTitle = (str) => str ? str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "";

                    setAddressFormData(prev => ({
                        ...prev,
                        addressline1: toTitle(fullAddress) || prev.addressline1,
                        // Keeping addressline2 as is, since it's optional for flat/apt numbers
                        landmark: toTitle(landmark) || prev.landmark,
                        city: toTitle(addr.city || addr.town || addr.village || addr.municipality),
                        state: toTitle(addr.state),
                        pin: addr.postcode || prev.pin
                    }));

                    toast.success('📍 Highly accurate live location fetched!');

                } catch (error) {
                    toast.error('Could not fetch precise address details.');
                } finally {
                    setLocationLoading(false);
                }
            },
            (error) => {
                toast.error('Location Access Denied or Weak GPS Signal.');
                setLocationLoading(false);
            },
            options
        );
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();

        // Manual Input Validations
        const phoneRegex = /^[0-9]{10}$/;
        const pinRegex = /^[0-9]{6}$/;

        if (!phoneRegex.test(addressFormData.phone)) {
            return toast.error("Please enter a valid 10-digit phone number.");
        }
        if (addressFormData.addressline1.length < 5) {
            return toast.error("Address Line 1 must be at least 5 characters long.");
        }
        if (!pinRegex.test(addressFormData.pin)) {
            return toast.error("Please enter a valid 6-digit Pincode.");
        }
        if (addressFormData.city.length < 2 || addressFormData.state.length < 2) {
            return toast.error("Please enter a valid City and State.");
        }

        try {
            // If the ID starts with 'default-', treat it as a new address rather than an update
            if (editAddress && editAddress._id && !String(editAddress._id).startsWith('default-')) {
                await axios.put(`${BASE_URL}/api/user/${user?._id || user?.id}/addresses/${editAddress._id}`, addressFormData);
                toast.success('Address updated successfully!');
            } else {
                await axios.post(`${BASE_URL}/api/user/${user?._id || user?.id}/addresses`, addressFormData);
                toast.success('Address added successfully!');
            }
            setShowAddressModal(false);
            window.location.reload(); // Refresh the address selection context
        } catch (error) {
            console.error("Error saving address:", error);
            toast.error("Failed to save address. Please try again.");
        }
    };

    const paymentMeta = useMemo(() => {
        if (mode === 'Card') return { label: 'Card / NetBanking', fee: 0 }
        if (mode === 'COD') return { label: 'Cash on Delivery', fee: 49 }
        return { label: 'UPI / Wallet', fee: 0 }
    }, [mode])

    const { gst, giftWrapCharge, protectionCharge, ecoCharge, paymentFee, instantDiscount, preDiscountTotal, totalSavings } = useMemo(() => {
        const calcGst = Math.round(subtotal * 0.05)
        const calcGift = giftWrap ? 99 : 0
        const calcProtection = deliveryProtection ? 49 : 0
        const calcEco = ecoPackaging ? 19 : 0
        const calcFee = paymentMeta.fee
        
        let calcInstant = 0
        if (mode === 'Card') {
            calcInstant = Math.round(subtotal * 0.10) // 10% Discount for Cards
        } else if (mode === 'UPI') {
            calcInstant = 50 // Flat ₹50 Discount for UPI
        }
        calcInstant = Math.min(subtotal, calcInstant) // Ensure discount doesn't exceed subtotal

        return {
            gst: calcGst,
            giftWrapCharge: calcGift,
            protectionCharge: calcProtection,
            ecoCharge: calcEco,
            paymentFee: calcFee,
            instantDiscount: calcInstant,
            preDiscountTotal: subtotal + shipping + calcGst + calcGift + calcProtection + calcEco + calcFee,
            totalSavings: Number(appliedCoupon.discount || 0) + Number(calcInstant || 0)
        }
    }, [subtotal, shipping, giftWrap, deliveryProtection, ecoPackaging, paymentMeta.fee, appliedCoupon.discount, mode])

    useEffect(() => {
        dispatch(getUser())
        if (!location.state?.direct) {
            dispatch(getCart())
        }
    }, [dispatch, location.state?.direct])

    useEffect(() => {
        const userId = localStorage.getItem("userid")
        const userData = users.find((item) => String(item.id || item._id) === String(userId))
        if (userData) setuser(userData)
    }, [users])

    useEffect(() => {
        // Direct checkout logic
        const directCheckout = location.state?.direct && sessionStorage.getItem('directCheckoutProduct');
        if (directCheckout) {
            try {
                const product = JSON.parse(sessionStorage.getItem('directCheckoutProduct'));
                setcart([product]);
                let sum = Number(product.price || 0) * Number(product.quantity || 1);
                const ship = membershipType === 'Elite' ? 0 : ((sum > 0 && sum < 1000) ? 150 : 0);
                setSubtotal(sum);
                setshipping(ship);
                setAppliedCoupon({ code: '', discount: 0 });
            } catch {
                setcart([]);
                setSubtotal(0);
                setshipping(0);
            }
            return;
        }

        // Get deliveryEstimate from Redux cart state (backend value)
        if (cartDeliveryEstimate && cartDeliveryEstimate.estimatedDate) {
            setDeliveryEstimate(cartDeliveryEstimate)
        } else {
            setDeliveryEstimate({ pincode: '', estimatedDate: null, label: '' })
        }

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
                    const userId = localStorage.getItem("userid")
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
    }, [location.state?.direct, membershipType, cartDeliveryEstimate, carts])

    const final = useMemo(() => {
        return Math.max(
            0,
            subtotal + shipping + gst + giftWrapCharge + protectionCharge + ecoCharge + paymentFee - Number(appliedCoupon.discount || 0) - instantDiscount
        )
    }, [subtotal, shipping, gst, giftWrapCharge, protectionCharge, ecoCharge, paymentFee, appliedCoupon.discount, instantDiscount])

    const totalItems = useMemo(() => {
        return cart.reduce((acc, item) => acc + Number(item.quantity ?? item.qty ?? 1), 0)
    }, [cart])

    // Use backend deliveryEstimate from cart (same as Cart page)
    const estimatedDelivery = useMemo(() => {
        if (deliveryEstimate && deliveryEstimate.estimatedDate) {
            const dt = new Date(deliveryEstimate.estimatedDate)
            return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
        }
        
        // Standard fallback ETA (4 days) for Direct Buy or if backend estimate is unavailable
        const defaultDt = new Date()
        defaultDt.setDate(defaultDt.getDate() + 4)
        return defaultDt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    }, [deliveryEstimate])

    // Real-time update: whenever cartDeliveryEstimate changes, update deliveryEstimate state
    useEffect(() => {
        if (cartDeliveryEstimate && cartDeliveryEstimate.estimatedDate) {
            setDeliveryEstimate(cartDeliveryEstimate)
        }
    }, [cartDeliveryEstimate])

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

    async function placeOrder(paymentDetails = {}) {
        if (!selectedAddressId) {
            toast.error('Please select a delivery address to continue.');
            return false;
        }

        // If direct checkout, clear the sessionStorage after order
        if (location.state?.direct) {
            sessionStorage.removeItem('directCheckoutProduct');
        }
        let isSuccess = false;
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

            const selectedAddress = addresses.find(a => a._id === selectedAddressId) || addresses[0] || null;
            const addressPayload = selectedAddress ? {
                fullName: selectedAddress.fullName || user?.name || '',
                phone: selectedAddress.phone || user?.phone || '',
                addressline1: selectedAddress.addressline1 || '',
                addressline2: selectedAddress.addressline2 || '',
                landmark: selectedAddress.landmark || '',
                city: selectedAddress.city || '',
                state: selectedAddress.state || '',
                pin: selectedAddress.pin || '',
                country: 'India',
                addressId: selectedAddress._id !== 'default-1' ? selectedAddress._id : undefined
            } : {
                fullName: user?.name || '',
                phone: user?.phone || '',
                addressline1: user?.addressline1 || '',
                addressline2: user?.addressline2 || '',
                landmark: user?.landmark || '',
                city: user?.city || '',
                state: user?.state || '',
                pin: user?.pin || '',
                country: 'India'
            };

            const payload = {
                userId: userid,
                selectedAddressID: selectedAddress?._id !== 'default-1' ? selectedAddress?._id : undefined,
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
                shippingAddress: addressPayload,
                products: normalizedProducts
            }

            const response = await axios.post(`${BASE_URL}/api/place-order`, payload, { timeout: 20000 })
            const responseData = response?.data || {};
            const placedOrder = responseData.order || responseData;

            if (placedOrder && (placedOrder.orderId || placedOrder._id || responseData.success)) {
                isSuccess = true;
                localStorage.setItem('lastPlacedOrder', JSON.stringify(placedOrder))
                localStorage.removeItem('appliedCoupon')
                if (!location.state?.direct) {
                    dispatch(clearCart({ userid }))
                }
                window.dispatchEvent(new Event('membership-updated'))
                toast.success("Order Placed Successfully! 🎉");
                navigate("/confirmation", { replace: true, state: { order: placedOrder, direct: location.state?.direct } })
                return true;
            }

            toast.error('Order place nahi ho paya. Please try again.')
            return false;
        } catch (error) {
            const message = error?.response?.data?.message || 'Order place karte waqt issue aaya. Please try again.'
            toast.error(message)
            return false;
        } finally {
            if (!isSuccess) {
                setplacingOrder(false)
            }
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
                toast.error('Payable amount invalid hai! Amount: ' + final + '. Please refresh checkout or contact support.');
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
                name: 'Eshopper Boutique',
                description: 'Exquisite Luxury Selection • Secured by eShopper Boutique',
                image: 'https://cdn.jsdelivr.net/gh/theafzalhussain/eshopper-assets/eshopper-boutique-luxe-header.png', // E SHOPPER BOUTIQUE LUXE logo matching header/footer
                order_id: razorpayOrder.id,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: user?.phone || ''
                },
                notes: {
                    userId: String(userId || ''),
                    paymentMethod: mode,
                    cartItems: String(cart.length),
                    brand: 'Eshopper Boutique',
                    experience: 'Premium Luxury Checkout'
                },
                theme: {
                    color: '#D4AF37', // Gold
                    hide_topbar: false,
                    backdrop_color: '#fff8e1', // Subtle luxury background
                },
                retry: { enabled: true, max_count: 3 },
                method: { upi: true, card: true, netbanking: true, wallet: true },
                modal: {
                    ondismiss: () => setPaymentProcessing(false),
                    handle_back: true // Prevent accidental exits
                },
                handler: async (response) => {
                    let isOrderSuccess = false;
                    try {
                        const verifyResponse = await verifyRazorpayPaymentAPI({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })

                        if (!verifyResponse?.success) {
                            throw new Error(verifyResponse?.message || 'Payment verification failed')
                        }

                        isOrderSuccess = await placeOrder({
                            paymentMethod: mode,
                            paymentStatus: 'Paid',
                            paidAt: new Date().toISOString(),
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        })
                    } catch (paymentError) {
                        console.error('Razorpay verification/order error:', paymentError)
                        toast.error(paymentError?.message || 'Payment verified but order could not be placed. Please contact support.')
                    } finally {
                        if (!isOrderSuccess) {
                            setPaymentProcessing(false)
                        }
                    }
                }
            }

            const razorpayInstance = new window.Razorpay(options)
            razorpayInstance.on('payment.failed', (response) => {
                console.error('Razorpay payment failed:', response?.error)
                setPaymentProcessing(false)
                toast.error(response?.error?.description || 'Payment failed. Please try again.')
            })
            razorpayInstance.open()
        } catch (error) {
            console.error('Razorpay checkout error:', error)
            toast.error(error?.message || 'Unable to start payment checkout.')
            setPaymentProcessing(false)
        }
    }

    return (
        <div className="checkout-page-shell" style={{ minHeight: "100vh" }}>
            <AnimatePresence>
                {showPromoBanner && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20, height: 0, padding: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.4 }}
                        className="text-center py-2 font-weight-bold shadow-sm"
                        style={{ background: 'linear-gradient(90deg, #fef3c7, #fde68a, #fef3c7)', color: '#92400e', fontSize: '13.5px', letterSpacing: '0.5px', borderBottom: '1px solid #fcd34d' }}
                    >
                        ✨ Save extra by paying online! Get Flat ₹50 off on UPI & 10% off on Cards.
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="py-5 text-center mb-5 checkout-hero-band">
                <h1 className="text-white luxury-serif display-4">Secure Checkout</h1>
                <p className="text-gold small text-uppercase" style={{ letterSpacing: '3px' }}>The Final Step to Your Luxury Experience</p>
            </div>

            <section className="container pb-5">
                <div className="checkout-headline mb-4 d-flex flex-wrap justify-content-between align-items-end gap-3">
                    <div>
                        <span className="checkout-pill"><ShieldCheck size={14} className="mr-1" /> Premium Checkout</span>
                        <h3 className="mb-1 luxury-serif">Complete Your Order</h3>
                        <p className="mb-0 text-muted">Review your curated selection and finalize details.</p>
                    </div>
                    <div className="eta-chip d-flex align-items-center gap-2">
                        <CalendarCheck size={16} className="text-gold" style={{marginTop: '-2px'}}/> 
                        <span>Guaranteed Delivery: <strong className="text-dark">{estimatedDelivery || '—'}</strong></span>
                    </div>
                </div>

                <div className="row">
                    <motion.div
                        className="col-xl-7 col-lg-7 mb-4"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="card border-0 shadow-sm rounded-2xl p-4 bg-white h-100 checkout-panel">
                            <AddressSelection
                                userId={user?._id || user?.id}
                                selectedAddressId={selectedAddressId}
                                setSelectedAddressId={setSelectedAddressId}
                                onEdit={handleEditAddress}
                                onDelete={handleDeleteAddress}
                                onAdd={handleAddAddress}
                                onAddressesLoaded={setAddresses}
                            />

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
                                        <span className="price-tag text-gold">₹49</span>
                                        <input type="checkbox" checked={deliveryProtection} onChange={(e) => setDeliveryProtection(e.target.checked)} />
                                    </span>
                                </label>
                                <label className="extra-row shipping-option-row mb-0">
                                    <span>
                                        <strong>🎁 Gift Wrapping</strong>
                                        <small>Premium wrapping with message card</small>
                                    </span>
                                    <span className="d-flex align-items-center gap-2">
                                        <span className="price-tag text-gold">₹99</span>
                                        <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
                                    </span>
                                </label>
                                <label className="extra-row mb-0 mt-2">
                                    <span>
                                        <strong>Eco Packaging</strong>
                                        <small>Plastic-free sustainable packaging</small>
                                    </span>
                                    <span className="d-flex align-items-center gap-2">
                                        <span className="price-tag text-gold">₹19</span>
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

                            <motion.h5 className="font-weight-bold mb-3 mt-4 luxury-serif" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.3 }}>Payment Methods</motion.h5>
                            <motion.div className="mb-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
                                <button type="button" className={`payment-selector ${mode === 'UPI' ? 'is-selected' : ''}`} onClick={() => setMode('UPI')}>
                                    <span className="payment-radio" />
                                    <span className="payment-copy"><strong>UPI / Wallet</strong><small className="text-success font-weight-bold">Flat ₹50 Instant Discount</small></span>
                                    <span className="pay-badge text-success border-success bg-light">-₹50</span>
                                </button>
                                <button type="button" className={`payment-selector ${mode === 'Card' ? 'is-selected' : ''}`} onClick={() => setMode('Card')}>
                                    <span className="payment-radio" />
                                    <span className="payment-copy"><strong>Cards / NetBanking</strong><small className="text-success font-weight-bold">Get 10% Instant Discount</small></span>
                                    <span className="pay-badge text-success border-success bg-light">-10%</span>
                                </button>
                                <button type="button" className={`payment-selector ${mode === 'COD' ? 'is-selected' : ''}`} onClick={() => setMode('COD')}>
                                    <span className="payment-radio" />
                                    <span className="payment-copy"><strong>Cash on Delivery</strong><small>Pay at doorstep (Extra Fee)</small></span>
                                    <span className="pay-badge">₹49</span>
                                </button>
                            </motion.div>

                            <motion.div className="mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.3 }}>
                                <h6 className="font-weight-bold mb-2 luxury-serif">Select Delivery Slot</h6>
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

                                <h6 className="font-weight-bold mb-2 mt-4 luxury-serif">Order Timeline</h6>
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
                                <h4 className="luxury-serif mb-0">Order Summary</h4>
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
                                <div className="transparent-pill-wrap mb-3"><span className="text-gold border-gold">Transparent Pricing</span></div>

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

                                <div className="premium-payable-wrapper mt-4 mb-4">
                                    {Math.max(0, totalSavings) > 0 && (
                                        <motion.div 
                                            className="savings-highlight-bar"
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            <div className="savings-content">
                                                <Sparkles size={16} className="text-warning mr-1" style={{ fill: '#fbbf24' }} />
                                                <span>You save <strong className="savings-amount">₹{Math.max(0, totalSavings).toLocaleString('en-IN')}</strong> on this luxury order!</span>
                                            </div>
                                        </motion.div>
                                    )}
                                    <motion.div className="payable-hero" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                                        <div className="payable-content-wrapper">
                                            <div className="payable-left-section">
                                                <p className="payable-label">Final Payable Amount</p>
                                                <div className="payable-price-row">
                                                    <h3 className="payable-amount luxury-serif">₹{final.toLocaleString('en-IN')}</h3>
                                                    <small className="payable-mrp">MRP ₹{preDiscountTotal.toLocaleString('en-IN')}</small>
                                                </div>
                                            </div>
                                            <div className="payable-right-section">
                                                <div className="payable-secure-badge">
                                                    <ShieldCheck size={14} className="mr-1"/> 
                                                    <span>100% SECURE</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>

                            <motion.div className="trust-grid mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }}>
                                <div className="trust-item">
                                    <ShieldCheck size={22} className="trust-icon text-success" />
                                    <span>100% Secure<br/>Checkout</span>
                                </div>
                                <div className="trust-item">
                                    <RotateCcw size={22} className="trust-icon text-warning" />
                                    <span>Easy 7-Day<br/>Returns</span>
                                </div>
                                <div className="trust-item">
                                    <Award size={22} className="trust-icon text-info" />
                                    <span>Authentic<br/>Products</span>
                                </div>
                            </motion.div>

                            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={handlePaymentAndPlaceOrder} disabled={placingOrder || paymentProcessing || cart.length === 0} className="btn btn-block btn-lg py-3 shadow-lg premium-place-btn">
                                {placingOrder || paymentProcessing
                                    ? (mode === 'COD' ? 'Placing Order...' : 'Opening Secure Portal...')
                                    : (mode === 'COD' ? `Place Order - ₹${final.toLocaleString('en-IN')}` : `Pay & Place Order - ₹${final.toLocaleString('en-IN')}`)}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <AnimatePresence>
                {showAddressModal && (
                    <div className="address-modal-overlay">
                        <motion.div 
                            className="address-modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="address-modal-header">
                                <h4>{editAddress ? 'Edit Address' : 'Add New Address'}</h4>
                                <button type="button" className="close-modal-btn" onClick={() => setShowAddressModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <button type="button" className="location-btn" onClick={handleUseCurrentLocation} disabled={locationLoading}>
                                <Crosshair size={16} /> {locationLoading ? 'Detecting Location...' : 'Use Current Location'}
                            </button>

                            {mapCoords && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        width: '100%',
                                        height: '220px',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        border: '1px solid rgba(212,175,55,0.3)',
                                        marginBottom: '24px',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <button 
                                        type="button" 
                                        onClick={() => setMapCoords(null)}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            background: '#fff',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                            zIndex: 10
                                        }}
                                        title="Close Map"
                                    >
                                        <X size={16} color="#111" />
                                    </button>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                                        title="Current Location"
                                    />
                                </motion.div>
                            )}

                            <form onSubmit={handleSaveAddress}>
                                <div className="row">
                                    <div className="col-12 mb-4">
                                        <div className="d-flex gap-4">
                                            <label className="lux-radio-label">
                                                <input type="radio" checked={addressFormData.type === 'Home'} onChange={() => setAddressFormData({...addressFormData, type: 'Home'})} />
                                                <span className="lux-radio-custom"></span> Home
                                            </label>
                                            <label className="lux-radio-label">
                                                <input type="radio" checked={addressFormData.type === 'Office'} onChange={() => setAddressFormData({...addressFormData, type: 'Office'})} />
                                                <span className="lux-radio-custom"></span> Office
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="lux-input-label">Full Name</label>
                                        <input type="text" className="form-control lux-input" required value={addressFormData.fullName} onChange={e => setAddressFormData({...addressFormData, fullName: e.target.value})} placeholder="Enter name" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="lux-input-label">Phone Number</label>
                                        <input type="text" className="form-control lux-input" required value={addressFormData.phone} onChange={e => setAddressFormData({...addressFormData, phone: e.target.value})} placeholder="10-digit number" />
                                    </div>
                                    <div className="col-12 mb-3">
                                        <label className="lux-input-label">Address Line 1</label>
                                        <input type="text" className="form-control lux-input" required value={addressFormData.addressline1} onChange={e => setAddressFormData({...addressFormData, addressline1: e.target.value})} placeholder="House No, Building, Street" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="lux-input-label">Address Line 2 <span className="text-lowercase text-muted" style={{fontWeight: 'normal'}}>(Optional)</span></label>
                                        <input type="text" className="form-control lux-input" value={addressFormData.addressline2} onChange={e => setAddressFormData({...addressFormData, addressline2: e.target.value})} placeholder="Apartment, Floor, Block" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="lux-input-label">Landmark <span className="text-lowercase text-muted" style={{fontWeight: 'normal'}}>(Optional)</span></label>
                                        <input type="text" className="form-control lux-input" value={addressFormData.landmark} onChange={e => setAddressFormData({...addressFormData, landmark: e.target.value})} placeholder="Nearby shop, mall, etc." />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="lux-input-label">City</label>
                                        <input type="text" className="form-control lux-input" required value={addressFormData.city} onChange={e => setAddressFormData({...addressFormData, city: e.target.value})} placeholder="City" />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="lux-input-label">State</label>
                                        <input type="text" className="form-control lux-input" required value={addressFormData.state} onChange={e => setAddressFormData({...addressFormData, state: e.target.value})} placeholder="State" />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="lux-input-label">Pincode</label>
                                        <input type="text" className="form-control lux-input" required value={addressFormData.pin} onChange={e => setAddressFormData({...addressFormData, pin: e.target.value})} placeholder="Pincode" />
                                    </div>
                                    <div className="col-12 mt-3">
                                        <button type="submit" className="lux-save-address-btn">Save Address</button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');

                .checkout-page-shell {
                    font-family: 'Jost', sans-serif;
                    background: linear-gradient(180deg, #fdfbf7 0%, #f4f0e6 100%);
                    color: #111;
                }
                .luxury-serif {
                    font-family: 'Playfair Display', serif;
                }
                .text-gold { color: #D4AF37 !important; }
                .border-gold { border-color: #D4AF37 !important; }
                .tracking-widest { letter-spacing: 0.1em; }

                .checkout-hero-band {
                    background: #0a0a0a;
                    border-bottom: 1px solid rgba(212,175,55,0.2);
                }
                .checkout-headline {
                    margin-top: -10px;
                }
                .checkout-headline h3 {
                    font-weight: 800;
                    color: #111;
                }
                .checkout-headline p {
                    color: #666;
                }
                .checkout-pill {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    padding: 6px 12px;
                    margin-bottom: 10px;
                    background: #111;
                    border: 1px solid #D4AF37;
                    color: #D4AF37;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .eta-chip {
                    padding: 8px 14px;
                    border-radius: 999px;
                    background: transparent;
                    border: 1px solid rgba(212,175,55,0.3);
                    color: #111;
                    font-size: 13px;
                }
                .verified-pill {
                    border-radius: 999px;
                    padding: 5px 10px;
                    background: rgba(212,175,55,0.08);
                    border: 1px solid rgba(212,175,55,0.4);
                    color: #9a7a20;
                    font-size: 12px;
                    font-weight: 700;
                }
                .address-edit-link {
                    border: 1px solid #111;
                    background: transparent;
                    color: #111;
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    border-radius: 999px;
                    padding: 6px 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.22s ease;
                    text-transform: uppercase;
                }
                .address-edit-link::before {
                    content: '✎';
                    font-size: 12px;
                    line-height: 1;
                }
                .address-edit-link:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 16px rgba(212, 175, 55, 0.16);
                    background: #111;
                    border-color: #111;
                    color: #D4AF37;
                }
                .rounded-2xl { border-radius: 25px !important; }
                .rounded-xl { border-radius: 15px !important; }
                .cursor-pointer { cursor: pointer; }
                .transition { transition: 0.3s all ease; }
                .object-fit-cover { object-fit: cover; }
                .checkout-panel {
                    border: 1px solid rgba(212,175,55,0.15);
                    background: #fff;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04) !important;
                }
                .sticky-summary {
                    position: sticky;
                    top: 24px;
                }
                .checkout-total-box {
                    border: 1px solid #eae5d9;
                    background: #fdfbf7;
                }
                .cost-header {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .cost-header p {
                    font-weight: 700;
                    color: #111;
                    font-size: 1rem;
                    text-align: center;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .transparent-pill-wrap {
                    display: flex;
                    justify-content: center;
                }
                .transparent-pill-wrap span {
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #D4AF37;
                    background: transparent;
                    border: 1px solid rgba(212,175,55,0.4);
                    padding: 6px 12px;
                    border-radius: 999px;
                }
                .price-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    color: #555;
                    font-size: 0.95rem;
                }
                .price-accordion-btn {
                    width: 100%;
                    border: 1px solid #eae5d9;
                    border-radius: 10px;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 10px;
                    margin-bottom: 10px;
                    color: #111;
                    font-size: 13px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .price-row strong {
                    color: #111;
                    font-weight: 600;
                }
                .premium-payable-wrapper {
                    position: relative;
                    margin-top: 2rem;
                }
                .savings-highlight-bar {
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border: 1px solid #86efac;
                    border-bottom: none;
                    border-radius: 16px 16px 0 0;
                    padding: 12px 16px 26px 16px;
                    margin-bottom: -16px;
                    color: #166534;
                    font-size: 13.5px;
                    text-align: center;
                    font-weight: 600;
                    box-shadow: inset 0 2px 10px rgba(255,255,255,0.6);
                    position: relative;
                    z-index: 1;
                }
                .savings-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    letter-spacing: 0.3px;
                }
                .savings-amount {
                    font-size: 16px;
                    color: #15803d !important;
                    font-weight: 900;
                    background: #bbf7d0;
                    padding: 2px 10px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(21,128,61,0.2);
                    margin-left: 6px;
                    margin-right: 2px;
                }
                .payable-hero {
                    position: relative;
                    z-index: 2;
                    border: 1px solid rgba(212,175,55,0.5);
                    background: linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0a0a0a 100%);
                    border-radius: 16px;
                    padding: 20px 24px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 24px rgba(212, 175, 55, 0.15), inset 0 1px 1px rgba(255,255,255,0.1);
                    overflow: hidden;
                }
                .payable-hero::before {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%;
                    width: 50%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.15), transparent);
                    animation: lux-shimmer 3s infinite linear;
                    pointer-events: none;
                }
                @keyframes lux-shimmer {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
                .payable-content-wrapper {
                    position: relative;
                    z-index: 3;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    gap: 16px;
                }
                .payable-label {
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-size: 11px;
                    color: #e8c97a;
                    font-weight: 700;
                }
                .payable-price-row {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                }
                .payable-amount {
                    margin: 0;
                    font-size: clamp(1.6rem, 4vw, 2.2rem);
                    color: #fff;
                    text-shadow: 0 4px 14px rgba(212,175,55,0.4);
                    line-height: 1.1;
                }
                .payable-mrp {
                    text-decoration: line-through;
                    color: #94a3b8;
                    font-size: clamp(12px, 2vw, 14px);
                    font-weight: 500;
                }
                .payable-right-section {
                    text-align: right;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    flex-shrink: 0;
                }
                .payable-secure-badge {
                    display: inline-flex;
                    align-items: center;
                    background: linear-gradient(135deg, #D4AF37 0%, #9A7A20 100%);
                    color: #000;
                    border-radius: 6px;
                    padding: 6px 10px;
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                    white-space: nowrap;
                }
                .checkout-item-row {
                    display: grid;
                    grid-template-columns: 68px 1fr auto;
                    gap: 12px;
                    align-items: center;
                    padding: 10px;
                    border: 1px solid #f0eee5;
                    border-radius: 14px;
                    margin-bottom: 10px;
                    background: #fff;
                }
                .checkout-item-row:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
                }
                .line-meta {
                    font-size: 12px;
                    color: #666;
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
                    background: #111;
                    color: #D4AF37;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 4px 8px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                .sku-pill {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    background: transparent;
                    color: #666;
                    border: 1px solid #e5e5e5;
                    padding: 3px 8px;
                    font-size: 10px;
                    font-weight: 500;
                    max-width: fit-content;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .item-total {
                    color: #111;
                    font-family: 'Playfair Display', serif;
                    font-size: 1.4rem;
                    font-weight: 700;
                }
                .payment-selector {
                    width: 100%;
                    border: 1px solid #e5e5e5;
                    background: #fff;
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
                    border-color: #D4AF37;
                    background: #fdfbf7;
                }
                .payment-selector.is-selected {
                    border-color: #D4AF37;
                    box-shadow: 0 0 0 1px #D4AF37;
                    background: #fdfbf7;
                }
                .payment-radio {
                    width: 18px;
                    height: 18px;
                    border-radius: 999px;
                    border: 1px solid #ccc;
                    position: relative;
                    flex-shrink: 0;
                }
                .payment-selector.is-selected .payment-radio {
                    border-color: #D4AF37;
                    background: transparent;
                }
                .payment-selector.is-selected .payment-radio::after {
                    content: '';
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: #D4AF37;
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
                .payment-copy small { display: block; color: #666; }
                .pay-badge {
                    font-size: 10px;
                    font-weight: 600;
                    border-radius: 999px;
                    padding: 4px 8px;
                    background: #111;
                    color: #D4AF37;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .premium-extras {
                    border: 1px solid rgba(212,175,55,0.15);
                    border-radius: 14px;
                    padding: 14px;
                    background: #fff;
                }
                .shipping-options-card {
                    background: #fdfbf7;
                }
                .shipping-options-head {
                    border-bottom: 1px solid rgba(212,175,55,0.15);
                    padding-bottom: 8px;
                }
                .shipping-options-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #111;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .shipping-options-subtitle {
                    font-size: 12px;
                    color: #666;
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
                    border-bottom: 1px dashed #eae5d9;
                    margin-bottom: 6px;
                }
                .extra-row small {
                    display: block;
                    color: #666;
                }
                .premium-note-input {
                    border-radius: 12px;
                    border: 1px solid #eae5d9;
                    background: #fff;
                    font-family: inherit;
                    font-size: 14px;
                    padding: 12px;
                }
                .premium-note-input:focus {
                    border-color: #D4AF37;
                    box-shadow: 0 0 0 1px #D4AF37;
                    outline: none;
                }
                .delivery-slot-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 8px;
                }
                .slot-btn {
                    border: 1px solid #eae5d9;
                    border-radius: 10px;
                    background: #ffffff;
                    padding: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #555;
                    transition: all 0.2s ease;
                }
                .slot-btn-active {
                    background: #fdfbf7;
                    border-color: #D4AF37;
                    color: #111;
                    box-shadow: 0 0 0 1px #D4AF37;
                    font-weight: 600;
                }
                .timeline-wrap {
                    border: 1px solid #eae5d9;
                    border-radius: 12px;
                    background: #fdfbf7;
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
                    background: #D4AF37;
                    margin-top: 3px;
                }
                .timeline-line {
                    position: absolute;
                    top: 15px;
                    width: 2px;
                    bottom: -8px;
                    background: rgba(212,175,55,0.2);
                }
                .timeline-content strong {
                    display: block;
                    font-size: 13px;
                    color: #111;
                    font-weight: 600;
                }
                .timeline-content small {
                    color: #666;
                    font-size: 12px;
                }
                .luxury-info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
                }
                .luxury-info-card {
                    border: 1px solid #eae5d9;
                    border-radius: 12px;
                    background: #fff;
                    padding: 10px;
                }
                .luxury-info-card h6 {
                    margin-bottom: 6px;
                    font-weight: 600;
                    color: #111;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .luxury-info-card p {
                    margin-bottom: 0;
                    color: #666;
                    font-size: 11px;
                    line-height: 1.5;
                }
                .item-count-pill {
                    border-radius: 999px;
                    background: transparent;
                    border: 1px solid #D4AF37;
                    color: #D4AF37;
                    padding: 6px 10px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .trust-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }
                .trust-item {
                    border: 1px solid #eae5d9;
                    border-radius: 12px;
                    padding: 12px 8px;
                    text-align: center;
                    font-size: 10px;
                    font-weight: 600;
                    color: #111;
                    background: #fff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .trust-icon {
                    margin-bottom: 2px;
                    color: #D4AF37 !important;
                }
                .premium-place-btn {
                    background: #111 !important;
                    color: #D4AF37 !important;
                    border: 1px solid #D4AF37 !important;
                    letter-spacing: 2px;
                    font-size: 13px;
                    text-transform: uppercase;
                    border-radius: 999px !important;
                    transition: all 0.3s ease;
                }
                .premium-place-btn:hover:not(:disabled) {
                    background: #D4AF37 !important;
                    color: #111 !important;
                    box-shadow: 0 10px 30px rgba(212,175,55,0.3) !important;
                }
                .premium-scroll::-webkit-scrollbar { width: 8px; }
                .premium-scroll::-webkit-scrollbar-thumb { background: #eae5d9; border-radius: 999px; }
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
                    .payable-hero { padding: 16px 20px; }
                    .payable-content-wrapper { flex-direction: column; align-items: flex-start; gap: 12px; }
                    .payable-right-section { align-items: flex-start; text-align: left; width: 100%; border-top: 1px solid rgba(212, 175, 55, 0.2); padding-top: 12px; }
                    .payable-hero h3 { font-size: 1.7rem; }
                }
                .address-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }
                .address-modal {
                        background: #fff;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 600px;
                    padding: 32px;
                    box-shadow: 0 32px 64px rgba(0,0,0,0.2);
                        border: 1px solid rgba(212,175,55,0.3);
                    max-height: 90vh;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                }
                .address-modal::-webkit-scrollbar { width: 6px; }
                    .address-modal::-webkit-scrollbar-thumb { background: #eae5d9; border-radius: 999px; }
                .address-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                        border-bottom: 1px solid rgba(212,175,55,0.15);
                    padding-bottom: 16px;
                }
                .address-modal-header h4 {
                    margin: 0;
                    font-family: 'Playfair Display', serif;
                        color: #111;
                        font-size: 1.8rem;
                }
                .close-modal-btn {
                        background: #fff;
                        border: 1px solid #e5e5e5;
                        color: #111;
                    cursor: pointer;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s ease;
                }
                .close-modal-btn:hover {
                        background: #111;
                        color: #D4AF37;
                        border-color: #111;
                    transform: rotate(90deg);
                }
                .location-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                        background: #111;
                        color: #D4AF37;
                    border: none;
                    border-radius: 12px;
                    padding: 12px 20px;
                    font-size: 13px;
                        font-weight: 600;
                        letter-spacing: 1px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.3s;
                    margin-bottom: 24px;
                    width: 100%;
                    justify-content: center;
                        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                }
                .location-btn:hover:not(:disabled) {
                        background: #D4AF37;
                        color: #111;
                }
                .location-btn:disabled {
                        background: #e5e5e5;
                        color: #999;
                    box-shadow: none;
                    cursor: not-allowed;
                }
                .lux-input-label {
                    font-size: 11px;
                        font-weight: 600;
                        color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 6px;
                }
                .lux-input {
                        border: 1px solid #e5e5e5 !important;
                    border-radius: 10px !important;
                    padding: 10px 14px !important;
                    font-size: 14px !important;
                        color: #111 !important;
                    transition: all 0.3s ease !important;
                        background: #fff !important;
                    box-shadow: none !important;
                }
                .lux-input:focus {
                    border-color: #D4AF37 !important;
                    background: #fff !important;
                        box-shadow: 0 0 0 1px #D4AF37 !important;
                }
                .lux-radio-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                        font-weight: 600;
                        color: #111;
                    font-size: 14px;
                }
                .lux-radio-label input {
                    display: none;
                }
                .lux-radio-custom {
                    width: 20px;
                    height: 20px;
                        border: 1px solid #ccc;
                    border-radius: 50%;
                    display: inline-block;
                    position: relative;
                    transition: all 0.2s ease;
                }
                .lux-radio-label input:checked + .lux-radio-custom {
                    border-color: #D4AF37;
                }
                .lux-radio-label input:checked + .lux-radio-custom::after {
                    content: '';
                    position: absolute;
                    inset: 4px;
                    background: #D4AF37;
                    border-radius: 50%;
                }
                .lux-save-address-btn {
                    width: 100%;
                        background: #111;
                    color: #D4AF37;
                    border: none;
                        border-radius: 999px;
                        padding: 16px;
                        font-size: 13px;
                        font-weight: 600;
                    text-transform: uppercase;
                        letter-spacing: 2px;
                    transition: all 0.3s;
                        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                }
                .lux-save-address-btn:hover {
                    background: #D4AF37;
                    color: #111;
                }

                @media (max-width: 767.98px) {
                    .address-modal-overlay {
                        padding: 12px;
                    }
                    .address-modal {
                        padding: 24px 20px;
                        max-height: 96vh;
                        border-radius: 20px;
                    }
                    .address-modal-header h4 {
                        font-size: 1.3rem;
                    }
                }
            `}} />
        </div>
    )
}