import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { deleteCart, getCart, updateCart } from "../Store/ActionCreaters/CartActionCreators"
import { Link } from 'react-router-dom'

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
                sum += Number(item.total) || (Number(item.price) * Number(item.qty))
            })
            setSubtotal(sum)
            setShipping(sum > 0 && sum < 1000 ? 150 : 0)
        }
    }

    function updateQty(item, op) {
        if (op === "dec" && item.qty === 1) return
        
        let updatedItem = { ...item }
        if (op === "dec") {
            updatedItem.qty -= 1
        } else {
            updatedItem.qty += 1
        }
        updatedItem.total = Number(updatedItem.qty) * Number(updatedItem.price)
        dispatch(updateCart(updatedItem))
        getAPIData()
    }

    useEffect(() => { getAPIData() }, [carts.length])

    return (
        <section className="ftco-section bg-light">
            <div className="container">
                <div className="row">
                    <div className="col-md-12">
                        <div className="table-responsive shadow-sm rounded bg-white">
                            <table className="table table-borderless text-center align-middle">
                                <thead className="thead-primary" style={{backgroundColor:"#b19d5e", color:"white"}}>
                                    <tr>
                                        <th>Product</th>
                                        <th>Name</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Total</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, index) => (
                                        <tr key={index} className="border-bottom">
                                            <td className="p-3">
                                                <img src={item.pic} width="80px" height="80px" style={{objectFit:"cover"}} className="rounded shadow-sm" alt="" />
                                            </td>
                                            <td className="align-middle"><strong>{item.name}</strong><br/><small>{item.color} / {item.size}</small></td>
                                            <td className="align-middle">₹{item.price}</td>
                                            <td className="align-middle">
                                                <div className="d-flex justify-content-center align-items-center">
                                                    <button onClick={() => updateQty(item, "dec")} className="btn btn-sm btn-light border">-</button>
                                                    <span className="mx-3">{item.qty}</span>
                                                    <button onClick={() => updateQty(item, "inc")} className="btn btn-sm btn-light border">+</button>
                                                </div>
                                            </td>
                                            <td className="align-middle font-weight-bold">₹{item.total}</td>
                                            <td className="align-middle">
                                                <button onClick={() => dispatch(deleteCart({id: item.id}))} className="btn btn-sm btn-link text-danger h4">×</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="row justify-content-end mt-5">
                    <div className="col-md-4">
                        <div className="cart-total bg-white p-4 shadow-sm rounded">
                            <h4 className="mb-4">Order Summary</h4>
                            <p className="d-flex justify-content-between"><span>Subtotal</span> <span>₹{subtotal}</span></p>
                            <p className="d-flex justify-content-between"><span>Shipping</span> <span>₹{shipping}</span></p>
                            <hr />
                            <h3 className="d-flex justify-content-between text-info">
                                <span>Total</span> <span>₹{subtotal + shipping}</span>
                            </h3>
                            <Link to="/checkout" className="btn btn-info btn-block btn-lg mt-4 py-3">PROCEED TO CHECKOUT</Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}