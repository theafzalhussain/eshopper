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
                // SAFETY CHECK: Force Number and default to 0 if missing
                let price = Number(item.price) || 0
                let qty = Number(item.qty) || 0
                sum += (price * qty)
            })
            setSubtotal(sum)
            setShipping(sum > 0 && sum < 1000 ? 150 : 0)
        }
    }

    function updateQty(item, op) {
        let currentQty = Number(item.qty) || 1
        if (op === "dec" && currentQty === 1) return
        
        let updatedItem = { ...item }
        if (op === "dec") {
            updatedItem.qty = currentQty - 1
        } else {
            updatedItem.qty = currentQty + 1
        }
        
        // Ensure price is a number
        let price = Number(item.price) || 0
        updatedItem.total = updatedItem.qty * price
        
        dispatch(updateCart(updatedItem))
        // Manual local state update for instant feel
        getAPIData()
    }

    function removeProduct(id) {
        dispatch(deleteCart({ id: id }))
    }

    useEffect(() => { 
        getAPIData() 
    }, [carts.length])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            <div className="py-5 bg-dark text-center">
                <h1 className="text-white font-weight-bold">Your Premium Cart</h1>
                <p className="text-info"><Link to="/" className="text-info">Home</Link> / Cart</p>
            </div>

            <div className="container py-5">
                {cart.length > 0 ? (
                    <div className="row">
                        <div className="col-lg-8">
                            <div className="bg-white shadow-sm rounded-lg p-3">
                                <table className="table text-center">
                                    <thead className="border-bottom">
                                        <tr className="text-muted small uppercase">
                                            <th>Product</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th>Total</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {cart.map((item) => (
                                                <motion.tr key={item.id} layout initial={{opacity:0}} animate={{opacity:1}}>
                                                    <td className="align-middle text-left">
                                                        <div className="d-flex align-items-center">
                                                            {/* Safety Image Check */}
                                                            <img src={item.pic || item.pic1 || "/assets/images/noimage.png"} 
                                                                 width="70px" height="70px" 
                                                                 style={{objectFit:"cover", borderRadius:"10px"}} 
                                                                 className="mr-3 shadow-sm" alt="" />
                                                            <div>
                                                                <p className="mb-0 font-weight-bold">{item.name}</p>
                                                                <small className="text-muted">{item.color} | {item.size}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="align-middle">₹{item.price || 0}</td>
                                                    <td className="align-middle">
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <button onClick={() => updateQty(item, "dec")} className="btn btn-sm btn-outline-secondary rounded-circle" style={{width:"30px", height:"30px", padding:0}}>-</button>
                                                            <span className="mx-3 font-weight-bold">{item.qty}</span>
                                                            <button onClick={() => updateQty(item, "inc")} className="btn btn-sm btn-outline-secondary rounded-circle" style={{width:"30px", height:"30px", padding:0}}>+</button>
                                                        </div>
                                                    </td>
                                                    <td className="align-middle font-weight-bold text-info">₹{item.total || 0}</td>
                                                    <td className="align-middle">
                                                        <button onClick={() => removeProduct(item.id)} className="btn btn-sm text-danger" style={{fontSize:"20px"}}>×</button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm p-4 sticky-top" style={{top:"20px"}}>
                                <h4 className="font-weight-bold mb-4">Cart Total</h4>
                                <div className="d-flex justify-content-between mb-3">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-3">
                                    <span>Shipping</span>
                                    <span className={shipping === 0 ? "text-success" : ""}>
                                        {shipping === 0 ? "FREE" : `₹${shipping}`}
                                    </span>
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between mb-4">
                                    <span className="h5 font-weight-bold">Grand Total</span>
                                    <span className="h5 font-weight-bold text-info">₹{subtotal + shipping}</span>
                                </div>
                                <Link to="/checkout" className="btn btn-info btn-lg btn-block shadow-lg rounded-pill py-3 font-weight-bold">
                                    CHECKOUT NOW
                                </Link>
                                <div className="mt-4 text-center">
                                    <img src="https://www.paypalobjects.com/webstatic/mktg/logo/AM_mc_vs_dc_ae.jpg" width="100%" style={{opacity:0.7}} alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-5 bg-white shadow-sm rounded">
                        <h2 className="text-muted">Your Cart is Empty</h2>
                        <Link to="/shop/All" className="btn btn-info mt-3 px-5 rounded-pill">Start Shopping</Link>
                    </div>
                )}
            </div>
        </div>
    )
}