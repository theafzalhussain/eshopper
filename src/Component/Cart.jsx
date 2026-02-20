import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { deleteCart, getCart, updateCart } from "../Store/ActionCreaters/CartActionCreators"
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion' // For smooth animations

export default function Cart() {
    let [cart, setcart] = useState([])
    let [subtotal, setSubtotal] = useState(0)
    let [shipping, setShipping] = useState(0)
    
    let carts = useSelector((state) => state.CartStateData)
    let dispatch = useDispatch()

    function getAPIData() {
        dispatch(getCart())
        let userId = localStorage.getItem("userid")
        // Filter cart items for the logged-in user
        let userCart = carts.filter((item) => item.userid === userId)
        
        if (userCart) {
            setcart(userCart)
            let sum = 0
            userCart.forEach(item => {
                // FIXED: Force conversion to Number to avoid NaN
                let itemTotal = Number(item.price) * Number(item.qty)
                sum += itemTotal
            })
            setSubtotal(sum)
            // Logic: Shipping is 150 if subtotal is less than 1000
            setShipping(sum > 0 && sum < 1000 ? 150 : 0)
        }
    }

    function updateQty(item, op) {
        if (op === "dec" && item.qty === 1) return
        
        let updatedItem = { ...item }
        if (op === "dec") {
            updatedItem.qty = Number(updatedItem.qty) - 1
        } else {
            updatedItem.qty = Number(updatedItem.qty) + 1
        }
        // Recalculate item total
        updatedItem.total = Number(updatedItem.qty) * Number(updatedItem.price)
        
        dispatch(updateCart(updatedItem))
        // Data refresh handled by useEffect dependency
    }

    function removeProduct(id) {
        if (window.confirm("Remove this item from cart?")) {
            dispatch(deleteCart({ id: id }))
        }
    }

    useEffect(() => { 
        getAPIData() 
    }, [carts.length]) // Refresh whenever carts data changes

    return (
        <div style={{ backgroundColor: "#fbfbfb", minHeight: "80vh" }}>
            {/* --- TOP HEADER --- */}
            <div className="py-5 bg-dark text-center mb-5">
                <h1 className="text-white font-weight-bold">Shopping Cart</h1>
                <p className="text-white-50"><Link to="/" className="text-info">Home</Link> / Cart</p>
            </div>

            <section className="pb-5">
                <div className="container">
                    <div className="row">
                        {cart.length > 0 ? (
                            <>
                                {/* --- CART TABLE --- */}
                                <div className="col-lg-8">
                                    <div className="table-responsive shadow-sm rounded-lg bg-white overflow-hidden">
                                        <table className="table table-hover text-center mb-0">
                                            <thead className="bg-light text-uppercase small font-weight-bold">
                                                <tr>
                                                    <th className="py-3">Product</th>
                                                    <th className="py-3">Price</th>
                                                    <th className="py-3">Qty</th>
                                                    <th className="py-3">Total</th>
                                                    <th className="py-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <AnimatePresence>
                                                    {cart.map((item, index) => (
                                                        <motion.tr 
                                                            key={item.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                            className="border-bottom"
                                                        >
                                                            <td className="align-middle text-left p-3">
                                                                <div className="d-flex align-items-center">
                                                                    {/* SAHI LINE: Direct URL from Cloudinary */}
                                                                    <img src={item.pic} width="70px" height="70px" style={{ objectFit: "cover" }} className="rounded shadow-sm mr-3" alt="" />
                                                                    <div>
                                                                        <h6 className="mb-0 font-weight-bold">{item.name}</h6>
                                                                        <small className="text-muted">{item.color} | Size: {item.size}</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="align-middle">₹{item.price}</td>
                                                            <td className="align-middle">
                                                                <div className="d-inline-flex align-items-center border rounded-pill bg-light">
                                                                    <button onClick={() => updateQty(item, "dec")} className="btn btn-sm px-3">-</button>
                                                                    <span className="px-2 font-weight-bold">{item.qty}</span>
                                                                    <button onClick={() => updateQty(item, "inc")} className="btn btn-sm px-3">+</button>
                                                                </div>
                                                            </td>
                                                            <td className="align-middle font-weight-bold text-info">₹{item.total}</td>
                                                            <td className="align-middle">
                                                                <button onClick={() => removeProduct(item.id)} className="btn btn-sm text-danger h4 mb-0">
                                                                    <i className="icon-trash"></i> ×
                                                                </button>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </AnimatePresence>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4">
                                        <Link to="/shop/All" className="btn btn-outline-info rounded-pill px-4">
                                            ← Continue Shopping
                                        </Link>
                                    </div>
                                </div>

                                {/* --- SUMMARY SIDEBAR --- */}
                                <div className="col-lg-4">
                                    <div className="card border-0 shadow-sm rounded-lg p-4 bg-white">
                                        <h4 className="font-weight-bold mb-4">Summary</h4>
                                        <div className="d-flex justify-content-between mb-3 text-secondary">
                                            <span>Subtotal</span>
                                            <span>₹{subtotal}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-3 text-secondary">
                                            <span>Shipping Fee</span>
                                            <span>₹{shipping}</span>
                                        </div>
                                        {shipping > 0 && (
                                            <p className="small text-info mb-4">Add ₹{1000 - subtotal} more for Free Shipping!</p>
                                        )}
                                        <hr />
                                        <div className="d-flex justify-content-between mb-4 mt-2">
                                            <h5 className="font-weight-bold">Grand Total</h5>
                                            <h5 className="font-weight-bold text-info">₹{subtotal + shipping}</h5>
                                        </div>
                                        <Link to="/checkout" className="btn btn-info btn-block btn-lg py-3 rounded-pill shadow font-weight-bold">
                                            PROCEED TO CHECKOUT
                                        </Link>
                                        <div className="mt-4 text-center">
                                            <img src="https://help.zazzle.com/hc/article_attachments/360010513393/Logos-01.png" width="100%" alt="payment-methods" style={{ opacity: 0.6 }} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="col-12 text-center py-5">
                                <div className="mb-4">
                                    <span className="icon-shopping_cart display-1 text-light"></span>
                                </div>
                                <h2 className="text-muted">Your cart is empty!</h2>
                                <p className="mb-4">Looks like you haven't added anything to your cart yet.</p>
                                <Link to="/shop/All" className="btn btn-info btn-lg px-5 rounded-pill">Shop Now</Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-lg { border-radius: 15px !important; }
                .transition-all { transition: all 0.3s ease; }
                .btn-link:hover { text-decoration: none; transform: scale(1.2); }
                .card { border-radius: 20px !important; }
            `}} />
        </div>
    )
}