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
    var [phone, setphone] = useState("") // 📱 NEW: Allow user to enter phone
    var [cart, setcart] = useState([])
    var [total, settotal] = useState(0)
    var [shipping, setshipping] = useState(0)
    var [final, setfinal] = useState(0)
    var [placingOrder, setplacingOrder] = useState(false)

    var users = useSelector((state) => state.UserStateData)
    var carts = useSelector((state) => state.CartStateData)
    
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getAPIData() {
        dispatch(getUser())
        dispatch(getCart())
        const userId = localStorage.getItem("userid")
        
        var userData = users.find((item) => item.id === userId)
        if (userData) {
            setuser(userData)
            if (!phone && userData.phone) { // 📱 Initialize phone from profile
                setphone(userData.phone)
            }
        }

        var userCart = carts.filter((item) => item.userid === userId)
        if (userCart) {
            setcart(userCart)
            let sum = 0
            userCart.forEach(i => sum += (Number(i.price) * Number(i.qty)))
            let ship = (sum > 0 && sum < 1000) ? 150 : 0
            settotal(sum); setshipping(ship); setfinal(sum + ship)
        }
    }

    async function placeOrder() {
        try {
            const userid = localStorage.getItem("userid")
            if (!userid || cart.length === 0 || placingOrder) return

            // 📱 Validate phone before sending
            if (!phone || phone.trim().length < 10) {
                alert('📱 कृपया अपना सही फोन नंबर दर्ज करें! (Please enter your correct phone number)')
                return
            }

            setplacingOrder(true)

            const payload = {
                userId: userid,
                paymentMethod: mode,
                totalAmount: total,
                shippingAmount: shipping,
                finalAmount: final,
                shippingAddress: {
                    fullName: user?.name || '',
                    phone: phone, // 📱 Use entered phone
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
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "100vh" }}>
            <div className="py-5 bg-dark text-center mb-5 shadow-sm">
                <h1 className="text-white font-weight-bold display-4">Secure Checkout</h1>
                <p className="text-info small text-uppercase" style={{letterSpacing:'2px'}}>Review your order and complete payment</p>
            </div>

            <section className="container pb-5">
                <div className="row">
                    {/* LEFT: Buyer Profile */}
                    <motion.div 
                        className="col-lg-6 mb-4"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="card border-0 shadow-sm rounded-2xl p-4 bg-white h-100">
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
                        <div className="card border-0 shadow-lg rounded-2xl p-4 bg-white">
                            <h4 className="font-weight-bold mb-4">Order Summary</h4>
                            <div className="checkout-items mb-4" style={{maxHeight:'300px', overflowY:'auto'}}>
                                {cart.map((item, index) => (
                                    <div key={index} className="d-flex align-items-center mb-3 border-bottom pb-3">
                                        <img src={item.pic ? optimizeCloudinaryUrlAdvanced(item.pic, { maxWidth: 220, crop: 'fill' }) : "/assets/images/noimage.png"} width="70px" height="70px" loading="lazy" decoding="async" className="rounded shadow-sm object-fit-cover" alt="" />
                                        <div className="ml-3 flex-grow-1">
                                            <h6 className="mb-0 font-weight-bold text-dark">{item.name}</h6>
                                            <small className="text-muted">{item.qty} x ₹{item.price}</small>
                                        </div>
                                        <span className="font-weight-bold text-info">₹{item.total}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-light p-4 rounded-xl mb-4">
                                <div className="d-flex justify-content-between mb-2"><span>Subtotal</span><span>₹{total}</span></div>
                                <div className="d-flex justify-content-between mb-2"><span>Shipping</span><span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span></div>
                                <hr />
                                <div className="d-flex justify-content-between align-items-center">
                                    <h4 className="font-weight-bold mb-0">Payable Amount</h4>
                                    <h3 className="font-weight-bold text-info mb-0">₹{final}</h3>
                                </div>
                            </div>

                            <h5 className="font-weight-bold mb-3">Payment Method</h5>
                            <div className="mb-4">
                                <div 
                                    className={`payment-option p-3 border rounded-xl mb-2 cursor-pointer transition ${mode === 'COD' ? 'border-info bg-aliceblue' : ''}`}
                                    onClick={() => setMode("COD")}
                                >
                                    <input type="radio" checked={mode === "COD"} readOnly className="mr-2" />
                                    <strong>Cash on Delivery (COD)</strong>
                                </div>
                                <div 
                                    className={`payment-option p-3 border rounded-xl mb-2 cursor-pointer transition ${mode === 'NetBanking' ? 'border-info bg-aliceblue' : ''}`}
                                    onClick={() => setMode("NetBanking")}
                                >
                                    <input type="radio" checked={mode === "NetBanking"} readOnly className="mr-2" />
                                    <strong>Online Payment (Cards/UPI)</strong>
                                </div>
                            </div>

                            {/* 📱 Phone Number for WhatsApp Notifications */}
                            <h5 className="font-weight-bold mb-2">📱 Phone for Notifications</h5>
                            <div className="mb-4">
                                <input 
                                    type="tel" 
                                    className="form-control form-control-lg rounded-pill" 
                                    placeholder="10-digit phone number (WhatsApp updates)"
                                    value={phone}
                                    onChange={(e) => setphone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    style={{
                                        borderColor: phone && phone.length === 10 ? '#28a745' : '#ddd',
                                        borderWidth: '2px'
                                    }}
                                />
                                <small className={phone && phone.length === 10 ? 'text-success' : 'text-muted'}>
                                    {phone && phone.length === 10 ? '✅ Phone valid - You\'ll get WhatsApp updates' : '⏳ Enter 10-digit number for WhatsApp notifications'}
                                </small>
                            </div>

                            <button onClick={placeOrder} disabled={placingOrder || cart.length === 0 || !phone || phone.length < 10} className="btn btn-info btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold">
                                {placingOrder ? 'PLACING ORDER...' : 'PLACE ORDER NOW'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 25px !important; }
                .rounded-xl { border-radius: 15px !important; }
                .bg-aliceblue { background-color: #f0faff; }
                .cursor-pointer { cursor: pointer; }
                .transition { transition: 0.3s all ease; }
                .object-fit-cover { object-fit: cover; }
            `}} />
        </div>
    )
}