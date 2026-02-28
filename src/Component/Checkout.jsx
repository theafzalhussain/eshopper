import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { getCart, deleteCart } from "../Store/ActionCreaters/CartActionCreators"
import { addCheckout } from "../Store/ActionCreaters/CheckoutActionCreators"
import BuyerProfile from './BuyerProfile'
import { motion } from 'framer-motion'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

export default function Checkout() {
    var [mode, setMode] = useState("COD")
    var [user, setuser] = useState({})
    var [cart, setcart] = useState([])
    var [total, settotal] = useState(0)
    var [shipping, setshipping] = useState(0)
    var [final, setfinal] = useState(0)

    var users = useSelector((state) => state.UserStateData)
    var carts = useSelector((state) => state.CartStateData)
    
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getAPIData() {
        dispatch(getUser())
        dispatch(getCart())
        const userId = localStorage.getItem("userid")
        
        var userData = users.find((item) => item.id === userId)
        if (userData) setuser(userData)

        var userCart = carts.filter((item) => item.userid === userId)
        if (userCart) {
            setcart(userCart)
            let sum = 0
            userCart.forEach(i => sum += (Number(i.price) * Number(i.qty)))
            let ship = (sum > 0 && sum < 1000) ? 150 : 0
            settotal(sum); setshipping(ship); setfinal(sum + ship)
        }
    }

    function placeOrder() {
        var item = {
            userid: localStorage.getItem("userid"),
            paymentmode: mode,
            orderstatus: "Order Placed",
            paymentstatus: "Pending",
            time: new Date(),
            totalAmount: total,
            shippingAmount: shipping,
            finalAmount: final,
            products: cart
        }
        dispatch(addCheckout(item))
        // Clear Cart from DB
        cart.forEach(i => dispatch(deleteCart({ id: i.id })))
        navigate("/confirmation")
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

                            <button onClick={placeOrder} className="btn btn-info btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold">
                                PLACE ORDER NOW
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