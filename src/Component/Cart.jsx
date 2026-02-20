import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { deleteCart, getCart, updateCart } from "../Store/ActionCreaters/CartActionCreators"
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Cart() {
    let [cart, setcart] = useState([])
    let [subtotal, setSubtotal] = useState(0)
    let [shipping, setShipping] = useState(0)
    
    let carts = useSelector((state) => state.CartStateData)
    let dispatch = useDispatch()

    function getAPIData() {
        dispatch(getCart())
        let userId = localStorage.getItem("userid")
        let userCart = carts.filter((item) => item.userid === userId)
        
        if (userCart) {
            setcart(userCart)
            let sum = 0
            userCart.forEach(item => {
                let itemTotal = Number(item.price) * Number(item.qty)
                sum += itemTotal
            })
            setSubtotal(sum)
            setShipping(sum > 0 && sum < 1000 ? 150 : 0)
        }
    }

    function updateQty(item, op) {
        let currentQty = Number(item.qty)
        if (op === "dec" && currentQty === 1) return
        
        let updatedItem = { ...item }
        updatedItem.qty = (op === "dec") ? currentQty - 1 : currentQty + 1
        
        // Product ka total wahi calculate ho raha hai
        updatedItem.total = Number(updatedItem.qty) * Number(updatedItem.price)
        
        dispatch(updateCart(updatedItem))
        // Isse instant total update hoga local state mein
        getAPIData()
    }

    function removeProduct(id) {
        if(window.confirm("Remove this item?")) dispatch(deleteCart({ id: id }))
    }

    useEffect(() => { getAPIData() }, [carts.length])

    return (
        <div style={{ backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
            {/* Header Section */}
            <div className="py-5 bg-dark text-center shadow-sm">
                <h2 className="text-white font-weight-bold mb-0">Shopping Cart</h2>
                <nav className="small mt-2"><Link to="/" className="text-info">Home</Link> <span className="text-white-50">/ Cart</span></nav>
            </div>

            <div className="container py-5">
                {cart.length > 0 ? (
                    <div className="row">
                        {/* Cart Items List */}
                        <div className="col-lg-8">
                            <div className="d-none d-md-flex row border-bottom pb-2 mb-3 text-muted small font-weight-bold px-3">
                                <div className="col-5">PRODUCT</div>
                                <div className="col-2 text-center">PRICE</div>
                                <div className="col-3 text-center">QUANTITY</div>
                                <div className="col-2 text-right">TOTAL</div>
                            </div>

                            <AnimatePresence>
                                {cart.map((item) => (
                                    <motion.div 
                                        key={item.id} 
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-lg shadow-sm p-3 mb-3 border-0 transition-all hover-shadow"
                                    >
                                        <div className="row align-items-center">
                                            {/* Product Info */}
                                            <div className="col-12 col-md-5 mb-3 mb-md-0">
                                                <div className="d-flex align-items-center">
                                                    <img src={item.pic || "/assets/images/noimage.png"} 
                                                         style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "12px" }} 
                                                         className="mr-3 border" alt="" />
                                                    <div>
                                                        <h6 className="mb-0 font-weight-bold text-dark">{item.name}</h6>
                                                        <p className="small text-muted mb-0">{item.color} | Size: {item.size}</p>
                                                        <button onClick={() => removeProduct(item.id)} className="btn btn-link btn-sm text-danger p-0 mt-1 d-md-none">Remove</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="col-4 col-md-2 text-md-center">
                                                <span className="d-md-none text-muted small d-block">Price</span>
                                                <span className="font-weight-bold">₹{item.price}</span>
                                            </div>

                                            {/* Quantity Controls - Fixed for Responsiveness */}
                                            <div className="col-4 col-md-3 text-center">
                                                <span className="d-md-none text-muted small d-block">Qty</span>
                                                <div className="d-inline-flex align-items-center border rounded-pill px-2 bg-light">
                                                    <button onClick={() => updateQty(item, "dec")} className="btn btn-sm font-weight-bold" style={{fontSize:"18px"}}>−</button>
                                                    <span className="mx-2 font-weight-bold" style={{minWidth:"20px"}}>{item.qty}</span>
                                                    <button onClick={() => updateQty(item, "inc")} className="btn btn-sm font-weight-bold" style={{fontSize:"18px"}}>+</button>
                                                </div>
                                            </div>

                                            {/* Total for this item */}
                                            <div className="col-4 col-md-2 text-right text-md-center">
                                                <span className="d-md-none text-muted small d-block">Total</span>
                                                <span className="text-info font-weight-bold">₹{item.total}</span>
                                                <button onClick={() => removeProduct(item.id)} className="btn btn-sm text-danger ml-3 d-none d-md-inline-block" style={{fontSize:"20px"}}>×</button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            
                            <div className="mt-4">
                                <Link to="/shop/All" className="btn btn-outline-dark rounded-pill px-4 btn-sm">← Back to Shop</Link>
                            </div>
                        </div>

                        {/* Order Summary Sidebar */}
                        <div className="col-lg-4 mt-5 mt-lg-0">
                            <div className="card border-0 shadow rounded-lg p-4 bg-white sticky-top" style={{ top: "100px" }}>
                                <h5 className="font-weight-bold mb-4">Order Summary</h5>
                                <div className="d-flex justify-content-between mb-3">
                                    <span className="text-muted">Subtotal</span>
                                    <span className="font-weight-bold">₹{subtotal}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-3">
                                    <span className="text-muted">Shipping</span>
                                    <span className={shipping === 0 ? "text-success font-weight-bold" : "font-weight-bold"}>
                                        {shipping === 0 ? "FREE" : `₹${shipping}`}
                                    </span>
                                </div>
                                <hr className="my-4" />
                                <div className="d-flex justify-content-between mb-4">
                                    <h5 className="font-weight-bold">Total</h5>
                                    <h5 className="text-info font-weight-bold">₹{subtotal + shipping}</h5>
                                </div>
                                <Link to="/checkout" className="btn btn-info btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold transition-all">
                                    PROCEED TO CHECKOUT
                                </Link>
                                <div className="text-center mt-4">
                                    <p className="small text-muted"><i className="icon-lock mr-1"></i> Secure Checkout</p>
                                    <img src="https://www.paypalobjects.com/webstatic/mktg/logo/AM_mc_vs_dc_ae.jpg" width="100%" style={{opacity: 0.6, filter: "grayscale(1)"}} alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-5 bg-white shadow-sm rounded-lg">
                        <img src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png" width="150" alt="empty-cart" className="mb-4 opacity-50" />
                        <h3 className="text-muted">Your cart is feeling lonely!</h3>
                        <Link to="/shop/All" className="btn btn-info mt-4 px-5 rounded-pill shadow">Explore Products</Link>
                    </div>
                )}
            </div>

            {/* Custom Styling */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-lg { border-radius: 1.5rem !important; }
                .hover-shadow:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important; }
                .transition-all { transition: all 0.3s ease; }
                .rounded-pill { border-radius: 50px !important; }
                .btn-info { background-color: #17a2b8; border-color: #17a2b8; }
                .btn-info:hover { background-color: #138496; border-color: #117a8b; transform: translateY(-2px); }
            `}} />
        </div>
    )
}